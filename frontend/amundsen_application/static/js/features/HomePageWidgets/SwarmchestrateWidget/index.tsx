// ==============================================================================
// SwarmchestrateWidget - Swarm Operations Dashboard
// ==============================================================================
// PHASE 5 FINAL: 100% real data from ALL agents
//
// Strategy: 3 fast parallel fetches per agent, results merged & sorted
//   1. /agent/status          → health, election, cluster (already fast)
//   2. /ems/sql (1 query)     → event counts by level (last hour)
//   3. /ems/sql (1 query)     → recent interesting log entries
//   + 1 fetch from any node:
//   4. /debug/optimusdb/mesh  → libp2p peers, OrbitDB stores, mesh health
//   5. /api/v1/metadata/metrics → TinyLlama stats
//
// Real queries visible: PROC level = SQL DML, INFO with [QUERY] = federated
// ==============================================================================

import * as React from 'react';
import { getAvailableNodes, buildApiUrl } from 'config/apiConfig';
import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface ActivityEvent {
  id: string;
  type: 'query' | 'metadata' | 'replication' | 'election' | 'validation';
  agent: string;
  agentId: number;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

interface EventCount {
  level: string;
  count: number;
}

interface MeshPeer {
  peerIdShort: string;
  connections: number;
  connectedness: string;
}

interface OrbitStore {
  name: string;
  initialized: boolean;
  type: string;
}

interface OperationsData {
  electionEvents: number;
  meshEvents: number;
  discoveryEvents: number;
  errorEvents: number;
  warnEvents: number;
  queryEvents: number; // PROC + [QUERY] tagged
  avgResponseTime: number;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

const SwarmchestrateWidget: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'queries' | 'network'>('overview');
  const [numAgents, setNumAgents] = React.useState(0);
  const [recentActivity, setRecentActivity] = React.useState<ActivityEvent[]>([]);
  const [eventBreakdown, setEventBreakdown] = React.useState<EventCount[]>([]);
  const [operations, setOperations] = React.useState<OperationsData | null>(null);
  const [agentResponseTimes, setAgentResponseTimes] = React.useState<{ name: string; ms: number }[]>([]);
  const [leaderInfo, setLeaderInfo] = React.useState<{ agentId: number; agentName: string; term: number; uptime: string; peerId: string } | null>(null);
  const [meshPeers, setMeshPeers] = React.useState<MeshPeer[]>([]);
  const [meshHealth, setMeshHealth] = React.useState<{ status: string; coverage: string; connected: number; discovered: number }>({ status: 'N/A', coverage: '0', connected: 0, discovered: 0 });
  const [orbitStores, setOrbitStores] = React.useState<OrbitStore[]>([]);
  const [enrichmentMetrics, setEnrichmentMetrics] = React.useState<{ total: number; llmOk: number; llmFail: number }>({ total: 0, llmOk: 0, llmFail: 0 });
  const [loading, setLoading] = React.useState(true);

  // ==============================================================================
  // FETCH ALL DATA — from ALL agents in parallel
  // ==============================================================================

  const fetchAllData = React.useCallback(async () => {
    try {
      const nodes = await getAvailableNodes();
      setNumAgents(nodes.length);

      // ── 1. /agent/status from ALL nodes (parallel) ──
      const statusResults = await Promise.all(nodes.map(async (node) => {
        const t0 = Date.now();
        try {
          const resp = await fetch(buildApiUrl('optimusdb', '/swarmkb/agent/status', node.id), { signal: AbortSignal.timeout(5000) });
          if (!resp.ok) throw new Error();
          return { id: node.id, name: node.name, online: true, ms: Date.now() - t0, data: await resp.json() };
        } catch (_e) {
          return { id: node.id, name: node.name, online: false, ms: Date.now() - t0, data: null as any };
        }
      }));

      const online = statusResults.filter(r => r.online);
      const avgMs = online.length > 0 ? Math.round(online.reduce((s, r) => s + r.ms, 0) / online.length) : 0;
      setAgentResponseTimes(statusResults.map(r => ({ name: r.name, ms: r.ms })));

      // Leader info
      const coord = online.find(r => r.data?.agent?.is_coordinator);
      if (coord) {
        const uptimeH = parseFloat(coord.data.agent.health?.uptime || '0');
        const d = Math.floor(uptimeH / 24), h = Math.floor(uptimeH % 24), m = Math.floor((uptimeH % 1) * 60);
        setLeaderInfo({
          agentId: coord.id, agentName: coord.name,
          term: coord.data.election?.current_term || 0,
          uptime: d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`,
          peerId: (coord.data.agent.peer_id || '').substring(0, 12),
        });
      }

      // ── 2. Event counts from ALL agents (parallel) ──
      // One fast SQL per agent: counts by level, last hour
      const countSQL = encodeURIComponent("SELECT level, COUNT(*) as cnt FROM optimusLogger WHERE timestamp >= datetime('now','-60 minutes') GROUP BY level ORDER BY cnt DESC");
      const countResults = await Promise.all(nodes.map(async (node) => {
        try {
          const resp = await fetch(buildApiUrl('optimusdb', `/swarmkb/ems/sql?q=${countSQL}`, node.id), { signal: AbortSignal.timeout(4000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          return (data?.records || []) as { level: string; cnt: number }[];
        } catch (_e) { return []; }
      }));

      // Merge counts across all agents
      const merged = new Map<string, number>();
      countResults.forEach(records => {
        records.forEach((r: any) => {
          merged.set(r.level, (merged.get(r.level) || 0) + r.cnt);
        });
      });

      const breakdown = [...merged.entries()].map(([level, count]) => ({ level, count })).sort((a, b) => b.count - a.count);
      setEventBreakdown(breakdown);

      const getCount = (lvl: string) => merged.get(lvl) || 0;
      setOperations({
        electionEvents: getCount('ELECTION'),
        meshEvents: getCount('MESH'),
        discoveryEvents: getCount('DISCOVERY'),
        errorEvents: getCount('ERROR'),
        warnEvents: getCount('WARN'),
        queryEvents: getCount('PROC') + getCount('gAI'),
        avgResponseTime: avgMs,
      });

      // ── 3. Recent activity logs from ALL agents (parallel) ──
      // Fetch interesting entries: PROC (SQL queries), INFO with [QUERY], WARN, ERROR, gAI
      const actSQL = encodeURIComponent("SELECT id, timestamp, level, source, substr(message,1,200) as msg FROM optimusLogger WHERE level IN ('PROC','ERROR','WARN','gAI') OR (level='INFO' AND message LIKE '%[QUERY]%') OR (level='INFO' AND message LIKE '%SQL DML%') ORDER BY id DESC LIMIT 5");
      const actResults = await Promise.all(nodes.map(async (node) => {
        try {
          const resp = await fetch(buildApiUrl('optimusdb', `/swarmkb/ems/sql?q=${actSQL}`, node.id), { signal: AbortSignal.timeout(4000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          return (data?.records || []).map((r: any) => ({ ...r, agentNodeId: node.id, agentNodeName: node.name }));
        } catch (_e) { return []; }
      }));

      // Merge, sort, deduplicate
      const allLogs = ([] as any[]).concat(...actResults).sort((a: any, b: any) => {
        // Sort by timestamp desc, fallback to id desc
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta || (b.id || 0) - (a.id || 0);
      });

      const activity: ActivityEvent[] = allLogs.slice(0, 8).map((r: any, i: number) => {
        const level = r.level || 'INFO';
        const msg = (r.msg || r.message || '').replace(/^\[.*?\]\s*/, '').trim();
        let type: ActivityEvent['type'] = 'query';
        let typeLabel = '';

        // Classify based on actual log content
        if (msg.includes('CRUDGET')) { type = 'query'; typeLabel = 'CRUD GET'; }
        else if (msg.includes('CRUDPUT')) { type = 'metadata'; typeLabel = 'CRUD PUT'; }
        else if (msg.includes('CRUDUPDATE')) { type = 'metadata'; typeLabel = 'CRUD UPDATE'; }
        else if (msg.includes('CRUDDELETE')) { type = 'validation'; typeLabel = 'CRUD DELETE'; }
        else if (msg.includes('SQL DML')) { type = 'query'; typeLabel = 'SQL Query'; }
        else if (msg.includes('[QUERY]')) { type = 'query'; typeLabel = 'Federated Query'; }
        else if (msg.includes('Contribution')) { type = 'replication'; typeLabel = 'Contribution'; }
        else if (level === 'PROC') { type = 'query'; typeLabel = 'Operation'; }
        else if (level === 'gAI') { type = 'metadata'; typeLabel = 'AI Generation'; }
        else if (level === 'ERROR') { type = 'validation'; typeLabel = 'Error'; }
        else if (level === 'WARN') { type = 'replication'; typeLabel = 'Warning'; }

        return {
          id: `${r.agentNodeId}-${r.id || i}`,
          type,
          agent: r.agentNodeName || `Agent ${r.agentNodeId}`,
          agentId: r.agentNodeId,
          description: typeLabel ? `[${typeLabel}] ${msg.length > 100 ? msg.substring(0, 100) + '…' : msg}` : (msg.length > 120 ? msg.substring(0, 120) + '…' : msg),
          timestamp: new Date(r.timestamp || Date.now()),
          status: level === 'ERROR' ? 'error' : level === 'WARN' ? 'warning' : 'success',
        };
      });

      // If no interesting logs, fall back to agent status
      if (activity.length === 0) {
        online.forEach((r) => {
          const h = r.data?.agent?.health;
          activity.push({
            id: `status-${r.id}`, type: r.data?.agent?.is_coordinator ? 'election' : 'validation',
            agent: r.name, agentId: r.id,
            description: `${r.name}: CPU ${h?.cpu_usage || 'N/A'}, Mem ${h?.memory_used || 'N/A'}, Score ${h?.score || '0'}%`,
            timestamp: new Date(r.data?.timestamp || Date.now()),
            status: parseFloat(h?.score || '0') > 80 ? 'warning' : 'success',
          });
        });
      }
      setRecentActivity(activity);

      // ── 4. /debug/optimusdb/mesh from one node ──
      try {
        const meshResp = await fetch(buildApiUrl('optimusdb', '/swarmkb/debug/optimusdb/mesh', nodes[0]?.id || 1), { signal: AbortSignal.timeout(4000) });
        if (meshResp.ok) {
          const mesh = await meshResp.json();
          setMeshPeers((mesh.libp2p?.peers || []).map((p: any) => ({
            peerIdShort: p.peer_id_short || p.peer_id?.substring(0, 12) || '?',
            connections: p.connections || 0,
            connectedness: p.connectedness || 'Unknown',
          })));
          setMeshHealth({
            status: mesh.mesh_health?.status || 'UNKNOWN',
            coverage: mesh.mesh_health?.coverage_percent || '0',
            connected: mesh.libp2p?.connected_peers || 0,
            discovered: mesh.discovery?.discovered_count || 0,
          });
          setOrbitStores(Object.entries(mesh.orbitdb_stores || {}).map(([name, info]: [string, any]) => ({
            name, initialized: info.initialized || false, type: info.type || 'Unknown',
          })));
        }
      } catch (_e) { /* mesh not available */ }

      // ── 5. /api/v1/metadata/metrics from one node ──
      try {
        const mUrl = `${nodes[0]?.url || ''}/api/v1/metadata/metrics`;
        const mResp = await fetch(mUrl, { signal: AbortSignal.timeout(3000) });
        if (mResp.ok) {
          const mData = await mResp.json();
          const m = mData?.metrics || {};
          setEnrichmentMetrics({ total: m.TotalEnrichments || 0, llmOk: m.SuccessfulLLM || 0, llmFail: m.FailedLLM || 0 });
        }
      } catch (_e) { /* metadata metrics not available */ }

      setLoading(false);
    } catch (err) {
      console.error('SwarmchestrateWidget: fetch failed:', err);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ==============================================================================
  // HELPERS
  // ==============================================================================
  const fmtAgo = (d: Date): string => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };
  const fmtK = (n: number): string => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const icon = (t: ActivityEvent['type']) => ({ query: '🔍', metadata: '📝', replication: '⚠️', election: '👑', validation: '❌' }[t] || '📊');
  const label = (t: ActivityEvent['type']) => ({ query: 'Query / CRUD', metadata: 'Write / AI', replication: 'Warning', election: 'Leader', validation: 'Error / Delete' }[t] || 'Event');

  // ==============================================================================
  // RENDER
  // ==============================================================================
  if (loading) {
    return (
      <div className="swarm-operations-widget">
        <div className="widget-header"><div className="header-content"><div className="icon-wrapper"><span className="widget-icon">🔄</span></div><div className="header-text"><h3>Swarm Operations</h3><p className="subtitle">Real-time cluster activity</p></div></div></div>
        <div className="widget-body"><div className="loading-state"><div className="loading-spinner" /><p>Fetching from {numAgents || '...'} agents...</p></div></div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="overview-content">
      <div className="activity-section">
        <h4><span className="section-icon">📋</span> Recent Activity (All Agents)</h4>
        <div className="activity-feed">
          {recentActivity.slice(0, 6).map(ev => (
            <div key={ev.id} className={`activity-item ${ev.status}`}>
              <div className="activity-icon">{icon(ev.type)}</div>
              <div className="activity-details">
                <div className="activity-header">
                  <span className="activity-type">{label(ev.type)}</span>
                  <span className="activity-time">{fmtAgo(ev.timestamp)}</span>
                </div>
                <div className="activity-description">{ev.agent} • {ev.description}</div>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && <div style={{ color: '#999', fontSize: 12, padding: 16 }}>No recent activity</div>}
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card ai-metrics">
          <div className="metric-header"><span className="metric-icon">🤖</span><h5>TinyLlama</h5></div>
          <div className="metric-stats">
            <div className="stat-row"><span className="stat-label">Enrichments:</span><span className="stat-value">{enrichmentMetrics.total}</span></div>
            <div className="stat-row"><span className="stat-label">LLM OK / Fail:</span><span className="stat-value highlight">{enrichmentMetrics.llmOk} / {enrichmentMetrics.llmFail}</span></div>
          </div>
        </div>
        <div className="metric-card replication-metrics">
          <div className="metric-header"><span className="metric-icon">🌐</span><h5>Mesh</h5></div>
          <div className="replication-summary">
            <div className="summary-stat"><span className="summary-value">{meshHealth.status}</span><span className="summary-label">{meshHealth.coverage}% coverage</span></div>
            <div className="summary-stat"><span className="summary-value">{orbitStores.filter(s => s.initialized).length}</span><span className="summary-label">OrbitDB Stores</span></div>
          </div>
        </div>
      </div>

      {leaderInfo && (
        <div className="leader-info">
          <div className="leader-icon">👑</div>
          <div className="leader-details">
            <div className="leader-label">Current Leader</div>
            <div className="leader-value">{leaderInfo.agentName} <span className="leader-tenure">(Term {leaderInfo.term}, up {leaderInfo.uptime})</span></div>
            <div className="leader-peer-id">{leaderInfo.peerId}…</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderQueries = () => (
    <div className="queries-content">
      <div className="chart-section">
        <h4><span className="section-icon">📊</span> Agent Response Times</h4>
        <div className="performance-chart">
          <div className="chart-container">
            {agentResponseTimes.map((a, idx) => {
              const max = Math.max(...agentResponseTimes.map(r => r.ms), 1);
              return (
                <div key={idx} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: `${(a.ms / max) * 100}%` }} title={`${a.ms}ms`}><div className="bar-fill" /></div>
                  <div className="chart-label">{a.name.replace('optimusdb', 'db')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="top-queries-section">
        <h4><span className="section-icon">🔥</span> Event Breakdown — All Agents (Last Hour)</h4>
        <div className="queries-list">
          {eventBreakdown.map((ev, idx) => (
            <div key={idx} className="query-item">
              <div className="query-rank">{idx + 1}</div>
              <div className="query-details">
                <div className="query-text">{ev.level}</div>
                <div className="query-stats"><span className="query-count">{fmtK(ev.count)} events</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNetwork = () => (
    <div className="network-content">
      <h4><span className="section-icon">🌐</span> P2P Mesh ({numAgents} Agents)</h4>
      <div className="mesh-summary">
        <div className="mesh-stat"><span className={`mesh-stat-value ${meshHealth.status === 'EXCELLENT' ? 'excellent' : meshHealth.status === 'GOOD' ? 'good' : 'warning'}`}>{meshHealth.status}</span><span className="mesh-stat-label">Health</span></div>
        <div className="mesh-stat"><span className="mesh-stat-value">{meshHealth.coverage}%</span><span className="mesh-stat-label">Coverage</span></div>
        <div className="mesh-stat"><span className="mesh-stat-value">{meshHealth.connected}</span><span className="mesh-stat-label">Connected</span></div>
        <div className="mesh-stat"><span className="mesh-stat-value">{meshHealth.discovered}</span><span className="mesh-stat-label">Discovered</span></div>
      </div>

      <h4 style={{ marginTop: 16 }}><span className="section-icon">🔗</span> LibP2P Peers</h4>
      <div className="peer-table">
        {meshPeers.map((p, i) => (
          <div key={i} className="peer-row">
            <span className="peer-id">{p.peerIdShort}</span>
            <span className={`peer-status ${p.connectedness === 'Connected' ? 'connected' : 'disconnected'}`}>{p.connectedness}</span>
            <span className="peer-conns">{p.connections} conn</span>
          </div>
        ))}
        {meshPeers.length === 0 && <div style={{ color: '#999', fontSize: 12, padding: 12 }}>No peers detected</div>}
      </div>

      <h4 style={{ marginTop: 16 }}><span className="section-icon">📦</span> OrbitDB Stores</h4>
      <div className="stores-grid">
        {orbitStores.map((s, i) => (
          <div key={i} className={`store-chip ${s.initialized ? 'active' : 'inactive'}`}>
            <span className="store-indicator" />
            <span className="store-name">{s.name}</span>
            <span className="store-type">{s.type.replace('Store', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="swarm-operations-widget">
      <div className="widget-header">
        <div className="header-content"><div className="icon-wrapper"><span className="widget-icon">🔄</span></div><div className="header-text"><h3>Swarm Operations</h3><p className="subtitle">Real-time cluster activity</p></div></div>
        {operations && (
          <div className="header-metrics">
            <div className="header-metric"><div className="metric-value">{fmtK(operations.electionEvents)}</div><div className="metric-label">Elections</div></div>
            <div className="header-metric"><div className="metric-value">{fmtK(operations.meshEvents)}</div><div className="metric-label">Mesh</div></div>
            <div className="header-metric"><div className="metric-value">{fmtK(operations.discoveryEvents)}</div><div className="metric-label">Discovery</div></div>
            <div className="header-metric"><div className="metric-value">{operations.avgResponseTime}ms</div><div className="metric-label">Avg Response</div></div>
          </div>
        )}
      </div>
      <div className="view-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><span className="tab-icon">📊</span> Overview</button>
        <button className={`tab-btn ${activeTab === 'queries' ? 'active' : ''}`} onClick={() => setActiveTab('queries')}><span className="tab-icon">🔍</span> Queries</button>
        <button className={`tab-btn ${activeTab === 'network' ? 'active' : ''}`} onClick={() => setActiveTab('network')}><span className="tab-icon">🌐</span> Network</button>
      </div>
      <div className="widget-body">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'queries' && renderQueries()}
        {activeTab === 'network' && renderNetwork()}
      </div>
      <div className="widget-footer">
        <div className="footer-info"><span className="footer-icon">🔄</span> Auto-refresh: 30s</div>
        <div className="footer-info"><span className="footer-icon">🌐</span> {numAgents} Agents</div>
        <div className="footer-info"><span className="footer-icon">🕒</span> {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default SwarmchestrateWidget;
