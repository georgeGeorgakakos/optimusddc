// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/index.tsx
// PHASE 3 REFINED VERSION WITH DYNAMIC API CONFIG
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig'; // ← PHASE 3 IMPORT
import LogFilters from './components/LogFilters';
import LogViewer from './components/LogViewer';
import LogStatistics from './components/LogStatistics';
import LogCharts from './components/LogCharts';
import LogDetailsModal from './components/LogDetailsModal';
import LogPagination from './components/LogPagination';
import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogCategory =
  | 'Query'
  | 'Peer'
  | 'Election'
  | 'Database'
  | 'Network'
  | 'OrbitDB'
  | 'System'
  | 'API'
  | 'Other';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  nodeId: string;
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
  fatalCount: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  byNode: Record<string, number>;
  peakActivity: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface LogFiltersState {
  level: LogLevel | 'ALL';
  category: LogCategory | 'ALL';
  nodeId: string;
  startTime: string;
  endTime: string;
  searchTerm: string;
}

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const LogAnalyticsPage: React.FC = () => {
  // State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [discoveredNodeCount, setDiscoveredNodeCount] = useState<number>(0); // ✅ PHASE 3: Track discovered nodes

  // Filters
  const [filters, setFilters] = useState<LogFiltersState>({
    level: 'ALL',
    category: 'ALL',
    nodeId: 'all',
    startTime: '',
    endTime: '',
    searchTerm: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [logsPerPage, setLogsPerPage] = useState<number>(25);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // ===========================================================================
  // HELPER: Get date and hour (2 hours before current time)
  // ===========================================================================

  const getQueryDateTime = (): { date: string; hour: string } => {
    const now = new Date();
    // Subtract 2 hours
    now.setHours(now.getHours() - 2);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');

    return {
      date: `${year}-${month}-${day}`,
      hour: hour,
    };
  };

  // ===========================================================================
  // HELPER: Parse OptimusDB log format
  // ===========================================================================

  const parseOptimusDBLog = (rawLog: any, nodeId: string): LogEntry | null => {
    try {
      // OptimusDB log format may vary, adjust as needed
      // Assuming format like: { timestamp, level, category, message, ... }

      return {
        id: rawLog.id || `${nodeId}-${rawLog.timestamp || Date.now()}`,
        timestamp: rawLog.timestamp || new Date().toISOString(),
        level: (rawLog.level || 'INFO') as LogLevel,
        category: (rawLog.category || 'System') as LogCategory,
        nodeId: nodeId,
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

  // ===========================================================================
  // DATA FETCHING - PHASE 3 UPDATED WITH DYNAMIC NODES
  // ===========================================================================

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { date, hour } = getQueryDateTime();
      console.log(`Fetching logs for date=${date}, hour=${hour} (2 hours before current time)`);

      // ✅ PHASE 3: Dynamically discover all available nodes
      const nodes = await getAvailableNodes();
      setDiscoveredNodeCount(nodes.length);
      console.log(`✅ Discovered ${nodes.length} OptimusDB nodes`);

      const allLogs: LogEntry[] = [];
      const fetchPromises: Promise<LogEntry[]>[] = [];

      // ✅ PHASE 3: Fetch from all discovered nodes (not hardcoded 8)
      for (const node of nodes) {
        const nodeId = `optimusdb${node.id}`;

        // ✅ PHASE 3: Build dynamic URL that works in Docker + K3s
        const baseUrl = buildApiUrl('optimusdb', '/swarmkb/log', node.id);
        const url = `${baseUrl}?date=${date}&hour=${hour}`;

        console.log(`Fetching from ${nodeId}: ${url}`);

        const fetchPromise = fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then(async (response): Promise<LogEntry[]> => {
            if (!response.ok) {
              console.warn(`${nodeId} returned status ${response.status}`);
              return [];
            }

            const data = await response.json();
            console.log(`${nodeId} returned ${Array.isArray(data) ? data.length : 0} logs`);

            // Parse logs from this node
            if (Array.isArray(data)) {
              return data
                .map((rawLog: any) => parseOptimusDBLog(rawLog, nodeId))
                .filter((log): log is LogEntry => log !== null);
            } else if (data.logs && Array.isArray(data.logs)) {
              // Alternative format: { logs: [...] }
              return data.logs
                .map((rawLog: any) => parseOptimusDBLog(rawLog, nodeId))
                .filter((log): log is LogEntry => log !== null);
            } else {
              console.warn(`${nodeId} returned unexpected format:`, data);
              return [];
            }
          })
          .catch((err): LogEntry[] => {
            console.error(`Failed to fetch from ${nodeId}:`, err);
            return [];
          });

        fetchPromises.push(fetchPromise);
      }

      // Wait for all nodes to respond
      const results = await Promise.all(fetchPromises);

      // Flatten and combine logs from all nodes
      for (const nodeLogs of results) {
        allLogs.push(...nodeLogs);
      }

      console.log(`Total logs fetched from all nodes: ${allLogs.length}`);

      // Sort by timestamp (newest first)
      allLogs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // If no logs found, generate mock data for demo
      if (allLogs.length === 0) {
        console.log('No logs found from OptimusDB nodes, generating mock data for demo...');
        const mockLogs = generateMockLogs(nodes.length); // ✅ PHASE 3: Pass node count to mock generator
        setLogs(mockLogs);
        setFilteredLogs(mockLogs);
        setError(`No logs available from OptimusDB (${nodes.length} nodes checked). Showing mock data for demo.`);
      } else {
        setLogs(allLogs);
        setFilteredLogs(allLogs);
        setError(null);
      }

    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(`Failed to fetch logs: ${err.message}. Using mock data for demo.`);

      // Fallback to mock data with dynamic node count
      const mockLogs = generateMockLogs(discoveredNodeCount || 8);
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  }, [discoveredNodeCount]); // ✅ PHASE 3: Add discoveredNodeCount to dependencies

  // ===========================================================================
  // MOCK DATA GENERATOR - PHASE 3 UPDATED TO ACCEPT NODE COUNT
  // ===========================================================================

  const generateMockLogs = (nodeCount: number = 8): LogEntry[] => {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const categories: LogCategory[] = [
      'Query', 'Peer', 'Election', 'Database', 'Network', 'OrbitDB', 'System', 'API'
    ];

    // ✅ PHASE 3: Generate node array based on discovered count
    const nodes = Array.from({ length: nodeCount }, (_, i) => `optimusdb${i + 1}`);

    const messages: Record<LogCategory, string[]> = {
      Query: [
        'Query executed successfully',
        'SQL query parsed',
        'Distributed query initiated',
        'Query results aggregated',
        'Query timeout occurred',
      ],
      Peer: [
        'Peer connection established',
        'Peer discovery completed',
        'Peer disconnected',
        'Gossipsub message received',
        'DHT lookup completed',
      ],
      Election: [
        'Leader election started',
        'Vote received from peer',
        'Became cluster leader',
        'Leader heartbeat sent',
        'Split-brain detected and resolved',
      ],
      Database: [
        'SQLite query executed',
        'OrbitDB sync completed',
        'Database transaction committed',
        'Index updated',
        'Cache invalidated',
      ],
      Network: [
        'LibP2P stream opened',
        'Connection to peer established',
        'Network latency measured',
        'Bandwidth usage recorded',
        'NAT traversal completed',
      ],
      OrbitDB: [
        'OrbitDB instance initialized',
        'Database replicated',
        'IPFS content added',
        'Document synchronized',
        'Conflict resolved',
      ],
      System: [
        'System startup completed',
        'Configuration loaded',
        'Health check passed',
        'Resource usage monitored',
        'Graceful shutdown initiated',
      ],
      API: [
        'REST API request received',
        'Authentication successful',
        'Rate limit checked',
        'Response sent to client',
        'CORS headers added',
      ],
      Other: [
        'General system message',
        'Unknown event occurred',
      ],
    };

    const mockLogs: LogEntry[] = [];
    const now = Date.now();

    // Generate 150 logs over the past 2 hours
    for (let i = 0; i < 150; i++) {
      const timestamp = new Date(now - Math.random() * 2 * 60 * 60 * 1000);
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const nodeId = nodes[Math.floor(Math.random() * nodes.length)];

      const categoryMessages = messages[category] || ['Log message'];
      const message = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];

      mockLogs.push({
        id: `mock-${i}`,
        timestamp: timestamp.toISOString(),
        level,
        category,
        nodeId,
        message,
        details: `Detailed information for ${message}`,
        traceId: `trace-${Math.random().toString(36).substring(2, 11)}`,
        duration: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : undefined,
      });
    }

    return mockLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // ===========================================================================
  // FILTERING LOGIC
  // ===========================================================================

  const applyFilters = useCallback(() => {
    let filtered = [...logs];

    // Filter by level
    if (filters.level !== 'ALL') {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    // Filter by category
    if (filters.category !== 'ALL') {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    // Filter by node
    if (filters.nodeId && filters.nodeId !== 'all') {
      filtered = filtered.filter(log => log.nodeId === filters.nodeId);
    }

    // Filter by time range
    if (filters.startTime) {
      const startTime = new Date(filters.startTime).getTime();
      filtered = filtered.filter(log =>
        new Date(log.timestamp).getTime() >= startTime
      );
    }

    if (filters.endTime) {
      const endTime = new Date(filters.endTime).getTime();
      filtered = filtered.filter(log =>
        new Date(log.timestamp).getTime() <= endTime
      );
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.nodeId.toLowerCase().includes(searchLower) ||
        (log.details && log.details.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [logs, filters]);

  // ===========================================================================
  // STATISTICS CALCULATION
  // ===========================================================================

  const calculateStatistics = useCallback((): LogStatistics => {
    if (filteredLogs.length === 0) {
      return {
        totalLogs: 0,
        logsPerMinute: 0,
        errorRate: 0,
        fatalCount: 0,
        byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 },
        byCategory: {},
        byNode: {},
        peakActivity: 0,
        healthStatus: 'healthy',
      };
    }

    // Count by level
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      FATAL: 0,
    };

    filteredLogs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    // Count by category
    const byCategory: Record<string, number> = {};
    filteredLogs.forEach(log => {
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    // Count by node
    const byNode: Record<string, number> = {};
    filteredLogs.forEach(log => {
      byNode[log.nodeId] = (byNode[log.nodeId] || 0) + 1;
    });

    // Calculate time-based metrics
    const timestamps = filteredLogs.map(log => new Date(log.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const durationMinutes = (maxTime - minTime) / (1000 * 60);
    const logsPerMinute = durationMinutes > 0 ? filteredLogs.length / durationMinutes : 0;

    // Calculate error rate
    const errorCount = (byLevel.ERROR || 0) + (byLevel.FATAL || 0);
    const errorRate = (errorCount / filteredLogs.length) * 100;

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (byLevel.FATAL > 0 || errorRate > 10) {
      healthStatus = 'critical';
    } else if (errorRate > 5 || byLevel.ERROR > 10) {
      healthStatus = 'warning';
    }

    return {
      totalLogs: filteredLogs.length,
      logsPerMinute: Math.round(logsPerMinute * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      fatalCount: byLevel.FATAL || 0,
      byLevel,
      byCategory,
      byNode,
      peakActivity: Math.max(...Object.values(byNode)),
      healthStatus,
    };
  }, [filteredLogs]);

  const statistics = calculateStatistics();

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Apply filters when logs or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      console.log('Auto-refreshing logs...');
      fetchLogs();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchLogs]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const handleFilterChange = (newFilters: Partial<LogFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const headers = ['Timestamp', 'Level', 'Category', 'Node', 'Message', 'Details'];
      const rows = filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.category,
        log.nodeId,
        log.message,
        log.details || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleLogClick = (log: LogEntry) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of log viewer smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogsPerPageChange = (newLogsPerPage: number) => {
    setLogsPerPage(newLogsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="log-analytics-page">
      {/* Header */}
      <div className="log-analytics-header">
        <div className="header-content">
          <h1>📋 Log Analytics Dashboard</h1>
          {/* ✅ PHASE 3: Show discovered node count */}
          <p>
            Distributed log aggregation across{' '}
            {discoveredNodeCount > 0 ? discoveredNodeCount : '...'} node
            {discoveredNodeCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="refresh-interval-select"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={120}>2m</option>
            <option value={300}>5m</option>
          </select>

          <button
            onClick={handleRefresh}
            className="btn-refresh"
            disabled={loading}
          >
            🔄 Refresh
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="btn-export"
            disabled={filteredLogs.length === 0}
          >
            📥 CSV
          </button>

          <button
            onClick={() => handleExport('json')}
            className="btn-export"
            disabled={filteredLogs.length === 0}
          >
            📥 JSON
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && logs.length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>
            Loading logs from OptimusDB cluster
            {discoveredNodeCount > 0 ? ` (${discoveredNodeCount} nodes)` : ''}...
          </p>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <LogStatistics statistics={statistics} />

          {/* Charts */}
          <LogCharts logs={filteredLogs} statistics={statistics} />

          {/* Filters */}
          <LogFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            availableNodes={Object.keys(statistics.byNode)}
          />

          {/* Log Viewer with Pagination */}
          <div className="log-viewer">
            <div className="viewer-header">
              <h3>
                📋 Log Entries
                <span className="log-count">
                  ({filteredLogs.length.toLocaleString()} logs)
                </span>
              </h3>
            </div>

            <LogViewer
              logs={paginatedLogs}
              onLogClick={handleLogClick}
              loading={loading}
            />

            {/* Pagination */}
            {filteredLogs.length > 0 && (
              <LogPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalLogs={filteredLogs.length}
                logsPerPage={logsPerPage}
                onPageChange={handlePageChange}
                onLogsPerPageChange={handleLogsPerPageChange}
              />
            )}
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default LogAnalyticsPage;

// ==============================================================================
// PHASE 3 CHANGES SUMMARY
// ==============================================================================
// 1. ✅ Added import: import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
// 2. ✅ Added state: discoveredNodeCount to track number of nodes
// 3. ✅ Updated fetchLogs(): Uses getAvailableNodes() instead of hardcoded loop
// 4. ✅ Updated fetchLogs(): Uses buildApiUrl() for each node
// 5. ✅ Updated generateMockLogs(): Accepts nodeCount parameter
// 6. ✅ Updated header: Shows actual discovered node count
// 7. ✅ Updated loading message: Shows node count
//
// RESULT:
// - Docker Desktop: Fetches from localhost:18001, 18002, 18003, etc.
// - K3s: Fetches from /swarmkb/log, /optimusdb2/swarmkb/log, etc.
// - Works with ANY number of nodes (not hardcoded to 8)
// - All existing features preserved (pagination, filters, charts, export, etc.)
// ==============================================================================
