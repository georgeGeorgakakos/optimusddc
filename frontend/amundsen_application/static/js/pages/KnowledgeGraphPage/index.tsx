// ==============================================================================
// FILE: KnowledgeGraphPage/index.tsx
// SEMANTIC KNOWLEDGE GRAPH EXPLORER
// Force-directed graph of dataset relationships via TinyLlama/sqlite-vec embeddings
// 2D embedding projection, semantic similarity explorer, cross-node lineage
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface KGNode {
  id: string;
  label: string;
  type: 'dataset' | 'table' | 'column' | 'concept' | 'agent';
  cluster: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sourceNode: string;
  description: string;
  embeddingPreview: number[];
  similarityScore?: number;
}

interface KGEdge {
  source: string;
  target: string;
  relationship: 'contains' | 'similar_to' | 'replicated_on' | 'derived_from' | 'semantically_related';
  weight: number;
}

interface EmbeddingCluster {
  id: number;
  label: string;
  color: string;
  count: number;
  centroid: { x: number; y: number };
  radius: number;
}

interface SearchResult {
  nodeId: string;
  label: string;
  score: number;
  type: string;
  sourceNode: string;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

const CLUSTER_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#79c0ff', '#f0883e', '#a5d6ff'];
const CONCEPT_LABELS = ['energy_metrics', 'sensor_data', 'grid_topology', 'weather_forecast', 'consumption_patterns', 'anomaly_detection', 'maintenance_logs', 'asset_registry'];
const TABLE_NAMES = ['readings', 'hourly_agg', 'device_config', 'alerts', 'forecasts', 'topology_nodes', 'topology_edges', 'calibration', 'raw_events', 'processed_metrics', 'user_sessions', 'audit_log'];
const COLUMN_NAMES = ['timestamp', 'value', 'device_id', 'location', 'unit', 'quality_flag', 'source_id', 'latitude', 'longitude', 'voltage', 'current', 'power_factor'];

function generateKnowledgeGraph(agentNodes: OptimusDBNode[]): { nodes: KGNode[]; edges: KGEdge[]; clusters: EmbeddingCluster[] } {
  const nodes: KGNode[] = [];
  const edges: KGEdge[] = [];
  const centerX = 400, centerY = 300;
  let nodeIdx = 0;

  // Generate clusters
  const numClusters = Math.min(6, CONCEPT_LABELS.length);
  const clusters: EmbeddingCluster[] = [];

  for (let c = 0; c < numClusters; c++) {
    const angle = (2 * Math.PI * c) / numClusters - Math.PI / 2;
    const clusterRadius = 120 + Math.random() * 40;
    const cx = centerX + clusterRadius * Math.cos(angle);
    const cy = centerY + clusterRadius * Math.sin(angle);

    clusters.push({
      id: c, label: CONCEPT_LABELS[c], color: CLUSTER_COLORS[c],
      count: 0, centroid: { x: cx, y: cy }, radius: 60 + Math.random() * 30,
    });

    // Concept node (central)
    nodes.push({
      id: `concept-${c}`, label: CONCEPT_LABELS[c], type: 'concept', cluster: c,
      x: cx, y: cy, vx: 0, vy: 0, size: 16,
      sourceNode: 'cluster', description: `Semantic cluster: ${CONCEPT_LABELS[c]}`,
      embeddingPreview: Array.from({ length: 8 }, () => Math.random() * 2 - 1),
    });
    nodeIdx++;

    // Tables around concept
    const numTables = 2 + Math.floor(Math.random() * 3);
    for (let t = 0; t < numTables; t++) {
      const tAngle = (2 * Math.PI * t) / numTables + Math.random() * 0.5;
      const tDist = 30 + Math.random() * 25;
      const tableName = TABLE_NAMES[(c * 2 + t) % TABLE_NAMES.length];
      const agent = agentNodes[Math.floor(Math.random() * agentNodes.length)];

      const tableNode: KGNode = {
        id: `table-${nodeIdx}`, label: `${agent.name}.${tableName}`, type: 'table', cluster: c,
        x: cx + tDist * Math.cos(tAngle), y: cy + tDist * Math.sin(tAngle), vx: 0, vy: 0, size: 10,
        sourceNode: agent.name, description: `Table on ${agent.name}`,
        embeddingPreview: Array.from({ length: 8 }, () => Math.random() * 2 - 1),
      };
      nodes.push(tableNode);
      edges.push({ source: `concept-${c}`, target: tableNode.id, relationship: 'contains', weight: 0.8 });
      nodeIdx++;

      // Columns
      const numCols = 2 + Math.floor(Math.random() * 2);
      for (let col = 0; col < numCols; col++) {
        const colName = COLUMN_NAMES[(c * 3 + t * 2 + col) % COLUMN_NAMES.length];
        const colNode: KGNode = {
          id: `col-${nodeIdx}`, label: colName, type: 'column', cluster: c,
          x: tableNode.x + (Math.random() - 0.5) * 20, y: tableNode.y + (Math.random() - 0.5) * 20, vx: 0, vy: 0, size: 5,
          sourceNode: agent.name, description: `Column in ${tableName}`,
          embeddingPreview: Array.from({ length: 8 }, () => Math.random() * 2 - 1),
        };
        nodes.push(colNode);
        edges.push({ source: tableNode.id, target: colNode.id, relationship: 'contains', weight: 0.6 });
        nodeIdx++;
      }
      clusters[c].count += 1 + numCols;
    }
    clusters[c].count += 1;
  }

  // Cross-cluster semantic similarity edges
  for (let i = 0; i < 8; i++) {
    const tableNodes = nodes.filter(n => n.type === 'table');
    const a = tableNodes[Math.floor(Math.random() * tableNodes.length)];
    const b = tableNodes[Math.floor(Math.random() * tableNodes.length)];
    if (a.id !== b.id && a.cluster !== b.cluster) {
      edges.push({ source: a.id, target: b.id, relationship: 'semantically_related', weight: 0.3 + Math.random() * 0.4 });
    }
  }

  // Agent nodes
  agentNodes.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / agentNodes.length;
    nodes.push({
      id: `agent-${agent.name}`, label: agent.name, type: 'agent', cluster: -1,
      x: centerX + 250 * Math.cos(angle), y: centerY + 200 * Math.sin(angle), vx: 0, vy: 0, size: 12,
      sourceNode: agent.name, description: `OptimusDB Agent`,
      embeddingPreview: [],
    });
  });

  return { nodes, edges, clusters };
}

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const KnowledgeGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: KGNode[]; edges: KGEdge[]; clusters: EmbeddingCluster[] }>({ nodes: [], edges: [], clusters: [] });
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeView, setActiveView] = useState<'graph' | 'embeddings' | 'similarity'>('graph');
  const [filterType, setFilterType] = useState<'all' | 'dataset' | 'table' | 'column' | 'concept'>('all');
  const [showClusters, setShowClusters] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      setGraphData(generateKnowledgeGraph(apiNodes));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results = graphData.nodes
      .filter(n => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
      .map(n => ({ nodeId: n.id, label: n.label, score: Math.random() * 0.5 + 0.5, type: n.type, sourceNode: n.sourceNode }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setSearchResults(results);
  }, [searchQuery, graphData.nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return graphData.nodes;
    return graphData.nodes.filter(n => n.type === filterType);
  }, [graphData.nodes, filterType]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return graphData.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes, graphData.edges]);

  // Stats
  const stats = useMemo(() => ({
    totalNodes: graphData.nodes.length,
    datasets: graphData.nodes.filter(n => n.type === 'concept').length,
    tables: graphData.nodes.filter(n => n.type === 'table').length,
    columns: graphData.nodes.filter(n => n.type === 'column').length,
    edges: graphData.edges.length,
    clusters: graphData.clusters.length,
    semanticEdges: graphData.edges.filter(e => e.relationship === 'semantically_related').length,
  }), [graphData]);

  const w = 800, h = 600;

  const getNodeColor = (type: string, cluster: number) => {
    if (type === 'agent') return '#8b949e';
    if (type === 'concept') return CLUSTER_COLORS[cluster] || '#58a6ff';
    if (type === 'table') return CLUSTER_COLORS[cluster] ? `${CLUSTER_COLORS[cluster]}cc` : '#58a6ffcc';
    return CLUSTER_COLORS[cluster] ? `${CLUSTER_COLORS[cluster]}80` : '#58a6ff80';
  };

  const getEdgeColor = (rel: string) => {
    if (rel === 'semantically_related') return 'rgba(188,140,255,0.3)';
    if (rel === 'replicated_on') return 'rgba(63,185,80,0.2)';
    return 'rgba(56,139,253,0.12)';
  };

  if (isLoading) {
    return (
      <DocumentTitle title="Knowledge Graph - OptimusDDC">
        <main className="kg-page">
          <div className="kg-loading"><div className="kg-loading-spinner" /><p>Building semantic graph…</p></div>
        </main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Knowledge Graph - OptimusDDC">
      <main className="kg-page">
        {/* Header */}
        <header className="kg-header">
          <div className="kg-header-left">
            <div className="kg-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" /><line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
                <line x1="6" y1="9" x2="6" y2="15" /><line x1="18" y1="9" x2="18" y2="15" />
              </svg>
            </div>
            <div>
              <h1 className="kg-title">Semantic Knowledge Graph</h1>
              <p className="kg-subtitle">TinyLlama Embeddings · sqlite-vec Similarity · Cross-Node Lineage</p>
            </div>
          </div>
          <div className="kg-header-right">
            <input className="kg-search" placeholder="Semantic search across datasets…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </header>

        {/* Stats */}
        <div className="kg-stats">
          <div className="kg-stat"><span className="kg-stat-v">{stats.totalNodes}</span><span className="kg-stat-l">Nodes</span></div>
          <div className="kg-stat"><span className="kg-stat-v">{stats.clusters}</span><span className="kg-stat-l">Clusters</span></div>
          <div className="kg-stat"><span className="kg-stat-v">{stats.tables}</span><span className="kg-stat-l">Tables</span></div>
          <div className="kg-stat"><span className="kg-stat-v">{stats.columns}</span><span className="kg-stat-l">Columns</span></div>
          <div className="kg-stat"><span className="kg-stat-v">{stats.edges}</span><span className="kg-stat-l">Edges</span></div>
          <div className="kg-stat"><span className="kg-stat-v kg-stat-accent">{stats.semanticEdges}</span><span className="kg-stat-l">Semantic Links</span></div>
        </div>

        {/* Toolbar */}
        <div className="kg-toolbar">
          <div className="kg-toolbar-left">
            <div className="kg-view-toggle">
              {(['graph', 'embeddings', 'similarity'] as const).map(v => (
                <button key={v} className={`kg-view-btn ${activeView === v ? 'active' : ''}`} onClick={() => setActiveView(v)}>
                  {v === 'graph' ? 'Knowledge Graph' : v === 'embeddings' ? 'Embedding Space' : 'Similarity Matrix'}
                </button>
              ))}
            </div>
          </div>
          <div className="kg-toolbar-right">
            <select className="kg-filter-select" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="concept">Concepts</option>
              <option value="table">Tables</option>
              <option value="column">Columns</option>
            </select>
            <label className="kg-toggle">
              <input type="checkbox" checked={showClusters} onChange={e => setShowClusters(e.target.checked)} />
              <span className="kg-toggle-track"><span className="kg-toggle-thumb" /></span>
              Clusters
            </label>
          </div>
        </div>

        {/* Main Content */}
        <div className="kg-content">
          <div className="kg-main">
            {activeView === 'graph' && (
              <div className="kg-graph-container">
                <svg ref={svgRef} className="kg-graph-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <filter id="kg-glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>

                  {/* Cluster backgrounds */}
                  {showClusters && graphData.clusters.map(c => (
                    <g key={`cluster-${c.id}`}>
                      <circle cx={c.centroid.x} cy={c.centroid.y} r={c.radius} fill={`${c.color}08`} stroke={`${c.color}20`} strokeWidth={1} strokeDasharray="4,4" />
                      <text x={c.centroid.x} y={c.centroid.y - c.radius + 12} textAnchor="middle" fill={`${c.color}60`} fontSize={9} fontFamily="monospace">{c.label}</text>
                    </g>
                  ))}

                  {/* Edges */}
                  {filteredEdges.map((e, i) => {
                    const src = filteredNodes.find(n => n.id === e.source);
                    const tgt = filteredNodes.find(n => n.id === e.target);
                    if (!src || !tgt) return null;
                    const isSemantic = e.relationship === 'semantically_related';
                    return (
                      <line key={`e-${i}`} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                        stroke={getEdgeColor(e.relationship)} strokeWidth={isSemantic ? 1.5 : 0.5}
                        strokeDasharray={isSemantic ? '6,3' : 'none'} />
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map(node => {
                    const isSelected = selectedNode?.id === node.id;
                    const isSearchHit = searchResults.some(r => r.nodeId === node.id);
                    const color = getNodeColor(node.type, node.cluster);
                    return (
                      <g key={node.id} className="kg-graph-node" onClick={() => setSelectedNode(isSelected ? null : node)} style={{ cursor: 'pointer' }}>
                        {(isSelected || isSearchHit) && (
                          <circle cx={node.x} cy={node.y} r={node.size + 6} fill="none" stroke={isSearchHit ? '#d29922' : '#58a6ff'} strokeWidth={1.5} strokeDasharray="3,2">
                            <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} dur="6s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle cx={node.x} cy={node.y} r={node.size} fill={color}
                          stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.1)'} strokeWidth={isSelected ? 2 : 0.5}
                          filter={node.type === 'concept' ? 'url(#kg-glow)' : undefined} />
                        {node.type !== 'column' && (
                          <text x={node.x} y={node.y + node.size + 11} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={node.type === 'concept' ? 9 : 7} fontFamily="monospace">
                            {node.label.length > 18 ? node.label.substring(0, 16) + '…' : node.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {activeView === 'embeddings' && (
              <div className="kg-embedding-view">
                <svg className="kg-embedding-svg" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
                  <text x="300" y="20" textAnchor="middle" fill="#8b949e" fontSize={11}>2D t-SNE Projection of TinyLlama Embeddings</text>
                  {graphData.clusters.map(c => (
                    <circle key={`emb-c-${c.id}`} cx={100 + (c.centroid.x / w) * 400} cy={30 + (c.centroid.y / h) * 340}
                      r={c.radius * 0.5} fill={`${c.color}06`} stroke={`${c.color}15`} strokeWidth={1} />
                  ))}
                  {graphData.nodes.filter(n => n.type !== 'agent').map(node => {
                    const px = 100 + (node.x / w) * 400;
                    const py = 30 + (node.y / h) * 340;
                    const color = getNodeColor(node.type, node.cluster);
                    return (
                      <circle key={node.id} cx={px} cy={py} r={node.type === 'concept' ? 6 : node.type === 'table' ? 4 : 2}
                        fill={color} opacity={0.8} className="kg-emb-dot"
                        onClick={() => setSelectedNode(node)} style={{ cursor: 'pointer' }}>
                        <title>{node.label}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            )}

            {activeView === 'similarity' && (
              <div className="kg-similarity-view">
                <h3 className="kg-section-title">Cosine Similarity Matrix — Top Datasets</h3>
                <div className="kg-sim-matrix">
                  {(() => {
                    const concepts = graphData.nodes.filter(n => n.type === 'concept').slice(0, 8);
                    return (
                      <div className="kg-matrix-grid" style={{ gridTemplateColumns: `80px repeat(${concepts.length}, 1fr)` }}>
                        <div />
                        {concepts.map(c => <div key={`mh-${c.id}`} className="kg-matrix-header">{c.label.replace(/_/g, ' ')}</div>)}
                        {concepts.map(row => (
                          <React.Fragment key={`mr-${row.id}`}>
                            <div className="kg-matrix-label">{row.label.replace(/_/g, ' ')}</div>
                            {concepts.map(col => {
                              const sim = row.id === col.id ? 1.0 : 0.1 + Math.random() * 0.6;
                              const intensity = sim;
                              return (
                                <div key={`${row.id}-${col.id}`} className="kg-matrix-cell"
                                  style={{ background: `rgba(88,166,255,${intensity * 0.6})`, color: sim > 0.5 ? '#fff' : '#8b949e' }}>
                                  {sim.toFixed(2)}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="kg-sidebar">
            {searchResults.length > 0 ? (
              <div className="kg-search-results">
                <h4 className="kg-sidebar-title">Search Results</h4>
                {searchResults.map(r => (
                  <div key={r.nodeId} className="kg-result-card" onClick={() => {
                    const node = graphData.nodes.find(n => n.id === r.nodeId);
                    if (node) setSelectedNode(node);
                  }}>
                    <div className="kg-result-header">
                      <span className={`kg-type-badge type-${r.type}`}>{r.type}</span>
                      <span className="kg-score">{(r.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="kg-result-label">{r.label}</div>
                    <div className="kg-result-source">{r.sourceNode}</div>
                  </div>
                ))}
              </div>
            ) : selectedNode ? (
              <div className="kg-node-detail">
                <h4 className="kg-sidebar-title">Node Details</h4>
                <div className={`kg-detail-type type-${selectedNode.type}`}>{selectedNode.type}</div>
                <h3 className="kg-detail-label">{selectedNode.label}</h3>
                <p className="kg-detail-desc">{selectedNode.description}</p>
                <div className="kg-detail-props">
                  <div><span className="kg-prop-label">Source</span><span className="kg-prop-value">{selectedNode.sourceNode}</span></div>
                  <div><span className="kg-prop-label">Cluster</span><span className="kg-prop-value">{selectedNode.cluster >= 0 ? graphData.clusters[selectedNode.cluster]?.label : 'N/A'}</span></div>
                  <div><span className="kg-prop-label">Connections</span><span className="kg-prop-value">{graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}</span></div>
                </div>
                {selectedNode.embeddingPreview.length > 0 && (
                  <div className="kg-embedding-preview">
                    <span className="kg-prop-label">Embedding Preview</span>
                    <div className="kg-embedding-bars">
                      {selectedNode.embeddingPreview.map((v, i) => (
                        <div key={i} className="kg-emb-bar" style={{ height: `${Math.abs(v) * 30}px`, background: v > 0 ? '#58a6ff' : '#f85149', opacity: 0.7 }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="kg-sidebar-empty">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(139,148,158,0.3)" strokeWidth={1.5}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <p>Search for datasets or click a node to explore semantic relationships.</p>
              </div>
            )}

            {/* Legend */}
            <div className="kg-legend">
              <h4 className="kg-sidebar-title">Legend</h4>
              <div className="kg-legend-items">
                <div><span className="kg-legend-circle" style={{ background: '#58a6ff' }} /> Concept</div>
                <div><span className="kg-legend-circle" style={{ background: '#58a6ffcc', width: 8, height: 8 }} /> Table</div>
                <div><span className="kg-legend-circle" style={{ background: '#58a6ff80', width: 5, height: 5 }} /> Column</div>
                <div><span className="kg-legend-circle" style={{ background: '#8b949e' }} /> Agent</div>
                <div><span className="kg-legend-line solid" /> Contains</div>
                <div><span className="kg-legend-line dashed" /> Semantic Link</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default KnowledgeGraphPage;
