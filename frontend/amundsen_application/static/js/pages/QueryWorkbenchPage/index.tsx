// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/index.tsx
// ENHANCED QUERY WORKBENCH — White Theme, Agent Selector, Schema Explorer,
// Example Queries, Fixed Result Display
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';
import { buildApiUrl } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// Types
// ==============================================================================

export type QueryMode = 'sql' | 'crud';

export interface AgentInfo {
  nodeId: number;
  name: string;
  role: string;
  peerId: string;
  isLeader: boolean;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTimeMs: number;
  rawResponse?: any;
  error?: string;
  operation?: string;
  executedOnNode?: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  executionTimeMs: number;
  rowCount: number;
  favorite: boolean;
  queryMode: QueryMode;
  agent?: string;
}

export interface SchemaStore {
  name: string;
  type: string;
  initialized: boolean;
  entryCount?: number;
}

export interface SchemaTable {
  name: string;
  type: string;
  database?: string;
}

// ==============================================================================
// Example Queries from Postman Collection
// ==============================================================================

interface ExampleQuery {
  name: string;
  category: string;
  mode: QueryMode;
  query: string;
  dstype?: string;
  strategy?: string;
  description: string;
}

const EXAMPLE_QUERIES: ExampleQuery[] = [
  // ─── SQL Examples ───
  {
    name: 'Data Catalog — All Records',
    category: 'SQL — Catalog',
    mode: 'sql',
    query: 'SELECT * FROM datacatalog;',
    description: 'List all records in the data catalog',
  },
  {
    name: 'TOSCA Metadata — All Files',
    category: 'SQL — Catalog',
    mode: 'sql',
    query: 'SELECT id, template_id, filename, filesize_bytes, uploader, created_at FROM toscametadata;',
    description: 'List all uploaded TOSCA files',
  },
  {
    name: 'Logs — Recent Errors',
    category: 'SQL — Logs',
    mode: 'sql',
    query: "SELECT timestamp, level, message, source FROM optimusLogger WHERE level='ERROR' ORDER BY timestamp DESC LIMIT 20;",
    description: 'Find recent error log entries',
  },
  {
    name: 'Logs — Election Activity',
    category: 'SQL — Logs',
    mode: 'sql',
    query: "SELECT leader_id, term, timestamp FROM optimusLogger WHERE level='ELECTION' ORDER BY timestamp DESC LIMIT 10;",
    description: 'View recent leader election events',
  },
  {
    name: 'Products — SELECT',
    category: 'SQL — Custom Tables',
    mode: 'sql',
    query: 'SELECT * FROM products WHERE price > 10 ORDER BY price DESC LIMIT 10;',
    description: 'Query products table with price filter',
  },
  {
    name: 'Products — Aggregation',
    category: 'SQL — Custom Tables',
    mode: 'sql',
    query: "SELECT category, COUNT(*) as count, AVG(price) as avg_price, MIN(price) as min_price, MAX(price) as max_price FROM products WHERE stock > 0 GROUP BY category HAVING COUNT(*) > 5 ORDER BY avg_price DESC;",
    description: 'Product category aggregation with stats',
  },
  {
    name: 'CREATE TABLE Example',
    category: 'SQL — DDL',
    mode: 'sql',
    query: 'CREATE TABLE IF NOT EXISTS products (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  description TEXT,\n  category TEXT NOT NULL,\n  price REAL NOT NULL CHECK (price >= 0),\n  stock INTEGER NOT NULL DEFAULT 0,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);',
    description: 'Create a sample products table',
  },
  {
    name: 'SQLite — List All Tables',
    category: 'SQL — Schema',
    mode: 'sql',
    query: "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name;",
    description: 'Show all tables and views',
  },
  // ─── CRUD Examples ───
  {
    name: 'All Documents (dsswres)',
    category: 'CRUD — Basic',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 1 },\n  "dstype": "dsswres",\n  "criteria": []\n}',
    description: 'Retrieve all documents from dsswres store',
  },
  {
    name: 'Find by Template ID',
    category: 'CRUD — Basic',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 1 },\n  "dstype": "dsswres",\n  "criteria": [{ "tosca_definitions_version": "tosca_simple_yaml_1_3" }]\n}',
    description: 'Find templates by TOSCA version',
  },
  {
    name: 'Find ADT Applications',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "argcnt": 10000, "cmd": "query" },\n  "args": ["*", "application_description"],\n  "dstype": "dsswres",\n  "criteria": [{\n    "document_type": "application_description",\n    "metadata.kb_datastore": "ADT"\n  }],\n  "options": {\n    "strategy": "LOCAL_THEN_REMOTE_MERGE",\n    "time_budget_ms": 1000,\n    "annotate_source": true\n  }\n}',
    description: 'Find application descriptions from ADT datastore',
  },
  {
    name: 'Find by Author',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "argcnt": 10000, "cmd": "query" },\n  "args": ["*", "tosca_template"],\n  "dstype": "dsswres",\n  "criteria": [{\n    "metadata.template_author": "Swarmchestrate Orchestrator"\n  }],\n  "options": {\n    "strategy": "LOCAL_ONLY",\n    "time_budget_ms": 500\n  }\n}',
    description: 'Find templates by specific author',
  },
  {
    name: 'Find GPU Capacity ≥20 Cores',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 10000 },\n  "dstype": "dsswres",\n  "criteria": [{\n    "document_type": "capacity_description",\n    "metadata.status": "available",\n    "node_types": { "$contains": "tosca.nodes.Compute.GPU" },\n    "topology.edge_compute_node_01.properties.available_cpu_cores": { "$gte": 20 }\n  }]\n}',
    description: 'Find GPU capacity with minimum 20 CPU cores',
  },
  {
    name: 'Find NVIDIA A100 GPUs',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 10000 },\n  "dstype": "dsswres",\n  "criteria": [{\n    "topology.gpu_accelerator_01.properties.available": true,\n    "topology.gpu_accelerator_01.properties.gpu_model": "NVIDIA A100"\n  }]\n}',
    description: 'Find nodes with available NVIDIA A100 GPUs',
  },
  {
    name: 'High Priority Applications',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 10000 },\n  "dstype": "dsswres",\n  "criteria": [{\n    "document_type": "application_requirements",\n    "metadata.priority": "high"\n  }]\n}',
    description: 'Find high-priority application requests',
  },
  {
    name: 'Ready-to-Deploy Plans',
    category: 'CRUD — TOSCA',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 10000 },\n  "dstype": "dsswres",\n  "criteria": [{\n    "document_type": "deployment_release_plan",\n    "metadata.execution_status": "ready_for_deployment"\n  }]\n}',
    description: 'Find deployment plans ready to execute',
  },
  {
    name: 'Complex — EU Capacity with GPU',
    category: 'CRUD — Advanced',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "crudget", "argcnt": 10000 },\n  "dstype": "dsswres",\n  "criteria": [{\n    "$and": [\n      { "document_type": "capacity_description" },\n      { "metadata.status": "available" },\n      { "metadata.region": { "$regex": "eu-.*" } },\n      { "topology.gpu_accelerator_01.properties.available": true },\n      { "topology.edge_compute_node_01.properties.available_cpu_cores": { "$gte": 20 } }\n    ]\n  }]\n}',
    description: 'Find EU nodes with GPUs and sufficient CPU',
  },
  {
    name: 'Capacity Matching (Full)',
    category: 'CRUD — Advanced',
    mode: 'crud',
    query: '{\n  "method": { "argcnt": 10000, "cmd": "query" },\n  "args": ["*", "capacity_description"],\n  "dstype": "kbdata",\n  "criteria": [{\n    "document_type": "capacity_description",\n    "metadata.status": "available",\n    "metadata.region": { "$regex": "eu-central.*" },\n    "topology.edge_compute_node_01.properties.available_cpu_cores": { "$gte": 16 },\n    "node_types": { "$contains": "tosca.nodes.Compute.GPU" },\n    "topology.gpu_accelerator_01.properties.available": true\n  }],\n  "options": {\n    "strategy": "PARALLEL_AGGREGATE",\n    "time_budget_ms": 2500,\n    "annotate_source": true\n  }\n}',
    description: 'Full capacity matching query with multiple criteria',
  },
  // ─── Agent Strategy Examples ───
  {
    name: 'LOCAL_ONLY — Baseline',
    category: 'CRUD — Strategies',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "query" },\n  "dstype": "dsswres",\n  "criteria": [{ "_id": { "$regex": ".*" } }],\n  "options": {\n    "strategy": "LOCAL_ONLY",\n    "consistency": "BEST_EFFORT",\n    "include_local": true,\n    "annotate_source": true,\n    "time_budget_ms": 800\n  }\n}',
    description: 'Query local agent only (baseline)',
  },
  {
    name: 'PARALLEL_MERGE — Hedged',
    category: 'CRUD — Strategies',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "query" },\n  "dstype": "dsswres",\n  "criteria": [{ "_id": { "$regex": ".*" } }],\n  "options": {\n    "strategy": "PARALLEL_MERGE",\n    "consistency": "BEST_EFFORT",\n    "include_local": true,\n    "annotate_source": true,\n    "max_peers": 5,\n    "time_budget_ms": 1800\n  }\n}',
    description: 'Parallel hedged query across all peers',
  },
  {
    name: 'QUORUM — Majority',
    category: 'CRUD — Strategies',
    mode: 'crud',
    query: '{\n  "method": { "cmd": "query" },\n  "dstype": "dsswres",\n  "criteria": [{ "_id": { "$regex": ".*" } }],\n  "options": {\n    "strategy": "QUORUM",\n    "consistency": "QUORUM",\n    "quorum_n": 4,\n    "min_rows": 2,\n    "include_local": true,\n    "annotate_source": true,\n    "time_budget_ms": 2500\n  }\n}',
    description: 'Quorum-based query requiring majority consensus',
  },
];

// ==============================================================================
// Helpers
// ==============================================================================

function extractColumnsFromData(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === 'object' && data[0] !== null) return Object.keys(data[0]);
    return ['value'];
  }
  if (typeof data === 'object' && data !== null) return Object.keys(data);
  return ['value'];
}

function extractRowsFromData(data: any): any[][] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object' && item !== null) return Object.values(item);
      return [item];
    });
  }
  if (typeof data === 'object' && data !== null) return [Object.values(data)];
  return [[data]];
}

function parseApiResponse(responseData: any): any[] {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;

  const d = responseData.data;
  if (!d) return [];

  if (d.records && Array.isArray(d.records)) return d.records;
  if (d.results && Array.isArray(d.results)) return d.results;
  if (d.rows && Array.isArray(d.rows)) return d.rows;
  if (Array.isArray(d)) return d;
  if (typeof d === 'object' && d !== null) {
    if (d.result && Array.isArray(d.result)) return d.result;
    if (d.items && Array.isArray(d.items)) return d.items;
    return [d];
  }
  return [];
}

// ==============================================================================
// Main Component
// ==============================================================================

const QueryWorkbenchPage: React.FC = () => {
  // ── Connection / Agents ──
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number>(1);
  const [context, setContext] = useState('swarmkb');
  const [queryMode, setQueryMode] = useState<QueryMode>('sql');
  const [readOnly, setReadOnly] = useState(true);

  // ── Layout ──
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(320);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  // ── Query ──
  const [query, setQuery] = useState(
    '-- SQL Mode — Query SQLite databases\n-- Press F5 or Ctrl+Enter to execute\n\nSELECT * FROM datacatalog LIMIT 10;'
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  // ── Schema ──
  const [crudStores, setCrudStores] = useState<SchemaStore[]>([]);
  const [rdbmsTables, setRdbmsTables] = useState<SchemaTable[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['rdbms', 'crud'])
  );

  // ── History ──
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  // ── Examples ──
  const [showExamples, setShowExamples] = useState(false);

  // ── Results view ──
  const [resultView, setResultView] = useState<'table' | 'json'>('table');
  const [resultTab, setResultTab] = useState<'results' | 'messages' | 'raw'>(
    'results'
  );

  // ── Editor ref ──
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // ============================================================================
  // Fetch agents on mount
  // ============================================================================

  useEffect(() => {
    fetchAgents();
    loadHistory();
  }, []);

  const fetchAgents = async () => {
    try {
      const url = buildApiUrl(
        'optimusdb',
        `/${context}/agent/status`,
        1
      );
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const totalPeers = data.cluster?.total_peers || 3;
        const agentList: AgentInfo[] = [];

        for (let i = 1; i <= totalPeers; i++) {
          try {
            const statusUrl = buildApiUrl(
              'optimusdb',
              `/${context}/agent/status`,
              i
            );
            const sRes = await fetch(statusUrl);
            if (sRes.ok) {
              const sData = await sRes.json();
              agentList.push({
                nodeId: i,
                name: `OptimusDB-${i}`,
                role: sData.agent?.role || 'Unknown',
                peerId: sData.agent?.peer_id
                  ? sData.agent.peer_id.substring(0, 12)
                  : '',
                isLeader: sData.agent?.is_current_leader || false,
              });
            } else {
              agentList.push({
                nodeId: i,
                name: `OptimusDB-${i}`,
                role: 'Unreachable',
                peerId: '',
                isLeader: false,
              });
            }
          } catch {
            agentList.push({
              nodeId: i,
              name: `OptimusDB-${i}`,
              role: 'Unreachable',
              peerId: '',
              isLeader: false,
            });
          }
        }
        setAgents(agentList);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setAgents([
        {
          nodeId: 1,
          name: 'OptimusDB-1',
          role: 'Unknown',
          peerId: '',
          isLeader: false,
        },
        {
          nodeId: 2,
          name: 'OptimusDB-2',
          role: 'Unknown',
          peerId: '',
          isLeader: false,
        },
        {
          nodeId: 3,
          name: 'OptimusDB-3',
          role: 'Unknown',
          peerId: '',
          isLeader: false,
        },
      ]);
    }
  };

  // ============================================================================
  // Load schema (CRUD stores from mesh + RDBMS tables from SQLite)
  // ============================================================================

  useEffect(() => {
    loadSchema();
  }, [context, selectedAgent]);

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      // 1. CRUD stores from mesh endpoint
      try {
        const meshUrl = buildApiUrl(
          'optimusdb',
          `/${context}/debug/optimusdb/mesh`,
          selectedAgent
        );
        const meshRes = await fetch(meshUrl);
        if (meshRes.ok) {
          const meshData = await meshRes.json();
          const stores = meshData.orbitdb_stores;
          if (
            stores &&
            typeof stores === 'object' &&
            !Array.isArray(stores)
          ) {
            const storeList = Object.entries(stores).map(
              ([name, info]: [string, any]) => ({
                name,
                type: info.type || 'unknown',
                initialized: info.initialized ?? false,
                entryCount: info.entry_count,
              })
            );
            setCrudStores(storeList);
          } else if (Array.isArray(stores)) {
            setCrudStores(
              stores.map((s: any) => ({
                name: s.name || 'unknown',
                type: s.type || 'unknown',
                initialized: s.initialized ?? false,
                entryCount: s.entry_count,
              }))
            );
          }
        }
      } catch {
        /* continue */
      }

      // 2. RDBMS tables from sqlite_master
      try {
        const sqlUrl = buildApiUrl(
          'optimusdb',
          `/${context}/command`,
          selectedAgent
        );
        const sqlRes = await axios.post(sqlUrl, {
          method: { cmd: 'sqldml', argcnt: 1 },
          sqldml:
            "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name;",
        });
        const tables = parseApiResponse(sqlRes.data);
        setRdbmsTables(
          tables
            .map((t: any) => ({
              name: t.name || t.Name || '',
              type: t.type || t.Type || 'table',
            }))
            .filter((t: SchemaTable) => t.name)
        );
      } catch {
        /* continue */
      }
    } catch (err) {
      console.error('Failed to load schema:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  // ============================================================================
  // Execute Query
  // ============================================================================

  const executeQuery = useCallback(async () => {
    const trimmed = query.replace(/^--.*$/gm, '').trim();
    if (!trimmed || isExecuting) return;

    setIsExecuting(true);
    setResult(null);
    setResultTab('results');
    const startTime = Date.now();

    try {
      const endpoint = buildApiUrl(
        'optimusdb',
        `/${context}/command`,
        selectedAgent
      );
      console.log(`✅ Executing on: ${endpoint}`);

      let requestBody: any;

      if (queryMode === 'sql') {
        requestBody = {
          method: { cmd: 'sqldml', argcnt: 1 },
          sqldml: trimmed,
        };
      } else {
        try {
          requestBody = JSON.parse(trimmed);
        } catch {
          throw new Error(
            'Invalid JSON. Provide a valid JSON request body (see Examples for format).'
          );
        }
      }

      console.log('📤 Request:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(endpoint, requestBody, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📥 Response:', response.data);

      const responseData = response.data || {};
      const actualData = parseApiResponse(responseData);
      const isSuccess =
        responseData.status === 200 ||
        responseData.status === 'success' ||
        actualData.length > 0 ||
        !responseData.error;

      const agentLabel =
        agents.find((a) => a.nodeId === selectedAgent)?.name ||
        `Node ${selectedAgent}`;

      const qr: QueryResult = {
        success: isSuccess,
        columns: extractColumnsFromData(actualData),
        rows: extractRowsFromData(actualData),
        rowCount: actualData.length,
        executionTimeMs: Date.now() - startTime,
        rawResponse: responseData,
        error: responseData.error || (!isSuccess ? 'Query execution failed' : undefined),
        operation:
          queryMode === 'crud'
            ? (requestBody?.method?.cmd || 'QUERY').toUpperCase()
            : 'SQL',
        executedOnNode: agentLabel,
      };

      console.log(
        `✅ ${qr.rowCount} rows in ${qr.executionTimeMs}ms on ${agentLabel}`
      );
      setResult(qr);

      // Save to history
      if (qr.success) {
        const item: QueryHistoryItem = {
          id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          query: query,
          timestamp: new Date().toISOString(),
          executionTimeMs: qr.executionTimeMs,
          rowCount: qr.rowCount,
          favorite: false,
          queryMode,
          agent: agentLabel,
        };
        const newHist = [item, ...history].slice(0, 100);
        setHistory(newHist);
        localStorage.setItem('qwb_history', JSON.stringify(newHist));
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      setResult({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        rawResponse: error.response?.data,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Query execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [query, queryMode, selectedAgent, context, history, agents]);

  // ============================================================================
  // History
  // ============================================================================

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('qwb_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  };

  const toggleFavorite = (id: string) => {
    const newH = history.map((h) =>
      h.id === id ? { ...h, favorite: !h.favorite } : h
    );
    setHistory(newH);
    localStorage.setItem('qwb_history', JSON.stringify(newH));
  };

  // ============================================================================
  // Keyboard shortcuts
  // ============================================================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        executeQuery();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [executeQuery, showHistory]);

  // ============================================================================
  // Resizer logic
  // ============================================================================

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (isResizingLeft)
        setLeftPanelWidth(Math.max(200, Math.min(500, e.clientX)));
      if (isResizingBottom)
        setBottomPanelHeight(
          Math.max(120, Math.min(600, window.innerHeight - e.clientY - 60))
        );
    };
    const up = () => {
      setIsResizingLeft(false);
      setIsResizingBottom(false);
    };
    if (isResizingLeft || isResizingBottom) {
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.body.style.cursor = isResizingLeft ? 'ew-resize' : 'ns-resize';
    }
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };
  }, [isResizingLeft, isResizingBottom]);

  // ============================================================================
  // Export
  // ============================================================================

  const exportResults = (fmt: 'csv' | 'json') => {
    if (!result || !result.success) return;
    if (fmt === 'csv') {
      const csv = [
        result.columns.join(','),
        ...result.rows.map((r) =>
          r
            .map((c) => {
              const s = c === null ? 'NULL' : String(c);
              return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(',')
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `query_${Date.now()}.csv`;
      a.click();
    } else {
      const data = result.rows.map((r) => {
        const o: any = {};
        result.columns.forEach((c, i) => (o[c] = r[i]));
        return o;
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `query_${Date.now()}.json`;
      a.click();
    }
  };

  // ============================================================================
  // Example categories
  // ============================================================================

  const exampleCategories = useMemo(() => {
    const cats = new Map<string, ExampleQuery[]>();
    const filtered = EXAMPLE_QUERIES.filter((q) => q.mode === queryMode);
    filtered.forEach((q) => {
      if (!cats.has(q.category)) cats.set(q.category, []);
      cats.get(q.category)!.push(q);
    });
    return cats;
  }, [queryMode]);

  // ============================================================================
  // Render helpers
  // ============================================================================

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  const selectedAgentInfo = agents.find((a) => a.nodeId === selectedAgent);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <DocumentTitle title="Query Workbench - OptimusDB">
      <div className="qwb-page">
        {/* ══════════ TOOLBAR ══════════ */}
        <div className="qwb-toolbar">
          <div className="qwb-tb-left">
            <h1 className="qwb-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Query Workbench
            </h1>

            {/* Mode toggle */}
            <div className="qwb-mode-toggle">
              <button
                className={`qwb-mode-btn ${queryMode === 'sql' ? 'active' : ''}`}
                onClick={() => {
                  setQueryMode('sql');
                  setQuery(
                    '-- SQL Mode\n\nSELECT * FROM datacatalog LIMIT 10;'
                  );
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                </svg>
                SQL
              </button>
              <button
                className={`qwb-mode-btn ${queryMode === 'crud' ? 'active' : ''}`}
                onClick={() => {
                  setQueryMode('crud');
                  setQuery(
                    '{\n  "method": { "cmd": "crudget", "argcnt": 1 },\n  "dstype": "dsswres",\n  "criteria": []\n}'
                  );
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Criteria
              </button>
            </div>

            {/* Agent selector */}
            <div className="qwb-agent-select">
              <label>Agent:</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(Number(e.target.value))}
              >
                {agents.map((a) => (
                  <option key={a.nodeId} value={a.nodeId}>
                    {a.name} {a.isLeader ? '⭐' : ''} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Context */}
            <div className="qwb-context-select">
              <label>Context:</label>
              <select
                value={context}
                onChange={(e) => setContext(e.target.value)}
              >
                <option value="swarmkb">swarmkb</option>
              </select>
            </div>
          </div>

          <div className="qwb-tb-right">
            <button
              className="qwb-btn qwb-btn-ghost"
              onClick={() => setShowExamples(!showExamples)}
            >
              📚 Examples
            </button>
            <button
              className="qwb-btn qwb-btn-ghost"
              onClick={() => setShowHistory(!showHistory)}
            >
              📋 History{' '}
              {history.length > 0 && (
                <span className="qwb-badge">{history.length}</span>
              )}
            </button>
            <button
              className="qwb-btn qwb-btn-primary"
              onClick={executeQuery}
              disabled={isExecuting || !query.trim()}
            >
              {isExecuting ? (
                <>
                  <span className="qwb-spinner" /> Executing...
                </>
              ) : (
                <>
                  ▶ Execute <kbd>F5</kbd>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ══════════ CONTENT ══════════ */}
        <div className="qwb-content">
          {/* ── LEFT PANEL: Schema Explorer ── */}
          <div
            className="qwb-left"
            style={{ width: `${leftPanelWidth}px` }}
          >
            <div className="qwb-schema-header">
              <span className="qwb-schema-title">Explorer</span>
              <button
                className="qwb-icon-btn"
                onClick={loadSchema}
                disabled={loadingSchema}
                title="Refresh schema"
              >
                {loadingSchema ? '⟳' : '🔄'}
              </button>
            </div>

            <div className="qwb-schema-content">
              {loadingSchema && (
                <div className="qwb-schema-loading">
                  <div className="qwb-spinner-sm" /> Loading...
                </div>
              )}

              {/* RDBMS Tables */}
              <div className="qwb-schema-section">
                <div
                  className="qwb-schema-section-header"
                  onClick={() => toggleSection('rdbms')}
                >
                  <span className="qwb-expand-icon">
                    {expandedSections.has('rdbms') ? '▼' : '▶'}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                  </svg>
                  <span className="qwb-section-label">RDBMS (SQLite)</span>
                  <span className="qwb-section-count">
                    {rdbmsTables.length}
                  </span>
                </div>
                {expandedSections.has('rdbms') && (
                  <div className="qwb-schema-items">
                    {rdbmsTables.length === 0 && !loadingSchema && (
                      <div className="qwb-schema-empty">No tables found</div>
                    )}
                    {rdbmsTables.map((t) => (
                      <div
                        key={t.name}
                        className="qwb-schema-item"
                        onClick={() => {
                          if (queryMode === 'sql') {
                            setQuery(
                              `SELECT * FROM ${t.name} LIMIT 20;`
                            );
                          }
                        }}
                        title={`Click to query ${t.name}`}
                      >
                        <span className="qwb-item-icon qwb-item-icon-table">
                          {t.type === 'view' ? '👁' : '📋'}
                        </span>
                        <span className="qwb-item-name">{t.name}</span>
                        <span className="qwb-item-type">{t.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CRUD Stores */}
              <div className="qwb-schema-section">
                <div
                  className="qwb-schema-section-header"
                  onClick={() => toggleSection('crud')}
                >
                  <span className="qwb-expand-icon">
                    {expandedSections.has('crud') ? '▼' : '▶'}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <span className="qwb-section-label">
                    CRUD Stores (OrbitDB)
                  </span>
                  <span className="qwb-section-count">
                    {crudStores.filter((s) => s.initialized).length}/
                    {crudStores.length}
                  </span>
                </div>
                {expandedSections.has('crud') && (
                  <div className="qwb-schema-items">
                    {crudStores.length === 0 && !loadingSchema && (
                      <div className="qwb-schema-empty">No stores found</div>
                    )}
                    {crudStores.map((s) => (
                      <div
                        key={s.name}
                        className={`qwb-schema-item ${!s.initialized ? 'qwb-schema-item-disabled' : ''}`}
                        onClick={() => {
                          if (s.initialized && queryMode === 'crud') {
                            setQuery(
                              `{\n  "method": { "cmd": "crudget", "argcnt": 1 },\n  "dstype": "${s.name}",\n  "criteria": []\n}`
                            );
                          }
                        }}
                        title={
                          s.initialized
                            ? `Click to query ${s.name}`
                            : `${s.name} — not initialized`
                        }
                      >
                        <span
                          className={`qwb-item-icon ${s.initialized ? 'qwb-item-icon-store' : 'qwb-item-icon-disabled'}`}
                        >
                          {s.initialized ? '🟢' : '⚪'}
                        </span>
                        <span className="qwb-item-name">{s.name}</span>
                        <span className="qwb-item-type">
                          {s.type === 'EventLogStore'
                            ? 'eventlog'
                            : s.type === 'DocumentStore'
                              ? 'docstore'
                              : s.type || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="qwb-schema-footer">
              💡 Click items to insert queries
            </div>
          </div>

          {/* ── RESIZER ── */}
          <div
            className="qwb-resizer-v"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingLeft(true);
            }}
          />

          {/* ── CENTER + BOTTOM ── */}
          <div className="qwb-main">
            {/* Editor */}
            <div className="qwb-editor-wrap">
              <div className="qwb-editor-header">
                <span className="qwb-editor-label">
                  {queryMode === 'sql'
                    ? '📝 SQL Query'
                    : '📦 CRUD Request (JSON)'}
                </span>
                <span className="qwb-editor-hint">
                  <kbd>F5</kbd> or <kbd>Ctrl+Enter</kbd> to execute
                </span>
              </div>
              <textarea
                ref={editorRef}
                className={`qwb-editor-textarea ${queryMode === 'crud' ? 'qwb-editor-json' : ''}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                placeholder={
                  queryMode === 'sql'
                    ? 'Enter SQL query...'
                    : 'Enter CRUD JSON payload...'
                }
              />
            </div>

            {/* Resizer */}
            <div
              className="qwb-resizer-h"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingBottom(true);
              }}
            />

            {/* ── RESULT PANE ── */}
            <div
              className="qwb-result-wrap"
              style={{ height: `${bottomPanelHeight}px` }}
            >
              <div className="qwb-result-header">
                <div className="qwb-result-tabs">
                  <button
                    className={`qwb-rtab ${resultTab === 'results' ? 'active' : ''}`}
                    onClick={() => setResultTab('results')}
                  >
                    📊 Results{' '}
                    {result && result.success && (
                      <span className="qwb-rtab-count">
                        ({result.rowCount})
                      </span>
                    )}
                  </button>
                  <button
                    className={`qwb-rtab ${resultTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setResultTab('messages')}
                  >
                    💬 Messages
                  </button>
                  <button
                    className={`qwb-rtab ${resultTab === 'raw' ? 'active' : ''}`}
                    onClick={() => setResultTab('raw')}
                  >
                    {'{ }'} Raw
                  </button>
                </div>
                <div className="qwb-result-actions">
                  {result &&
                    result.success &&
                    result.rowCount > 0 &&
                    resultTab === 'results' && (
                      <>
                        <button
                          className={`qwb-view-btn ${resultView === 'table' ? 'active' : ''}`}
                          onClick={() => setResultView('table')}
                        >
                          Table
                        </button>
                        <button
                          className={`qwb-view-btn ${resultView === 'json' ? 'active' : ''}`}
                          onClick={() => setResultView('json')}
                        >
                          JSON
                        </button>
                        <span className="qwb-result-sep" />
                        <button
                          className="qwb-btn qwb-btn-sm"
                          onClick={() => exportResults('csv')}
                        >
                          📥 CSV
                        </button>
                        <button
                          className="qwb-btn qwb-btn-sm"
                          onClick={() => exportResults('json')}
                        >
                          📥 JSON
                        </button>
                      </>
                    )}
                </div>
              </div>

              <div className="qwb-result-body">
                {isExecuting && (
                  <div className="qwb-result-center">
                    <div className="qwb-spinner-lg" /> Executing query...
                  </div>
                )}

                {!isExecuting && !result && (
                  <div className="qwb-result-center qwb-result-placeholder">
                    <div className="qwb-result-placeholder-icon">📝</div>
                    <p>No query executed yet</p>
                    <p className="qwb-muted">
                      Write a query above and press <kbd>F5</kbd> to execute
                    </p>
                  </div>
                )}

                {/* RESULTS TAB */}
                {!isExecuting && result && resultTab === 'results' && (
                  <>
                    {result.success ? (
                      result.rowCount > 0 ? (
                        resultView === 'table' ? (
                          <div className="qwb-table-container">
                            <table className="qwb-table">
                              <thead>
                              <tr>
                                <th className="qwb-th-row">#</th>
                                {result.columns.map((col, i) => (
                                  <th key={i}>{col}</th>
                                ))}
                              </tr>
                              </thead>
                              <tbody>
                              {result.rows.map((row, ri) => (
                                <tr key={ri}>
                                  <td className="qwb-td-row">{ri + 1}</td>
                                  {row.map((cell, ci) => (
                                    <td key={ci}>
                                      {cell === null ? (
                                        <span className="qwb-null">NULL</span>
                                      ) : typeof cell === 'object' ? (
                                        <span className="qwb-json-cell">
                                            {JSON.stringify(cell)}
                                          </span>
                                      ) : String(cell).length > 200 ? (
                                        <span title={String(cell)}>
                                            {String(cell).substring(0, 200)}…
                                          </span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <pre className="qwb-json-view">
                            {JSON.stringify(
                              result.rows.map((r) => {
                                const o: any = {};
                                result.columns.forEach(
                                  (c, i) => (o[c] = r[i])
                                );
                                return o;
                              }),
                              null,
                              2
                            )}
                          </pre>
                        )
                      ) : (
                        <div className="qwb-result-center">
                          <p>
                            ✅ Query executed successfully{' '}
                            {result.operation && `(${result.operation})`}
                          </p>
                          <p className="qwb-muted">No rows returned</p>
                        </div>
                      )
                    ) : (
                      <div className="qwb-result-error">
                        <p>
                          ❌ <strong>Query Failed</strong>
                        </p>
                        <pre>{result.error || 'Unknown error'}</pre>
                      </div>
                    )}
                  </>
                )}

                {/* MESSAGES TAB */}
                {!isExecuting && result && resultTab === 'messages' && (
                  <div className="qwb-messages">
                    <div
                      className={`qwb-msg ${result.success ? 'qwb-msg-ok' : 'qwb-msg-err'}`}
                    >
                      <span className="qwb-msg-icon">
                        {result.success ? '✅' : '❌'}
                      </span>
                      <div>
                        <p>
                          <strong>
                            {result.success
                              ? 'Query executed successfully'
                              : 'Query execution failed'}
                          </strong>{' '}
                          {result.operation && `(${result.operation})`}
                        </p>
                        <p>
                          Rows: <strong>{result.rowCount}</strong> · Time:{' '}
                          <strong>{result.executionTimeMs}ms</strong>
                          {result.executedOnNode && (
                            <>
                              {' '}
                              · Agent:{' '}
                              <strong>{result.executedOnNode}</strong>
                            </>
                          )}
                        </p>
                        {result.error && (
                          <pre className="qwb-msg-error">{result.error}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* RAW TAB */}
                {!isExecuting && result && resultTab === 'raw' && (
                  <pre className="qwb-json-view">
                    {JSON.stringify(result.rawResponse, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ STATUS BAR ══════════ */}
        <div className="qwb-statusbar">
          <span className="qwb-status-item">
            {queryMode === 'sql'
              ? '💾 SQL Mode — cmd: sqldml'
              : '📦 Criteria Mode — cmd: crudget / query'}
          </span>
          <span className="qwb-status-item">
            Agent:{' '}
            <strong>
              {selectedAgentInfo?.name || `Node ${selectedAgent}`}
            </strong>
            {selectedAgentInfo?.isLeader && ' ⭐'}
            {selectedAgentInfo?.role && ` (${selectedAgentInfo.role})`}
          </span>
          {result?.executedOnNode && (
            <span className="qwb-status-item">
              Last: <strong>{result.executedOnNode}</strong> ·{' '}
              {result.executionTimeMs}ms · {result.rowCount} rows
            </span>
          )}
        </div>

        {/* ══════════ EXAMPLES PANEL ══════════ */}
        {showExamples && (
          <>
            <div
              className="qwb-overlay"
              onClick={() => setShowExamples(false)}
            />
            <div className="qwb-drawer">
              <div className="qwb-drawer-header">
                <h3>
                  📚 Example Queries (
                  {queryMode === 'sql' ? 'SQL' : 'Criteria'})
                </h3>
                <button
                  className="qwb-close-btn"
                  onClick={() => setShowExamples(false)}
                >
                  ✕
                </button>
              </div>
              <div className="qwb-drawer-body">
                {Array.from(exampleCategories.entries()).map(
                  ([cat, queries]) => (
                    <div key={cat} className="qwb-example-group">
                      <div className="qwb-example-cat">{cat}</div>
                      {queries.map((q, i) => (
                        <div
                          key={i}
                          className="qwb-example-item"
                          onClick={() => {
                            setQuery(q.query);
                            setShowExamples(false);
                          }}
                        >
                          <div className="qwb-example-name">{q.name}</div>
                          <div className="qwb-example-desc">
                            {q.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════ HISTORY PANEL ══════════ */}
        {showHistory && (
          <>
            <div
              className="qwb-overlay"
              onClick={() => setShowHistory(false)}
            />
            <div className="qwb-drawer">
              <div className="qwb-drawer-header">
                <h3>📋 Query History</h3>
                <button
                  className="qwb-close-btn"
                  onClick={() => setShowHistory(false)}
                >
                  ✕
                </button>
              </div>
              <div className="qwb-drawer-filters">
                <button
                  className={`qwb-filter-btn ${historyFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setHistoryFilter('all')}
                >
                  All ({history.length})
                </button>
                <button
                  className={`qwb-filter-btn ${historyFilter === 'fav' ? 'active' : ''}`}
                  onClick={() => setHistoryFilter('fav')}
                >
                  ⭐ Favorites
                </button>
                <input
                  className="qwb-search-input"
                  type="text"
                  placeholder="Search..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div className="qwb-drawer-body">
                {history
                  .filter((h) =>
                    historyFilter === 'fav' ? h.favorite : true
                  )
                  .filter(
                    (h) =>
                      !historySearch ||
                      h.query
                        .toLowerCase()
                        .includes(historySearch.toLowerCase())
                  )
                  .map((h) => (
                    <div
                      key={h.id}
                      className="qwb-history-item"
                      onClick={() => {
                        setQuery(h.query);
                        setQueryMode(h.queryMode);
                        setShowHistory(false);
                      }}
                    >
                      <div className="qwb-hi-top">
                        <button
                          className="qwb-fav-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(h.id);
                          }}
                        >
                          {h.favorite ? '⭐' : '☆'}
                        </button>
                        <span className={`qwb-hi-mode ${h.queryMode}`}>
                          {h.queryMode === 'sql' ? 'SQL' : 'CRUD'}
                        </span>
                        {h.agent && (
                          <span className="qwb-hi-agent">{h.agent}</span>
                        )}
                        <span className="qwb-hi-time">
                          {formatTimestamp(h.timestamp)}
                        </span>
                      </div>
                      <code className="qwb-hi-query">
                        {h.query.length > 120
                          ? h.query.substring(0, 120) + '...'
                          : h.query}
                      </code>
                      <div className="qwb-hi-stats">
                        <span>⏱ {h.executionTimeMs}ms</span>
                        <span>📊 {h.rowCount} rows</span>
                      </div>
                    </div>
                  ))}
                {history.length === 0 && (
                  <div className="qwb-result-center qwb-muted">
                    No history yet
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Write mode warning */}
        {!readOnly && (
          <div className="qwb-warning-banner">
            ⚠️ <strong>Write Mode Enabled</strong> — DML statements will
            modify data
          </div>
        )}
      </div>
    </DocumentTitle>
  );
};

export default QueryWorkbenchPage;
