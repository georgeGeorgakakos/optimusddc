// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogStatistics.tsx
// ==============================================================================

import * as React from 'react';
import { LogStatistics as LogStatisticsType } from '../index';

interface LogStatisticsProps {
  statistics: LogStatisticsType;
}

const LogStatistics: React.FC<LogStatisticsProps> = ({ statistics }) => {
  const getErrorRateColor = (rate: number): string => {
    if (rate < 1) return '#4ec9b0';
    if (rate < 5) return '#ff9800';

    return '#f48771';
  };

  const getErrorRateStatus = (rate: number): string => {
    if (rate < 1) return '✅ Healthy';
    if (rate < 5) return '⚠️ Warning';

    return '🚨 Critical';
  };

  const topNodes = Object.entries(statistics.byNode)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topCategories = Object.entries(statistics.byCategory)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0)
    .slice(0, 5);

  return (
    <div className="log-statistics">
      {/* Main Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">
              {statistics.totalLogs.toLocaleString()}
            </div>
            <div className="stat-label">Total Logs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">
              {statistics.logsPerMinute.toFixed(1)}
            </div>
            <div className="stat-label">Logs/Minute</div>
          </div>
        </div>

        <div className="stat-card error-rate">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div
              className="stat-value"
              style={{ color: getErrorRateColor(statistics.errorRate) }}
            >
              {statistics.errorRate.toFixed(2)}%
            </div>
            <div className="stat-label">
              Error Rate {getErrorRateStatus(statistics.errorRate)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value error-count">
              {(
                statistics.byLevel.ERROR + statistics.byLevel.FATAL
              ).toLocaleString()}
            </div>
            <div className="stat-label">Errors + Fatal</div>
          </div>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="stats-details">
        {/* Log Levels Distribution */}
        <div className="stat-detail-card">
          <h4>📊 Log Levels</h4>
          <div className="distribution-list">
            {Object.entries(statistics.byLevel)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([level, count]) => {
                const percentage = (count / statistics.totalLogs) * 100;
                const color =
                  {
                    DEBUG: '#858585',
                    INFO: '#4ec9b0',
                    WARN: '#ff9800',
                    ERROR: '#f48771',
                    FATAL: '#ff0000',
                  }[level] || '#d4d4d4';

                return (
                  <div key={level} className="distribution-item">
                    <div className="distribution-label">
                      <span style={{ color }}>{level}</span>
                      <span className="distribution-count">
                        {count.toLocaleString()}
                      </span>
                    </div>
                    <div className="distribution-bar">
                      <div
                        className="distribution-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Nodes */}
        <div className="stat-detail-card">
          <h4>🖥️ Top Active Nodes</h4>
          <div className="distribution-list">
            {topNodes.map(([nodeId, count]) => {
              const percentage = (count / statistics.totalLogs) * 100;

              return (
                <div key={nodeId} className="distribution-item">
                  <div className="distribution-label">
                    <span>{nodeId}</span>
                    <span className="distribution-count">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#007acc',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Categories */}
        <div className="stat-detail-card">
          <h4>🏷️ Top Categories</h4>
          <div className="distribution-list">
            {topCategories.map(([category, count]) => {
              const percentage = (count / statistics.totalLogs) * 100;
              const icon =
                {
                  QUERY: '🔍',
                  PEER: '👥',
                  ELECTION: '👑',
                  DATABASE: '💾',
                  NETWORK: '🌐',
                  ORBITDB: '📦',
                  ERROR: '🚨',
                  SYSTEM: '⚙️',
                  OTHER: '📝',
                }[category] || '📝';

              return (
                <div key={category} className="distribution-item">
                  <div className="distribution-label">
                    <span>
                      {icon} {category}
                    </span>
                    <span className="distribution-count">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#4ec9b0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogStatistics;
