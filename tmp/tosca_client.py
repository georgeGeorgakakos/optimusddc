"""
Tosca Upload Python Client
===========================
A Python client for interacting with Tricentis Tosca REST API.

Features:
- Authentication (Basic, OAuth, API Key)
- Upload test results
- Manage test cases
- Execute test scenarios
- Query execution results
- Upload attachments

Author: OptimusDB Team
Version: 1.0.0
"""

import requests
import json
import os
import base64
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import logging
from pathlib import Path


class ToscaClientError(Exception):
    """Base exception for Tosca client errors"""
    pass


class ToscaAuthenticationError(ToscaClientError):
    """Authentication failed"""
    pass


class ToscaUploadError(ToscaClientError):
    """Upload operation failed"""
    pass


class ToscaClient:
    """
    Main client for interacting with Tosca REST API.

    Example:
        >>> client = ToscaClient(
        ...     base_url="https://tosca.example.com/api",
        ...     auth_type="basic",
        ...     username="user@example.com",
        ...     password="your-password"
        ... )
        >>> result = client.upload_test_result(
        ...     test_case_id="TC-001",
        ...     status="Passed",
        ...     duration=120
        ... )
    """

    def __init__(
            self,
            base_url: str,
            auth_type: str = "basic",
            username: Optional[str] = None,
            password: Optional[str] = None,
            api_key: Optional[str] = None,
            oauth_token: Optional[str] = None,
            verify_ssl: bool = True,
            timeout: int = 30,
            log_level: str = "INFO"
    ):
        """
        Initialize Tosca client.

        Args:
            base_url: Base URL of Tosca API (e.g., https://tosca.example.com/api)
            auth_type: Authentication type ("basic", "apikey", "oauth")
            username: Username for basic auth
            password: Password for basic auth
            api_key: API key for API key auth
            oauth_token: OAuth token for OAuth auth
            verify_ssl: Whether to verify SSL certificates
            timeout: Request timeout in seconds
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        """
        self.base_url = base_url.rstrip('/')
        self.auth_type = auth_type.lower()
        self.username = username
        self.password = password
        self.api_key = api_key
        self.oauth_token = oauth_token
        self.verify_ssl = verify_ssl
        self.timeout = timeout

        # Setup logging
        logging.basicConfig(
            level=getattr(logging, log_level.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

        # Session for connection pooling
        self.session = requests.Session()
        self._setup_auth()

        self.logger.info(f"Tosca client initialized with base URL: {self.base_url}")

    def _setup_auth(self):
        """Setup authentication headers"""
        if self.auth_type == "basic":
            if not self.username or not self.password:
                raise ToscaAuthenticationError("Username and password required for basic auth")

            credentials = f"{self.username}:{self.password}"
            encoded = base64.b64encode(credentials.encode()).decode()
            self.session.headers.update({
                "Authorization": f"Basic {encoded}"
            })
            self.logger.debug("Basic authentication configured")

        elif self.auth_type == "apikey":
            if not self.api_key:
                raise ToscaAuthenticationError("API key required for API key auth")

            self.session.headers.update({
                "X-API-Key": self.api_key
            })
            self.logger.debug("API key authentication configured")

        elif self.auth_type == "oauth":
            if not self.oauth_token:
                raise ToscaAuthenticationError("OAuth token required for OAuth auth")

            self.session.headers.update({
                "Authorization": f"Bearer {self.oauth_token}"
            })
            self.logger.debug("OAuth authentication configured")

        # Common headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

    def _make_request(
            self,
            method: str,
            endpoint: str,
            data: Optional[Dict] = None,
            params: Optional[Dict] = None,
            files: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request to Tosca API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint
            data: Request body data
            params: Query parameters
            files: Files to upload

        Returns:
            Response JSON data
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        try:
            self.logger.debug(f"{method} {url}")

            # Remove Content-Type header for file uploads
            headers = dict(self.session.headers)
            if files:
                headers.pop("Content-Type", None)

            response = self.session.request(
                method=method,
                url=url,
                json=data if not files else None,
                data=data if files and not isinstance(data, dict) else None,
                params=params,
                files=files,
                headers=headers if files else None,
                verify=self.verify_ssl,
                timeout=self.timeout
            )

            response.raise_for_status()

            if response.content:
                return response.json()
            return {"status": "success"}

        except requests.exceptions.HTTPError as e:
            self.logger.error(f"HTTP error: {e}")
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text
            raise ToscaClientError(f"Request failed: {error_detail}")

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request error: {e}")
            raise ToscaClientError(f"Request failed: {str(e)}")

    # =========================================================================
    # TEST RESULT OPERATIONS
    # =========================================================================

    def upload_test_result(
            self,
            test_case_id: str,
            status: str,
            duration: Optional[int] = None,
            started_at: Optional[str] = None,
            finished_at: Optional[str] = None,
            execution_user: Optional[str] = None,
            error_message: Optional[str] = None,
            stack_trace: Optional[str] = None,
            attachments: Optional[List[str]] = None,
            custom_fields: Optional[Dict] = None
    ) -> Dict:
        """
        Upload test execution result.

        Args:
            test_case_id: Test case identifier
            status: Execution status (Passed, Failed, Blocked, NotExecuted)
            duration: Execution duration in seconds
            started_at: Start timestamp (ISO format)
            finished_at: Finish timestamp (ISO format)
            execution_user: User who executed the test
            error_message: Error message if failed
            stack_trace: Stack trace if failed
            attachments: List of file paths to attach
            custom_fields: Additional custom fields

        Returns:
            Response data with result ID
        """
        self.logger.info(f"Uploading test result for {test_case_id}: {status}")

        # Validate status
        valid_statuses = ["Passed", "Failed", "Blocked", "NotExecuted"]
        if status not in valid_statuses:
            raise ToscaUploadError(f"Invalid status. Must be one of: {valid_statuses}")

        # Build payload
        payload = {
            "testCaseId": test_case_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        if duration is not None:
            payload["durationSeconds"] = duration

        if started_at:
            payload["startedAt"] = started_at

        if finished_at:
            payload["finishedAt"] = finished_at

        if execution_user:
            payload["executionUser"] = execution_user

        if error_message:
            payload["errorMessage"] = error_message

        if stack_trace:
            payload["stackTrace"] = stack_trace

        if custom_fields:
            payload["customFields"] = custom_fields

        # Upload result
        result = self._make_request("POST", "/test-results", data=payload)

        # Upload attachments if provided
        if attachments and result.get("resultId"):
            for attachment_path in attachments:
                try:
                    self.upload_attachment(result["resultId"], attachment_path)
                except Exception as e:
                    self.logger.warning(f"Failed to upload attachment {attachment_path}: {e}")

        return result

    def upload_attachment(
            self,
            result_id: str,
            file_path: str,
            description: Optional[str] = None
    ) -> Dict:
        """
        Upload attachment to test result.

        Args:
            result_id: Test result ID
            file_path: Path to file to upload
            description: Optional description

        Returns:
            Response data with attachment ID
        """
        self.logger.info(f"Uploading attachment: {file_path}")

        if not os.path.exists(file_path):
            raise ToscaUploadError(f"File not found: {file_path}")

        file_name = os.path.basename(file_path)

        with open(file_path, 'rb') as f:
            files = {
                'file': (file_name, f, 'application/octet-stream')
            }

            data = {
                'resultId': result_id,
                'fileName': file_name
            }

            if description:
                data['description'] = description

            return self._make_request(
                "POST",
                f"/test-results/{result_id}/attachments",
                data=data,
                files=files
            )

    def upload_batch_results(
            self,
            results: List[Dict]
    ) -> Dict:
        """
        Upload multiple test results in batch.

        Args:
            results: List of test result dictionaries

        Returns:
            Response data with upload summary
        """
        self.logger.info(f"Uploading batch of {len(results)} test results")

        payload = {
            "results": results,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        return self._make_request("POST", "/test-results/batch", data=payload)

    # =========================================================================
    # TEST CASE OPERATIONS
    # =========================================================================

    def get_test_case(self, test_case_id: str) -> Dict:
        """Get test case details"""
        self.logger.info(f"Fetching test case: {test_case_id}")
        return self._make_request("GET", f"/test-cases/{test_case_id}")

    def create_test_case(
            self,
            name: str,
            description: Optional[str] = None,
            folder_path: Optional[str] = None,
            tags: Optional[List[str]] = None,
            custom_fields: Optional[Dict] = None
    ) -> Dict:
        """Create new test case"""
        self.logger.info(f"Creating test case: {name}")

        payload = {"name": name}

        if description:
            payload["description"] = description

        if folder_path:
            payload["folderPath"] = folder_path

        if tags:
            payload["tags"] = tags

        if custom_fields:
            payload["customFields"] = custom_fields

        return self._make_request("POST", "/test-cases", data=payload)

    def update_test_case(
            self,
            test_case_id: str,
            updates: Dict
    ) -> Dict:
        """Update test case"""
        self.logger.info(f"Updating test case: {test_case_id}")
        return self._make_request("PUT", f"/test-cases/{test_case_id}", data=updates)

    # =========================================================================
    # EXECUTION OPERATIONS
    # =========================================================================

    def trigger_execution(
            self,
            execution_list_id: str,
            agents: Optional[List[str]] = None,
            parameters: Optional[Dict] = None
    ) -> Dict:
        """Trigger test execution"""
        self.logger.info(f"Triggering execution: {execution_list_id}")

        payload = {
            "executionListId": execution_list_id,
            "triggeredAt": datetime.utcnow().isoformat() + "Z"
        }

        if agents:
            payload["agents"] = agents

        if parameters:
            payload["parameters"] = parameters

        return self._make_request("POST", "/executions/trigger", data=payload)

    def get_execution_status(self, execution_id: str) -> Dict:
        """Get execution status"""
        self.logger.info(f"Fetching execution status: {execution_id}")
        return self._make_request("GET", f"/executions/{execution_id}")

    def get_execution_results(
            self,
            execution_id: str,
            include_details: bool = True
    ) -> Dict:
        """Get execution results"""
        self.logger.info(f"Fetching execution results: {execution_id}")

        params = {}
        if include_details:
            params["includeDetails"] = "true"

        return self._make_request("GET", f"/executions/{execution_id}/results", params=params)

    # =========================================================================
    # QUERY OPERATIONS
    # =========================================================================

    def query_results(
            self,
            filters: Optional[Dict] = None,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            limit: int = 100,
            offset: int = 0
    ) -> Dict:
        """
        Query test results with filters.

        Args:
            filters: Filter criteria (e.g., {"status": "Failed", "testCaseId": "TC-001"})
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            limit: Maximum results to return
            offset: Offset for pagination

        Returns:
            Query results
        """
        self.logger.info("Querying test results")

        params = {
            "limit": limit,
            "offset": offset
        }

        if filters:
            params.update(filters)

        if start_date:
            params["startDate"] = start_date

        if end_date:
            params["endDate"] = end_date

        return self._make_request("GET", "/test-results", params=params)

    # =========================================================================
    # HEALTH CHECK
    # =========================================================================

    def health_check(self) -> Dict:
        """Check API health"""
        self.logger.info("Performing health check")
        try:
            return self._make_request("GET", "/health")
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.session.close()


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_client_from_env() -> ToscaClient:
    """
    Create Tosca client from environment variables.

    Expected environment variables:
    - TOSCA_BASE_URL: Base URL of Tosca API
    - TOSCA_AUTH_TYPE: Authentication type (basic, apikey, oauth)
    - TOSCA_USERNAME: Username (for basic auth)
    - TOSCA_PASSWORD: Password (for basic auth)
    - TOSCA_API_KEY: API key (for API key auth)
    - TOSCA_OAUTH_TOKEN: OAuth token (for OAuth auth)
    """
    return ToscaClient(
        base_url=os.environ.get("TOSCA_BASE_URL", ""),
        auth_type=os.environ.get("TOSCA_AUTH_TYPE", "basic"),
        username=os.environ.get("TOSCA_USERNAME"),
        password=os.environ.get("TOSCA_PASSWORD"),
        api_key=os.environ.get("TOSCA_API_KEY"),
        oauth_token=os.environ.get("TOSCA_OAUTH_TOKEN"),
        verify_ssl=os.environ.get("TOSCA_VERIFY_SSL", "true").lower() == "true"
    )


if __name__ == "__main__":
    # Example usage
    print("Tosca Upload Python Client - Example Usage")
    print("=" * 50)

    # Initialize client
    client = ToscaClient(
        base_url="https://tosca.example.com/api",
        auth_type="basic",
        username="user@example.com",
        password="your-password"
    )

    # Upload test result
    result = client.upload_test_result(
        test_case_id="TC-001",
        status="Passed",
        duration=120,
        execution_user="automation@example.com"
    )

    print(f"Upload successful! Result ID: {result.get('resultId')}")