// ClusterHealthWidget.tsx - COMPLETE REDESIGN
// Healthy: 0-60% (was 0-40%)
// Update: 60s (was 15s)
// Width: 15% wider
// Minimal clean design
// Sparkline visible below prediction
// Consensus compact in top row
// Agents collapsed by default
// Fixed topology link
// No colored borders
// Shows "X Agents, Y Connections"

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
  warningNodes: number;
  criticalNodes: number;
  networkStatus: 'optimal' | 'warning' | 'offline';
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
  const [availableNodes, setAvailableNodes] = React.useState<OptimusDBNode[]>([]);

  // Calculate health trend
  const calculateTrend = React.useCallback(
    (historyData: HealthHistory[]): { trend: 'improving' | 'stable' | 'degrading'; prediction: number } => {
      if (historyData.length < 3) {
        return { trend: 'stable', prediction: 0 };
      }

      const recentHistory = historyData.slice(-10);
      const n = recentHistory.length;
      const sumX = recentHistory.reduce((sum, _, i) => sum + i, 0);
      const sumY = recentHistory.reduce((sum, h) => sum + h.averageHealth, 0);
      const sumXY = recentHistory.reduce((sum, h, i) => sum + i * h.averageHealth, 0);
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

        console.log(`[ClusterHealth] Checking ${totalNodes} nodes:`, nodes.map((n) => n.name));
        setAvailableNodes(nodes);

        const startTime = Date.now();
        const nodeHealthPromises = nodes.map(async (node) => {
          const nodeStartTime = Date.now();

          try {
            const apiUrl = buildApiUrl('optimusdb', '/swarmkb/agent/status', node.id);
            const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

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

        console.log(`[ClusterHealth] Fetched ${nodeDetails.length} nodes in ${fetchDuration}ms`);

        const activeNodes = nodeDetails.filter((n) => n.online).length;

        // NEW THRESHOLDS: 0-60% healthy, 60-80% warning, >80% critical
        const healthyNodes = nodeDetails.filter((n) => n.online && n.healthScore <= 60).length;
        const warningNodes = nodeDetails.filter((n) => n.online && n.healthScore > 60 && n.healthScore <= 80).length;
        const criticalNodes = nodeDetails.filter((n) => n.online && n.healthScore > 80).length;

        const totalHealth = nodeDetails.filter((n) => n.online).reduce((sum, n) => sum + n.healthScore, 0);
        const averageHealth = activeNodes > 0 ? totalHealth / activeNodes : 0;

        const consensusActive = nodeDetails.some((n) => n.isLeader);

        const maxP2pConnections = activeNodes > 1 ? (activeNodes * (activeNodes - 1)) / 2 : 0;
        const p2pConnections = maxP2pConnections;

        let networkStatus: 'optimal' | 'warning' | 'offline';
        if (activeNodes === 0) {
          networkStatus = 'offline';
        } else if (activeNodes === totalNodes && averageHealth <= 60) {
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

        const { trend, prediction } = calculateTrend([...history, newHistoryEntry]);

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
    // UPDATE INTERVAL: 60 seconds
    const interval = setInterval(fetchHealth, 60000);

    return () => clearInterval(interval);
  }, [calculateTrend, history]);

  if (loading) {
    return (
      <div className="cluster-health-widget">
        <div className="widget-header">
          <div className="header-left">
            <div className="header-icon">🌐</div>
            <div className="header-text">
              <h1>Cluster Health Monitor</h1>
              <p>Scanning cluster...</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Detecting agents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="cluster-health-widget">
        <div className="widget-header">
          <div className="header-left">
            <div className="header-icon">🌐</div>
            <div className="header-text">
              <h1>Cluster Health Monitor</h1>
              <p>Connection error</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>Unable to connect to cluster</p>
          </div>
        </div>
      </div>
    );
  }

  const nodeHealthPercentage = (health.activeNodes / health.totalNodes) * 100;
  const connectivityPercentage = health.maxP2pConnections > 0 ? (health.p2pConnections / health.maxP2pConnections) * 100 : 0;

  return (
    <div className="cluster-health-widget">
      {/* HEADER - MINIMAL */}
      <div className="widget-header">
        <div className="header-left">
          <div className="header-icon">🌐</div>
          <div className="header-text">
            <h1>Cluster Health Monitor</h1>
            {/* SHOWS AGENTS AND CONNECTIONS */}
            <p>
              {health.totalNodes} Agent{health.totalNodes !== 1 ? 's' : ''}, {health.p2pConnections} Connection
              {health.p2pConnections !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`status-badge status-${health.networkStatus}`}>
          <span className="status-dot" />
          <span className="status-text">
            {health.networkStatus === 'optimal' && '✓ OPTIMAL'}
            {health.networkStatus === 'warning' && '⚠ WARNING'}
            {health.networkStatus === 'offline' && '✗ OFFLINE'}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="widget-body">
        {/* TOP METRICS ROW - 4 COLUMNS */}
        <div className="top-metrics-row">
          {/* Agent Circle */}
          <div className="metric-card agents-circle">
            <div className="circle-chart">
              <svg className="progress-ring" width="120" height="120">
                <circle className="progress-ring-bg" cx="60" cy="60" r="52" />
                <circle
                  className={`progress-ring-fill ${health.networkStatus}`}
                  cx="60"
                  cy="60"
                  r="52"
                  strokeDasharray={`${(nodeHealthPercentage / 100) * 326.7} 326.7`}
                />
              </svg>
              <div className="circle-value">
                <span className="value-large">{health.activeNodes}</span>
                <span className="value-small">/{health.totalNodes}</span>
                <span className="value-label">AGENTS</span>
              </div>
            </div>
            <div className="metric-footer">
              <span>Online: {Math.round(nodeHealthPercentage)}%</span>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="metric-card">
            <div className="metric-header">📊 Resource Usage</div>
            <div className="metric-value">{Math.round(health.averageHealth)}%</div>
            <div className="metric-bar">
              <div
                className={`metric-bar-fill ${health.averageHealth <= 60 ? 'healthy' : health.averageHealth <= 80 ? 'warning' : 'critical'}`}
                style={{ width: `${health.averageHealth}%` }}
              />
            </div>
            <div className="metric-subtext">
              {health.averageHealth <= 60 && '✓ Healthy (0-60%)'}
              {health.averageHealth > 60 && health.averageHealth <= 80 && '⚠ Warning (60-80%)'}
              {health.averageHealth > 80 && '✗ Critical (>80%)'}
            </div>
          </div>

          {/* P2P Network */}
          <div className="metric-card">
            <div className="metric-header">🔗 P2P Network</div>
            <div className="metric-value">
              {health.p2pConnections}
              <span className="value-small">/{health.maxP2pConnections}</span>
            </div>
            <div className="metric-bar">
              <div className="metric-bar-fill p2p" style={{ width: `${connectivityPercentage}%` }} />
            </div>
            <div className="metric-subtext">Formula: N×(N-1)/2</div>
          </div>

          {/* CONSENSUS - COMPACT IN TOP ROW */}
          <div className="metric-card consensus-compact">
            <div className="metric-header">⚡ Consensus</div>
            <div className="consensus-status">
              <div className={`consensus-icon ${health.consensusActive ? 'active' : 'inactive'}`}>
                {health.consensusActive ? '✓' : '✗'}
              </div>
              <div className="consensus-label">{health.consensusActive ? 'Active' : 'Inactive'}</div>
            </div>
            {health.consensusActive && (
              <div className="consensus-badge">
                <span>⭐ COORDINATOR</span>
              </div>
            )}
          </div>
        </div>

        {/* DISTRIBUTION - UPDATED RANGES */}
        <div className="distribution-section">
          <div className="section-title">Resource Utilization Distribution</div>
          <div className="section-subtitle">Lower is better - shows available capacity</div>
          <div className="dist-cards">
            <div className="dist-card healthy">
              <div className="dist-icon">✓</div>
              <div className="dist-details">
                <div className="dist-label">Healthy</div>
                <div className="dist-range">0-60% Usage</div>
              </div>
              <div className="dist-count">{health.healthyNodes}</div>
            </div>
            <div className="dist-card warning">
              <div className="dist-icon">⚠</div>
              <div className="dist-details">
                <div className="dist-label">Warning</div>
                <div className="dist-range">60-80% Usage</div>
              </div>
              <div className="dist-count">{health.warningNodes}</div>
            </div>
            <div className="dist-card critical">
              <div className="dist-icon">✗</div>
              <div className="dist-details">
                <div className="dist-label">Critical</div>
                <div className="dist-range">&gt;80% Usage</div>
              </div>
              <div className="dist-count">{health.criticalNodes}</div>
            </div>
          </div>
        </div>

        {/* TREND - SPARKLINE BELOW PREDICTION */}
        <div className="trend-section">
          <div className="trend-header">
            <div className="section-title">Utilization Trend (Last 5 Minutes)</div>
            <div className={`trend-indicator trend-${health.healthTrend}`}>
              {health.healthTrend === 'improving' && '↓ STABLE'}
              {health.healthTrend === 'stable' && '→ STABLE'}
              {health.healthTrend === 'degrading' && '↑ INCREASING'}
            </div>
          </div>
          <div className="trend-content">
            {/* PREDICTION ON TOP */}
            <div className="prediction-box">
              <span className="prediction-label">PREDICTED</span>
              <span className="prediction-value">{Math.round(health.predictedHealth)}%</span>
              <span className="prediction-label">NEXT READ</span>
            </div>

            {/* SPARKLINE BELOW (VISIBLE!) */}
            <div className="sparkline-container">
              {history.length > 1 ? (
                <svg className="sparkline" viewBox="0 0 300 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#667eea" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
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
                  {history.map((h, i) => {
                    const x = (i / (history.length - 1)) * 300;
                    const y = 80 - (h.averageHealth / 100) * 80;
                    return <circle key={i} cx={x} cy={y} r="4" fill="#667eea" stroke="white" strokeWidth="2" />;
                  })}
                </svg>
              ) : (
                <div className="no-data">Collecting data...</div>
              )}
            </div>
          </div>
        </div>

        {/* AGENTS - COLLAPSED BY DEFAULT */}
        <details className="agents-panel">
          <summary className="agents-header">
            <span className="agents-title">
              Individual Agent Status ({health.totalNodes} Agent{health.totalNodes !== 1 ? 's' : ''})
            </span>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="agents-grid">
            {health.nodeDetails.map((node) => (
              <div key={node.nodeId} className={`agent-card ${node.online ? 'online' : 'offline'}`}>
                <div className="agent-header">
                  <div className="agent-info">
                    <div className="agent-name">{node.nodeName}</div>
                    <div className="agent-role">{node.isLeader ? '⭐ Coordinator' : node.role}</div>
                  </div>
                  <div className={`agent-status-dot ${node.online ? 'online' : 'offline'}`} />
                </div>

                {node.online ? (
                  <div className="agent-body">
                    <div className="agent-usage">
                      <div className="agent-usage-header">
                        <span className="agent-usage-label">RESOURCE USAGE</span>
                        <span className="agent-usage-value">{Math.round(node.healthScore)}%</span>
                      </div>
                      <div className="agent-bar-container">
                        <div
                          className={`agent-bar ${node.healthScore <= 60 ? 'healthy' : node.healthScore <= 80 ? 'warning' : 'critical'}`}
                          style={{ width: `${node.healthScore}%` }}
                        />
                      </div>
                      <div className="agent-status-text">
                        {node.healthScore <= 60 && '✓ Healthy'}
                        {node.healthScore > 60 && node.healthScore <= 80 && '⚠ Warning'}
                        {node.healthScore > 80 && '✗ Critical'}
                      </div>
                    </div>
                    {node.responseTime && (
                      <div className="agent-response">
                        <span className="response-label">RESPONSE TIME</span>
                        <span className="response-value">{node.responseTime}ms</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="agent-body offline">
                    <span className="offline-message">AGENT OFFLINE</span>
                    {node.error && <span className="error-message">{node.error}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>

        {/* FOOTER - FIXED LINK */}
        <div className="widget-footer">
          <div className="footer-left">
            <span className="footer-icon">🕐</span>
            <span className="footer-text">Last update: {health.lastSync} (60s interval)</span>
          </div>
          <div className="footer-right">
            {/* FIXED ROUTING */}
            <a href="#/agent-topology" className="footer-link">
              🗺️ View Network Topology →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterHealthWidget;
