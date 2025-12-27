// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogDetailsModal.tsx
// ==============================================================================

import * as React from 'react';
import { LogEntry } from '../index';

interface LogDetailsModalProps {
  log: LogEntry;
  onClose: () => void;
}

const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, onClose }) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportLog = () => {
    const json = JSON.stringify(log, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `log_${log.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to convert timestamp to ISO string
  const getISOTimestamp = (timestamp: string | Date): string =>
    typeof timestamp === 'string' ? timestamp : timestamp.toISOString();

  // Helper to get localized timestamp string
  const getLocalTimestamp = (timestamp: string | Date): string =>
    typeof timestamp === 'string'
      ? new Date(timestamp).toLocaleString()
      : timestamp.toLocaleString();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Log Details</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Section */}
          <div className="detail-section">
            <h3>Summary</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">
                  {getLocalTimestamp(log.timestamp)}
                  <button
                    className="btn-copy"
                    onClick={() =>
                      copyToClipboard(getISOTimestamp(log.timestamp))
                    }
                    title="Copy timestamp"
                  >
                    📋
                  </button>
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Level:</span>
                <span
                  className="detail-value level-badge"
                  style={{ color: getLevelColor(log.level) }}
                >
                  {log.level}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Node ID:</span>
                <span className="detail-value node-badge">
                  {log.nodeId}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(log.nodeId)}
                    title="Copy node ID"
                  >
                    📋
                  </button>
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Category:</span>
                <span className="detail-value category-badge">
                  {log.category}
                </span>
              </div>

              {log.traceId && (
                <div className="detail-item">
                  <span className="detail-label">Trace ID:</span>
                  <span className="detail-value">
                    <code>{log.traceId}</code>
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(log.traceId!)}
                      title="Copy trace ID"
                    >
                      📋
                    </button>
                  </span>
                </div>
              )}

              {log.duration && (
                <div className="detail-item">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">{log.duration}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Message Section */}
          <div className="detail-section">
            <h3>Message</h3>
            <div className="detail-message">
              <pre>{log.message}</pre>
              <button
                className="btn-copy"
                onClick={() => copyToClipboard(log.message)}
                title="Copy message"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Raw Details Section */}
          {log.details && (
            <div className="detail-section">
              <h3>Raw Log Data</h3>
              <div className="detail-json">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                <button
                  className="btn-copy"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(log.details, null, 2))
                  }
                  title="Copy raw data"
                >
                  📋 Copy JSON
                </button>
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="detail-section">
            <h3>Actions</h3>
            <div className="detail-actions">
              <button className="btn btn-primary" onClick={exportLog}>
                💾 Export Log
              </button>
              {log.traceId && (
                <button className="btn btn-default">🔍 View Trace</button>
              )}
              <button className="btn btn-default">🔗 Share Log</button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailsModal;
