// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogStatistics.tsx
// UPDATED FOR OPTIMUSDB LOGGER INTEGRATION
// ==============================================================================

import * as React from 'react';
import { LogStatistics as LogStatsType } from '../index';

interface LogStatisticsProps {
  statistics: LogStatsType;
}

const LogStatistics: React.FC<LogStatisticsProps> = ({ statistics }) => {
  const {
    totalLogs,
    logsPerMinute,
    errorRate,
    errorCount,
    healthStatus,
  } = statistics;

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Health status badge
  const getHealthBadge = () => {
    switch (healthStatus) {
      case 'healthy':
        return <span className="health-badge healthy">✅ Healthy</span>;
      case 'warning':
        return <span className="health-badge warning">⚠️ Warning</span>;
      case 'critical':
        return <span className="health-badge critical">❌ Critical</span>;
      default:
        return null;
    }
  };

  return (
    <div className="log-statistics">
      {/* Total Logs */}
      <div className="stat-card">
        <div className="stat-icon">📝</div>
        <div className="stat-content">
          <div className="stat-value">{formatNumber(totalLogs)}</div>
          <div className="stat-label">Total Logs</div>
        </div>
      </div>

      {/* Logs per Minute */}
      <div className="stat-card">
        <div className="stat-icon">⚡</div>
        <div className="stat-content">
          <div className="stat-value">{logsPerMinute.toFixed(1)}</div>
          <div className="stat-label">Logs/Minute</div>
        </div>
      </div>

      {/* Error Rate */}
      <div className="stat-card">
        <div className="stat-icon">
          {healthStatus === 'healthy' ? '✅' : healthStatus === 'warning' ? '⚠️' : '❌'}
        </div>
        <div className="stat-content">
          <div className="stat-value">{errorRate.toFixed(2)}%</div>
          <div className="stat-label">Error Rate</div>
          {getHealthBadge()}
        </div>
      </div>

      {/* Error Count */}
      <div className="stat-card">
        <div className="stat-icon">❌</div>
        <div className="stat-content">
          <div className="stat-value">{errorCount}</div>
          <div className="stat-label">Errors + Fatal</div>
        </div>
      </div>
    </div>
  );
};

export default LogStatistics;
