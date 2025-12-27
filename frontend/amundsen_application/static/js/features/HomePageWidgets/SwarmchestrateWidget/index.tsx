// ==============================================================================
// SwarmchestrateWidget - Swarm Operations Dashboard
// ==============================================================================
// PHASE 2: Now uses dynamic apiConfig for Docker + K3s compatibility
// ==============================================================================

import * as React from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig'; // ← PHASE 2 IMPORT
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
// RUNTIME AGENT DETECTION - PHASE 2 UPDATED
// ==============================================================================

/**
 * ✅ PHASE 2: Uses dynamic apiConfig to detect running agents
 */
const detectRunningAgents = async (): Promise<number> => {
  try {
    // ✅ PHASE 2: Use buildApiUrl for dynamic URL
    const statusUrl = buildApiUrl('optimusdb', '/swarmkb/agent/status', 1);

    const response = await fetch(statusUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      console.warn(
        'Agent status endpoint returned error, using getAvailableNodes'
      );
      // Fallback to discovering nodes directly
      const nodes = await getAvailableNodes();

      return nodes.length;
    }

    const data = await response.json();
    const totalAgents = data.cluster?.total_peers || 8;

    console.log(
      `SwarmchestrateWidget: Detected ${totalAgents} agents from cluster.total_peers`
    );

    return totalAgents;
  } catch (error) {
    console.warn(
      'Failed to detect agents from API, using getAvailableNodes:',
      error
    );
    // Final fallback: use node discovery
    try {
      const nodes = await getAvailableNodes();

      return nodes.length;
    } catch {
      return 8; // Ultimate fallback
    }
  }
};

// ==============================================================================
// MOCK DATA GENERATORS
// ==============================================================================

const generateMockActivity = (
  count: number,
  numAgents: number
): ActivityEvent[] => {
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
  ];
  const tables = ['badges', 'users', 'solar_panels', 'wind_turbines'];

  const activities: ActivityEvent[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const agent = Math.floor(Math.random() * numAgents) + 1;
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
        }" replicated to Agents ${agent}, ${(agent % numAgents) + 1}, ${
          ((agent + 1) % numAgents) + 1
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
      timestamp: new Date(now.getTime() - i * 5 * 60000),
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

const generateReplicationTasks = (numAgents: number): ReplicationTask[] => {
  const tables = ['users', 'badges', 'solar_panels', 'wind_turbines'];
  const tasks: ReplicationTask[] = [];

  for (let i = 0; i < 2; i++) {
    tasks.push({
      table: tables[i],
      targetAgent: Math.floor(Math.random() * numAgents) + 1,
      progress: Math.floor(Math.random() * 60) + 20,
      status: 'active',
    });
  }

  for (let i = 0; i < 3; i++) {
    tasks.push({
      table: tables[Math.floor(Math.random() * tables.length)],
      targetAgent: Math.floor(Math.random() * numAgents) + 1,
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

const generateNetworkTraffic = (numAgents: number): NetworkTraffic[] => {
  const traffic: NetworkTraffic[] = [];

  for (let from = 1; from <= numAgents; from++) {
    for (let to = 1; to <= numAgents; to++) {
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

const generateOperationsData = (numAgents: number): OperationsData => ({
  queriesLastHour: Math.floor(Math.random() * 50) + 140,
  metadataOpsLastHour: Math.floor(Math.random() * 20) + 35,
  activeReplications: Math.floor(Math.random() * 5) + 3,
  currentLeader: Math.floor(Math.random() * numAgents) + 1,
  leaderTenure: `${Math.floor(Math.random() * 5) + 1}h ${Math.floor(
    Math.random() * 60
  )}m`,
  avgResponseTime: Math.floor(Math.random() * 100) + 180,
});

// ==============================================================================
// COMPONENT - PHASE 2 UPDATED
// ==============================================================================

const SwarmchestrateWidget: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'queries' | 'network'
  >('overview');
  const [numAgents, setNumAgents] = React.useState<number>(8);
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
  const [detecting, setDetecting] = React.useState(true);

  // ✅ PHASE 2: Runtime agent detection
  React.useEffect(() => {
    const detectAgents = async () => {
      setDetecting(true);
      const detectedCount = await detectRunningAgents();

      setNumAgents(detectedCount);
      setDetecting(false);
      console.log(`SwarmchestrateWidget: Detected ${detectedCount} agents`);
    };

    detectAgents();
    const detectionInterval = setInterval(detectAgents, 5 * 60 * 1000);

    return () => clearInterval(detectionInterval);
  }, []);

  // Load mock data
  React.useEffect(() => {
    if (detecting) return;

    const loadData = () => {
      setRecentActivity(generateMockActivity(8, numAgents));
      setQueryMetrics(generateQueryMetrics());
      setTopQueries(generateTopQueries());
      setReplications(generateReplicationTasks(numAgents));
      setAIMetrics(generateAIMetrics());
      setNetworkTraffic(generateNetworkTraffic(numAgents));
      setOperations(generateOperationsData(numAgents));
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [numAgents, detecting]);

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);

    return `${hours}h ago`;
  };

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

  if (loading || detecting) {
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
            <p>
              {detecting ? 'Detecting agents...' : 'Loading operations data...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render functions
  const renderOverview = () => (
    <div className="overview-content">
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

      <div className="metrics-grid">
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
                <span className="stat-label">Quality Score:</span>
                <span className="stat-value highlight">
                  {aiMetrics.qualityScore}%
                </span>
              </div>
            </div>
          </div>
        )}

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
          </div>
        </div>
      </div>

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

  const renderQueries = () => (
    <div className="queries-content">
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
        </div>
      </div>

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

  const renderNetwork = () => {
    const maxTraffic = Math.max(...networkTraffic.map((t) => t.messageCount));
    const agentArray = Array.from({ length: numAgents }, (_, i) => i + 1);

    return (
      <div className="network-content">
        <h4>
          <span className="section-icon">🌐</span>
          Network Traffic Heatmap ({numAgents}×{numAgents} - {numAgents} Agents
          Detected)
        </h4>
        <div className="network-heatmap">
          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `80px repeat(${numAgents}, 1fr)` }}
          >
            <div className="heatmap-cell header corner" />
            {agentArray.map((agent) => (
              <div key={`h-${agent}`} className="heatmap-cell header">
                Agent {agent}
              </div>
            ))}

            {agentArray.map((from) => (
              <React.Fragment key={`row-${from}`}>
                <div className="heatmap-cell header">Agent {from}</div>
                {agentArray.map((to) => {
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

      <div className="widget-body">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'queries' && renderQueries()}
        {activeTab === 'network' && renderNetwork()}
      </div>

      <div className="widget-footer">
        <div className="footer-info">
          <span className="footer-icon">🔄</span>
          Auto-refresh: 30s
        </div>
        <div className="footer-info">
          <span className="footer-icon">🌐</span>
          {numAgents} Agent{numAgents !== 1 ? 's' : ''} Detected
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
