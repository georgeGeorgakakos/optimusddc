// ==============================================================================
// FILE: SwarmBenchmarkPage/index.tsx
// SWARM BENCHMARK & STRESS TEST PANEL
// Configure workload profiles, run benchmarks, real-time throughput/latency
// visualization, resource utilization under load, historical comparisons
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface BenchmarkConfig {
  workloadType: 'read-heavy' | 'write-heavy' | 'mixed' | 'burst' | 'scan' | 'semantic-search';
  concurrency: number;
  duration: number; // seconds
  recordSize: number; // bytes
  targetAgents: string[];
  distribution: 'uniform' | 'zipfian' | 'hotspot';
}

interface BenchmarkResult {
  id: string;
  config: BenchmarkConfig;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: string;
  completedAt: string | null;
  progress: number; // 0-100
  // Metrics
  totalOps: number;
  throughputOpsPerSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  errorRate: number;
  // Time series (for charts)
  throughputSeries: number[];
  latencySeries: number[];
  errorSeries: number[];
  // Per-agent breakdown
  agentMetrics: { agent: string; ops: number; avgLatMs: number; errRate: number; cpuPeak: number; memPeakMB: number }[];
}

interface BenchmarkHistoryEntry {
  id: string;
  workload: string;
  concurrency: number;
  duration: number;
  throughput: number;
  avgLatency: number;
  p99Latency: number;
  errorRate: number;
  timestamp: string;
  agents: number;
}

// ==============================================================================
// MOCK DATA
// ==============================================================================

function generateTimeSeries(length: number, base: number, variance: number): number[] {
  const series: number[] = [];
  let val = base;
  for (let i = 0; i < length; i++) {
    val = Math.max(0, val + (Math.random() - 0.5) * variance);
    series.push(Math.round(val * 10) / 10);
  }
  return series;
}

function generateBenchmarkResult(config: BenchmarkConfig, apiNodes: OptimusDBNode[]): BenchmarkResult {
  const baseThroughput = config.workloadType === 'read-heavy' ? 5000 : config.workloadType === 'write-heavy' ? 2000 : config.workloadType === 'burst' ? 8000 : config.workloadType === 'semantic-search' ? 500 : 3000;
  const baseLatency = config.workloadType === 'read-heavy' ? 5 : config.workloadType === 'write-heavy' ? 15 : config.workloadType === 'semantic-search' ? 45 : 10;
  const throughput = baseThroughput * (config.concurrency / 10) * (0.8 + Math.random() * 0.4);
  const avgLat = baseLatency * (1 + config.concurrency / 50) * (0.7 + Math.random() * 0.6);

  const targetAgents = config.targetAgents.length > 0 ? config.targetAgents : apiNodes.map(n => n.name);
  const seriesLen = Math.min(config.duration, 60);

  return {
    id: `bench-${Date.now()}`,
    config,
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - config.duration * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    progress: 100,
    totalOps: Math.floor(throughput * config.duration),
    throughputOpsPerSec: Math.round(throughput),
    avgLatencyMs: Math.round(avgLat * 10) / 10,
    p50LatencyMs: Math.round(avgLat * 0.8 * 10) / 10,
    p95LatencyMs: Math.round(avgLat * 2.5 * 10) / 10,
    p99LatencyMs: Math.round(avgLat * 5 * 10) / 10,
    maxLatencyMs: Math.round(avgLat * 12 * 10) / 10,
    errorRate: Math.round(Math.random() * 2 * 100) / 100,
    throughputSeries: generateTimeSeries(seriesLen, throughput, throughput * 0.15),
    latencySeries: generateTimeSeries(seriesLen, avgLat, avgLat * 0.3),
    errorSeries: generateTimeSeries(seriesLen, Math.random() * 2, 1),
    agentMetrics: targetAgents.map(agent => ({
      agent,
      ops: Math.floor(throughput * config.duration / targetAgents.length * (0.8 + Math.random() * 0.4)),
      avgLatMs: Math.round(avgLat * (0.7 + Math.random() * 0.6) * 10) / 10,
      errRate: Math.round(Math.random() * 3 * 100) / 100,
      cpuPeak: Math.round((30 + Math.random() * 50) * 10) / 10,
      memPeakMB: Math.floor(300 + Math.random() * 1200),
    })),
  };
}

function generateHistory(): BenchmarkHistoryEntry[] {
  const workloads = ['read-heavy', 'write-heavy', 'mixed', 'burst', 'semantic-search'];
  return Array.from({ length: 10 }, (_, i) => ({
    id: `hist-${i}`,
    workload: workloads[i % workloads.length],
    concurrency: [10, 20, 50, 100, 200][i % 5],
    duration: [30, 60, 120, 300, 60][i % 5],
    throughput: Math.floor(1000 + Math.random() * 8000),
    avgLatency: Math.round((5 + Math.random() * 40) * 10) / 10,
    p99Latency: Math.round((20 + Math.random() * 200) * 10) / 10,
    errorRate: Math.round(Math.random() * 5 * 100) / 100,
    timestamp: new Date(Date.now() - i * 86400000 - Math.random() * 43200000).toISOString(),
    agents: 3 + Math.floor(Math.random() * 4),
  }));
}

// ==============================================================================
// MINI CHART (inline sparkline)
// ==============================================================================

const Sparkline: React.FC<{ data: number[]; color: string; height?: number; width?: number }> = ({ data, color, height = 50, width = 300 }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');

  return (
    <svg width={width} height={height} className="sb-sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {/* Area fill */}
      <polygon points={`${points} ${width},${height} 0,${height}`} fill={`${color}15`} />
    </svg>
  );
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const SwarmBenchmarkPage: React.FC = () => {
  const [resolvedNodes, setResolvedNodes] = useState<OptimusDBNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'configure' | 'results' | 'history'>('configure');

  // Config state
  const [config, setConfig] = useState<BenchmarkConfig>({
    workloadType: 'mixed',
    concurrency: 20,
    duration: 60,
    recordSize: 512,
    targetAgents: [],
    distribution: 'uniform',
  });

  // Results
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [history, setHistory] = useState<BenchmarkHistoryEntry[]>([]);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(apiNodes => {
      if (cancelled) return;
      setResolvedNodes(apiNodes);
      setHistory(generateHistory());
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const runBenchmark = useCallback(() => {
    setIsRunning(true);
    setRunProgress(0);
    setActiveView('results');
    setCurrentResult(null);

    let progress = 0;
    progressRef.current = setInterval(() => {
      progress += 100 / config.duration;
      if (progress >= 100) {
        progress = 100;
        if (progressRef.current) clearInterval(progressRef.current);
        // Generate result
        const result = generateBenchmarkResult(config, resolvedNodes);
        setCurrentResult(result);
        setIsRunning(false);
        // Add to history
        setHistory(prev => [{
          id: result.id, workload: config.workloadType, concurrency: config.concurrency,
          duration: config.duration, throughput: result.throughputOpsPerSec, avgLatency: result.avgLatencyMs,
          p99Latency: result.p99LatencyMs, errorRate: result.errorRate,
          timestamp: new Date().toISOString(), agents: result.agentMetrics.length,
        }, ...prev]);
      }
      setRunProgress(Math.min(progress, 100));
    }, 1000);

    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [config, resolvedNodes]);

  const cancelBenchmark = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setIsRunning(false);
    setRunProgress(0);
  }, []);

  if (isLoading) {
    return (
      <DocumentTitle title="Benchmark - OptimusDDC">
        <main className="sb-page"><div className="sb-loading"><div className="sb-spinner" /><p>Initializing benchmark engine…</p></div></main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Benchmark - OptimusDDC">
      <main className="sb-page">
        <header className="sb-header">
          <div className="sb-header-left">
            <div className="sb-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h1 className="sb-title">Swarm Benchmark & Stress Test</h1>
              <p className="sb-subtitle">Performance Profiling · Load Testing · Capacity Planning</p>
            </div>
          </div>
          <div className="sb-header-right">
            {isRunning && <span className="sb-running-badge"><span className="sb-running-dot" /> Running… {Math.round(runProgress)}%</span>}
          </div>
        </header>

        {/* Tabs */}
        <div className="sb-tabs">
          {(['configure', 'results', 'history'] as const).map(v => (
            <button key={v} className={`sb-tab ${activeView === v ? 'active' : ''}`} onClick={() => setActiveView(v)}>
              {v === 'configure' ? '⚙️ Configure' : v === 'results' ? '📊 Results' : '📋 History'}
            </button>
          ))}
        </div>

        <div className="sb-content">
          {/* CONFIGURE TAB */}
          {activeView === 'configure' && (
            <div className="sb-configure">
              <div className="sb-config-grid">
                {/* Workload Type */}
                <div className="sb-config-card">
                  <h4>Workload Profile</h4>
                  <div className="sb-workload-options">
                    {(['read-heavy', 'write-heavy', 'mixed', 'burst', 'scan', 'semantic-search'] as const).map(w => (
                      <button key={w} className={`sb-workload-btn ${config.workloadType === w ? 'active' : ''}`} onClick={() => setConfig(prev => ({ ...prev, workloadType: w }))}>
                        <span className="sb-wl-icon">{w === 'read-heavy' ? '📖' : w === 'write-heavy' ? '✏️' : w === 'mixed' ? '🔀' : w === 'burst' ? '💥' : w === 'scan' ? '📑' : '🔍'}</span>
                        <span className="sb-wl-label">{w.replace('-', ' ')}</span>
                        <span className="sb-wl-desc">{w === 'read-heavy' ? '80% reads, 20% writes' : w === 'write-heavy' ? '20% reads, 80% writes' : w === 'mixed' ? '50/50 read/write' : w === 'burst' ? 'Spike traffic pattern' : w === 'scan' ? 'Full table scans' : 'Vector similarity queries'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameters */}
                <div className="sb-config-card">
                  <h4>Parameters</h4>
                  <div className="sb-param">
                    <label>Concurrency</label>
                    <div className="sb-slider-row">
                      <input type="range" min={1} max={200} value={config.concurrency} onChange={e => setConfig(prev => ({ ...prev, concurrency: Number(e.target.value) }))} />
                      <span className="sb-slider-val">{config.concurrency}</span>
                    </div>
                  </div>
                  <div className="sb-param">
                    <label>Duration (seconds)</label>
                    <div className="sb-slider-row">
                      <input type="range" min={10} max={300} step={10} value={config.duration} onChange={e => setConfig(prev => ({ ...prev, duration: Number(e.target.value) }))} />
                      <span className="sb-slider-val">{config.duration}s</span>
                    </div>
                  </div>
                  <div className="sb-param">
                    <label>Record Size (bytes)</label>
                    <div className="sb-slider-row">
                      <input type="range" min={64} max={8192} step={64} value={config.recordSize} onChange={e => setConfig(prev => ({ ...prev, recordSize: Number(e.target.value) }))} />
                      <span className="sb-slider-val">{config.recordSize}B</span>
                    </div>
                  </div>
                  <div className="sb-param">
                    <label>Distribution</label>
                    <select value={config.distribution} onChange={e => setConfig(prev => ({ ...prev, distribution: e.target.value as any }))}>
                      <option value="uniform">Uniform</option>
                      <option value="zipfian">Zipfian (skewed)</option>
                      <option value="hotspot">Hotspot (90/10)</option>
                    </select>
                  </div>
                </div>

                {/* Target Agents */}
                <div className="sb-config-card">
                  <h4>Target Agents</h4>
                  <p className="sb-hint">Select specific agents or leave empty to target all.</p>
                  <div className="sb-agent-checkboxes">
                    {resolvedNodes.map(node => (
                      <label key={node.name} className="sb-agent-checkbox">
                        <input type="checkbox" checked={config.targetAgents.includes(node.name)} onChange={e => {
                          setConfig(prev => ({
                            ...prev,
                            targetAgents: e.target.checked ? [...prev.targetAgents, node.name] : prev.targetAgents.filter(a => a !== node.name),
                          }));
                        }} />
                        <span>{node.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sb-run-bar">
                <div className="sb-config-summary">
                  <span><strong>{config.workloadType}</strong></span>
                  <span>{config.concurrency} threads</span>
                  <span>{config.duration}s duration</span>
                  <span>{config.recordSize}B records</span>
                  <span>{config.distribution}</span>
                  <span>{config.targetAgents.length || resolvedNodes.length} agents</span>
                </div>
                <button className="sb-run-btn" onClick={runBenchmark} disabled={isRunning}>
                  {isRunning ? '⏳ Running…' : '▶ Run Benchmark'}
                </button>
              </div>
            </div>
          )}

          {/* RESULTS TAB */}
          {activeView === 'results' && (
            <div className="sb-results">
              {isRunning && (
                <div className="sb-progress-section">
                  <div className="sb-progress-header">
                    <span>Running benchmark… {Math.round(runProgress)}%</span>
                    <button className="sb-cancel-btn" onClick={cancelBenchmark}>Cancel</button>
                  </div>
                  <div className="sb-progress-bar"><div className="sb-progress-fill" style={{ width: `${runProgress}%` }} /></div>
                </div>
              )}

              {currentResult && (
                <>
                  {/* Summary Cards */}
                  <div className="sb-summary-grid">
                    <div className="sb-summary-card primary">
                      <span className="sb-sc-value">{currentResult.throughputOpsPerSec.toLocaleString()}</span>
                      <span className="sb-sc-label">ops/sec</span>
                    </div>
                    <div className="sb-summary-card">
                      <span className="sb-sc-value">{currentResult.avgLatencyMs}</span>
                      <span className="sb-sc-label">avg latency (ms)</span>
                    </div>
                    <div className="sb-summary-card">
                      <span className="sb-sc-value">{currentResult.p95LatencyMs}</span>
                      <span className="sb-sc-label">p95 (ms)</span>
                    </div>
                    <div className="sb-summary-card">
                      <span className="sb-sc-value">{currentResult.p99LatencyMs}</span>
                      <span className="sb-sc-label">p99 (ms)</span>
                    </div>
                    <div className="sb-summary-card">
                      <span className="sb-sc-value">{currentResult.totalOps.toLocaleString()}</span>
                      <span className="sb-sc-label">total ops</span>
                    </div>
                    <div className={`sb-summary-card ${currentResult.errorRate > 2 ? 'warn' : ''}`}>
                      <span className="sb-sc-value">{currentResult.errorRate}%</span>
                      <span className="sb-sc-label">error rate</span>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="sb-charts">
                    <div className="sb-chart-card">
                      <h4>Throughput (ops/sec)</h4>
                      <Sparkline data={currentResult.throughputSeries} color="#3fb950" height={80} width={500} />
                    </div>
                    <div className="sb-chart-card">
                      <h4>Latency (ms)</h4>
                      <Sparkline data={currentResult.latencySeries} color="#58a6ff" height={80} width={500} />
                    </div>
                  </div>

                  {/* Per-Agent Breakdown */}
                  <div className="sb-agent-breakdown">
                    <h4>Per-Agent Breakdown</h4>
                    <table className="sb-agent-table">
                      <thead><tr><th>Agent</th><th>Operations</th><th>Avg Latency</th><th>Error Rate</th><th>CPU Peak</th><th>Mem Peak</th></tr></thead>
                      <tbody>
                        {currentResult.agentMetrics.map(am => (
                          <tr key={am.agent}>
                            <td className="sb-mono">{am.agent}</td>
                            <td>{am.ops.toLocaleString()}</td>
                            <td>{am.avgLatMs}ms</td>
                            <td className={am.errRate > 3 ? 'sb-warn' : ''}>{am.errRate}%</td>
                            <td className={am.cpuPeak > 80 ? 'sb-warn' : ''}>{am.cpuPeak}%</td>
                            <td>{(am.memPeakMB / 1024).toFixed(1)}GB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Latency Distribution */}
                  <div className="sb-latency-dist">
                    <h4>Latency Distribution</h4>
                    <div className="sb-percentiles">
                      {[
                        { label: 'p50', value: currentResult.p50LatencyMs },
                        { label: 'p95', value: currentResult.p95LatencyMs },
                        { label: 'p99', value: currentResult.p99LatencyMs },
                        { label: 'max', value: currentResult.maxLatencyMs },
                      ].map(p => (
                        <div key={p.label} className="sb-pct-bar">
                          <span className="sb-pct-label">{p.label}</span>
                          <div className="sb-pct-track">
                            <div className="sb-pct-fill" style={{ width: `${Math.min((p.value / currentResult.maxLatencyMs) * 100, 100)}%` }} />
                          </div>
                          <span className="sb-pct-value">{p.value}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!isRunning && !currentResult && (
                <div className="sb-results-empty">
                  <p>No benchmark results yet. Configure a workload and run a benchmark to see results here.</p>
                  <button className="sb-run-btn" onClick={() => setActiveView('configure')}>⚙️ Configure Benchmark</button>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeView === 'history' && (
            <div className="sb-history">
              <h3 className="sb-section-title">Benchmark History</h3>
              <table className="sb-history-table">
                <thead><tr><th>Date</th><th>Workload</th><th>Concurrency</th><th>Duration</th><th>Throughput</th><th>Avg Latency</th><th>p99</th><th>Errors</th><th>Agents</th></tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="sb-td-time">{new Date(h.timestamp).toLocaleString()}</td>
                      <td><span className={`sb-wl-tag wl-${h.workload}`}>{h.workload}</span></td>
                      <td>{h.concurrency}</td>
                      <td>{h.duration}s</td>
                      <td className="sb-mono">{h.throughput.toLocaleString()} ops/s</td>
                      <td>{h.avgLatency}ms</td>
                      <td className={h.p99Latency > 100 ? 'sb-warn' : ''}>{h.p99Latency}ms</td>
                      <td className={h.errorRate > 2 ? 'sb-warn' : ''}>{h.errorRate}%</td>
                      <td>{h.agents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </DocumentTitle>
  );
};

export default SwarmBenchmarkPage;
