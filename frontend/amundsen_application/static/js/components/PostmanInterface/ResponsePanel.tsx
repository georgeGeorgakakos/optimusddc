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

  // ✅ NEW: Get status icon
  const getStatusIcon = (status: number): string => {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 300 && status < 400) return '🔄';
    if (status >= 400 && status < 500) return '🔴';
    if (status >= 500) return '💥';

    return '⚪';
  };

  // ✅ NEW: Generate error suggestions
  const getErrorSuggestions = (response: any): string[] => {
    const suggestions: string[] = [];
    const { status } = response;
    const { data } = response;

    if (status === 400) {
      suggestions.push(
        '• Check that all required fields are present in the request body'
      );
      if (
        data?.message?.includes('Base64') ||
        data?.message?.includes('base64')
      ) {
        suggestions.push('• Ensure file is selected in "File Upload" mode');
        suggestions.push('• Verify the base64 encoding is valid');
      }
      if (data?.message?.includes('JSON') || data?.message?.includes('json')) {
        suggestions.push('• Verify the JSON body is properly formatted');
        suggestions.push('• Click "Beautify JSON" to check for syntax errors');
      }
      if (data?.error?.includes('file') || data?.message?.includes('file')) {
        suggestions.push(
          '• Switch to "File Upload (Base64)" mode in the Body tab'
        );
        suggestions.push('• Select a valid TOSCA file (.yaml, .yml, .json)');
      }
    }

    if (status === 404) {
      suggestions.push('• Verify the endpoint URL is correct');
      suggestions.push('• Check that the server is running and accessible');
      suggestions.push('• Ensure the {{base_url}} variable is set correctly');
    }

    if (status === 500) {
      suggestions.push('• Server encountered an internal error');
      suggestions.push('• Check server logs for detailed error information');
      suggestions.push('• Verify OptimusDB service is running properly');
    }

    if (status === 0) {
      suggestions.push('• Unable to connect to the server');
      suggestions.push('• Verify the base_url variable is correct');
      suggestions.push('• Check that OptimusDB is running and accessible');
      suggestions.push('• Check for CORS issues in browser console (F12)');
    }

    return suggestions;
  };

  // ✅ NEW: Extract next steps from success response
  const getNextSteps = (response: any): string[] => {
    const steps: string[] = [];
    const { data } = response;

    if (data?.template_id) {
      steps.push(
        `• Query uploaded template: template_id="${data.template_id}"`
      );
    }

    if (data?.storage_location === 'dsswres' && data?.queryable) {
      steps.push('• View queryable fields in Query Workbench');
      steps.push('• Check datacatalog table for metadata entries');
    }

    if (data?.message?.includes('lineage') || data?.query_info) {
      steps.push('• View lineage graph in Browse section');
      steps.push('• Search for template in catalog search');
    }

    if (
      data?.message?.includes('full') &&
      data?.message?.includes('structure')
    ) {
      steps.push('• Template stored with full queryable structure');
      steps.push('• Lineage tracking is now active for this template');
    }

    return steps;
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
      alert('Response copied to clipboard!');
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

  const isSuccess = response.status >= 200 && response.status < 300;
  const isError = response.status >= 400 || response.status === 0;
  const suggestions = isError ? getErrorSuggestions(response) : [];
  const nextSteps = isSuccess ? getNextSteps(response) : [];

  return (
    <div className="response-panel">
      {/* ✅ ENHANCED: Status Bar */}
      <div className={`response-status-bar ${getStatusClass(response.status)}`}>
        <div className="status-info">
          <div className="status-badge">
            <span className="status-icon">
              {getStatusIcon(response.status)}
            </span>
            <span className="status-text">
              {response.status} {response.statusText}
            </span>
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
            {/* ✅ NEW: Success/Error Banner */}
            {isSuccess && (
              <div className="response-banner success-banner">
                <div className="banner-header">
                  <i className="icon ion-ios-checkmark-circle" />
                  <span>SUCCESS</span>
                </div>
              </div>
            )}

            {isError && (
              <div className="response-banner error-banner">
                <div className="banner-header">
                  <i className="icon ion-ios-warning" />
                  <span>ERROR DETAILS</span>
                </div>
              </div>
            )}

            {/* JSON Body */}
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

            {/* ✅ NEW: Error Suggestions */}
            {isError && suggestions.length > 0 && (
              <div className="suggestions-section">
                <div className="suggestions-header">
                  <i className="icon ion-ios-bulb" />
                  <span>TROUBLESHOOTING SUGGESTIONS</span>
                </div>
                <div className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-item">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ NEW: Next Steps */}
            {isSuccess && nextSteps.length > 0 && (
              <div className="next-steps-section">
                <div className="next-steps-header">
                  <i className="icon ion-ios-arrow-forward" />
                  <span>NEXT STEPS</span>
                </div>
                <div className="next-steps-list">
                  {nextSteps.map((step, index) => (
                    <div key={index} className="next-step-item">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
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
