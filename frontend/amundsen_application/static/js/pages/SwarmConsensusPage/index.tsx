// ==============================================================================
// FILE: SwarmConsensusPage/index.tsx
// SWARM CONSENSUS & REPLICATION MONITOR
// Real-time GossipSub mesh viz, CRDT conflict resolution, replication lag,
// network partition simulation, self-healing visualization
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface SwarmNode {
  id: string;
  name: string;
  peerId: string;
  role: 'coordinator' | 'follower';
  isOnline: boolean;
  isPartitioned: boolean;
  replicationLag: number; // ms
  lastHeartbeat: string;
  connectedPeers: string[];
  messagesSent: number;
  messagesReceived: number;
  crdtVersion: number;
  x: number;
  y: number;
}

interface GossipMessage {
  id: string;
  from: string;
  to: string;
  topic: string;
  type: 'HEARTBEAT' | 'REPLICATE' | 'QUERY' | 'CONFLICT' | 'HEAL';
  timestamp: string;
  size: number;
  latency: number;
  progress: number; // 0 to 1 for animation
}

interface CRDTConflict {
  id: string;
  store: string;
  key: string;
  conflictType: 'CONCURRENT_WRITE' | 'MERGE_DIVERGENCE' | 'TOMBSTONE_RACE' | 'VECTOR_CLOCK_DRIFT';
  nodeA: string;
  nodeB: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: 'LWW' | 'MERGE' | 'MANUAL' | 'PENDING';
  details: string;
}

interface ReplicationEvent {
  id: string;
  source: string;
  target: string;
  store: string;
  entriesReplicated: number;
  latencyMs: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  timestamp: string;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

function generateSwarmNodes(apiNodes: OptimusDBNode[]): SwarmNode[] {
  const centerX = 350, centerY = 250;
  const radius = 180;

  return apiNodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / apiNodes.length - Math.PI / 2;
    return {
      id: node.name,
      name: node.name,
      peerId: `12D3KooW${String.fromCharCode(65 + i)}${Math.random().toString(36).substring(2, 8)}`,
      role: i === 0 ? 'coordinator' : 'follower',
      isOnline: Math.random() > 0.1,
      isPartitioned: false,
      replicationLag: Math.floor(Math.random() * 500),
      lastHeartbeat: new Date(Date.now() - Math.random() * 30000).toISOString(),
      connectedPeers: apiNodes.filter((_, j) => j !== i && Math.random() > 0.3).map(n => n.name),
      messagesSent: Math.floor(Math.random() * 10000) + 1000,
      messagesReceived: Math.floor(Math.random() * 10000) + 1000,
      crdtVersion: Math.floor(Math.random() * 50) + 100,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

function generateConflicts(nodes: SwarmNode[]): CRDTConflict[] {
  const types: CRDTConflict['conflictType'][] = ['CONCURRENT_WRITE', 'MERGE_DIVERGENCE', 'TOMBSTONE_RACE', 'VECTOR_CLOCK_DRIFT'];
  const resolutions: CRDTConflict['resolution'][] = ['LWW', 'MERGE', 'LWW', 'MERGE', 'PENDING'];
  const stores = ['knowledge_base', 'sensor_log', 'metadata_store', 'config_store'];
  const conflicts: CRDTConflict[] = [];

  for (let i = 0; i < 8; i++) {
    const nA = nodes[Math.floor(Math.random() * nodes.length)];
    let nB = nodes[Math.floor(Math.random() * nodes.length)];
    while (nB.id === nA.id) nB = nodes[Math.floor(Math.random() * nodes.length)];
    const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    conflicts.push({
      id: `conflict-${i}`,
      store: stores[Math.floor(Math.random() * stores.length)],
      key: `record_${Math.floor(Math.random() * 1000)}`,
      conflictType: types[Math.floor(Math.random() * types.length)],
      nodeA: nA.name,
      nodeB: nB.name,
      detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      resolvedAt: resolution !== 'PENDING' ? new Date(Date.now() - Math.random() * 1800000).toISOString() : null,
      resolution,
      details: resolution === 'LWW' ? 'Resolved by Last-Writer-Wins (timestamp comparison)' : resolution === 'MERGE' ? 'State merged using CRDT merge function' : 'Awaiting manual resolution',
    });
  }
  return conflicts;
}

function generateReplicationEvents(nodes: SwarmNode[]): ReplicationEvent[] {
  const stores = ['knowledge_base', 'sensor_log', 'swarmkb.events', 'metadata_store'];
  const events: ReplicationEvent[] = [];

  for (let i = 0; i < 30; i++) {
    const src = nodes[Math.floor(Math.random() * nodes.length)];
    let tgt = nodes[Math.floor(Math.random() * nodes.length)];
    while (tgt.id === src.id) tgt = nodes[Math.floor(Math.random() * nodes.length)];
    events.push({
      id: `repl-${i}`,
      source: src.name,
      target: tgt.name,
      store: stores[Math.floor(Math.random() * stores.length)],
      entriesReplicated: Math.floor(Math.random() * 500) + 1,
      latencyMs: Math.floor(Math.random() * 800) + 10,
      status: Math.random() > 0.1 ? 'SUCCESS' : Math.random() > 0.5 ? 'PARTIAL' : 'FAILED',
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    });
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ==============================================================================
// SUB-COMPONENTS
// ==============================================================================

// ── Mesh Visualization SVG ──
const MeshVisualization: React.FC<{
  nodes: SwarmNode[];
  messages: GossipMessage[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  onPartition: (id: string) => void;
}> = ({ nodes, messages, selectedNode, onSelectNode, onPartition }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const w = 700, h = 500;

  // Generate edges from connected peers
  const edges = useMemo(() => {
    const edgeSet = new Set<string>();
    const result: { from: SwarmNode; to: SwarmNode; active: boolean }[] = [];
    nodes.forEach(node => {
      node.connectedPeers.forEach(peerId => {
        const peer = nodes.find(n => n.id === peerId);
        if (peer) {
          const edgeKey = [node.id, peer.id].sort().join('-');
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            result.push({ from: node, to: peer, active: node.isOnline && peer.isOnline && !node.isPartitioned && !peer.isPartitioned });
          }
        }
      });
    });
    return result;
  }, [nodes]);

  return (
    <svg ref={svgRef} className="sc-mesh-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="node-glow-online" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,200,120,0.3)" />
          <stop offset="100%" stopColor="rgba(0,200,120,0)" />
        </radialGradient>
        <radialGradient id="node-glow-offline" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,80,80,0.3)" />
          <stop offset="100%" stopColor="rgba(255,80,80,0)" />
        </radialGradient>
        <radialGradient id="node-glow-coordinator" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(88,166,255,0.4)" />
          <stop offset="100%" stopColor="rgba(88,166,255,0)" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid background */}
      {Array.from({ length: 20 }, (_, i) => (
        <React.Fragment key={`grid-${i}`}>
          <line x1={0} y1={h * i / 20} x2={w} y2={h * i / 20} stroke="rgba(255,255,255,0.02)" strokeWidth={0.5} />
          <line x1={w * i / 20} y1={0} x2={w * i / 20} y2={h} stroke="rgba(255,255,255,0.02)" strokeWidth={0.5} />
        </React.Fragment>
      ))}

      {/* Edges */}
      {edges.map(({ from, to, active }, i) => (
        <line
          key={`edge-${i}`}
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke={active ? 'rgba(56,139,253,0.2)' : 'rgba(255,80,80,0.1)'}
          strokeWidth={active ? 1.5 : 0.5}
          strokeDasharray={active ? 'none' : '4,4'}
        />
      ))}

      {/* Active message animations */}
      {messages.map(msg => {
        const fromNode = nodes.find(n => n.id === msg.from);
        const toNode = nodes.find(n => n.id === msg.to);
        if (!fromNode || !toNode) return null;
        const x = fromNode.x + (toNode.x - fromNode.x) * msg.progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * msg.progress;
        const color = msg.type === 'HEARTBEAT' ? '#3fb950' : msg.type === 'REPLICATE' ? '#58a6ff' : msg.type === 'CONFLICT' ? '#f85149' : msg.type === 'HEAL' ? '#d29922' : '#bc8cff';
        return (
          <g key={msg.id}>
            <circle cx={x} cy={y} r={4} fill={color} filter="url(#glow)" opacity={0.9}>
              <animate attributeName="r" values="3;5;3" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const isSelected = selectedNode === node.id;
        const glowId = !node.isOnline ? 'node-glow-offline' : node.role === 'coordinator' ? 'node-glow-coordinator' : 'node-glow-online';
        const nodeColor = node.isPartitioned ? '#d29922' : !node.isOnline ? '#f85149' : node.role === 'coordinator' ? '#58a6ff' : '#3fb950';

        return (
          <g key={node.id} className="sc-mesh-node" onClick={() => onSelectNode(isSelected ? null : node.id)} style={{ cursor: 'pointer' }}>
            {/* Glow ring */}
            <circle cx={node.x} cy={node.y} r={32} fill={`url(#${glowId})`}>
              <animate attributeName="r" values="28;35;28" dur="4s" repeatCount="indefinite" />
            </circle>
            {/* Selection ring */}
            {isSelected && <circle cx={node.x} cy={node.y} r={22} fill="none" stroke="#58a6ff" strokeWidth={2} strokeDasharray="4,3">
              <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} dur="8s" repeatCount="indefinite" />
            </circle>}
            {/* Partitioned indicator */}
            {node.isPartitioned && <circle cx={node.x} cy={node.y} r={24} fill="none" stroke="#d29922" strokeWidth={2} strokeDasharray="6,4" />}
            {/* Main circle */}
            <circle cx={node.x} cy={node.y} r={node.role === 'coordinator' ? 16 : 12} fill={nodeColor} stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={isSelected ? 2.5 : 1} />
            {/* Label */}
            <text x={node.x} y={node.y + (node.role === 'coordinator' ? 28 : 24)} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10} fontFamily="monospace">{node.name}</text>
            {/* Role badge */}
            {node.role === 'coordinator' && (
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">★</text>
            )}
            {/* Lag indicator */}
            {node.replicationLag > 200 && node.isOnline && (
              <text x={node.x + 18} y={node.y - 10} fill="#d29922" fontSize={8} fontFamily="monospace">{node.replicationLag}ms</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── Replication Lag Heatmap ──
const LagHeatmap: React.FC<{ nodes: SwarmNode[] }> = ({ nodes }) => {
  const onlineNodes = nodes.filter(n => n.isOnline);
  return (
    <div className="sc-heatmap">
      <h4 className="sc-subsection-title">Replication Lag Matrix (ms)</h4>
      <div className="sc-heatmap-grid" style={{ gridTemplateColumns: `60px repeat(${onlineNodes.length}, 1fr)` }}>
        <div className="sc-heatmap-corner" />
        {onlineNodes.map(n => <div key={`h-${n.id}`} className="sc-heatmap-header">{n.name.replace('optimusdb', 'db')}</div>)}
        {onlineNodes.map(row => (
          <React.Fragment key={`row-${row.id}`}>
            <div className="sc-heatmap-label">{row.name.replace('optimusdb', 'db')}</div>
            {onlineNodes.map(col => {
              const lag = row.id === col.id ? 0 : Math.floor(Math.abs(row.replicationLag - col.replicationLag) + Math.random() * 100);
              const intensity = Math.min(lag / 500, 1);
              const bg = lag === 0 ? 'rgba(255,255,255,0.03)' : `rgba(${Math.floor(255 * intensity)}, ${Math.floor(200 * (1 - intensity))}, ${Math.floor(80 * (1 - intensity))}, 0.6)`;
              return <div key={`${row.id}-${col.id}`} className="sc-heatmap-cell" style={{ background: bg }} title={`${row.name} → ${col.name}: ${lag}ms`}>{lag > 0 ? lag : '—'}</div>;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const SwarmConsensusPage: React.FC = () => {
  const [nodes, setNodes] = useState<SwarmNode[]>([]);
  const [conflicts, setConflicts] = useState<CRDTConflict[]>([]);
  const [replEvents, setReplEvents] = useState<ReplicationEvent[]>([]);
  const [messages, setMessages] = useState<GossipMessage[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mesh' | 'conflicts' | 'replication' | 'heatmap'>('mesh');
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const messageIdRef = useRef(0);

  // Initialize
  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      const swarmNodes = generateSwarmNodes(apiNodes);
      setNodes(swarmNodes);
      setConflicts(generateConflicts(swarmNodes));
      setReplEvents(generateReplicationEvents(swarmNodes));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Simulate gossip messages
  useEffect(() => {
    if (nodes.length === 0) return;
    const interval = setInterval(() => {
      const onlineNodes = nodes.filter(n => n.isOnline && !n.isPartitioned);
      if (onlineNodes.length < 2) return;

      const from = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
      let to = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
      while (to.id === from.id) to = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];

      const types: GossipMessage['type'][] = ['HEARTBEAT', 'HEARTBEAT', 'REPLICATE', 'REPLICATE', 'QUERY'];
      const msgType = types[Math.floor(Math.random() * types.length)];

      const msgId = `msg-${messageIdRef.current++}`;
      const newMsg: GossipMessage = {
        id: msgId, from: from.id, to: to.id,
        topic: msgType === 'HEARTBEAT' ? 'swarm.heartbeat' : msgType === 'REPLICATE' ? 'swarm.replicate' : 'swarm.query',
        type: msgType, timestamp: new Date().toISOString(),
        size: Math.floor(Math.random() * 2048) + 64,
        latency: Math.floor(Math.random() * 200) + 10,
        progress: 0,
      };

      setMessages(prev => [...prev.slice(-20), newMsg]);

      // Animate message
      let progress = 0;
      const animInterval = setInterval(() => {
        progress += 0.05;
        if (progress >= 1) {
          clearInterval(animInterval);
          setMessages(prev => prev.filter(m => m.id !== msgId));
        } else {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, progress } : m));
        }
      }, 50);
    }, 1500);

    return () => clearInterval(interval);
  }, [nodes]);

  // Simulate network partition
  const handlePartition = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isPartitioned: !n.isPartitioned } : n));
    setIsSimulating(true);

    // Add HEAL messages after partition toggle
    setTimeout(() => {
      setIsSimulating(false);
      setNodes(prev => {
        const updated = [...prev];
        const node = updated.find(n => n.id === nodeId);
        if (node && node.isPartitioned) {
          // Remove from other nodes' connected peers
          updated.forEach(n => {
            if (n.id !== nodeId) {
              n.connectedPeers = n.connectedPeers.filter(p => p !== nodeId);
            }
          });
          node.connectedPeers = [];
        } else if (node && !node.isPartitioned) {
          // Reconnect
          updated.forEach(n => {
            if (n.id !== nodeId && n.isOnline && Math.random() > 0.3) {
              n.connectedPeers = [...new Set([...n.connectedPeers, nodeId])];
              node.connectedPeers = [...new Set([...node.connectedPeers, n.id])];
            }
          });
        }
        return updated;
      });
    }, 2000);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    totalNodes: nodes.length,
    onlineNodes: nodes.filter(n => n.isOnline).length,
    partitionedNodes: nodes.filter(n => n.isPartitioned).length,
    avgLag: nodes.length > 0 ? Math.round(nodes.reduce((s, n) => s + n.replicationLag, 0) / nodes.length) : 0,
    unresolvedConflicts: conflicts.filter(c => c.resolution === 'PENDING').length,
    totalConflicts: conflicts.length,
    successRate: replEvents.length > 0 ? Math.round((replEvents.filter(e => e.status === 'SUCCESS').length / replEvents.length) * 100) : 0,
  }), [nodes, conflicts, replEvents]);

  const selectedNodeData = useMemo(() => nodes.find(n => n.id === selectedNode), [nodes, selectedNode]);

  if (isLoading) {
    return (
      <DocumentTitle title="Swarm Consensus - OptimusDDC">
        <main className="sc-page">
          <div className="sc-loading"><div className="sc-loading-spinner" /><p>Connecting to swarm mesh…</p></div>
        </main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Swarm Consensus - OptimusDDC">
      <main className="sc-page">
        {/* Header */}
        <header className="sc-header">
          <div className="sc-header-left">
            <div className="sc-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><circle cx="12" cy="3" r="1.5" /><circle cx="20" cy="8" r="1.5" /><circle cx="20" cy="16" r="1.5" />
                <circle cx="12" cy="21" r="1.5" /><circle cx="4" cy="16" r="1.5" /><circle cx="4" cy="8" r="1.5" />
                <line x1="12" y1="4.5" x2="12" y2="9" /><line x1="18.7" y1="9" x2="14.8" y2="10.8" /><line x1="18.7" y1="15" x2="14.8" y2="13.2" />
                <line x1="12" y1="19.5" x2="12" y2="15" /><line x1="5.3" y1="15" x2="9.2" y2="13.2" /><line x1="5.3" y1="9" x2="9.2" y2="10.8" />
              </svg>
            </div>
            <div>
              <h1 className="sc-title">Swarm Consensus & Replication</h1>
              <p className="sc-subtitle">GossipSub Mesh · CRDT Conflict Resolution · Replication Monitoring</p>
            </div>
          </div>
          <div className="sc-header-right">
            {isSimulating && <span className="sc-sim-badge">Simulating…</span>}
            <span className="sc-live-indicator"><span className="sc-live-dot" /> Live</span>
          </div>
        </header>

        {/* Stats */}
        <div className="sc-stats-strip">
          <div className="sc-stat"><div className="sc-stat-value">{stats.onlineNodes}<span className="sc-stat-dim">/{stats.totalNodes}</span></div><div className="sc-stat-label">Nodes Online</div></div>
          <div className="sc-stat"><div className={`sc-stat-value ${stats.partitionedNodes > 0 ? 'warn' : ''}`}>{stats.partitionedNodes}</div><div className="sc-stat-label">Partitioned</div></div>
          <div className="sc-stat"><div className={`sc-stat-value ${stats.avgLag > 300 ? 'warn' : ''}`}>{stats.avgLag}<span className="sc-stat-unit">ms</span></div><div className="sc-stat-label">Avg Repl. Lag</div></div>
          <div className="sc-stat"><div className={`sc-stat-value ${stats.unresolvedConflicts > 0 ? 'warn' : 'ok'}`}>{stats.unresolvedConflicts}<span className="sc-stat-dim">/{stats.totalConflicts}</span></div><div className="sc-stat-label">Unresolved Conflicts</div></div>
          <div className="sc-stat"><div className={`sc-stat-value ${stats.successRate >= 90 ? 'ok' : 'warn'}`}>{stats.successRate}%</div><div className="sc-stat-label">Repl. Success Rate</div></div>
        </div>

        {/* Tabs */}
        <div className="sc-tabs">
          {([['mesh', 'P2P Mesh'], ['conflicts', 'CRDT Conflicts'], ['replication', 'Replication Events'], ['heatmap', 'Lag Heatmap']] as [string, string][]).map(([key, label]) => (
            <button key={key} className={`sc-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key as any)}>
              {label}
              {key === 'conflicts' && stats.unresolvedConflicts > 0 && <span className="sc-tab-badge">{stats.unresolvedConflicts}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="sc-content">
          {activeTab === 'mesh' && (
            <div className="sc-mesh-layout">
              <div className="sc-mesh-main">
                <MeshVisualization nodes={nodes} messages={messages} selectedNode={selectedNode} onSelectNode={setSelectedNode} onPartition={handlePartition} />
                <div className="sc-mesh-legend">
                  <span><span className="sc-legend-circle coordinator" /> Coordinator</span>
                  <span><span className="sc-legend-circle follower" /> Follower</span>
                  <span><span className="sc-legend-circle offline" /> Offline</span>
                  <span><span className="sc-legend-circle partitioned" /> Partitioned</span>
                  <span><span className="sc-legend-dot heartbeat" /> Heartbeat</span>
                  <span><span className="sc-legend-dot replicate" /> Replicate</span>
                  <span><span className="sc-legend-dot query-msg" /> Query</span>
                </div>
              </div>
              <div className="sc-mesh-sidebar">
                {selectedNodeData ? (
                  <div className="sc-node-detail">
                    <h3>{selectedNodeData.name}</h3>
                    <div className={`sc-node-status ${selectedNodeData.isOnline ? 'online' : 'offline'}`}>
                      <span className="sc-status-dot" />{selectedNodeData.isOnline ? (selectedNodeData.isPartitioned ? 'Partitioned' : 'Online') : 'Offline'}
                    </div>
                    <div className="sc-detail-grid">
                      <div className="sc-detail-item"><span className="sc-detail-label">Role</span><span className="sc-detail-value">{selectedNodeData.role}</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">PeerID</span><span className="sc-detail-value mono">{selectedNodeData.peerId.substring(0, 16)}…</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">Connected</span><span className="sc-detail-value">{selectedNodeData.connectedPeers.length} peers</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">Repl. Lag</span><span className={`sc-detail-value ${selectedNodeData.replicationLag > 300 ? 'warn' : ''}`}>{selectedNodeData.replicationLag}ms</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">CRDT Version</span><span className="sc-detail-value">{selectedNodeData.crdtVersion}</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">Msgs Sent</span><span className="sc-detail-value">{selectedNodeData.messagesSent.toLocaleString()}</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">Msgs Received</span><span className="sc-detail-value">{selectedNodeData.messagesReceived.toLocaleString()}</span></div>
                      <div className="sc-detail-item"><span className="sc-detail-label">Last Heartbeat</span><span className="sc-detail-value">{new Date(selectedNodeData.lastHeartbeat).toLocaleTimeString()}</span></div>
                    </div>
                    <button className={`sc-partition-btn ${selectedNodeData.isPartitioned ? 'heal' : 'partition'}`} onClick={() => handlePartition(selectedNodeData.id)}>
                      {selectedNodeData.isPartitioned ? '🔗 Heal Partition' : '✂️ Simulate Partition'}
                    </button>
                  </div>
                ) : (
                  <div className="sc-node-detail-empty">
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(139,148,158,0.4)" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <p>Click a node on the mesh to inspect its state and simulate network partitions.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="sc-panel">
              <div className="sc-conflicts-list">
                {conflicts.map(c => (
                  <div key={c.id} className={`sc-conflict-card ${c.resolution === 'PENDING' ? 'unresolved' : 'resolved'}`}>
                    <div className="sc-conflict-header">
                      <span className={`sc-conflict-type type-${c.conflictType.toLowerCase().replace(/_/g, '-')}`}>{c.conflictType.replace(/_/g, ' ')}</span>
                      <span className={`sc-resolution-badge ${c.resolution.toLowerCase()}`}>{c.resolution}</span>
                    </div>
                    <div className="sc-conflict-body">
                      <div className="sc-conflict-path"><code>{c.store}</code> / <code>{c.key}</code></div>
                      <div className="sc-conflict-nodes">
                        <span className="sc-node-tag">{c.nodeA}</span>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        <span className="sc-node-tag">{c.nodeB}</span>
                      </div>
                      <div className="sc-conflict-detail">{c.details}</div>
                      <div className="sc-conflict-time">Detected: {new Date(c.detectedAt).toLocaleString()} {c.resolvedAt && `· Resolved: ${new Date(c.resolvedAt).toLocaleString()}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'replication' && (
            <div className="sc-panel">
              <div className="sc-repl-table-wrapper">
                <table className="sc-repl-table">
                  <thead>
                    <tr><th>Time</th><th>Source</th><th>Target</th><th>Store</th><th>Entries</th><th>Latency</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {replEvents.map(e => (
                      <tr key={e.id}>
                        <td className="td-time">{new Date(e.timestamp).toLocaleTimeString()}</td>
                        <td><span className="sc-node-tag">{e.source}</span></td>
                        <td><span className="sc-node-tag">{e.target}</span></td>
                        <td className="td-mono">{e.store}</td>
                        <td>{e.entriesReplicated}</td>
                        <td className={e.latencyMs > 500 ? 'td-warn' : ''}>{e.latencyMs}ms</td>
                        <td><span className={`sc-repl-status status-${e.status.toLowerCase()}`}>{e.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="sc-panel sc-heatmap-panel">
              <LagHeatmap nodes={nodes} />
            </div>
          )}
        </div>
      </main>
    </DocumentTitle>
  );
};

export default SwarmConsensusPage;
