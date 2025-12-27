// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/TraceWidget.tsx
// ==============================================================================

import * as React from 'react';
import { TraceInfo } from '../index';

interface TraceWidgetProps {
  trace: TraceInfo;
}

const TraceWidget: React.FC<TraceWidgetProps> = ({ trace }) => {
  return (
    <div className="trace-widget">
      <div className="trace-header">
        <span className="trace-icon">🔍</span>
        <strong>Distributed Query Trace</strong>
      </div>

      <div className="trace-content">
        <div className="trace-row">
          <span className="trace-label">Trace ID:</span>
          <code className="trace-value">{trace.traceId}</code>
        </div>

        <div className="trace-row">
          <span className="trace-label">Total Time:</span>
          <span className="trace-value">{trace.totalTimeMs}ms</span>
        </div>

        <div className="trace-row">
          <span className="trace-label">Path:</span>
          <div className="trace-path">
            {trace.tracePath.map((node, idx) => (
              <span key={idx}>
                <code>{node.substring(0, 8)}</code>
                {idx < trace.tracePath.length - 1 && ' → '}
              </span>
            ))}
          </div>
        </div>

        {Object.keys(trace.nodeTimings).length > 0 && (
          <div className="trace-row">
            <span className="trace-label">Node Timings:</span>
            <div className="trace-timings">
              {Object.entries(trace.nodeTimings).map(([nodeId, timing]) => (
                <div key={nodeId} className="timing-row">
                  <code>{nodeId.substring(0, 8)}</code>
                  <span
                    className="timing-bar"
                    style={{ width: `${(timing / trace.totalTimeMs) * 100}%` }}
                  />
                  <span className="timing-value">{timing}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceWidget;
