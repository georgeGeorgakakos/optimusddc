"""
OptimusDB Search Proxy for Amundsen Search Service
===================================================

This proxy queries OptimusDB directly instead of Elasticsearch.
Place in: search/search_service/proxy/optimusdb_search.py

FIXED VERSION: All abstract methods from BaseProxy are now properly implemented.

Usage in config.py:
    from search_service.proxy.optimusdb_search import OptimusDBSearchProxy
    PROXY_CLIENT = OptimusDBSearchProxy
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Union

import requests

from search_service.proxy.base import BaseProxy
from search_service.models.search_result import SearchResult
from search_service.models.table import Table
from search_service.models.user import User
from search_service.models.dashboard import Dashboard

# Import Resource enum and SearchResponse
from search_service.proxy.es_proxy_utils import Resource
from amundsen_common.models.search import SearchResponse, Filter, HighlightOptions

LOGGER = logging.getLogger(__name__)


class OptimusDBSearchProxy(BaseProxy):
    """
    Search proxy that queries OptimusDB datacatalog directly.
    No Elasticsearch required!

    FIXED VERSION: All abstract methods properly implemented.
    """

    def __init__(self, *, host: Optional[str] = None, **kwargs: Any) -> None:
        """
        Initialize with optional host parameter for compatibility.

        Args:
            host: Optional OptimusDB host URL
            **kwargs: Additional arguments (ignored for compatibility)
        """
        # CRITICAL: Prioritize OPTIMUSDB_API_URL environment variable over host parameter
        # because host might be set to 'elasticsearch' in config
        optimusdb_url = os.environ.get('OPTIMUSDB_API_URL')
        if not optimusdb_url:
            optimusdb_url = host or 'http://localhost:18001'

        # Ensure URL has scheme (http://)
        if optimusdb_url and not optimusdb_url.startswith(('http://', 'https://')):
            optimusdb_url = f'http://{optimusdb_url}'

        self.optimusdb_url = optimusdb_url
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
    # NEW: Main search() method - REQUIRED ABSTRACT METHOD
    # =========================================================================
    def search(self, *,
               query_term: str,
               page_index: int,
               results_per_page: int,
               resource_types: List[Resource],
               filters: List[Filter],
               highlight_options: Dict[Resource, HighlightOptions]) -> SearchResponse:
        """
        Main unified search method across all resource types.

        This is the primary search entry point called by the API.

        Args:
            query_term: Search query string
            page_index: Page number (0-indexed)
            results_per_page: Number of results per page
            resource_types: List of resource types to search (TABLE, USER, DASHBOARD, FEATURE)
            filters: List of search filters
            highlight_options: Highlighting options per resource type

        Returns:
            SearchResponse: Unified search response with results from all resource types
        """
        try:
            LOGGER.info(f"[OptimusDBSearchProxy] search() called: query='{query_term}', "
                        f"page={page_index}, per_page={results_per_page}, "
                        f"resources={[r.name for r in resource_types]}")

            # If no resource types specified, search all
            if not resource_types:
                resource_types = [Resource.TABLE, Resource.USER, Resource.DASHBOARD, Resource.FEATURE]

            # Collect results from each resource type
            all_results = {}

            for resource in resource_types:
                if resource == Resource.TABLE:
                    result = self.fetch_table_search_results(
                        query_term=query_term,
                        page_index=page_index
                    )
                    all_results['table'] = {
                        'total_results': result.total_results,
                        'results': result.results
                    }

                elif resource == Resource.USER:
                    result = self.fetch_user_search_results(
                        query_term=query_term,
                        page_index=page_index
                    )
                    all_results['user'] = {
                        'total_results': result.total_results,
                        'results': result.results
                    }

                elif resource == Resource.DASHBOARD:
                    result = self.fetch_dashboard_search_results(
                        query_term=query_term,
                        page_index=page_index
                    )
                    all_results['dashboard'] = {
                        'total_results': result.total_results,
                        'results': result.results
                    }

                elif resource == Resource.FEATURE:
                    result = self.fetch_feature_search_results(
                        query_term=query_term,
                        page_index=page_index
                    )
                    all_results['feature'] = {
                        'total_results': result.total_results,
                        'results': result.results
                    }

            # Build SearchResponse with correct parameters
            # SearchResponse expects: msg, page_index, results_per_page, results, status_code
            return SearchResponse(
                msg='Success',
                page_index=page_index,
                results_per_page=results_per_page,
                results=all_results,
                status_code=200
            )

        except Exception as e:
            LOGGER.exception(f"[OptimusDBSearchProxy] search() error: {e}")
            return SearchResponse(
                msg=f'Search error: {str(e)}',
                page_index=page_index,
                results_per_page=results_per_page,
                results={},
                status_code=500
            )

    # =========================================================================
    # NEW: fetch_search_results_with_filter() - REQUIRED ABSTRACT METHOD
    # =========================================================================
    def fetch_search_results_with_filter(self, *,
                                         query_term: str,
                                         search_request: dict,
                                         page_index: int = 0,
                                         index: str = '') -> Union[SearchResult,
    SearchResult,
    SearchResult]:
        """
        Search with advanced filters.

        Args:
            query_term: Search query string
            search_request: JSON representation of search request with filters
            page_index: Page number
            index: Resource index (table, dashboard, feature)

        Returns:
            SearchResult: Filtered search results
        """
        try:
            LOGGER.info(f"[OptimusDBSearchProxy] fetch_search_results_with_filter() called: "
                        f"query='{query_term}', index='{index}', filters={search_request}")

            # For now, delegate to the appropriate search method
            # You can enhance this to handle the search_request filters

            if index == 'table_search_index' or index == 'table':
                return self.fetch_table_search_results(
                    query_term=query_term,
                    page_index=page_index,
                    index=index
                )
            elif index == 'dashboard_search_index' or index == 'dashboard':
                return self.fetch_dashboard_search_results(
                    query_term=query_term,
                    page_index=page_index,
                    index=index
                )
            elif index == 'feature_search_index' or index == 'feature':
                return self.fetch_feature_search_results(
                    query_term=query_term,
                    page_index=page_index,
                    index=index
                )
            else:
                # Default to table search
                return self.fetch_table_search_results(
                    query_term=query_term,
                    page_index=page_index
                )

        except Exception as e:
            LOGGER.exception(f"[OptimusDBSearchProxy] fetch_search_results_with_filter() error: {e}")
            return SearchResult(total_results=0, results=[])

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
                       OR LOWER(owners) LIKE '%{term}%'
                       OR LOWER(badges) LIKE '%{term}%'
                       OR LOWER(ai_summary) LIKE '%{term}%'
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
    # NEW: update_document_by_key() - FIXED SIGNATURE
    # =========================================================================
    def update_document_by_key(self, *,
                               resource_key: str,
                               resource_type: Resource,
                               field: str,
                               value: Optional[str] = None,
                               operation: str = 'add') -> str:
        """
        Update specific field in a document by key.

        Args:
            resource_key: Unique key for the resource
            resource_type: Type of resource (TABLE, USER, DASHBOARD, FEATURE)
            field: Field to update
            value: New value for the field
            operation: Operation type ('add', 'update', 'remove')

        Returns:
            str: Status message
        """
        LOGGER.info(f"update_document_by_key called: resource={resource_type.name}, "
                    f"key={resource_key}, field={field}, op={operation}")
        return "Managed by OptimusDB"

    # =========================================================================
    # NEW: delete_document_by_key() - REQUIRED ABSTRACT METHOD
    # =========================================================================
    def delete_document_by_key(self, *,
                               resource_key: str,
                               resource_type: Resource,
                               field: str,
                               value: Optional[str] = None) -> str:
        """
        Delete specific field from a document by key.

        Args:
            resource_key: Unique key for the resource
            resource_type: Type of resource (TABLE, USER, DASHBOARD, FEATURE)
            field: Field to delete
            value: Optional value to match before deleting

        Returns:
            str: Status message
        """
        LOGGER.info(f"delete_document_by_key called: resource={resource_type.name}, "
                    f"key={resource_key}, field={field}")
        return "Managed by OptimusDB"