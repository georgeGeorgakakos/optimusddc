"""
OptimusDB Search Proxy for Amundsen Search Service
===================================================

This proxy queries OptimusDB directly instead of Elasticsearch.
Place in: search/search_service/proxy/optimusdb_search.py

FIXED VERSION: All OptimusDB API calls now properly handle string-wrapped JSON responses.

Usage in config.py:
    from search_service.proxy.optimusdb_search import OptimusDBSearchProxy
    PROXY_CLIENT = OptimusDBSearchProxy
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import requests

from search_service.proxy.base import BaseProxy
from search_service.models.search_result import SearchResult
from search_service.models.table import Table
from search_service.models.user import User
from search_service.models.dashboard import Dashboard

LOGGER = logging.getLogger(__name__)


class OptimusDBSearchProxy(BaseProxy):
    """
    Search proxy that queries OptimusDB datacatalog directly.
    No Elasticsearch required!

    FIXED VERSION: Properly handles string-wrapped JSON responses from OptimusDB.
    """

    def __init__(self) -> None:
        self.optimusdb_url = os.environ.get('OPTIMUSDB_API_URL', 'http://localhost:18001')
        self.timeout = (5.0, 30.0)
        LOGGER.info(f"OptimusDBSearchProxy initialized with URL: {self.optimusdb_url}")

    # ------------------------------------------------------------------
    # CRITICAL FIX: Response Parser Helper
    # ------------------------------------------------------------------
    def _parse_optimusdb_response(self, response: requests.Response) -> Dict[str, Any]:
        """
        Parse OptimusDB response and handle string-wrapped JSON.

        CRITICAL: OptimusDB sometimes returns JSON wrapped as a string.
        This helper ensures we always get a dict, not a string.

        Args:
            response: requests.Response object

        Returns:
            dict: Parsed JSON response (always a dict, never a string)
        """
        try:
            result = response.json()

            # CRITICAL: Handle string-wrapped JSON
            if isinstance(result, str):
                LOGGER.warning("[OptimusDBSearchProxy] Response is string-wrapped JSON, parsing again")
                try:
                    result = json.loads(result)
                except json.JSONDecodeError as e:
                    LOGGER.error(f"[OptimusDBSearchProxy] Failed to parse string response: {e}")
                    LOGGER.error(f"[OptimusDBSearchProxy] Raw response: {result[:200]}...")
                    return {"data": {"records": []}}

            return result if isinstance(result, dict) else {"data": {"records": []}}

        except json.JSONDecodeError as e:
            LOGGER.error(f"[OptimusDBSearchProxy] JSON decode error: {e}")
            LOGGER.error(f"[OptimusDBSearchProxy] Raw response text: {response.text[:200]}...")
            return {"data": {"records": []}}
        except Exception as e:
            LOGGER.error(f"[OptimusDBSearchProxy] Unexpected error parsing response: {e}")
            return {"data": {"records": []}}

    # ------------------------------------------------------------------
    # Helper Methods
    # ------------------------------------------------------------------
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

            url = f"{self.optimusdb_url}/swarmkb/command"
            resp = requests.post(url, json=payload, timeout=self.timeout)

            if not resp.ok:
                LOGGER.error(f"OptimusDB query failed: {resp.status_code}")
                return {"data": {"records": []}}

            # ✅ USE HELPER FUNCTION
            return self._parse_optimusdb_response(resp)

        except Exception as e:
            LOGGER.exception(f"_execute_sql error: {e}")
            return {"data": {"records": []}}

    def _escape_sql(self, value: str) -> str:
        """Escape SQL string"""
        if not value:
            return ""
        return value.replace("'", "''")

    def _build_table_key(self, database: str, schema: str, name: str) -> str:
        """Build Amundsen-compatible table key"""
        database = (database or "optimusdb").replace(" ", "_")
        schema = (schema or "default").replace(" ", "_")
        name = (name or "unknown").replace(" ", "_")
        return f"{database}://default.{schema}/{name}"

    # =========================================================================
    # Table Search
    # =========================================================================

    def fetch_table_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
            filters: Optional[Dict[str, Any]] = None
    ) -> SearchResult:
        """
        Search for tables in OptimusDB datacatalog.

        FIXED: Properly handles string-wrapped JSON responses.
        """
        try:
            results_per_page = 10

            # Handle wildcard search
            if query_term in ('*', '', None):
                sql = "SELECT * FROM datacatalog ORDER BY name LIMIT 100;"
            else:
                term = self._escape_sql(query_term.lower())
                sql = f"""
                    SELECT * FROM datacatalog 
                    WHERE LOWER(name) LIKE '%{term}%'
                       OR LOWER(description) LIKE '%{term}%'
                       OR LOWER(tags) LIKE '%{term}%'
                       OR LOWER(metadata_type) LIKE '%{term}%'
                       OR LOWER(component) LIKE '%{term}%'
                    ORDER BY 
                        CASE 
                            WHEN LOWER(name) LIKE '{term}%' THEN 1
                            WHEN LOWER(name) LIKE '%{term}%' THEN 2
                            ELSE 3
                        END,
                        name
                    LIMIT 100;
                """

            LOGGER.info(f"Table search for: '{query_term}'")
            result = self._execute_sql(sql)
            records = result.get("data", {}).get("records", [])

            LOGGER.info(f"Found {len(records)} tables for '{query_term}'")

            # Convert to Table objects
            tables = []
            for rec in records:
                name = rec.get("name", "unknown")
                schema = rec.get("metadata_type", "default")
                database = rec.get("component", "optimusdb")
                description = rec.get("description", "")
                tags_str = rec.get("tags", "")
                tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []

                table = Table(
                    name=name,
                    key=self._build_table_key(database, schema, name),
                    description=description,
                    cluster="default",
                    database=database,
                    schema=schema,
                    column_names=[],
                    tags=tags,
                    badges=[],
                    last_updated_timestamp=0,
                    programmatic_descriptions=[]
                )
                tables.append(table)

            # Apply pagination
            start_idx = page_index * results_per_page
            end_idx = start_idx + results_per_page
            paginated = tables[start_idx:end_idx]

            return SearchResult(
                total_results=len(tables),
                results=paginated
            )

        except Exception as e:
            LOGGER.exception(f"fetch_table_search_results error: {e}")
            return SearchResult(total_results=0, results=[])

    # =========================================================================
    # User Search
    # =========================================================================

    def fetch_user_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
            filters: Optional[Dict[str, Any]] = None
    ) -> SearchResult:
        """
        Search for users in OptimusDB.

        FIXED: Properly handles string-wrapped JSON responses.
        """
        try:
            results_per_page = 10

            if query_term in ('*', '', None):
                sql = "SELECT * FROM users LIMIT 50;"
            else:
                term = self._escape_sql(query_term.lower())
                sql = f"""
                    SELECT * FROM users 
                    WHERE LOWER(email) LIKE '%{term}%'
                       OR LOWER(display_name) LIKE '%{term}%'
                       OR LOWER(team_name) LIKE '%{term}%'
                    LIMIT 50;
                """

            result = self._execute_sql(sql)
            records = result.get("data", {}).get("records", [])

            users = []
            for rec in records:
                display_name = rec.get("display_name", "")
                name_parts = display_name.split() if display_name else [""]

                user = User(
                    email=rec.get("email", ""),
                    first_name=name_parts[0] if name_parts else "",
                    last_name=" ".join(name_parts[1:]) if len(name_parts) > 1 else "",
                    full_name=display_name,
                    team_name=rec.get("team_name", "")
                )
                users.append(user)

            start_idx = page_index * results_per_page
            end_idx = start_idx + results_per_page

            return SearchResult(
                total_results=len(users),
                results=users[start_idx:end_idx]
            )

        except Exception as e:
            LOGGER.exception(f"fetch_user_search_results error: {e}")
            return SearchResult(total_results=0, results=[])

    # =========================================================================
    # Dashboard Search
    # =========================================================================

    def fetch_dashboard_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
            filters: Optional[Dict[str, Any]] = None
    ) -> SearchResult:
        """
        Search for dashboards in OptimusDB.

        FIXED: Properly handles string-wrapped JSON responses.
        """
        try:
            results_per_page = 10

            if query_term in ('*', '', None):
                sql = "SELECT * FROM dashboards LIMIT 50;"
            else:
                term = self._escape_sql(query_term.lower())
                sql = f"""
                    SELECT * FROM dashboards 
                    WHERE LOWER(name) LIKE '%{term}%'
                       OR LOWER(description) LIKE '%{term}%'
                       OR LOWER(group_name) LIKE '%{term}%'
                    LIMIT 50;
                """

            result = self._execute_sql(sql)
            records = result.get("data", {}).get("records", [])

            dashboards = []
            for rec in records:
                dashboard = Dashboard(
                    uri=rec.get("dashboard_id", ""),
                    name=rec.get("name", ""),
                    url=rec.get("url", ""),
                    description=rec.get("description", ""),
                    group_name=rec.get("group_name", ""),
                    group_url=rec.get("group_url", ""),
                    last_successful_run_timestamp=rec.get("last_run", 0)
                )
                dashboards.append(dashboard)

            start_idx = page_index * results_per_page
            end_idx = start_idx + results_per_page

            return SearchResult(
                total_results=len(dashboards),
                results=dashboards[start_idx:end_idx]
            )

        except Exception as e:
            LOGGER.exception(f"fetch_dashboard_search_results error: {e}")
            return SearchResult(total_results=0, results=[])

    # =========================================================================
    # Feature Search (ML Features)
    # =========================================================================

    def fetch_feature_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
            filters: Optional[Dict[str, Any]] = None
    ) -> SearchResult:
        """Search for ML features - returns empty for now"""
        return SearchResult(total_results=0, results=[])

    # =========================================================================
    # Document Operations (Index/Update/Delete)
    # =========================================================================

    def create_document(self, *, data: List[Dict[str, Any]], index: str = '') -> str:
        """Create document - data already in OptimusDB, this is a no-op"""
        LOGGER.info(f"create_document called with {len(data)} items (OptimusDB is source)")
        return "Documents managed by OptimusDB"

    def update_document(self, *, data: List[Dict[str, Any]], index: str = '') -> str:
        """Update document - data already in OptimusDB, this is a no-op"""
        LOGGER.info(f"update_document called with {len(data)} items (OptimusDB is source)")
        return "Documents managed by OptimusDB"

    def delete_document(self, *, data: List[str], index: str = '') -> str:
        """Delete document - data managed by OptimusDB"""
        LOGGER.info(f"delete_document called for {len(data)} items (OptimusDB is source)")
        return "Documents managed by OptimusDB"

    # =========================================================================
    # Alias Operations (not needed for OptimusDB)
    # =========================================================================

    def update_document_by_key(self, *, resource_key: str, resource_type: str, data: Dict) -> str:
        """Update by key - handled by OptimusDB"""
        return "Managed by OptimusDB"