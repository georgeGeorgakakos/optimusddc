"""
OptimusDB Search Proxy for Amundsen Search Service
===================================================

COMPREHENSIVE VERSION — uses /{context}/agent/inventory as primary
discovery across dynamically-discovered OptimusDB nodes.

Discovers and indexes:
  - 3 SQLite databases: knowledgebase (16 tables), logger (2 tables),
    reputation (2 tables)
  - Record-level entries from content tables (toscametadata, metadata_catalog)
  - 6 active OrbitDB stores (KBMetadata, KBdata, DsSWres, Validations,
    DsTOSCA_Imported, Contributions)
  - 8 planned OrbitDB stores (whoiswhoStore, DsSWresaloc, etc.)
  - IPFS content objects (TOSCA templates, uploaded files)
  - AI metadata enrichment status (TinyLlama) per node
  - Node agent info and P2P network topology
  - Log statistics from optimusLogger (292K+ entries)
  - Reputation and election data from consensus layer

Dynamic node discovery: probes optimusdb1..optimusdbN until unreachable.

No Elasticsearch required — queries OptimusDB agents directly.

Place in: search/search_service/proxy/optimusdb_search.py

Usage in config.py:
    PROXY_CLIENT = 'search_service.proxy.optimusdb_search.OptimusDBSearchProxy'

FIXES APPLIED:
  - BUG-001: TypeError: Object of type Tag is not JSON serializable
             Added _serialize_result() which converts Tag objects in `tags`
             and `badges` fields to plain strings before JSON serialization.
             All vars(t) calls in search() replaced with _serialize_result(t).
  - BUG-002: _extract_row_count() was missing `self` — made it a @staticmethod.
  - BUG-003: _score() used str(tag) on Tag objects producing "Tag(tag_name=x)"
             instead of the tag string — now extracts .tag_name safely.
"""

import json
import logging
import os
import time
import threading
import hashlib
from typing import Any, Dict, List, Optional, Union


import re as _re
import requests

# --- Base class ---
from search_service.proxy.base import BaseProxy

# --- Resource enum ---
from search_service.proxy.es_proxy_utils import Resource

# --- amundsen_common types used in BaseProxy.search() signature ---
from amundsen_common.models.search import (
    Filter,
    HighlightOptions,
    SearchResponse,
)

# --- Model classes (exact signatures from container introspection) ---
from search_service.models.table import Table, SearchTableResult
from search_service.models.user import User, SearchUserResult
from search_service.models.dashboard import Dashboard, SearchDashboardResult
from search_service.models.feature import SearchFeatureResult
from search_service.models.tag import Tag

LOGGER = logging.getLogger(__name__)

# ===========================================================================
# Configuration
# ===========================================================================

NODE_PREFIX = 'optimusdb'
DEFAULT_PORT = 8089
DEFAULT_CONTEXT = 'swarmkb'
MAX_NODE_PROBE = 20

# Tables whose rows are expanded into individual search results
RECORD_TABLES = {'toscametadata', 'metadata_catalog'}

# Internal tables to hide
SKIP_TABLES = {'sqlite_sequence', 'search_cache'}

# Cache TTL
CACHE_TTL = 120  # seconds


class OptimusDBSearchProxy(BaseProxy):
    """
    Comprehensive search proxy that uses /agent/inventory to discover
    ALL data sources across dynamically-detected OptimusDB nodes.
    """

    # ==================================================================
    # Initialization
    # ==================================================================
    def __init__(self, *, host: Optional[str] = None, **kwargs: Any) -> None:
        optimusdb_url = os.environ.get('OPTIMUSDB_API_URL')
        if not optimusdb_url:
            optimusdb_url = host or f'http://{NODE_PREFIX}1:{DEFAULT_PORT}'
        if not optimusdb_url.startswith(('http://', 'https://')):
            optimusdb_url = f'http://{optimusdb_url}'
        self.optimusdb_url = optimusdb_url

        self.timeout = (5.0, 30.0)
        self.context = os.environ.get('OPTIMUSDB_CONTEXT', DEFAULT_CONTEXT)
        self.port = int(os.environ.get('OPTIMUSDB_PORT', DEFAULT_PORT))
        self.node_prefix = os.environ.get(
            'OPTIMUSDB_NODE_PREFIX', NODE_PREFIX
        )

        nodes_env = os.environ.get('OPTIMUSDB_NODES', '')
        if nodes_env:
            self._explicit_nodes = [
                n.strip() for n in nodes_env.split(',') if n.strip()
            ]
        else:
            self._explicit_nodes = None

        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cache_time: float = 0.0
        self._cache_lock = threading.Lock()
        self._nodes: Optional[List[str]] = None
        self._nodes_time: float = 0.0

        LOGGER.info(
            f"[OptimusDBSearchProxy] Initialized: primary={self.optimusdb_url}, "
            f"context={self.context}, prefix={self.node_prefix}, "
            f"explicit_nodes={self._explicit_nodes}"
        )

    # ==================================================================
    # Helpers
    # ==================================================================
    def _node_url(self, node: str) -> str:
        return f"http://{node}:{self.port}"

    @staticmethod
    def _get_datastore_type(schema: str, table_name: str) -> str:
        """Deterministic datastore type heuristic — keep in sync with proxy."""
        name = (schema + ' ' + table_name).lower()
        if any(k in name for k in ['embedding', 'vector', 'index', 'faiss', 'ann']):
            return 'vector'
        if any(k in name for k in ['peer', 'topology', 'graph', 'edge', 'node', 'network']):
            return 'graph'
        if any(k in name for k in ['log', 'event', 'stream', 'audit', 'ems', 'logger', 'journal']):
            return 'log'
        if any(k in name for k in ['_relation', 'catalog', 'metadata', 'config', 'setting']):
            return 'crud'
        return 'rdbms'

    @staticmethod  # FIX BUG-002: was missing @staticmethod / self
    def _extract_row_count(description: str) -> int:
        """
        Parse row count from description strings like:
          'SQLite table foo ... 4,176 rows, 7 columns'
        Returns 0 if not found.
        """
        match = _re.search(r'([\d,]+)\s+rows?', description or '', _re.IGNORECASE)
        if match:
            try:
                return int(match.group(1).replace(',', ''))
            except ValueError:
                pass
        return 0

    def _parse_response(self, resp: requests.Response) -> Any:
        try:
            result = resp.json()
            attempts = 0
            while isinstance(result, str) and attempts < 5:
                result = json.loads(result)
                attempts += 1
            return result
        except Exception as e:
            LOGGER.error(f"[Parse] error: {e}")
            return {"data": {"records": []}}

    def _execute_sql(
            self, sql: str, node_url: Optional[str] = None
    ) -> Dict[str, Any]:
        url = node_url or self.optimusdb_url
        try:
            payload = {
                "method": {"argcnt": 2, "cmd": "sqldml"},
                "args": ["dummy1", "dummy2"],
                "dstype": "dsswres",
                "sqldml": sql,
                "graph_traversal": [{}],
                "criteria": []
            }
            resp = requests.post(
                f"{url}/{self.context}/command",
                json=payload,
                timeout=self.timeout,
            )
            if not resp.ok:
                return {"data": {"records": []}}
            result = self._parse_response(resp)
            return result if isinstance(result, dict) else {"data": {"records": []}}
        except Exception as e:
            LOGGER.warning(f"[SQL] {url}: {e}")
            return {"data": {"records": []}}

    def _get_inventory(self, node: str) -> Dict[str, Any]:
        url = self._node_url(node)
        try:
            resp = requests.get(
                f"{url}/{self.context}/agent/inventory",
                timeout=(5, 15),
            )
            if not resp.ok:
                return {}
            result = self._parse_response(resp)
            return result if isinstance(result, dict) else {}
        except Exception as e:
            LOGGER.warning(f"[Inventory] {node}: {e}")
            return {}

    def _escape_sql(self, value: str) -> str:
        return value.replace("'", "''") if value else ""

    def _build_key(self, database: str, schema: str, name: str) -> str:
        db = (database or "optimusdb").replace(" ", "_")
        sc = (schema or "default").replace(" ", "_")
        nm = (name or "unknown").replace(" ", "_")
        return f"{db}://default.{sc}/{nm}"

    @staticmethod
    def _make_id(key: str) -> str:
        """Generate a stable short ID from a key string."""
        return hashlib.md5(key.encode()).hexdigest()[:12]

    @staticmethod
    def _make_tags(tag_strings: List[str]) -> List[Tag]:
        """Convert list of strings to list of Tag objects."""
        seen = set()
        tags = []
        for t in tag_strings:
            t = str(t).strip()
            if t and t not in seen:
                seen.add(t)
                tags.append(Tag(tag_name=t))
        return tags

    @staticmethod
    def _tag_to_str(tag: Any) -> str:
        """Safely convert a Tag object or any value to a plain string."""
        if hasattr(tag, 'tag_name'):
            return str(tag.tag_name)
        if isinstance(tag, dict):
            return str(tag.get('tag_name', tag))
        return str(tag)

    @staticmethod
    def _fmt_size(size_bytes: int) -> str:
        if not size_bytes:
            return "0 B"
        if size_bytes >= 1048576:
            return f"{size_bytes / 1048576:.1f} MB"
        if size_bytes >= 1024:
            return f"{size_bytes / 1024:.1f} KB"
        return f"{size_bytes} B"

    # ==================================================================
    # FIX BUG-001: serialize model instances to JSON-safe dicts
    # ==================================================================
    @staticmethod
    def _serialize_result(obj: Any) -> Dict[str, Any]:
        """
        Convert a model object (Table, User, Dashboard, Feature) to a
        plain dict that is safe to pass to json.dumps().

        vars() exposes Tag objects in `tags` and `badges` — those must
        be converted to their string tag_name values before Flask-RESTful
        calls json.dumps() on the response.

        Root cause of: TypeError: Object of type Tag is not JSON serializable
        """
        d = vars(obj).copy()
        for field in ('tags', 'badges'):
            raw = d.get(field)
            if raw and isinstance(raw, list):
                converted = []
                for item in raw:
                    if hasattr(item, 'tag_name'):       # Tag object
                        converted.append(str(item.tag_name))
                    elif isinstance(item, dict):         # already a dict
                        converted.append(item.get('tag_name', str(item)))
                    else:
                        converted.append(str(item))
                d[field] = converted
        return d

    # ==================================================================
    # Dynamic node discovery
    # ==================================================================
    def _discover_nodes(self) -> List[str]:
        now = time.time()
        if self._nodes and (now - self._nodes_time) < CACHE_TTL:
            return self._nodes

        if self._explicit_nodes:
            self._nodes = self._explicit_nodes
            self._nodes_time = now
            return self._nodes

        discovered = []
        for i in range(1, MAX_NODE_PROBE + 1):
            node = f"{self.node_prefix}{i}"
            url = self._node_url(node)
            try:
                resp = requests.get(
                    f"{url}/{self.context}/agent/inventory",
                    timeout=(3, 5),
                )
                if resp.ok:
                    discovered.append(node)
                else:
                    break
            except requests.ConnectionError:
                break
            except Exception:
                break

        if not discovered:
            discovered = [f"{self.node_prefix}1"]

        self._nodes = discovered
        self._nodes_time = now
        LOGGER.info(f"[Discovery] Active nodes: {discovered}")
        return discovered

    # ==================================================================
    # CORE: Inventory-driven multi-node discovery
    # ==================================================================
    def _discover_all(self) -> List[Dict[str, Any]]:
        datasets: List[Dict[str, Any]] = []
        seen = set()
        nodes = self._discover_nodes()

        def _add(ds: Dict[str, Any]):
            key = ds['key']
            if key not in seen:
                seen.add(key)
                datasets.append(ds)

        for node in nodes:
            inv = self._get_inventory(node)
            if not inv:
                continue

            self._process_databases(inv, node, _add)
            self._process_orbitdb_active(inv, node, _add)
            self._process_orbitdb_planned(inv, node, _add)
            self._process_ipfs(inv, node, _add)
            self._process_enrichment(inv, node, _add)
            self._process_agent_info(inv, node, _add)

        LOGGER.info(
            f"[OptimusDBSearchProxy] Discovered {len(datasets)} items "
            f"across {len(nodes)} nodes"
        )
        return datasets

    # ------------------------------------------------------------------
    # A) SQLite databases → tables → (optionally) records
    # ------------------------------------------------------------------
    def _process_databases(self, inv: Dict, node: str, _add) -> None:
        databases_info = inv.get('databases', {})

        for db_name, db_info in databases_info.items():
            db_size = db_info.get('size_bytes', 0)
            db_size_str = self._fmt_size(db_size)
            tables_info = db_info.get('tables', {})

            for tbl_name, tbl_info in tables_info.items():
                if tbl_name in SKIP_TABLES:
                    continue

                row_count = tbl_info.get('row_count', 0)
                schema_info = tbl_info.get('schema', {})
                columns = schema_info.get('columns', [])
                indexes = schema_info.get('indexes', [])
                statistics = tbl_info.get('statistics', {})

                col_names = [c.get('name', '') for c in columns]
                col_detail = ", ".join(
                    f"{c.get('name')}({c.get('type', 'TEXT')})"
                    for c in columns[:8]
                )
                if len(columns) > 8:
                    col_detail += f" +{len(columns) - 8} more"

                # Description
                desc_parts = [
                    f"SQLite table '{tbl_name}' in {db_name} database "
                    f"on {node}.",
                    f"{row_count:,} rows, {len(columns)} columns, "
                    f"{len(indexes)} indexes.",
                    f"DB size: {db_size_str}.",
                ]
                if col_detail:
                    desc_parts.append(f"Schema: {col_detail}.")
                if statistics:
                    stat_items = []
                    for sk, sv in list(statistics.items())[:4]:
                        if isinstance(sv, dict):
                            top3 = sorted(
                                sv.items(), key=lambda x: x[1], reverse=True
                            )[:3]
                            stat_items.append(
                                f"{sk}: " + ", ".join(
                                    f"{k}={v:,}" if isinstance(v, int)
                                    else f"{k}={v}"
                                    for k, v in top3
                                )
                            )
                        elif isinstance(sv, float):
                            stat_items.append(f"{sk}: {sv:.2f}")
                        else:
                            stat_items.append(f"{sk}: {sv}")
                    desc_parts.append("Stats: " + "; ".join(stat_items) + ".")

                # Tags — stored as plain strings in the cache dict
                tags = ['sqlite', db_name, tbl_name]
                if row_count > 0:
                    tags.append('has-data')
                if row_count >= 1000:
                    tags.append('large-table')
                if row_count >= 100000:
                    tags.append('very-large')
                if db_name == 'logger':
                    tags.extend(['logs', 'monitoring', 'audit'])
                elif db_name == 'reputation':
                    tags.extend(['reputation', 'consensus', 'election', 'leader'])
                elif db_name == 'knowledgebase':
                    tags.extend(['knowledgebase', 'metadata', 'catalog'])

                tbl_lower = tbl_name.lower()
                if 'tosca' in tbl_lower:
                    tags.extend(['tosca', 'template', 'adt', 'topology'])
                if 'credential' in tbl_lower:
                    tags.extend(['credentials', 'w3c', 'identity', 'ssi'])
                if 'dashboard' in tbl_lower:
                    tags.append('dashboard')
                if 'user' in tbl_lower:
                    tags.append('users')
                if 'badge' in tbl_lower:
                    tags.append('quality')
                if 'election' in tbl_lower or 'reputation' in tbl_lower:
                    tags.extend(['p2p', 'distributed'])
                if 'lineage' in tbl_lower or 'depend' in tbl_lower:
                    tags.extend(['lineage', 'dependency'])

                key = self._build_key(
                    "optimusdb", f"{db_name}.{tbl_name}", tbl_name
                )
                _add({
                    "key": key,
                    "name": tbl_name,
                    "schema": db_name,
                    "cluster": node,
                    "database": "optimusdb",
                    "description": " ".join(desc_parts),
                    "column_names": col_names,
                    "tags": tags,
                    "row_count": row_count,
                    "source_type": "sqlite",
                    "datastore_type": self._get_datastore_type(db_name, tbl_name),
                    "extra_fields": {},
                })

                # B) Expand records from content tables
                if tbl_name in RECORD_TABLES and row_count > 0:
                    self._expand_records(node, tbl_name, _add)

    def _expand_records(self, node: str, tbl_name: str, _add) -> None:
        try:
            url = self._node_url(node)
            result = self._execute_sql(
                f"SELECT * FROM {tbl_name} LIMIT 200;", url
            )
            records = result.get('data', {}).get('records', [])

            for rec in records:
                rec_name = (
                        rec.get('name')
                        or rec.get('filename')
                        or rec.get('associated_id')
                        or f"{tbl_name}_entry"
                )
                rec_desc = rec.get('description') or rec.get('ai_summary') or ""

                extras = []
                for field, label in [
                    ('filename', 'File'), ('ipfs_path', 'IPFS'),
                    ('ipfs_cid', 'IPFS CID'), ('content_sha256', 'SHA256'),
                    ('source_pod', 'Source'), ('source_agent', 'Agent'),
                    ('created_at', 'Created'), ('metadata_type', 'Type'),
                    ('data_domain', 'Domain'),
                    ('data_classification', 'Classification'),
                    ('processing_status', 'Status'),
                    ('file_format', 'Format'), ('schema_version', 'Schema'),
                    ('access_control', 'Access'), ('api_endpoint', 'API'),
                ]:
                    val = rec.get(field)
                    if val and str(val).strip():
                        extras.append(f"{label}: {val}")

                sz = rec.get('filesize_bytes') or rec.get('file_size_bytes')
                if sz:
                    extras.append(f"Size: {self._fmt_size(sz)}")

                full_desc = rec_desc
                if extras:
                    full_desc += " | " + " | ".join(extras)

                tags = [tbl_name]
                for field in (
                        'metadata_type', 'component', 'tags', 'data_domain',
                        'data_classification', 'file_format',
                        'processing_status', 'compliance_tags', 'license_type',
                ):
                    val = rec.get(field)
                    if val and isinstance(val, str):
                        for t in val.split(','):
                            t = t.strip().lower()
                            if t and len(t) < 50:
                                tags.append(t)

                fname = str(rec.get('filename', ''))
                if fname.endswith(('.yaml', '.yml')):
                    tags.extend(['tosca', 'yaml', 'template'])
                if rec.get('ipfs_path') or rec.get('ipfs_cid'):
                    tags.append('ipfs')
                if rec.get('node_templates_count'):
                    tags.append('topology')

                key = self._build_key("optimusdb", tbl_name, rec_name)
                _add({
                    "key": key,
                    "name": rec_name,
                    "schema": tbl_name,
                    "cluster": node,
                    "database": "optimusdb",
                    "description": full_desc,
                    "column_names": list(rec.keys()),
                    "tags": tags,
                    "row_count": 1,
                    "source_type": tbl_name,
                    "datastore_type": self._get_datastore_type(tbl_name, rec_name),
                    "extra_fields": rec,
                })
        except Exception as e:
            LOGGER.warning(f"[ExpandRecords] {tbl_name} on {node}: {e}")

    # ------------------------------------------------------------------
    # C) OrbitDB active stores
    # ------------------------------------------------------------------
    def _process_orbitdb_active(self, inv: Dict, node: str, _add) -> None:
        orbitdb = inv.get('orbitdb_stores', {})
        for store in orbitdb.get('active_stores', []):
            name = store.get('name', 'unknown')
            stype = store.get('type', 'docstore')
            addr = store.get('address', '')
            entry_count = store.get('entry_count', 0)
            event_count = store.get('event_count', 0)
            count = entry_count or event_count or 0
            acl = store.get('access_control', 'unknown')
            replication = store.get('replication', False)
            last_update = store.get('last_update', '')

            desc_parts = [
                f"OrbitDB {stype} '{name}':",
                f"{count} {'entries' if stype == 'docstore' else 'events'}.",
                f"Access: {acl}.",
                f"Replication: {'enabled' if replication else 'disabled'}.",
            ]
            if last_update:
                desc_parts.append(f"Last update: {last_update[:19]}.")
            if addr:
                desc_parts.append(f"Address: {addr}")

            tags = [
                'orbitdb', stype, name.lower(), 'p2p',
                'decentralized', 'active',
            ]
            if replication:
                tags.append('replicated')
            if count > 0:
                tags.append('has-data')
            name_lower = name.lower()
            if 'metadata' in name_lower or 'kb' in name_lower:
                tags.extend(['knowledgebase', 'metadata'])
            if 'tosca' in name_lower:
                tags.extend(['tosca', 'template', 'adt'])
            if 'contribution' in name_lower:
                tags.extend(['contributions', 'audit', 'eventlog'])
            if 'validation' in name_lower:
                tags.extend(['validation', 'quality'])
            if 'credential' in name_lower:
                tags.extend(['credentials', 'w3c', 'identity'])
            if 'swres' in name_lower:
                tags.extend(['resources', 'swarm'])

            key = self._build_key("orbitdb", stype, name)
            _add({
                "key": key,
                "name": name,
                "schema": stype,
                "cluster": node,
                "database": "orbitdb",
                "description": " ".join(desc_parts),
                "column_names": [],
                "tags": tags,
                "row_count": count,
                "source_type": "orbitdb",
                "extra_fields": {},
            })

    # ------------------------------------------------------------------
    # D) OrbitDB planned stores
    # ------------------------------------------------------------------
    def _process_orbitdb_planned(self, inv: Dict, node: str, _add) -> None:
        orbitdb = inv.get('orbitdb_stores', {})
        for store in orbitdb.get('planned_stores', []):
            name = store.get('name', 'unknown')
            stype = store.get('type', 'docstore')
            status = store.get('status', 'not_initialized')
            store_desc = store.get('description', '')

            desc = (
                f"OrbitDB {stype} '{name}' — {status}. "
                f"{store_desc}. On {node}."
            )
            tags = [
                'orbitdb', stype, name.lower(), 'planned', status, 'p2p',
            ]
            name_lower = name.lower()
            if 'tosca' in name_lower:
                tags.extend(['tosca', 'template'])
            if 'credential' in name_lower:
                tags.extend(['credentials', 'w3c', 'identity', 'ssi'])
            if 'whoiswho' in name_lower:
                tags.extend(['identity', 'users', 'mapping'])
            if 'alloc' in name_lower:
                tags.extend(['allocation', 'resources'])
            if 'deploy' in name_lower:
                tags.extend(['deployment', 'orchestration'])
            if 'event' in name_lower or 'audit' in name_lower:
                tags.extend(['events', 'audit', 'history'])
            if 'capacit' in name_lower:
                tags.extend(['capacity', 'resources'])

            key = self._build_key("orbitdb", f"planned.{stype}", name)
            _add({
                "key": key,
                "name": f"{name} (planned)",
                "schema": f"planned_{stype}",
                "cluster": node,
                "database": "orbitdb",
                "description": desc,
                "column_names": [],
                "tags": tags,
                "row_count": 0,
                "source_type": "orbitdb_planned",
                "extra_fields": {},
            })

    # ------------------------------------------------------------------
    # E) IPFS content objects
    # ------------------------------------------------------------------
    def _process_ipfs(self, inv: Dict, node: str, _add) -> None:
        ipfs = inv.get('ipfs_storage', {})
        total_count = ipfs.get('content_count', 0)
        total_size = ipfs.get('total_size_bytes', 0)
        content_types = ipfs.get('content_types', {})
        ct_summary = ", ".join(
            f"{k}: {v}" for k, v in content_types.items()
        ) if content_types else "none"

        for item in ipfs.get('sample_content', []):
            cid = item.get('cid', '')
            filename = item.get('filename', cid[:16] if cid else 'unknown')
            size = item.get('size_bytes', 0)
            content_type = item.get('content_type', 'unknown')
            ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'binary'

            desc = (
                f"IPFS content: {filename} ({self._fmt_size(size)}, "
                f"{content_type}). CID: {cid}. Node: {node}. "
                f"Total IPFS objects: {total_count} "
                f"({self._fmt_size(total_size)}). "
                f"Content types: {ct_summary}."
            )
            tags = ['ipfs', 'content', ext, content_type.split('/')[-1]]
            if 'tosca' in filename.lower() or ext in ('yaml', 'yml'):
                tags.extend(['tosca', 'template', 'adt', 'topology'])

            key = self._build_key("ipfs", "content", filename)
            _add({
                "key": key,
                "name": filename,
                "schema": "content",
                "cluster": node,
                "database": "ipfs",
                "description": desc,
                "column_names": [],
                "tags": tags,
                "row_count": 1,
                "source_type": "ipfs",
                "extra_fields": {},
            })

    # ------------------------------------------------------------------
    # F) AI metadata enrichment
    # ------------------------------------------------------------------
    def _process_enrichment(self, inv: Dict, node: str, _add) -> None:
        enrichment = inv.get('metadata_enrichment', {})
        if enrichment.get('service_status') != 'active':
            return

        model = enrichment.get('llm_model', 'unknown')
        enriched = enrichment.get('enriched_tables_count', 0)
        hit_rate = enrichment.get('cache_hit_rate', 0)
        last = enrichment.get('last_enrichment', '')

        desc = (
            f"AI metadata enrichment on {node}: "
            f"{enriched} tables enriched using {model}. "
            f"Cache hit rate: {hit_rate:.0%}. "
            f"Last run: {last[:19] if last else 'unknown'}."
        )
        tags = [
            'ai', 'llm', model.lower().replace('-', '_'),
            'enrichment', 'metadata', 'active',
        ]
        key = self._build_key("optimusdb", "ai_enrichment", node)
        _add({
            "key": key,
            "name": f"AI Enrichment ({node})",
            "schema": "ai_enrichment",
            "cluster": node,
            "database": "optimusdb",
            "description": desc,
            "column_names": [],
            "tags": tags,
            "row_count": enriched,
            "source_type": "ai_enrichment",
            "extra_fields": {},
        })

    # ------------------------------------------------------------------
    # G) Node / agent info
    # ------------------------------------------------------------------
    def _process_agent_info(self, inv: Dict, node: str, _add) -> None:
        agent = inv.get('agent_info', {})
        if not agent:
            return

        agent_id = agent.get('agent_id', '')
        agent_name = agent.get('agent_name', node)
        node_type = agent.get('node_type', 'unknown')
        version = agent.get('version', '')
        uptime = agent.get('uptime_seconds', 0)
        network = agent.get('network', {})
        peer_count = network.get('peer_count', 0)
        peers = network.get('connected_peers', [])
        is_coordinator = network.get('is_coordinator', False)
        health = network.get('health_score', 0)

        sys_metrics = inv.get('system_metrics', {})
        cache_size = sys_metrics.get('query_cache_size', 0)
        cache_hit = sys_metrics.get('cache_hit_rate', 0)
        avg_latency = sys_metrics.get('avg_query_latency_ms', 0)

        role = 'coordinator' if is_coordinator else node_type
        uptime_h = uptime / 3600

        desc_parts = [
            f"OptimusDB agent '{agent_name}' ({role}) on {node}.",
            f"Version {version}. Uptime: {uptime_h:.1f}h.",
            f"P2P peers: {peer_count} (health: {health:.0%}).",
        ]
        if peers:
            desc_parts.append(
                f"Peers: {', '.join(p[:12] + '...' for p in peers)}."
            )
        desc_parts.append(
            f"Cache: {cache_size} entries, hit rate: {cache_hit:.0%}, "
            f"latency: {avg_latency}ms."
        )
        desc_parts.append(f"Agent ID: {agent_id[:20]}...")

        tags = ['agent', 'node', role, 'p2p', 'libp2p', 'infrastructure']
        if health >= 0.9:
            tags.append('healthy')
        if is_coordinator:
            tags.append('coordinator')

        key = self._build_key("optimusdb", "agent", node)
        _add({
            "key": key,
            "name": f"Agent: {agent_name}",
            "schema": "agent",
            "cluster": node,
            "database": "optimusdb",
            "description": " ".join(desc_parts),
            "column_names": [],
            "tags": tags,
            "row_count": peer_count,
            "source_type": "agent",
            "extra_fields": {},
        })

    # ==================================================================
    # Cached discovery
    # ==================================================================
    def _get_cached(self) -> List[Dict[str, Any]]:
        with self._cache_lock:
            now = time.time()
            if self._cache is not None and (now - self._cache_time) < CACHE_TTL:
                return self._cache
            LOGGER.info("[OptimusDBSearchProxy] Refreshing discovery cache...")
            self._cache = self._discover_all()
            self._cache_time = now
            return self._cache

    # ==================================================================
    # Search scoring
    # ==================================================================
    def _score(self, ds: Dict[str, Any], query: str) -> float:
        if not query or query == '*':
            return 1.0

        q = query.lower().strip()
        score = 0.0

        name = ds.get('name', '').lower()
        if name == q:
            score += 100
        elif name.startswith(q):
            score += 80
        elif q in name:
            score += 50

        schema = ds.get('schema', '').lower()
        if q in schema:
            score += 30
        db = ds.get('database', '').lower()
        if q in db:
            score += 15

        desc = ds.get('description', '').lower()
        if q in desc:
            score += 20

        # FIX BUG-003: tags in the cache dict are plain strings, but guard
        # against Tag objects defensively using _tag_to_str()
        for tag in ds.get('tags', []):
            if q in self._tag_to_str(tag).lower():
                score += 25
                break

        for col in ds.get('column_names', []):
            if q in col.lower():
                score += 15
                break

        src = ds.get('source_type', '').lower()
        if q in src:
            score += 20

        cluster = ds.get('cluster', '').lower()
        if q in cluster:
            score += 10

        for val in ds.get('extra_fields', {}).values():
            if isinstance(val, str) and q in val.lower():
                score += 10
                break

        if ds.get('row_count', 0) > 0 and score > 0:
            score += 5

        return score

    # ==================================================================
    # Convert dataset dict → Amundsen Table model
    # ==================================================================
    def _to_table(self, ds: Dict[str, Any]) -> Table:
        """Convert internal dataset dict to a Table with exact constructor."""
        key = ds.get('key', '')
        return Table(
            id=self._make_id(key),
            name=ds.get('name', 'unknown'),
            key=key,
            description=ds.get('description', ''),
            cluster=ds.get('cluster', 'default'),
            database=ds.get('database', 'optimusdb'),
            schema=ds.get('schema', 'default'),
            column_names=ds.get('column_names', []),
            tags=self._make_tags(ds.get('tags', [])),
            badges=self._make_tags([]),
            last_updated_timestamp=int(time.time()),
            programmatic_descriptions=[],
        )

    # ==================================================================
    # PUBLIC API: search() — required abstract method
    # ==================================================================
    def search(
            self,
            *,
            query_term: str,
            page_index: int,
            results_per_page: int,
            resource_types: List[Resource],
            filters: List[Filter],
            highlight_options: Dict[Resource, HighlightOptions],
    ) -> SearchResponse:
        try:
            LOGGER.info(
                f"[search] query='{query_term}', page={page_index}, "
                f"per_page={results_per_page}, "
                f"resources={[r.name for r in resource_types]}"
            )

            if not resource_types:
                resource_types = [
                    Resource.TABLE, Resource.USER,
                    Resource.DASHBOARD, Resource.FEATURE,
                ]

            results: Dict[str, Any] = {}

            for rt in resource_types:
                if rt == Resource.TABLE:
                    r = self.fetch_table_search_results(
                        query_term=query_term, page_index=page_index
                    )
                    results['table'] = {
                        'total_results': r.total_results,
                        # FIX BUG-001: _serialize_result() converts Tag objects
                        # in tags/badges to plain strings before json.dumps()
                        'results': [self._serialize_result(t) for t in r.results],
                    }
                elif rt == Resource.USER:
                    r = self.fetch_user_search_results(
                        query_term=query_term, page_index=page_index
                    )
                    results['user'] = {
                        'total_results': r.total_results,
                        'results': [self._serialize_result(u) for u in r.results],
                    }
                elif rt == Resource.DASHBOARD:
                    r = self.fetch_dashboard_search_results(
                        query_term=query_term, page_index=page_index
                    )
                    results['dashboard'] = {
                        'total_results': r.total_results,
                        'results': [self._serialize_result(d) for d in r.results],
                    }
                elif rt == Resource.FEATURE:
                    r = self.fetch_feature_search_results(
                        query_term=query_term, page_index=page_index
                    )
                    results['feature'] = {
                        'total_results': r.total_results,
                        'results': [self._serialize_result(f) for f in r.results],
                    }

            return SearchResponse(
                msg='Success',
                page_index=page_index,
                results_per_page=results_per_page,
                results=results,
                status_code=200,
            )
        except Exception as e:
            LOGGER.exception(f"[search] error: {e}")
            return SearchResponse(
                msg=f'Error: {e}',
                page_index=page_index,
                results_per_page=results_per_page,
                results={},
                status_code=500,
            )

    # ==================================================================
    # fetch_search_results_with_filter — required abstract
    # ==================================================================
    def fetch_search_results_with_filter(
            self,
            *,
            query_term: str,
            search_request: dict,
            page_index: int = 0,
            index: str = '',
    ) -> Union[SearchTableResult, SearchDashboardResult, SearchFeatureResult]:
        if index in ('dashboard_search_index', 'dashboard'):
            return self.fetch_dashboard_search_results(
                query_term=query_term, page_index=page_index
            )
        elif index in ('feature_search_index', 'feature'):
            return self.fetch_feature_search_results(
                query_term=query_term, page_index=page_index
            )
        return self.fetch_table_search_results(
            query_term=query_term, page_index=page_index
        )

    # ==================================================================
    # TABLE SEARCH — discovers everything via inventory
    # ==================================================================
    def fetch_table_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
    ) -> SearchTableResult:
        try:
            per_page = 10
            datasets = self._get_cached()

            scored = [
                (self._score(ds, query_term), ds)
                for ds in datasets
            ]
            scored = [(s, ds) for s, ds in scored if s > 0]
            scored = self._apply_search_filters(scored)
            scored.sort(key=lambda x: x[0], reverse=True)

            total = len(scored)
            start = page_index * per_page
            page = scored[start:start + per_page]
            tables = [self._to_table(ds) for _, ds in page]

            LOGGER.info(
                f"[TableSearch] '{query_term}': {total} results, "
                f"showing {len(tables)} (page {page_index})"
            )
            return SearchTableResult(
                total_results=total, results=tables
            )
        except Exception as e:
            LOGGER.exception(f"[TableSearch] error: {e}")
            return SearchTableResult(total_results=0, results=[])

    def _apply_search_filters(
            self,
            scored: list,
            filters: dict = None,
    ) -> list:
        """
        Apply sidebar filters that come through the search request.
        Currently handled via query_term prefix conventions.
        Extend this when filter state is passed via the search API.
        """
        return scored

    # ==================================================================
    # USER SEARCH
    # ==================================================================
    def fetch_user_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
    ) -> SearchUserResult:
        try:
            per_page = 10
            if query_term in ('*', '', None):
                sql = "SELECT * FROM users LIMIT 50;"
            else:
                t = self._escape_sql(query_term.lower())
                sql = (
                    f"SELECT * FROM users WHERE "
                    f"LOWER(email) LIKE '%{t}%' OR "
                    f"LOWER(display_name) LIKE '%{t}%' OR "
                    f"LOWER(team_name) LIKE '%{t}%' OR "
                    f"LOWER(role_name) LIKE '%{t}%' OR "
                    f"LOWER(department) LIKE '%{t}%' "
                    f"LIMIT 50;"
                )

            result = self._execute_sql(sql)
            records = result.get('data', {}).get('records', [])

            users = []
            for rec in records:
                uid = rec.get('user_id', rec.get('_id', ''))
                users.append(User(
                    id=uid or self._make_id(rec.get('email', '')),
                    user_id=uid,
                    email=rec.get('email', ''),
                    first_name=rec.get('first_name', ''),
                    last_name=rec.get('last_name', ''),
                    full_name=rec.get('display_name', ''),
                    display_name=rec.get('display_name', ''),
                    is_active=bool(rec.get('is_active', True)),
                    team_name=rec.get('team_name', ''),
                    role_name=rec.get('role_name', ''),
                    employee_type=rec.get('employee_type', ''),
                    manager_email=rec.get('manager_email'),
                ))

            start = page_index * per_page
            return SearchUserResult(
                total_results=len(users),
                results=users[start:start + per_page],
            )
        except Exception as e:
            LOGGER.exception(f"[UserSearch] error: {e}")
            return SearchUserResult(total_results=0, results=[])

    # ==================================================================
    # DASHBOARD SEARCH
    # ==================================================================
    def fetch_dashboard_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
    ) -> SearchDashboardResult:
        try:
            per_page = 10
            if query_term in ('*', '', None):
                sql = "SELECT * FROM dashboards LIMIT 50;"
            else:
                t = self._escape_sql(query_term.lower())
                sql = (
                    f"SELECT * FROM dashboards WHERE "
                    f"LOWER(name) LIKE '%{t}%' OR "
                    f"LOWER(description) LIKE '%{t}%' OR "
                    f"LOWER(group_name) LIKE '%{t}%' "
                    f"LIMIT 50;"
                )

            result = self._execute_sql(sql)
            records = result.get('data', {}).get('records', [])

            dashboards = []
            for rec in records:
                did = rec.get('dashboard_id', rec.get('_id', ''))
                dashboards.append(Dashboard(
                    id=did or self._make_id(rec.get('name', '')),
                    uri=did,
                    cluster=rec.get('cluster', 'optimusdb'),
                    group_name=rec.get('group_name', ''),
                    group_url=rec.get('group_url', ''),
                    product=rec.get('product', 'optimusdb'),
                    name=rec.get('name', ''),
                    url=rec.get('url', ''),
                    description=rec.get('description'),
                    last_successful_run_timestamp=rec.get('last_run'),
                ))

            start = page_index * per_page
            return SearchDashboardResult(
                total_results=len(dashboards),
                results=dashboards[start:start + per_page],
            )
        except Exception as e:
            LOGGER.exception(f"[DashboardSearch] error: {e}")
            return SearchDashboardResult(total_results=0, results=[])

    # ==================================================================
    # FEATURE SEARCH (placeholder)
    # ==================================================================
    def fetch_feature_search_results(
            self,
            *,
            query_term: str,
            page_index: int = 0,
            index: str = '',
    ) -> SearchFeatureResult:
        return SearchFeatureResult(total_results=0, results=[])

    # ==================================================================
    # Document ops (no-ops — OptimusDB is source of truth)
    # ==================================================================
    def create_document(
            self, *, data: List[Dict[str, Any]], index: str = ''
    ) -> str:
        return "Managed by OptimusDB"

    def update_document(
            self, *, data: List[Dict[str, Any]], index: str = ''
    ) -> str:
        return "Managed by OptimusDB"

    def delete_document(
            self, *, data: List[str], index: str = ''
    ) -> str:
        return "Managed by OptimusDB"

    def update_document_by_key(
            self,
            *,
            resource_key: str,
            resource_type: Resource,
            field: str,
            value: Optional[str] = None,
            operation: str = 'add',
    ) -> str:
        return "Managed by OptimusDB"

    def delete_document_by_key(
            self,
            *,
            resource_key: str,
            resource_type: Resource,
            field: str,
            value: Optional[str] = None,
    ) -> str:
        return "Managed by OptimusDB"
