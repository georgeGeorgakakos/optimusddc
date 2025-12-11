// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogCharts.tsx
// ==============================================================================

import * as React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LogEntry, LogStatistics as LogStatisticsType } from '../index';

interface LogChartsProps {
  logs: LogEntry[];
  statistics: LogStatisticsType;
}

const LogCharts: React.FC<LogChartsProps> = ({ logs, statistics }) => {
  const [selectedChart, setSelectedChart] = React.useState<'timeline' | 'levels' | 'categories' | 'nodes'>('timeline');

  // ===========================================================================
  // Prepare Time-Series Data
  // ===========================================================================

  const timeSeriesData = React.useMemo(() => {
    if (logs.length === 0) return [];

    // Group logs by minute
    const groupedByMinute: Record<string, any> = {};

    logs.forEach(log => {
      const minute = new Date(log.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();

      if (!groupedByMinute[key]) {
        groupedByMinute[key] = {
          timestamp: minute,
          time: minute.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          total: 0,
          DEBUG: 0,
          INFO: 0,
          WARN: 0,
          ERROR: 0,
          FATAL: 0,
        };
      }

      groupedByMinute[key].total++;
      groupedByMinute[key][log.level]++;
    });

    // Sort by time
    return Object.values(groupedByMinute).sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }, [logs]);

  // ===========================================================================
  // Prepare Level Distribution Data
  // ===========================================================================

  const levelDistributionData = React.useMemo(() => {
    return Object.entries(statistics.byLevel)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        name: level,
        value: count,
        percentage: ((count / statistics.totalLogs) * 100).toFixed(1),
      }));
  }, [statistics]);

  // ===========================================================================
  // Prepare Category Distribution Data
  // ===========================================================================

  const categoryDistributionData = React.useMemo(() => {
    return Object.entries(statistics.byCategory)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({
        name: category,
        value: count,
        percentage: ((count / statistics.totalLogs) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);
  }, [statistics]);

  // ===========================================================================
  // Prepare Node Distribution Data
  // ===========================================================================

  const nodeDistributionData = React.useMemo(() => {
    return Object.entries(statistics.byNode)
      .map(([nodeId, count]) => ({
        name: nodeId,
        value: count,
        percentage: ((count / statistics.totalLogs) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);
  }, [statistics]);

  // ===========================================================================
  // Colors
  // ===========================================================================

  const LEVEL_COLORS: Record<string, string> = {
    DEBUG: '#858585',
    INFO: '#4ec9b0',
    WARN: '#ff9800',
    ERROR: '#f48771',
    FATAL: '#ff0000',
  };

  const CATEGORY_COLORS = [
    '#007acc', '#4ec9b0', '#ff9800', '#f48771', '#9cdcfe',
    '#dcdcaa', '#c586c0', '#569cd6', '#ce9178',
  ];

  // ===========================================================================
  // Render Charts
  // ===========================================================================

  return (
    <div className="log-charts">
      <div className="charts-header">
        <h3>📈 Metrics</h3>
        <div className="chart-tabs">
          <button
            className={`chart-tab ${selectedChart === 'timeline' ? 'active' : ''}`}
            onClick={() => setSelectedChart('timeline')}
          >
            📊 Timeline
          </button>
          <button
            className={`chart-tab ${selectedChart === 'levels' ? 'active' : ''}`}
            onClick={() => setSelectedChart('levels')}
          >
            🎯 Levels
          </button>
          <button
            className={`chart-tab ${selectedChart === 'categories' ? 'active' : ''}`}
            onClick={() => setSelectedChart('categories')}
          >
            🏷️ Categories
          </button>
          <button
            className={`chart-tab ${selectedChart === 'nodes' ? 'active' : ''}`}
            onClick={() => setSelectedChart('nodes')}
          >
            🖥️ Nodes
          </button>
        </div>
      </div>

      <div className="charts-content">
        {selectedChart === 'timeline' && (
          <div className="chart-container">
            <h4>Log Activity Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="time"
                  stroke="#d4d4d4"
                  tick={{ fill: '#d4d4d4' }}
                />
                <YAxis
                  stroke="#d4d4d4"
                  tick={{ fill: '#d4d4d4' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#d4d4d4',
                  }}
                />
                <Legend wrapperStyle={{ color: '#d4d4d4' }} />
                <Area
                  type="monotone"
                  dataKey="ERROR"
                  stackId="1"
                  stroke={LEVEL_COLORS.ERROR}
                  fill={LEVEL_COLORS.ERROR}
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="WARN"
                  stackId="1"
                  stroke={LEVEL_COLORS.WARN}
                  fill={LEVEL_COLORS.WARN}
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="INFO"
                  stackId="1"
                  stroke={LEVEL_COLORS.INFO}
                  fill={LEVEL_COLORS.INFO}
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="DEBUG"
                  stackId="1"
                  stroke={LEVEL_COLORS.DEBUG}
                  fill={LEVEL_COLORS.DEBUG}
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="chart-insights">
              <div className="insight">
                <span className="insight-label">Peak Activity:</span>
                <span className="insight-value">
                  {Math.max(...timeSeriesData.map(d => d.total))} logs/min
                </span>
              </div>
              <div className="insight">
                <span className="insight-label">Time Range:</span>
                <span className="insight-value">
                  {timeSeriesData.length > 0 ? `${timeSeriesData.length} minutes` : '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedChart === 'levels' && (
          <div className="chart-container">
            <div className="chart-split">
              <div className="chart-half">
                <h4>Log Levels Distribution (Pie Chart)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={levelDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(1)}%`}
                    >
                      {levelDistributionData.map((entry, index) => (
                        <Cell key={index} fill={LEVEL_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#d4d4d4',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-half">
                <h4>Log Levels Distribution (Bar Chart)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={levelDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="name"
                      stroke="#d4d4d4"
                      tick={{ fill: '#d4d4d4' }}
                    />
                    <YAxis
                      stroke="#d4d4d4"
                      tick={{ fill: '#d4d4d4' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#d4d4d4',
                      }}
                    />
                    <Bar dataKey="value">
                      {levelDistributionData.map((entry, index) => (
                        <Cell key={index} fill={LEVEL_COLORS[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedChart === 'categories' && (
          <div className="chart-container">
            <h4>Log Categories Distribution</h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryDistributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  type="number"
                  stroke="#d4d4d4"
                  tick={{ fill: '#d4d4d4' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#d4d4d4"
                  tick={{ fill: '#d4d4d4' }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#d4d4d4',
                  }}
                  formatter={(value: any) => [`${value} logs`, 'Count']}
                />
                <Bar dataKey="value">
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="chart-insights">
              <div className="insight">
                <span className="insight-label">Most Common:</span>
                <span className="insight-value">
                  {categoryDistributionData[0]?.name || '-'} ({categoryDistributionData[0]?.percentage || '0'}%)
                </span>
              </div>
              <div className="insight">
                <span className="insight-label">Total Categories:</span>
                <span className="insight-value">
                  {categoryDistributionData.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedChart === 'nodes' && (
          <div className="chart-container">
            <h4>Log Distribution Across Nodes</h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={nodeDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="name"
                  stroke="#d4d4d4"
                  tick={{ fill: '#d4d4d4' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#d4d4d4" tick={{ fill: '#d4d4d4' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#d4d4d4',
                  }}
                  formatter={(value: any) => [`${value} logs`, 'Count']}
                />
                <Bar dataKey="value" fill="#007acc" />
              </BarChart>
            </ResponsiveContainer>

            <div className="chart-insights">
              <div className="insight">
                <span className="insight-label">Most Active Node:</span>
                <span className="insight-value">
                  {nodeDistributionData[0]?.name || '-'} ({nodeDistributionData[0]?.percentage || '0'}%)
                </span>
              </div>
              <div className="insight">
                <span className="insight-label">Total Nodes:</span>
                <span className="insight-value">{nodeDistributionData.length}</span>
              </div>
              <div className="insight">
                <span className="insight-label">Avg Logs/Node:</span>
                <span className="insight-value">
                  {nodeDistributionData.length > 0
                    ? Math.round(
                      statistics.totalLogs / nodeDistributionData.length
                    )
                    : 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogCharts;
