// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState } from 'react';
import './ToscaUploadModal.scss';

interface ToscaFile {
  name: string;
  content: string;
}

interface ToscaUploadModalProps {
  onUpload: (files: ToscaFile[], variables: Record<string, string>) => void;
  onClose: () => void;
  existingVariables: Record<string, string>;
}

const ToscaUploadModal: React.FC<ToscaUploadModalProps> = ({
  onUpload,
  onClose,
  existingVariables,
}) => {
  const [files, setFiles] = useState<ToscaFile[]>([]);
  const [extractedVariables, setExtractedVariables] = useState<
    Record<string, string>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract variables from TOSCA content
  const extractVariablesFromTosca = (
    content: string,
    filename: string
  ): Record<string, string> => {
    const vars: Record<string, string> = {};

    try {
      // Try to parse as JSON first
      const data = JSON.parse(content);

      // Extract common TOSCA properties
      if (data.topology_template) {
        // Extract inputs
        if (data.topology_template.inputs) {
          Object.keys(data.topology_template.inputs).forEach((key) => {
            const input = data.topology_template.inputs[key];

            if (input.default !== undefined) {
              vars[key] = String(input.default);
            }
          });
        }

        // Extract node properties
        if (data.topology_template.node_templates) {
          Object.entries(data.topology_template.node_templates).forEach(
            ([nodeName, node]: [string, any]) => {
              if (node.properties) {
                // Common properties to extract
                ['host', 'port', 'endpoint', 'url', 'base_url'].forEach(
                  (prop) => {
                    if (node.properties[prop]) {
                      vars[`${nodeName}_${prop}`] = String(
                        node.properties[prop]
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }

      // Extract any {{variable}} patterns in the content
      const variablePattern = /\{\{([^}]+)\}\}/g;
      const matches = content.matchAll(variablePattern);

      for (const match of matches) {
        const varName = match[1].trim();

        if (!vars[varName] && !existingVariables[varName]) {
          vars[varName] = ''; // Will need user input
        }
      }
    } catch (e) {
      console.log('Not JSON, treating as YAML/Text');

      // Extract variables from YAML-style content
      const lines = content.split('\n');

      lines.forEach((line) => {
        // Match patterns like: key: value
        const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/);

        if (match) {
          const [, key, value] = match;
          const cleanValue = value.trim().replace(/^['"]|['"]$/g, '');

          // Only extract if it looks like a configuration value
          if (
            [
              'host',
              'port',
              'endpoint',
              'url',
              'base_url',
              'context',
              'node_id',
            ].includes(key)
          ) {
            vars[key] = cleanValue;
          }
        }
      });

      // Extract {{variable}} patterns
      const variablePattern = /\{\{([^}]+)\}\}/g;
      const matches = content.matchAll(variablePattern);

      for (const match of matches) {
        const varName = match[1].trim();

        if (!vars[varName] && !existingVariables[varName]) {
          vars[varName] = '';
        }
      }
    }

    console.log(`Extracted variables from ${filename}:`, vars);

    return vars;
  };

  // Handle file selection
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    setIsProcessing(true);

    try {
      const filePromises = selectedFiles.map(
        (file) =>
          new Promise<ToscaFile>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
              resolve({
                name: file.name,
                content: e.target?.result as string,
              });
            };
            reader.onerror = reject;
            reader.readAsText(file);
          })
      );

      const loadedFiles = await Promise.all(filePromises);

      setFiles(loadedFiles);

      // Extract variables from all files
      const allVars: Record<string, string> = {};

      loadedFiles.forEach((file) => {
        const fileVars = extractVariablesFromTosca(file.content, file.name);

        Object.assign(allVars, fileVars);
      });

      setExtractedVariables(allVars);
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Error loading TOSCA files. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle variable value change
  const handleVariableChange = (key: string, value: string) => {
    setExtractedVariables((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle upload
  const handleUpload = () => {
    if (files.length === 0) {
      alert('Please select at least one TOSCA file');

      return;
    }

    onUpload(files, extractedVariables);
  };

  return (
    <div className="tosca-modal-overlay" onClick={onClose}>
      <div className="tosca-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <i className="icon ion-ios-document" />
            <div>
              <h2>Upload TOSCA Files</h2>
              <p>Upload TOSCA templates and extract configuration variables</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <i className="icon ion-ios-close" />
          </button>
        </div>

        <div className="modal-body">
          {/* File Upload Area */}
          <div className="upload-area">
            <label className="upload-zone">
              <input
                type="file"
                multiple
                accept=".json,.yaml,.yml,.tosca"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div className="upload-zone-content">
                <i className="icon ion-ios-cloud-upload upload-icon" />
                <h3>Click to upload TOSCA files</h3>
                <p>Supports JSON, YAML, and TOSCA formats</p>
                <span className="upload-hint">
                  You can select multiple files
                </span>
              </div>
            </label>
          </div>

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="files-list">
              <div className="files-header">
                <i className="icon ion-ios-checkmark-circle" />
                <span>
                  {files.length} file{files.length > 1 ? 's' : ''} uploaded
                </span>
              </div>
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <i className="icon ion-ios-document" />
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.content.length / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Extracted Variables */}
          {Object.keys(extractedVariables).length > 0 && (
            <div className="variables-section">
              <div className="variables-header">
                <i className="icon ion-ios-flask" />
                <h3>
                  Extracted Variables ({Object.keys(extractedVariables).length})
                </h3>
                <p>
                  Review and modify the variables extracted from your TOSCA
                  files
                </p>
              </div>

              <div className="variables-list">
                {Object.entries(extractedVariables).map(([key, value]) => (
                  <div key={key} className="variable-row">
                    <label className="variable-label">
                      <code className="variable-name">{'{{' + key + '}}'}</code>
                    </label>
                    <input
                      type="text"
                      className="variable-input"
                      placeholder={`Enter value for ${key}`}
                      value={value}
                      onChange={(e) =>
                        handleVariableChange(key, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="processing-state">
              <div className="spinner" />
              <p>Processing TOSCA files...</p>
            </div>
          )}

          {/* Empty State */}
          {files.length === 0 && !isProcessing && (
            <div className="empty-state">
              <i className="icon ion-ios-information-circle" />
              <p>
                Upload TOSCA templates to automatically extract configuration
                variables. Variables like endpoints, ports, and node IDs will be
                detected and made available for use in your API requests.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={handleUpload}
            disabled={files.length === 0}
          >
            <i className="icon ion-ios-checkmark-circle" />
            Upload & Extract Variables
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToscaUploadModal;
