// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/index.tsx
// PHASE 3 REFINED VERSION WITH DYNAMIC API CONFIG & LOAD BALANCING
// ==============================================================================
// OptimusDB-Aware Query Workbench - CORRECTED FOR ACTUAL API FORMAT
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';
import { buildDynamicApiUrl, buildApiUrl } from 'config/apiConfig'; // ← PHASE 3 IMPORT

import ConnectionPanel from './components/ConnectionPanel';
import SchemaExplorer from './components/SchemaExplorer';
import QueryEditor from './components/QueryEditor';
import ResultPane from './components/ResultPane';
import TraceWidget from './components/TraceWidget';
import HistoryDrawer from './components/HistoryDrawer';

import './styles.scss';

// ==============================================================================
// TypeScript Interfaces
// ==============================================================================

export type QueryMode = 'sql' | 'crud';

export interface Connection {
  mode: 'coordinator' | 'specific-node' | 'fan-out';
  context: string;
  nodeId?: string;
  readOnly: boolean;
  queryMode: QueryMode;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTimeMs: number;
  trace?: TraceInfo;
  error?: string;
  operation?: string;
  executedOnNode?: string; // ← PHASE 3: Track which node handled the query
}

export interface TraceInfo {
  traceId: string;
  tracePath: string[];
  nodeTimings: { [nodeId: string]: number };
  totalTimeMs: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  executionTimeMs: number;
  rowCount: number;
  favorite: boolean;
  queryMode: QueryMode;
}

export interface SchemaNode {
  name: string;
  type: 'context' | 'table' | 'column';
  children?: SchemaNode[];
  dataType?: string;
  description?: string;
}

// ==============================================================================
// Helper Functions
// ==============================================================================

function getDefaultQuery(mode: QueryMode): string {
  if (mode === 'sql') {
    return (
      '-- SQL Mode - Query SQLite Database\n' +
      '-- Press F5 or Ctrl+Enter to execute\n\n' +
      'select * from datacatalog LIMIT 10;'
    );
  } else {
    return (
      '-- CRUD Mode - Criteria-based Query\n' +
      '-- Format: JSON criteria object\n\n' +
      '{\n' +
      '  "cpu_capacity": { "$gte": 5 },\n' +
      '  "memory_capacity": { "$gte": 16384 }\n' +
      '}'
    );
  }
}

function extractColumns(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data) && data.length > 0) {
    return Object.keys(data[0]);
  }
  if (typeof data === 'object') {
    return Object.keys(data);
  }
  return [];
}

function extractRows(data: any): any[][] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object') {
        return Object.values(item);
      }
      return [item];
    });
  }
  if (typeof data === 'object') {
    return [Object.values(data)];
  }
  return [[data]];
}

// ==============================================================================
// Main Query Workbench Component
// ==============================================================================

const QueryWorkbenchPage: React.FC = () => {
  const [connection, setConnection] = useState<Connection>({
    mode: 'coordinator',
    context: 'swarmkb',
    readOnly: true,
    queryMode: 'sql',
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [query, setQuery] = useState(getDefaultQuery('sql'));
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  const [schema, setSchema] = useState<SchemaNode[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);

  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // ✅ PHASE 3: Remove hardcoded apiBaseUrl from settings
  const [settings, setSettings] = useState({
    autoComplete: true,
    maxRows: 1000,
    theme: 'vs-dark',
  });

  // ===========================================================================
  // Effects
  // ===========================================================================

  useEffect(() => {
    if (connection.queryMode === 'sql') {
      loadSchema();
    }
  }, [connection.context, connection.queryMode]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    setQuery(getDefaultQuery(connection.queryMode));
  }, [connection.queryMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        executeQuery();
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, showHistory]);

  // ===========================================================================
  // API Functions - PHASE 3 UPDATED
  // ===========================================================================

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      // ✅ PHASE 3: Use dynamic URL for schema loading (node 1)
      const baseUrl = buildApiUrl('optimusdb', `/${connection.context}/command`, 1);

      console.log(`Loading schema from: ${baseUrl}`);

      const response = await axios.post(
        baseUrl,
        {
          method: {
            argcnt: 2,
            cmd: 'sqldml'
          },
          args: ['schema', 'query'],
          dstype: 'dsswres',
          sqldml: `
            SELECT name, type 
            FROM sqlite_master 
            WHERE type IN ('table', 'view') 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
          `,
          graph_traversal: [{}],
          criteria: []
        }
      );

      const tables = response.data.data || response.data;

      // Build schema tree
      const schemaTree: SchemaNode[] = [{
        name: connection.context,
        type: 'context',
        children: Array.isArray(tables) ? tables.map((t: any) => ({
          name: t.name,
          type: 'table',
          children: [],
        })) : [],
      }];

      setSchema(schemaTree);
    } catch (error) {
      console.error('Failed to load schema:', error);
      // Mock schema fallback
      setSchema([{
        name: connection.context,
        type: 'context',
        children: [
          {
            name: 'datacatalogs',
            type: 'table',
            children: [
              { name: 'id', type: 'column', dataType: 'INTEGER' },
              { name: 'name', type: 'column', dataType: 'TEXT' },
              { name: 'description', type: 'column', dataType: 'TEXT' },
            ],
          },
        ],
      }]);
    } finally {
      setLoadingSchema(false);
    }
  };

  const loadHistory = async () => {
    const saved = localStorage.getItem('queryWorkbench_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved history:', e);
      }
    }
  };

  // ⭐ PHASE 3: MAIN EXECUTE QUERY WITH LOAD BALANCING
  const executeQuery = useCallback(async () => {
    if (!query.trim() || isExecuting) return;

    setIsExecuting(true);
    setResult(null);

    const startTime = Date.now();

    try {
      // ✅ PHASE 3: Use load-balanced URL (distributes queries across healthy nodes)
      const endpoint = await buildDynamicApiUrl(`/${connection.context}/command`, 'round-robin');

      if (!endpoint) {
        throw new Error('No healthy OptimusDB nodes available');
      }

      console.log(`✅ Executing query on: ${endpoint}`); // Shows which node handled it

      // Build request matching exact API format
      let requestBody: any;

      if (connection.queryMode === 'sql') {
        // SQL Mode - use sqldml command
        requestBody = {
          method: {
            argcnt: 2,
            cmd: 'sqldml'
          },
          args: ['query', 'execute'],
          dstype: 'dsswres',
          sqldml: query,  // lowercase!
          graph_traversal: [{}],
          criteria: []
        };
      } else {
        // CRUD Mode - use query command with criteria
        let criteriaObj;
        try {
          criteriaObj = JSON.parse(query);
        } catch (e) {
          throw new Error('Invalid JSON criteria. Please provide valid JSON object.');
        }

        requestBody = {
          method: {
            argcnt: 2,
            cmd: 'query'
          },
          args: ['query', 'execute'],
          dstype: 'dsswres',
          sqlselect: 'dummysql',
          graph_traversal: [{}],
          criteria: [criteriaObj]
        };
      }

      const response = await axios.post(endpoint, requestBody, {
        timeout: 30000,
      });

      // Extract data from response
      const data = response.data.data || response.data;

      const isSuccess = response.data.status === 200 ||
        response.data.status === 'success' ||
        !response.data.error;

      // ✅ PHASE 3: Extract node info from URL
      const executedOnNode = endpoint.includes('localhost')
        ? endpoint.match(/localhost:(\d+)/)?.[0] || 'unknown'
        : endpoint.match(/optimusdb(\d+)/)?.[0] || endpoint.split('/')[1] || 'unknown';

      const queryResult: QueryResult = {
        success: isSuccess,
        columns: extractColumns(data),
        rows: extractRows(data),
        rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0),
        executionTimeMs: Date.now() - startTime,
        error: response.data.error || response.data.message || (isSuccess ? undefined : 'Query failed'),
        operation: connection.queryMode === 'crud' ? 'QUERY' : 'SQL',
        executedOnNode, // ✅ PHASE 3: Track which node handled the query
      };

      console.log(`✅ Query completed on ${executedOnNode} in ${queryResult.executionTimeMs}ms`);

      setResult(queryResult);

      // Add to history
      if (queryResult.success) {
        const historyItem: QueryHistoryItem = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          query: query,
          timestamp: new Date().toISOString(),
          executionTimeMs: queryResult.executionTimeMs,
          rowCount: queryResult.rowCount,
          favorite: false,
          queryMode: connection.queryMode,
        };
        const newHistory = [historyItem, ...history].slice(0, 100);
        setHistory(newHistory);
        localStorage.setItem('queryWorkbench_history', JSON.stringify(newHistory));
      }
    } catch (error: any) {
      console.error('Query execution error:', error);
      setResult({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Query execution failed.',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [query, connection, history]); // ✅ PHASE 3: Removed settings from dependencies

  // ===========================================================================
  // UI Event Handlers
  // ===========================================================================

  const handleLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleBottomResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        setLeftPanelWidth(Math.max(200, Math.min(600, e.clientX)));
      }
      if (isResizingBottom) {
        setBottomPanelHeight(Math.max(150, Math.min(600, window.innerHeight - e.clientY - 60)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingBottom(false);
    };

    if (isResizingLeft || isResizingBottom) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingLeft ? 'ew-resize' : 'ns-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingLeft, isResizingBottom]);

  const toggleFavorite = useCallback((id: string) => {
    const newHistory = history.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    setHistory(newHistory);
    localStorage.setItem('queryWorkbench_history', JSON.stringify(newHistory));
  }, [history]);

  const loadFromHistory = useCallback((historyItem: QueryHistoryItem) => {
    setQuery(historyItem.query);
    setConnection(prev => ({ ...prev, queryMode: historyItem.queryMode }));
    setShowHistory(false);
  }, []);

  const exportResults = useCallback((format: 'csv' | 'json') => {
    if (!result || !result.success) return;

    if (format === 'csv') {
      const csv = [
        result.columns.join(','),
        ...result.rows.map(row => row.map(cell => {
          if (cell === null) return 'NULL';
          const str = String(cell);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const data = result.rows.map(row => {
        const obj: any = {};
        result.columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [result]);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <DocumentTitle title="Query Workbench - OptimusDB">
      <div className="query-workbench-page">
        <div className="workbench-toolbar">
          <div className="toolbar-left">
            <h1 className="workbench-title">🔍 Query Workbench</h1>

            <div className="mode-selector">
              <button
                className={`mode-btn ${connection.queryMode === 'sql' ? 'active' : ''}`}
                onClick={() => setConnection(prev => ({ ...prev, queryMode: 'sql' }))}
                title="SQL Mode"
              >
                💾 SQL
              </button>
              <button
                className={`mode-btn ${connection.queryMode === 'crud' ? 'active' : ''}`}
                onClick={() => setConnection(prev => ({ ...prev, queryMode: 'crud' }))}
                title="Criteria Query Mode"
              >
                📦 Criteria
              </button>
            </div>

            <ConnectionPanel connection={connection} onChange={setConnection} />
          </div>

          <div className="toolbar-right">
            <button
              className="btn btn-default btn-sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              📋 History {history.length > 0 && `(${history.length})`}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={executeQuery}
              disabled={isExecuting || !query.trim()}
            >
              {isExecuting ? '⟳ Executing...' : '▶️ Execute (F5)'}
            </button>
          </div>
        </div>

        <div className="workbench-content">
          {connection.queryMode === 'sql' && (
            <>
              <div className="left-panel" style={{ width: `${leftPanelWidth}px` }}>
                <SchemaExplorer
                  schema={schema}
                  loading={loadingSchema}
                  onRefresh={loadSchema}
                  onInsert={(text) => setQuery(query + '\n' + text)}
                />
              </div>
              <div className="resizer resizer-vertical" onMouseDown={handleLeftResize} />
            </>
          )}

          <div className="center-bottom-container">
            <div className="center-panel">
              <QueryEditor
                query={query}
                onChange={setQuery}
                onExecute={executeQuery}
                schema={schema}
                theme={settings.theme}
                autoComplete={settings.autoComplete}
                readOnly={connection.readOnly}
                queryMode={connection.queryMode}
              />
            </div>

            <div className="resizer resizer-horizontal" onMouseDown={handleBottomResize} />

            <div className="bottom-panel" style={{ height: `${bottomPanelHeight}px` }}>
              <ResultPane
                result={result}
                isExecuting={isExecuting}
                onExport={exportResults}
                queryMode={connection.queryMode}
              />
            </div>
          </div>
        </div>

        {showHistory && (
          <HistoryDrawer
            history={history}
            onClose={() => setShowHistory(false)}
            onSelect={loadFromHistory}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {!connection.readOnly && (
          <div className="warning-banner">
            ⚠️ <strong>Write Mode Enabled</strong>
          </div>
        )}

        <div className="mode-info-banner">
          {connection.queryMode === 'sql' ? (
            <>💾 <strong>SQL Mode</strong> - cmd: sqldml</>
          ) : (
            <>📦 <strong>Criteria Mode</strong> - cmd: query</>
          )}
          {/* ✅ PHASE 3: Show which node handled last query */}
          {result?.executedOnNode && (
            <>
              {' | '}
              <span className="executed-on-node">
                Executed on: <strong>{result.executedOnNode}</strong>
              </span>
            </>
          )}
        </div>
      </div>
    </DocumentTitle>
  );
};

export default QueryWorkbenchPage;

// ==============================================================================
// PHASE 3 CHANGES SUMMARY
// ==============================================================================
// 1. ✅ Added import: import { buildDynamicApiUrl, buildApiUrl } from 'config/apiConfig';
// 2. ✅ Removed: apiBaseUrl from settings (now dynamic)
// 3. ✅ Updated loadSchema(): Uses buildApiUrl() for node 1
// 4. ✅ Updated executeQuery(): Uses buildDynamicApiUrl() with round-robin load balancing
// 5. ✅ Added: executedOnNode field to QueryResult interface
// 6. ✅ Added: Console logs showing which node handled each query
// 7. ✅ Added: UI display showing executed node in mode-info-banner
// 8. ✅ Updated: executeQuery dependencies (removed settings)
//
// RESULT:
// - Docker Desktop: Distributes queries across localhost:18001, 18002, 18003, etc.
// - K3s: Distributes queries across /swarmkb, /optimusdb2/swarmkb, /optimusdb3/swarmkb
// - LOAD BALANCING: Each query goes to a different healthy node (round-robin)
// - All existing features preserved (SQL/CRUD modes, schema explorer, history, export)
//
// LOAD BALANCING EXAMPLE:
// Query 1 → Node 1 (localhost:18001 or /swarmkb)
// Query 2 → Node 2 (localhost:18002 or /optimusdb2/swarmkb)
// Query 3 → Node 3 (localhost:18003 or /optimusdb3/swarmkb)
// Query 4 → Node 1 (cycles back)
// ==============================================================================
