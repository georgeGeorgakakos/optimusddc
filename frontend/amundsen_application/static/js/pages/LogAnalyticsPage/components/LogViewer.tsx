// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogViewer.tsx
// ==============================================================================

import * as React from 'react';
import { LogEntry } from '../index';

interface LogViewerProps {
  logs: LogEntry[];
  loading: boolean;
  onSelectLog: (log: LogEntry) => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, loading, onSelectLog }) => {
  const [displayCount, setDisplayCount] = React.useState(100);

  const displayedLogs = logs.slice(0, displayCount);

  const loadMore = () => {
    setDisplayCount(prev => prev + 100);
  };

  const getLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      DEBUG: '#858585',
      INFO: '#4ec9b0',
      WARN: '#ff9800',
      ERROR: '#f48771',
      FATAL: '#ff0000',
    };
    return colors[level] || '#d4d4d4';
  };

  const getLevelIcon = (level: string): string => {
    const icons: Record<string, string> = {
      DEBUG: '🐛',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      FATAL: '💀',
    };
    return icons[level] || '📝';
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      QUERY: '🔍',
      PEER: '👥',
      ELECTION: '👑',
      DATABASE: '💾',
      NETWORK: '🌐',
      ORBITDB: '📦',
      ERROR: '🚨',
      SYSTEM: '⚙️',
      OTHER: '📝',
    };
    return icons[category] || '📝';
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleString();
  };

  const truncateMessage = (message: string, maxLength: number = 120): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="log-viewer">
      <div className="viewer-header">
        <h3>
          📜 Log Entries
          <span className="log-count">
            {loading ? ' (Loading...)' : ` (${logs.length} logs, showing ${displayedLogs.length})`}
          </span>
        </h3>
      </div>

      <div className="viewer-content">
        {loading && logs.length === 0 ? (
          <div className="viewer-loading">
            <div className="spinner" />
            <p>Loading logs from all nodes...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="viewer-empty">
            <p>📭 No logs found matching your filters</p>
            <p className="hint">Try adjusting your filters or time range</p>
          </div>
        ) : (
          <>
            <table className="log-table">
              <thead>
              <tr>
                <th className="col-time">Time</th>
                <th className="col-level">Level</th>
                <th className="col-node">Node</th>
                <th className="col-category">Category</th>
                <th className="col-message">Message</th>
                <th className="col-duration">Duration</th>
                <th className="col-trace">Trace</th>
              </tr>
              </thead>
              <tbody>
              {displayedLogs.map(log => (
                <tr
                  key={log.id}
                  className={`log-row level-${log.level.toLowerCase()}`}
                  onClick={() => onSelectLog(log)}
                >
                  <td className="col-time" title={log.timestamp.toISOString()}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="col-level">
                      <span
                        className="level-badge"
                        style={{ color: getLevelColor(log.level) }}
                      >
                        {getLevelIcon(log.level)} {log.level}
                      </span>
                  </td>
                  <td className="col-node">
                    <span className="node-badge">{log.nodeId}</span>
                  </td>
                  <td className="col-category">
                      <span className="category-badge">
                        {getCategoryIcon(log.category)} {log.category}
                      </span>
                  </td>
                  <td className="col-message" title={log.message}>
                    {truncateMessage(log.message)}
                  </td>
                  <td className="col-duration">
                    {log.duration ? `${log.duration}ms` : '-'}
                  </td>
                  <td className="col-trace">
                    {log.traceId ? (
                      <code className="trace-id">{log.traceId.substring(0, 8)}</code>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>

            {displayedLogs.length < logs.length && (
              <div className="viewer-footer">
                <button className="btn btn-load-more" onClick={loadMore}>
                  Load More ({logs.length - displayedLogs.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
