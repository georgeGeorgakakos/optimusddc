// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/SchemaExplorer.tsx
// ==============================================================================

import * as React from 'react';
import { useState } from 'react';
import { SchemaNode } from '../index';

interface SchemaExplorerProps {
  schema: SchemaNode[];
  loading: boolean;
  onRefresh: () => void;
  onInsert: (text: string) => void;
}

const SchemaExplorer: React.FC<SchemaExplorerProps> = ({
  schema,
  loading,
  onRefresh,
  onInsert,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);

    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (
    node: SchemaNode,
    path: string = '',
    level: number = 0
  ) => {
    const currentPath = path ? `${path}.${node.name}` : node.name;
    const isExpanded = expandedNodes.has(currentPath);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div
        key={currentPath}
        className="schema-node"
        style={{ marginLeft: `${level * 16}px` }}
      >
        <div className="schema-node-header">
          {hasChildren && (
            <button
              className="expand-btn"
              onClick={() => toggleNode(currentPath)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-placeholder" />}

          <span className={`node-icon icon-${node.type}`}>
            {node.type === 'context' && '🗂️'}
            {node.type === 'table' && '📋'}
            {node.type === 'column' && '📌'}
          </span>

          <span
            className="node-name"
            onClick={() => {
              if (node.type === 'table') {
                onInsert(`SELECT * FROM ${node.name} LIMIT 10;`);
              } else if (node.type === 'column') {
                onInsert(node.name);
              }
            }}
            title={
              node.type === 'table'
                ? `Click to insert SELECT statement for ${node.name}`
                : node.type === 'column'
                ? `Click to insert ${node.name}`
                : node.description || node.name
            }
          >
            {node.name}
          </span>

          {node.dataType && (
            <span className="node-datatype">{node.dataType}</span>
          )}
        </div>

        {node.description && (
          <div className="node-description">{node.description}</div>
        )}

        {hasChildren && isExpanded && (
          <div className="schema-node-children">
            {node.children!.map((child) =>
              renderNode(child, currentPath, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schema-explorer">
      <div className="schema-header">
        <h3>📚 Schema</h3>
        <button
          className="btn btn-sm refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh schema"
        >
          {loading ? '⟳' : '🔄'}
        </button>
      </div>

      <div className="schema-content">
        {loading && (
          <div className="schema-loading">
            <div className="spinner" />
            <p>Loading schema...</p>
          </div>
        )}

        {!loading && schema.length === 0 && (
          <div className="schema-empty">
            <p>No schema available</p>
          </div>
        )}

        {!loading && schema.length > 0 && (
          <div className="schema-tree">
            {schema.map((node) => renderNode(node))}
          </div>
        )}
      </div>

      <div className="schema-footer">
        <p className="hint">💡 Click tables to insert SELECT statements</p>
      </div>
    </div>
  );
};

export default SchemaExplorer;
