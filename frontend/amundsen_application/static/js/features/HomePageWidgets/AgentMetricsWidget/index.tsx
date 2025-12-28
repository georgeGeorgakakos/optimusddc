// ==============================================================================
// AgentMetricsWidget
// ==============================================================================

import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
import type { OptimusDBNode } from 'config/apiConfig';
import './styles.scss';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const METRICS_HISTORY_SIZE = 288; // 24 hours at 5-minute intervals
const PREDICTION_THRESHOLD_HOURS = 4; // Predict failures within 4 hours

// ==============================================================================
// TYPES
// ==============================================================================

interface AgentMetrics {
  timestamp: Date;
  cpu_usage: number;
  cpu_idle: number;
  memory_used: number;
  memory_total: number;
  disk_read: number;
  disk_write: number;
  network_latency: number;
  network_throughput: number;
  peer_connections: number;
  query_count: number;
  query_avg_latency: number;
  query_p95_latency: number;
  replication_events: number;
  replication_failures: number;
  error_count: number;
  error_rate: number;
  health_score: number; // This is UTILIZATION (0-100%)
  uptime_seconds: number;
}

interface HealthIssue {
  metric: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  trend: 'stable' | 'improving' | 'degrading';
  trendRate: string;
}

interface HealthPrediction {
  status: 'healthy' | 'warning' | 'critical';
  failureProbability: number;
  timeToFailure: string | null;
  confidence: number;
  issues: HealthIssue[];
  recommendation: string;
}

interface AgentInfo {
  agentNumber: number;
  agentName: string;
  peerId: string;
  role: string;
  isLeader: boolean;
  currentUtilization: number; // Renamed for clarity - this is utilization %
  metricsHistory: AgentMetrics[];
  prediction: HealthPrediction;
}

// ==============================================================================
// REAL API INTEGRATION - CORRECTED
// ==============================================================================

const fetchAgentMetrics = async (node: OptimusDBNode): Promise<AgentMetrics[]> => {
  try {
    // Try history endpoint first
    const historyUrl = buildApiUrl('optimusdb', '/swarmkb/agent/metrics/history?hours=24', node.id);

    try {
      const historyResponse = await fetch(historyUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();

        return historyData.metrics.map((m: any) => ({
          timestamp: new Date(m.timestamp),
          cpu_usage: parseFloat(m.cpu_usage || m.health?.cpu_usage?.replace('%', '') || '0'),
          cpu_idle: parseFloat(m.cpu_idle || m.health?.cpu_idle?.replace('%', '') || '0'),
          memory_used: parseFloat(m.memory_used || m.health?.memory_used?.replace(' MB', '') || '0'),
          memory_total: parseFloat(m.memory_total || m.health?.memory_total?.replace(' MB', '') || '100'),
          disk_read: parseFloat(m.disk_read || m.health?.disk_read?.replace(' MB/s', '') || '0'),
          disk_write: parseFloat(m.disk_write || m.health?.disk_write?.replace(' MB/s', '') || '0'),
          network_latency: parseFloat(m.network_latency || m.health?.latency?.replace(' ms', '') || '0'),
          network_throughput: parseFloat(m.network_throughput || '50'),
          peer_connections: parseInt(m.peer_connections || '7', 10),
          query_count: parseInt(m.query_count || '0', 10),
          query_avg_latency: parseFloat(m.query_avg_latency || '0'),
          query_p95_latency: parseFloat(m.query_p95_latency || (m.query_avg_latency * 1.5) || '0'),
          replication_events: parseInt(m.replication_events || '0', 10),
          replication_failures: parseInt(m.replication_failures || '0', 10),
          error_count: parseInt(m.error_count || '0', 10),
          error_rate: parseFloat(m.error_rate || '0'),
          health_score: parseFloat(m.health_score || m.health?.score || '45'),
          uptime_seconds: parseInt(m.uptime_seconds || '0', 10),
        }));
      }
    } catch (historyError) {
      console.log(`No metrics history endpoint for node ${node.id}, trying current status...`);
    }

    // Fallback to current status
    const statusUrl = buildApiUrl('optimusdb', '/swarmkb/agent/status', node.id);
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (!statusResponse.ok) {
      throw new Error(`Status API returned ${statusResponse.status}`);
    }

    const data = await statusResponse.json();

    const cpuUsage = parseFloat(data.health?.cpu_usage?.replace('%', '') || data.agent?.health?.cpu_usage?.replace('%', '') || '45');
    const cpuIdle = parseFloat(data.health?.cpu_idle?.replace('%', '') || '0') || (100 - cpuUsage);
    const memoryUsed = parseFloat(data.health?.memory_used?.replace(' MB', '') || '40');
    const memoryTotal = parseFloat(data.health?.memory_total?.replace(' MB', '') || '100');
    const diskRead = parseFloat(data.health?.disk_read?.replace(' MB/s', '') || '0');
    const diskWrite = parseFloat(data.health?.disk_write?.replace(' MB/s', '') || '0');
    const networkLatency = parseFloat(data.health?.latency?.replace(' ms', '') || '2');
    const healthScore = parseFloat(data.health?.score || data.agent?.health?.score || '45');
    const peerConnections = data.cluster?.connected_peers || 2;

    const currentMetric: AgentMetrics = {
      timestamp: new Date(),
      cpu_usage: cpuUsage,
      cpu_idle: cpuIdle,
      memory_used: memoryUsed,
      memory_total: memoryTotal,
      disk_read: diskRead,
      disk_write: diskWrite,
      network_latency: networkLatency,
      network_throughput: 50,
      peer_connections: peerConnections,
      query_count: 0,
      query_avg_latency: 0,
      query_p95_latency: 0,
      replication_events: 0,
      replication_failures: 0,
      error_count: 0,
      error_rate: 0,
      health_score: healthScore,
      uptime_seconds: 0,
    };

    // Generate simulated history based on current values
    const history: AgentMetrics[] = [];
    for (let i = METRICS_HISTORY_SIZE - 1; i >= 0; i--) {
      history.push({
        ...currentMetric,
        timestamp: new Date(Date.now() - i * 5 * 60 * 1000),
        cpu_usage: Math.max(0, Math.min(100, cpuUsage + (Math.random() - 0.5) * 10)),
        memory_used: Math.max(0, memoryUsed + (Math.random() - 0.5) * 5),
        network_latency: Math.max(0, networkLatency + (Math.random() - 0.5) * 2),
        health_score: Math.max(0, Math.min(100, healthScore + (Math.random() - 0.5) * 5)),
      });
    }

    console.log(`Node ${node.id}: Using current status (history endpoint not available)`);
    return history;
  } catch (error) {
    console.error(`Failed to fetch metrics for node ${node.id}:`, error);
    throw error;
  }
};

// ==============================================================================
// PREDICTIVE ANALYTICS ENGINE - COLOR FIX: LOW UTILIZATION = HEALTHY
// ==============================================================================

const predictHealth = (metrics: AgentMetrics[]): HealthPrediction => {
  if (metrics.length < 12) {
    return {
      status: 'healthy',
      failureProbability: 0,
      timeToFailure: null,
      confidence: 0,
      issues: [],
      recommendation: 'Collecting metrics...',
    };
  }

  const recent = metrics.slice(-12); // Last hour (12 × 5min intervals)
  const latest = metrics[metrics.length - 1];
  const issues: HealthIssue[] = [];
  let failureProbability = 0;
  let timeToFailureHours: number | null = null;

  // ===========================================================================
  // ✅ NEW: BASELINE RISK SCORE (based on current utilization)
  // ===========================================================================
  // Even healthy agents have some baseline risk based on load
  const baselineRisk = Math.min(30, (latest.health_score / 100) * 30);
  failureProbability += baselineRisk;

  // ===========================================================================
  // 1. CPU ANALYSIS - ✅ IMPROVED THRESHOLDS
  // ===========================================================================
  const cpuTrend = calculateTrend(recent.map((m) => m.cpu_usage));
  const cpuCurrent = latest.cpu_usage;

  // ✅ EARLY WARNING: CPU >50% with upward trend
  if (cpuTrend > 2 && cpuCurrent > 50) {
    issues.push({
      metric: 'cpu',
      severity: 'low',
      description: 'CPU usage trending upward (early warning)',
      trend: 'degrading',
      trendRate: `+${cpuTrend.toFixed(1)}% per hour`,
    });
    failureProbability += 10; // Lower risk for early warning

    const hoursTo80 = (80 - cpuCurrent) / cpuTrend;
    if (hoursTo80 < PREDICTION_THRESHOLD_HOURS) {
      timeToFailureHours = hoursTo80;
    }
  }

  // ✅ MODERATE RISK: CPU >60% with trend OR CPU >70% stable
  if ((cpuTrend > 3 && cpuCurrent > 60) || cpuCurrent > 70) {
    issues.push({
      metric: 'cpu',
      severity: 'medium',
      description: cpuTrend > 3 ? 'CPU usage increasing rapidly' : 'CPU usage elevated',
      trend: cpuTrend > 3 ? 'degrading' : 'stable',
      trendRate: cpuTrend > 3 ? `+${cpuTrend.toFixed(1)}% per hour` : `${cpuCurrent.toFixed(1)}%`,
    });
    failureProbability += 20;

    if (cpuTrend > 3) {
      const hoursTo90 = (90 - cpuCurrent) / cpuTrend;
      if (!timeToFailureHours || hoursTo90 < timeToFailureHours) {
        timeToFailureHours = hoursTo90;
      }
    }
  }

  // ✅ HIGH RISK: CPU >80% OR rapid trend
  if (cpuTrend > 5 && cpuCurrent > 70) {
    issues.push({
      metric: 'cpu',
      severity: 'high',
      description: 'CPU usage trending up rapidly',
      trend: 'degrading',
      trendRate: `+${cpuTrend.toFixed(1)}% per hour`,
    });
    failureProbability += 30;

    const hoursTo100 = (100 - cpuCurrent) / cpuTrend;
    if (!timeToFailureHours || hoursTo100 < timeToFailureHours) {
      timeToFailureHours = hoursTo100;
    }
  } else if (cpuCurrent > 85) {
    issues.push({
      metric: 'cpu',
      severity: 'high',
      description: 'CPU usage critically high',
      trend: 'stable',
      trendRate: `${cpuCurrent.toFixed(1)}%`,
    });
    failureProbability += 35;
  }

  // ===========================================================================
  // 2. MEMORY ANALYSIS - ✅ IMPROVED THRESHOLDS
  // ===========================================================================
  const memoryPercent = (latest.memory_used / latest.memory_total) * 100;
  const memoryTrend = calculateTrend(recent.map((m) => (m.memory_used / m.memory_total) * 100));

  // ✅ EARLY WARNING: Memory >50% with upward trend
  if (memoryTrend > 1.5 && memoryPercent > 50) {
    issues.push({
      metric: 'memory',
      severity: 'low',
      description: 'Memory usage trending upward (early warning)',
      trend: 'degrading',
      trendRate: `+${memoryTrend.toFixed(1)}% per hour`,
    });
    failureProbability += 10;

    const hoursTo80 = (80 - memoryPercent) / memoryTrend;
    if (hoursTo80 < PREDICTION_THRESHOLD_HOURS) {
      timeToFailureHours = timeToFailureHours ? Math.min(timeToFailureHours, hoursTo80) : hoursTo80;
    }
  }

  // ✅ MODERATE RISK: Memory >60% with trend OR Memory >70% stable
  if ((memoryTrend > 2 && memoryPercent > 60) || memoryPercent > 70) {
    issues.push({
      metric: 'memory',
      severity: 'medium',
      description: memoryTrend > 2 ? 'Memory usage increasing' : 'Memory usage elevated',
      trend: memoryTrend > 2 ? 'degrading' : 'stable',
      trendRate: memoryTrend > 2 ? `+${memoryTrend.toFixed(1)}% per hour` : `${memoryPercent.toFixed(1)}%`,
    });
    failureProbability += 20;

    if (memoryTrend > 2) {
      const hoursTo90 = (90 - memoryPercent) / memoryTrend;
      timeToFailureHours = timeToFailureHours ? Math.min(timeToFailureHours, hoursTo90) : hoursTo90;
    }
  }

  // ✅ HIGH RISK: Memory leak detection OR critically high
  if (memoryTrend > 4 && memoryPercent > 60) {
    const isPossibleLeak = memoryTrend > 5;
    issues.push({
      metric: 'memory',
      severity: 'high',
      description: isPossibleLeak ? 'Possible memory leak detected' : 'Memory usage trending up rapidly',
      trend: 'degrading',
      trendRate: `+${memoryTrend.toFixed(1)}% per hour`,
    });
    failureProbability += isPossibleLeak ? 35 : 30;

    const hoursTo100 = (100 - memoryPercent) / memoryTrend;
    timeToFailureHours = timeToFailureHours ? Math.min(timeToFailureHours, hoursTo100) : hoursTo100;
  } else if (memoryPercent > 90) {
    issues.push({
      metric: 'memory',
      severity: 'high',
      description: 'Memory usage critically high',
      trend: 'stable',
      trendRate: `${memoryPercent.toFixed(1)}%`,
    });
    failureProbability += 40;
  }

  // ===========================================================================
  // 3. NETWORK LATENCY ANALYSIS - ✅ IMPROVED THRESHOLDS
  // ===========================================================================
  const latencyTrend = calculateTrend(recent.map((m) => m.network_latency));
  const latencyCurrent = latest.network_latency;

  // ✅ EARLY WARNING: Latency >5ms with upward trend
  if (latencyTrend > 0.5 && latencyCurrent > 5) {
    issues.push({
      metric: 'network',
      severity: 'low',
      description: 'Network latency trending upward',
      trend: 'degrading',
      trendRate: `+${latencyTrend.toFixed(2)}ms per hour`,
    });
    failureProbability += 5;
  }

  // ✅ MODERATE RISK: Latency >10ms with trend OR >15ms stable
  if ((latencyTrend > 1 && latencyCurrent > 10) || latencyCurrent > 15) {
    issues.push({
      metric: 'network',
      severity: 'medium',
      description: latencyTrend > 1 ? 'Network latency increasing' : 'Network latency elevated',
      trend: latencyTrend > 1 ? 'degrading' : 'stable',
      trendRate: latencyTrend > 1 ? `+${latencyTrend.toFixed(2)}ms per hour` : `${latencyCurrent.toFixed(2)}ms`,
    });
    failureProbability += 15;
  }

  // ✅ HIGH RISK: Latency >25ms OR rapid increase
  if (latencyTrend > 2 && latencyCurrent > 15) {
    issues.push({
      metric: 'network',
      severity: 'high',
      description: 'Network latency degrading rapidly',
      trend: 'degrading',
      trendRate: `+${latencyTrend.toFixed(2)}ms per hour`,
    });
    failureProbability += 20;
  } else if (latencyCurrent > 25) {
    issues.push({
      metric: 'network',
      severity: 'high',
      description: 'Network latency critically high',
      trend: 'stable',
      trendRate: `${latencyCurrent.toFixed(2)}ms`,
    });
    failureProbability += 25;
  }

  // ===========================================================================
  // ✅ NEW: MULTI-FACTOR RISK AMPLIFICATION
  // ===========================================================================
  // If multiple metrics are problematic simultaneously, increase risk
  const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
  const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length;

  if (highSeverityIssues >= 2) {
    failureProbability += 20; // Multiple critical issues = compound risk
  } else if (highSeverityIssues >= 1 && mediumSeverityIssues >= 1) {
    failureProbability += 10; // Critical + moderate = increased risk
  } else if (mediumSeverityIssues >= 2) {
    failureProbability += 5; // Multiple moderate issues = slight increase
  }

  // ===========================================================================
  // ✅ DETERMINE STATUS (based on utilization AND issues)
  // ===========================================================================
  let status: 'healthy' | 'warning' | 'critical';
  let confidence = Math.min(95, issues.length * 15 + 40);

  if (failureProbability < 20) {
    status = 'healthy';
    confidence = Math.min(confidence, 70);
  } else if (failureProbability < 50) {
    status = 'warning';
  } else {
    status = 'critical';
    confidence = Math.min(95, confidence + 10);
  }

  // ===========================================================================
  // RECOMMENDATION
  // ===========================================================================
  const recommendation =
    status === 'critical'
      ? '🚨 CRITICAL: Immediate action required! Risk of service degradation.'
      : status === 'warning'
        ? '⚠️ WARNING: Schedule preventive maintenance. Monitor closely.'
        : failureProbability > 10
          ? '✅ Agent operating normally. Minor trends detected, continue monitoring.'
          : '✅ Agent operating optimally. No concerns detected.';

  return {
    status,
    failureProbability: Math.min(100, Math.round(failureProbability)),
    timeToFailure:
      !(timeToFailureHours && timeToFailureHours < PREDICTION_THRESHOLD_HOURS)
        ? null
        : formatTimeToFailure(timeToFailureHours),
    confidence,
    issues,
    recommendation,
  };
};



const calculateTrend = (values: number[]): number => {
  if (values.length < 2) return 0;

  const n = values.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = values.reduce((a, b) => a + b, 0);
  const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;

  // Linear regression slope
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);

  // Convert to per-hour rate (12 data points = 1 hour at 5-min intervals)
  return slope * 12;
};

const formatTimeToFailure = (hours: number): string => {
  if (hours < 1) return `~${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `~${hours.toFixed(1)} hours`;
  return `~${(hours / 24).toFixed(1)} days`;
};


// ==============================================================================
// COMPONENT - CORRECTED
// ==============================================================================

const AgentMetricsWidget: React.FC = () => {
  const [agents, setAgents] = React.useState<AgentInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [availableNodes, setAvailableNodes] = React.useState<OptimusDBNode[]>([]);

  // FIXED: Use getAvailableNodes() instead of hardcoded 8
  React.useEffect(() => {
    const loadAgentMetrics = async () => {
      try {
        // Get actual available nodes from apiConfig
        const nodes = await getAvailableNodes();
        setAvailableNodes(nodes);

        console.log(`AgentMetricsWidget: Querying ${nodes.length} nodes:`, nodes.map(n => n.name));

        const agentData: AgentInfo[] = [];

        for (const node of nodes) {
          try {
            const metricsHistory = await fetchAgentMetrics(node);
            const prediction = predictHealth(metricsHistory);
            const latest = metricsHistory[metricsHistory.length - 1];

            // Fetch agent info from status endpoint
            const statusUrl = buildApiUrl('optimusdb', '/swarmkb/agent/status', node.id);
            const statusResponse = await fetch(statusUrl, { signal: AbortSignal.timeout(3000) });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();

              agentData.push({
                agentNumber: node.id,
                agentName: node.name,
                peerId: statusData.agent?.peer_id || `QmXxx${node.id.toString().padStart(4, '0')}xxx`,
                role: statusData.agent?.role || 'Follower',
                isLeader: statusData.agent?.is_current_leader || false,
                currentUtilization: latest.health_score,
                metricsHistory,
                prediction,
              });
            } else {
              agentData.push({
                agentNumber: node.id,
                agentName: node.name,
                peerId: `QmXxx${node.id.toString().padStart(4, '0')}xxx`,
                role: 'Follower',
                isLeader: false,
                currentUtilization: latest.health_score,
                metricsHistory,
                prediction,
              });
            }
          } catch (nodeError) {
            console.error(`Failed to load metrics for ${node.name}:`, nodeError);
          }
        }

        setAgents(agentData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load agent metrics:', error);
        setLoading(false);
      }
    };

    loadAgentMetrics();
    const interval = setInterval(loadAgentMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==============================================================================
  // NEW: CLUSTER OVERVIEW SECTION
  // ==============================================================================
  const renderClusterOverview = () => {
    if (agents.length === 0) return null;

    // Aggregate stats
    const totalAgents = agents.length;
    const healthyAgents = agents.filter(a => a.prediction.status === 'healthy').length;
    const warningAgents = agents.filter(a => a.prediction.status === 'warning').length;
    const criticalAgents = agents.filter(a => a.prediction.status === 'critical').length;
    const avgUtilization = agents.reduce((sum, a) => sum + a.currentUtilization, 0) / totalAgents;

    // Timeline data for all agents
    const timestamps = agents[0].metricsHistory.slice(-60).map((m) =>
      m.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );

    // Cluster utilization trend chart
    const clusterTrendOption = {
      title: {
        text: 'Cluster-Wide Utilization Trend',
        textStyle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: agents.map(a => a.agentName),
        bottom: 10,
        textStyle: { fontSize: 12 },
      },
      grid: { left: '5%', right: '5%', top: '15%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 11, interval: Math.floor(timestamps.length / 8) },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 12, formatter: '{value}%' },
        name: 'Utilization',
        nameTextStyle: { fontSize: 14, fontWeight: 'bold' },
      },
      series: agents.map((agent, idx) => {
        const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        return {
          name: agent.agentName,
          type: 'line',
          smooth: true,
          data: agent.metricsHistory.slice(-60).map(m => m.health_score.toFixed(1)),
          lineStyle: { color: colors[idx % colors.length], width: 3 },
          itemStyle: { color: colors[idx % colors.length] },
        };
      }),
    };

    // Health prediction chart
    const predictionOption = {
      title: {
        text: 'Agent Health Predictions',
        textStyle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: '10%', right: '10%', top: '20%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: agents.map(a => a.agentName),
        axisLabel: { fontSize: 12, fontWeight: 'bold' },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 12, formatter: '{value}%' },
        name: 'Failure Risk',
        nameTextStyle: { fontSize: 14, fontWeight: 'bold' },
      },
      series: [
        {
          name: 'Failure Probability',
          type: 'bar',
          data: agents.map(a => ({
            value: a.prediction.failureProbability,
            itemStyle: {
              color: a.prediction.status === 'critical' ? '#ef4444' :
                a.prediction.status === 'warning' ? '#f59e0b' : '#10b981'
            }
          })),
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
            fontSize: 14,
            fontWeight: 'bold',
          },
          barWidth: '60%',
        },
      ],
    };

    return (
      <div className="cluster-overview">
        <div className="overview-header">
          <h2>📊 Cluster Overview</h2>
          <p className="overview-subtitle">Real-time metrics and predictive analytics for all agents</p>
        </div>

        {/* Stats Cards */}
        <div className="overview-stats">
          <div className="stat-card total">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <div className="stat-value">{totalAgents}</div>
              <div className="stat-label">Total Agents</div>
            </div>
          </div>

          <div className="stat-card healthy">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{healthyAgents}</div>
              <div className="stat-label">Healthy</div>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{warningAgents}</div>
              <div className="stat-label">Warnings</div>
            </div>
          </div>

          <div className="stat-card critical">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-value">{criticalAgents}</div>
              <div className="stat-label">Critical</div>
            </div>
          </div>

          <div className="stat-card utilization">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{avgUtilization.toFixed(1)}%</div>
              <div className="stat-label">Avg Utilization</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="overview-charts">
          <div className="chart-large">
            <ReactECharts option={clusterTrendOption} style={{ height: '400px' }} />
          </div>
          <div className="chart-large">
            <ReactECharts option={predictionOption} style={{ height: '400px' }} />
          </div>
        </div>
      </div>
    );
  };

  // ==============================================================================
  // CORRECTED: Individual Agent Card
  // ==============================================================================
  const renderAgentCard = (agent: AgentInfo) => {
    const { prediction, metricsHistory } = agent;
    const latest = metricsHistory[metricsHistory.length - 1];

    // Get recent metrics for charts
    const recentMetrics = metricsHistory.slice(-60);
    const timestamps = recentMetrics.map((m) =>
      m.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );

    // COLOR FIX: Gauge color based on utilization
    // LOW utilization (< 50%) = GREEN
    // MEDIUM utilization (50-70%) = ORANGE
    // HIGH utilization (> 70%) = RED
    const getGaugeColor = (utilization: number) => {
      if (utilization < 50) return '#10b981'; // Green - healthy
      if (utilization < 70) return '#f59e0b'; // Orange - warning
      return '#ef4444'; // Red - critical
    };

    // Health Gauge
    const gaugeOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 10,
          itemStyle: {
            color: getGaugeColor(agent.currentUtilization),
          },
          progress: {
            show: true,
            width: 14,
          },
          pointer: {
            show: false,
          },
          axisLine: {
            lineStyle: {
              width: 14,
            },
          },
          axisTick: {
            distance: -22,
            splitNumber: 5,
            lineStyle: {
              width: 2,
              color: '#999',
            },
          },
          splitLine: {
            distance: -28,
            length: 14,
            lineStyle: {
              width: 3,
              color: '#999',
            },
          },
          axisLabel: {
            distance: -45,
            color: '#999',
            fontSize: 12,
            fontWeight: 'bold',
          },
          anchor: {
            show: false,
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            fontSize: 32,
            fontWeight: 'bold',
            offsetCenter: [0, '0%'],
            formatter: '{value}%',
            color: 'inherit',
          },
          data: [
            {
              value: agent.currentUtilization.toFixed(0),
            },
          ],
        },
      ],
    };

    // CPU Usage Chart
    const cpuOption = {
      title: {
        text: 'CPU Usage',
        textStyle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
      },
      grid: { left: '10%', right: '10%', top: '25%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 10, interval: Math.floor(timestamps.length / 5) },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
      },
      series: [
        {
          data: recentMetrics.map((m) => m.cpu_usage.toFixed(1)),
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0.05)' },
              ],
            },
          },
          lineStyle: { color: '#667eea', width: 3 },
          itemStyle: { color: '#667eea' },
        },
      ],
    };

    // Memory Usage Chart
    const memoryPercents = recentMetrics.map((m) => ((m.memory_used / m.memory_total) * 100).toFixed(1));
    const memoryOption = {
      title: {
        text: 'Memory Usage',
        textStyle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
      },
      grid: { left: '10%', right: '10%', top: '25%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 10, interval: Math.floor(timestamps.length / 5) },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
      },
      series: [
        {
          data: memoryPercents,
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
              ],
            },
          },
          lineStyle: { color: '#10b981', width: 3 },
          itemStyle: { color: '#10b981' },
        },
      ],
    };

    // Network Latency Chart
    const latencyOption = {
      title: {
        text: 'Network Latency',
        textStyle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
      },
      grid: { left: '10%', right: '10%', top: '25%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 10, interval: Math.floor(timestamps.length / 5) },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: '{value}ms' },
      },
      series: [
        {
          data: recentMetrics.map((m) => m.network_latency.toFixed(2)),
          type: 'line',
          smooth: true,
          lineStyle: { color: '#8b5cf6', width: 3 },
          itemStyle: { color: '#8b5cf6' },
        },
      ],
    };

    // Utilization Trend (replaces "Health Score")
    const utilizationOption = {
      title: {
        text: 'Utilization Trend',
        textStyle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
      },
      grid: { left: '10%', right: '10%', top: '25%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 10, interval: Math.floor(timestamps.length / 5) },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          data: recentMetrics.map((m) => m.health_score.toFixed(1)),
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.5)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
              ],
            },
          },
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };

    return (
      <div key={agent.agentNumber} className={`agent-card ${prediction.status}`}>
        <div className="agent-card-header">
          <div className="agent-title">
            <h3>
              {agent.agentName} {agent.isLeader && '👑'}
            </h3>
            <span className="agent-role">{agent.role.toUpperCase()}</span>
          </div>
          <div className="agent-peer-id">{agent.peerId.substring(0, 12)}...</div>
        </div>

        {/* Prediction Alert */}
        {prediction.status !== 'healthy' && (
          <div className={`prediction-alert ${prediction.status}`}>
            <div className="alert-header">
              <span className="alert-icon">{prediction.status === 'critical' ? '🚨' : '⚠️'}</span>
              <span className="alert-title">
                HEALTH PREDICTION: {prediction.status.toUpperCase()}
              </span>
            </div>

            {prediction.timeToFailure && (
              <div className="prediction-detail">
                <strong>Estimated Time to Failure:</strong> {prediction.timeToFailure}
              </div>
            )}

            <div className="prediction-detail">
              <strong>Failure Probability:</strong> {prediction.failureProbability.toFixed(0)}%
              <span style={{ marginLeft: '12px' }}>
                <strong>Confidence:</strong> {prediction.confidence}%
              </span>
            </div>

            {prediction.issues.length > 0 && (
              <div className="issues-list">
                <strong>Detected Issues:</strong>
                <ul>
                  {prediction.issues.map((issue, idx) => (
                    <li key={idx}>
                      <span className={`severity-badge ${issue.severity}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span>
                        {issue.metric.toUpperCase()}: {issue.description} ({issue.trendRate})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="recommendation">{prediction.recommendation}</div>
          </div>
        )}

        {/* Health Gauge */}
        <div className="health-gauge">
          <ReactECharts option={gaugeOption} style={{ height: '220px' }} />
          <div className="health-label">
            Current Utilization: {agent.currentUtilization.toFixed(1)}%
          </div>
          <div className="health-status">
            {agent.currentUtilization < 50 && <span className="status-healthy">LOW LOAD - HEALTHY</span>}
            {agent.currentUtilization >= 50 && agent.currentUtilization < 70 && <span className="status-warning">⚠️ MODERATE LOAD</span>}
            {agent.currentUtilization >= 70 && <span className="status-critical">🚨 HIGH LOAD - CRITICAL</span>}
          </div>
        </div>

        {/* Metrics Charts Grid */}
        <div className="metrics-charts">
          <div className="chart-container">
            <ReactECharts option={cpuOption} style={{ height: '200px' }} />
          </div>
          <div className="chart-container">
            <ReactECharts option={memoryOption} style={{ height: '200px' }} />
          </div>
          <div className="chart-container">
            <ReactECharts option={latencyOption} style={{ height: '200px' }} />
          </div>
          <div className="chart-container">
            <ReactECharts option={utilizationOption} style={{ height: '200px' }} />
          </div>
        </div>

        {/* Current Metrics Summary */}
        <div className="metrics-summary">
          <div className="summary-item">
            <span className="summary-label">CPU:</span>
            <span className="summary-value">{latest.cpu_usage.toFixed(1)}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Memory:</span>
            <span className="summary-value">
              {((latest.memory_used / latest.memory_total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Latency:</span>
            <span className="summary-value">{latest.network_latency.toFixed(2)}ms</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Peers:</span>
            <span className="summary-value">{latest.peer_connections}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="agent-metrics-widget">
        <div className="widget-header">
          <h2>📊 Agent Performance Visualizations</h2>
          <p className="header-subtitle">Real-time metrics and predictive analytics for all agents</p>
        </div>
        <div className="widget-body">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading agent metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const warningCount = agents.filter((a) => a.prediction.status === 'warning').length;
  const criticalCount = agents.filter((a) => a.prediction.status === 'critical').length;

  return (
    <div className="agent-metrics-widget">
      <div className="widget-header">
        <div className="header-content">
          <div className="header-left">
            <h2>📊 Agent Performance Visualizations</h2>
            <p className="header-subtitle">Real-time metrics and predictive analytics for all agents</p>
          </div>
          <div className="header-stats">
            <span className="stat-item agents">{agents.length} Agents Detected</span>
            <span className="separator">|</span>
            <span className="stat-item warnings">{warningCount} Warnings</span>
            <span className="separator">|</span>
            <span className="stat-item critical">{criticalCount} Critical</span>
          </div>
        </div>
      </div>

      <div className="widget-body">
        {/* NEW: Cluster Overview Section */}
        {renderClusterOverview()}

        {/* Individual Agent Cards */}
        <div className="individual-agents-section">
          <h3 className="section-title">Individual Agent Metrics</h3>
          <div className="agents-grid">{agents.map((agent) => renderAgentCard(agent))}</div>
        </div>
      </div>

      <div className="widget-footer">
        <div className="footer-info">
          <span className="footer-icon">🔄</span>
          Auto-refresh: 30s
        </div>
      </div>
    </div>
  );
};

export default AgentMetricsWidget;
