// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/ConnectionPanel.tsx
// ==============================================================================

import * as React from 'react';
import { Connection } from '../index';

interface ConnectionPanelProps {
  connection: Connection;
  onChange: (connection: Connection) => void;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  connection,
  onChange,
}) => {
  return (
    <div className="connection-panel">
      <div className="connection-mode">
        <label>Mode:</label>
        <select
          value={connection.mode}
          onChange={(e) =>
            onChange({
              ...connection,
              mode: e.target.value as Connection['mode'],
            })
          }
        >
          <option value="coordinator">Coordinator</option>
          <option value="specific-node">Specific Node</option>
          <option value="fan-out">Fan-out</option>
        </select>
      </div>

      {connection.mode === 'specific-node' && (
        <div className="connection-node">
          <label>Node ID:</label>
          <input
            type="text"
            value={connection.nodeId || ''}
            onChange={(e) =>
              onChange({ ...connection, nodeId: e.target.value })
            }
            placeholder="Enter node ID..."
          />
        </div>
      )}

      <div className="connection-context">
        <label>Context:</label>
        <input
          type="text"
          value={connection.context}
          onChange={(e) => onChange({ ...connection, context: e.target.value })}
        />
      </div>

      <div className="connection-readonly">
        <label>
          <input
            type="checkbox"
            checked={connection.readOnly}
            onChange={(e) =>
              onChange({ ...connection, readOnly: e.target.checked })
            }
          />
          Read-only mode
        </label>
      </div>
    </div>
  );
};

export default ConnectionPanel;
