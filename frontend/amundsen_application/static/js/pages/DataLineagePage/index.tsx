// ==============================================================================
// FILE: DataLineagePage/index.tsx
// DATA LINEAGE FLOW BUILDER
// Interactive DAG/Sankey showing data provenance across the swarm:
// ingest → replicate → transform → query, with per-node lineage tracking
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface LineageNode {
  id: string;
  label: string;
  type: 'source' | 'ingest' | 'store' | 'transform' | 'replicate' | 'query' | 'sink';
  agent: string;
  x: number;
  y: number;
  metadata: Record<string, string>;
}

interface LineageEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  dataVolume: number; // records
  latencyMs: number;
  isActive: boolean;
}

interface LineageDataset {
  id: string;
  name: string;
  description: string;
  originAgent: string;
  replicatedTo: string[];
  totalRecords: number;
  createdAt: string;
  lastModified: string;
  transformations: TransformationStep[];
  consumers: string[];
}

interface TransformationStep {
  id: string;
  name: string;
  type: 'ETL' | 'FILTER' | 'AGGREGATE' | 'JOIN' | 'ENRICH' | 'NORMALIZE';
  inputDatasets: string[];
  outputDataset: string;
  agent: string;
  lastRun: string;
  recordsProcessed: number;
  durationMs: number;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

function generateLineageGraph(apiNodes: OptimusDBNode[]): { nodes: LineageNode[]; edges: LineageEdge[]; datasets: LineageDataset[] } {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const colW = 130, rowH = 80;
  const startX = 40, startY = 60;

  // Column positions for each stage
  const cols = { source: 0, ingest: 1, store: 2, transform: 3, replicate: 4, query: 5, sink: 6 };

  // Sources
  const sources: { id: string; label: string; meta: Record<string, string> }[] = [
    { id: 'src-iot', label: 'IoT Sensors', meta: { protocol: 'MQTT', frequency: '1s', format: 'JSON' } },
    { id: 'src-api', label: 'REST API', meta: { protocol: 'HTTPS', format: 'JSON', auth: 'OAuth2' } },
    { id: 'src-file', label: 'CSV Upload', meta: { format: 'CSV', encoding: 'UTF-8' } },
    { id: 'src-stream', label: 'Kafka Stream', meta: { topic: 'energy.raw', partitions: '6' } },
  ];

  sources.forEach((src, i) => {
    nodes.push({ id: src.id, label: src.label, type: 'source', agent: 'external', x: startX + cols.source * colW, y: startY + i * rowH, metadata: src.meta });
  });

  // Ingest nodes
  const ingestNodes = [
    { id: 'ing-batch', label: 'Batch Ingest', agent: apiNodes[0]?.name || 'db1' },
    { id: 'ing-stream', label: 'Stream Ingest', agent: apiNodes[0]?.name || 'db1' },
    { id: 'ing-upload', label: 'File Ingest', agent: apiNodes[1]?.name || 'db2' },
  ];

  ingestNodes.forEach((ing, i) => {
    nodes.push({ id: ing.id, label: ing.label, type: 'ingest', agent: ing.agent, x: startX + cols.ingest * colW, y: startY + i * rowH + 20, metadata: { agent: ing.agent, mode: i === 1 ? 'streaming' : 'batch' } });
  });

  // Edges: source → ingest
  edges.push({ id: 'e-1', source: 'src-iot', target: 'ing-stream', label: 'MQTT → Stream', dataVolume: 50000, latencyMs: 5, isActive: true });
  edges.push({ id: 'e-2', source: 'src-api', target: 'ing-batch', label: 'HTTP → Batch', dataVolume: 2000, latencyMs: 120, isActive: true });
  edges.push({ id: 'e-3', source: 'src-file', target: 'ing-upload', label: 'Upload', dataVolume: 500, latencyMs: 800, isActive: true });
  edges.push({ id: 'e-4', source: 'src-stream', target: 'ing-stream', label: 'Kafka', dataVolume: 30000, latencyMs: 15, isActive: true });

  // Store nodes
  const storeNodes = [
    { id: 'store-sensor', label: 'sensor_readings', agent: apiNodes[0]?.name || 'db1' },
    { id: 'store-energy', label: 'energy_metrics', agent: apiNodes[0]?.name || 'db1' },
    { id: 'store-config', label: 'device_config', agent: apiNodes[1]?.name || 'db2' },
    { id: 'store-kb', label: 'knowledge_base', agent: apiNodes[1]?.name || 'db2' },
  ];

  storeNodes.forEach((st, i) => {
    nodes.push({ id: st.id, label: st.label, type: 'store', agent: st.agent, x: startX + cols.store * colW, y: startY + i * rowH, metadata: { agent: st.agent, crdt: 'LWW-Register' } });
  });

  edges.push({ id: 'e-5', source: 'ing-stream', target: 'store-sensor', label: 'Write', dataVolume: 50000, latencyMs: 8, isActive: true });
  edges.push({ id: 'e-6', source: 'ing-batch', target: 'store-energy', label: 'Write', dataVolume: 2000, latencyMs: 25, isActive: true });
  edges.push({ id: 'e-7', source: 'ing-upload', target: 'store-config', label: 'Upsert', dataVolume: 500, latencyMs: 50, isActive: true });
  edges.push({ id: 'e-8', source: 'ing-stream', target: 'store-kb', label: 'Enrich+Write', dataVolume: 5000, latencyMs: 30, isActive: true });

  // Transform nodes
  const transformNodes = [
    { id: 'tx-agg', label: 'Hourly Aggregation', agent: apiNodes[0]?.name || 'db1' },
    { id: 'tx-enrich', label: 'Geo-Enrichment', agent: apiNodes[1]?.name || 'db2' },
    { id: 'tx-anomaly', label: 'Anomaly Detection', agent: apiNodes[0]?.name || 'db1' },
  ];

  transformNodes.forEach((tx, i) => {
    nodes.push({ id: tx.id, label: tx.label, type: 'transform', agent: tx.agent, x: startX + cols.transform * colW, y: startY + i * rowH + 20, metadata: { agent: tx.agent, schedule: i === 0 ? 'hourly' : 'realtime' } });
  });

  edges.push({ id: 'e-9', source: 'store-sensor', target: 'tx-agg', label: 'Read', dataVolume: 50000, latencyMs: 15, isActive: true });
  edges.push({ id: 'e-10', source: 'store-energy', target: 'tx-enrich', label: 'Read', dataVolume: 2000, latencyMs: 20, isActive: true });
  edges.push({ id: 'e-11', source: 'store-config', target: 'tx-enrich', label: 'Lookup', dataVolume: 200, latencyMs: 5, isActive: true });
  edges.push({ id: 'e-12', source: 'store-sensor', target: 'tx-anomaly', label: 'Stream', dataVolume: 50000, latencyMs: 10, isActive: true });

  // Replicate nodes
  const replAgents = apiNodes.slice(1, Math.min(4, apiNodes.length));
  replAgents.forEach((agent, i) => {
    const repId = `repl-${agent.name}`;
    nodes.push({ id: repId, label: `Replica ${agent.name}`, type: 'replicate', agent: agent.name, x: startX + cols.replicate * colW, y: startY + i * rowH + 10, metadata: { agent: agent.name, mode: 'async', lag: `${Math.floor(Math.random() * 200) + 10}ms` } });
    edges.push({ id: `e-repl-${i}`, source: 'store-sensor', target: repId, label: 'GossipSub', dataVolume: 50000, latencyMs: Math.floor(Math.random() * 200) + 10, isActive: Math.random() > 0.1 });
  });

  // Query nodes
  const queryNodes = [
    { id: 'q-dashboard', label: 'Analytics Dashboard', agent: apiNodes[0]?.name || 'db1' },
    { id: 'q-api', label: 'API Consumers', agent: apiNodes[0]?.name || 'db1' },
    { id: 'q-semantic', label: 'Semantic Search', agent: apiNodes[1]?.name || 'db2' },
  ];

  queryNodes.forEach((q, i) => {
    nodes.push({ id: q.id, label: q.label, type: 'query', agent: q.agent, x: startX + cols.query * colW, y: startY + i * rowH + 20, metadata: { agent: q.agent } });
  });

  edges.push({ id: 'e-q1', source: 'tx-agg', target: 'q-dashboard', label: 'Federated Query', dataVolume: 1000, latencyMs: 45, isActive: true });
  edges.push({ id: 'e-q2', source: 'tx-enrich', target: 'q-api', label: 'REST', dataVolume: 500, latencyMs: 80, isActive: true });
  edges.push({ id: 'e-q3', source: 'store-kb', target: 'q-semantic', label: 'sqlite-vec', dataVolume: 20, latencyMs: 30, isActive: true });
  edges.push({ id: 'e-q4', source: 'tx-anomaly', target: 'q-dashboard', label: 'Alerts', dataVolume: 10, latencyMs: 5, isActive: true });

  // Sink nodes
  nodes.push({ id: 'sink-export', label: 'Data Export', type: 'sink', agent: 'external', x: startX + cols.sink * colW, y: startY + rowH, metadata: { format: 'Parquet' } });
  nodes.push({ id: 'sink-notify', label: 'Alert Service', type: 'sink', agent: 'external', x: startX + cols.sink * colW, y: startY + 2 * rowH, metadata: { channel: 'webhook' } });

  edges.push({ id: 'e-s1', source: 'q-api', target: 'sink-export', label: 'Export', dataVolume: 500, latencyMs: 200, isActive: true });
  edges.push({ id: 'e-s2', source: 'q-dashboard', target: 'sink-notify', label: 'Webhook', dataVolume: 10, latencyMs: 50, isActive: true });

  // Datasets
  const datasets: LineageDataset[] = [
    { id: 'ds-sensor', name: 'sensor_readings', description: 'Raw IoT sensor data from MQTT/Kafka', originAgent: apiNodes[0]?.name || 'db1', replicatedTo: replAgents.map(a => a.name), totalRecords: 2350000, createdAt: '2025-11-15T10:00:00Z', lastModified: new Date(Date.now() - 60000).toISOString(), transformations: [], consumers: ['tx-agg', 'tx-anomaly'] },
    { id: 'ds-energy', name: 'energy_metrics', description: 'Aggregated energy consumption metrics', originAgent: apiNodes[0]?.name || 'db1', replicatedTo: [apiNodes[1]?.name || 'db2'], totalRecords: 45000, createdAt: '2025-12-01T08:00:00Z', lastModified: new Date(Date.now() - 3600000).toISOString(), transformations: [{ id: 'tx-1', name: 'Hourly Aggregation', type: 'AGGREGATE', inputDatasets: ['sensor_readings'], outputDataset: 'energy_metrics', agent: apiNodes[0]?.name || 'db1', lastRun: new Date(Date.now() - 3600000).toISOString(), recordsProcessed: 50000, durationMs: 12000 }], consumers: ['q-dashboard', 'q-api'] },
    { id: 'ds-kb', name: 'knowledge_base', description: 'Semantic knowledge graph with TinyLlama embeddings', originAgent: apiNodes[1]?.name || 'db2', replicatedTo: apiNodes.slice(0, 2).map(a => a.name), totalRecords: 8500, createdAt: '2026-01-10T12:00:00Z', lastModified: new Date(Date.now() - 7200000).toISOString(), transformations: [], consumers: ['q-semantic'] },
  ];

  return { nodes, edges, datasets };
}

// ==============================================================================
// STYLING HELPERS
// ==============================================================================

const NODE_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  source: { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)', icon: '📡' },
  ingest: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', icon: '📥' },
  store: { color: '#d29922', bg: 'rgba(210,153,34,0.12)', icon: '🗄️' },
  transform: { color: '#bc8cff', bg: 'rgba(188,140,255,0.12)', icon: '⚙️' },
  replicate: { color: '#a5d6ff', bg: 'rgba(165,214,255,0.12)', icon: '🔄' },
  query: { color: '#f0883e', bg: 'rgba(240,136,62,0.12)', icon: '🔍' },
  sink: { color: '#8b949e', bg: 'rgba(139,148,158,0.12)', icon: '📤' },
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const DataLineagePage: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: LineageNode[]; edges: LineageEdge[]; datasets: LineageDataset[] }>({ nodes: [], edges: [], datasets: [] });
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<LineageDataset | null>(null);
  const [highlightPath, setHighlightPath] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'dag' | 'datasets' | 'transformations'>('dag');
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      setGraphData(generateLineageGraph(apiNodes));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Trace upstream/downstream path from selected node
  const tracePath = useCallback((nodeId: string) => {
    const pathIds = new Set<string>();
    const traceUp = (id: string) => {
      pathIds.add(id);
      graphData.edges.filter(e => e.target === id).forEach(e => { pathIds.add(e.id); traceUp(e.source); });
    };
    const traceDown = (id: string) => {
      pathIds.add(id);
      graphData.edges.filter(e => e.source === id).forEach(e => { pathIds.add(e.id); traceDown(e.target); });
    };
    traceUp(nodeId);
    traceDown(nodeId);
    setHighlightPath(pathIds);
  }, [graphData.edges]);

  const handleNodeClick = useCallback((node: LineageNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    if (node) tracePath(node.id);
    else setHighlightPath(new Set());
  }, [tracePath]);

  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return graphData.nodes;
    return graphData.nodes.filter(n => n.type === filterType);
  }, [graphData.nodes, filterType]);

  const stats = useMemo(() => ({
    sources: graphData.nodes.filter(n => n.type === 'source').length,
    stores: graphData.nodes.filter(n => n.type === 'store').length,
    transforms: graphData.nodes.filter(n => n.type === 'transform').length,
    edges: graphData.edges.length,
    totalFlow: graphData.edges.reduce((s, e) => s + e.dataVolume, 0),
    datasets: graphData.datasets.length,
  }), [graphData]);

  const svgW = 960, svgH = 420;

  if (isLoading) {
    return (
      <DocumentTitle title="Data Lineage - OptimusDDC">
        <main className="dl-page"><div className="dl-loading"><div className="dl-spinner" /><p>Tracing data lineage…</p></div></main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Data Lineage - OptimusDDC">
      <main className="dl-page">
        <header className="dl-header">
          <div className="dl-header-left">
            <div className="dl-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <div>
              <h1 className="dl-title">Data Lineage Flow</h1>
              <p className="dl-subtitle">Provenance Tracking · Cross-Node Flow · Transformation History</p>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="dl-stats">
          <div className="dl-stat"><span className="dl-stat-v">{stats.sources}</span><span className="dl-stat-l">Sources</span></div>
          <div className="dl-stat"><span className="dl-stat-v">{stats.stores}</span><span className="dl-stat-l">Stores</span></div>
          <div className="dl-stat"><span className="dl-stat-v">{stats.transforms}</span><span className="dl-stat-l">Transforms</span></div>
          <div className="dl-stat"><span className="dl-stat-v">{stats.edges}</span><span className="dl-stat-l">Data Flows</span></div>
          <div className="dl-stat"><span className="dl-stat-v dl-stat-accent">{(stats.totalFlow / 1000).toFixed(0)}K</span><span className="dl-stat-l">Records/cycle</span></div>
          <div className="dl-stat"><span className="dl-stat-v">{stats.datasets}</span><span className="dl-stat-l">Datasets</span></div>
        </div>

        {/* Toolbar */}
        <div className="dl-toolbar">
          <div className="dl-view-toggle">
            {(['dag', 'datasets', 'transformations'] as const).map(v => (
              <button key={v} className={`dl-view-btn ${activeView === v ? 'active' : ''}`} onClick={() => setActiveView(v)}>
                {v === 'dag' ? 'Lineage DAG' : v === 'datasets' ? 'Datasets' : 'Transformations'}
              </button>
            ))}
          </div>
          {activeView === 'dag' && (
            <div className="dl-filter-group">
              {['all', 'source', 'ingest', 'store', 'transform', 'replicate', 'query', 'sink'].map(t => (
                <button key={t} className={`dl-filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
          )}
          {highlightPath.size > 0 && (
            <button className="dl-clear-btn" onClick={() => { setHighlightPath(new Set()); setSelectedNode(null); }}>Clear Path</button>
          )}
        </div>

        <div className="dl-content">
          {activeView === 'dag' && (
            <div className="dl-dag-layout">
              <div className="dl-dag-main">
                {/* Stage labels */}
                <div className="dl-stage-labels">
                  {['Sources', 'Ingest', 'Stores', 'Transform', 'Replicate', 'Query', 'Sinks'].map(s => (
                    <span key={s} className="dl-stage-label">{s}</span>
                  ))}
                </div>

                <svg className="dl-dag-svg" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <marker id="dl-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                      <polygon points="0 0, 10 3.5, 0 7" fill="rgba(88,166,255,0.4)" />
                    </marker>
                    <marker id="dl-arrow-hl" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#58a6ff" />
                    </marker>
                  </defs>

                  {/* Stage column backgrounds */}
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <rect key={`bg-${i}`} x={i * 130 + 10} y={0} width={120} height={svgH} rx={6} fill={i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'} />
                  ))}

                  {/* Edges */}
                  {graphData.edges.map(edge => {
                    const src = graphData.nodes.find(n => n.id === edge.source);
                    const tgt = graphData.nodes.find(n => n.id === edge.target);
                    if (!src || !tgt) return null;
                    const isHighlighted = highlightPath.has(edge.id);
                    const isDimmed = highlightPath.size > 0 && !isHighlighted;
                    const sx = src.x + 50, sy = src.y + 16;
                    const tx = tgt.x, ty = tgt.y + 16;
                    const mx = (sx + tx) / 2;

                    return (
                      <g key={edge.id}>
                        <path
                          d={`M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`}
                          fill="none"
                          stroke={isHighlighted ? '#58a6ff' : 'rgba(88,166,255,0.15)'}
                          strokeWidth={isHighlighted ? 2.5 : 1}
                          strokeDasharray={edge.isActive ? 'none' : '4,4'}
                          opacity={isDimmed ? 0.1 : 1}
                          markerEnd={isHighlighted ? 'url(#dl-arrow-hl)' : 'url(#dl-arrow)'}
                        />
                        {isHighlighted && (
                          <text x={mx} y={(sy + ty) / 2 - 6} textAnchor="middle" fill="#58a6ff" fontSize={8} fontFamily="monospace">{edge.label}</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map(node => {
                    const style = NODE_STYLES[node.type];
                    const isSelected = selectedNode?.id === node.id;
                    const isInPath = highlightPath.has(node.id);
                    const isDimmed = highlightPath.size > 0 && !isInPath;

                    return (
                      <g key={node.id} className="dl-dag-node" onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }} opacity={isDimmed ? 0.15 : 1}>
                        {isSelected && (
                          <rect x={node.x - 4} y={node.y - 4} width={108} height={40} rx={8} fill="none" stroke={style.color} strokeWidth={2} strokeDasharray="4,3">
                            <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x + 50} ${node.y + 16}`} to={`360 ${node.x + 50} ${node.y + 16}`} dur="12s" repeatCount="indefinite" />
                          </rect>
                        )}
                        <rect x={node.x} y={node.y} width={100} height={32} rx={6} fill={isInPath ? style.bg : '#161b22'} stroke={isSelected ? style.color : '#21262d'} strokeWidth={isSelected ? 2 : 1} />
                        <text x={node.x + 16} y={node.y + 13} fill={style.color} fontSize={9}>{style.icon}</text>
                        <text x={node.x + 50} y={node.y + 14} textAnchor="middle" fill="#f0f6fc" fontSize={8} fontWeight="600" fontFamily="monospace">
                          {node.label.length > 14 ? node.label.substring(0, 12) + '…' : node.label}
                        </text>
                        <text x={node.x + 50} y={node.y + 25} textAnchor="middle" fill="#484f58" fontSize={7} fontFamily="monospace">{node.agent}</text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="dl-legend">
                  {Object.entries(NODE_STYLES).map(([type, style]) => (
                    <span key={type} className="dl-legend-item">
                      <span className="dl-legend-dot" style={{ background: style.color }} />
                      <span>{type}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Detail Sidebar */}
              <div className="dl-sidebar">
                {selectedNode ? (
                  <div className="dl-node-detail">
                    <div className="dl-nd-type" style={{ color: NODE_STYLES[selectedNode.type]?.color, background: NODE_STYLES[selectedNode.type]?.bg }}>
                      {NODE_STYLES[selectedNode.type]?.icon} {selectedNode.type.toUpperCase()}
                    </div>
                    <h3 className="dl-nd-name">{selectedNode.label}</h3>
                    <div className="dl-nd-agent">Agent: <span>{selectedNode.agent}</span></div>
                    <div className="dl-nd-props">
                      {Object.entries(selectedNode.metadata).map(([k, v]) => (
                        <div key={k}><span>{k}</span><span>{v}</span></div>
                      ))}
                    </div>
                    <div className="dl-nd-connections">
                      <h4>Upstream</h4>
                      {graphData.edges.filter(e => e.target === selectedNode.id).map(e => {
                        const src = graphData.nodes.find(n => n.id === e.source);
                        return <div key={e.id} className="dl-conn-item"><span>{src?.label}</span><span className="dl-conn-vol">{e.dataVolume.toLocaleString()} rec</span></div>;
                      })}
                      <h4>Downstream</h4>
                      {graphData.edges.filter(e => e.source === selectedNode.id).map(e => {
                        const tgt = graphData.nodes.find(n => n.id === e.target);
                        return <div key={e.id} className="dl-conn-item"><span>{tgt?.label}</span><span className="dl-conn-vol">{e.dataVolume.toLocaleString()} rec</span></div>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="dl-sidebar-empty">
                    <p>Click a node to trace its full data lineage — upstream sources and downstream consumers.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'datasets' && (
            <div className="dl-datasets">
              {graphData.datasets.map(ds => (
                <div key={ds.id} className="dl-dataset-card">
                  <div className="dl-ds-header">
                    <span className="dl-ds-name">{ds.name}</span>
                    <span className="dl-ds-records">{ds.totalRecords.toLocaleString()} records</span>
                  </div>
                  <p className="dl-ds-desc">{ds.description}</p>
                  <div className="dl-ds-meta">
                    <div><span>Origin</span><span className="dl-mono">{ds.originAgent}</span></div>
                    <div><span>Replicated To</span><span>{ds.replicatedTo.join(', ')}</span></div>
                    <div><span>Created</span><span>{new Date(ds.createdAt).toLocaleDateString()}</span></div>
                    <div><span>Last Modified</span><span>{new Date(ds.lastModified).toLocaleString()}</span></div>
                  </div>
                  {ds.transformations.length > 0 && (
                    <div className="dl-ds-transforms">
                      <h5>Transformations</h5>
                      {ds.transformations.map(tx => (
                        <div key={tx.id} className="dl-tx-item">
                          <span className="dl-tx-type">{tx.type}</span>
                          <span className="dl-tx-name">{tx.name}</span>
                          <span className="dl-tx-stats">{tx.recordsProcessed.toLocaleString()} rec · {(tx.durationMs / 1000).toFixed(1)}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeView === 'transformations' && (
            <div className="dl-transforms-view">
              <h3 className="dl-section-title">Transformation Pipeline</h3>
              <div className="dl-tx-table">
                <table>
                  <thead><tr><th>Name</th><th>Type</th><th>Input</th><th>Output</th><th>Agent</th><th>Last Run</th><th>Records</th><th>Duration</th></tr></thead>
                  <tbody>
                    {graphData.datasets.flatMap(ds => ds.transformations).map(tx => (
                      <tr key={tx.id}>
                        <td className="dl-mono">{tx.name}</td>
                        <td><span className="dl-tx-type-badge">{tx.type}</span></td>
                        <td className="dl-mono">{tx.inputDatasets.join(', ')}</td>
                        <td className="dl-mono">{tx.outputDataset}</td>
                        <td>{tx.agent}</td>
                        <td className="dl-td-time">{new Date(tx.lastRun).toLocaleString()}</td>
                        <td>{tx.recordsProcessed.toLocaleString()}</td>
                        <td>{(tx.durationMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </DocumentTitle>
  );
};

export default DataLineagePage;
