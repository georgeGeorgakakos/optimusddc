"""
Background Elasticsearch Indexer for Amundsen Metadata Service

This module runs as a background thread within the metadata service,
automatically indexing OptimusDB data into Elasticsearch every 10 minutes.

Place this file in: amundsenmetadatalibrary/metadata_service/indexer/background_indexer.py
"""

import os
import sys
import time
import json
import logging
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional

import requests
from flask import current_app
from elasticsearch import Elasticsearch, helpers

logger = logging.getLogger(__name__)

# ==============================================================================
# CONFIGURATION
# ==============================================================================

class IndexerConfig:
    """Configuration for background indexer"""

    def __init__(self, app=None):
        self.enabled = False
        self.interval = 600  # 10 minutes
        self.elasticsearch_url = "http://localhost:9200"
        self.optimusdb_api_url = "http://optimusdb1:8089"

        if app:
            self.load_from_app(app)

    def load_from_app(self, app):
        """Load configuration from Flask app"""
        self.enabled = app.config.get('INDEXER_ENABLED', False)
        self.interval = app.config.get('INDEXER_INTERVAL', 600)
        self.elasticsearch_url = app.config.get('ELASTICSEARCH_URL', 'http://localhost:9200')
        self.optimusdb_api_url = app.config.get('OPTIMUSDB_API_URL', 'http://optimusdb1:8089')

# ==============================================================================
# INDEX MAPPINGS
# ==============================================================================

TABLE_MAPPING = {
    "mappings": {
        "properties": {
            "name": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "schema": {"type": "keyword"},
            "database": {"type": "keyword"},
            "cluster": {"type": "keyword"},
            "description": {"type": "text"},
            "column_names": {"type": "text"},
            "tags": {"type": "keyword"},
            "badges": {"type": "keyword"},
            "key": {"type": "keyword"},
            "last_updated_timestamp": {"type": "date", "format": "epoch_second"},
            "resource_type": {"type": "keyword"}
        }
    }
}

USER_MAPPING = {
    "mappings": {
        "properties": {
            "user_id": {"type": "keyword"},
            "email": {"type": "keyword"},
            "display_name": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "is_active": {"type": "boolean"},
            "resource_type": {"type": "keyword"}
        }
    }
}

DASHBOARD_MAPPING = {
    "mappings": {
        "properties": {
            "uri": {"type": "keyword"},
            "name": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "description": {"type": "text"},
            "group_name": {"type": "keyword"},
            "product": {"type": "keyword"},
            "resource_type": {"type": "keyword"}
        }
    }
}

# ==============================================================================
# BACKGROUND INDEXER
# ==============================================================================

class BackgroundIndexer:
    """
    Background thread that periodically indexes OptimusDB data into Elasticsearch.
    Runs within the Amundsen metadata service.
    """

    def __init__(self, app=None):
        self.config = IndexerConfig(app)
        self.thread = None
        self.running = False
        self.stats = {
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "last_run_time": None,
            "last_success_time": None,
            "documents_indexed": 0
        }

        # Store app context for background thread
        self.app = app

        logger.info(f"BackgroundIndexer initialized (enabled={self.config.enabled})")

    def start(self):
        """Start the background indexer thread"""
        if not self.config.enabled:
            logger.info("Background indexer is disabled (set INDEXER_ENABLED=True to enable)")
            return

        if self.running:
            logger.warning("Background indexer already running")
            return

        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True, name="IndexerThread")
        self.thread.start()

        logger.info(f"Background indexer started (interval={self.config.interval}s)")

    def stop(self):
        """Stop the background indexer thread"""
        if not self.running:
            return

        logger.info("Stopping background indexer...")
        self.running = False

        if self.thread:
            self.thread.join(timeout=5)

        logger.info("Background indexer stopped")
        self._print_stats()

    def _run_loop(self):
        """Main background loop"""
        logger.info("="*70)
        logger.info("Background Indexer Started")
        logger.info(f"  Interval: {self.config.interval}s ({self.config.interval/60:.1f} min)")
        logger.info(f"  Elasticsearch: {self.config.elasticsearch_url}")
        logger.info(f"  OptimusDB: {self.config.optimusdb_api_url}")
        logger.info("="*70)

        # Run first indexing immediately
        with self.app.app_context():
            self._run_indexing()

        # Main loop
        while self.running:
            try:
                # Sleep in small chunks to allow quick shutdown
                for _ in range(self.config.interval):
                    if not self.running:
                        break
                    time.sleep(1)

                # Run indexing if still running
                if self.running:
                    with self.app.app_context():
                        self._run_indexing()

            except Exception as e:
                logger.error(f"Error in indexer loop: {e}", exc_info=True)
                time.sleep(60)  # Wait before retrying

    def _run_indexing(self):
        """Run a single indexing cycle"""
        start_time = time.time()
        self.stats["total_runs"] += 1
        self.stats["last_run_time"] = datetime.now()

        logger.info(f"Starting indexing run #{self.stats['total_runs']}")

        try:
            # Connect to Elasticsearch
            es = Elasticsearch([self.config.elasticsearch_url])
            if not es.ping():
                raise Exception("Cannot connect to Elasticsearch")

            # Create indices if needed
            self._create_indices(es)

            # Fetch datasets from OptimusDB
            records = self._fetch_datasets()

            if not records:
                logger.warning("No datasets found in OptimusDB")
                self.stats["failed_runs"] += 1
                return

            # Index tables
            indexed_count = self._index_tables(es, records)
            self.stats["documents_indexed"] = indexed_count

            # Verify
            if self._verify_indexing(es):
                self.stats["successful_runs"] += 1
                self.stats["last_success_time"] = datetime.now()

                duration = time.time() - start_time
                logger.info(f"✅ Indexing completed successfully in {duration:.2f}s ({indexed_count} documents)")
            else:
                self.stats["failed_runs"] += 1
                logger.error("❌ Indexing verification failed")

        except Exception as e:
            self.stats["failed_runs"] += 1
            logger.error(f"Indexing run failed: {e}", exc_info=True)

    def _create_indices(self, es: Elasticsearch):
        """Create Elasticsearch indices if they don't exist"""
        indices = {
            'table_search_index': TABLE_MAPPING,
            'user_search_index': USER_MAPPING,
            'dashboard_search_index': DASHBOARD_MAPPING
        }

        for index_name, mapping in indices.items():
            try:
                if not es.indices.exists(index=index_name):
                    es.indices.create(index=index_name, body=mapping)
                    logger.info(f"Created index: {index_name}")
            except Exception as e:
                logger.error(f"Failed to create index {index_name}: {e}")

    def _fetch_datasets(self) -> List[Dict[str, Any]]:
        """Fetch all datasets from OptimusDB"""
        try:
            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": "SELECT * FROM datacatalog;",
                "graph_traversal": [{}],
                "criteria": []
            }

            response = requests.post(
                f"{self.config.optimusdb_api_url}/swarmkb/command",
                json=payload,
                timeout=10
            )

            if not response.ok:
                logger.error(f"OptimusDB returned status {response.status_code}")
                return []

            result = self._parse_response(response)
            records = result.get("data", {}).get("records", [])

            logger.info(f"Fetched {len(records)} datasets from OptimusDB")
            return records

        except Exception as e:
            logger.error(f"Error fetching datasets: {e}", exc_info=True)
            return []

    def _parse_response(self, response: requests.Response) -> Dict[str, Any]:
        """Parse OptimusDB response (handles string-wrapped JSON)"""
        try:
            result = response.json()

            # Handle nested string wrapping
            max_attempts = 5
            attempts = 0

            while isinstance(result, str) and attempts < max_attempts:
                try:
                    result = json.loads(result)
                    attempts += 1
                except json.JSONDecodeError:
                    return {"data": {"records": []}}

            if not isinstance(result, dict):
                return {"data": {"records": []}}

            return result

        except Exception as e:
            logger.error(f"Error parsing response: {e}")
            return {"data": {"records": []}}

    def _index_tables(self, es: Elasticsearch, records: List[Dict[str, Any]]) -> int:
        """Index table documents into Elasticsearch"""
        if not records:
            return 0

        try:
            documents = []
            for record in records:
                try:
                    doc = self._transform_to_document(record)
                    documents.append({
                        "_index": "table_search_index",
                        "_id": doc["key"],
                        "_source": doc
                    })
                except Exception as e:
                    logger.error(f"Error transforming record: {e}")
                    continue

            if not documents:
                return 0

            success, failed = helpers.bulk(
                es,
                documents,
                raise_on_error=False,
                raise_on_exception=False
            )

            logger.info(f"Indexed {success} documents")
            return success

        except Exception as e:
            logger.error(f"Error during bulk indexing: {e}", exc_info=True)
            return 0

    def _transform_to_document(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Transform OptimusDB record to Elasticsearch document"""
        schema = record.get("metadata_type", "default").strip()
        database = record.get("component", "optimusdb").strip()
        name = record.get("name", "unknown").strip()

        schema_safe = schema.replace(" ", "_")
        name_safe = name.replace(" ", "_")
        key = f"{database}://default.{schema_safe}/{name_safe}"

        # Parse tags
        tags_str = record.get("tags", "")
        tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []

        # Parse badges
        badges_str = record.get("badges", "")
        badges = [b.strip() for b in badges_str.split(",") if b.strip()] if badges_str else []

        return {
            "name": name,
            "schema": schema,
            "database": database,
            "cluster": "optimusdb",
            "description": record.get("description", ""),
            "column_names": [k for k in record.keys() if not k.startswith("_")],
            "tags": tags,
            "badges": badges,
            "key": key,
            "last_updated_timestamp": int(time.time()),
            "resource_type": "table"
        }

    def _verify_indexing(self, es: Elasticsearch) -> bool:
        """Verify that documents were indexed"""
        try:
            es.indices.refresh(index="table_search_index")
            count = es.count(index="table_search_index")["count"]
            return count > 0
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return False

    def _print_stats(self):
        """Print indexer statistics"""
        logger.info("="*70)
        logger.info("Indexer Statistics")
        logger.info(f"  Total Runs:        {self.stats['total_runs']}")
        logger.info(f"  Successful:        {self.stats['successful_runs']}")
        logger.info(f"  Failed:            {self.stats['failed_runs']}")
        logger.info(f"  Last Run:          {self.stats['last_run_time']}")
        logger.info(f"  Last Success:      {self.stats['last_success_time']}")
        logger.info(f"  Documents Indexed: {self.stats['documents_indexed']}")
        logger.info("="*70)

    def get_stats(self) -> Dict[str, Any]:
        """Get indexer statistics (for health endpoint)"""
        return {
            **self.stats,
            "running": self.running,
            "enabled": self.config.enabled,
            "interval": self.config.interval
        }

# ==============================================================================
# GLOBAL INDEXER INSTANCE
# ==============================================================================

# This will be initialized by the application factory
_indexer: Optional[BackgroundIndexer] = None

def init_indexer(app) -> BackgroundIndexer:
    """Initialize the background indexer with Flask app"""
    global _indexer

    _indexer = BackgroundIndexer(app)

    # Register shutdown handler
    import atexit
    atexit.register(lambda: _indexer.stop() if _indexer else None)

    return _indexer

def get_indexer() -> Optional[BackgroundIndexer]:
    """Get the global indexer instance"""
    return _indexer

def start_indexer():
    """Start the background indexer"""
    if _indexer:
        _indexer.start()
    else:
        logger.warning("Indexer not initialized")

def stop_indexer():
    """Stop the background indexer"""
    if _indexer:
        _indexer.stop()

def get_indexer_stats() -> Dict[str, Any]:
    """Get indexer statistics"""
    if _indexer:
        return _indexer.get_stats()
    return {"error": "Indexer not initialized"}