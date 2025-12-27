// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/ResultPane.tsx
// ==============================================================================

import * as React from 'react';
import { useState } from 'react';
import { QueryResult, QueryMode } from '../index';

interface ResultPaneProps {
  result: QueryResult | null;
  isExecuting: boolean;
  onExport: (format: 'csv' | 'json') => void;
  queryMode: QueryMode; // ⭐ Added this prop
}

const ResultPane: React.FC<ResultPaneProps> = ({
  result,
  isExecuting,
  onExport,
  queryMode, // ⭐ Now included
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'messages'>('results');

  return (
    <div className="result-pane">
      {/* Header */}
      <div className="result-header">
        <div className="result-tabs">
          <button
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            📊 Results
            {result && result.success && (
              <span className="row-count"> ({result.rowCount} rows)</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            💬 Messages
          </button>
        </div>
        <div className="result-actions">
          {result && result.success && result.rowCount > 0 && (
            <>
              <button
                className="btn btn-sm"
                onClick={() => onExport('csv')}
                title="Export as CSV"
              >
                📥 CSV
              </button>
              <button
                className="btn btn-sm"
                onClick={() => onExport('json')}
                title="Export as JSON"
              >
                📥 JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="result-content">
        {isExecuting && (
          <div className="result-loading">
            <div className="spinner" />
            <p>Executing query...</p>
          </div>
        )}

        {!isExecuting && !result && (
          <div className="result-empty">
            <p>📝 No query executed yet</p>
            <p className="hint">
              {queryMode === 'sql'
                ? 'Write a SQL query and press F5 to execute'
                : 'Write a CRUD command (GET, PUT, DELETE, LIST) and press F5'}
            </p>
          </div>
        )}

        {!isExecuting && result && activeTab === 'results' && (
          <div className="result-data">
            {result.success ? (
              result.rowCount > 0 ? (
                <div className="result-table-container">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {result.columns.map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx}>
                              {cell === null ? (
                                <span className="null-value">NULL</span>
                              ) : typeof cell === 'object' ? (
                                <span className="json-value">
                                  {JSON.stringify(cell)}
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
                <div className="result-empty">
                  <p>
                    ✅ Query executed successfully{' '}
                    {result.operation && `(${result.operation})`}
                  </p>
                  <p className="hint">No rows returned</p>
                </div>
              )
            ) : (
              <div className="result-error">
                <p>
                  ❌ <strong>Query Failed</strong>
                </p>
                <pre>{result.error || 'Unknown error'}</pre>
              </div>
            )}
          </div>
        )}

        {!isExecuting && result && activeTab === 'messages' && (
          <div className="result-messages">
            {result.success ? (
              <div className="message success">
                <div className="message-icon">✅</div>
                <div className="message-content">
                  <p>
                    <strong>Query executed successfully</strong>
                    {result.operation && ` (${result.operation})`}
                  </p>
                  <ul>
                    <li>
                      Rows returned: <strong>{result.rowCount}</strong>
                    </li>
                    <li>
                      Execution time:{' '}
                      <strong>{result.executionTimeMs}ms</strong>
                    </li>
                    {result.trace && (
                      <>
                        <li>
                          Trace ID: <code>{result.trace.traceId}</code>
                        </li>
                        <li>
                          Trace path: {result.trace.tracePath.join(' → ')}
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="message error">
                <div className="message-icon">❌</div>
                <div className="message-content">
                  <p>
                    <strong>Query execution failed</strong>
                  </p>
                  <pre>{result.error || 'Unknown error'}</pre>
                  <p className="hint">
                    Check your query syntax and connection settings
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPane;
