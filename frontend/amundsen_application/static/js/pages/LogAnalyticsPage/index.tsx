// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/index.tsx
// ==============================================================================
// OptimusDB Log Analytics Dashboard
// Real-time log aggregation, filtering, categorization, and visualization
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';

import LogFilters from './components/LogFilters';
import LogViewer from './components/LogViewer';
import LogStatistics from './components/LogStatistics';
import LogCharts from './components/LogCharts';
import LogDetailsModal from './components/LogDetailsModal';

import './styles.scss';

// ==============================================================================
// TypeScript Interfaces
// ==============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogCategory =
  | 'QUERY'
  | 'PEER'
  | 'ELECTION'
  | 'DATABASE'
  | 'NETWORK'
  | 'ORBITDB'
  | 'ERROR'
  | 'SYSTEM'
  | 'OTHER';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  nodeId: string;
  category: LogCategory;
  message: string;
  details?: any;
  traceId?: string;
  duration?: number;
}

export interface LogFilters {
  levels: LogLevel[];
  nodes: string[];
  categories: LogCategory[];
  timeRange: {
    start: Date;
    end: Date;
  };
  searchTerm: string;
}

export interface LogStatistics {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  byNode: Record<string, number>;
  byCategory: Record<LogCategory, number>;
  errorRate: number;
  avgLogsPerMinute: number;
}

// ==============================================================================
// Helper Functions
// ==============================================================================

function parseLogEntry(rawLog: any, nodeId: string): LogEntry {
  // Parse log message to extract structured information
  const timestamp = new Date(rawLog.timestamp || Date.now());
  const message = rawLog.message || rawLog.msg || String(rawLog);

  // Determine log level
  let level: LogLevel = 'INFO';

  if (message.includes('ERROR') || rawLog.level === 'ERROR') level = 'ERROR';
  else if (message.includes('WARN') || rawLog.level === 'WARN') level = 'WARN';
  else if (message.includes('DEBUG') || rawLog.level === 'DEBUG') {
    level = 'DEBUG';
  } else if (message.includes('FATAL') || rawLog.level === 'FATAL') {
    level = 'FATAL';
  }

  // Determine category based on message content
  let category: LogCategory = 'OTHER';

  if (
    message.includes('query') ||
    message.includes('Query') ||
    message.includes('SQL')
  ) {
    category = 'QUERY';
  } else if (
    message.includes('peer') ||
    message.includes('Peer') ||
    message.includes('connected') ||
    message.includes('discovered')
  ) {
    category = 'PEER';
  } else if (
    message.includes('election') ||
    message.includes('leader') ||
    message.includes('Leader') ||
    message.includes('reputation')
  ) {
    category = 'ELECTION';
  } else if (
    message.includes('database') ||
    message.includes('SQLite') ||
    message.includes('DB')
  ) {
    category = 'DATABASE';
  } else if (
    message.includes('network') ||
    message.includes('libp2p') ||
    message.includes('gossipsub')
  ) {
    category = 'NETWORK';
  } else if (message.includes('OrbitDB') || message.includes('IPFS')) {
    category = 'ORBITDB';
  } else if (level === 'ERROR' || level === 'FATAL') {
    category = 'ERROR';
  } else if (
    message.includes('system') ||
    message.includes('startup') ||
    message.includes('shutdown')
  ) {
    category = 'SYSTEM';
  }

  // Extract trace ID if present
  const traceMatch = message.match(/trace[_=]([a-zA-Z0-9-]+)/i);
  const traceId = traceMatch ? traceMatch[1] : undefined;

  // Extract duration if present
  const durationMatch = message.match(/(\d+)ms/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : undefined;

  return {
    id: `${nodeId}_${timestamp.getTime()}_${Math.random()}`,
    timestamp,
    level,
    nodeId,
    category,
    message,
    details: rawLog,
    traceId,
    duration,
  };
}

function calculateStatistics(logs: LogEntry[]): LogStatistics {
  const stats: LogStatistics = {
    totalLogs: logs.length,
    byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 },
    byNode: {},
    byCategory: {
      QUERY: 0,
      PEER: 0,
      ELECTION: 0,
      DATABASE: 0,
      NETWORK: 0,
      ORBITDB: 0,
      ERROR: 0,
      SYSTEM: 0,
      OTHER: 0,
    },
    errorRate: 0,
    avgLogsPerMinute: 0,
  };

  if (logs.length === 0) return stats;

  logs.forEach((log) => {
    stats.byLevel[log.level]++;
    stats.byNode[log.nodeId] = (stats.byNode[log.nodeId] || 0) + 1;
    stats.byCategory[log.category]++;
  });

  const errorCount = stats.byLevel.ERROR + stats.byLevel.FATAL;

  stats.errorRate = (errorCount / logs.length) * 100;

  // Calculate logs per minute
  if (logs.length > 1) {
    const timeSpan =
      logs[0].timestamp.getTime() - logs[logs.length - 1].timestamp.getTime();

    stats.avgLogsPerMinute = (logs.length / timeSpan) * 60000;
  }

  return stats;
}

// ==============================================================================
// Main Log Analytics Component
// ==============================================================================

const LogAnalyticsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds

  const [filters, setFilters] = useState<LogFilters>({
    levels: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
    nodes: [],
    categories: [
      'QUERY',
      'PEER',
      'ELECTION',
      'DATABASE',
      'NETWORK',
      'ORBITDB',
      'ERROR',
      'SYSTEM',
      'OTHER',
    ],
    timeRange: {
      start: new Date(Date.now() - 3600000), // Last hour
      end: new Date(),
    },
    searchTerm: '',
  });

  const [settings, setSettings] = useState({
    apiBaseUrl: 'http://localhost:18001',
    context: 'swarmkb',
    nodes: [
      { id: 'node-1', port: 18001 },
      { id: 'node-2', port: 18002 },
      { id: 'node-3', port: 18003 },
      { id: 'node-4', port: 18004 },
      { id: 'node-5', port: 18005 },
      { id: 'node-6', port: 18006 },
      { id: 'node-7', port: 18007 },
      { id: 'node-8', port: 18008 },
    ],
  });

  // ===========================================================================
  // Fetch Logs from All Nodes
  // ===========================================================================

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = now.getHours().toString().padStart(2, '0');

      // Fetch logs from all nodes in parallel
      const logsPromises = settings.nodes.map(async (node) => {
        try {
          const response = await axios.get(
            `http://localhost:${node.port}/${settings.context}/log`,
            {
              params: { date, hour },
              timeout: 5000,
            }
          );

          const rawLogs = response.data.logs || response.data || [];

          return rawLogs.map((log: any) => parseLogEntry(log, node.id));
        } catch (error) {
          console.error(`Failed to fetch logs from ${node.id}:`, error);

          return [];
        }
      });

      const logsArrays = await Promise.all(logsPromises);
      const allLogs = logsArrays.flat();

      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // ===========================================================================
  // Auto-refresh Effect
  // ===========================================================================

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoRefresh, refreshInterval]);

  // ===========================================================================
  // Filter Logs
  // ===========================================================================

  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (filters.levels.length < 5) {
      filtered = filtered.filter((log) => filters.levels.includes(log.level));
    }

    // Filter by node
    if (filters.nodes.length > 0) {
      filtered = filtered.filter((log) => filters.nodes.includes(log.nodeId));
    }

    // Filter by category
    if (filters.categories.length < 9) {
      filtered = filtered.filter((log) =>
        filters.categories.includes(log.category)
      );
    }

    // Filter by time range
    filtered = filtered.filter(
      (log) =>
        log.timestamp >= filters.timeRange.start &&
        log.timestamp <= filters.timeRange.end
    );

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();

      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.nodeId.toLowerCase().includes(searchLower) ||
          (log.traceId && log.traceId.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  // ===========================================================================
  // Calculate Statistics
  // ===========================================================================

  const statistics = useMemo(
    () => calculateStatistics(filteredLogs),
    [filteredLogs]
  );

  // ===========================================================================
  // Export Functions
  // ===========================================================================

  const exportLogs = useCallback(
    (format: 'csv' | 'json') => {
      if (format === 'csv') {
        const headers = [
          'Timestamp',
          'Level',
          'Node',
          'Category',
          'Message',
          'TraceID',
          'Duration',
        ];
        const rows = filteredLogs.map((log) => [
          log.timestamp.toISOString(),
          log.level,
          log.nodeId,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.traceId || '',
          log.duration || '',
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `optimusdb_logs_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(filteredLogs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `optimusdb_logs_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [filteredLogs]
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <DocumentTitle title="Log Analytics - OptimusDB Agents">
      <div className="log-analytics-page">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-left">
            <h1 className="analytics-title">📋 Log Analytics</h1>
            <span className="subtitle">
              Distributed log aggregation across {settings.nodes.length} nodes
            </span>
          </div>
          <div className="header-right">
            <label className="auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
            <button
              className="btn btn-sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? '⟳ Loading...' : '🔄 Refresh'}
            </button>
            <button className="btn btn-sm" onClick={() => exportLogs('csv')}>
              📥 CSV
            </button>
            <button className="btn btn-sm" onClick={() => exportLogs('json')}>
              📥 JSON
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <LogStatistics statistics={statistics} />

        {/* Charts */}
        <LogCharts logs={filteredLogs} statistics={statistics} />

        {/* Filters */}
        <LogFilters
          filters={filters}
          onChange={setFilters}
          availableNodes={settings.nodes.map((n) => n.id)}
        />

        {/* Log Viewer */}
        <LogViewer
          logs={filteredLogs}
          loading={loading}
          onSelectLog={setSelectedLog}
        />

        {/* Log Details Modal */}
        {selectedLog && (
          <LogDetailsModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </div>
    </DocumentTitle>
  );
};

export default LogAnalyticsPage;
