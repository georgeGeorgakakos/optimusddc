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

  // ✅ NEW: File upload state
  const [bodyMode, setBodyMode] = useState<'raw' | 'file'>('raw');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadOptions, setUploadOptions] = useState({
    storeFullStructure: true,
    enableLineage: false,
  });
  const [isDragging, setIsDragging] = useState(false);

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
        setBodyMode('raw'); // Default to raw mode
      } else {
        setBody('');
      }

      // Reset file selection when switching requests
      setSelectedFile(null);
    }
  }, [request]);

  // ✅ NEW: Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const base64 = btoa(content);

      // Auto-generate JSON body
      const generatedBody = {
        file: base64,
        filename: file.name,
        store_full_structure: uploadOptions.storeFullStructure,
      };

      setBody(JSON.stringify(generatedBody, null, 2));
    };
    reader.readAsText(file);
  };

  // ✅ NEW: Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };

  // ✅ NEW: Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };

  // ✅ NEW: Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setBody('');
  };

  // ✅ NEW: Update body when upload options change
  useEffect(() => {
    if (selectedFile && bodyMode === 'file') {
      // Re-read file and regenerate body
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        const base64 = btoa(content);

        const generatedBody = {
          file: base64,
          filename: selectedFile.name,
          store_full_structure: uploadOptions.storeFullStructure,
        };

        setBody(JSON.stringify(generatedBody, null, 2));
      };
      reader.readAsText(selectedFile);
    }
  }, [uploadOptions, selectedFile, bodyMode]);

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
          {selectedFile && <span className="badge">1 file</span>}
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
            {/* ✅ NEW: Body Mode Toggle */}
            <div className="body-mode-selector">
              <label className="mode-option">
                <input
                  type="radio"
                  name="bodyMode"
                  value="raw"
                  checked={bodyMode === 'raw'}
                  onChange={() => setBodyMode('raw')}
                />
                <span>Raw JSON</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="bodyMode"
                  value="file"
                  checked={bodyMode === 'file'}
                  onChange={() => setBodyMode('file')}
                />
                <span>File Upload (Base64)</span>
              </label>
            </div>

            {bodyMode === 'raw' ? (
              <>
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
              </>
            ) : (
              <>
                {/* ✅ NEW: File Upload Area */}
                <div
                  className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-input"
                    accept=".yaml,.yml,.json,.tosca"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />

                  {!selectedFile ? (
                    <label htmlFor="file-input" className="upload-zone">
                      <i className="icon ion-ios-cloud-upload upload-icon" />
                      <h4>Select TOSCA File</h4>
                      <p>or drag and drop here</p>
                      <span className="upload-hint">
                        Supports: .yaml, .yml, .json, .tosca
                      </span>
                    </label>
                  ) : (
                    <div className="selected-file">
                      <div className="file-info">
                        <i className="icon ion-ios-document file-icon" />
                        <div className="file-details">
                          <div className="file-name">{selectedFile.name}</div>
                          <div className="file-size">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                        <button
                          className="remove-file-button"
                          onClick={handleRemoveFile}
                        >
                          <i className="icon ion-ios-close-circle" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ✅ NEW: Upload Options */}
                {selectedFile && (
                  <div className="upload-options">
                    <div className="options-header">
                      <i className="icon ion-ios-settings" />
                      <span>Upload Options</span>
                    </div>
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={uploadOptions.storeFullStructure}
                        onChange={(e) =>
                          setUploadOptions({
                            ...uploadOptions,
                            storeFullStructure: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Store Full Structure (enables lineage tracking)
                      </span>
                    </label>
                  </div>
                )}

                {/* ✅ NEW: Generated JSON Body Preview */}
                {selectedFile && body && (
                  <div className="generated-body-preview">
                    <div className="preview-header">
                      <i className="icon ion-ios-code" />
                      <span>Generated JSON Body</span>
                      <button className="toolbar-button" onClick={formatJson}>
                        <i className="icon ion-ios-code" />
                        Beautify
                      </button>
                    </div>
                    <textarea
                      className="body-editor compact"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestPanel;
