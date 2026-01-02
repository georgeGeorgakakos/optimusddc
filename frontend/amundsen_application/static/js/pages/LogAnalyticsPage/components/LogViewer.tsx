// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogViewer.tsx
// UPDATED FOR OPTIMUSDB LOGGER INTEGRATION - COLOR-CODED TYPE BADGES
// ==============================================================================

import * as React from 'react';
import { LogEntry, LOG_TYPE_COLORS } from '../index';

interface LogViewerProps {
  logs: LogEntry[];
  onLogClick: (log: LogEntry) => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onLogClick }) => {
  if (logs.length === 0) {
    return (
      <div className="log-viewer-empty">
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No logs found</h3>
          <p>Try adjusting your filters or time range</p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const truncateMessage = (message: string, maxLength: number = 200): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="log-viewer">
      {/* Header */}
      <div className="log-viewer-header">
        <h3>Log Entries</h3>
        <span className="log-count">
          Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log Entries */}
      <div className="log-entries">
        {logs.map((log) => {
          const typeColor = LOG_TYPE_COLORS[log.type];
          const isDarkText = ['#ffc107', '#fd7e14'].includes(typeColor);

          return (
            <div
              key={log.id}
              className="log-entry"
              onClick={() => onLogClick(log)}
            >
              {/* Log Entry Header */}
              <div className="log-entry-header">
                {/* Log Type Badge */}
                <span
                  className="log-type-badge"
                  style={{
                    background: typeColor,
                    color: isDarkText ? '#000' : '#fff',
                  }}
                >
                  {log.type}
                </span>

                {/* Timestamp */}
                <span className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </span>

                {/* Node Badge */}
                <span className="log-node-badge">
                  {log.nodeId}
                </span>

                {/* Source (if available) */}
                {log.source && (
                  <span className="log-source">
                    {log.source}
                  </span>
                )}

                {/* Duration (if available) */}
                {log.duration !== undefined && (
                  <span className="log-duration">
                    {log.duration}ms
                  </span>
                )}
              </div>

              {/* Log Message */}
              <div className="log-message">
                {truncateMessage(log.message)}
              </div>

              {/* Additional Info */}
              <div className="log-meta">
                {log.traceId && (
                  <span className="log-meta-item">
                    🔍 Trace: <code>{log.traceId.substring(0, 12)}...</code>
                  </span>
                )}
                {log.error && (
                  <span className="log-meta-item error">
                    ⚠️ Has error details
                  </span>
                )}
                {log.details && (
                  <span className="log-meta-item">
                    📋 Has details
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogViewer;
