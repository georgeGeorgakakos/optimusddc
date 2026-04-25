// ==============================================================================
// FILE: AgentConfigPage/index.tsx
// AGENT CONFIGURATION & ORCHESTRATION PANEL
// Visual control plane for managing OptimusDB agents: start/stop/restart,
// config editing, GossipSub topics, CRDT stores, replication policies,
// resource monitoring, manual operations (force-sync, GC, rebalance)
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface AgentConfig {
  id: string;
  name: string;
  status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'DEGRADED' | 'DRAINING';
  role: 'coordinator' | 'follower';
  version: string;
  uptime: number; // seconds
  pid: number;
  host: string;
  port: number;
  // GossipSub
  gossipTopics: string[];
  gossipPeers: number;
  gossipMeshSize: number;
  // CRDT
  crdtStores: CRDTStoreConfig[];
  // Replication
  replicationMode: 'sync' | 'async' | 'semi-sync';
  replicationFactor: number;
  replicationLagMs: number;
  // Resources
  cpuPercent: number;
  memoryMB: number;
  memoryLimitMB: number;
  diskUsedGB: number;
  diskTotalGB: number;
  networkInKBps: number;
  networkOutKBps: number;
  // Config params
  configParams: ConfigParam[];
}

interface CRDTStoreConfig {
  name: string;
  type: 'LWW-Register' | 'G-Counter' | 'OR-Set' | 'MV-Register';
  entries: number;
  sizeBytes: number;
  lastSync: string;
  autoCompact: boolean;
}

interface ConfigParam {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'duration';
  category: 'gossip' | 'replication' | 'storage' | 'network' | 'security';
  description: string;
  editable: boolean;
}

interface OperationLog {
  id: string;
  agentId: string;
  operation: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED';
  startedAt: string;
  duration: number;
  details: string;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

function generateAgentConfigs(apiNodes: OptimusDBNode[]): AgentConfig[] {
  const gossipTopics = ['swarm.heartbeat', 'swarm.replicate', 'swarm.query', 'swarm.metadata', 'swarm.consensus', 'swarm.alerts'];
  const statuses: AgentConfig['status'][] = ['RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'DEGRADED', 'STOPPED'];

  return apiNodes.map((node, i) => ({
    id: node.name,
    name: node.name,
    status: statuses[i % statuses.length],
    role: i === 0 ? 'coordinator' : 'follower',
    version: '1.4.2-swarm',
    uptime: Math.floor(Math.random() * 864000) + 3600,
    pid: 1000 + Math.floor(Math.random() * 9000),
    host: node.host || `10.42.${i}.${10 + i}`,
    port: node.port || 5984,
    gossipTopics: gossipTopics.slice(0, 3 + Math.floor(Math.random() * 3)),
    gossipPeers: Math.floor(Math.random() * 5) + 2,
    gossipMeshSize: apiNodes.length - 1,
    crdtStores: [
      { name: 'knowledge_base', type: 'LWW-Register', entries: Math.floor(Math.random() * 5000) + 200, sizeBytes: Math.floor(Math.random() * 50000000) + 1000000, lastSync: new Date(Date.now() - Math.random() * 600000).toISOString(), autoCompact: true },
      { name: 'sensor_log', type: 'G-Counter', entries: Math.floor(Math.random() * 20000) + 1000, sizeBytes: Math.floor(Math.random() * 100000000) + 5000000, lastSync: new Date(Date.now() - Math.random() * 300000).toISOString(), autoCompact: true },
      { name: 'metadata_store', type: 'OR-Set', entries: Math.floor(Math.random() * 500) + 50, sizeBytes: Math.floor(Math.random() * 5000000) + 100000, lastSync: new Date(Date.now() - Math.random() * 900000).toISOString(), autoCompact: false },
      { name: 'config_store', type: 'MV-Register', entries: Math.floor(Math.random() * 100) + 10, sizeBytes: Math.floor(Math.random() * 500000) + 10000, lastSync: new Date(Date.now() - Math.random() * 1800000).toISOString(), autoCompact: false },
    ],
    replicationMode: (['sync', 'async', 'semi-sync'] as const)[i % 3],
    replicationFactor: 2 + Math.floor(Math.random() * 2),
    replicationLagMs: Math.floor(Math.random() * 400) + 10,
    cpuPercent: Math.round((Math.random() * 60 + 5) * 10) / 10,
    memoryMB: Math.floor(Math.random() * 1500) + 256,
    memoryLimitMB: 2048,
    diskUsedGB: Math.round((Math.random() * 40 + 2) * 10) / 10,
    diskTotalGB: 50,
    networkInKBps: Math.floor(Math.random() * 5000) + 100,
    networkOutKBps: Math.floor(Math.random() * 3000) + 50,
    configParams: [
      { key: 'gossip.heartbeat_interval', value: '5s', type: 'duration', category: 'gossip', description: 'Interval between GossipSub heartbeat messages', editable: true },
      { key: 'gossip.fanout', value: '4', type: 'number', category: 'gossip', description: 'Number of peers to fan out gossip messages to', editable: true },
      { key: 'gossip.history_length', value: '5', type: 'number', category: 'gossip', description: 'Number of historical message IDs to track', editable: true },
      { key: 'replication.batch_size', value: '100', type: 'number', category: 'replication', description: 'Max entries per replication batch', editable: true },
      { key: 'replication.timeout', value: '30s', type: 'duration', category: 'replication', description: 'Timeout for replication round', editable: true },
      { key: 'replication.compression', value: 'true', type: 'boolean', category: 'replication', description: 'Enable zstd compression for replication traffic', editable: true },
      { key: 'storage.wal_sync_mode', value: 'fsync', type: 'string', category: 'storage', description: 'WAL synchronization mode (fsync, fdatasync, none)', editable: true },
      { key: 'storage.compaction_threshold', value: '0.7', type: 'number', category: 'storage', description: 'Trigger compaction when dead entries exceed this ratio', editable: true },
      { key: 'storage.max_db_size', value: '50GB', type: 'string', category: 'storage', description: 'Maximum database size before rejecting writes', editable: false },
      { key: 'network.max_connections', value: '256', type: 'number', category: 'network', description: 'Maximum concurrent connections', editable: true },
      { key: 'network.read_timeout', value: '15s', type: 'duration', category: 'network', description: 'TCP read timeout', editable: true },
      { key: 'security.tls_enabled', value: 'true', type: 'boolean', category: 'security', description: 'Enable TLS for inter-node communication', editable: false },
      { key: 'security.auth_mode', value: 'mutual-tls', type: 'string', category: 'security', description: 'Authentication mode for peer connections', editable: false },
    ],
  }));
}

function generateOperationLogs(agents: AgentConfig[]): OperationLog[] {
  const ops = ['force-sync', 'gc-compact', 'rebalance-shards', 'rotate-logs', 'flush-wal', 'rebuild-index', 'snapshot-backup', 'health-check'];
  const logs: OperationLog[] = [];
  for (let i = 0; i < 20; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const status: OperationLog['status'] = Math.random() > 0.15 ? 'SUCCESS' : Math.random() > 0.5 ? 'RUNNING' : 'FAILED';
    logs.push({
      id: `op-${i}`,
      agentId: agent.id,
      operation: op,
      status,
      startedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      duration: Math.floor(Math.random() * 30000) + 500,
      details: status === 'SUCCESS' ? `Completed ${op} on ${agent.name}` : status === 'FAILED' ? `Failed: timeout after 30s` : `In progress…`,
    });
  }
  return logs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

// ==============================================================================
// HELPERS
// ==============================================================================

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = status === 'RUNNING' ? 'st-running' : status === 'STOPPED' ? 'st-stopped' : status === 'STARTING' ? 'st-starting' : status === 'DEGRADED' ? 'st-degraded' : 'st-draining';
  return <span className={`ac-status-badge ${cls}`}><span className="ac-status-dot" />{status}</span>;
};

const UsageBar: React.FC<{ used: number; total: number; label: string; unit?: string; warnThreshold?: number }> = ({ used, total, label, unit = '', warnThreshold = 80 }) => {
  const pct = Math.min((used / total) * 100, 100);
  const isWarn = pct > warnThreshold;
  return (
    <div className="ac-usage-bar">
      <div className="ac-usage-bar-header">
        <span>{label}</span>
        <span className={isWarn ? 'ac-warn' : ''}>{typeof used === 'number' && used % 1 !== 0 ? used.toFixed(1) : used}{unit} / {total}{unit}</span>
      </div>
      <div className="ac-usage-bar-track">
        <div className={`ac-usage-bar-fill ${isWarn ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const AgentConfigPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [opLogs, setOpLogs] = useState<OperationLog[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'stores' | 'operations'>('overview');
  const [configFilter, setConfigFilter] = useState<string>('all');
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionConfirm, setActionConfirm] = useState<{ agentId: string; action: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      const configs = generateAgentConfigs(apiNodes);
      setAgents(configs);
      setOpLogs(generateOperationLogs(configs));
      if (configs.length > 0) setSelectedAgent(configs[0].id);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const agent = useMemo(() => agents.find(a => a.id === selectedAgent), [agents, selectedAgent]);

  const handleAction = useCallback((agentId: string, action: string) => {
    setActionConfirm({ agentId, action });
  }, []);

  const confirmAction = useCallback(() => {
    if (!actionConfirm) return;
    const { agentId, action } = actionConfirm;
    // Simulate action
    if (action === 'stop') {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'STOPPED' as const } : a));
    } else if (action === 'start') {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'STARTING' as const } : a));
      setTimeout(() => setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'RUNNING' as const } : a)), 2000);
    } else if (action === 'restart') {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'STARTING' as const } : a));
      setTimeout(() => setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'RUNNING' as const } : a)), 3000);
    } else if (action === 'drain') {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'DRAINING' as const } : a));
    }
    // Add operation log
    const newLog: OperationLog = {
      id: `op-${Date.now()}`, agentId, operation: action, status: 'SUCCESS',
      startedAt: new Date().toISOString(), duration: 0, details: `Manual ${action} triggered`,
    };
    setOpLogs(prev => [newLog, ...prev]);
    setActionConfirm(null);
  }, [actionConfirm]);

  const handleSaveParam = useCallback((agentId: string, paramKey: string, newValue: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? {
      ...a,
      configParams: a.configParams.map(p => p.key === paramKey ? { ...p, value: newValue } : p),
    } : a));
    setEditingParam(null);
    const newLog: OperationLog = {
      id: `op-${Date.now()}`, agentId, operation: `config-update: ${paramKey}`, status: 'SUCCESS',
      startedAt: new Date().toISOString(), duration: 50, details: `Updated ${paramKey} = ${newValue}`,
    };
    setOpLogs(prev => [newLog, ...prev]);
  }, []);

  const filteredParams = useMemo(() => {
    if (!agent) return [];
    return configFilter === 'all' ? agent.configParams : agent.configParams.filter(p => p.category === configFilter);
  }, [agent, configFilter]);

  const globalStats = useMemo(() => ({
    total: agents.length,
    running: agents.filter(a => a.status === 'RUNNING').length,
    degraded: agents.filter(a => a.status === 'DEGRADED').length,
    stopped: agents.filter(a => a.status === 'STOPPED').length,
    totalCPU: Math.round(agents.reduce((s, a) => s + a.cpuPercent, 0) * 10) / 10,
    totalMemMB: agents.reduce((s, a) => s + a.memoryMB, 0),
    totalDiskGB: Math.round(agents.reduce((s, a) => s + a.diskUsedGB, 0) * 10) / 10,
  }), [agents]);

  if (isLoading) {
    return (
      <DocumentTitle title="Agent Config - OptimusDDC">
        <main className="ac-page"><div className="ac-loading"><div className="ac-spinner" /><p>Connecting to agents…</p></div></main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Agent Config - OptimusDDC">
      <main className="ac-page">
        {/* Header */}
        <header className="ac-header">
          <div className="ac-header-left">
            <div className="ac-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h1 className="ac-title">Agent Configuration & Orchestration</h1>
              <p className="ac-subtitle">Control Plane · Runtime Config · Manual Operations</p>
            </div>
          </div>
        </header>

        {/* Global Stats */}
        <div className="ac-global-stats">
          <div className="ac-gstat"><span className="ac-gstat-v">{globalStats.running}<span className="ac-gstat-dim">/{globalStats.total}</span></span><span className="ac-gstat-l">Running</span></div>
          <div className="ac-gstat"><span className={`ac-gstat-v ${globalStats.degraded > 0 ? 'warn' : ''}`}>{globalStats.degraded}</span><span className="ac-gstat-l">Degraded</span></div>
          <div className="ac-gstat"><span className={`ac-gstat-v ${globalStats.stopped > 0 ? 'critical' : ''}`}>{globalStats.stopped}</span><span className="ac-gstat-l">Stopped</span></div>
          <div className="ac-gstat"><span className="ac-gstat-v">{globalStats.totalCPU}%</span><span className="ac-gstat-l">Total CPU</span></div>
          <div className="ac-gstat"><span className="ac-gstat-v">{(globalStats.totalMemMB / 1024).toFixed(1)}<span className="ac-gstat-unit">GB</span></span><span className="ac-gstat-l">Total Memory</span></div>
          <div className="ac-gstat"><span className="ac-gstat-v">{globalStats.totalDiskGB}<span className="ac-gstat-unit">GB</span></span><span className="ac-gstat-l">Total Disk</span></div>
        </div>

        {/* Main Layout */}
        <div className="ac-layout">
          {/* Agent List Sidebar */}
          <div className="ac-agent-list">
            <h3 className="ac-sidebar-title">Agents</h3>
            {agents.map(a => (
              <div key={a.id} className={`ac-agent-card ${selectedAgent === a.id ? 'selected' : ''} ${a.status === 'STOPPED' ? 'stopped' : ''}`} onClick={() => setSelectedAgent(a.id)}>
                <div className="ac-agent-card-top">
                  <StatusBadge status={a.status} />
                  {a.role === 'coordinator' && <span className="ac-role-badge">★ COORD</span>}
                </div>
                <div className="ac-agent-card-name">{a.name}</div>
                <div className="ac-agent-card-meta">{a.host}:{a.port} · v{a.version}</div>
                <div className="ac-agent-card-res">
                  <span>CPU {a.cpuPercent}%</span>
                  <span>Mem {Math.round(a.memoryMB / 1024 * 10) / 10}GB</span>
                  <span>↑{formatUptime(a.uptime)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Detail Panel */}
          {agent ? (
            <div className="ac-detail">
              {/* Agent Header */}
              <div className="ac-detail-header">
                <div className="ac-detail-header-left">
                  <h2>{agent.name}</h2>
                  <StatusBadge status={agent.status} />
                  {agent.role === 'coordinator' && <span className="ac-role-badge">Coordinator</span>}
                </div>
                <div className="ac-detail-header-actions">
                  {agent.status === 'RUNNING' && (
                    <>
                      <button className="ac-action-btn ac-btn-warn" onClick={() => handleAction(agent.id, 'restart')}>↻ Restart</button>
                      <button className="ac-action-btn ac-btn-danger" onClick={() => handleAction(agent.id, 'stop')}>■ Stop</button>
                      <button className="ac-action-btn ac-btn-muted" onClick={() => handleAction(agent.id, 'drain')}>⏏ Drain</button>
                    </>
                  )}
                  {agent.status === 'STOPPED' && (
                    <button className="ac-action-btn ac-btn-success" onClick={() => handleAction(agent.id, 'start')}>▶ Start</button>
                  )}
                  {(agent.status === 'DEGRADED' || agent.status === 'DRAINING') && (
                    <button className="ac-action-btn ac-btn-warn" onClick={() => handleAction(agent.id, 'restart')}>↻ Restart</button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="ac-tabs">
                {(['overview', 'config', 'stores', 'operations'] as const).map(t => (
                  <button key={t} className={`ac-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                    {t === 'overview' ? 'Overview' : t === 'config' ? 'Configuration' : t === 'stores' ? 'CRDT Stores' : 'Operations Log'}
                  </button>
                ))}
              </div>

              <div className="ac-tab-content">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="ac-overview">
                    <div className="ac-overview-grid">
                      {/* System Info */}
                      <div className="ac-info-card">
                        <h4>System Information</h4>
                        <div className="ac-info-rows">
                          <div><span>Host</span><span className="ac-mono">{agent.host}:{agent.port}</span></div>
                          <div><span>PID</span><span className="ac-mono">{agent.pid}</span></div>
                          <div><span>Version</span><span>{agent.version}</span></div>
                          <div><span>Uptime</span><span>{formatUptime(agent.uptime)}</span></div>
                          <div><span>Role</span><span>{agent.role}</span></div>
                          <div><span>Replication</span><span>{agent.replicationMode} (RF={agent.replicationFactor})</span></div>
                          <div><span>Repl. Lag</span><span className={agent.replicationLagMs > 300 ? 'ac-warn' : ''}>{agent.replicationLagMs}ms</span></div>
                        </div>
                      </div>

                      {/* Resource Usage */}
                      <div className="ac-info-card">
                        <h4>Resource Usage</h4>
                        <UsageBar used={agent.cpuPercent} total={100} label="CPU" unit="%" warnThreshold={80} />
                        <UsageBar used={agent.memoryMB} total={agent.memoryLimitMB} label="Memory" unit=" MB" />
                        <UsageBar used={agent.diskUsedGB} total={agent.diskTotalGB} label="Disk" unit=" GB" />
                        <div className="ac-network-stats">
                          <div><span>Network In</span><span>{(agent.networkInKBps / 1024).toFixed(1)} MB/s</span></div>
                          <div><span>Network Out</span><span>{(agent.networkOutKBps / 1024).toFixed(1)} MB/s</span></div>
                        </div>
                      </div>

                      {/* GossipSub */}
                      <div className="ac-info-card">
                        <h4>GossipSub</h4>
                        <div className="ac-info-rows">
                          <div><span>Connected Peers</span><span>{agent.gossipPeers}</span></div>
                          <div><span>Mesh Size</span><span>{agent.gossipMeshSize}</span></div>
                        </div>
                        <div className="ac-topic-list">
                          <span className="ac-topic-label">Subscribed Topics</span>
                          <div className="ac-topics">
                            {agent.gossipTopics.map(t => <span key={t} className="ac-topic-chip">{t}</span>)}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="ac-info-card">
                        <h4>Quick Actions</h4>
                        <div className="ac-quick-actions">
                          {['force-sync', 'gc-compact', 'flush-wal', 'rebuild-index', 'snapshot-backup', 'rotate-logs'].map(op => (
                            <button key={op} className="ac-quick-btn" onClick={() => handleAction(agent.id, op)} disabled={agent.status !== 'RUNNING'}>
                              {op.replace(/-/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                  <div className="ac-config">
                    <div className="ac-config-filters">
                      {['all', 'gossip', 'replication', 'storage', 'network', 'security'].map(cat => (
                        <button key={cat} className={`ac-filter-btn ${configFilter === cat ? 'active' : ''}`} onClick={() => setConfigFilter(cat)}>
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="ac-config-table">
                      <table>
                        <thead><tr><th>Parameter</th><th>Value</th><th>Category</th><th>Description</th><th></th></tr></thead>
                        <tbody>
                          {filteredParams.map(p => (
                            <tr key={p.key} className={!p.editable ? 'readonly' : ''}>
                              <td className="ac-mono">{p.key}</td>
                              <td>
                                {editingParam === p.key ? (
                                  <div className="ac-edit-inline">
                                    <input className="ac-edit-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveParam(agent.id, p.key, editValue); if (e.key === 'Escape') setEditingParam(null); }} />
                                    <button className="ac-edit-save" onClick={() => handleSaveParam(agent.id, p.key, editValue)}>✓</button>
                                    <button className="ac-edit-cancel" onClick={() => setEditingParam(null)}>✕</button>
                                  </div>
                                ) : (
                                  <span className={`ac-param-value type-${p.type}`}>{p.value}</span>
                                )}
                              </td>
                              <td><span className={`ac-cat-badge cat-${p.category}`}>{p.category}</span></td>
                              <td className="ac-param-desc">{p.description}</td>
                              <td>
                                {p.editable && editingParam !== p.key && (
                                  <button className="ac-edit-btn" onClick={() => { setEditingParam(p.key); setEditValue(p.value); }}>
                                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  </button>
                                )}
                                {!p.editable && <span className="ac-lock">🔒</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* STORES TAB */}
                {activeTab === 'stores' && (
                  <div className="ac-stores">
                    <div className="ac-store-cards">
                      {agent.crdtStores.map(store => (
                        <div key={store.name} className="ac-store-card">
                          <div className="ac-store-header">
                            <span className="ac-store-name">{store.name}</span>
                            <span className="ac-crdt-type">{store.type}</span>
                          </div>
                          <div className="ac-store-stats">
                            <div><span>{store.entries.toLocaleString()}</span><span className="ac-store-stat-label">Entries</span></div>
                            <div><span>{formatBytes(store.sizeBytes)}</span><span className="ac-store-stat-label">Size</span></div>
                          </div>
                          <div className="ac-store-meta">
                            <div>Last Sync: {new Date(store.lastSync).toLocaleTimeString()}</div>
                            <div className="ac-store-flags">
                              <span className={`ac-flag ${store.autoCompact ? 'on' : 'off'}`}>Auto-Compact: {store.autoCompact ? 'ON' : 'OFF'}</span>
                            </div>
                          </div>
                          <div className="ac-store-actions">
                            <button className="ac-quick-btn" onClick={() => handleAction(agent.id, `sync-${store.name}`)}>Force Sync</button>
                            <button className="ac-quick-btn" onClick={() => handleAction(agent.id, `compact-${store.name}`)}>Compact</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OPERATIONS TAB */}
                {activeTab === 'operations' && (
                  <div className="ac-operations">
                    <table className="ac-ops-table">
                      <thead><tr><th>Time</th><th>Operation</th><th>Status</th><th>Duration</th><th>Details</th></tr></thead>
                      <tbody>
                        {opLogs.filter(l => l.agentId === agent.id).map(log => (
                          <tr key={log.id}>
                            <td className="ac-mono ac-td-time">{new Date(log.startedAt).toLocaleString()}</td>
                            <td className="ac-mono">{log.operation}</td>
                            <td><span className={`ac-op-status op-${log.status.toLowerCase()}`}>{log.status}</span></td>
                            <td>{log.duration > 0 ? `${(log.duration / 1000).toFixed(1)}s` : '—'}</td>
                            <td className="ac-td-detail">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ac-detail ac-detail-empty"><p>Select an agent from the list.</p></div>
          )}
        </div>

        {/* Confirmation Modal */}
        {actionConfirm && (
          <div className="ac-modal-overlay" onClick={() => setActionConfirm(null)}>
            <div className="ac-modal" onClick={e => e.stopPropagation()}>
              <h3>Confirm Action</h3>
              <p>Are you sure you want to <strong>{actionConfirm.action}</strong> agent <code>{actionConfirm.agentId}</code>?</p>
              <div className="ac-modal-actions">
                <button className="ac-action-btn ac-btn-muted" onClick={() => setActionConfirm(null)}>Cancel</button>
                <button className="ac-action-btn ac-btn-danger" onClick={confirmAction}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DocumentTitle>
  );
};

export default AgentConfigPage;
