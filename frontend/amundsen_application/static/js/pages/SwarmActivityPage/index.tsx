// ==============================================================================
// FILE: SwarmActivityPage/index.tsx
// SWARM ACTIVITY TIMELINE
// Unified activity feed: agent join/leave, data mutations, replication events,
// query history, schema changes — filterable by agent/time/event type
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

type EventType = 'AGENT_JOIN' | 'AGENT_LEAVE' | 'DATA_INSERT' | 'DATA_UPDATE' | 'DATA_DELETE' | 'REPLICATION' | 'QUERY' | 'SCHEMA_CHANGE' | 'CONFLICT' | 'ALERT' | 'CONSENSUS' | 'HEARTBEAT';

interface ActivityEvent {
  id: string;
  type: EventType;
  agent: string;
  timestamp: string;
  summary: string;
  details: string;
  metadata: Record<string, string | number>;
  severity: 'normal' | 'warning' | 'critical' | 'success';
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

const EVENT_TEMPLATES: { type: EventType; summaries: string[]; details: string[]; severity: ActivityEvent['severity'] }[] = [
  { type: 'AGENT_JOIN', summaries: ['Agent joined the swarm', 'Node re-connected after maintenance', 'New agent bootstrapped'], details: ['Successfully synced with coordinator', 'CRDT state merged with 0 conflicts', 'Peer discovery completed, connected to {peers} peers'], severity: 'success' },
  { type: 'AGENT_LEAVE', summaries: ['Agent disconnected', 'Node went offline (graceful)', 'Agent removed from mesh'], details: ['Graceful shutdown initiated', 'Data replicated to {replicas} backup nodes before departure', 'Heartbeat timeout after 30s'], severity: 'warning' },
  { type: 'DATA_INSERT', summaries: ['Bulk insert completed', 'New records ingested', 'IoT batch inserted'], details: ['{count} records inserted into {store}', 'Write confirmed on {replicas} replicas', 'Batch processing time: {latency}ms'], severity: 'normal' },
  { type: 'DATA_UPDATE', summaries: ['Records updated', 'Metadata refresh completed', 'Configuration updated'], details: ['{count} records updated in {store}', 'CRDT version bumped to v{version}', 'Update propagated via GossipSub'], severity: 'normal' },
  { type: 'DATA_DELETE', summaries: ['Records purged', 'TTL-expired data cleaned', 'DSAR erasure executed'], details: ['{count} records tombstoned in {store}', 'Tombstone replicated across {replicas} nodes', 'GDPR erasure request completed'], severity: 'warning' },
  { type: 'REPLICATION', summaries: ['Cross-node replication completed', 'Sync cycle finished', 'Anti-entropy repair done'], details: ['{count} entries replicated from {source} to {target}', 'Replication lag: {latency}ms', 'Merkle tree comparison found {diffs} differences'], severity: 'normal' },
  { type: 'QUERY', summaries: ['Federated query executed', 'Semantic search completed', 'Cross-node aggregation finished'], details: ['Query touched {agents} agents, scanned {rows} rows', 'Response time: {latency}ms', 'Results merged from {shards} shards'], severity: 'normal' },
  { type: 'SCHEMA_CHANGE', summaries: ['Schema migration applied', 'New column added', 'Index created'], details: ['ALTER TABLE {store}: added column "{column}" ({type})', 'Schema version bumped to v{version}', 'Migration propagated to {replicas} nodes'], severity: 'warning' },
  { type: 'CONFLICT', summaries: ['CRDT conflict detected', 'Merge conflict resolved', 'Vector clock divergence'], details: ['Conflict on {store}.{key} between {nodeA} and {nodeB}', 'Resolved via Last-Writer-Wins (LWW)', 'Manual resolution required — flagged for review'], severity: 'critical' },
  { type: 'ALERT', summaries: ['Quality threshold breach', 'Disk usage warning', 'Replication lag exceeded SLA'], details: ['{metric} dropped below threshold on {agent}', 'Disk usage at {usage}% — consider cleanup', 'Replication lag {latency}ms exceeds 500ms SLA'], severity: 'critical' },
  { type: 'CONSENSUS', summaries: ['Leader election completed', 'Consensus round finished', 'Raft term advanced'], details: ['{agent} elected as new coordinator (term {term})', 'Consensus reached in {latency}ms with {votes}/{total} votes', 'Term {term}: all nodes acknowledged'], severity: 'success' },
];

function generateActivityFeed(agents: OptimusDBNode[]): ActivityEvent[] {
  const stores = ['knowledge_base', 'sensor_readings', 'energy_metrics', 'device_config', 'grid_topology'];
  const events: ActivityEvent[] = [];

  for (let i = 0; i < 80; i++) {
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const store = stores[Math.floor(Math.random() * stores.length)];
    const count = Math.floor(Math.random() * 5000) + 1;
    const latency = Math.floor(Math.random() * 800) + 10;

    const summary = template.summaries[Math.floor(Math.random() * template.summaries.length)];
    let detail = template.details[Math.floor(Math.random() * template.details.length)];
    detail = detail
      .replace('{count}', String(count))
      .replace('{store}', store)
      .replace('{replicas}', String(Math.floor(Math.random() * 5) + 2))
      .replace('{latency}', String(latency))
      .replace('{version}', String(Math.floor(Math.random() * 50) + 100))
      .replace('{peers}', String(Math.floor(Math.random() * 6) + 2))
      .replace('{source}', agents[Math.floor(Math.random() * agents.length)]?.name || 'db1')
      .replace('{target}', agents[Math.floor(Math.random() * agents.length)]?.name || 'db2')
      .replace('{agents}', String(Math.floor(Math.random() * 4) + 2))
      .replace('{rows}', String(Math.floor(Math.random() * 50000) + 100))
      .replace('{shards}', String(Math.floor(Math.random() * 4) + 2))
      .replace('{column}', 'quality_score')
      .replace('{type}', 'FLOAT')
      .replace('{key}', `record_${Math.floor(Math.random() * 1000)}`)
      .replace('{nodeA}', agents[0]?.name || 'db1')
      .replace('{nodeB}', agents[1]?.name || 'db2')
      .replace('{metric}', 'completeness')
      .replace('{agent}', agent.name)
      .replace('{usage}', String(Math.floor(Math.random() * 20) + 80))
      .replace('{term}', String(Math.floor(Math.random() * 10) + 1))
      .replace('{votes}', String(Math.floor(Math.random() * 3) + 4))
      .replace('{total}', String(agents.length))
      .replace('{diffs}', String(Math.floor(Math.random() * 50)));

    events.push({
      id: `evt-${i}`,
      type: template.type,
      agent: agent.name,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      summary,
      details: detail,
      metadata: { store, count, latency },
      severity: template.severity,
    });
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ==============================================================================
// EVENT TYPE STYLING
// ==============================================================================

const EVENT_STYLES: Record<EventType, { icon: string; color: string; bg: string }> = {
  AGENT_JOIN: { icon: '🟢', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
  AGENT_LEAVE: { icon: '🔴', color: '#f85149', bg: 'rgba(248,81,73,0.1)' },
  DATA_INSERT: { icon: '📥', color: '#58a6ff', bg: 'rgba(88,166,255,0.1)' },
  DATA_UPDATE: { icon: '📝', color: '#79c0ff', bg: 'rgba(121,192,255,0.1)' },
  DATA_DELETE: { icon: '🗑️', color: '#f0883e', bg: 'rgba(240,136,62,0.1)' },
  REPLICATION: { icon: '🔄', color: '#a5d6ff', bg: 'rgba(165,214,255,0.1)' },
  QUERY: { icon: '🔍', color: '#bc8cff', bg: 'rgba(188,140,255,0.1)' },
  SCHEMA_CHANGE: { icon: '🔧', color: '#d29922', bg: 'rgba(210,153,34,0.1)' },
  CONFLICT: { icon: '⚡', color: '#f85149', bg: 'rgba(248,81,73,0.1)' },
  ALERT: { icon: '🚨', color: '#da3633', bg: 'rgba(218,54,51,0.1)' },
  CONSENSUS: { icon: '🤝', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
  HEARTBEAT: { icon: '💓', color: '#8b949e', bg: 'rgba(139,148,158,0.1)' },
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const SwarmActivityPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'normal' | 'warning' | 'critical' | 'success'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [displayCount, setDisplayCount] = useState(30);
  const [resolvedNodes, setResolvedNodes] = useState<OptimusDBNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      setResolvedNodes(apiNodes);
      setEvents(generateActivityFeed(apiNodes));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Live simulation
  useEffect(() => {
    if (!isLive || events.length === 0 || resolvedNodes.length === 0) return;
    const interval = setInterval(() => {
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      const agent = resolvedNodes[Math.floor(Math.random() * resolvedNodes.length)];
      const newEvent: ActivityEvent = {
        id: `live-${Date.now()}`,
        type: template.type,
        agent: agent.name,
        timestamp: new Date().toISOString(),
        summary: template.summaries[Math.floor(Math.random() * template.summaries.length)],
        details: 'Live event from swarm mesh',
        metadata: {},
        severity: template.severity,
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 200));
    }, 8000);
    return () => clearInterval(interval);
  }, [isLive, events.length, resolvedNodes]);

  const agents = useMemo(() => [...new Set(events.map(e => e.agent))].sort(), [events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterType !== 'all') result = result.filter(e => e.type === filterType);
    if (filterAgent !== 'all') result = result.filter(e => e.agent === filterAgent);
    if (filterSeverity !== 'all') result = result.filter(e => e.severity === filterSeverity);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.summary.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.agent.toLowerCase().includes(q));
    }
    return result.slice(0, displayCount);
  }, [events, filterType, filterAgent, filterSeverity, searchQuery, displayCount]);

  // Stats
  const stats = useMemo(() => {
    const last1h = events.filter(e => new Date(e.timestamp).getTime() > Date.now() - 3600000);
    return {
      total: events.length,
      lastHour: last1h.length,
      criticalCount: events.filter(e => e.severity === 'critical').length,
      byType: Object.entries(
        events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]),
    };
  }, [events]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  // Determine date group label
  const getDateGroup = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <DocumentTitle title="Activity Timeline - OptimusDDC">
        <main className="sa-page"><div className="sa-loading"><div className="sa-loading-spinner" /><p>Loading activity stream…</p></div></main>
      </DocumentTitle>
    );
  }

  // Group events by date
  const groupedEvents: { label: string; events: typeof filteredEvents }[] = [];
  let currentGroup = '';
  filteredEvents.forEach(evt => {
    const group = getDateGroup(evt.timestamp);
    if (group !== currentGroup) {
      currentGroup = group;
      groupedEvents.push({ label: group, events: [] });
    }
    groupedEvents[groupedEvents.length - 1].events.push(evt);
  });

  return (
    <DocumentTitle title="Activity Timeline - OptimusDDC">
      <main className="sa-page">
        {/* Header */}
        <header className="sa-header">
          <div className="sa-header-left">
            <div className="sa-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h1 className="sa-title">Swarm Activity Timeline</h1>
              <p className="sa-subtitle">Unified Event Stream · Real-Time Monitoring · Audit History</p>
            </div>
          </div>
          <div className="sa-header-right">
            <button className={`sa-live-toggle ${isLive ? 'active' : ''}`} onClick={() => setIsLive(!isLive)}>
              <span className="sa-live-dot" /> {isLive ? 'Live' : 'Paused'}
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="sa-stats">
          <div className="sa-stat"><span className="sa-stat-v">{stats.total}</span><span className="sa-stat-l">Total Events</span></div>
          <div className="sa-stat"><span className="sa-stat-v">{stats.lastHour}</span><span className="sa-stat-l">Last Hour</span></div>
          <div className="sa-stat"><span className={`sa-stat-v ${stats.criticalCount > 0 ? 'critical' : ''}`}>{stats.criticalCount}</span><span className="sa-stat-l">Critical</span></div>
          <div className="sa-stat"><span className="sa-stat-v">{agents.length}</span><span className="sa-stat-l">Active Agents</span></div>
        </div>

        {/* Filters */}
        <div className="sa-filters">
          <input className="sa-search" placeholder="Search events…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <select className="sa-select" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="all">All Types</option>
            {Object.keys(EVENT_STYLES).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select className="sa-select" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="all">All Agents</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="sa-select" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as any)}>
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        {/* Timeline */}
        <div className="sa-content">
          <div className="sa-timeline">
            {groupedEvents.map(group => (
              <div key={group.label} className="sa-day-group">
                <div className="sa-day-label">{group.label}</div>
                {group.events.map(evt => {
                  const style = EVENT_STYLES[evt.type] || EVENT_STYLES.HEARTBEAT;
                  const isExpanded = expandedEvent === evt.id;
                  return (
                    <div key={evt.id} className={`sa-event sev-${evt.severity}`} onClick={() => setExpandedEvent(isExpanded ? null : evt.id)}>
                      <div className="sa-event-indicator">
                        <div className="sa-event-dot" style={{ background: style.bg, borderColor: style.color }}>
                          <span className="sa-event-icon">{style.icon}</span>
                        </div>
                        <div className="sa-event-line" />
                      </div>
                      <div className="sa-event-body">
                        <div className="sa-event-header">
                          <span className="sa-event-type" style={{ color: style.color, background: style.bg }}>{evt.type.replace(/_/g, ' ')}</span>
                          <span className="sa-event-time">{formatTime(evt.timestamp)}</span>
                        </div>
                        <div className="sa-event-summary">{evt.summary}</div>
                        <div className="sa-event-agent">
                          <span className="sa-agent-chip">{evt.agent}</span>
                        </div>
                        {isExpanded && (
                          <div className="sa-event-details">
                            <div className="sa-detail-text">{evt.details}</div>
                            <div className="sa-detail-time">
                              {new Date(evt.timestamp).toLocaleString()}
                            </div>
                            {Object.keys(evt.metadata).length > 0 && (
                              <div className="sa-detail-meta">
                                {Object.entries(evt.metadata).map(([k, v]) => (
                                  <span key={k} className="sa-meta-tag">{k}: {v}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {filteredEvents.length >= displayCount && (
              <div className="sa-load-more">
                <button className="sa-load-more-btn" onClick={() => setDisplayCount(prev => prev + 30)}>
                  Load more events…
                </button>
              </div>
            )}

            {filteredEvents.length === 0 && (
              <div className="sa-empty">No events match the current filters.</div>
            )}
          </div>

          {/* Right sidebar — Event type breakdown */}
          <div className="sa-breakdown">
            <h4 className="sa-breakdown-title">Event Breakdown</h4>
            {stats.byType.map(([type, count]) => {
              const style = EVENT_STYLES[type as EventType] || EVENT_STYLES.HEARTBEAT;
              const pct = Math.round((count / events.length) * 100);
              return (
                <div key={type} className="sa-breakdown-row" onClick={() => setFilterType(filterType === type ? 'all' : type as EventType)}>
                  <span className="sa-breakdown-icon">{style.icon}</span>
                  <span className="sa-breakdown-label" style={{ color: filterType === type ? style.color : '#8b949e' }}>{type.replace(/_/g, ' ')}</span>
                  <span className="sa-breakdown-count">{count}</span>
                  <div className="sa-breakdown-bar">
                    <div className="sa-breakdown-fill" style={{ width: `${pct}%`, background: style.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default SwarmActivityPage;
