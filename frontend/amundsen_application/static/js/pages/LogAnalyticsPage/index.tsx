// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/index.tsx
// CORRECTED TO MATCH IMAGE 2 LAYOUT EXACTLY
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
import LogFilters from './components/LogFilters';
import LogViewer from './components/LogViewer';
import LogStatistics from './components/LogStatistics';
import LogCharts from './components/LogCharts';
import LogDetailsModal from './components/LogDetailsModal';
import LogPagination from './components/LogPagination';
import './styles.scss';

// Types (same as before)
export type LogType =
  | 'DEBUG' | 'INFO' | 'QUERY' | 'LINEAGE' | 'MESH' | 'REPLICATION'
  | 'ELECTION' | 'CACHE' | 'AI' | 'METRICS' | 'PROC' | 'DISCOVERY' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  nodeId: string;
  source?: string;
  message: string;
  details?: string;
  traceId?: string;
  userId?: string;
  duration?: number;
  error?: string;
}

export interface LogStatistics {
  totalLogs: number;
  logsPerMinute: number;
  errorRate: number;
  errorCount: number;
  warningCount: number;
  byType: Record<LogType, number>;
  byNode: Record<string, number>;
  peakActivity: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface LogFiltersState {
  types: LogType[];
  nodeId: string;
  startTime: string;
  endTime: string;
  searchTerm: string;
}

export const LOG_TYPE_COLORS: Record<LogType, string> = {
  DEBUG: '#6c757d', INFO: '#0dcaf0', QUERY: '#6f42c1', LINEAGE: '#fd7e14',
  MESH: '#20c997', REPLICATION: '#0d6efd', ELECTION: '#ffc107', CACHE: '#17a2b8',
  AI: '#e83e8c', METRICS: '#6610f2', PROC: '#6c757d', DISCOVERY: '#198754',
  WARN: '#ffc107', ERROR: '#dc3545',
};

const LogAnalyticsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval] = useState<number>(60);
  const [discoveredNodeCount, setDiscoveredNodeCount] = useState<number>(0);

  const [filters, setFilters] = useState<LogFiltersState>({
    types: [],
    nodeId: 'all',
    startTime: '',
    endTime: '',
    searchTerm: '',
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [logsPerPage, setLogsPerPage] = useState<number>(25);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getQueryDateTime = (): { date: string; hour: string } => {
    const now = new Date();
    now.setHours(now.getHours() - 2);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    return { date: `${year}-${month}-${day}`, hour: hour };
  };

  const parseOptimusDBLog = (rawLog: any, nodeId: string): LogEntry | null => {
    try {
      return {
        id: rawLog.id || `${nodeId}-${rawLog.timestamp || Date.now()}`,
        timestamp: rawLog.timestamp || new Date().toISOString(),
        type: (rawLog.type || rawLog.level || 'INFO') as LogType,
        nodeId: nodeId,
        source: rawLog.source || rawLog.file || '',
        message: rawLog.message || rawLog.msg || 'No message',
        details: rawLog.details || rawLog.error || rawLog.stack || '',
        traceId: rawLog.traceId || rawLog.trace_id,
        userId: rawLog.userId || rawLog.user_id,
        duration: rawLog.duration,
        error: rawLog.error,
      };
    } catch (err) {
      console.error('Failed to parse log:', rawLog, err);
      return null;
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { date, hour } = getQueryDateTime();
      const nodes = await getAvailableNodes();
      setDiscoveredNodeCount(nodes.length);

      const allLogs: LogEntry[] = [];
      const fetchPromises: Promise<LogEntry[]>[] = [];

      for (const node of nodes) {
        const nodeId = `optimusdb${node.id}`;
        const baseUrl = buildApiUrl('optimusdb', '/swarmkb/log', node.id);
        const url = `${baseUrl}?date=${date}&hour=${hour}`;

        const fetchPromise = fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
          .then(async (response): Promise<LogEntry[]> => {
            if (!response.ok) return [];
            const data = await response.json();
            if (Array.isArray(data)) {
              return data.map((rawLog: any) => parseOptimusDBLog(rawLog, nodeId))
                .filter((log): log is LogEntry => log !== null);
            } else if (data.logs && Array.isArray(data.logs)) {
              return data.logs.map((rawLog: any) => parseOptimusDBLog(rawLog, nodeId))
                .filter((log): log is LogEntry => log !== null);
            }
            return [];
          })
          .catch(() => []);

        fetchPromises.push(fetchPromise);
      }

      const results = await Promise.all(fetchPromises);
      for (const nodeLogs of results) {
        allLogs.push(...nodeLogs);
      }

      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (allLogs.length === 0) {
        const mockLogs = generateMockLogs(nodes.length);
        setLogs(mockLogs);
        setFilteredLogs(mockLogs);
        setError(`No logs available from OptimusDB (${nodes.length} nodes). Showing mock data.`);
      } else {
        setLogs(allLogs);
        setFilteredLogs(allLogs);
      }
    } catch (err: any) {
      setError(`Failed to fetch logs: ${err.message}`);
      const mockLogs = generateMockLogs(discoveredNodeCount || 8);
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  }, [discoveredNodeCount]);

  const generateMockLogs = (nodeCount: number = 8): LogEntry[] => {
    const types: LogType[] = ['DEBUG', 'INFO', 'QUERY', 'LINEAGE', 'MESH', 'REPLICATION',
      'ELECTION', 'CACHE', 'AI', 'METRICS', 'PROC', 'DISCOVERY', 'WARN', 'ERROR'];
    const nodes = Array.from({ length: nodeCount }, (_, i) => `optimusdb${i + 1}`);
    const messages: Record<LogType, string[]> = {
      DEBUG: ['GossipSub heartbeat', 'Cache lookup'],
      INFO: ['HTTP request received', 'Node started'],
      QUERY: ['SQL query executed', 'Query aggregated'],
      LINEAGE: ['Lineage tracked', 'Transformation recorded'],
      MESH: ['GRAFT: Peer joined', 'PRUNE: Peer left'],
      REPLICATION: ['OrbitDB sync', 'Replicated entries'],
      ELECTION: ['Leader elected', 'Vote received'],
      CACHE: ['Cache hit', 'Cache invalidated'],
      AI: ['Enrichment completed', 'Quality score calculated'],
      METRICS: ['Metrics collected', 'Health check passed'],
      PROC: ['Task started', 'Cleanup completed'],
      DISCOVERY: ['Peer found', 'DHT lookup'],
      WARN: ['Slow query', 'High memory'],
      ERROR: ['Connection failed', 'Query error'],
    };

    const mockLogs: LogEntry[] = [];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const node = nodes[Math.floor(Math.random() * nodes.length)];
      const messageList = messages[type];
      const message = messageList[Math.floor(Math.random() * messageList.length)];

      mockLogs.push({
        id: `mock-${i}`,
        timestamp: new Date(now - i * 60000).toISOString(),
        type: type,
        nodeId: node,
        source: `main.go:${Math.floor(Math.random() * 500) + 100}`,
        message: message,
        duration: type === 'QUERY' ? Math.floor(Math.random() * 500) : undefined,
      });
    }
    return mockLogs;
  };

  const applyFilters = useCallback(() => {
    let filtered = [...logs];
    if (filters.types.length > 0) {
      filtered = filtered.filter(log => filters.types.includes(log.type));
    }
    if (filters.nodeId !== 'all') {
      filtered = filtered.filter(log => log.nodeId === filters.nodeId);
    }
    if (filters.startTime) {
      const startTime = new Date(filters.startTime).getTime();
      filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= startTime);
    }
    if (filters.endTime) {
      const endTime = new Date(filters.endTime).getTime();
      filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= endTime);
    }
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.nodeId.toLowerCase().includes(searchLower) ||
        (log.details && log.details.toLowerCase().includes(searchLower))
      );
    }
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, filters]);

  const calculateStatistics = useCallback((): LogStatistics => {
    if (filteredLogs.length === 0) {
      return {
        totalLogs: 0, logsPerMinute: 0, errorRate: 0, errorCount: 0, warningCount: 0,
        byType: {} as Record<LogType, number>, byNode: {}, peakActivity: 0, healthStatus: 'healthy',
      };
    }

    const byType: Record<LogType, number> = {
      DEBUG: 0, INFO: 0, QUERY: 0, LINEAGE: 0, MESH: 0, REPLICATION: 0,
      ELECTION: 0, CACHE: 0, AI: 0, METRICS: 0, PROC: 0, DISCOVERY: 0, WARN: 0, ERROR: 0,
    };
    filteredLogs.forEach(log => { byType[log.type] = (byType[log.type] || 0) + 1; });

    const byNode: Record<string, number> = {};
    filteredLogs.forEach(log => { byNode[log.nodeId] = (byNode[log.nodeId] || 0) + 1; });

    const timestamps = filteredLogs.map(log => new Date(log.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const durationMinutes = (maxTime - minTime) / (1000 * 60);
    const logsPerMinute = durationMinutes > 0 ? filteredLogs.length / durationMinutes : 0;

    // Separate error and warning counts
    const errorCount = byType.ERROR || 0;
    const warningCount = byType.WARN || 0;
    const combinedIssuesCount = errorCount + warningCount;

    // Error rate includes both errors and warnings
    const errorRate = (combinedIssuesCount / filteredLogs.length) * 100;

    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorCount > 10 || errorRate > 10) {
      healthStatus = 'critical';
    } else if (errorRate > 5 || warningCount > 10) {
      healthStatus = 'warning';
    }

    return {
      totalLogs: filteredLogs.length,
      logsPerMinute: Math.round(logsPerMinute * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      errorCount: errorCount,
      warningCount: warningCount,
      byType, byNode,
      peakActivity: Math.max(...Object.values(byNode)),
      healthStatus,
    };
  }, [filteredLogs]);

  const statistics = calculateStatistics();

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { applyFilters(); }, [applyFilters]);
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(() => fetchLogs(), refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchLogs]);

  const handleFilterChange = (newFilters: Partial<LogFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => { fetchLogs(); };

  const handleExport = (format: 'csv' | 'json') => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'json') {
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimusdb-logs-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Timestamp', 'Type', 'Node', 'Source', 'Message', 'Details'];
      const rows = filteredLogs.map(log => [
        log.timestamp, log.type, log.nodeId, log.source || '', log.message, log.details || '',
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimusdb-logs-${timestamp}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleLogClick = (log: LogEntry) => { setSelectedLog(log); };
  const handleCloseModal = () => { setSelectedLog(null); };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleLogsPerPageChange = (newLogsPerPage: number) => {
    setLogsPerPage(newLogsPerPage);
    setCurrentPage(1);
  };

  // ===========================================================================
  // RENDER - MATCHING IMAGE 2 EXACTLY
  // ===========================================================================

  return (
    <div className="log-analytics-page">
      {/* HEADER - PURPLE GRADIENT (MATCHING IMAGE 2) */}
      <div className="analytics-header">
        <div className="header-left">
          <h1 className="analytics-title">
            📊 Log Analytics Dashboard
          </h1>
          <div className="subtitle">
            <span className="live-badge">● Live</span>
            <span>Distributed log aggregation across {discoveredNodeCount} nodes</span>
            <span>•</span>
            <span>Last updated: just now</span>
          </div>
        </div>

        <div className="header-right">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh {refreshInterval}s</span>
          </label>

          <button className="btn" onClick={handleRefresh} disabled={loading}>
            🔄 Refresh
          </button>

          <button className="btn btn-csv" onClick={() => handleExport('csv')} disabled={loading}>
            📥 CSV
          </button>

          <button className="btn btn-json" onClick={() => handleExport('json')} disabled={loading}>
            📥 JSON
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS (4 CARDS - MATCHING IMAGE 2) */}
      <LogStatistics statistics={statistics} filters={filters} />

      {/* CHARTS (3-PANEL LAYOUT - MATCHING IMAGE 2) */}
      <LogCharts statistics={statistics} filteredLogs={filteredLogs} />

      {/* MAIN CONTENT */}
      <div className="log-content">
        <LogFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          availableNodes={Array.from(new Set(logs.map(log => log.nodeId)))}
        />

        <div className="log-viewer-wrapper">
          <LogViewer logs={paginatedLogs} onLogClick={handleLogClick} />
          <LogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            logsPerPage={logsPerPage}
            totalLogs={filteredLogs.length}
            onPageChange={handlePageChange}
            onLogsPerPageChange={handleLogsPerPageChange}
          />
        </div>
      </div>

      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={handleCloseModal}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

export default LogAnalyticsPage;
