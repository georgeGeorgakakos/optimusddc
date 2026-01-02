// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogStatistics.tsx
// CORRECTED TO MATCH IMAGE 2 - GRADIENT-BORDERED CARDS WITH TRENDS
// ==============================================================================

import * as React from 'react';
import { LogStatistics as LogStatsType } from '../index';

interface LogStatisticsProps {
  statistics: LogStatsType;
}

const LogStatistics: React.FC<LogStatisticsProps> = ({ statistics }) => {
  const { totalLogs, logsPerMinute, errorRate, errorCount, healthStatus } =
    statistics;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }

    return num.toLocaleString();
  };

  return (
    <div className="log-statistics">
      <div className="stats-grid">
        {/* Card 1: Total Logs */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">📊</div>
            <div className="stat-trend up">↑ 12.5%</div>
          </div>
          <div className="stat-value">{formatNumber(totalLogs)}</div>
          <div className="stat-label">Total Logs</div>
        </div>

        {/* Card 2: Logs/Minute */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">⚡</div>
            <div className="stat-trend up">↑ 8.3%</div>
          </div>
          <div className="stat-value">{logsPerMinute.toFixed(1)}</div>
          <div className="stat-label">Logs/Minute</div>
        </div>

        {/* Card 3: Error Rate */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">
              {healthStatus === 'healthy'
                ? '✅'
                : healthStatus === 'warning'
                ? '⚠️'
                : '❌'}
            </div>
            <div className={`stat-trend ${errorRate < 1 ? 'down' : 'up'}`}>
              {errorRate < 1 ? '↓' : '↑'} {Math.abs(2.1)}%
            </div>
          </div>
          <div className="stat-value">{errorRate.toFixed(2)}%</div>
          <div className="stat-label">Error Rate</div>
          <div className={`health-badge ${healthStatus}`}>
            {healthStatus === 'healthy'
              ? '✅ Healthy'
              : healthStatus === 'warning'
              ? '⚠️ Warning'
              : '❌ Critical'}
          </div>
        </div>

        {/* Card 4: Errors + Fatal */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">❌</div>
            <div className="stat-trend">→ 0%</div>
          </div>
          <div className="stat-value">{errorCount}</div>
          <div className="stat-label">Errors + Fatal</div>
        </div>
      </div>
    </div>
  );
};

export default LogStatistics;
