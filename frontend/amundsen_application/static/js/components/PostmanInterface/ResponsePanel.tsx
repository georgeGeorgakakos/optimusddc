// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';

interface ResponsePanelProps {
  response: any;
  isLoading: boolean;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusClass = (status: number): string => {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    if (status >= 400 && status < 500) return 'status-client-error';
    if (status >= 500) return 'status-server-error';

    return 'status-unknown';
  };

  const renderJson = (data: any, level: number = 0): React.ReactNode => {
    if (data === null) {
      return <span className="json-null">null</span>;
    }

    if (typeof data === 'string') {
      return <span className="json-string">"{data}"</span>;
    }

    if (typeof data === 'number') {
      return <span className="json-number">{data}</span>;
    }

    if (typeof data === 'boolean') {
      return <span className="json-boolean">{data.toString()}</span>;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="json-bracket">[]</span>;
      }

      return (
        <div className="json-array">
          <span className="json-bracket">[</span>
          <div className="json-indent">
            {data.map((item, index) => (
              <div key={index} className="json-array-item">
                {renderJson(item, level + 1)}
                {index < data.length - 1 && (
                  <span className="json-comma">,</span>
                )}
              </div>
            ))}
          </div>
          <span className="json-bracket">]</span>
        </div>
      );
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);

      if (keys.length === 0) {
        return <span className="json-bracket">{'{}'}</span>;
      }

      return (
        <div className="json-object">
          <span className="json-bracket">{'{'}</span>
          <div className="json-indent">
            {keys.map((key, index) => (
              <div key={key} className="json-property">
                <span className="json-key">"{key}"</span>
                <span className="json-colon">: </span>
                {renderJson(data[key], level + 1)}
                {index < keys.length - 1 && (
                  <span className="json-comma">,</span>
                )}
              </div>
            ))}
          </div>
          <span className="json-bracket">{'}'}</span>
        </div>
      );
    }

    return <span>{String(data)}</span>;
  };

  const copyToClipboard = () => {
    if (response?.data) {
      const text =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data, null, 2);

      navigator.clipboard.writeText(text);
    }
  };

  if (isLoading) {
    return (
      <div className="response-panel loading">
        <div className="loading-state">
          <div className="spinner-large" />
          <p>Sending request...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-panel empty">
        <div className="empty-state-small">
          <i className="icon ion-ios-paper-plane" />
          <p>Response will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="response-panel">
      {/* Status Bar */}
      <div className="response-status-bar">
        <div className="status-info">
          <div className={`status-code ${getStatusClass(response.status)}`}>
            {response.status} {response.statusText}
          </div>
          <div className="status-metrics">
            <span className="metric">
              <i className="icon ion-ios-time" />
              {response.time}ms
            </span>
            <span className="metric">
              <i className="icon ion-ios-document" />
              {formatBytes(response.size)}
            </span>
          </div>
        </div>

        <div className="response-actions">
          <button
            className="icon-button"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            <i className="icon ion-ios-copy" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="response-tabs">
        <button
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </button>
        <button
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
          <span className="badge">
            {Object.keys(response.headers || {}).length}
          </span>
        </button>

        {activeTab === 'body' && (
          <div className="view-mode-toggle">
            <button
              className={`mode-button ${viewMode === 'pretty' ? 'active' : ''}`}
              onClick={() => setViewMode('pretty')}
            >
              Pretty
            </button>
            <button
              className={`mode-button ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="response-content">
        {activeTab === 'body' && (
          <div className="response-body">
            {viewMode === 'pretty' ? (
              <div className="json-viewer">
                {typeof response.data === 'object' ? (
                  renderJson(response.data)
                ) : (
                  <pre className="raw-text">{String(response.data)}</pre>
                )}
              </div>
            ) : (
              <pre className="raw-text">
                {typeof response.data === 'object'
                  ? JSON.stringify(response.data, null, 2)
                  : String(response.data)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="response-headers">
            <table className="headers-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers || {}).map(([key, value]) => (
                  <tr key={key}>
                    <td className="header-key">{key}</td>
                    <td className="header-value">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsePanel;
