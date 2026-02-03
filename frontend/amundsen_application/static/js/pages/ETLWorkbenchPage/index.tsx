// ==============================================================================
// FILE: amundsen_application/static/js/pages/ETLWorkbenchPage/index.tsx
// ==============================================================================
// OptimusFlow ETL Workbench - Integrated with SwarmChestrate
// ==============================================================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';
import { buildDynamicApiUrl } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TypeScript Interfaces
// ==============================================================================

export type ETLTab = 'workflow' | 'jobs';

export interface WorkflowNode {
  id: string;
  type: 'source' | 'transform' | 'sink';
  label: string;
  config: any;
  position: { x: number; y: number };
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Array<{ source: string; target: string }>;
}

export interface Job {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  rowsProcessed: number;
  duration: number;
  throughput: number;
  agentNodes: string[];
  startTime: string;
  error?: string;
}

// ==============================================================================
// Mock Data for Development
// ==============================================================================

const MOCK_JOBS: Job[] = [
  {
    id: 'job_001',
    workflowId: 'wf_001',
    workflowName: 'Customer Data Sync',
    status: 'running',
    progress: 65,
    rowsProcessed: 325000,
    duration: 145,
    throughput: 2241,
    agentNodes: ['agent-01', 'agent-02', 'agent-03'],
    startTime: new Date(Date.now() - 145000).toISOString(),
  },
  {
    id: 'job_002',
    workflowId: 'wf_002',
    workflowName: 'Sales Analytics Pipeline',
    status: 'running',
    progress: 35,
    rowsProcessed: 87500,
    duration: 82,
    throughput: 1067,
    agentNodes: ['agent-04', 'agent-05'],
    startTime: new Date(Date.now() - 82000).toISOString(),
  },
  {
    id: 'job_003',
    workflowId: 'wf_003',
    workflowName: 'Product Catalog Update',
    status: 'completed',
    progress: 100,
    rowsProcessed: 125000,
    duration: 187,
    throughput: 668,
    agentNodes: ['agent-01', 'agent-06'],
    startTime: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'job_004',
    workflowId: 'wf_004',
    workflowName: 'Event Stream Processing',
    status: 'failed',
    progress: 42,
    rowsProcessed: 210000,
    duration: 98,
    throughput: 2143,
    agentNodes: ['agent-02', 'agent-07'],
    startTime: new Date(Date.now() - 900000).toISOString(),
    error: 'Connection timeout to target database',
  },
  {
    id: 'job_005',
    workflowId: 'wf_005',
    workflowName: 'Daily Backup Pipeline',
    status: 'completed',
    progress: 100,
    rowsProcessed: 2150000,
    duration: 456,
    throughput: 4715,
    agentNodes: ['agent-01', 'agent-02', 'agent-03', 'agent-04'],
    startTime: new Date(Date.now() - 1800000).toISOString(),
  },
];

const MOCK_NODE_TYPES = {
  sources: [
    { id: 'rdbms_reader', label: 'RDBMS Reader', icon: '🗄️' },
    { id: 'csv_reader', label: 'CSV Reader', icon: '📄' },
    { id: 'api_reader', label: 'API Reader', icon: '🌐' },
    { id: 'kafka_consumer', label: 'Kafka Consumer', icon: '📨' },
  ],
  transforms: [
    { id: 'filter', label: 'Filter', icon: '🔍' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'join', label: 'Join', icon: '🔗' },
    { id: 'aggregate', label: 'Aggregate', icon: '📊' },
  ],
  sinks: [
    { id: 'rdbms_writer', label: 'RDBMS Writer', icon: '💾' },
    { id: 'swarmchestrate_writer', label: 'SwarmChestrate Writer', icon: '🐝' },
    { id: 'csv_writer', label: 'CSV Writer', icon: '📝' },
  ],
};

// ==============================================================================
// Helper Functions
// ==============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toString();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getStatusColor(status: Job['status']): string {
  switch (status) {
    case 'running':
      return '#4ec9b0';
    case 'completed':
      return '#6c9b3f';
    case 'failed':
      return '#e74c3c';
    case 'pending':
      return '#f39c12';
    default:
      return '#95a5a6';
  }
}

// ==============================================================================
// Workflow Builder Component
// ==============================================================================

const WorkflowBuilder: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeCounts, setNodeCounts] = useState({
    sources: 0,
    transforms: 0,
    sinks: 0,
  });

  return (
    <div className="workflow-builder">
      {/* Node Palette */}
      <div className="node-palette">
        <div className="palette-section">
          <h3>Sources</h3>
          {MOCK_NODE_TYPES.sources.map((node) => (
            <div key={node.id} className="palette-node" draggable>
              <span className="node-icon">{node.icon}</span>
              <span className="node-label">{node.label}</span>
            </div>
          ))}
        </div>

        <div className="palette-section">
          <h3>Transforms</h3>
          {MOCK_NODE_TYPES.transforms.map((node) => (
            <div key={node.id} className="palette-node" draggable>
              <span className="node-icon">{node.icon}</span>
              <span className="node-label">{node.label}</span>
            </div>
          ))}
        </div>

        <div className="palette-section">
          <h3>Sinks</h3>
          {MOCK_NODE_TYPES.sinks.map((node) => (
            <div key={node.id} className="palette-node" draggable>
              <span className="node-icon">{node.icon}</span>
              <span className="node-label">{node.label}</span>
            </div>
          ))}
        </div>

        <div className="palette-actions">
          <button className="palette-action-btn">
            <span>📥</span> Import
          </button>
          <button className="palette-action-btn">
            <span>📤</span> Export
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="workflow-canvas">
        <div className="canvas-placeholder">
          <div className="placeholder-icon">⚙️</div>
          <h3>Drag nodes to start building your workflow</h3>
          <p>Connect sources → transforms → sinks to create data pipelines</p>
        </div>

        <div className="canvas-toolbar">
          <button className="canvas-btn primary">
            <span>▶️</span> Execute Pipeline
          </button>
          <button className="canvas-btn">
            <span>💾</span> Save Workflow
          </button>
          <button className="canvas-btn">
            <span>🧪</span> Validate
          </button>
        </div>

        <div className="node-counter">
          <span>Sources: {nodeCounts.sources}</span>
          <span>Transforms: {nodeCounts.transforms}</span>
          <span>Sinks: {nodeCounts.sinks}</span>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="properties-panel">
        {selectedNode ? (
          <>
            <h3>Node Configuration</h3>
            <div className="property-group">
              <label>Node Name</label>
              <input type="text" placeholder="Enter node name" />
            </div>
            <div className="property-group">
              <label>Description</label>
              <textarea placeholder="Enter description" rows={3} />
            </div>
          </>
        ) : (
          <div className="properties-empty">
            <div className="empty-icon">📋</div>
            <p>Select a node to configure its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// Jobs Monitor Component
// ==============================================================================

const JobsMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [filter, setFilter] = useState<Job['status'] | 'all'>('all');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.status === 'running') {
            const newProgress = Math.min(job.progress + Math.random() * 5, 100);
            const newRows =
              job.rowsProcessed + Math.floor(Math.random() * 1000);
            const newDuration = job.duration + 2;
            const newThroughput = Math.floor(newRows / newDuration);

            return {
              ...job,
              progress: Math.floor(newProgress),
              rowsProcessed: newRows,
              duration: newDuration,
              throughput: newThroughput,
              ...(newProgress >= 100 && { status: 'completed' as const }),
            };
          }

          return job;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs =
    filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  return (
    <div className="jobs-monitor">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Jobs</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card running">
          <div className="stat-label">Running</div>
          <div className="stat-value">{stats.running}</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{stats.failed}</div>
        </div>
      </div>

      {/* Job Filters */}
      <div className="job-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Jobs
        </button>
        <button
          className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
          onClick={() => setFilter('running')}
        >
          Running
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          Failed
        </button>

        <div className="filter-actions">
          <button className="action-btn">
            <span>🔄</span> Refresh
          </button>
          <button className="action-btn">
            <span>📊</span> Export
          </button>
        </div>
      </div>

      {/* Job Cards */}
      <div className="job-cards">
        {filteredJobs.map((job) => (
          <div key={job.id} className={`job-card ${job.status}`}>
            <div className="job-header">
              <div className="job-title">
                <h4>{job.workflowName}</h4>
                <span className="job-id">ID: {job.id}</span>
              </div>
              <span className={`status-badge ${job.status}`}>{job.status}</span>
            </div>

            {job.status === 'running' && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${job.progress}%` }}
                />
                <span className="progress-text">{job.progress}%</span>
              </div>
            )}

            {job.error && (
              <div className="job-error">
                <span>⚠️</span> {job.error}
              </div>
            )}

            <div className="job-metrics">
              <div className="metric">
                <span className="metric-label">Rows</span>
                <span className="metric-value">
                  {formatNumber(job.rowsProcessed)}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Duration</span>
                <span className="metric-value">
                  {formatDuration(job.duration)}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Throughput</span>
                <span className="metric-value">
                  {formatNumber(job.throughput)}/s
                </span>
              </div>
            </div>

            <div className="job-agents">
              {job.agentNodes.map((agent) => (
                <span key={agent} className="agent-badge">
                  {agent}
                </span>
              ))}
            </div>

            <div className="job-footer">
              <span className="job-timestamp">
                Started {new Date(job.startTime).toLocaleTimeString()}
              </span>
              <div className="job-actions">
                <button className="job-action-btn">📊 Details</button>
                <button className="job-action-btn">📝 Logs</button>
                {job.status === 'running' ? (
                  <button className="job-action-btn danger">⏹️ Cancel</button>
                ) : job.status === 'failed' ? (
                  <button className="job-action-btn">🔄 Retry</button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================================
// Main ETL Workbench Page
// ==============================================================================

const ETLWorkbenchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ETLTab>('workflow');
  const [clusterOnline, setClusterOnline] = useState(true);
  const [activeJobs, setActiveJobs] = useState(2);

  return (
    <DocumentTitle title="ETL Workbench | OptimusDB">
      <div className="etl-workbench-page">
        {/* Page Header */}
        <div className="workbench-header">
          <div className="header-left">
            <div className="header-icon">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <defs>
                  <linearGradient
                    id="etl-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <rect
                  x="2"
                  y="2"
                  width="28"
                  height="28"
                  rx="6"
                  fill="url(#etl-gradient)"
                />
                <path
                  d="M10 10 L16 16 L10 22 M16 10 L22 16 L16 22"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <h1 className="workbench-title">ETL Workbench</h1>
              <p className="workbench-subtitle">
                Design, execute, and monitor data transformation pipelines
              </p>
            </div>
          </div>

          <div className="header-right">
            <div
              className={`cluster-status ${
                clusterOnline ? 'online' : 'offline'
              }`}
            >
              <span className="status-dot" />
              <span className="status-text">Cluster: 8/8 nodes online</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            <span className="tab-icon">⚙️</span>
            <div className="tab-content">
              <span className="tab-label">Workflow Builder</span>
              <span className="tab-desc">Design ETL pipelines</span>
            </div>
          </button>

          <button
            className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <span className="tab-icon">📊</span>
            <div className="tab-content">
              <span className="tab-label">Jobs Monitor</span>
              <span className="tab-desc">Track pipeline execution</span>
            </div>
            {activeJobs > 0 && <span className="tab-badge">{activeJobs}</span>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content-area">
          {activeTab === 'workflow' ? <WorkflowBuilder /> : <JobsMonitor />}
        </div>
      </div>
    </DocumentTitle>
  );
};

export default ETLWorkbenchPage;
