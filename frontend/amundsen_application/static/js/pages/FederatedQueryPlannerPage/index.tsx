// ==============================================================================
// FILE: FederatedQueryPlannerPage/index.tsx
// FEDERATED QUERY PLANNER & VISUALIZER
// Visual query execution plan, cost estimation, data movement arrows, optimizer
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface PlanNode {
  id: string;
  type: 'SCAN' | 'FILTER' | 'JOIN' | 'AGGREGATE' | 'SORT' | 'PROJECT' | 'SHUFFLE' | 'COLLECT' | 'BROADCAST';
  label: string;
  agent: string;
  estimatedRows: number;
  estimatedCost: number;
  actualRows?: number;
  actualTimeMs?: number;
  children: string[];
  depth: number;
  x: number;
  y: number;
  dataMovement?: { from: string; to: string; bytes: number };
}

interface QueryPlan {
  id: string;
  query: string;
  totalCost: number;
  estimatedTimeMs: number;
  actualTimeMs?: number;
  nodes: PlanNode[];
  agentsInvolved: string[];
  dataMovedBytes: number;
  optimizerHints: string[];
}

interface OptimizerSuggestion {
  id: string;
  type: 'INDEX' | 'PARTITION' | 'CACHE' | 'REWRITE' | 'ROUTING';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  estimatedImprovement: string;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

const SAMPLE_QUERIES = [
  `SELECT s.device_id, AVG(s.value) as avg_reading, COUNT(*) as total\nFROM sensor_readings s\nJOIN device_config d ON s.device_id = d.id\nWHERE s.timestamp > '2026-01-01'\nGROUP BY s.device_id\nORDER BY avg_reading DESC\nLIMIT 100`,
  `SELECT k.topic, k.content, k.embedding_similarity\nFROM knowledge_base k\nWHERE k.embedding <-> $query_vector < 0.3\nORDER BY k.embedding <-> $query_vector\nLIMIT 20`,
  `SELECT node_id, COUNT(DISTINCT table_name) as tables,\n  SUM(row_count) as total_rows\nFROM swarmkb.catalog_metadata\nGROUP BY node_id`,
];

function generateQueryPlan(queryIdx: number, apiNodes: OptimusDBNode[]): QueryPlan {
  const usedAgents = apiNodes.slice(0, Math.min(4, apiNodes.length));

  const plans: PlanNode[][] = [
    // Plan for query 0: complex join+aggregate
    [
      { id: 'p1', type: 'COLLECT', label: 'Collect Results', agent: usedAgents[0]?.name || 'coordinator', estimatedRows: 100, estimatedCost: 5, children: ['p2'], depth: 0, x: 350, y: 40 },
      { id: 'p2', type: 'SORT', label: 'Sort by avg_reading DESC', agent: usedAgents[0]?.name || 'coordinator', estimatedRows: 100, estimatedCost: 15, children: ['p3'], depth: 1, x: 350, y: 120 },
      { id: 'p3', type: 'AGGREGATE', label: 'GROUP BY device_id\nAVG(value), COUNT(*)', agent: usedAgents[0]?.name || 'coordinator', estimatedRows: 500, estimatedCost: 45, children: ['p4'], depth: 2, x: 350, y: 200 },
      { id: 'p4', type: 'SHUFFLE', label: 'Redistribute by device_id', agent: 'network', estimatedRows: 12000, estimatedCost: 80, children: ['p5', 'p6'], depth: 3, x: 350, y: 280, dataMovement: { from: usedAgents[1]?.name || 'db2', to: usedAgents[0]?.name || 'db1', bytes: 2400000 } },
      { id: 'p5', type: 'JOIN', label: 'Hash Join\nsensor_readings ⋈ device_config', agent: usedAgents[0]?.name || 'db1', estimatedRows: 6000, estimatedCost: 120, children: ['p7', 'p8'], depth: 4, x: 200, y: 360 },
      { id: 'p6', type: 'JOIN', label: 'Hash Join\nsensor_readings ⋈ device_config', agent: usedAgents[1]?.name || 'db2', estimatedRows: 6000, estimatedCost: 120, children: ['p9', 'p10'], depth: 4, x: 500, y: 360 },
      { id: 'p7', type: 'SCAN', label: 'Scan sensor_readings\nWHERE timestamp > 2026-01-01', agent: usedAgents[0]?.name || 'db1', estimatedRows: 8000, estimatedCost: 200, children: [], depth: 5, x: 120, y: 440 },
      { id: 'p8', type: 'BROADCAST', label: 'Broadcast device_config', agent: usedAgents[0]?.name || 'db1', estimatedRows: 200, estimatedCost: 10, children: [], depth: 5, x: 280, y: 440 },
      { id: 'p9', type: 'SCAN', label: 'Scan sensor_readings\nWHERE timestamp > 2026-01-01', agent: usedAgents[1]?.name || 'db2', estimatedRows: 8000, estimatedCost: 200, children: [], depth: 5, x: 420, y: 440 },
      { id: 'p10', type: 'BROADCAST', label: 'Broadcast device_config', agent: usedAgents[1]?.name || 'db2', estimatedRows: 200, estimatedCost: 10, children: [], depth: 5, x: 580, y: 440 },
    ],
    // Plan for query 1: vector search
    [
      { id: 'p1', type: 'COLLECT', label: 'Merge & Re-rank', agent: usedAgents[0]?.name || 'coordinator', estimatedRows: 20, estimatedCost: 3, children: ['p2', 'p3'], depth: 0, x: 350, y: 40 },
      { id: 'p2', type: 'SORT', label: 'Sort by embedding distance', agent: usedAgents[0]?.name || 'db1', estimatedRows: 20, estimatedCost: 5, children: ['p4'], depth: 1, x: 200, y: 140 },
      { id: 'p3', type: 'SORT', label: 'Sort by embedding distance', agent: usedAgents[1]?.name || 'db2', estimatedRows: 20, estimatedCost: 5, children: ['p5'], depth: 1, x: 500, y: 140 },
      { id: 'p4', type: 'FILTER', label: 'vec0 ANN Search\ndistance < 0.3', agent: usedAgents[0]?.name || 'db1', estimatedRows: 50, estimatedCost: 30, children: ['p6'], depth: 2, x: 200, y: 240 },
      { id: 'p5', type: 'FILTER', label: 'vec0 ANN Search\ndistance < 0.3', agent: usedAgents[1]?.name || 'db2', estimatedRows: 50, estimatedCost: 30, children: ['p7'], depth: 2, x: 500, y: 240 },
      { id: 'p6', type: 'SCAN', label: 'Scan knowledge_base\n(sqlite-vec index)', agent: usedAgents[0]?.name || 'db1', estimatedRows: 5000, estimatedCost: 15, children: [], depth: 3, x: 200, y: 340 },
      { id: 'p7', type: 'SCAN', label: 'Scan knowledge_base\n(sqlite-vec index)', agent: usedAgents[1]?.name || 'db2', estimatedRows: 5000, estimatedCost: 15, children: [], depth: 3, x: 500, y: 340 },
    ],
    // Plan for query 2: simple aggregate
    [
      { id: 'p1', type: 'COLLECT', label: 'Final Aggregation', agent: usedAgents[0]?.name || 'coordinator', estimatedRows: apiNodes.length, estimatedCost: 2, children: ['p2', 'p3', 'p4'], depth: 0, x: 350, y: 60 },
      { id: 'p2', type: 'AGGREGATE', label: 'Local GROUP BY node_id', agent: usedAgents[0]?.name || 'db1', estimatedRows: 1, estimatedCost: 8, children: ['p5'], depth: 1, x: 150, y: 180 },
      { id: 'p3', type: 'AGGREGATE', label: 'Local GROUP BY node_id', agent: usedAgents[1]?.name || 'db2', estimatedRows: 1, estimatedCost: 8, children: ['p6'], depth: 1, x: 350, y: 180 },
      { id: 'p4', type: 'AGGREGATE', label: 'Local GROUP BY node_id', agent: usedAgents[2]?.name || 'db3', estimatedRows: 1, estimatedCost: 8, children: ['p7'], depth: 1, x: 550, y: 180 },
      { id: 'p5', type: 'SCAN', label: 'Scan catalog_metadata', agent: usedAgents[0]?.name || 'db1', estimatedRows: 50, estimatedCost: 12, children: [], depth: 2, x: 150, y: 300 },
      { id: 'p6', type: 'SCAN', label: 'Scan catalog_metadata', agent: usedAgents[1]?.name || 'db2', estimatedRows: 50, estimatedCost: 12, children: [], depth: 2, x: 350, y: 300 },
      { id: 'p7', type: 'SCAN', label: 'Scan catalog_metadata', agent: usedAgents[2]?.name || 'db3', estimatedRows: 50, estimatedCost: 12, children: [], depth: 2, x: 550, y: 300 },
    ],
  ];

  const selectedPlan = plans[queryIdx % plans.length];
  const totalCost = selectedPlan.reduce((s, n) => s + n.estimatedCost, 0);

  const suggestions: OptimizerSuggestion[] = [
    { id: 's1', type: 'INDEX', severity: 'warning', title: 'Missing index on timestamp', description: 'Creating an index on sensor_readings.timestamp could reduce scan cost by 60%.', estimatedImprovement: '~60% faster scans' },
    { id: 's2', type: 'PARTITION', severity: 'info', title: 'Consider hash partitioning', description: 'Hash-partitioning sensor_readings by device_id would eliminate the shuffle step.', estimatedImprovement: 'Eliminate 80 cost units' },
    { id: 's3', type: 'CACHE', severity: 'info', title: 'Cache device_config', description: 'device_config is small and static. Broadcasting it adds unnecessary network overhead.', estimatedImprovement: '~20ms savings' },
    { id: 's4', type: 'ROUTING', severity: 'critical', title: 'Unbalanced data distribution', description: 'Node db1 holds 70% of sensor data. Consider rebalancing across agents.', estimatedImprovement: '~40% better parallelism' },
  ];

  return {
    id: `plan-${queryIdx}`,
    query: SAMPLE_QUERIES[queryIdx % SAMPLE_QUERIES.length],
    totalCost,
    estimatedTimeMs: totalCost * 2 + 50,
    nodes: selectedPlan,
    agentsInvolved: [...new Set(selectedPlan.map(n => n.agent).filter(a => a !== 'network'))],
    dataMovedBytes: selectedPlan.reduce((s, n) => s + (n.dataMovement?.bytes || 0), 0),
    optimizerHints: suggestions.map(s => s.title),
  };
}

// ==============================================================================
// PLAN TREE SVG
// ==============================================================================

const PlanTreeSVG: React.FC<{ plan: QueryPlan; selectedPlanNode: string | null; onSelectNode: (id: string | null) => void }> = ({ plan, selectedPlanNode, onSelectNode }) => {
  const w = 700, h = 500;
  const maxCost = Math.max(...plan.nodes.map(n => n.estimatedCost));

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { SCAN: '#58a6ff', FILTER: '#d29922', JOIN: '#f85149', AGGREGATE: '#3fb950', SORT: '#bc8cff', PROJECT: '#79c0ff', SHUFFLE: '#f0883e', COLLECT: '#a5d6ff', BROADCAST: '#8b949e' };
    return colors[type] || '#8b949e';
  };

  return (
    <svg className="fqp-plan-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {/* Edges */}
      {plan.nodes.map(node =>
        node.children.map(childId => {
          const child = plan.nodes.find(n => n.id === childId);
          if (!child) return null;
          const isShuffle = node.type === 'SHUFFLE' || node.dataMovement;
          return (
            <g key={`${node.id}-${childId}`}>
              <line x1={node.x} y1={node.y + 20} x2={child.x} y2={child.y - 20}
                stroke={isShuffle ? 'rgba(240,136,62,0.5)' : 'rgba(56,139,253,0.2)'} strokeWidth={isShuffle ? 2 : 1}
                strokeDasharray={isShuffle ? '6,3' : 'none'} />
              {/* Arrow head */}
              <polygon
                points={`${child.x},${child.y - 20} ${child.x - 4},${child.y - 26} ${child.x + 4},${child.y - 26}`}
                fill={isShuffle ? 'rgba(240,136,62,0.5)' : 'rgba(56,139,253,0.3)'} />
            </g>
          );
        })
      )}

      {/* Nodes */}
      {plan.nodes.map(node => {
        const isSelected = selectedPlanNode === node.id;
        const color = getTypeColor(node.type);
        const costRatio = node.estimatedCost / maxCost;
        const barWidth = 60 * costRatio;

        return (
          <g key={node.id} className="fqp-plan-node" onClick={() => onSelectNode(isSelected ? null : node.id)} style={{ cursor: 'pointer' }}>
            {/* Background rect */}
            <rect x={node.x - 55} y={node.y - 18} width={110} height={36} rx={6} ry={6}
              fill={isSelected ? 'rgba(56,139,253,0.15)' : '#161b22'} stroke={isSelected ? '#58a6ff' : '#30363d'} strokeWidth={isSelected ? 2 : 1} />
            {/* Type badge */}
            <rect x={node.x - 50} y={node.y - 14} width={40} height={14} rx={3} fill={`${color}25`} />
            <text x={node.x - 30} y={node.y - 4} textAnchor="middle" fill={color} fontSize={7} fontWeight="700" fontFamily="monospace">{node.type}</text>
            {/* Row estimate */}
            <text x={node.x + 10} y={node.y - 3} fill="#8b949e" fontSize={7} fontFamily="monospace">{node.estimatedRows.toLocaleString()} rows</text>
            {/* Cost bar */}
            <rect x={node.x - 50} y={node.y + 5} width={barWidth} height={4} rx={2} fill={color} opacity={0.6} />
            <text x={node.x - 50 + barWidth + 4} y={node.y + 10} fill="#484f58" fontSize={6} fontFamily="monospace">{node.estimatedCost}</text>
            {/* Agent label */}
            <text x={node.x} y={node.y + 28} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">{node.agent}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const FederatedQueryPlannerPage: React.FC = () => {
  const [selectedQueryIdx, setSelectedQueryIdx] = useState(0);
  const [queryPlan, setQueryPlan] = useState<QueryPlan | null>(null);
  const [selectedPlanNode, setSelectedPlanNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customQuery, setCustomQuery] = useState('');
  const [resolvedNodes, setResolvedNodes] = useState<OptimusDBNode[]>([]);

  // Resolve nodes once
  useEffect(() => {
    getAvailableNodes().then(n => setResolvedNodes(n));
  }, []);

  // Generate plan when query or nodes change
  useEffect(() => {
    if (resolvedNodes.length === 0) return;
    setIsLoading(true);
    const timer = setTimeout(() => {
      setQueryPlan(generateQueryPlan(selectedQueryIdx, resolvedNodes));
      setSelectedPlanNode(null);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedQueryIdx, resolvedNodes]);

  const selectedNodeData = useMemo(() => queryPlan?.nodes.find(n => n.id === selectedPlanNode), [queryPlan, selectedPlanNode]);

  const suggestions: OptimizerSuggestion[] = useMemo(() => [
    { id: 's1', type: 'INDEX', severity: 'warning', title: 'Missing index on timestamp', description: 'Creating an index on sensor_readings.timestamp could reduce scan cost by 60%.', estimatedImprovement: '~60% faster scans' },
    { id: 's2', type: 'PARTITION', severity: 'info', title: 'Consider hash partitioning', description: 'Hash-partitioning by device_id would eliminate the shuffle step.', estimatedImprovement: 'Eliminate shuffle cost' },
    { id: 's3', type: 'CACHE', severity: 'info', title: 'Cache small lookup tables', description: 'device_config is small and static. Cache it locally on all agents.', estimatedImprovement: '~20ms savings' },
    { id: 's4', type: 'ROUTING', severity: 'critical', title: 'Unbalanced data distribution', description: 'Consider rebalancing sensor data across agents for better parallelism.', estimatedImprovement: '~40% better throughput' },
  ], []);

  return (
    <DocumentTitle title="Federated Query Planner - OptimusDDC">
      <main className="fqp-page">
        <header className="fqp-header">
          <div className="fqp-header-left">
            <div className="fqp-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><line x1="12" y1="22" x2="12" y2="15.5" /><polyline points="22 8.5 12 15.5 2 8.5" />
              </svg>
            </div>
            <div>
              <h1 className="fqp-title">Federated Query Planner</h1>
              <p className="fqp-subtitle">Distributed Execution Plans · Cost Estimation · Optimizer Suggestions</p>
            </div>
          </div>
        </header>

        {/* Query Selector */}
        <div className="fqp-query-bar">
          <div className="fqp-query-tabs">
            {SAMPLE_QUERIES.map((_, i) => (
              <button key={i} className={`fqp-query-tab ${selectedQueryIdx === i ? 'active' : ''}`} onClick={() => setSelectedQueryIdx(i)}>
                Query {i + 1}
              </button>
            ))}
          </div>
          <div className="fqp-query-display">
            <pre className="fqp-query-text">{SAMPLE_QUERIES[selectedQueryIdx]}</pre>
          </div>
        </div>

        {queryPlan && !isLoading ? (
          <div className="fqp-layout">
            {/* Plan Stats */}
            <div className="fqp-plan-stats">
              <div className="fqp-pstat"><span className="fqp-pstat-v">{queryPlan.totalCost}</span><span className="fqp-pstat-l">Total Cost</span></div>
              <div className="fqp-pstat"><span className="fqp-pstat-v">{queryPlan.estimatedTimeMs}ms</span><span className="fqp-pstat-l">Est. Time</span></div>
              <div className="fqp-pstat"><span className="fqp-pstat-v">{queryPlan.agentsInvolved.length}</span><span className="fqp-pstat-l">Agents</span></div>
              <div className="fqp-pstat"><span className="fqp-pstat-v">{queryPlan.nodes.length}</span><span className="fqp-pstat-l">Plan Steps</span></div>
              <div className="fqp-pstat"><span className="fqp-pstat-v">{(queryPlan.dataMovedBytes / 1024 / 1024).toFixed(1)}MB</span><span className="fqp-pstat-l">Data Moved</span></div>
            </div>

            <div className="fqp-main-grid">
              {/* Plan Tree */}
              <div className="fqp-plan-panel">
                <h3 className="fqp-section-title">Execution Plan Tree</h3>
                <PlanTreeSVG plan={queryPlan} selectedPlanNode={selectedPlanNode} onSelectNode={setSelectedPlanNode} />
              </div>

              {/* Sidebar */}
              <div className="fqp-sidebar">
                {/* Selected Node Detail */}
                {selectedNodeData ? (
                  <div className="fqp-node-detail">
                    <h4 className="fqp-sidebar-title">Step Details</h4>
                    <div className="fqp-nd-type" style={{ color: selectedNodeData.type === 'SCAN' ? '#58a6ff' : selectedNodeData.type === 'JOIN' ? '#f85149' : '#3fb950' }}>{selectedNodeData.type}</div>
                    <pre className="fqp-nd-label">{selectedNodeData.label}</pre>
                    <div className="fqp-nd-props">
                      <div><span>Agent</span><span>{selectedNodeData.agent}</span></div>
                      <div><span>Est. Rows</span><span>{selectedNodeData.estimatedRows.toLocaleString()}</span></div>
                      <div><span>Cost</span><span>{selectedNodeData.estimatedCost}</span></div>
                      <div><span>Children</span><span>{selectedNodeData.children.length}</span></div>
                    </div>
                    {selectedNodeData.dataMovement && (
                      <div className="fqp-data-movement">
                        <span className="fqp-dm-label">Data Movement</span>
                        <div className="fqp-dm-flow">
                          <span>{selectedNodeData.dataMovement.from}</span>
                          <span className="fqp-dm-arrow">→</span>
                          <span>{selectedNodeData.dataMovement.to}</span>
                        </div>
                        <span className="fqp-dm-size">{(selectedNodeData.dataMovement.bytes / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="fqp-sidebar-empty"><p>Click a plan node to inspect execution details.</p></div>
                )}

                {/* Optimizer Suggestions */}
                <div className="fqp-optimizer">
                  <h4 className="fqp-sidebar-title">Optimizer Suggestions</h4>
                  {suggestions.map(s => (
                    <div key={s.id} className={`fqp-suggestion sev-${s.severity}`}>
                      <div className="fqp-sug-header">
                        <span className={`fqp-sug-type type-${s.type.toLowerCase()}`}>{s.type}</span>
                        <span className={`fqp-sev-dot sev-${s.severity}`} />
                      </div>
                      <div className="fqp-sug-title">{s.title}</div>
                      <div className="fqp-sug-desc">{s.description}</div>
                      <div className="fqp-sug-improvement">{s.estimatedImprovement}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fqp-loading"><div className="fqp-loading-spinner" /><p>Generating execution plan…</p></div>
        )}
      </main>
    </DocumentTitle>
  );
};

export default FederatedQueryPlannerPage;
