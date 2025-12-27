// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect } from 'react';

interface RequestPanelProps {
  request: any;
  onExecute: (
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ) => void;
  isLoading: boolean;
  variables: Record<string, string>;
}

const RequestPanel: React.FC<RequestPanelProps> = ({
  request,
  onExecute,
  isLoading,
  variables,
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<
    Array<{ key: string; value: string; enabled: boolean }>
  >([]);
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');

  // ✅ Replace variables in string for preview
  const replaceVariables = (str: string): string => {
    let result = str;

    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');

      result = result.replace(pattern, value);
    });

    return result;
  };

  // ✅ Check if string contains variables
  const hasVariables = (str: string): boolean => /\{\{[^}]+\}\}/.test(str);

  useEffect(() => {
    if (request) {
      setMethod(request.request.method || 'GET');

      // Handle URL
      let requestUrl = '';

      if (typeof request.request.url === 'string') {
        requestUrl = request.request.url;
      } else if (request.request.url.raw) {
        requestUrl = request.request.url.raw;
      }
      setUrl(requestUrl);

      // Handle headers
      const requestHeaders = request.request.header || [];

      setHeaders(
        requestHeaders.map((h: any) => ({
          key: h.key,
          value: h.value,
          enabled: true,
        }))
      );

      // Handle body
      if (request.request.body?.raw) {
        setBody(request.request.body.raw);
      } else {
        setBody('');
      }
    }
  }, [request]);

  const handleExecute = () => {
    const enabledHeaders = headers
      .filter((h) => h.enabled && h.key && h.value)
      .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

    onExecute(method, url, enabledHeaders, body);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (
    index: number,
    field: 'key' | 'value' | 'enabled',
    value: string | boolean
  ) => {
    const newHeaders = [...headers];

    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(body);

      setBody(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  if (!request) {
    return (
      <div className="request-panel-empty">
        <div className="empty-state-small">
          <i className="icon ion-ios-document" />
          <p>Select a request from the tree</p>
        </div>
      </div>
    );
  }

  // ✅ Show resolved URL if variables exist
  const resolvedUrl = replaceVariables(url);
  const showResolved = hasVariables(url) && resolvedUrl !== url;

  return (
    <div className="request-panel">
      <div className="request-header">
        <h3>
          <i className="icon ion-ios-paper" />
          {request.name}
        </h3>
        <div className="request-path">{request.path.join(' / ')}</div>
      </div>

      {/* Request Line */}
      <div className="request-line">
        <select
          className="method-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <div className="url-input-container">
          <input
            type="text"
            className="url-input"
            placeholder="Enter request URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          {/* ✅ Show resolved URL preview */}
          {showResolved && (
            <div className="url-preview">
              <i className="icon ion-ios-arrow-round-forward" />
              <span className="preview-label">Resolved:</span>
              <code className="preview-url">{resolvedUrl}</code>
            </div>
          )}
        </div>

        <button
          className="send-button"
          onClick={handleExecute}
          disabled={isLoading || !url}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Sending...
            </>
          ) : (
            <>
              <i className="icon ion-ios-send" />
              Send
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="request-tabs">
        <button
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
          {headers.filter((h) => h.enabled).length > 0 && (
            <span className="badge">
              {headers.filter((h) => h.enabled).length}
            </span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'headers' && (
          <div className="headers-panel">
            <div className="headers-header">
              <div style={{ width: '40px' }} />
              <span>Key</span>
              <span>Value</span>
              <div style={{ width: '40px' }} />
            </div>

            <div className="headers-list">
              {headers.map((header, index) => (
                <div key={index} className="header-row">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) =>
                      updateHeader(index, 'enabled', e.target.checked)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) =>
                      updateHeader(index, 'value', e.target.value)
                    }
                  />
                  <button
                    className="icon-button delete"
                    onClick={() => removeHeader(index)}
                  >
                    <i className="icon ion-ios-trash" />
                  </button>
                </div>
              ))}
            </div>

            <button className="add-header-button" onClick={addHeader}>
              <i className="icon ion-ios-add-circle" />
              Add Header
            </button>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="body-panel">
            <div className="body-toolbar">
              <button className="toolbar-button" onClick={formatJson}>
                <i className="icon ion-ios-code" />
                Beautify JSON
              </button>
            </div>

            <textarea
              className="body-editor"
              placeholder="Request body (JSON, XML, etc.)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestPanel;
