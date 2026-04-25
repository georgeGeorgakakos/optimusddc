// ==============================================================================
// FILE: DataQualityPage/index.tsx
// DATA QUALITY SCORECARD
// Automated profiling, freshness, completeness, schema drift, anomaly detection
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes } from 'config/apiConfig';

import './styles.scss';

interface DatasetQuality {
  id: string;
  name: string;
  agent: string;
  overallScore: number;
  completeness: number;
  freshness: number;
  consistency: number;
  accuracy: number;
  uniqueness: number;
  rowCount: number;
  lastUpdated: string;
  schemaDrift: boolean;
  anomalies: number;
  nullPercentage: number;
  duplicatePercentage: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface QualityAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  dataset: string;
  agent: string;
  message: string;
  metric: string;
  timestamp: string;
  acknowledged: boolean;
}

function generateDatasets(): DatasetQuality[] {
  const agents = getAvailableNodes();
  const tables = ['knowledge_base', 'sensor_readings', 'energy_metrics', 'device_config', 'grid_topology', 'audit_log', 'user_sessions', 'calibration_data'];
  const datasets: DatasetQuality[] = [];

  agents.forEach(agent => {
    const numTables = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numTables; i++) {
      const table = tables[(agents.indexOf(agent) * 2 + i) % tables.length];
      const completeness = 70 + Math.random() * 30;
      const freshness = 50 + Math.random() * 50;
      const consistency = 60 + Math.random() * 40;
      const accuracy = 75 + Math.random() * 25;
      const uniqueness = 80 + Math.random() * 20;
      const overall = (completeness + freshness + consistency + accuracy + uniqueness) / 5;

      datasets.push({
        id: `${agent.name}-${table}`,
        name: `${agent.name}.${table}`,
        agent: agent.name,
        overallScore: Math.round(overall),
        completeness: Math.round(completeness),
        freshness: Math.round(freshness),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
        uniqueness: Math.round(uniqueness),
        rowCount: Math.floor(Math.random() * 50000) + 100,
        lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        schemaDrift: Math.random() > 0.85,
        anomalies: Math.floor(Math.random() * 5),
        nullPercentage: Math.round(Math.random() * 15 * 10) / 10,
        duplicatePercentage: Math.round(Math.random() * 5 * 10) / 10,
        trend: Math.random() > 0.6 ? 'stable' : Math.random() > 0.3 ? 'improving' : 'degrading',
      });
    }
  });
  return datasets.sort((a, b) => a.overallScore - b.overallScore);
}

function generateAlerts(datasets: DatasetQuality[]): QualityAlert[] {
  const alerts: QualityAlert[] = [];
  datasets.forEach(ds => {
    if (ds.overallScore < 70) alerts.push({ id: `alert-low-${ds.id}`, severity: 'critical', dataset: ds.name, agent: ds.agent, message: `Overall quality score dropped below threshold (${ds.overallScore}%)`, metric: 'overall', timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), acknowledged: false });
    if (ds.schemaDrift) alerts.push({ id: `alert-drift-${ds.id}`, severity: 'warning', dataset: ds.name, agent: ds.agent, message: 'Schema drift detected — column types or names changed since last profile', metric: 'schema', timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(), acknowledged: Math.random() > 0.5 });
    if (ds.freshness < 60) alerts.push({ id: `alert-stale-${ds.id}`, severity: 'warning', dataset: ds.name, agent: ds.agent, message: `Data freshness below threshold (${ds.freshness}%) — possible stale data`, metric: 'freshness', timestamp: new Date(Date.now() - Math.random() * 10800000).toISOString(), acknowledged: false });
    if (ds.anomalies > 2) alerts.push({ id: `alert-anomaly-${ds.id}`, severity: 'info', dataset: ds.name, agent: ds.agent, message: `${ds.anomalies} statistical anomalies detected in recent data`, metric: 'anomaly', timestamp: new Date(Date.now() - Math.random() * 14400000).toISOString(), acknowledged: Math.random() > 0.3 });
  });
  return alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

const ScoreGauge: React.FC<{ score: number; size?: number; label?: string }> = ({ score, size = 60, label }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);
  const color = score >= 90 ? '#3fb950' : score >= 70 ? '#d29922' : '#f85149';

  return (
    <div className="dq-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#21262d" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="dq-gauge-value" style={{ color }}>{score}</div>
      {label && <div className="dq-gauge-label">{label}</div>}
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const color = value >= 90 ? '#3fb950' : value >= 70 ? '#d29922' : '#f85149';
  return (
    <div className="dq-score-bar">
      <div className="dq-score-bar-header"><span>{label}</span><span style={{ color }}>{value}%</span></div>
      <div className="dq-score-bar-track"><div className="dq-score-bar-fill" style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );
};

const TrendArrow: React.FC<{ trend: string }> = ({ trend }) => {
  const icon = trend === 'improving' ? '↗' : trend === 'degrading' ? '↘' : '→';
  const cls = trend === 'improving' ? 'trend-up' : trend === 'degrading' ? 'trend-down' : 'trend-flat';
  return <span className={`dq-trend ${cls}`}>{icon}</span>;
};

const DataQualityPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetQuality[]>([]);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<DatasetQuality | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'freshness'>('score');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      const ds = generateDatasets();
      setDatasets(ds);
      setAlerts(generateAlerts(ds));
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const agents = useMemo(() => [...new Set(datasets.map(d => d.agent))], [datasets]);

  const filteredDatasets = useMemo(() => {
    let result = filterAgent === 'all' ? datasets : datasets.filter(d => d.agent === filterAgent);
    if (sortBy === 'score') result = [...result].sort((a, b) => a.overallScore - b.overallScore);
    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'freshness') result = [...result].sort((a, b) => a.freshness - b.freshness);
    return result;
  }, [datasets, filterAgent, sortBy]);

  const globalStats = useMemo(() => ({
    avgScore: datasets.length > 0 ? Math.round(datasets.reduce((s, d) => s + d.overallScore, 0) / datasets.length) : 0,
    totalDatasets: datasets.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    driftCount: datasets.filter(d => d.schemaDrift).length,
    totalAnomalies: datasets.reduce((s, d) => s + d.anomalies, 0),
  }), [datasets, alerts]);

  if (isLoading) {
    return (
      <DocumentTitle title="Data Quality - OptimusDDC">
        <main className="dq-page"><div className="dq-loading"><div className="dq-loading-spinner" /><p>Profiling datasets…</p></div></main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Data Quality - OptimusDDC">
      <main className="dq-page">
        <header className="dq-header">
          <div className="dq-header-left">
            <div className="dq-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h1 className="dq-title">Data Quality Scorecard</h1>
              <p className="dq-subtitle">Automated Profiling · Schema Drift · Anomaly Detection</p>
            </div>
          </div>
        </header>

        {/* Global Stats */}
        <div className="dq-global-stats">
          <div className="dq-gstat"><ScoreGauge score={globalStats.avgScore} size={52} /><div><div className="dq-gstat-v">{globalStats.avgScore}%</div><div className="dq-gstat-l">Avg Quality</div></div></div>
          <div className="dq-gstat-simple"><div className="dq-gstat-v">{globalStats.totalDatasets}</div><div className="dq-gstat-l">Datasets</div></div>
          <div className="dq-gstat-simple"><div className={`dq-gstat-v ${globalStats.criticalAlerts > 0 ? 'critical' : ''}`}>{globalStats.criticalAlerts}</div><div className="dq-gstat-l">Critical Alerts</div></div>
          <div className="dq-gstat-simple"><div className={`dq-gstat-v ${globalStats.driftCount > 0 ? 'warn' : ''}`}>{globalStats.driftCount}</div><div className="dq-gstat-l">Schema Drifts</div></div>
          <div className="dq-gstat-simple"><div className="dq-gstat-v">{globalStats.totalAnomalies}</div><div className="dq-gstat-l">Anomalies</div></div>
        </div>

        {/* Toolbar */}
        <div className="dq-toolbar">
          <select className="dq-select" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="all">All Agents</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="dq-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="score">Sort by Score ↑</option>
            <option value="freshness">Sort by Freshness ↑</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="dq-layout">
          {/* Dataset Cards */}
          <div className="dq-cards">
            {filteredDatasets.map(ds => (
              <div key={ds.id} className={`dq-card ${selectedDataset?.id === ds.id ? 'selected' : ''} ${ds.overallScore < 70 ? 'poor' : ''}`}
                onClick={() => setSelectedDataset(selectedDataset?.id === ds.id ? null : ds)}>
                <div className="dq-card-header">
                  <ScoreGauge score={ds.overallScore} size={42} />
                  <div className="dq-card-info">
                    <div className="dq-card-name">{ds.name}</div>
                    <div className="dq-card-meta">
                      {ds.rowCount.toLocaleString()} rows · Updated {new Date(ds.lastUpdated).toLocaleDateString()}
                      <TrendArrow trend={ds.trend} />
                    </div>
                  </div>
                  {ds.schemaDrift && <span className="dq-drift-badge">DRIFT</span>}
                  {ds.anomalies > 0 && <span className="dq-anomaly-badge">{ds.anomalies} anomal.</span>}
                </div>
                <div className="dq-card-bars">
                  <ScoreBar label="Completeness" value={ds.completeness} />
                  <ScoreBar label="Freshness" value={ds.freshness} />
                  <ScoreBar label="Consistency" value={ds.consistency} />
                  <ScoreBar label="Accuracy" value={ds.accuracy} />
                  <ScoreBar label="Uniqueness" value={ds.uniqueness} />
                </div>
              </div>
            ))}
          </div>

          {/* Alerts Sidebar */}
          <div className="dq-alerts-sidebar">
            <h3 className="dq-sidebar-title">Quality Alerts <span className="dq-alert-count">{alerts.filter(a => !a.acknowledged).length}</span></h3>
            <div className="dq-alerts-list">
              {alerts.filter(a => !a.acknowledged).slice(0, 15).map(alert => (
                <div key={alert.id} className={`dq-alert-card sev-${alert.severity}`}>
                  <div className="dq-alert-header">
                    <span className={`dq-sev-badge sev-${alert.severity}`}>{alert.severity.toUpperCase()}</span>
                    <span className="dq-alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="dq-alert-msg">{alert.message}</div>
                  <div className="dq-alert-source">{alert.dataset}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default DataQualityPage;
