// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogStatistics.tsx
// CORRECTED TO MATCH IMAGE 2 - GRADIENT-BORDERED CARDS WITH TRENDS
// UPDATED: Dynamic labels based on filtered log types
// ==============================================================================

import * as React from 'react';
import { LogStatistics as LogStatsType, LogFiltersState } from '../index';

interface LogStatisticsProps {
  statistics: LogStatsType;
  filters: LogFiltersState;
}

const LogStatistics: React.FC<LogStatisticsProps> = ({
  statistics,
  filters,
}) => {
  const {
    totalLogs,
    logsPerMinute,
    errorRate,
    errorCount,
    warningCount,
    healthStatus,
  } = statistics;

  // Determine what types are being shown
  const hasErrorFilter =
    filters.types.length === 0 || filters.types.includes('ERROR');
  const hasWarnFilter =
    filters.types.length === 0 || filters.types.includes('WARN');
  const onlyErrors =
    filters.types.length === 1 && filters.types.includes('ERROR');
  const onlyWarnings =
    filters.types.length === 1 && filters.types.includes('WARN');

  // Dynamic label for error rate card
  let errorRateLabel = 'Error & Warning Rate';
  let issueCount = errorCount + warningCount;
  let issueLabel = 'Errors + Warnings';

  if (onlyErrors) {
    errorRateLabel = 'Error Rate';
    issueCount = errorCount;
    issueLabel = 'Errors';
  } else if (onlyWarnings) {
    errorRateLabel = 'Warning Rate';
    issueCount = warningCount;
    issueLabel = 'Warnings';
  } else if (hasErrorFilter && !hasWarnFilter) {
    errorRateLabel = 'Error Rate';
    issueCount = errorCount;
    issueLabel = 'Errors';
  } else if (hasWarnFilter && !hasErrorFilter) {
    errorRateLabel = 'Warning Rate';
    issueCount = warningCount;
    issueLabel = 'Warnings';
  }

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

        {/* Card 3: Error/Warning Rate (Dynamic) */}
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
          <div className="stat-label">{errorRateLabel}</div>
          <div className={`health-badge ${healthStatus}`}>
            {healthStatus === 'healthy'
              ? '✅ Healthy'
              : healthStatus === 'warning'
              ? '⚠️ Warning'
              : '❌ Critical'}
          </div>
        </div>

        {/* Card 4: Issue Count (Dynamic) */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">{onlyWarnings ? '⚠️' : '❌'}</div>
            <div className="stat-trend">→ 0%</div>
          </div>
          <div className="stat-value">{issueCount}</div>
          <div className="stat-label">{issueLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default LogStatistics;
