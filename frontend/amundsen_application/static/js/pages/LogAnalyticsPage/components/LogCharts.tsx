// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogCharts.tsx
// EXACT REPLICA WITH TOP ACTIVE NODES PRESERVED
// ==============================================================================

import * as React from 'react';
import { useState } from 'react';
import { LogStatistics, LogEntry, LogType, LOG_TYPE_COLORS } from '../index';

interface LogChartsProps {
  statistics: LogStatistics;
  filteredLogs: LogEntry[];
}

type ChartTab = 'timeline' | 'levels' | 'categories' | 'nodes';

const LogCharts: React.FC<LogChartsProps> = ({ statistics, filteredLogs }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('timeline');

  // ===========================================================================
  // BAR CHART COMPONENT (EXACTLY AS IN IMAGE 2)
  // ===========================================================================

  interface BarChartProps {
    data: Array<{ label: string; value: number; color?: string }>;
    maxValue?: number;
  }

  const BarChart: React.FC<BarChartProps> = ({ data, maxValue }) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);

    return (
      <div className="bar-chart">
        {data.map((item, index) => (
          <div key={index} className="bar-chart-item">
            <div className="bar-label" style={item.color ? {
              background: item.color,
              color: ['#ffc107', '#fd7e14'].includes(item.color) ? '#000' : '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '11px',
              minWidth: '80px',
              textAlign: 'left',
            } : { minWidth: '100px' }}>
              {item.label}
            </div>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color || '#0d6efd',
                  height: '20px',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div className="bar-value" style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700 }}>
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ===========================================================================
  // PREPARE CHART DATA (MATCHING IMAGE 2)
  // ===========================================================================

  // Log Types Distribution (replaces "Log Levels" from image)
  // Shows: INFO (9,373), WARN (12), ERROR (4), etc.
  const logTypesData = Object.entries(statistics.byType)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({
      label: type,
      value: count,
      color: LOG_TYPE_COLORS[type as LogType],
    }));

  // TOP ACTIVE NODES (EXACTLY AS IN IMAGE 2)
  // Shows: optimusdb2 (3,351), optimusdb1 (3,303), optimusdb3 (2,735)
  const topNodesData = Object.entries(statistics.byNode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([node, count]) => ({
      label: node,
      value: count,
    }));

  // Top Log Types (replaces "Top Categories" from image)
  // Categories now represented by Log Types
  const topTypesData = Object.entries(statistics.byType)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({
      label: type,
      value: count,
      color: LOG_TYPE_COLORS[type as LogType],
    }));

  // ===========================================================================
  // RENDER - THREE-PANEL LAYOUT (EXACTLY AS IN IMAGE 2)
  // ===========================================================================

  return (
    <div className="log-charts-section">
      {/* THREE CHART PANELS (EXACTLY AS IN IMAGE 2) */}
      <div className="charts-grid-three-panel">

        {/* PANEL 1: Log Levels → Log Types */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <span className="chart-icon">📊</span>
            <h3>Log Types</h3>
          </div>
          <div className="chart-panel-content">
            <BarChart data={logTypesData} />
          </div>
        </div>

        {/* PANEL 2: TOP ACTIVE NODES (PRESERVED EXACTLY) */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <span className="chart-icon">💻</span>
            <h3>Top Active Nodes</h3>
          </div>
          <div className="chart-panel-content">
            <BarChart data={topNodesData} />
          </div>
        </div>

        {/* PANEL 3: Top Categories → Top Log Types */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <span className="chart-icon">📑</span>
            <h3>Top Log Types</h3>
          </div>
          <div className="chart-panel-content">
            <BarChart data={topTypesData} />
          </div>
        </div>

      </div>

      {/* METRICS TABS AT BOTTOM (EXACTLY AS IN IMAGE 2) */}
      <div className="metrics-tabs">
        <button
          className={`metric-tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📈 Timeline
        </button>
        <button
          className={`metric-tab ${activeTab === 'levels' ? 'active' : ''}`}
          onClick={() => setActiveTab('levels')}
        >
          📊 Levels
        </button>
        <button
          className={`metric-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📑 Categories
        </button>
        <button
          className={`metric-tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          💻 Nodes
        </button>
      </div>

      {/* TAB CONTENT (Expandable detailed view) */}
      {activeTab !== 'timeline' && (
        <div className="metrics-tab-content">
          {activeTab === 'levels' && (
            <div className="chart-detail-view">
              <h4>Detailed Log Types Distribution</h4>
              <BarChart data={logTypesData} />
            </div>
          )}
          {activeTab === 'categories' && (
            <div className="chart-detail-view">
              <h4>Top Log Types by Volume</h4>
              <BarChart data={topTypesData} />
            </div>
          )}
          {activeTab === 'nodes' && (
            <div className="chart-detail-view">
              <h4>Node Activity Distribution</h4>
              <BarChart data={topNodesData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogCharts;
