// ==============================================================================
// SwarmchestrateWidget - Swarm Operations Dashboard
// ==============================================================================
// Shows real-time cluster operations, query performance, AI activity, and more
// Uses MOCK DATA for frontend development (no backend changes needed)
// ==============================================================================

import * as React from 'react';
import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface ActivityEvent {
  id: string;
  type: 'query' | 'metadata' | 'replication' | 'election' | 'validation';
  agent: number;
  description: string;
  timestamp: Date;
  duration?: string;
  status?: 'success' | 'warning' | 'error';
}

interface QueryMetric {
  timestamp: Date;
  responseTime: number;
  queries: number;
}

interface TopQuery {
  query: string;
  count: number;
  avgTime: string;
}

interface ReplicationTask {
  table: string;
  targetAgent: number;
  progress: number;
  status: 'active' | 'queued' | 'completed';
}

interface NetworkTraffic {
  from: number;
  to: number;
  messageCount: number;
}

interface AIMetrics {
  generatedToday: number;
  avgGenerationTime: number;
  qualityScore: number;
  recentGenerations: Array<{
    dataset: string;
    tags: number;
    time: number;
  }>;
}

interface OperationsData {
  queriesLastHour: number;
  metadataOpsLastHour: number;
  activeReplications: number;
  currentLeader: number;
  leaderTenure: string;
  avgResponseTime: number;
}

// ==============================================================================
// MOCK DATA GENERATORS
// ==============================================================================

const generateMockActivity = (count: number): ActivityEvent[] => {
  const types: ActivityEvent['type'][] = [
    'query',
    'metadata',
    'replication',
    'election',
    'validation',
  ];
  const queries = [
    'SELECT * FROM solar_panels WHERE capacity > 500',
    'SELECT * FROM wind_turbines WHERE status = "active"',
    'SELECT * FROM energy_storage WHERE charge_level < 20',
    'SELECT * FROM grid_connections WHERE voltage > 400',
    'SELECT * FROM telemetry_logs ORDER BY timestamp DESC LIMIT 100',
  ];
  const tables = [
    'badges',
    'users',
    'solar_panels',
    'wind_turbines',
    'energy_storage',
  ];

  const activities: ActivityEvent[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const agent = Math.floor(Math.random() * 8) + 1;
    const minutesAgo = i * 2 + Math.floor(Math.random() * 3);

    let description = '';
    let duration;

    switch (type) {
      case 'query':
        description = `Query: ${
          queries[Math.floor(Math.random() * queries.length)]
        }`;
        duration = `${(Math.random() * 0.5).toFixed(2)}s`;
        break;
      case 'metadata':
        description = `TinyLlama generated ${
          Math.floor(Math.random() * 5) + 2
        } tags for dataset "${
          tables[Math.floor(Math.random() * tables.length)]
        }"`;
        duration = `${(Math.random() * 2 + 0.5).toFixed(1)}s`;
        break;
      case 'replication':
        description = `Table "${
          tables[Math.floor(Math.random() * tables.length)]
        }" replicated to Agents ${agent}, ${(agent % 8) + 1}, ${
          ((agent + 1) % 8) + 1
        }`;
        break;
      case 'election':
        description = `Agent ${agent} elected as new leader (reputation: ${(
          Math.random() * 0.3 +
          0.7
        ).toFixed(2)})`;
        break;
      case 'validation':
        description = `Schema validation completed for "${
          tables[Math.floor(Math.random() * tables.length)]
        }"`;
        duration = `${(Math.random() * 0.1).toFixed(2)}s`;
        break;
    }

    activities.push({
      id: `activity-${i}`,
      type,
      agent,
      description,
      timestamp: new Date(now.getTime() - minutesAgo * 60000),
      duration,
      status: Math.random() > 0.9 ? 'warning' : 'success',
    });
  }

  return activities;
};

const generateQueryMetrics = (): QueryMetric[] => {
  const metrics: QueryMetric[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    metrics.push({
      timestamp: new Date(now.getTime() - i * 5 * 60000), // 5-minute intervals
      responseTime: Math.random() * 400 + 100,
      queries: Math.floor(Math.random() * 20) + 5,
    });
  }

  return metrics;
};

const generateTopQueries = (): TopQuery[] => [
  { query: 'SELECT * FROM solar_panels', count: 23, avgTime: '0.21s' },
  { query: 'SELECT * FROM wind_turbines', count: 18, avgTime: '0.18s' },
  { query: 'SELECT * FROM energy_storage', count: 15, avgTime: '0.24s' },
  { query: 'SELECT * FROM grid_connections', count: 12, avgTime: '0.16s' },
  { query: 'SELECT * FROM telemetry_logs', count: 9, avgTime: '0.31s' },
];

const generateReplicationTasks = (): ReplicationTask[] => {
  const tables = ['users', 'badges', 'solar_panels', 'wind_turbines'];
  const tasks: ReplicationTask[] = [];

  // Active replications
  for (let i = 0; i < 2; i++) {
    tasks.push({
      table: tables[i],
      targetAgent: Math.floor(Math.random() * 8) + 1,
      progress: Math.floor(Math.random() * 60) + 20,
      status: 'active',
    });
  }

  // Queued replications
  for (let i = 0; i < 3; i++) {
    tasks.push({
      table: tables[Math.floor(Math.random() * tables.length)],
      targetAgent: Math.floor(Math.random() * 8) + 1,
      progress: 0,
      status: 'queued',
    });
  }

  return tasks;
};

const generateAIMetrics = (): AIMetrics => ({
  generatedToday: Math.floor(Math.random() * 30) + 40,
  avgGenerationTime: Math.random() * 1 + 0.8,
  qualityScore: Math.floor(Math.random() * 8) + 92,
  recentGenerations: [
    { dataset: 'wind_turbine_data', tags: 5, time: 0.8 },
    { dataset: 'solar_irradiance', tags: 3, time: 1.1 },
    { dataset: 'battery_storage', tags: 4, time: 0.9 },
  ],
});

const generateNetworkTraffic = (): NetworkTraffic[] => {
  const traffic: NetworkTraffic[] = [];

  for (let from = 1; from <= 8; from++) {
    for (let to = 1; to <= 8; to++) {
      if (from !== to) {
        traffic.push({
          from,
          to,
          messageCount: Math.floor(Math.random() * 100),
        });
      }
    }
  }

  return traffic;
};

const generateOperationsData = (): OperationsData => ({
  queriesLastHour: Math.floor(Math.random() * 50) + 140,
  metadataOpsLastHour: Math.floor(Math.random() * 20) + 35,
  activeReplications: Math.floor(Math.random() * 5) + 3,
  currentLeader: Math.floor(Math.random() * 8) + 1,
  leaderTenure: `${Math.floor(Math.random() * 5) + 1}h ${Math.floor(
    Math.random() * 60
  )}m`,
  avgResponseTime: Math.floor(Math.random() * 100) + 180,
});

// ==============================================================================
// COMPONENT
// ==============================================================================

const SwarmchestrateWidget: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'queries' | 'network'
  >('overview');
  const [recentActivity, setRecentActivity] = React.useState<ActivityEvent[]>(
    []
  );
  const [queryMetrics, setQueryMetrics] = React.useState<QueryMetric[]>([]);
  const [topQueries, setTopQueries] = React.useState<TopQuery[]>([]);
  const [replications, setReplications] = React.useState<ReplicationTask[]>([]);
  const [aiMetrics, setAIMetrics] = React.useState<AIMetrics | null>(null);
  const [networkTraffic, setNetworkTraffic] = React.useState<NetworkTraffic[]>(
    []
  );
  const [operations, setOperations] = React.useState<OperationsData | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  // Simulate data fetching and auto-refresh
  React.useEffect(() => {
    const loadData = () => {
      setRecentActivity(generateMockActivity(8));
      setQueryMetrics(generateQueryMetrics());
      setTopQueries(generateTopQueries());
      setReplications(generateReplicationTasks());
      setAIMetrics(generateAIMetrics());
      setNetworkTraffic(generateNetworkTraffic());
      setOperations(generateOperationsData());
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format timestamp
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);

    return `${hours}h ago`;
  };

  // Get activity icon
  const getActivityIcon = (type: ActivityEvent['type']): string => {
    switch (type) {
      case 'query':
        return '🔍';
      case 'metadata':
        return '🤖';
      case 'replication':
        return '🔄';
      case 'election':
        return '👑';
      case 'validation':
        return '✓';
      default:
        return '📊';
    }
  };

  // Get activity type label
  const getActivityTypeLabel = (type: ActivityEvent['type']): string => {
    switch (type) {
      case 'query':
        return 'Query Executed';
      case 'metadata':
        return 'AI Metadata Generated';
      case 'replication':
        return 'Replication Completed';
      case 'election':
        return 'Leader Election';
      case 'validation':
        return 'Schema Validation';
      default:
        return 'Operation';
    }
  };

  if (loading) {
    return (
      <div className="swarm-operations-widget">
        <div className="widget-header">
          <div className="header-content">
            <div className="icon-wrapper">
              <span className="widget-icon">🔄</span>
            </div>
            <div className="header-text">
              <h3>Swarm Operations</h3>
              <p className="subtitle">Real-time cluster activity</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading operations data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER - OVERVIEW TAB
  // ===========================================================================

  const renderOverview = () => (
    <div className="overview-content">
      {/* Recent Activity Feed */}
      <div className="activity-section">
        <h4>
          <span className="section-icon">📋</span>
          Recent Activity
        </h4>
        <div className="activity-feed">
          {recentActivity.slice(0, 6).map((activity) => (
            <div
              key={activity.id}
              className={`activity-item ${activity.status}`}
            >
              <div className="activity-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-details">
                <div className="activity-header">
                  <span className="activity-type">
                    {getActivityTypeLabel(activity.type)}
                  </span>
                  <span className="activity-time">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <div className="activity-description">
                  Agent {activity.agent} • {activity.description}
                </div>
                {activity.duration && (
                  <div className="activity-duration">{activity.duration}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* AI Metadata Generation */}
        {aiMetrics && (
          <div className="metric-card ai-metrics">
            <div className="metric-header">
              <span className="metric-icon">🤖</span>
              <h5>TinyLlama Activity</h5>
            </div>
            <div className="metric-stats">
              <div className="stat-row">
                <span className="stat-label">Generated Today:</span>
                <span className="stat-value">{aiMetrics.generatedToday}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Avg Time:</span>
                <span className="stat-value">
                  {aiMetrics.avgGenerationTime.toFixed(1)}s
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Quality Score:</span>
                <span className="stat-value highlight">
                  {aiMetrics.qualityScore}%
                </span>
              </div>
            </div>
            <div className="recent-list">
              {aiMetrics.recentGenerations.slice(0, 2).map((gen, idx) => (
                <div key={idx} className="recent-item">
                  <span className="dataset-name">{gen.dataset}</span>
                  <span className="tag-count">{gen.tags} tags</span>
                  <span className="gen-time">({gen.time}s)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replication Status */}
        <div className="metric-card replication-metrics">
          <div className="metric-header">
            <span className="metric-icon">🔄</span>
            <h5>Active Replications</h5>
          </div>
          <div className="replication-summary">
            <div className="summary-stat">
              <span className="summary-value">
                {replications.filter((r) => r.status === 'active').length}
              </span>
              <span className="summary-label">In Progress</span>
            </div>
            <div className="summary-stat">
              <span className="summary-value">
                {replications.filter((r) => r.status === 'queued').length}
              </span>
              <span className="summary-label">Queued</span>
            </div>
          </div>
          {replications
            .filter((r) => r.status === 'active')
            .slice(0, 2)
            .map((task, idx) => (
              <div key={idx} className="replication-task">
                <div className="task-header">
                  <span className="task-name">{task.table}</span>
                  <span className="task-progress">{task.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="task-target">→ Agent {task.targetAgent}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Leader Info */}
      {operations && (
        <div className="leader-info">
          <div className="leader-icon">👑</div>
          <div className="leader-details">
            <div className="leader-label">Current Leader</div>
            <div className="leader-value">
              Agent {operations.currentLeader}{' '}
              <span className="leader-tenure">({operations.leaderTenure})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ===========================================================================
  // RENDER - QUERIES TAB
  // ===========================================================================

  const renderQueries = () => (
    <div className="queries-content">
      {/* Query Performance Chart */}
      <div className="chart-section">
        <h4>
          <span className="section-icon">📊</span>
          Query Performance (Last Hour)
        </h4>
        <div className="performance-chart">
          <div className="chart-container">
            {queryMetrics.map((metric, idx) => {
              const maxTime = Math.max(
                ...queryMetrics.map((m) => m.responseTime)
              );
              const height = (metric.responseTime / maxTime) * 100;

              return (
                <div key={idx} className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                    title={`${metric.responseTime.toFixed(0)}ms - ${
                      metric.queries
                    } queries`}
                  >
                    <div className="bar-fill" />
                  </div>
                  <div className="chart-label">
                    {metric.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color" />
              <span>Response Time (ms)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="top-queries-section">
        <h4>
          <span className="section-icon">🔥</span>
          Most Frequent Queries
        </h4>
        <div className="queries-list">
          {topQueries.map((query, idx) => (
            <div key={idx} className="query-item">
              <div className="query-rank">{idx + 1}</div>
              <div className="query-details">
                <div className="query-text">{query.query}</div>
                <div className="query-stats">
                  <span className="query-count">{query.count} executions</span>
                  <span className="query-time">Avg: {query.avgTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // RENDER - NETWORK TAB
  // ===========================================================================

  const renderNetwork = () => {
    // Calculate max traffic for heatmap
    const maxTraffic = Math.max(...networkTraffic.map((t) => t.messageCount));

    return (
      <div className="network-content">
        <h4>
          <span className="section-icon">🌐</span>
          Network Traffic Heatmap (Messages)
        </h4>
        <div className="network-heatmap">
          <div className="heatmap-grid">
            {/* Header row */}
            <div className="heatmap-cell header corner" />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((agent) => (
              <div key={`h-${agent}`} className="heatmap-cell header">
                Agent {agent}
              </div>
            ))}

            {/* Data rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((from) => (
              <React.Fragment key={`row-${from}`}>
                <div className="heatmap-cell header">Agent {from}</div>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((to) => {
                  if (from === to) {
                    return (
                      <div
                        key={`${from}-${to}`}
                        className="heatmap-cell diagonal"
                      >
                        -
                      </div>
                    );
                  }

                  const traffic = networkTraffic.find(
                    (t) => t.from === from && t.to === to
                  );
                  const intensity = traffic
                    ? traffic.messageCount / maxTraffic
                    : 0;
                  const opacity = 0.2 + intensity * 0.8;

                  return (
                    <div
                      key={`${from}-${to}`}
                      className="heatmap-cell data"
                      style={{
                        background: `rgba(102, 126, 234, ${opacity})`,
                        color: intensity > 0.5 ? 'white' : '#333',
                      }}
                      title={`${from} → ${to}: ${
                        traffic?.messageCount || 0
                      } messages`}
                    >
                      {traffic?.messageCount || 0}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="heatmap-legend">
            <span>Low Traffic</span>
            <div className="legend-gradient" />
            <span>High Traffic</span>
          </div>
        </div>
      </div>
    );
  };

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  return (
    <div className="swarm-operations-widget">
      {/* Header */}
      <div className="widget-header">
        <div className="header-content">
          <div className="icon-wrapper">
            <span className="widget-icon">🔄</span>
          </div>
          <div className="header-text">
            <h3>Swarm Operations</h3>
            <p className="subtitle">Real-time cluster activity</p>
          </div>
        </div>

        {operations && (
          <div className="header-metrics">
            <div className="header-metric">
              <div className="metric-value">{operations.queriesLastHour}</div>
              <div className="metric-label">Queries</div>
            </div>
            <div className="header-metric">
              <div className="metric-value">
                {operations.metadataOpsLastHour}
              </div>
              <div className="metric-label">Metadata Ops</div>
            </div>
            <div className="header-metric">
              <div className="metric-value">
                {operations.activeReplications}
              </div>
              <div className="metric-label">Replications</div>
            </div>
            <div className="header-metric">
              <div className="metric-value">{operations.avgResponseTime}ms</div>
              <div className="metric-label">Avg Response</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'queries' ? 'active' : ''}`}
          onClick={() => setActiveTab('queries')}
        >
          <span className="tab-icon">🔍</span>
          Queries
        </button>
        <button
          className={`tab-btn ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <span className="tab-icon">🌐</span>
          Network
        </button>
      </div>

      {/* Body */}
      <div className="widget-body">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'queries' && renderQueries()}
        {activeTab === 'network' && renderNetwork()}
      </div>

      {/* Footer */}
      <div className="widget-footer">
        <div className="footer-info">
          <span className="footer-icon">🔄</span>
          Auto-refresh: 30s
        </div>
        <div className="footer-info">
          <span className="footer-icon">🕒</span>
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default SwarmchestrateWidget;
