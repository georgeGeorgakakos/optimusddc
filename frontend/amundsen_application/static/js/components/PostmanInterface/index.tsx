// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState } from 'react';

import './PostmanInterface.scss';
import RequestTree from './RequestTree';
import RequestPanel from './RequestPanel';
import ResponsePanel from './ResponsePanel';
import VariablesModal from './VariablesModal';

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
  };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string }>;
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
}

interface PostmanRequest {
  method: string;
  header?: Array<{ key: string; value: string }>;
  url:
    | string
    | {
        raw: string;
        protocol?: string;
        host?: string[];
        port?: string;
        path?: string[];
        [key: string]: any;
      };
  body?: {
    mode: string;
    raw?: string;
  };
  description?: string;
}

interface FlatRequest {
  id: string;
  name: string;
  path: string[];
  request: PostmanRequest;
}

const PostmanInterface: React.FC = () => {
  const [collection, setCollection] = useState<PostmanCollection | null>(null);
  const [requests, setRequests] = useState<FlatRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FlatRequest | null>(
    null
  );
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Variables management
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Flatten collection structure for easier access
  const flattenCollection = (
    items: PostmanItem[],
    path: string[] = []
  ): FlatRequest[] => {
    const result: FlatRequest[] = [];

    items.forEach((item) => {
      const currentPath = [...path, item.name];

      if (item.request) {
        result.push({
          id: currentPath.join('/'),
          name: item.name,
          path: currentPath,
          request: item.request,
        });
      }

      if (item.item) {
        result.push(...flattenCollection(item.item, currentPath));
      }
    });

    return result;
  };

  // ✅ Extract variables from collection
  const extractVariables = (collectionData: PostmanCollection): string[] => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const foundVariables = new Set<string>();

    const extractFromString = (str: string) => {
      const matches = str.matchAll(variablePattern);

      for (const match of matches) {
        foundVariables.add(match[1]);
      }
    };

    const searchItems = (items: PostmanItem[]) => {
      items.forEach((item) => {
        if (item.request) {
          const url =
            typeof item.request.url === 'string'
              ? item.request.url
              : item.request.url.raw;

          if (url) extractFromString(url);

          item.request.header?.forEach((h) => {
            extractFromString(h.key);
            extractFromString(h.value);
          });

          if (item.request.body?.raw) {
            extractFromString(item.request.body.raw);
          }
        }

        if (item.item) {
          searchItems(item.item);
        }
      });
    };

    searchItems(collectionData.item || []);

    return Array.from(foundVariables).sort();
  };

  // ✅ Replace variables in string
  const replaceVariables = (str: string): string => {
    let result = str;

    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');

      result = result.replace(pattern, value);
    });

    return result;
  };

  // Convert Headers to plain object
  const headersToObject = (headers: Headers): Record<string, string> => {
    const result: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      result[key] = value;
    });

    return result;
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        setCollection(json);

        const flatRequests = flattenCollection(json.item || []);

        setRequests(flatRequests);

        // ✅ Extract and prompt for variables
        const vars = extractVariables(json);

        setDetectedVariables(vars);

        const initialVars: Record<string, string> = {};

        json.variable?.forEach((v: any) => {
          initialVars[v.key] = v.value || '';
        });

        // ✅ SMART DEFAULTS
        if (vars.includes('base_url') && !initialVars.base_url) {
          initialVars.base_url = `${window.location.protocol}//${window.location.host}`;
        }
        if (vars.includes('context') && !initialVars.context) {
          initialVars.context = '';
        }

        setVariables(initialVars);

        if (vars.length > 0) {
          setShowVariablesModal(true);
        }

        console.log('Collection loaded:', json);
        console.log('Variables detected:', vars);
      } catch (error) {
        console.error('Error parsing collection:', error);
        alert(
          'Error parsing Postman collection. Please check the file format.'
        );
      }
    };
    reader.readAsText(file);
  };

  // Handle request selection from tree
  const handleRequestSelect = (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);

    if (request) {
      setSelectedRequest(request);
      setResponse(null);
    }
  };

  // ✅ Execute the request with variable replacement
  const handleExecuteRequest = async (
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ) => {
    setIsLoading(true);
    setResponse(null);

    try {
      const startTime = Date.now();

      // ✅ Replace variables
      const processedUrl = replaceVariables(url);

      const processedHeaders: Record<string, string> = {};

      Object.entries(headers).forEach(([key, value]) => {
        processedHeaders[replaceVariables(key)] = replaceVariables(value);
      });

      const processedBody = body ? replaceVariables(body) : undefined;

      console.log('Executing request:', {
        method,
        url: processedUrl,
        headers: processedHeaders,
        body: processedBody,
      });

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...processedHeaders,
        },
      };

      if (processedBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = processedBody;
      }

      const res = await fetch(processedUrl, fetchOptions);
      const endTime = Date.now();

      let responseData;
      const contentType = res.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      const responseHeaders = headersToObject(res.headers);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        data: responseData,
        time: endTime - startTime,
        size: new Blob([JSON.stringify(responseData)]).size,
      });
    } catch (error: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        data: { error: error.message },
        time: 0,
        size: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle variables update
  const handleVariablesUpdate = (newVariables: Record<string, string>) => {
    setVariables(newVariables);
    setShowVariablesModal(false);
  };

  return (
    <div className="postman-interface">
      {/* Header */}
      <div className="postman-header">
        <div className="postman-title">
          <h1>🧪 API Testing Console</h1>
          <p>Import and test API requests with variable support</p>
        </div>

        <div className="postman-actions">
          <label className="import-button">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
            <i className="icon ion-ios-cloud-upload" />
            Import Collection
          </label>

          <a
            href="/static/examples/OptimusDDC_Complete_Collection.json"
            download="OptimusDDC_Complete_Collection.json"
            className="download-sample-button"
            title="Download sample collection for OptimusDDC APIs"
          >
            <i className="icon ion-ios-download" />
            Download Sample
          </a>

          {/* ✅ Variables button */}
          {collection && detectedVariables.length > 0 && (
            <button
              className="variables-button"
              onClick={() => setShowVariablesModal(true)}
              title="Manage collection variables"
            >
              <i className="icon ion-ios-flask" />
              Variables ({detectedVariables.length})
            </button>
          )}

          {collection && (
            <div className="collection-info">
              <i className="icon ion-ios-folder" />
              <span>{collection.info.name}</span>
              <span className="request-count">
                ({requests.length} requests)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Variables Modal */}
      {showVariablesModal && (
        <VariablesModal
          variables={variables}
          detectedVariables={detectedVariables}
          onSave={handleVariablesUpdate}
          onClose={() => setShowVariablesModal(false)}
        />
      )}

      {/* Main Content */}
      {collection ? (
        <div className="postman-content">
          {/* Left Sidebar - Request Tree */}
          <div className="postman-sidebar">
            <RequestTree
              collection={collection}
              selectedRequestId={selectedRequest?.id}
              onRequestSelect={handleRequestSelect}
            />
          </div>

          {/* ✅ Side-by-side panels */}
          <div className="postman-main">
            {/* Left - Request Panel */}
            <div className="request-section">
              <RequestPanel
                request={selectedRequest}
                onExecute={handleExecuteRequest}
                isLoading={isLoading}
                variables={variables}
              />
            </div>

            {/* Right - Response Panel */}
            <div className="response-section">
              <ResponsePanel response={response} isLoading={isLoading} />
            </div>
          </div>
        </div>
      ) : (
        <div className="postman-empty">
          <div className="empty-state">
            <i className="icon ion-ios-cloud-upload empty-icon" />
            <h2>No Collection Loaded</h2>
            <p>Import a Postman collection to get started</p>

            <div className="empty-state-actions">
              <label className="import-button-large">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  style={{ display: 'none' }}
                />
                <i className="icon ion-ios-cloud-upload" />
                Import Postman Collection
              </label>

              <a
                href="/static/examples/OptimusDDC_Complete_Collection.json"
                download="OptimusDDC_Complete_Collection.json"
                className="download-sample-button-large"
                title="Download sample collection for OptimusDDC APIs"
              >
                <i className="icon ion-ios-download" />
                Download Sample Collection
              </a>
            </div>

            <div className="empty-state-help">
              <p className="help-text">
                <strong>Quick Start:</strong> Download the sample collection
                above to test OptimusDB, CatalogSearch, and CatalogMetadata APIs
                with 25+ pre-configured requests. Variables like{' '}
                <code>{'{{base_url}}'}</code> will be automatically populated
                from your current environment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostmanInterface;
