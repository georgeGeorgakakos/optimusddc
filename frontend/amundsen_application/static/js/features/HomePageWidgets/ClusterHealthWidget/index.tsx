// ClusterHealthWidget.tsx - CONCEPT 1: MINIMAL DASHBOARD
// ✅ FIXED: Status logic (warning bug)
// ✅ NEW: Fancy footer visualization (replaces button)
// 2x2 GRID LAYOUT
// CONSENSUS BASED ON COORDINATOR (not leader)
// 3-MINUTE REFRESH
// NO INDIVIDUAL AGENT STATUS
// CLEAN STATUS BADGES
// HORIZONTAL HEALTH BARS

import * as React from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
import './styles.scss';

interface NodeHealth {
  nodeId: number;
  nodeName: string;
  online: boolean;
  healthScore: number;
  role: string;
  isCoordinator: boolean;
  error?: string;
  responseTime?: number;
}

interface ClusterHealth {
  totalNodes: number;
  activeNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  networkStatus: 'optimal' | 'warning' | 'critical' | 'offline';
  consensusActive: boolean;
  coordinatorCount: number;
  p2pConnections: number;
  maxP2pConnections: number;
  averageHealth: number;
  lastSync: string;
  nodeDetails: NodeHealth[];
}

const ClusterHealthWidget: React.FC = () => {
  const [health, setHealth] = React.useState<ClusterHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [metricsHistory, setMetricsHistory] = React.useState<number[]>([]);

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
              isCoordinator:
                // data.agent?.role === 'coordinator' ||
                data.agent?.role === 'coordinator',
              // data.agent?.is_current_leader === true,
              responseTime,
            } as NodeHealth;
          } catch (err) {
            return {
              nodeId: node.id,
              nodeName: node.name,
              online: false,
              healthScore: 0,
              role: 'unknown',
              isCoordinator: false,
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

        // HEALTH THRESHOLDS: 0-60% healthy, 60-80% warning, >80% critical
        const healthyNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore <= 60
        ).length;
        const warningNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore > 60 && n.healthScore <= 80
        ).length;
        const criticalNodes = nodeDetails.filter(
          (n) => n.online && n.healthScore > 80
        ).length;

        const totalHealth = nodeDetails
          .filter((n) => n.online)
          .reduce((sum, n) => sum + n.healthScore, 0);
        const averageHealth = activeNodes > 0 ? totalHealth / activeNodes : 0;

        // COORDINATOR-BASED CONSENSUS
        const coordinatorCount = nodeDetails.filter(
          (n) => n.online && n.isCoordinator
        ).length;
        const consensusActive = coordinatorCount === 1;

        const maxP2pConnections =
          activeNodes > 1 ? (activeNodes * (activeNodes - 1)) / 2 : 0;
        const p2pConnections = maxP2pConnections;

        // ============================================================
        // ✅ FIXED: IMPROVED STATUS LOGIC
        // ============================================================
        let networkStatus: 'optimal' | 'warning' | 'critical' | 'offline';

        if (activeNodes === 0) {
          // NO nodes online
          networkStatus = 'offline';
        } else if (criticalNodes > 0) {
          // ANY node is critical (>80% utilization)
          networkStatus = 'critical';
        } else if (warningNodes > 0) {
          // ANY node is in warning state (60-80% utilization)
          networkStatus = 'warning';
        } else if (!consensusActive) {
          // All nodes healthy BUT consensus issue
          networkStatus = 'warning';
        } else if (activeNodes < totalNodes) {
          // Some nodes offline
          networkStatus = 'warning';
        } else {
          // ALL nodes healthy, consensus active, all online
          networkStatus = 'optimal';
        }

        // ✅ Update metrics history for sparkline (keep last 20 points)
        setMetricsHistory((prev) => [...prev, averageHealth].slice(-20));

        setHealth({
          totalNodes,
          activeNodes,
          healthyNodes,
          warningNodes,
          criticalNodes,
          networkStatus,
          consensusActive,
          coordinatorCount,
          p2pConnections: Math.round(p2pConnections),
          maxP2pConnections: Math.round(maxP2pConnections),
          averageHealth,
          lastSync: new Date().toLocaleTimeString(),
          nodeDetails,
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
    const interval = setInterval(fetchHealth, 360000);

    return () => clearInterval(interval);
  }, []);

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
  const connectivityPercentage =
    health.maxP2pConnections > 0
      ? (health.p2pConnections / health.maxP2pConnections) * 100
      : 0;

  // ============================================================
  // ✅ NEW: FANCY FOOTER VISUALIZATION - OPTION 1 (MINI NETWORK TOPOLOGY)
  // ============================================================
  const renderNetworkTopology = () => {
    const nodes = health.nodeDetails;
    const radius = 40;
    const centerX = 100;
    const centerY = 60;

    return (
      <svg
        className="mini-topology"
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Draw connections (full mesh) */}
        {nodes.map((node, i) =>
          nodes.slice(i + 1).map((otherNode, j) => {
            const angle1 = (i * 2 * Math.PI) / nodes.length - Math.PI / 2;
            const angle2 =
              ((i + j + 1) * 2 * Math.PI) / nodes.length - Math.PI / 2;
            const x1 = centerX + radius * Math.cos(angle1);
            const y1 = centerY + radius * Math.sin(angle1);
            const x2 = centerX + radius * Math.cos(angle2);
            const y2 = centerY + radius * Math.sin(angle2);

            return (
              <line
                key={`link-${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={node.online && otherNode.online ? '#667eea' : '#d1d5db'}
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
            );
          })
        )}

        {/* Draw nodes */}
        {nodes.map((node, i) => {
          const angle = (i * 2 * Math.PI) / nodes.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          const color = node.isCoordinator
            ? '#10b981'
            : node.online
            ? '#667eea'
            : '#9ca3af';

          return (
            <g key={`node-${i}`}>
              {/* Pulse animation for coordinator */}
              {node.isCoordinator && node.online && (
                <circle
                  cx={x}
                  cy={y}
                  r="10"
                  fill={color}
                  opacity="0.3"
                  className="pulse-ring"
                />
              )}

              {/* Node circle */}
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={color}
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Coordinator star */}
              {node.isCoordinator && node.online && (
                <text x={x} y={y - 15} fontSize="12" textAnchor="middle">
                  ⭐
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // ============================================================
  // ✅ NEW: FANCY FOOTER VISUALIZATION - OPTION 2 (SPARKLINES)
  // ============================================================
  const renderSparklines = () => {
    if (metricsHistory.length < 2) {
      return <div className="sparkline-placeholder">Collecting data...</div>;
    }

    const points = metricsHistory
      .map((value, index) => {
        const x = (index / (metricsHistory.length - 1)) * 150;
        const y = 40 - (value / 100) * 35;

        return `${x},${y}`;
      })
      .join(' ');

    const avgValue = metricsHistory[metricsHistory.length - 1];
    const trend =
      metricsHistory.length > 1
        ? metricsHistory[metricsHistory.length - 1] -
          metricsHistory[metricsHistory.length - 2]
        : 0;

    return (
      <div className="sparkline-container">
        <div className="sparkline-info">
          <span className="sparkline-label">Cluster Load Trend</span>
          <span className="sparkline-value">
            {avgValue.toFixed(1)}%
            <span className={`trend-arrow ${trend >= 0 ? 'up' : 'down'}`}>
              {trend >= 0 ? '↑' : '↓'}
            </span>
          </span>
        </div>
        <svg
          className="sparkline"
          viewBox="0 0 150 40"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="sparklineGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <polygon
            points={`0,40 ${points} 150,40`}
            fill="url(#sparklineGradient)"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#667eea"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="cluster-health-widget">
      {/* HEADER */}
      <div className="widget-header">
        <div className="header-left">
          <div className="header-icon">🌐</div>
          <div className="header-text">
            <h1>Cluster Health Monitor</h1>
            <p>
              {health.totalNodes} Agent{health.totalNodes !== 1 ? 's' : ''},{' '}
              {health.p2pConnections} Connection
              {health.p2pConnections !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`status-badge status-${health.networkStatus}`}>
          <span className="status-dot" />
          <span className="status-text">
            {health.networkStatus === 'optimal' && '✓ OPTIMAL'}
            {health.networkStatus === 'warning' && '⚠ WARNING'}
            {health.networkStatus === 'critical' && '🚨 CRITICAL'}
            {health.networkStatus === 'offline' && '✗ OFFLINE'}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="widget-body">
        {/* 2x2 GRID LAYOUT */}
        <div className="metrics-grid-2x2">
          {/* ACTIVE AGENTS */}
          <div className="metric-card">
            <div className="metric-label">
              <span className="metric-icon">🌐</span>
              ACTIVE AGENTS
            </div>
            <div className="metric-value-wrapper">
              <div className="metric-value">{health.activeNodes}</div>
              <div className="metric-unit">/{health.totalNodes}</div>
            </div>
            <div
              className={`metric-status ${
                health.activeNodes === health.totalNodes ? 'optimal' : 'warning'
              }`}
            >
              <span className="status-dot" />
              {Math.round(nodeHealthPercentage)}% Online
            </div>
          </div>

          {/* CLUSTER LOAD */}
          <div className="metric-card">
            <div className="metric-label">
              <span className="metric-icon">📊</span>
              CLUSTER LOAD
            </div>
            <div className="metric-value-wrapper">
              <div className="metric-value">
                {Math.round(health.averageHealth)}
              </div>
              <div className="metric-unit">%</div>
            </div>
            <div
              className={`metric-status ${
                health.averageHealth <= 60
                  ? 'healthy'
                  : health.averageHealth <= 80
                  ? 'warning'
                  : 'critical'
              }`}
            >
              <span className="status-dot" />
              {health.averageHealth <= 60 && 'Healthy'}
              {health.averageHealth > 60 &&
                health.averageHealth <= 80 &&
                'Warning'}
              {health.averageHealth > 80 && 'Critical'}
            </div>
          </div>

          {/* CONNECTIONS */}
          <div className="metric-card">
            <div className="metric-label">
              <span className="metric-icon">🔗</span>
              CONNECTIONS
            </div>
            <div className="metric-value-wrapper">
              <div className="metric-value">{health.p2pConnections}</div>
              <div className="metric-unit">/{health.maxP2pConnections}</div>
            </div>
            <div
              className={`metric-status ${
                connectivityPercentage === 100 ? 'optimal' : 'warning'
              }`}
            >
              <span className="status-dot" />
              {connectivityPercentage === 100 ? 'Full Mesh' : 'Partial Mesh'}
            </div>
          </div>

          {/* CONSENSUS - COORDINATOR BASED */}
          <div className="metric-card">
            <div className="metric-label">
              <span className="metric-icon">⚡</span>
              CONSENSUS
            </div>
            <div className="metric-value-wrapper">
              <div className="metric-value">{health.coordinatorCount}</div>
              <div className="metric-unit">COORD</div>
            </div>
            <div
              className={`metric-status ${
                health.consensusActive
                  ? 'optimal'
                  : health.coordinatorCount === 0
                  ? 'critical'
                  : 'warning'
              }`}
            >
              <span className="status-dot" />
              {health.consensusActive && 'Active'}
              {!health.consensusActive &&
                health.coordinatorCount === 0 &&
                'No Coordinator'}
              {!health.consensusActive &&
                health.coordinatorCount > 1 &&
                `${health.coordinatorCount} Coordinators!`}
            </div>
          </div>
        </div>

        {/* HEALTH DISTRIBUTION - HORIZONTAL BARS */}
        <div className="health-distribution">
          <div className="distribution-header">
            <div className="distribution-title">Health Distribution</div>
            <div className="distribution-subtitle">
              Resource utilization across cluster
            </div>
          </div>
          <div className="distribution-bars">
            {/* HEALTHY */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">✓ Healthy</span>
                <span className="health-bar-count healthy">
                  {health.healthyNodes}
                </span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill healthy"
                  style={{
                    width:
                      health.totalNodes > 0
                        ? `${(health.healthyNodes / health.totalNodes) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="health-bar-range">0-60% utilization</div>
            </div>

            {/* WARNING */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">⚠ Warning</span>
                <span className="health-bar-count warning">
                  {health.warningNodes}
                </span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill warning"
                  style={{
                    width:
                      health.totalNodes > 0
                        ? `${(health.warningNodes / health.totalNodes) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="health-bar-range">60-80% utilization</div>
            </div>

            {/* CRITICAL */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">✗ Critical</span>
                <span className="health-bar-count critical">
                  {health.criticalNodes}
                </span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill critical"
                  style={{
                    width:
                      health.totalNodes > 0
                        ? `${(health.criticalNodes / health.totalNodes) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="health-bar-range">&gt;80% utilization</div>
            </div>
          </div>
        </div>

        {/* ✅ NEW: FANCY FOOTER VISUALIZATION */}
        <div className="widget-footer-fancy">
          <div className="footer-viz-section">
            <div className="footer-viz-header">
              <div className="footer-viz-title">
                <span className="viz-icon">🗺️</span>
                Network Topology
              </div>
              <div className="footer-viz-subtitle">
                {health.p2pConnections} active connections • Full mesh
              </div>
            </div>
            {renderNetworkTopology()}
          </div>

          <div className="footer-viz-divider" />

          <div className="footer-viz-section">
            <div className="footer-viz-header">
              <div className="footer-viz-title">
                <span className="viz-icon">📈</span>
                Performance Trend
              </div>
              <div className="footer-viz-subtitle">
                Last update: {health.lastSync} • 3 min intervals
              </div>
            </div>
            {renderSparklines()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterHealthWidget;
