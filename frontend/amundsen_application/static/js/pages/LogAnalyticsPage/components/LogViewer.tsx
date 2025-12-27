// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogViewer.tsx
// FIXED PROPS INTERFACE
// ==============================================================================

import * as React from 'react';
import { LogEntry } from '../index';

// ==============================================================================
// PROPS INTERFACE - FIXED
// ==============================================================================

export interface LogViewerProps {
  logs: LogEntry[];
  onLogClick: (log: LogEntry) => void; // ADDED
  loading: boolean;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

const LogViewer: React.FC<LogViewerProps> = ({ logs, onLogClick, loading }) => {
  const [sortField, setSortField] = React.useState<keyof LogEntry>('timestamp');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
    'desc'
  );

  // ===========================================================================
  // Sorting Logic
  // ===========================================================================

  const handleSort = (field: keyof LogEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedLogs = React.useMemo(
    () =>
      [...logs].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === undefined || bVal === undefined) return 0;

        let comparison = 0;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      }),
    [logs, sortField, sortDirection]
  );

  // ===========================================================================
  // Level Badge Styling
  // ===========================================================================

  const getLevelClass = (level: string): string => {
    const levelMap: Record<string, string> = {
      DEBUG: 'level-debug',
      INFO: 'level-info',
      WARN: 'level-warn',
      ERROR: 'level-error',
      FATAL: 'level-fatal',
    };

    return levelMap[level] || 'level-info';
  };

  // ===========================================================================
  // Format Timestamp
  // ===========================================================================

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // ===========================================================================
  // Render Sort Icon
  // ===========================================================================

  const renderSortIcon = (field: keyof LogEntry) => {
    if (sortField !== field) return null;

    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  if (loading && logs.length === 0) {
    return (
      <div className="log-viewer">
        <div className="loading-spinner">Loading logs...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="log-viewer">
        <div className="no-logs">
          <p>📭 No logs found</p>
          <p className="hint">Try adjusting your filters or time range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h3>📋 Log Entries ({logs.length} logs)</h3>
      </div>

      <div className="log-table-container">
        <table className="log-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('timestamp')} className="sortable">
                Timestamp{renderSortIcon('timestamp')}
              </th>
              <th onClick={() => handleSort('level')} className="sortable">
                Level{renderSortIcon('level')}
              </th>
              <th onClick={() => handleSort('category')} className="sortable">
                Category{renderSortIcon('category')}
              </th>
              <th onClick={() => handleSort('nodeId')} className="sortable">
                Node{renderSortIcon('nodeId')}
              </th>
              <th>Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => (
              <tr
                key={log.id}
                className="log-row"
                onClick={() => onLogClick(log)}
              >
                <td className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td>
                  <span
                    className={`log-level-badge ${getLevelClass(log.level)}`}
                  >
                    {log.level}
                  </span>
                </td>
                <td>
                  <span className="log-category">{log.category}</span>
                </td>
                <td>
                  <span className="log-node">{log.nodeId}</span>
                </td>
                <td className="log-message">{log.message}</td>
                <td>
                  <button
                    className="btn-view-details"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogClick(log);
                    }}
                  >
                    👁️ View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Refreshing logs...</p>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
