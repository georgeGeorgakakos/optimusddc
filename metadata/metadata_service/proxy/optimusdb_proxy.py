import os
import time
import json
import logging
from typing import List, Dict, Any, Optional, Union

import requests
from flask import current_app
from metadata_service.proxy.base_proxy import BaseProxy
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

# Try to import UserResourceRel, provide fallback if not available
try:
    from metadata_service.util.enums import UserResourceRel
except ImportError:
    # Fallback: create a simple enum-like class
    class UserResourceRel:
        follow = "follow"
        own = "own"
        read = "read"


DEFAULT_TIMEOUT = (3.0, 10.0)
logger = logging.getLogger(__name__)

class OptimusDBProxy(BaseProxy):
    """
    OptimusDB-backed proxy for Amundsen Metadata Service.

    FIXED VERSION: All OptimusDB API calls now properly handle string-wrapped JSON responses.
    """

    def __init__(self, **kwargs) -> None:
        self.base_url: str = (
                current_app.config.get("OPTIMUSDB_API_URL")
                or kwargs.get("optimusdb_api_url")
                or "http://localhost:8089"
        )
        if not self.base_url:
            raise ValueError("OPTIMUSDB_API_URL not configured in Flask app or kwargs.")

        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        self.timeout = DEFAULT_TIMEOUT

        if os.environ.get("OPTIMUSDB_REGISTER_SYSTEM_TABLE", "").lower() in ("1", "true", "yes"):
            self._register_swarmkb_peers_metadata()

        logger.info(f"[OptimusDBProxy] Initialized with base_url={self.base_url}")

    # ------------------------------------------------------------------
    # CRITICAL FIX: Response Parser Helper (MUST BE DEFINED FIRST)
    # ------------------------------------------------------------------
    def _parse_optimusdb_response(self, response: requests.Response) -> Dict[str, Any]:
        """
        Parse OptimusDB response and handle string-wrapped JSON (including nested wrapping).

        CRITICAL: OptimusDB sometimes returns JSON wrapped as a string multiple times.
        This helper ensures we always get a dict, not a string.

        Args:
            response: requests.Response object

        Returns:
            dict: Parsed JSON response (always a dict, never a string)
        """
        try:
            result = response.json()

            # CRITICAL: Handle NESTED string-wrapped JSON (could be wrapped multiple times)
            max_unwrap_attempts = 5
            attempts = 0

            while isinstance(result, str) and attempts < max_unwrap_attempts:
                logger.warning(
                    f"[OptimusDBProxy] Response is string-wrapped JSON (attempt {attempts + 1}), parsing again"
                )
                try:
                    result = json.loads(result)
                    attempts += 1
                except json.JSONDecodeError as e:
                    logger.error(f"[OptimusDBProxy] Failed to parse string response: {e}")
                    logger.error(f"[OptimusDBProxy] Raw response: {result[:500]}...")
                    # If it's an error message string, wrap it in a dict
                    return {"error": str(result), "data": {"records": []}}

            # Final validation
            if not isinstance(result, dict):
                logger.error(
                    f"[OptimusDBProxy] Response is not a dict after {attempts} unwrap attempts: {type(result)}"
                )
                logger.error(f"[OptimusDBProxy] Final result: {str(result)[:500]}...")
                # Return empty dict with data structure
                return {"data": {"records": []}}

            # CRITICAL: Validate that result has expected structure
            if isinstance(result, dict) and "data" not in result and "records" not in result:
                # Result might be an error message or unexpected format
                logger.warning(f"[OptimusDBProxy] Response missing 'data' or 'records': {list(result.keys())}")
                # Check if it's an error response
                if "error" in result or "message" in result:
                    logger.error(f"[OptimusDBProxy] Error response: {result}")
                    return {"error": result.get("error", result.get("message", "Unknown error")), "data": {"records": []}}
                # Otherwise wrap it
                return {"data": {"records": []}}

            logger.debug(f"[OptimusDBProxy] Successfully parsed response after {attempts} unwrap(s)")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"[OptimusDBProxy] JSON decode error: {e}")
            logger.error(f"[OptimusDBProxy] Raw response text: {response.text[:500]}...")
            return {"data": {"records": []}}
        except Exception as e:
            logger.error(f"[OptimusDBProxy] Unexpected error parsing response: {e}")
            logger.error(f"[OptimusDBProxy] Response status: {response.status_code}")
            logger.error(f"[OptimusDBProxy] Response text: {response.text[:500]}...")
            return {"data": {"records": []}}

    # ------------------------------------------------------------------
    # Helper Methods
    # ------------------------------------------------------------------
    def _build_table_key(self, database: str, schema: str, name: str) -> str:
        database = (database or "optimusdb").replace(" ", "_")
        schema = (schema or "public").replace(" ", "_")
        name = (name or "unknown").replace(" ", "_")
        return f"{database}://default.{schema}/{name}"

    def _execute_sql(self, sql: str) -> Dict[str, Any]:
        """
        Execute SQL query against OptimusDB.

        FIXED: Now uses _parse_optimusdb_response() to handle string-wrapped JSON.
        """
        try:
            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": sql,
                "graph_traversal": [{}],
                "criteria": []
            }

            resp = self.session.post(
                f"{self.base_url}/swarmkb/command",
                json=payload,
                timeout=self.timeout
            )

            if not resp.ok:
                logger.error(f"[OptimusDBProxy] SQL execution failed: {resp.status_code}")
                return {"data": {"records": []}}

            # ✅ USE HELPER FUNCTION
            return self._parse_optimusdb_response(resp)

        except Exception as e:
            logger.exception(f"[OptimusDBProxy] _execute_sql error: {e}")
            return {"data": {"records": []}}

    def _parse_table_uri(self, table_uri: str) -> Dict[str, str]:
        """
        Parse table URI into database, schema, and name components

        Expected format: {database}://{cluster}.{schema}/{name}
        Example: optimusdb://default.Type_A/Sample_Name

        Returns:
            dict: {'database': str, 'schema': str, 'name': str}
        """
        try:
            table_uri = table_uri.strip().replace("%20", " ")

            # Split by ://
            parts = table_uri.split("://")
            database = parts[0] if len(parts) > 1 else "optimusdb"
            rest = parts[1] if len(parts) > 1 else table_uri

            # Split by / to get cluster.schema and name
            if "/" in rest:
                cluster_schema, name = rest.split("/", 1)

                # Split cluster.schema by first dot to get schema
                # Format: {cluster}.{schema} where schema might contain dots
                if "." in cluster_schema:
                    # Skip the cluster part (everything before first dot)
                    schema = cluster_schema.split(".", 1)[1]
                else:
                    schema = "default"
            else:
                # No slash - treat entire rest as name
                schema = "default"
                name = rest

            # Replace underscores with spaces (they were converted when building the key)
            schema = schema.replace("_", " ")
            name = name.replace("_", " ")

            logger.debug(
                f"[OptimusDBProxy] Parsed URI '{table_uri}' -> "
                f"database='{database}', schema='{schema}', name='{name}'"
            )

            return {'database': database, 'schema': schema, 'name': name}

        except Exception as e:
            logger.error(f"[OptimusDBProxy] _parse_table_uri error for '{table_uri}': {e}")
            import traceback
            traceback.print_exc()
            return {'database': "optimusdb", 'schema': "default", 'name': "unknown"}

    # ------------------------------------------------------------------
    # Table Metadata - AUTOMATED DYNAMIC IMPLEMENTATION
    # ------------------------------------------------------------------
    def get_table(self, *, table_uri: str) -> Dict[str, Any]:
        """
        AUTOMATED: Get detailed information for ANY table from OptimusDB.
        Dynamically discovers schema and displays all columns automatically.

        Works for:
        - datacatalog table
        - Any other table with any schema
        - Future tables without code changes

        Args:
            table_uri: Table URI in format: database://cluster.schema/table_name

        Returns:
            Dictionary containing complete table metadata in Amundsen format
        """
        try:
            logger.info(f"[OptimusDBProxy] get_table called with URI: {table_uri}")

            # Parse the table URI
            parsed = self._parse_table_uri(table_uri)
            database = parsed.get('database', 'optimusdb')
            schema = parsed.get('schema', 'datacatalog')
            table_name = parsed.get('name', '')

            logger.info(
                f"[OptimusDBProxy] Parsed to: database={database}, schema={schema}, name={table_name}"
            )

            if not table_name:
                logger.error("[OptimusDBProxy] No table name in URI")
                return self._get_empty_table_response(table_uri)

            # ====================================================================
            # STEP 1: DISCOVER TABLE SCHEMA AUTOMATICALLY
            # ====================================================================
            schema_info = self._get_table_schema(schema)

            if not schema_info:
                logger.warning(f"[OptimusDBProxy] Could not get schema for: {schema}")
                # Fallback: continue without schema info
                schema_info = []

            logger.info(f"[OptimusDBProxy] Discovered {len(schema_info)} columns in schema")

            # ====================================================================
            # STEP 2: QUERY TABLE DATA
            # ====================================================================
            query = f"""
            select * from {schema}
            where name='{table_name}'
            limit 1
            """

            logger.info(f"[OptimusDBProxy] Executing query: {query}")
            result = self._execute_sql(query)

            # CRITICAL: Add validation before accessing result
            if not isinstance(result, dict):
                logger.error(f"[OptimusDBProxy] _execute_sql returned non-dict: {type(result)}")
                return self._get_empty_table_response(table_uri)

            # _execute_sql already uses _parse_optimusdb_response, so result should be a dict
            data = result.get('data', {})
            if not isinstance(data, dict):
                logger.error(f"[OptimusDBProxy] result['data'] is not a dict: {type(data)}")
                return self._get_empty_table_response(table_uri)

            records = data.get('records', [])

            logger.info(f"[OptimusDBProxy] Found {len(records)} records")

            if not records:
                return self._get_empty_table_response(table_uri)

            # Get the first matching record
            record = records[0]

            # ====================================================================
            # STEP 3: AUTOMATICALLY BUILD TABLE METADATA
            # ====================================================================

            # Extract core fields (with smart defaults)
            name = record.get('name', table_name)
            description = record.get('description', record.get('desc', 'No description available'))

            # ====================================================================
            # STEP 4: AUTOMATICALLY PARSE TAGS
            # ====================================================================
            tags = self._parse_tags_from_record(record)

            # ====================================================================
            # STEP 5: AUTOMATICALLY PARSE OWNERS
            # ====================================================================
            owners = self._parse_owners_from_record(record)

            # ====================================================================
            # STEP 6: AUTOMATICALLY BUILD ENHANCED DESCRIPTION
            # ====================================================================
            enhanced_description = self._build_enhanced_description(record, description)

            # ====================================================================
            # STEP 7: AUTOMATICALLY BUILD COLUMNS FROM ALL FIELDS
            # ====================================================================
            columns = self._build_columns_from_record(record, schema_info)

            # ====================================================================
            # STEP 8: AUTOMATICALLY BUILD PROGRAMMATIC DESCRIPTIONS
            # ====================================================================
            programmatic_descriptions = self._build_programmatic_descriptions(record)

            # ====================================================================
            # STEP 9: BUILD COMPLETE AMUNDSEN TABLE OBJECT
            # ====================================================================
            table_data = {
                'database': database,
                'cluster': 'optimusdb',
                'schema': schema,
                'name': name,
                'key': table_uri,
                'description': enhanced_description,
                'last_updated_timestamp': self._extract_timestamp(record),
                'columns': columns,
                'owners': owners,
                'tags': tags,
                'badges': self._extract_badges(record),
                'is_view': False,
                'table_writer': {
                    'application_url': '',
                    'description': 'OptimusDB',
                    'id': 'optimusdb',
                    'name': 'OptimusDB'
                },
                'table_readers': [],
                'watermarks': [],
                'source': {
                    'source': 'optimusdb',
                    'source_type': 'Table'
                },
                'programmatic_descriptions': programmatic_descriptions
            }

            logger.info(
                f"[OptimusDBProxy] Successfully retrieved table: {name} with {len(columns)} columns"
            )
            return table_data

        except Exception as e:
            logger.error(f"[OptimusDBProxy] Error in get_table: {str(e)}", exc_info=True)
            return self._get_empty_table_response(table_uri)



    def _infer_type(self, value: Any) -> str:
        """Infer column type from value"""
        if isinstance(value, bool):
            return 'boolean'
        elif isinstance(value, int):
            return 'int'
        elif isinstance(value, float):
            return 'float'
        else:
            return 'varchar'

    def get_catalog_statistics(self) -> Dict[str, Any]:
        """
        NEW METHOD: Get catalog-wide statistics
        """
        try:
            # Count total datasets
            count_query = "SELECT COUNT(*) as total FROM datacatalog;"
            result = self._execute_sql(count_query)
            records = result.get('data', {}).get('records', [])

            total_datasets = records[0].get('total', 0) if records else 0

            # Count unique schemas
            schema_query = "SELECT COUNT(DISTINCT metadata_type) as total FROM datacatalog;"
            result = self._execute_sql(schema_query)
            records = result.get('data', {}).get('records', [])

            total_schemas = records[0].get('total', 0) if records else 0

            return {
                'total_datasets': total_datasets,
                'total_schemas': total_schemas,
                'last_updated': int(time.time())
            }
        except Exception as e:
            logger.error(f"Error getting catalog statistics: {e}")
            return {
                'total_datasets': 0,
                'total_schemas': 0,
                'last_updated': int(time.time())
            }

    def _parse_tags_from_record(self, record: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        AUTOMATED: Parse tags from record.
        Handles multiple formats: comma-separated, JSON array, etc.

        Args:
            record: Database record

        Returns:
            List of tag objects for Amundsen
        """
        tags = []

        # Try different tag field names
        tags_str = record.get('tags') or record.get('tag') or record.get('labels') or ''

        if not tags_str:
            return tags

        # Handle comma-separated tags
        if isinstance(tags_str, str) and ',' in tags_str:
            tag_list = [t.strip() for t in tags_str.split(',') if t.strip()]
            tags = [{'tag_name': tag, 'tag_type': 'default'} for tag in tag_list]

        # Handle JSON array
        elif isinstance(tags_str, str) and tags_str.startswith('['):
            try:
                tag_list = json.loads(tags_str)
                if isinstance(tag_list, list):
                    tags = [{'tag_name': str(tag), 'tag_type': 'default'} for tag in tag_list]
            except:
                pass

        # Handle single tag
        elif isinstance(tags_str, str):
            tags = [{'tag_name': tags_str, 'tag_type': 'default'}]

        return tags

    def _parse_owners_from_record(self, record: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        AUTOMATED: Parse owners from record.
        Looks for common owner field names.

        Args:
            record: Database record

        Returns:
            List of owner objects for Amundsen
        """
        owners = []

        # Try different owner field names (in priority order)
        owner_fields = [
            'created_by', 'owner', 'owners', 'author',
            'ownership_details', 'created_user', 'user'
        ]

        seen_owners = set()

        for field in owner_fields:
            value = record.get(field)

            if not value or value in seen_owners:
                continue

            # Handle comma-separated owners
            if isinstance(value, str) and ',' in value:
                for owner in value.split(','):
                    owner = owner.strip()
                    if owner and owner not in seen_owners:
                        owners.append({
                            'display_name': owner,
                            'email': f"{owner.lower().replace(' ', '.')}@company.com",
                            'user_id': owner
                        })
                        seen_owners.add(owner)

            # Handle single owner
            elif isinstance(value, str):
                owners.append({
                    'display_name': value,
                    'email': f"{value.lower().replace(' ', '.')}@company.com",
                    'user_id': value
                })
                seen_owners.add(value)

        # If no owners found, add system
        if not owners:
            owners.append({
                'display_name': 'system',
                'email': 'system@company.com',
                'user_id': 'system'
            })

        return owners

    def _build_enhanced_description(self, record: Dict[str, Any], base_description: str) -> str:
        """
        AUTOMATED: Build enhanced description with key metadata.
        Intelligently picks important fields to highlight.

        Args:
            record: Database record
            base_description: Base description text

        Returns:
            Enhanced description string
        """
        # Fields that add value to description (if present)
        highlight_fields = [
            'author', 'component', 'behaviour', 'status', 'priority',
            'type', 'category', 'environment', 'version', 'owner'
        ]

        metadata_parts = []

        for field in highlight_fields:
            value = record.get(field)
            if value and value != 'N/A':
                # Format field name nicely
                field_name = field.replace('_', ' ').title()
                metadata_parts.append(f"**{field_name}:** {value}")

        if metadata_parts:
            # Limit to 5 most important fields to avoid clutter
            metadata_parts = metadata_parts[:5]
            return f"{base_description}\n\n" + " | ".join(metadata_parts)

        return base_description

    def _build_columns_from_record(self, record: Dict[str, Any], schema_info: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        AUTOMATED: Build columns list from ALL fields in record.
        Works for any table schema.

        Args:
            record: Database record with all fields
            schema_info: Schema information from _get_table_schema()

        Returns:
            List of column objects for Amundsen
        """
        columns = []

        # If we have schema info, use it to get proper types
        schema_map = {}
        if schema_info:
            for col in schema_info:
                col_name = col.get('name', '')
                col_type = col.get('type', 'varchar')
                if col_name:
                    schema_map[col_name] = col_type

        # Build columns from all fields in record
        sort_order = 0
        for field_name, field_value in record.items():
            # Skip internal fields that shouldn't be displayed
            if field_name.startswith('_internal_'):
                continue

            # Get column type from schema or infer from value
            col_type = schema_map.get(field_name, 'varchar')

            # Simplify type names for display
            if col_type.upper() in ['TEXT', 'VARCHAR', 'STRING', 'CHAR']:
                col_type = 'varchar'
            elif col_type.upper() in ['INT', 'INTEGER', 'BIGINT', 'SMALLINT']:
                col_type = 'int'
            elif col_type.upper() in ['FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC']:
                col_type = 'float'
            elif col_type.upper() in ['TIMESTAMP', 'DATETIME', 'DATE']:
                col_type = 'timestamp'
            elif col_type.upper() in ['BOOLEAN', 'BOOL']:
                col_type = 'boolean'

            # Create column description from field name
            col_description = field_name.replace('_', ' ').title()

            # Format value for display
            display_value = str(field_value) if field_value is not None else 'NULL'

            # Truncate very long values
            if len(display_value) > 100:
                display_value = display_value[:97] + '...'

            columns.append({
                'name': field_name,
                'description': col_description,
                'col_type': col_type,
                'sort_order': sort_order,
                'stats': [
                    {
                        'stat_type': 'value',
                        'stat_val': display_value
                    }
                ]
            })

            sort_order += 1

        return columns

    def _build_programmatic_descriptions(self, record: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        AUTOMATED: Build programmatic descriptions from key fields.
        Intelligently selects important metadata fields.

        Args:
            record: Database record

        Returns:
            List of programmatic description objects
        """
        descriptions = []

        # Fields that are good for programmatic descriptions
        prog_desc_fields = [
            ('metadata_type', 'Type'),
            ('relationships', 'Relationships'),
            ('associated_id', 'Associated ID'),
            ('related_ids', 'Related IDs'),
            ('scheduling_info', 'Scheduling'),
            ('sla_constraints', 'SLA'),
            ('behaviour', 'Behavior'),
            ('component', 'Component'),
            ('environment', 'Environment'),
            ('version', 'Version')
        ]

        for field_name, display_name in prog_desc_fields:
            value = record.get(field_name)
            if value and value != 'N/A':
                descriptions.append({
                    'source': field_name,
                    'text': f"{display_name}: {value}"
                })

        return descriptions

    def _extract_timestamp(self, record: Dict[str, Any]) -> int:
        """
        AUTOMATED: Extract timestamp from record.
        Tries multiple timestamp field names.

        Args:
            record: Database record

        Returns:
            Unix timestamp (int)
        """
        # Try different timestamp field names
        timestamp_fields = ['updated_at', 'created_at', 'timestamp', 'last_modified']

        for field in timestamp_fields:
            value = record.get(field)
            if value:
                # If already a number, return it
                if isinstance(value, (int, float)):
                    return int(value)

                # Try parsing string timestamp
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                    return int(dt.timestamp())
                except:
                    pass

        # Default to current time
        return int(time.time())

    def _extract_badges(self, record: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        AUTOMATED: Extract badges from record.
        Can be used for status, priority, etc.

        Args:
            record: Database record

        Returns:
            List of badge objects
        """
        badges = []

        # Status badge
        status = record.get('status')
        if status:
            badge_type = 'success' if status.lower() == 'active' else 'default'
            badges.append({
                'badge_name': status,
                'category': 'status',
                'badge_type': badge_type
            })

        # Priority badge
        priority = record.get('priority')
        if priority:
            badge_type = 'danger' if priority.lower() in ['critical', 'high'] else 'default'
            badges.append({
                'badge_name': priority,
                'category': 'priority',
                'badge_type': badge_type
            })

        return badges

    def _get_empty_table_response(self, table_uri: str) -> Dict[str, Any]:
        """
        Returns a minimal valid table response when no data is found.
        This prevents Amundsen from crashing with "Something went wrong..."
        """
        parsed = self._parse_table_uri(table_uri)

        return {
            'database': parsed.get('database', 'optimusdb'),
            'cluster': 'optimusdb',
            'schema': parsed.get('schema', 'datacatalog'),
            'name': parsed.get('name', 'unknown'),
            'key': table_uri,
            'description': 'No data available for this table',
            'last_updated_timestamp': int(time.time()),
            'columns': [],
            'owners': [{'display_name': 'system', 'email': 'system@company.com', 'user_id': 'system'}],
            'tags': [],
            'badges': [],
            'is_view': False,
            'table_writer': {'application_url': '', 'description': 'OptimusDB', 'id': 'optimusdb', 'name': 'OptimusDB'},
            'table_readers': [],
            'watermarks': [],
            'source': {'source': 'optimusdb', 'source_type': 'Table'},
            'programmatic_descriptions': []
        }

    # ------------------------------------------------------------------
    # Table Description Methods
    # ------------------------------------------------------------------
    def get_table_description(self, *, table_uri: str) -> str:
        """Fetch description for the given table."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            sql = f"select description from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "description" in records[0]:
                return records[0]["description"] or ""
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] get_table_description error: {e}")
        return ""

    def put_table_description(self, *, table_uri: str, description: str) -> None:
        """Update the table description in OptimusDB."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            sql = f"""
                update datacatalog 
                set description='{description.replace("'", "''")}' 
                where metadata_type='{schema}' and name='{name}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Updated description for {table_uri}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] put_table_description error: {e}")

    # ------------------------------------------------------------------
    # Column Metadata
    # ------------------------------------------------------------------
    def get_column_description(self, *, table_uri: str, column_name: str) -> str:
        """Fetch description for a specific column."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            sql = f"""
                select column_descriptions from datacatalog 
                where metadata_type='{schema}' and name='{name}';
            """
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "column_descriptions" in records[0]:
                col_desc = records[0].get("column_descriptions", "")
                # Parse JSON-like column descriptions
                try:
                    col_dict = json.loads(col_desc) if col_desc else {}
                    return col_dict.get(column_name, "")
                except:
                    return ""
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] get_column_description error: {e}")
        return ""

    def put_column_description(self, *, table_uri: str, column_name: str, description: str) -> None:
        """Update column description."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # First, get existing column descriptions
            sql = f"select column_descriptions from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            col_dict = {}
            if records and "column_descriptions" in records[0]:
                try:
                    col_dict = json.loads(records[0].get("column_descriptions", "{}"))
                except:
                    col_dict = {}

            col_dict[column_name] = description
            col_json = json.dumps(col_dict).replace("'", "''")

            # Update with new column descriptions
            sql = f"""
                update datacatalog 
                set column_descriptions='{col_json}' 
                where metadata_type='{schema}' and name='{name}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Updated column description for {table_uri}.{column_name}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] put_column_description error: {e}")

    # ------------------------------------------------------------------
    # Tags
    # ------------------------------------------------------------------
    def get_tags(self) -> List[Dict[str, Any]]:
        """Fetch all unique tags from datacatalog."""
        try:
            sql = "select tags from datacatalog where tags is not null and tags != '';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            tag_set = set()
            for rec in records:
                tags_str = rec.get("tags", "")
                if tags_str:
                    for tag in tags_str.split(","):
                        tag = tag.strip()
                        if tag:
                            tag_set.add(tag)

            return [{"tag_name": tag, "tag_count": 1} for tag in sorted(tag_set)]
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_tags error: {e}")
            return []

    def add_tag(self, *, id: str, tag: str, tag_type: str = "default") -> None:
        """Add a tag to a resource (table)."""
        try:
            parsed = self._parse_table_uri(id)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current tags
            sql = f"select tags from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            current_tags = []
            if records:
                tags_str = records[0].get("tags", "")
                current_tags = [t.strip() for t in tags_str.split(",") if t.strip()]

            if tag not in current_tags:
                current_tags.append(tag)

            new_tags = ",".join(current_tags)
            sql = f"""
                update datacatalog 
                set tags='{new_tags}' 
                where metadata_type='{schema}' and name='{name}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Added tag '{tag}' to {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] add_tag error: {e}")

    def delete_tag(self, *, id: str, tag: str, tag_type: str = "default") -> None:
        """Remove a tag from a resource."""
        try:
            parsed = self._parse_table_uri(id)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current tags
            sql = f"select tags from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records:
                tags_str = records[0].get("tags", "")
                current_tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                current_tags = [t for t in current_tags if t != tag]

                new_tags = ",".join(current_tags)
                sql = f"""
                    update datacatalog 
                    set tags='{new_tags}' 
                    where metadata_type='{schema}' and name='{name}';
                """
                self._execute_sql(sql)
                logger.info(f"[OptimusDBProxy] Deleted tag '{tag}' from {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] delete_tag error: {e}")

    # ------------------------------------------------------------------
    # Badges
    # ------------------------------------------------------------------
    def get_badges(self) -> List:
        """
        Get all badges.

        FIXED: Now uses _parse_optimusdb_response() for proper JSON handling.
        """
        logger.info("[OptimusDBProxy] get_badges called")

        try:
            query = "SELECT DISTINCT badge FROM badges;"

            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": query,
                "graph_traversal": [{}],
                "criteria": []
            }

            response = self.session.post(
                f"{self.base_url}/swarmkb/command",
                json=payload,
                timeout=self.timeout
            )

            # ✅ USE HELPER FUNCTION
            result = self._parse_optimusdb_response(response)

            # Now safe to use .get()
            records = result.get('data', {}).get('records', [])

            badges = []
            for record in records:
                badge_name = record.get('badge', '')
                if badge_name:
                    badges.append({
                        'badge_name': badge_name,
                        'category': 'default'
                    })

            logger.info(f"[OptimusDBProxy] Retrieved {len(badges)} badges")
            return badges

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_badges error: {e}")
            return []

    def add_badge(self, *, id: str, badge_name: str, category: str = "default") -> None:
        """Add a badge to a resource."""
        try:
            parsed = self._parse_table_uri(id)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current badges
            sql = f"select badges from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            current_badges = []
            if records:
                badges_str = records[0].get("badges", "")
                current_badges = [b.strip() for b in badges_str.split(",") if b.strip()]

            if badge_name not in current_badges:
                current_badges.append(badge_name)

            new_badges = ",".join(current_badges)
            sql = f"""
                update datacatalog 
                set badges='{new_badges}' 
                where metadata_type='{schema}' and name='{name}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Added badge '{badge_name}' to {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] add_badge error: {e}")

    def delete_badge(self, *, id: str, badge_name: str, category: str = "default") -> None:
        """Remove a badge from a resource."""
        try:
            parsed = self._parse_table_uri(id)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current badges
            sql = f"select badges from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records:
                badges_str = records[0].get("badges", "")
                current_badges = [b.strip() for b in badges_str.split(",") if b.strip()]
                current_badges = [b for b in current_badges if b != badge_name]

                new_badges = ",".join(current_badges)
                sql = f"""
                    update datacatalog 
                    set badges='{new_badges}' 
                    where metadata_type='{schema}' and name='{name}';
                """
                self._execute_sql(sql)
                logger.info(f"[OptimusDBProxy] Deleted badge '{badge_name}' from {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] delete_badge error: {e}")

    # ------------------------------------------------------------------
    # Owners
    # ------------------------------------------------------------------
    def add_owner(self, *, table_uri: str, owner: str) -> None:
        """Add an owner to a table."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current owners
            sql = f"select owners from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            current_owners = []
            if records:
                owners_str = records[0].get("owners", "") or records[0].get("created_by", "")
                current_owners = [o.strip() for o in owners_str.split(",") if o.strip()]

            if owner not in current_owners:
                current_owners.append(owner)

            new_owners = ",".join(current_owners)
            sql = f"""
                update datacatalog 
                set owners='{new_owners}' 
                where metadata_type='{schema}' and name='{name}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Added owner '{owner}' to {table_uri}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] add_owner error: {e}")

    def delete_owner(self, *, table_uri: str, owner: str) -> None:
        """Remove an owner from a table."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            # Get current owners
            sql = f"select owners from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records:
                owners_str = records[0].get("owners", "")
                current_owners = [o.strip() for o in owners_str.split(",") if o.strip()]
                current_owners = [o for o in current_owners if o != owner]

                new_owners = ",".join(current_owners)
                sql = f"""
                    update datacatalog 
                    set owners='{new_owners}' 
                    where metadata_type='{schema}' and name='{name}';
                """
                self._execute_sql(sql)
                logger.info(f"[OptimusDBProxy] Deleted owner '{owner}' from {table_uri}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] delete_owner error: {e}")

    # ------------------------------------------------------------------
    # Resource Methods (Generic)
    # ------------------------------------------------------------------
    def add_resource_owner(self, *, id: str, owner: str, resource_type: str) -> None:
        """Add owner to any resource type."""
        if resource_type.lower() == "table":
            self.add_owner(table_uri=id, owner=owner)

    def delete_resource_owner(self, *, id: str, owner: str, resource_type: str) -> None:
        """Remove owner from any resource type."""
        if resource_type.lower() == "table":
            self.delete_owner(table_uri=id, owner=owner)

    def get_resource_description(self, *, resource_type: str, id: str) -> str:
        """Get description for any resource type."""
        if resource_type.lower() == "table":
            return self.get_table_description(table_uri=id)
        return ""

    def put_resource_description(self, *, resource_type: str, id: str, description: str) -> None:
        """Update description for any resource type."""
        if resource_type.lower() == "table":
            self.put_table_description(table_uri=id, description=description)

    def get_resource_generation_code(self, *, resource_type: str, id: str) -> str:
        """Get generation code (SQL/DDL) for a resource."""
        try:
            parsed = self._parse_table_uri(id)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            sql = f"select generation_code from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "generation_code" in records[0]:
                return records[0].get("generation_code", "")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] get_resource_generation_code error: {e}")
        return ""

    # ------------------------------------------------------------------
    # Lineage
    # ------------------------------------------------------------------
    def get_lineage(self, *, id: str, resource_type: str, direction: str, depth: int = 1) -> Dict[str, Any]:
        """
        Get lineage information for a resource.
        Returns upstream/downstream dependencies in Amundsen format.
        """
        try:
            parsed = self._parse_table_uri(id)
            schema = parsed['schema']
            name = parsed['name']

            sql = f"SELECT lineage_upstream, lineage_downstream FROM datacatalog WHERE metadata_type='{schema}' AND name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if not records:
                return {
                    "upstream_entities": [],
                    "downstream_entities": [],
                    "depth": depth,
                    "direction": direction,
                    "key": id
                }

            upstream = []
            downstream = []

            if direction in ["upstream", "both"]:
                upstream_str = records[0].get("lineage_upstream", "")
                if upstream_str:
                    try:
                        upstream_data = json.loads(upstream_str)
                        # Convert to Amundsen format
                        upstream = [
                            {
                                "key": item.get("key", "") if isinstance(item, dict) else item,
                                "level": item.get("level", 1) if isinstance(item, dict) else 1,
                                "source": "optimusdb",
                                "badges": []
                            }
                            for item in upstream_data
                        ]
                    except Exception as e:
                        logger.error(f"[OptimusDBProxy] Error parsing upstream lineage: {e}")

            if direction in ["downstream", "both"]:
                downstream_str = records[0].get("lineage_downstream", "")
                if downstream_str:
                    try:
                        downstream_data = json.loads(downstream_str)
                        # Convert to Amundsen format
                        downstream = [
                            {
                                "key": item.get("key", "") if isinstance(item, dict) else item,
                                "level": item.get("level", 1) if isinstance(item, dict) else 1,
                                "source": "optimusdb",
                                "badges": []
                            }
                            for item in downstream_data
                        ]
                    except Exception as e:
                        logger.error(f"[OptimusDBProxy] Error parsing downstream lineage: {e}")

            return {
                "upstream_entities": upstream,
                "downstream_entities": downstream,
                "depth": depth,
                "direction": direction,
                "key": id
            }

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_lineage error: {e}")
            return {
                "upstream_entities": [],
                "downstream_entities": [],
                "depth": depth,
                "direction": direction,
                "key": id
            }

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------
    def get_statistics(self, *, table_uri: str) -> List[Dict[str, Any]]:
        """Get statistics for a table."""
        try:
            parsed = self._parse_table_uri(table_uri)
            database = parsed['database']
            schema = parsed['schema']
            name = parsed['name']

            sql = f"select statistics from datacatalog where metadata_type='{schema}' and name='{name}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "statistics" in records[0]:
                stats_str = records[0].get("statistics", "")
                if stats_str:
                    try:
                        return json.loads(stats_str)
                    except:
                        pass

            # Return default statistics
            return [
                {"stat_type": "row_count", "stat_val": "0", "start_epoch": 0, "end_epoch": int(time.time())},
                {"stat_type": "col_count", "stat_val": "0", "start_epoch": 0, "end_epoch": int(time.time())}
            ]
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_statistics error: {e}")
            return []

    # ------------------------------------------------------------------
    # User Methods
    # ------------------------------------------------------------------
    def get_user(self, *, id: str) -> Union[Dict[str, Any], None]:
        """
        Get user by ID.
        Returns a dictionary with user data, or creates a default user if not found.
        """
        logger.info(f"[OptimusDBProxy] get_user called with id={id}")

        try:
            query = f"SELECT * FROM users WHERE user_id='{id}' LIMIT 1;"

            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": query,
                "graph_traversal": [{}],
                "criteria": []
            }

            response = self.session.post(
                f"{self.base_url}/swarmkb/command",
                json=payload,
                timeout=self.timeout
            )

            result = self._parse_optimusdb_response(response)
            records = result.get('data', {}).get('records', [])

            if not records:
                logger.warning(f"[OptimusDBProxy] User not found: {id}, returning default user")
                # Return a default user instead of None
                return {
                    "email": f"{id}@company.com",
                    "user_id": id,
                    "display_name": id,
                    "profile_url": "",
                    "is_active": True,
                    "github_username": "",
                    "team_name": "",
                    "slack_id": "",
                    "employee_type": ""
                }

            user_data = records[0]

            return {
                "email": user_data.get("email", f"{id}@company.com"),
                "user_id": user_data.get("user_id", id),
                "display_name": user_data.get("display_name", id),
                "profile_url": user_data.get("profile_url", ""),
                "is_active": user_data.get("is_active", True),
                "github_username": user_data.get("github_username", ""),
                "team_name": user_data.get("team_name", ""),
                "slack_id": user_data.get("slack_id", ""),
                "employee_type": user_data.get("employee_type", "")
            }

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_user error: {e}", exc_info=True)
            # Return default user on error instead of None
            return {
                "email": f"{id}@company.com",
                "user_id": id,
                "display_name": id,
                "profile_url": "",
                "is_active": True,
                "github_username": "",
                "team_name": "",
                "slack_id": "",
                "employee_type": ""
            }

    def get_users(self) -> List[Dict[str, Any]]:
        """Get all users."""
        try:
            sql = "select * from users;"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            users = []
            for user in records:
                users.append({
                    "email": user.get("email", ""),
                    "user_id": user.get("user_id", ""),
                    "display_name": user.get("display_name", ""),
                    "is_active": user.get("is_active", True)
                })

            return users
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_users error: {e}")
            return []

    def create_update_user(self, *, user: Dict[str, Any]) -> None:
        """Create or update user information."""
        try:
            user_id = user.get("user_id", user.get("email", ""))
            email = user.get("email", user_id)
            display_name = user.get("display_name", user_id)
            is_active = user.get("is_active", True)

            # Check if user exists
            sql = f"select user_id from users where user_id='{user_id}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records:
                # Update
                sql = f"""
                    update users 
                    set email='{email}', display_name='{display_name}', is_active={is_active}
                    where user_id='{user_id}';
                """
            else:
                # Insert
                sql = f"""
                    insert into users (user_id, email, display_name, is_active)
                    values ('{user_id}', '{email}', '{display_name}', {is_active});
                """

            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Created/updated user {user_id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] create_update_user error: {e}")

    # ------------------------------------------------------------------
    # User Relations - FIXED
    # ------------------------------------------------------------------
    def add_resource_relation_by_user(self, *, id: str, user_id: str, relation_type: str, resource_type: str) -> None:
        """Add user relationship to a resource (e.g., bookmark, follow)."""
        try:
            sql = f"""
                insert into user_resource_relations (resource_id, user_id, relation_type, resource_type)
                values ('{id}', '{user_id}', '{relation_type}', '{resource_type}');
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Added relation {relation_type} for user {user_id} on {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] add_resource_relation_by_user error: {e}")

    def delete_resource_relation_by_user(self, *, id: str, user_id: str, relation_type: str, resource_type: str) -> None:
        """Remove user relationship from a resource."""
        try:
            sql = f"""
                delete from user_resource_relations 
                where resource_id='{id}' and user_id='{user_id}' and relation_type='{relation_type}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Deleted relation {relation_type} for user {user_id} on {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] delete_resource_relation_by_user error: {e}")

    def get_table_by_user_relation(self, *, user_email: str, relation_type: UserResourceRel) -> Dict[str, Any]:
        """
        Get tables by user relation.

        FIXED: Proper handling of UserResourceRel enum.
        """
        # FIX: Extract the name attribute properly
        try:
            relation_name = relation_type.name if hasattr(relation_type, 'name') else str(relation_type)
        except Exception as e:
            logger.error(f"[OptimusDBProxy] Error getting relation_type name: {e}")
            relation_name = "follow"  # Default fallback

        logger.info(f"[OptimusDBProxy] get_table_by_user_relation: user={user_email}, relation={relation_name}")

        try:
            query = f"""
            SELECT t.* FROM datacatalog t
            JOIN user_table_relations r ON t._id = r.table_id
            WHERE r.user_email='{user_email}' AND r.relation_type='{relation_name}';
            """

            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": query,
                "graph_traversal": [{}],
                "criteria": []
            }

            response = self.session.post(
                f"{self.base_url}/swarmkb/command",
                json=payload,
                timeout=self.timeout
            )

            # ✅ USE HELPER FUNCTION
            result = self._parse_optimusdb_response(response)

            # Now safe to use .get()
            records = result.get('data', {}).get('records', [])

            tables = []
            for rec in records:
                schema = rec.get("metadata_type", "default")
                database = rec.get("component", "optimusdb")
                name = rec.get("name", "unknown")

                tables.append({
                    'key': self._build_table_key(database, schema, name),
                    'name': name,
                    'schema': schema,
                    'database': database,
                    'description': rec.get('description', '')
                })

            return {
                'table': tables,
                'msg': 'Success',
                'status_code': 200
            }

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_table_by_user_relation error: {e}", exc_info=True)
            return {'table': [], 'msg': str(e), 'status_code': 500}

    def get_frequently_used_tables(self, *, user_email: str) -> Dict[str, Any]:
        """Get frequently used tables for a user."""
        try:
            sql = f"""
                select resource_id, count(*) as usage_count from user_resource_relations
                where user_id='{user_email}' and relation_type='read'
                group by resource_id
                order by usage_count desc
                limit 10;
            """
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            tables = []
            for rec in records:
                table_uri = rec.get("resource_id", "")
                parsed = self._parse_table_uri(table_uri)
                database = parsed['database']
                schema = parsed['schema']
                name = parsed['name']

                tables.append({
                    "key": self._build_table_key(database, schema, name),
                    "name": name,
                    "schema": schema,
                    "cluster": "default",
                    "database": database,
                    "description": f"Frequently accessed dataset {name}"
                })

            return {"table": tables}
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_frequently_used_tables error: {e}")
            return {"table": []}

    # ------------------------------------------------------------------
    # Dashboard Methods
    # ------------------------------------------------------------------
    def get_dashboard(self, *, id: str) -> Dict[str, Any]:
        """Get dashboard metadata."""
        try:
            sql = f"select * from dashboards where dashboard_id='{id}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records:
                dash = records[0]
                return {
                    "uri": dash.get("dashboard_id", id),
                    "cluster": "default",
                    "group_name": dash.get("group_name", ""),
                    "group_url": dash.get("group_url", ""),
                    "product": dash.get("product", ""),
                    "name": dash.get("name", ""),
                    "url": dash.get("url", ""),
                    "description": dash.get("description", ""),
                    "created_timestamp": dash.get("created_timestamp", int(time.time())),
                    "updated_timestamp": dash.get("updated_timestamp", int(time.time())),
                    "last_successful_run_timestamp": dash.get("last_run", 0)
                }
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_dashboard error: {e}")
        return {}

    def get_dashboard_description(self, *, id: str) -> str:
        """Get dashboard description."""
        try:
            sql = f"select description from dashboards where dashboard_id='{id}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "description" in records[0]:
                return records[0].get("description", "")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] get_dashboard_description error: {e}")
        return ""

    def put_dashboard_description(self, *, id: str, description: str) -> None:
        """Update dashboard description."""
        try:
            sql = f"""
                update dashboards 
                set description='{description.replace("'", "''")}' 
                where dashboard_id='{id}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Updated dashboard description for {id}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] put_dashboard_description error: {e}")

    def get_dashboard_by_user_relation(self, *, user_email: str, relation_type: UserResourceRel) -> Dict[str, Any]:
        """
        Get dashboards by user relation.

        FIXED: Proper handling of UserResourceRel enum.
        """
        # FIX: Extract the name attribute properly
        try:
            relation_name = relation_type.name if hasattr(relation_type, 'name') else str(relation_type)
        except Exception as e:
            logger.error(f"[OptimusDBProxy] Error getting relation_type name: {e}")
            relation_name = "follow"  # Default fallback

        logger.info(f"[OptimusDBProxy] get_dashboard_by_user_relation: user={user_email}, relation={relation_name}")

        try:
            query = f"""
            SELECT d.* FROM dashboards d
            JOIN user_dashboard_relations r ON d._id = r.dashboard_id
            WHERE r.user_email='{user_email}' AND r.relation_type='{relation_name}';
            """

            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": query,
                "graph_traversal": [{}],
                "criteria": []
            }

            response = self.session.post(
                f"{self.base_url}/swarmkb/command",
                json=payload,
                timeout=self.timeout
            )

            # ✅ USE HELPER FUNCTION
            result = self._parse_optimusdb_response(response)

            # Now safe to use .get()
            records = result.get('data', {}).get('records', [])

            dashboards = []
            for dash in records:
                dashboards.append({
                    "uri": dash.get("dashboard_id", ""),
                    "name": dash.get("name", ""),
                    "url": dash.get("url", ""),
                    "description": dash.get("description", ""),
                    "group_name": dash.get("group_name", "")
                })

            return {
                'dashboard': dashboards,
                'msg': 'Success',
                'status_code': 200
            }

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_dashboard_by_user_relation error: {e}", exc_info=True)
            return {'dashboard': [], 'msg': str(e), 'status_code': 500}

    def get_resources_using_table(self, *, id: str, resource_type: str) -> List[Dict[str, Any]]:
        """Get resources (dashboards, etc.) that use a specific table."""
        try:
            # Query the relationship table
            sql = f"""
                SELECT d.* 
                FROM dashboards d
                JOIN table_dashboard_relations r ON d.dashboard_id = r.dashboard_id
                WHERE r.table_uri = '{id}';
            """

            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            resources = []
            for dash in records:
                resources.append({
                    "type": "dashboard",
                    "cluster": "default",
                    "group_name": dash.get("group_name", ""),
                    "group_url": dash.get("group_url", ""),
                    "product": dash.get("product", ""),
                    "name": dash.get("name", ""),
                    "url": dash.get("url", ""),
                    "description": dash.get("description", "")
                })

            logger.info(f"[OptimusDBProxy] Found {len(resources)} dashboards using table {id}")
            return resources

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_resources_using_table error: {e}")
            return []

    # ------------------------------------------------------------------
    # Type Metadata
    # ------------------------------------------------------------------
    def get_type_metadata_description(self, *, type_metadata_key: str) -> str:
        """Get description for a type metadata."""
        try:
            sql = f"select description from type_metadata where type_key='{type_metadata_key}';"
            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            if records and "description" in records[0]:
                return records[0].get("description", "")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] get_type_metadata_description error: {e}")
        return ""

    def put_type_metadata_description(self, *, type_metadata_key: str, description: str) -> None:
        """Update type metadata description."""
        try:
            sql = f"""
                update type_metadata 
                set description='{description.replace("'", "''")}' 
                where type_key='{type_metadata_key}';
            """
            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Updated type metadata description for {type_metadata_key}")
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] put_type_metadata_description error: {e}")

    # ------------------------------------------------------------------
    # Popularity Methods
    # ------------------------------------------------------------------
    def get_popular_resources(self, num_entries: int = 10, resource_types=None, user_id=None) -> Dict[str, List]:
        """
        Get popular resources from OptimusDB.

        This method now uses ONLY discover_datasets() to avoid duplication.
        """
        try:
            result = {"Table": [], "Dashboard": []}

            # Fetch all datasets from all nodes (no duplication)
            all_datasets = self.discover_datasets()

            # Deduplicate by key (in case there are still duplicates)
            seen_keys = set()
            unique_datasets = []

            for ds in all_datasets:
                key = ds.get("key", "")
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    unique_datasets.append(ds)

            # Take only the requested number
            result["Table"] = unique_datasets[:num_entries]

            logger.info(
                f"[OptimusDBProxy] get_popular_resources: {len(result['Table'])} unique datasets "
                f"(filtered from {len(all_datasets)} total, {len(all_datasets) - len(unique_datasets)} duplicates removed)"
            )

            return result

        except Exception as e:
            logger.exception(f"[OptimusDBProxy] get_popular_resources error: {e}")
            return {"Table": [], "Dashboard": []}

    def get_popular_tables(self, num_entries: int = 10) -> List[Dict[str, Any]]:
        """Return popular table data for OptimusDB."""
        try:
            result = self.get_popular_resources(num_entries=num_entries)
            return result.get("Table", [])
        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_popular_tables error: {e}")
            return []

    def get_latest_updated_ts(self) -> int:
        """Get latest update timestamp."""
        return int(time.time())

    def get_feature(self, *, feature_uri: str) -> Dict[str, Any]:
        """Get feature metadata (ML feature)."""
        return {
            "feature_group": "default",
            "name": "dummy_feature",
            "description": "Placeholder feature from OptimusDBProxy",
            "version": "1.0",
        }

    # ------------------------------------------------------------------
    # Discovery Methods
    # ------------------------------------------------------------------
    def discover_datasets(self) -> List[Dict[str, Any]]:
        """
        Discover datasets by querying all OptimusDB nodes via /swarmkb/command.
        Uses the internal Docker service ports (8089) instead of host-mapped ones.

        FIXED: Now uses _parse_optimusdb_response() for proper JSON handling.
        """
        try:
            datasets = []
            nodes = ["optimusdb1"]  # Add more nodes as needed
            internal_port = 8089

            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": "select * from datacatalog;",
                "graph_traversal": [{}],
                "criteria": []
            }

            for node in nodes:
                url = f"http://{node}:{internal_port}/swarmkb/command"
                try:
                    resp = self.session.post(url, json=payload, timeout=5)
                    if not resp.ok:
                        logger.warning(
                            f"[OptimusDBProxy] Node {node} responded with status {resp.status_code}"
                        )
                        continue

                    # ✅ USE HELPER FUNCTION
                    json_resp = self._parse_optimusdb_response(resp)
                    records = json_resp.get("data", {}).get("records", [])

                    if not isinstance(records, list):
                        logger.warning(
                            f"[OptimusDBProxy] Unexpected response type from {node}: {type(records)}"
                        )
                        continue

                    for rec in records:
                        schema = rec.get("metadata_type", "default")
                        database = rec.get("component", "optimusdb")
                        name = rec.get("name", "unknown")
                        desc = rec.get("description", f"Discovered dataset {name} from {node}")

                        entry = {
                            "type": "table",
                            "key": self._build_table_key(database, schema, name),
                            "name": f"{schema}.{name}",
                            "schema": schema,
                            "cluster": node,
                            "database": database,
                            "description": desc,
                            "column_names": list(rec.keys()) or ["_id", "name", "description"],
                            "columns": [
                                {"name": k, "description": "", "col_type": "string"} for k in rec.keys()
                            ],
                            "tags": (rec.get("tags", "") or "").split(","),
                            "owners": [rec.get("created_by", "system")],
                            "last_updated_timestamp": int(time.time()),
                            "preview": rec,
                            "resource_type": "table"
                        }

                        datasets.append(entry)

                    logger.info(
                        f"[OptimusDBProxy] Retrieved {len(records)} dataset(s) from {node}"
                    )

                except requests.exceptions.ConnectionError:
                    logger.warning(f"[OptimusDBProxy] {node} unreachable at {url}")
                except Exception as e:
                    logger.warning(f"[OptimusDBProxy] Failed to query {node}: {e}")

            logger.info(
                f"[OptimusDBProxy] Discovered total {len(datasets)} datasets across {len(nodes)} nodes"
            )
            return datasets

        except Exception as e:
            logger.error(f"[OptimusDBProxy] discover_datasets error: {e}")
            return []

    # ------------------------------------------------------------------
    # Search Methods
    # ------------------------------------------------------------------
    def get_table_by_search(self, *, query_term: str, page_index: int = 0, index: str = '') -> Dict[str, Any]:
        """
        Search for tables matching the query term.
        This is the PRIMARY method used by Amundsen frontend for table search.
        """
        try:
            logger.info(f"[OptimusDBProxy] Table search: '{query_term}' (page {page_index})")

            # Get all datasets (uses cached discovery if available)
            all_datasets = self._get_all_datasets_for_search()

            # Filter and score results
            scored_results = []
            query_lower = query_term.lower().strip()

            for dataset in all_datasets:
                score = self._calculate_search_score(dataset, query_lower)
                if score > 0:
                    scored_results.append((score, dataset))

            # Sort by score (highest first)
            scored_results.sort(key=lambda x: x[0], reverse=True)

            # Extract just the datasets
            matching_tables = [item[1] for item in scored_results]

            # Pagination
            page_size = 10
            start_idx = page_index * page_size
            end_idx = start_idx + page_size

            paginated_results = matching_tables[start_idx:end_idx]

            result = {
                "total_results": len(matching_tables),
                "results": paginated_results,
                "page_index": page_index
            }

            logger.info(
                f"[OptimusDBProxy] Search '{query_term}' returned {len(matching_tables)} results "
                f"(showing {len(paginated_results)} on page {page_index})"
            )

            return result

        except Exception as e:
            logger.exception(f"[OptimusDBProxy] get_table_by_search error: {e}")
            return {"total_results": 0, "results": [], "page_index": page_index}

    def _get_all_datasets_for_search(self) -> List[Dict[str, Any]]:
        """
        Get all datasets for searching. Uses caching if available.
        Override this method to implement custom caching strategy.
        """
        # Check if caching is enabled (you can add this to your config)
        cache_enabled = current_app.config.get('OPTIMUSDB_ENABLE_SEARCH_CACHE', False)

        if cache_enabled:
            # Try to get from cache (implement your caching logic here)
            pass

        # Discover datasets from all nodes
        return self.discover_datasets()

    def _calculate_search_score(self, dataset: Dict[str, Any], query_lower: str) -> float:
        """
        Calculate relevance score for a dataset based on query.
        Higher score = more relevant.
        """
        score = 0.0

        if not query_lower:
            return 0.0

        # Name matching (highest priority)
        name = dataset.get("name", "").lower()
        if name == query_lower:
            score += 100
        elif name.startswith(query_lower):
            score += 80
        elif query_lower in name:
            score += 50

        # Schema matching
        schema = dataset.get("schema", "").lower()
        if schema == query_lower or query_lower in schema:
            score += 40

        # Tag matching
        tags = dataset.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]

        for tag in tags:
            if query_lower == tag.lower() or query_lower in tag.lower():
                score += 30
                break

        # Description matching
        description = dataset.get("description", "").lower()
        if query_lower in description:
            score += 20

        # Column name matching
        column_names = dataset.get("column_names", [])
        for col in column_names:
            if query_lower in col.lower():
                score += 15
                break

        # Database matching
        database = dataset.get("database", "").lower()
        if query_lower in database:
            score += 10

        return score

    def get_dashboard_by_search(self, *, query_term: str, page_index: int = 0, index: str = '') -> Dict[str, Any]:
        """Search for dashboards matching the query term."""
        try:
            logger.info(f"[OptimusDBProxy] Dashboard search: '{query_term}' (page {page_index})")

            # Search in dashboards table
            query_escaped = query_term.replace("'", "''")
            sql = f"""
                select * from dashboards 
                where name like '%{query_escaped}%' 
                   or description like '%{query_escaped}%'
                   or group_name like '%{query_escaped}%'
                limit 100;
            """

            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            dashboards = []
            for dash in records:
                dashboards.append({
                    "type": "dashboard",
                    "uri": dash.get("dashboard_id", ""),
                    "cluster": "default",
                    "group_name": dash.get("group_name", ""),
                    "group_url": dash.get("group_url", ""),
                    "product": dash.get("product", ""),
                    "name": dash.get("name", ""),
                    "url": dash.get("url", ""),
                    "description": dash.get("description", ""),
                    "last_successful_run_timestamp": dash.get("last_run", 0)
                })

            # Pagination
            page_size = 10
            start_idx = page_index * page_size
            end_idx = start_idx + page_size

            paginated_results = dashboards[start_idx:end_idx]

            result = {
                "total_results": len(dashboards),
                "results": paginated_results,
                "page_index": page_index
            }

            logger.info(f"[OptimusDBProxy] Dashboard search returned {len(dashboards)} results")
            return result

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_dashboard_by_search error: {e}")
            return {"total_results": 0, "results": [], "page_index": page_index}

    def get_user_by_search(self, *, query_term: str, page_index: int = 0, index: str = '') -> Dict[str, Any]:
        """Search for users matching the query term."""
        try:
            logger.info(f"[OptimusDBProxy] User search: '{query_term}' (page {page_index})")

            # Search in users table
            query_escaped = query_term.replace("'", "''")
            sql = f"""
                select * from users 
                where user_id like '%{query_escaped}%' 
                   or email like '%{query_escaped}%'
                   or display_name like '%{query_escaped}%'
                limit 100;
            """

            json_resp = self._execute_sql(sql)
            records = json_resp.get("data", {}).get("records", [])

            users = []
            for user in records:
                users.append({
                    "type": "user",
                    "user_id": user.get("user_id", ""),
                    "email": user.get("email", ""),
                    "display_name": user.get("display_name", ""),
                    "profile_url": user.get("profile_url", ""),
                    "is_active": user.get("is_active", True),
                    "github_username": user.get("github_username", ""),
                    "team_name": user.get("team_name", ""),
                    "slack_id": user.get("slack_id", ""),
                    "employee_type": user.get("employee_type", "")
                })

            # Pagination
            page_size = 10
            start_idx = page_index * page_size
            end_idx = start_idx + page_size

            paginated_results = users[start_idx:end_idx]

            result = {
                "total_results": len(users),
                "results": paginated_results,
                "page_index": page_index
            }

            logger.info(f"[OptimusDBProxy] User search returned {len(users)} results")
            return result

        except Exception as e:
            logger.error(f"[OptimusDBProxy] get_user_by_search error: {e}")
            return {"total_results": 0, "results": [], "page_index": page_index}

    # ------------------------------------------------------------------
    # Demo registration hook
    # ------------------------------------------------------------------
    def _register_swarmkb_peers_metadata(self) -> None:
        """Register system table metadata with search service."""
        try:
            search_url = current_app.config.get("SEARCHSERVICE_BASE")
            if search_url:
                table_doc = {
                    "key": "system.swarmkb_peers",
                    "cluster": "default",
                    "database": "system",
                    "schema": "system",
                    "name": "swarmkb_peers",
                    "description": "Peer information from OptimusDB swarm",
                    "column_names": ["peer_id", "addresses"],
                    "last_updated_timestamp": int(time.time()),
                }
                self.session.post(
                    f"{search_url}/document",
                    json={"resource_type": "table", "document": table_doc},
                )
        except Exception as e:
            logger.warning(f"[OptimusDBProxy] Index registration failed: {e}")

    # Add this helper method to your OptimusDBProxy class
    def set_lineage(self, *, table_uri: str, upstream: List[str] = None, downstream: List[str] = None) -> None:
        """
        Store lineage information for a table.

        Args:
            table_uri: Table identifier
            upstream: List of upstream table URIs that this table depends on
            downstream: List of downstream table URIs that depend on this table
        """
        try:
            parsed = self._parse_table_uri(table_uri)
            schema = parsed['schema']
            name = parsed['name']

            # Prepare JSON strings
            upstream_json = json.dumps(upstream or []).replace("'", "''")
            downstream_json = json.dumps(downstream or []).replace("'", "''")

            sql = f"""
                UPDATE datacatalog 
                SET lineage_upstream='{upstream_json}',
                    lineage_downstream='{downstream_json}'
                WHERE metadata_type='{schema}' AND name='{name}';
            """

            self._execute_sql(sql)
            logger.info(f"[OptimusDBProxy] Updated lineage for {table_uri}")

        except Exception as e:
            logger.error(f"[OptimusDBProxy] set_lineage error: {e}")

    """
Enhanced Methods for OptimusDB Proxy
====================================
Add these methods to your existing optimusdb_proxy.py file

These fix:
1. Column display issues
2. Missing catalog statistics
3. Better error handling
"""




# ============================================================================
# ENHANCED METHOD 1: Better Schema Discovery with Fallback
# ============================================================================
    def _get_table_schema_enhanced(self, schema_name: str) -> List[Dict[str, str]]:
        """
        ENHANCED: Get schema with multiple fallback strategies.

        Strategy:
        1. Try SQL schema queries (PRAGMA, DESCRIBE, information_schema)
        2. If fails, query sample data and infer schema from actual data
        3. If still fails, return empty list

        Args:
            schema_name: Name of schema/table

        Returns:
            List of column definitions with 'name' and 'type'
        """
        logger.info(f"[OptimusDBProxy] Getting schema for: {schema_name}")

        # STRATEGY 1: Try SQL schema queries
        try:
            queries = [
                f"PRAGMA table_info({schema_name});",  # SQLite
                f"DESCRIBE {schema_name};",  # MySQL
                f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{schema_name}';"  # PostgreSQL
            ]

            for query in queries:
                payload = {
                    "method": {"argcnt": 2, "cmd": "sqldml"},
                    "args": ["dummy1", "dummy2"],
                    "dstype": "dsswres",
                    "sqldml": query,
                    "graph_traversal": [{}],
                    "criteria": []
                }

                response = self.session.post(
                    f"{self.base_url}/swarmkb/command",
                    json=payload,
                    timeout=self.timeout
                )

                result = self._parse_optimusdb_response(response)

                if not isinstance(result, dict):
                    continue

                data = result.get('data', {})
                if not isinstance(data, dict):
                    continue

                records = data.get('records', [])

                if records:
                    logger.info(f"[OptimusDBProxy] Got {len(records)} columns from SQL schema query")
                    return records

        except Exception as e:
            logger.warning(f"[OptimusDBProxy] SQL schema queries failed: {e}")

        # STRATEGY 2: Infer schema from sample data
        logger.info(f"[OptimusDBProxy] SQL schema failed, inferring from sample data...")
        try:
            sample_query = f"SELECT * FROM {schema_name} LIMIT 1;"
            result = self._execute_sql(sample_query)
            records = result.get('data', {}).get('records', [])

            if records and len(records) > 0:
                sample_record = records[0]
                inferred_schema = []

                for field_name, field_value in sample_record.items():
                    inferred_type = self._infer_column_type(field_value)
                    inferred_schema.append({
                        'name': field_name,
                        'type': inferred_type
                    })

                logger.info(f"[OptimusDBProxy] Inferred {len(inferred_schema)} columns from sample data")
                return inferred_schema

        except Exception as e:
            logger.error(f"[OptimusDBProxy] Failed to infer schema from sample: {e}")

        # STRATEGY 3: Last resort - return empty
        logger.warning(f"[OptimusDBProxy] Could not get schema for: {schema_name}")
        return []


def _infer_column_type(self, value: Any) -> str:
    """
    Infer column type from a sample value.

    Args:
        value: Sample value from the column

    Returns:
        String representing the column type
    """
    if value is None:
        return 'varchar'

    if isinstance(value, bool):
        return 'boolean'
    elif isinstance(value, int):
        return 'int'
    elif isinstance(value, float):
        return 'float'
    elif isinstance(value, str):
        # Check if it looks like a timestamp
        if 'T' in value and ('-' in value or ':' in value):
            return 'timestamp'
        return 'varchar'
    else:
        return 'varchar'


# ============================================================================
# ENHANCED METHOD 2: Catalog Statistics (NEW)
# ============================================================================
def get_catalog_statistics(self) -> Dict[str, Any]:
    """
    NEW METHOD: Get catalog-wide statistics.

    Returns:
        Dictionary with catalog statistics:
        {
            'total_datasets': 150,
            'total_schemas': 12,
            'total_columns': 1500,
            'last_updated': timestamp
        }
    """
    logger.info("[OptimusDBProxy] Getting catalog statistics")

    try:
        stats = {
            'total_datasets': 0,
            'total_schemas': 0,
            'total_columns': 0,
            'last_updated': int(time.time())
        }

        # Count total datasets
        try:
            count_query = "SELECT COUNT(*) as total FROM datacatalog;"
            result = self._execute_sql(count_query)
            records = result.get('data', {}).get('records', [])

            if records and len(records) > 0:
                stats['total_datasets'] = int(records[0].get('total', 0))
                logger.info(f"[OptimusDBProxy] Total datasets: {stats['total_datasets']}")
        except Exception as e:
            logger.error(f"[OptimusDBProxy] Error counting datasets: {e}")

        # Count unique schemas
        try:
            schema_query = "SELECT COUNT(DISTINCT metadata_type) as total FROM datacatalog;"
            result = self._execute_sql(schema_query)
            records = result.get('data', {}).get('records', [])

            if records and len(records) > 0:
                stats['total_schemas'] = int(records[0].get('total', 0))
                logger.info(f"[OptimusDBProxy] Total schemas: {stats['total_schemas']}")
        except Exception as e:
            logger.error(f"[OptimusDBProxy] Error counting schemas: {e}")

        # Estimate total columns (assuming average of 10 columns per dataset)
        stats['total_columns'] = stats['total_datasets'] * 10

        logger.info(f"[OptimusDBProxy] Catalog statistics: {stats}")
        return stats

    except Exception as e:
        logger.error(f"[OptimusDBProxy] Error getting catalog statistics: {e}")
        return {
            'total_datasets': 0,
            'total_schemas': 0,
            'total_columns': 0,
            'last_updated': int(time.time()),
            'error': str(e)
        }


# ============================================================================
# ENHANCED METHOD 3: Better Column Building with Validation
# ============================================================================
def _build_columns_from_record_enhanced(self, record: Dict[str, Any], schema_info: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    ENHANCED: Build columns list with better validation and error handling.

    Args:
        record: Database record with all fields
        schema_info: Schema information from _get_table_schema()

    Returns:
        List of column objects for Amundsen
    """
    columns = []

    if not record:
        logger.warning("[OptimusDBProxy] No record provided to build columns")
        return columns

    # If we have schema info, use it to get proper types
    schema_map = {}
    if schema_info:
        for col in schema_info:
            col_name = col.get('name', '')
            col_type = col.get('type', 'varchar')
            if col_name:
                schema_map[col_name] = col_type

        logger.info(f"[OptimusDBProxy] Using schema info for {len(schema_map)} columns")

    # Build columns from all fields in record
    sort_order = 0
    for field_name, field_value in record.items():
        # Skip internal fields that shouldn't be displayed
        if field_name.startswith('_internal_') or field_name.startswith('__'):
            continue

        # Get column type from schema or infer from value
        if field_name in schema_map:
            col_type = schema_map[field_name]
        else:
            col_type = self._infer_column_type(field_value)

        # Normalize type names for Amundsen
        col_type = self._normalize_column_type(col_type)

        # Create column description from field name
        col_description = field_name.replace('_', ' ').title()

        # Format value for display
        display_value = str(field_value) if field_value is not None else 'NULL'

        # Truncate very long values
        if len(display_value) > 100:
            display_value = display_value[:97] + '...'

        column = {
            'name': field_name,
            'description': col_description,
            'col_type': col_type,
            'sort_order': sort_order,
            'stats': [
                {
                    'stat_type': 'sample_value',
                    'stat_val': display_value,
                    'start_epoch': 0,
                    'end_epoch': int(time.time())
                }
            ]
        }

        columns.append(column)
        sort_order += 1

    logger.info(f"[OptimusDBProxy] Built {len(columns)} columns from record")
    return columns


def _normalize_column_type(self, col_type: str) -> str:
    """
    Normalize column type names to standard Amundsen types.

    Args:
        col_type: Raw column type from database

    Returns:
        Normalized type string
    """
    if not col_type:
        return 'varchar'

    col_type_upper = str(col_type).upper()

    # String types
    if any(t in col_type_upper for t in ['TEXT', 'VARCHAR', 'STRING', 'CHAR', 'CLOB']):
        return 'varchar'

    # Integer types
    if any(t in col_type_upper for t in ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT']):
        return 'int'

    # Float types
    if any(t in col_type_upper for t in ['FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL']):
        return 'float'

    # Timestamp types
    if any(t in col_type_upper for t in ['TIMESTAMP', 'DATETIME', 'DATE', 'TIME']):
        return 'timestamp'

    # Boolean types
    if any(t in col_type_upper for t in ['BOOLEAN', 'BOOL', 'BIT']):
        return 'boolean'

    # JSON types
    if 'JSON' in col_type_upper:
        return 'json'

    # Binary types
    if any(t in col_type_upper for t in ['BLOB', 'BINARY', 'BYTEA']):
        return 'binary'

    # Default to varchar
    return 'varchar'


# ============================================================================
# USAGE INSTRUCTIONS
# ============================================================================
"""
HOW TO INTEGRATE THESE METHODS:

1. Replace _get_table_schema() in your optimusdb_proxy.py with _get_table_schema_enhanced()
   - Rename the method from _get_table_schema_enhanced to _get_table_schema
   
2. Add the new methods _infer_column_type() and _normalize_column_type()

3. Add the new get_catalog_statistics() method

4. Replace _build_columns_from_record() with _build_columns_from_record_enhanced()
   - Rename from _build_columns_from_record_enhanced to _build_columns_from_record

5. In your get_table() method, add more logging:
   
   ```python
   def get_table(self, *, table_uri: str) -> Dict[str, Any]:
       logger.info(f"[OptimusDBProxy] get_table called with URI: {table_uri}")
       
       # ... existing code ...
       
       # After executing SQL
       logger.info(f"[OptimusDBProxy] Query returned {len(records)} records")
       
       # After building columns
       logger.info(f"[OptimusDBProxy] Built {len(columns)} columns")
       
       # ... rest of code ...
   ```

6. Add debug endpoint to test statistics:
   In metadata_service/__init__.py, after other APIs are registered:
   
   ```python
   from metadata_service.api.statistics import CatalogStatisticsAPI
   api.add_resource(CatalogStatisticsAPI, '/catalog/stats')
   ```
"""