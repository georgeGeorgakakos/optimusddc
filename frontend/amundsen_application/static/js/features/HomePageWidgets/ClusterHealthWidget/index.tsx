// ClusterHealthWidget.tsx - CONCEPT 1: MINIMAL DASHBOARD
// 2x2 GRID LAYOUT
// CONSENSUS BASED ON COORDINATOR (not leader)
// 3-MINUTE REFRESH
// NO INDIVIDUAL AGENT STATUS
// CLEAN STATUS BADGES
// HORIZONTAL HEALTH BARS

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
  isCoordinator: boolean; // RENAMED from isLeader
  error?: string;
  responseTime?: number;
}

interface ClusterHealth {
  totalNodes: number;
  activeNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  networkStatus: 'optimal' | 'warning' | 'offline';
  consensusActive: boolean;
  coordinatorCount: number; // NEW: Track coordinator count
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

  // Fetch cluster health
  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const nodes = await getAvailableNodes();
        const totalNodes = nodes.length;

        console.log(`[ClusterHealth] Checking ${totalNodes} nodes:`, nodes.map((n) => n.name));

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
              // CHECK FOR COORDINATOR (role === 'coordinator' OR is_current_leader)
              isCoordinator: data.agent?.role === 'coordinator' || data.agent?.is_current_leader === true,
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

        console.log(`[ClusterHealth] Fetched ${nodeDetails.length} nodes in ${fetchDuration}ms`);

        const activeNodes = nodeDetails.filter((n) => n.online).length;

        // HEALTH THRESHOLDS: 0-60% healthy, 60-80% warning, >80% critical
        const healthyNodes = nodeDetails.filter((n) => n.online && n.healthScore <= 60).length;
        const warningNodes = nodeDetails.filter((n) => n.online && n.healthScore > 60 && n.healthScore <= 80).length;
        const criticalNodes = nodeDetails.filter((n) => n.online && n.healthScore > 80).length;

        const totalHealth = nodeDetails.filter((n) => n.online).reduce((sum, n) => sum + n.healthScore, 0);
        const averageHealth = activeNodes > 0 ? totalHealth / activeNodes : 0;

        // COORDINATOR-BASED CONSENSUS
        const coordinatorCount = nodeDetails.filter((n) => n.online && n.isCoordinator).length;
        const consensusActive = coordinatorCount === 1; // Should be exactly 1 coordinator

        const maxP2pConnections = activeNodes > 1 ? (activeNodes * (activeNodes - 1)) / 2 : 0;
        const p2pConnections = maxP2pConnections;

        let networkStatus: 'optimal' | 'warning' | 'offline';
        if (activeNodes === 0) {
          networkStatus = 'offline';
        } else if (activeNodes === totalNodes && averageHealth <= 60 && consensusActive) {
          networkStatus = 'optimal';
        } else {
          networkStatus = 'warning';
        }

        setHealth({
          totalNodes,
          activeNodes,
          healthyNodes,
          warningNodes,
          criticalNodes,
          networkStatus,
          consensusActive,
          coordinatorCount, // NEW
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
    // 3-MINUTE REFRESH (180000ms)
    const interval = setInterval(fetchHealth, 180000);

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
  const connectivityPercentage = health.maxP2pConnections > 0 ? (health.p2pConnections / health.maxP2pConnections) * 100 : 0;

  return (
    <div className="cluster-health-widget">
      {/* HEADER */}
      <div className="widget-header">
        <div className="header-left">
          <div className="header-icon">🌐</div>
          <div className="header-text">
            <h1>Cluster Health Monitor</h1>
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
            <div className={`metric-status ${health.activeNodes === health.totalNodes ? 'optimal' : 'warning'}`}>
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
              <div className="metric-value">{Math.round(health.averageHealth)}</div>
              <div className="metric-unit">%</div>
            </div>
            <div
              className={`metric-status ${
                health.averageHealth <= 60 ? 'healthy' : health.averageHealth <= 80 ? 'warning' : 'critical'
              }`}
            >
              <span className="status-dot" />
              {health.averageHealth <= 60 && 'Healthy'}
              {health.averageHealth > 60 && health.averageHealth <= 80 && 'Warning'}
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
            <div className={`metric-status ${connectivityPercentage === 100 ? 'optimal' : 'warning'}`}>
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
            <div className={`metric-status ${health.consensusActive ? 'optimal' : health.coordinatorCount === 0 ? 'critical' : 'warning'}`}>
              <span className="status-dot" />
              {health.consensusActive && 'Active'}
              {!health.consensusActive && health.coordinatorCount === 0 && 'No Coordinator'}
              {!health.consensusActive && health.coordinatorCount > 1 && `${health.coordinatorCount} Coordinators!`}
            </div>
          </div>
        </div>

        {/* HEALTH DISTRIBUTION - HORIZONTAL BARS */}
        <div className="health-distribution">
          <div className="distribution-header">
            <div className="distribution-title">Health Distribution</div>
            <div className="distribution-subtitle">Resource utilization across cluster</div>
          </div>
          <div className="distribution-bars">
            {/* HEALTHY */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">✓ Healthy</span>
                <span className="health-bar-count healthy">{health.healthyNodes}</span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill healthy"
                  style={{ width: health.totalNodes > 0 ? `${(health.healthyNodes / health.totalNodes) * 100}%` : '0%' }}
                />
              </div>
              <div className="health-bar-range">0-60% utilization</div>
            </div>

            {/* WARNING */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">⚠ Warning</span>
                <span className="health-bar-count warning">{health.warningNodes}</span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill warning"
                  style={{ width: health.totalNodes > 0 ? `${(health.warningNodes / health.totalNodes) * 100}%` : '0%' }}
                />
              </div>
              <div className="health-bar-range">60-80% utilization</div>
            </div>

            {/* CRITICAL */}
            <div className="health-bar-item">
              <div className="health-bar-label">
                <span className="health-bar-name">✗ Critical</span>
                <span className="health-bar-count critical">{health.criticalNodes}</span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill critical"
                  style={{ width: health.totalNodes > 0 ? `${(health.criticalNodes / health.totalNodes) * 100}%` : '0%' }}
                />
              </div>
              <div className="health-bar-range">&gt;80% utilization</div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="widget-footer">
          <div className="footer-left">
            <span className="footer-icon">🕐</span>
            <span className="footer-text">Last update: {health.lastSync} (3 min refresh)</span>
          </div>
          <div className="footer-right">
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
