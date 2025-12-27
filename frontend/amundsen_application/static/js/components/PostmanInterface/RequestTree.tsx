// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';

interface RequestTreeProps {
  collection: any;
  selectedRequestId?: string;
  onRequestSelect: (requestId: string) => void;
}

interface TreeNode {
  name: string;
  id: string;
  children?: TreeNode[];
  isRequest: boolean;
  method?: string;
}

const RequestTree: React.FC<RequestTreeProps> = ({
  collection,
  selectedRequestId,
  onRequestSelect,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure from collection
  const buildTree = (items: any[], parentPath: string[] = []): TreeNode[] =>
    items.map((item) => {
      const currentPath = [...parentPath, item.name];
      const nodeId = currentPath.join('/');

      if (item.request) {
        return {
          name: item.name,
          id: nodeId,
          isRequest: true,
          method: item.request.method,
        };
      }
      if (item.item) {
        return {
          name: item.name,
          id: nodeId,
          isRequest: false,
          children: buildTree(item.item, currentPath),
        };
      }

      return {
        name: item.name,
        id: nodeId,
        isRequest: false,
      };
    });

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);

    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getMethodClass = (method?: string) => {
    if (!method) return '';

    return `method-${method.toLowerCase()}`;
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedRequestId === node.id;

    return (
      <div key={node.id} className="tree-node">
        <div
          className={`tree-node-content ${isSelected ? 'selected' : ''} ${
            node.isRequest ? 'request-node' : 'folder-node'
          }`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
          onClick={() => {
            if (node.isRequest) {
              onRequestSelect(node.id);
            } else {
              toggleNode(node.id);
            }
          }}
        >
          {hasChildren && (
            <i
              className={`icon ion-ios-arrow-${
                isExpanded ? 'down' : 'forward'
              } tree-toggle`}
            />
          )}

          {!hasChildren && !node.isRequest && (
            <i className="icon ion-ios-folder tree-icon" />
          )}

          {node.isRequest && (
            <span className={`method-badge ${getMethodClass(node.method)}`}>
              {node.method}
            </span>
          )}

          <span className="tree-node-name">{node.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="tree-node-children">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const treeNodes = buildTree(collection.item || []);

  return (
    <div className="request-tree">
      <div className="tree-header">
        <h3>
          <i className="icon ion-ios-folder" />
          {collection.info.name}
        </h3>
        {collection.info.description && (
          <p className="tree-description">{collection.info.description}</p>
        )}
      </div>

      <div className="tree-content">
        {treeNodes.map((node) => renderNode(node))}
      </div>
    </div>
  );
};

export default RequestTree;
