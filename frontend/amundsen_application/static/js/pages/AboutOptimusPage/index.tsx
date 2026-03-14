// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// About — Optimus Stack: OptimusDB + OptimusDDC

import * as React from 'react';
import './styles.scss';

const DB_COMPONENTS = [
  { name: 'LibP2P',     role: 'P2P Networking layer — peer discovery, transport, multiplexing', color: '#38bdf8' },
  { name: 'OrbitDB',    role: 'CRDT-based distributed key-value and document stores', color: '#7c3aed' },
  { name: 'GossipSub',  role: 'Pub/Sub messaging protocol for swarm-wide event propagation', color: '#0d9488' },
  { name: 'Raft',       role: 'Consensus algorithm for leader election and split-brain prevention', color: '#d97706' },
  { name: 'SQLite',     role: 'Local relational store with WAL for query workbench support', color: '#6366f1' },
  { name: 'TinyLlama',  role: 'On-device LLM for AI-generated metadata tagging and semantic search', color: '#ec4899' },
];

const DDC_DASHBOARDS = [
  { name: 'Cluster Overview',      icon: '🏠', desc: 'Agent inventory, health monitor, swarm operations, real-time activity feed' },
  { name: 'Agents Topology',       icon: '🕸', desc: 'Visualise swarm mesh connections, peer relationships, and replication paths' },
  { name: 'Query Workbench',        icon: '⌨', desc: 'Execute federated SQL queries across all swarm nodes with result streaming' },
  { name: 'Flow Workbench',         icon: '⚡', desc: 'Design ETL pipelines visually with drag-and-drop node canvas' },
  { name: 'Log Analytics',          icon: '📊', desc: 'Search, filter and visualise structured agent logs with time-series charts' },
  { name: 'Agents Performance',     icon: '📈', desc: 'Swarm-level metrics, query latency, replication throughput and health signals' },
  { name: 'API Testing',            icon: '🔌', desc: 'Embedded Postman-style interface for testing OptimusDB REST endpoints' },
];

const ARCHITECTURE_LAYERS = [
  { label: 'OptimusDDC', desc: 'React/TypeScript frontend · Amundsen fork · 7 dashboards · AI assistant', color: '#38bdf8' },
  { label: 'REST API / gRPC', desc: 'HTTP gateway layer · protobuf schemas · Swagger docs', color: '#7c3aed' },
  { label: 'OptimusDB Agent', desc: 'Go daemon · LibP2P host · OrbitDB store manager · Raft state machine', color: '#0d9488' },
  { label: 'P2P Mesh', desc: 'GossipSub topics · DHT peer discovery · QUIC/TCP transport', color: '#d97706' },
  { label: 'Storage Layer', desc: 'IPFS blocks · SQLite WAL · TinyLlama embeddings index', color: '#6366f1' },
];

const BUGS_FIXED = [
  { id: 'BF-001', title: 'SAT deduplication', desc: 'Coordinated with Márk — resolved split-brain double-commit on OrbitDB store sync' },
  { id: 'BF-002', title: 'Ghost peer filtering', desc: 'Added liveness heartbeat and exponential backoff eviction for stale peers' },
  { id: 'BF-003', title: 'Metadata workflow failures', desc: 'Fixed async handler race on TinyLlama tag generation pipeline' },
  { id: 'BF-004', title: 'Election / split-brain', desc: 'Tuned Raft election timeout and log compaction thresholds for 3-node cluster' },
];

const AboutOptimusPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'db' | 'ddc'>('db');

  return (
    <div className="optimus-page">
      {/* ── Hero ── */}
      <div className="optimus-hero">
        <div className="optimus-hero-bg" />
        <div className="optimus-hero-inner">
          <div className="optimus-badges">
            <div className="optimus-badge optimus-badge-db">
              <span className="optimus-badge-abbr">DB</span>
              <div>
                <div className="optimus-badge-name">OptimusDB</div>
                <div className="optimus-badge-sub">Decentralised Knowledge Base</div>
              </div>
            </div>
            <div className="optimus-hero-plus">+</div>
            <div className="optimus-badge optimus-badge-ddc">
              <span className="optimus-badge-abbr">DDC</span>
              <div>
                <div className="optimus-badge-name">OptimusDDC</div>
                <div className="optimus-badge-sub">Decentralised Data Catalog</div>
              </div>
            </div>
          </div>
          <div className="optimus-hero-text">
            <div className="optimus-hero-kicker">Swarmchestrate · Optimus Stack</div>
            <h1 className="optimus-hero-title">The Optimus Stack</h1>
            <p className="optimus-hero-desc">
              A fully decentralised knowledge management infrastructure for swarm-based distributed systems. OptimusDB provides the P2P knowledge base engine; OptimusDDC delivers the data catalog frontend — together forming the knowledge layer of the Swarmchestrate ecosystem.
            </p>
            <div className="optimus-hero-links">
              <a className="optimus-link-primary" href="https://github.com/georgeGeorgakakos/optimusdb" target="_blank" rel="noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.52 11.52 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.838 1.235 1.91 1.235 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.814 1.102.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub — OptimusDB
              </a>
              <a className="optimus-link-secondary" href="https://www.swarmchestrate.eu/" target="_blank" rel="noreferrer">Swarmchestrate Project</a>
            </div>
          </div>
        </div>
      </div>

      <div className="optimus-body">
        {/* ── Architecture Layers ── */}
        <section className="optimus-section">
          <h2 className="optimus-section-title">Stack Architecture</h2>
          <div className="optimus-arch">
            {ARCHITECTURE_LAYERS.map((l, i) => (
              <div key={i} className="optimus-arch-layer" style={{ borderLeftColor: l.color }}>
                <div className="optimus-arch-label" style={{ color: l.color }}>{l.label}</div>
                <div className="optimus-arch-desc">{l.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tabs: DB / DDC ── */}
        <section className="optimus-section">
          <div className="optimus-tabs">
            <button className={`optimus-tab${activeTab === 'db' ? ' active' : ''}`} onClick={() => setActiveTab('db')}>
              OptimusDB — Engine
            </button>
            <button className={`optimus-tab${activeTab === 'ddc' ? ' active' : ''}`} onClick={() => setActiveTab('ddc')}>
              OptimusDDC — Catalog
            </button>
          </div>

          {activeTab === 'db' && (
            <div className="optimus-tab-panel">
              <p className="optimus-tab-intro">
                OptimusDB is a Go-based daemon that exposes a RESTful knowledge base API over a fully decentralised P2P mesh. Each agent runs an independent store, participates in Raft-based consensus, and propagates metadata changes through GossipSub topics — enabling fully autonomous swarm knowledge management without a central coordinator.
              </p>
              <div className="optimus-components">
                {DB_COMPONENTS.map((c) => (
                  <div key={c.name} className="optimus-comp-card">
                    <div className="optimus-comp-name" style={{ color: c.color }}>{c.name}</div>
                    <div className="optimus-comp-role">{c.role}</div>
                  </div>
                ))}
              </div>
              <div className="optimus-repo-stats">
                <div className="optimus-stat"><span className="optimus-stat-val">Go</span><span className="optimus-stat-lbl">Language</span></div>
                <div className="optimus-stat"><span className="optimus-stat-val">53</span><span className="optimus-stat-lbl">Commits</span></div>
                <div className="optimus-stat"><span className="optimus-stat-val">GPL-3.0</span><span className="optimus-stat-lbl">License</span></div>
                <div className="optimus-stat"><span className="optimus-stat-val">K3s</span><span className="optimus-stat-lbl">Deployment</span></div>
              </div>
            </div>
          )}

          {activeTab === 'ddc' && (
            <div className="optimus-tab-panel">
              <p className="optimus-tab-intro">
                OptimusDDC is a React/TypeScript frontend forked from Apache Amundsen, redesigned and extended with five custom dashboards specific to the Swarmchestrate ecosystem. It connects to OptimusDB agents via REST, provides an embedded AI assistant (TinyLlama), and exposes a full semantic search interface over decentralised metadata.
              </p>
              <div className="optimus-dashboards">
                {DDC_DASHBOARDS.map((d) => (
                  <div key={d.name} className="optimus-dash-card">
                    <div className="optimus-dash-icon">{d.icon}</div>
                    <div className="optimus-dash-name">{d.name}</div>
                    <div className="optimus-dash-desc">{d.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Bug Tracker / Changelog ── */}
        <section className="optimus-section">
          <h2 className="optimus-section-title">Recent Bug Fixes &amp; Engineering Milestones</h2>
          <div className="optimus-bugs">
            {BUGS_FIXED.map((b) => (
              <div key={b.id} className="optimus-bug-card">
                <div className="optimus-bug-id">{b.id}</div>
                <div className="optimus-bug-body">
                  <div className="optimus-bug-title">{b.title}</div>
                  <div className="optimus-bug-desc">{b.desc}</div>
                </div>
                <div className="optimus-bug-badge">Fixed</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Deployment ── */}
        <section className="optimus-section">
          <h2 className="optimus-section-title">Kubernetes Deployment</h2>
          <div className="optimus-k8s-box">
            <div className="optimus-k8s-desc">
              Both OptimusDB and OptimusDDC are deployed on K3s Kubernetes clusters for Swarmchestrate validation. Each agent runs as a separate pod with persistent volume claims for OrbitDB stores and SQLite WAL files. Helm charts and simulation scripts are maintained in the project repository.
            </div>
            <div className="optimus-k8s-chips">
              <span className="optimus-k8s-chip">K3s</span>
              <span className="optimus-k8s-chip">Helm</span>
              <span className="optimus-k8s-chip">Docker</span>
              <span className="optimus-k8s-chip">PVC</span>
              <span className="optimus-k8s-chip">ConfigMaps</span>
              <span className="optimus-k8s-chip">NodePort / Ingress</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutOptimusPage;
