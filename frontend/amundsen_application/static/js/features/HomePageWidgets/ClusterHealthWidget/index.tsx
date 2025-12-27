// ClusterHealthWidget.tsx - COMPLETE FIX

import * as React from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
import type { OptimusDBNode } from 'config/apiConfig';
import './styles.scss';

interface NodeHealth {
  nodeId: number;
  nodeName: string;
  online: boolean;
  healthScore: number;
  role: string;
  isLeader: boolean;
  error?: string;
  responseTime?: number;
}

interface HealthHistory {
  timestamp: number;
  averageHealth: number;
  activeNodes: number;
}

interface ClusterHealth {
  totalNodes: number;
  activeNodes: number;
  healthyNodes: number;
  warningNodes: number; // ✅ RENAMED from degradedNodes
  criticalNodes: number;
  networkStatus: 'optimal' | 'warning' | 'offline'; // ✅ RENAMED from healthy/degraded
  consensusActive: boolean;
  p2pConnections: number;
  maxP2pConnections: number;
  averageHealth: number;
  lastSync: string;
  nodeDetails: NodeHealth[];
  healthTrend: 'improving' | 'stable' | 'degrading';
  predictedHealth: number;
}

const ClusterHealthWidget: React.FC = () => {
  const [health, setHealth] = React.useState<ClusterHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [history, setHistory] = React.useState<HealthHistory[]>([]);
  const [availableNodes, setAvailableNodes] = React.useState<OptimusDBNode[]>(
    []
  );

  // Calculate health trend
  const calculateTrend = React.useCallback(
    (
      historyData: HealthHistory[]
    ): {
      trend: 'improving' | 'stable' | 'degrading';
      prediction: number;
    } => {
      if (historyData.length < 3) {
        return { trend: 'stable', prediction: 0 };
      }

      const recentHistory = historyData.slice(-10);
      const n = recentHistory.length;
      const sumX = recentHistory.reduce((sum, _, i) => sum + i, 0);
      const sumY = recentHistory.reduce((sum, h) => sum + h.averageHealth, 0);
      const sumXY = recentHistory.reduce(
        (sum, h, i) => sum + i * h.averageHealth,
        0
      );
      const sumXX = recentHistory.reduce((sum, _, i) => sum + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const avgY = sumY / n;
      const avgX = sumX / n;
      const intercept = avgY - slope * avgX;
      const prediction = Math.max(0, Math.min(100, slope * n + intercept));

      let trend: 'improving' | 'stable' | 'degrading';

      if (slope < -2) {
        trend = 'improving';
      } else if (slope > 2) {
        trend = 'degrading';
      } else {
        trend = 'stable';
      }

      return { trend, prediction };
    },
    []
  );

  // Fetch cluster health
  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const nodes = await getAvailableNodes();
        const totalNodes = nodes.length;

        console.log(
          `[ClusterHealth] Checking ${totalNodes} nodes:`,
          nodes.map((n) => n.name)
        );
        setAvailableNodes(nodes);

        const startTime = Date.now();
        const nodeHealthPromises = nodes.map(async (node) => {
          const nodeStartTime = Date.now();

          try {
            const apiUrl = buildApiUrl(
              'optimusdb',
              '/swarmkb/agent/status',
              node.id
            );
            const response = await fetch(apiUrl, {
              signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const responseTime = Date.now() - nodeStartTime;

            return {
              nodeId: node.id,
              nodeName: node.name,
              online: true,
              healthScore: parseFloat(data.agent?.health?.score || '0'),
              role: data.agent?.role || 'unknown',
              isLeader: data.agent?.is_current_leader || false,
              responseTime,
            } as NodeHealth;
          } catch (err) {
            return {
              nodeId: node.id,
              nodeName: node.name,
              online: false,
              healthScore: 0,
              role: 'unknown',
              isLeader: false,
              error: err instanceof Error ? err.message : 'Offline',
              responseTime: Date.now() - nodeStartTime,
            } as NodeHealth;
          }
        });

        const nodeDetails = await Promise.all(nodeHealthPromises);
        const fetchDuration = Date.now() - startTime;

        console.log(
          `[ClusterHealth] Fetched ${nodeDetails.length} nodes in ${fetchDuration}ms`
        );

        const activeNodes = nodeDetails.filter((n) => n.online).length;
        const healthyNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore <= 40
        ).length;
        const warningNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore > 40 && n.healthScore <= 70
        ).length;
        const criticalNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore > 70
        ).length;

        const totalHealth = nodeDetails
          .filter((n) => n.online)
          .reduce((sum, n) => sum + n.healthScore, 0);
        const averageHealth = activeNodes > 0 ? totalHealth / activeNodes : 0;

        const consensusActive = nodeDetails.some((n) => n.isLeader);

        const maxP2pConnections =
          activeNodes > 1 ? (activeNodes * (activeNodes - 1)) / 2 : 0;
        const p2pConnections = maxP2pConnections;

        // ✅ UPDATED: Better network status logic
        let networkStatus: 'optimal' | 'warning' | 'offline';

        if (activeNodes === 0) {
          networkStatus = 'offline';
        } else if (activeNodes === totalNodes && averageHealth <= 40) {
          networkStatus = 'optimal';
        } else {
          networkStatus = 'warning';
        }

        const newHistoryEntry: HealthHistory = {
          timestamp: Date.now(),
          averageHealth,
          activeNodes,
        };

        setHistory((prev) => {
          const updated = [...prev, newHistoryEntry].slice(-20);

          return updated;
        });

        const { trend, prediction } = calculateTrend([
          ...history,
          newHistoryEntry,
        ]);

        setHealth({
          totalNodes,
          activeNodes,
          healthyNodes,
          warningNodes,
          criticalNodes,
          networkStatus,
          consensusActive,
          p2pConnections: Math.round(p2pConnections),
          maxP2pConnections: Math.round(maxP2pConnections),
          averageHealth,
          lastSync: new Date().toLocaleTimeString(),
          nodeDetails,
          healthTrend: trend,
          predictedHealth: prediction,
        });

        setLoading(false);
        setError(false);
      } catch (err) {
        console.error('Failed to fetch OptimusDB cluster health:', err);
        setLoading(false);
        setError(true);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);

    return () => clearInterval(interval);
  }, [calculateTrend, history]);

  if (loading) {
    return (
      <div className="cluster-health-widget">
        <div className="widget-header">
          <div className="header-content">
            <div className="icon-wrapper">
              <span className="widget-icon">🌐</span>
            </div>
            <div className="header-text">
              <h3>Cluster Health</h3>
              <p className="subtitle">OptimusDB Network Status</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Scanning cluster nodes...</p>
            <span className="loading-hint">Detecting available agents</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="cluster-health-widget">
        <div className="widget-header">
          <div className="header-content">
            <div className="icon-wrapper">
              <span className="widget-icon">🌐</span>
            </div>
            <div className="header-text">
              <h3>Cluster Health</h3>
              <p className="subtitle">OptimusDB Network Status</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>Unable to connect to cluster</p>
            <span className="error-hint">
              Check if OptimusDB agents are running
            </span>
          </div>
        </div>
      </div>
    );
  }





  const nodeHealthPercentage = (health.activeNodes / health.totalNodes) * 100;
  const connectivityPercentage =
    health.maxP2pConnections > 0
      ? (health.p2pConnections / health.maxP2pConnections) * 100
      : 0;

  return (
    <div className="cluster-health-widget">
      {/* HEADER */}
      <div className="widget-header">
        <div className="header-content">
          <div className="icon-wrapper">
            <span className="widget-icon">🌐</span>
          </div>
          <div className="header-text">
            <h3>Cluster Health Monitor</h3>
            <p className="subtitle">
              {health.totalNodes} Agent{health.totalNodes !== 1 ? 's' : ''}{' '}
              Detected
            </p>
          </div>
        </div>
        <div className={`status-badge status-${health.networkStatus}`}>
          <span className="status-dot" />
          <span className="status-text">
            {health.networkStatus === 'optimal' && '✓ Optimal'}
            {health.networkStatus === 'warning' && '⚠ Warning'}
            {health.networkStatus === 'offline' && '✗ Offline'}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="widget-body">
        {/* PRIMARY METRICS */}
        <div className="metrics-grid">
          {/* Nodes Health Circle */}
          <div className="metric-card primary">
            <div className="metric-visual">
              <svg className="progress-ring" width="160" height="160">
                <circle className="progress-ring-bg" cx="80" cy="80" r="70" />
                <circle
                  className={`progress-ring-fill ${health.networkStatus}`}
                  cx="80"
                  cy="80"
                  r="70"
                  strokeDasharray={`${(nodeHealthPercentage / 100) * 440} 440`}
                />
              </svg>
              <div className="metric-value">
                <span className="value-large">{health.activeNodes}</span>
                <span className="value-small">/{health.totalNodes}</span>
                <span className="value-label">AGENTS</span>
              </div>
            </div>
            <div className="metric-footer">
              <span className="footer-label">Agents Online</span>
              <span className="footer-value">
                {Math.round(nodeHealthPercentage)}%
              </span>
            </div>
          </div>

          {/* Average Utilization */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">📊</span>
              <span className="metric-title">Resource Usage</span>
            </div>
            <div className="metric-content">
              <div className="value-display">
                <span className="value-huge">
                  {Math.round(health.averageHealth)}
                </span>
                <span className="value-unit">%</span>
              </div>
              <div className="utilization-bar">
                <div
                  className={`utilization-fill ${
                    health.averageHealth <= 40
                      ? 'low'
                      : health.averageHealth <= 70
                      ? 'moderate'
                      : 'high'
                  }`}
                  style={{ width: `${health.averageHealth}%` }}
                />
              </div>
              <div className="utilization-label">
                {health.averageHealth <= 40 && '✓ LOW LOAD - HEALTHY'}
                {health.averageHealth > 40 &&
                  health.averageHealth <= 70 &&
                  '⚠ MODERATE LOAD'}
                {health.averageHealth > 70 && '✗ HIGH LOAD - CRITICAL'}
              </div>
            </div>
          </div>

          {/* P2P Mesh */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">🔗</span>
              <span className="metric-title">P2P Network</span>
            </div>
            <div className="metric-content">
              <div className="value-display">
                <span className="value-huge">{health.p2pConnections}</span>
                <span className="value-small">/{health.maxP2pConnections}</span>
              </div>
              <div className="connectivity-bar">
                <div
                  className="connectivity-fill"
                  style={{ width: `${connectivityPercentage}%` }}
                />
              </div>
              <div className="connectivity-info">
                <span className="info-text">Full Mesh Topology</span>
                <span className="info-formula">
                  N×(N-1)/2 = {health.maxP2pConnections}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HEALTH DISTRIBUTION */}
        <div className="health-distribution">
          <div className="distribution-header">
            <span className="dist-title">
              Resource Utilization Distribution
            </span>
            <span className="dist-subtitle">
              Lower is better - shows available capacity
            </span>
          </div>
          <div className="distribution-cards">
            <div className="dist-card healthy">
              <div className="dist-icon">✓</div>
              <div className="dist-details">
                <span className="dist-label">Healthy</span>
                <span className="dist-range">0-40% Usage</span>
              </div>
              <div className="dist-count">{health.healthyNodes}</div>
            </div>
            <div className="dist-card warning">
              <div className="dist-icon">⚠</div>
              <div className="dist-details">
                <span className="dist-label">Warning</span>
                <span className="dist-range">40-70% Usage</span>
              </div>
              <div className="dist-count">{health.warningNodes}</div>
            </div>
            <div className="dist-card critical">
              <div className="dist-icon">✗</div>
              <div className="dist-details">
                <span className="dist-label">Critical</span>
                <span className="dist-range">&gt;70% Usage</span>
              </div>
              <div className="dist-count">{health.criticalNodes}</div>
            </div>
          </div>
        </div>

        {/* HEALTH TREND - FIXED SPARKLINE */}
        <div className="health-trend-section">
          <div className="trend-header">
            <span className="trend-title">
              Utilization Trend (Last 5 Minutes)
            </span>
            <div className={`trend-indicator trend-${health.healthTrend}`}>
              {health.healthTrend === 'improving' && '↓ Load Decreasing'}
              {health.healthTrend === 'stable' && '→ Stable'}
              {health.healthTrend === 'degrading' && '↑ Load Increasing'}
            </div>
          </div>
          <div className="trend-content">
            <div className="sparkline-container">
              {history.length > 1 ? (
                <svg
                  className="sparkline"
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="sparkGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#667eea" stopOpacity="0.4" />
                      <stop
                        offset="100%"
                        stopColor="#667eea"
                        stopOpacity="0.05"
                      />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path
                    d={
                      history
                        .map((h, i) => {
                          const x = (i / (history.length - 1)) * 300;
                          const y = 80 - (h.averageHealth / 100) * 80;

                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ') + ' L 300 80 L 0 80 Z'
                    }
                    fill="url(#sparkGradient)"
                  />

                  {/* Line */}
                  <polyline
                    points={history
                      .map((h, i) => {
                        const x = (i / (history.length - 1)) * 300;
                        const y = 80 - (h.averageHealth / 100) * 80;

                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {history.map((h, i) => {
                    const x = (i / (history.length - 1)) * 300;
                    const y = 80 - (h.averageHealth / 100) * 80;

                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#667eea"
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              ) : (
                <div className="no-data">Collecting data...</div>
              )}
            </div>
            <div className="prediction-box">
              <span className="prediction-label">PREDICTED</span>
              <span className="prediction-value">
                {Math.round(health.predictedHealth)}%
              </span>
              <span className="prediction-sublabel">Next Reading</span>
            </div>
          </div>
        </div>

        {/* CONSENSUS */}
        <div className="consensus-section">
          <div
            className={`consensus-card ${
              health.consensusActive ? 'active' : 'inactive'
            }`}
          >
            <div className="consensus-icon">
              {health.consensusActive ? '✓' : '✗'}
            </div>
            <div className="consensus-details">
              <span className="consensus-label">CONSENSUS PROTOCOL</span>
              <span className="consensus-status">
                {health.consensusActive
                  ? 'Active & Synchronized'
                  : 'Not Active'}
              </span>
            </div>
            {health.consensusActive && (
              <div className="consensus-leader">
                <span className="leader-badge">⭐ COORDINATOR ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* INDIVIDUAL NODES */}
        <details className="node-details-panel" open>
          <summary className="node-details-header">
            <span className="details-title">
              Individual Agent Status ({health.totalNodes} Agents)
            </span>
            <svg
              className="chevron"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19 9l-7 7-7-7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </summary>
          <div className="node-grid">
            {health.nodeDetails.map((node) => (
              <div
                key={node.nodeId}
                className={`node-card ${node.online ? 'online' : 'offline'}`}
              >
                <div className="node-card-header">
                  <div className="node-info">
                    <span className="node-name">{node.nodeName}</span>
                    <span className="node-role">
                      {node.isLeader ? '⭐ Coordinator' : node.role}
                    </span>
                  </div>
                  <div
                    className={`node-status-dot ${
                      node.online ? 'online' : 'offline'
                    }`}
                  />
                </div>

                {node.online ? (
                  <div className="node-card-body">
                    <div className="node-utilization">
                      <div className="util-header">
                        <span className="util-label">RESOURCE USAGE</span>
                        <span className="util-value">
                          {Math.round(node.healthScore)}%
                        </span>
                      </div>
                      <div className="util-bar-container">
                        <div
                          className={`util-bar ${
                            node.healthScore <= 40
                              ? 'low'
                              : node.healthScore <= 70
                              ? 'moderate'
                              : 'high'
                          }`}
                          style={{ width: `${node.healthScore}%` }}
                        />
                      </div>
                      <div className="util-status">
                        {node.healthScore <= 40 && '✓ Healthy'}
                        {node.healthScore > 40 &&
                          node.healthScore <= 70 &&
                          '⚠ Warning'}
                        {node.healthScore > 70 && '✗ Critical'}
                      </div>
                    </div>
                    {node.responseTime && (
                      <div className="node-response-time">
                        <span className="response-label">RESPONSE TIME</span>
                        <span className="response-value">
                          {node.responseTime}ms
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="node-card-body offline-body">
                    <span className="offline-message">AGENT OFFLINE</span>
                    {node.error && (
                      <span className="error-message">{node.error}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>

        {/* FOOTER */}
        <div className="widget-footer">
          <div className="footer-left">
            <span className="footer-icon">🕐</span>
            <span className="footer-text">Last update: {health.lastSync}</span>
          </div>
          <div className="footer-right">
            <a href="/#/agent-topology" className="footer-link">
              🗺️ View Network Topology →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterHealthWidget;
