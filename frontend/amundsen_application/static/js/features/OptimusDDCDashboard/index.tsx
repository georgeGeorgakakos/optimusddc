// Copyright Contributors to the swarmchestrate project.
// SPDX-License-Identifier: Apache-2.0
// PHASE 3 REFINED VERSION WITH DYNAMIC API CONFIG

import * as React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { getCatalogFrontendUrl } from 'config/apiConfig'; // ← PHASE 3 IMPORT
import './styles.scss';

// ============================================
// TYPES
// ============================================

interface OperationsMetrics {
  totalNodes: number;
  healthyNodes: number;
  contexts: number;
  datasets: number;
  dashboards: number;
  recentElections: number;
  avgLatency: number;
  queriesLast24h?: number[];
  metadataChangesLast7d?: number[];
  nodeHealthTrend?: number[];
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  trend?: number[];
  trendLabel?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'secondary';
}

interface HealthRibbonProps {
  totalNodes: number;
  healthyNodes: number;
  avgLatency: number;
}

// ============================================
// SPARKLINE COMPONENT
// ============================================

const Sparkline: React.FC<{
  data: number[];
  color: string;
  height?: number;
}> = ({ data, color, height = 40 }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;

      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className="sparkline"
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={`0,${height} ${points} 100,${height}`}
        fill={color}
        fillOpacity="0.1"
        stroke="none"
      />
    </svg>
  );
};

// ============================================
// METRIC CARD COMPONENT
// ============================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = 'primary',
}) => {
  const getColorClass = () => {
    switch (color) {
      case 'accent':
        return 'metric-card-accent';
      case 'success':
        return 'metric-card-success';
      case 'warning':
        return 'metric-card-warning';
      case 'secondary':
        return 'metric-card-secondary';
      default:
        return 'metric-card-primary';
    }
  };

  return (
    <div className={`metric-card ${getColorClass()}`}>
      <div className="metric-card-header">
        <div className="metric-icon">
          <span className={icon}>{icon}</span>
        </div>
        <div className="metric-info">
          <h3 className="metric-title">{title}</h3>
          {subtitle && <p className="metric-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="metric-value">{value}</div>
      {trend && trend.length > 0 && (
        <div className="metric-trend">
          <Sparkline
            data={trend}
            color={
              color === 'accent'
                ? '#00897b'
                : color === 'success'
                ? '#43a047'
                : '#1a4d7a'
            }
          />
          {trendLabel && <span className="trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

// ============================================
// HEALTH RIBBON COMPONENT
// ============================================

const HealthRibbon: React.FC<HealthRibbonProps> = ({
  totalNodes,
  healthyNodes,
  avgLatency,
}) => {
  const healthPercentage =
    totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0;

  const getHealthStatus = () => {
    if (healthPercentage >= 90) {
      return { status: 'healthy', label: 'Healthy', class: 'health-healthy' };
    }
    if (healthPercentage >= 70) {
      return { status: 'warning', label: 'Degraded', class: 'health-warning' };
    }

    return { status: 'error', label: 'Critical', class: 'health-error' };
  };

  const health = getHealthStatus();

  return (
    <div className={`health-ribbon ${health.class}`}>
      <div className="health-content">
        <div className="health-icon">
          {health.status === 'healthy' ? '✅' : '⚠️'}
        </div>
        <div className="health-info">
          <span className="health-label">
            Swarm Status: <strong>{health.label}</strong>
          </span>
          <span className="health-details">
            {healthyNodes}/{totalNodes} nodes operational · Avg latency{' '}
            {avgLatency}ms
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// QUICK ACCESS TILES COMPONENT
// ============================================

const QuickAccessTiles: React.FC = () => {
  const tiles = [
    { title: 'Browse Catalog', icon: '📚', path: '/browse', color: 'primary' },
    {
      title: 'Agents Topology',
      icon: '🔗',
      path: '/cluster/topology',
      color: 'accent',
    },
    {
      title: 'Query Workbench',
      icon: '⚡',
      path: '/queryengine',
      color: 'secondary',
    },
    { title: 'Metrics', icon: '📊', path: '/metrics', color: 'success' },
  ];

  return (
    <div className="quick-access-tiles">
      {tiles.map((tile, index) => (
        <a
          key={index}
          href={tile.path}
          className={`quick-tile quick-tile-${tile.color}`}
        >
          <div className="quick-tile-icon">{tile.icon}</div>
          <div className="quick-tile-title">{tile.title}</div>
        </a>
      ))}
    </div>
  );
};

// ============================================
// MAIN OPERATIONS DASHBOARD COMPONENT
// ============================================

const OptimusDDCDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch operations metrics from your backend
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ PHASE 3: Use dynamic frontend URL
      const frontendUrl = getCatalogFrontendUrl();
      const metricsUrl = `${frontendUrl}/api/operations/metrics`;

      console.log(`Fetching operations metrics from: ${metricsUrl}`);

      const response = await axios.get(metricsUrl);

      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to fetch operations metrics:', err);

      // MOCK DATA - Remove this once your backend is ready
      // This lets you test the UI without a backend
      setMetrics({
        totalNodes: 8,
        healthyNodes: 8,
        contexts: 3,
        datasets: 1247,
        dashboards: 89,
        recentElections: 2,
        avgLatency: 35,
        queriesLast24h: [
          45, 52, 48, 61, 55, 67, 72, 69, 58, 63, 71, 75, 82, 78, 85, 91, 88,
          95, 102, 98, 105, 110, 108, 115,
        ],
        metadataChangesLast7d: [12, 15, 18, 22, 19, 24, 21],
        nodeHealthTrend: [100, 100, 100, 90, 100, 100, 100],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="operations-dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading swarmchestrate operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="operations-dashboard-error">
        <span className="error-icon">🛑</span>
        <p>{error}</p>
        <button onClick={fetchMetrics} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="operations-dashboard">
      {/* Hero Section - matches your swarmchestrate branding */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-brand">Operations Dashboard</span>
            <span className="hero-subtitle">Real-time swarm monitoring</span>
          </h1>
          <p className="hero-description">
            Monitor your decentralized data catalog cluster
          </p>
        </div>
        <div className="hero-badge">
          <span className="badge-icon">🔗</span>
          <span className="badge-text">Distributed</span>
        </div>
      </div>

      {/* Health Ribbon */}
      <HealthRibbon
        totalNodes={metrics.totalNodes}
        healthyNodes={metrics.healthyNodes}
        avgLatency={metrics.avgLatency}
      />

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Active Nodes"
          value={metrics.totalNodes}
          subtitle="Swarm participants"
          icon="🖥️"
          color="primary"
        />
        <MetricCard
          title="Contexts"
          value={metrics.contexts}
          subtitle="Active namespaces"
          icon="📂"
          color="secondary"
        />
        <MetricCard
          title="Datasets"
          value={metrics.datasets.toLocaleString()}
          subtitle="Cataloged tables"
          icon="💾"
          color="accent"
          trend={metrics.queriesLast24h?.slice(-6)}
          trendLabel="Growing"
        />
        <MetricCard
          title="Metrics"
          value={metrics.dashboards}
          subtitle="Metrics"
          icon="📊"
          color="success"
        />
      </div>

      {/* Activity Charts - only show if data available */}
      {metrics.queriesLast24h &&
        metrics.metadataChangesLast7d &&
        metrics.nodeHealthTrend && (
          <div className="activity-section">
            <div className="activity-card">
              <h3 className="activity-title">
                <span>📈</span> Queries (Last 24h)
              </h3>
              <div className="activity-chart">
                <Sparkline
                  data={metrics.queriesLast24h}
                  color="#00897b"
                  height={60}
                />
              </div>
              <p className="activity-summary">
                {metrics.queriesLast24h[metrics.queriesLast24h.length - 1]}{' '}
                queries in the last hour
              </p>
            </div>

            <div className="activity-card">
              <h3 className="activity-title">
                <span>✏️</span> Metadata Changes (Last 7d)
              </h3>
              <div className="activity-chart">
                <Sparkline
                  data={metrics.metadataChangesLast7d}
                  color="#5e35b1"
                  height={60}
                />
              </div>
              <p className="activity-summary">
                {metrics.metadataChangesLast7d.reduce((a, b) => a + b, 0)} total
                changes this week
              </p>
            </div>

            <div className="activity-card">
              <h3 className="activity-title">
                <span>❤️</span> Node Health Trend
              </h3>
              <div className="activity-chart">
                <Sparkline
                  data={metrics.nodeHealthTrend}
                  color="#43a047"
                  height={60}
                />
              </div>
              <p className="activity-summary">
                {metrics.nodeHealthTrend[metrics.nodeHealthTrend.length - 1]}%
                average health
              </p>
            </div>
          </div>
        )}

      {/* Quick Access */}
      <div className="quick-access-section">
        <h2 className="section-title">Quick Access</h2>
        <QuickAccessTiles />
      </div>

      {/* Recent Elections Summary */}
      {metrics.recentElections > 0 && (
        <div className="elections-summary">
          <span>⚡</span>
          <span>
            {metrics.recentElections} leader elections in the last hour
          </span>
          <a href="/console/elections" className="elections-link">
            View details →
          </a>
        </div>
      )}
    </div>
  );
};

export default OptimusDDCDashboard;

// ==============================================================================
// PHASE 3 CHANGES SUMMARY
// ==============================================================================
// 1. ✅ Added import: import { getCatalogFrontendUrl } from 'config/apiConfig';
// 2. ✅ Updated fetchMetrics(): Uses getCatalogFrontendUrl() for dynamic URL
// 3. ✅ Added console.log: Shows which URL is being used
// 4. ✅ All components preserved: Sparkline, MetricCard, HealthRibbon, QuickAccessTiles
// 5. ✅ All features preserved: Loading, error, mock data, auto-refresh
//
// RESULT:
// - Docker Desktop: Uses http://localhost:5015/api/operations/metrics
// - K3s: Uses http://192.168.0.26/api/operations/metrics (or cluster hostname)
// - Mock data still works as fallback if endpoint doesn't exist
// - All visualization features preserved (sparklines, health ribbon, metrics)
// ==============================================================================
