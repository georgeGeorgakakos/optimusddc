// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogDetailsModal.tsx
// EXACT REPLICA OF IMAGE 1 MODAL
// ==============================================================================

import * as React from 'react';
import { useState } from 'react';
import { LogEntry, LOG_TYPE_COLORS } from '../index';

interface LogDetailsModalProps {
  log: LogEntry;
  onClose: () => void;
  onExport: (format: 'csv' | 'json') => void;
}

const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, onClose, onExport }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

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

  const exportSingleLog = () => {
    const dataStr = JSON.stringify(log, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-${log.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareLog = () => {
    const shareUrl = `${window.location.origin}/logs/${log.id}`;
    copyToClipboard(shareUrl, 'share');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>

        {/* HEADER (EXACTLY AS IN IMAGE 1) */}
        <div className="modal-header">
          <div className="modal-header-content">
            <span className="modal-icon">📋</span>
            <h2>Log Details</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* BODY (EXACTLY AS IN IMAGE 1) */}
        <div className="modal-body">

          {/* SUMMARY SECTION */}
          <div className="modal-section">
            <h3 className="modal-section-title">Summary</h3>

            <div className="modal-fields-grid">
              {/* Timestamp */}
              <div className="modal-field-row">
                <label className="modal-field-label">Timestamp:</label>
                <div className="modal-field-value-with-copy">
                  <span className="modal-field-value">{formatTimestamp(log.timestamp)}</span>
                  <button
                    className="copy-icon-btn"
                    onClick={() => copyToClipboard(log.timestamp, 'timestamp')}
                    title="Copy to clipboard"
                  >
                    {copied === 'timestamp' ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              {/* Log Type (replaces Level: INFO) */}
              <div className="modal-field-row">
                <label className="modal-field-label">Type:</label>
                <div className="modal-field-value-with-copy">
                  <span
                    className="log-type-badge-modal"
                    style={{
                      background: LOG_TYPE_COLORS[log.type],
                      color: ['#ffc107', '#fd7e14'].includes(LOG_TYPE_COLORS[log.type]) ? '#000' : '#fff',
                    }}
                  >
                    {log.type}
                  </span>
                </div>
              </div>

              {/* Node ID */}
              <div className="modal-field-row">
                <label className="modal-field-label">Node ID:</label>
                <div className="modal-field-value-with-copy">
                  <span className="modal-field-value">{log.nodeId}</span>
                  <button
                    className="copy-icon-btn"
                    onClick={() => copyToClipboard(log.nodeId, 'nodeId')}
                    title="Copy to clipboard"
                  >
                    {copied === 'nodeId' ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              {/* Source (if available) */}
              {log.source && (
                <div className="modal-field-row">
                  <label className="modal-field-label">Source:</label>
                  <div className="modal-field-value-with-copy">
                    <code className="modal-field-code">{log.source}</code>
                  </div>
                </div>
              )}

              {/* Trace ID (if available) */}
              {log.traceId && (
                <div className="modal-field-row">
                  <label className="modal-field-label">Trace ID:</label>
                  <div className="modal-field-value-with-copy">
                    <code className="modal-field-code">{log.traceId}</code>
                    <button
                      className="copy-icon-btn"
                      onClick={() => copyToClipboard(log.traceId!, 'traceId')}
                      title="Copy to clipboard"
                    >
                      {copied === 'traceId' ? '✅' : '📋'}
                    </button>
                  </div>
                </div>
              )}

              {/* Duration (if available) */}
              {log.duration !== undefined && (
                <div className="modal-field-row">
                  <label className="modal-field-label">Duration:</label>
                  <div className="modal-field-value-with-copy">
                    <span className="modal-field-value">{log.duration}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MESSAGE SECTION (EXACTLY AS IN IMAGE 1) */}
          <div className="modal-section">
            <h3 className="modal-section-title">Message</h3>
            <div className="message-display-box">
              <pre className="message-text">{log.message}</pre>
              <button
                className="copy-btn-floating"
                onClick={() => copyToClipboard(log.message, 'message')}
                title="Copy message"
              >
                {copied === 'message' ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* DETAILS SECTION (if available) */}
          {log.details && (
            <div className="modal-section">
              <h3 className="modal-section-title">Details</h3>
              <div className="message-display-box">
                <pre className="message-text">{log.details}</pre>
              </div>
            </div>
          )}

          {/* ERROR SECTION (if available) */}
          {log.error && (
            <div className="modal-section">
              <h3 className="modal-section-title">Error</h3>
              <div className="message-display-box error-box">
                <pre className="message-text">{log.error}</pre>
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS FOOTER (EXACTLY AS IN IMAGE 1) */}
        <div className="modal-footer">
          <div className="modal-actions-left">
            {/* EXPORT LOG BUTTON (EXACTLY AS IN IMAGE 1) */}
            <button className="btn btn-export" onClick={exportSingleLog}>
              📥 Export Log
            </button>

            {/* SHARE LOG BUTTON (EXACTLY AS IN IMAGE 1) */}
            <button className="btn btn-share" onClick={shareLog}>
              {copied === 'share' ? '✅ Link Copied!' : '🔗 Share Log'}
            </button>
          </div>

          {/* CLOSE BUTTON (EXACTLY AS IN IMAGE 1) */}
          <button className="btn btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default LogDetailsModal;
