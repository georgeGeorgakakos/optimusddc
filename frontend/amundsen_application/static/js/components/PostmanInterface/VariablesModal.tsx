// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useEffect } from 'react';

import './VariablesModal.scss';

interface VariablesModalProps {
  variables: Record<string, string>;
  detectedVariables: string[];
  onSave: (variables: Record<string, string>) => void;
  onClose: () => void;
}

const VariablesModal: React.FC<VariablesModalProps> = ({
  variables: initialVariables,
  detectedVariables,
  onSave,
  onClose,
}) => {
  const [variables, setVariables] =
    useState<Record<string, string>>(initialVariables);

  useEffect(() => {
    // Auto-populate missing variables with smart defaults
    const newVars = { ...variables };
    let updated = false;

    detectedVariables.forEach((varName) => {
      if (!newVars[varName]) {
        // Smart defaults based on variable name
        if (varName === 'base_url') {
          newVars[
            varName
          ] = `${window.location.protocol}//${window.location.host}`;
          updated = true;
        } else if (varName === 'context') {
          newVars[varName] = '';
          updated = true;
        } else {
          newVars[varName] = '';
          updated = true;
        }
      }
    });

    if (updated) {
      setVariables(newVars);
    }
  }, [detectedVariables]);

  const handleChange = (key: string, value: string) => {
    setVariables({
      ...variables,
      [key]: value,
    });
  };

  const handleSave = () => {
    onSave(variables);
  };

  const handleReset = () => {
    const resetVars: Record<string, string> = {};

    detectedVariables.forEach((varName) => {
      if (varName === 'base_url') {
        resetVars[
          varName
        ] = `${window.location.protocol}//${window.location.host}`;
      } else {
        resetVars[varName] = '';
      }
    });
    setVariables(resetVars);
  };

  // Get variable description/hint
  const getVariableHint = (varName: string): string => {
    const hints: Record<string, string> = {
      base_url: 'Base URL for API requests (e.g., http://localhost:8089)',
      context: 'API context path (e.g., /swarmkb or leave empty)',
      host: 'API host (e.g., localhost or 192.168.0.26)',
      port: 'API port (e.g., 8089)',
      node_id: 'Node ID (e.g., 1, 2, 3)',
      peer_id: 'Peer ID for the agent',
      // Add more hints as needed
    };

    return hints[varName] || `Value for {{${varName}}}`;
  };

  // Get placeholder based on variable name
  const getPlaceholder = (varName: string): string => {
    const placeholders: Record<string, string> = {
      base_url: 'http://localhost:8089',
      context: '/swarmkb or leave empty',
      host: 'localhost',
      port: '8089',
      node_id: '1',
      peer_id: 'QmXXX...',
    };

    return placeholders[varName] || '';
  };

  return (
    <div className="variables-modal-overlay" onClick={onClose}>
      <div className="variables-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <i className="icon ion-ios-flask" />
            <div>
              <h2>Collection Variables</h2>
              <p>Define values for template variables used in requests</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <i className="icon ion-ios-close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="variables-info">
            <i className="icon ion-ios-information-circle" />
            <div>
              <strong>
                Detected {detectedVariables.length} variable
                {detectedVariables.length !== 1 ? 's' : ''}
              </strong>
              <p>
                These variables appear in your collection as{' '}
                <code>{'{{variable_name}}'}</code>. Define their values below to
                use in all requests.
              </p>
            </div>
          </div>

          <div className="variables-list">
            {detectedVariables.map((varName) => (
              <div key={varName} className="variable-row">
                <div className="variable-header">
                  <label className="variable-label">
                    <code className="variable-name">
                      {'{{' + varName + '}}'}
                    </code>
                  </label>
                  <span className="variable-hint">
                    {getVariableHint(varName)}
                  </span>
                </div>
                <input
                  type="text"
                  className="variable-input"
                  placeholder={getPlaceholder(varName)}
                  value={variables[varName] || ''}
                  onChange={(e) => handleChange(varName, e.target.value)}
                />
              </div>
            ))}
          </div>

          {detectedVariables.length === 0 && (
            <div className="no-variables">
              <i className="icon ion-ios-flask" />
              <p>No variables detected in this collection</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={handleReset}>
            <i className="icon ion-ios-refresh" />
            Reset to Defaults
          </button>
          <div className="footer-actions">
            <button className="button button-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" onClick={handleSave}>
              <i className="icon ion-ios-checkmark-circle" />
              Save Variables
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariablesModal;
