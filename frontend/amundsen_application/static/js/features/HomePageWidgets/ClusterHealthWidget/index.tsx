// ClusterHealthWidget - Shows OptimusDB cluster health status
import * as React from 'react';
import './styles.scss';

interface ClusterHealth {
  totalNodes: number;
  activeNodes: number;
  networkStatus: 'healthy' | 'degraded' | 'offline';
  consensusActive: boolean;
  p2pConnections: number;
  lastSync: string;
}

const ClusterHealthWidget: React.FC = () => {
  const [health, setHealth] = React.useState<ClusterHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Fetch cluster health from OptimusDB
    const fetchHealth = () => {
      fetch('http://localhost:18001/swarmkb/agent/status')
        .then((res) => res.json())
        .then((data) => {
          // Count actual connected nodes from the data
          const connectedPeers = data.peers.filter(
            (p: any) => p.connected
          ).length;
          const totalNodes = 1 + data.peers.length;
          const activeNodes = 1 + connectedPeers;

          // Determine network status
          let networkStatus: 'healthy' | 'degraded' | 'offline';

          if (data.status === 'success' && activeNodes === totalNodes) {
            networkStatus = 'healthy';
          } else if (activeNodes > 0) {
            networkStatus = 'degraded';
          } else {
            networkStatus = 'offline';
          }

          const transformedHealth: ClusterHealth = {
            totalNodes,
            activeNodes,
            networkStatus,
            consensusActive: data.election.current_leader !== '',
            p2pConnections: connectedPeers,
            lastSync: new Date(data.timestamp).toLocaleTimeString(),
          };

          setHealth(transformedHealth);
          setLoading(false);
          setError(false);
        })
        .catch((err) => {
          console.error('Failed to fetch OptimusDB cluster health:', err);
          setLoading(false);
          setError(true);
        });
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

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
            <p>Connecting to cluster...</p>
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
            <span className="error-hint">Check if OptimusDB is running</span>
          </div>
        </div>
      </div>
    );
  }

  const healthPercentage = (health.activeNodes / health.totalNodes) * 100;
  const isHealthy = healthPercentage === 100;

  return (
    <div className="cluster-health-widget">
      {/* Header */}
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
        <div className={`status-badge status-${health.networkStatus}`}>
          <span className="status-dot" />
          <span className="status-text">
            {health.networkStatus === 'healthy' && 'Healthy'}
            {health.networkStatus === 'degraded' && 'Degraded'}
            {health.networkStatus === 'offline' && 'Offline'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="widget-body">
        {/* Primary Metric - Nodes */}
        <div className="primary-metric">
          <div className="metric-visual">
            <svg className="progress-ring" width="120" height="120">
              <circle className="progress-ring-bg" cx="60" cy="60" r="50" />
              <circle
                className={`progress-ring-fill ${
                  isHealthy ? 'healthy' : 'degraded'
                }`}
                cx="60"
                cy="60"
                r="50"
                strokeDasharray={`${(healthPercentage / 100) * 314} 314`}
              />
            </svg>
            <div className="metric-value">
              <span className="nodes-count">
                {health.activeNodes}/{health.totalNodes}
              </span>
              <span className="nodes-label">Nodes</span>
            </div>
          </div>
          <div className="metric-info">
            <div className="info-item">
              <span className="info-label">Active Nodes</span>
              <span className="info-value">{health.activeNodes}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Capacity</span>
              <span className="info-value">{health.totalNodes}</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="secondary-metrics">
          <div className="metric-card">
            <div className="metric-icon">
              {health.consensusActive ? '✓' : '✗'}
            </div>
            <div className="metric-details">
              <span className="metric-label">Consensus</span>
              <span
                className={`metric-status ${
                  health.consensusActive ? 'active' : 'inactive'
                }`}
              >
                {health.consensusActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🔗</div>
            <div className="metric-details">
              <span className="metric-label">P2P Connections</span>
              <span className="metric-value-large">
                {health.p2pConnections}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="widget-footer">
          <div className="footer-info">
            <span className="footer-icon">🕐</span>
            <span className="footer-text">Last sync: {health.lastSync}</span>
          </div>
          <a href="/cluster/topology" className="view-details-btn">
            View Topology →
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClusterHealthWidget;
