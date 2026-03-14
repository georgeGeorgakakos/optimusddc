// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// About — Swarmchestrate (EU Horizon Europe Project)

import * as React from 'react';
import './styles.scss';

const OBJECTIVES = [
  { icon: 'orch', text: 'Develop an application-level decentralised orchestration framework utilising swarm-based distributed intelligence' },
  { icon: 'ai',   text: 'Develop matchmaking algorithms using decentralised AI methods to optimise energy efficiency and effectiveness' },
  { icon: 'sim',  text: 'Develop a simulation environment based on the novel decentralised orchestration concept' },
  { icon: 'swarm',text: 'Dynamically create and manage interconnected swarms across distributed Cloud-to-Edge infrastructure' },
  { icon: 'km',   text: 'Develop trusted, reliable, secure and transparent knowledge management systems' },
  { icon: 'demo', text: 'Implement real-life application demonstrators utilising Swarmchestrate services in realistic scenarios' },
];

const DEMONSTRATORS = [
  { name: 'Flood Prevention', icon: '🌊', desc: 'Distributed sensor networks processing environmental data at the network edge for real-time flood risk assessment.', href: 'https://www.swarmchestrate.eu/flood-prevention/' },
  { name: 'Parking Space Management', icon: '🅿', desc: 'Urban IoT deployment with edge orchestration for real-time parking availability across distributed sensors.', href: 'https://www.swarmchestrate.eu/parking-space-management/' },
  { name: 'Urban Noise Classification', icon: '🔊', desc: 'AI-powered audio processing at network edges to classify urban noise patterns and inform city planning.', href: 'https://www.swarmchestrate.eu/urban-noise-classification/' },
  { name: 'Digital Twin of Natural Habitat', icon: '🌿', desc: 'Real-time digital twin construction from distributed environmental sensors for ecosystem monitoring.', href: 'https://www.swarmchestrate.eu/digital-twin-of-natural-habitat/' },
];

const CONSORTIUM = [
  { name: 'SZTAKI', country: 'Hungary', role: 'Coordinator' },
  { name: 'TU Berlin', country: 'Germany', role: 'Research Partner' },
  { name: 'ICCS NTUA', country: 'Greece', role: 'Research Partner' },
  { name: 'Tampere University', country: 'Finland', role: 'Research Partner' },
  { name: 'IRI UL', country: 'Slovenia', role: 'Research Partner' },
  { name: 'UL FRI', country: 'Slovenia', role: 'Research Partner' },
  { name: 'FUELICS', country: 'Greece', role: 'Industry Partner' },
  { name: 'Suite5', country: 'Cyprus', role: 'Industry Partner' },
  { name: 'FrontEndArt', country: 'Hungary', role: 'Industry Partner' },
  { name: 'FBK', country: 'Italy', role: 'Research Partner' },
  { name: 'UST', country: 'Germany', role: 'Industry Partner' },
  { name: 'SNU', country: 'S. Korea', role: 'Research Partner' },
  { name: 'ENU', country: 'UK', role: 'Research Partner' },
  { name: 'UoW', country: 'UK', role: 'Research Partner' },
  { name: 'InnoRenew CoE', country: 'Slovenia', role: 'Research Partner' },
];

const ObjIcon: React.FC<{ type: string }> = ({ type }) => {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const icons: Record<string, React.ReactNode> = {
    orch:  <svg {...props}><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
    ai:    <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    sim:   <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    swarm: <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    km:    <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    demo:  <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  };
  return <>{icons[type] || icons.orch}</>;
};

const AboutSwarmchestatePage: React.FC = () => {
  return (
    <div className="swarm-page">
      {/* ── Hero ── */}
      <div className="swarm-hero">
        <div className="swarm-hero-glow" />
        <div className="swarm-hero-content">
          <div className="swarm-logo-badge">
            <div className="swarm-logo-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="10" r="6" fill="#38bdf8" opacity=".9"/>
                <circle cx="10" cy="36" r="5" fill="#7c3aed" opacity=".85"/>
                <circle cx="38" cy="36" r="5" fill="#7c3aed" opacity=".85"/>
                <line x1="24" y1="16" x2="10" y2="31" stroke="#38bdf8" strokeWidth="2" opacity=".5"/>
                <line x1="24" y1="16" x2="38" y2="31" stroke="#38bdf8" strokeWidth="2" opacity=".5"/>
                <line x1="10" y1="36" x2="38" y2="36" stroke="#7c3aed" strokeWidth="2" opacity=".4"/>
              </svg>
            </div>
          </div>
          <div className="swarm-hero-text">
            <div className="swarm-hero-kicker">EU Horizon Europe · Grant No. 101135012</div>
            <h1 className="swarm-hero-title">Swarmchestrate</h1>
            <p className="swarm-hero-sub">Application-level Swarm-based Orchestration across the Cloud-to-Edge Continuum</p>
            <p className="swarm-hero-desc">
              Combining emerging technologies in swarm computing, distributed AI, distributed ledger systems and decentralised identity management to create a fully autonomous self-organised application management system for the Cloud-to-Edge continuum.
            </p>
            <div className="swarm-hero-actions">
              <a className="swarm-cta-primary" href="https://www.swarmchestrate.eu/" target="_blank" rel="noreferrer">Visit Project Site</a>
              <a className="swarm-cta-secondary" href="https://www.swarmchestrate.eu/project-vision-objectives/" target="_blank" rel="noreferrer">Project Vision</a>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="swarm-stats">
          <div className="swarm-stat">
            <div className="swarm-stat-num">3</div>
            <div className="swarm-stat-lbl">Years Duration</div>
          </div>
          <div className="swarm-stat-div" />
          <div className="swarm-stat">
            <div className="swarm-stat-num">€5.5M</div>
            <div className="swarm-stat-lbl">Total Budget</div>
          </div>
          <div className="swarm-stat-div" />
          <div className="swarm-stat">
            <div className="swarm-stat-num">15</div>
            <div className="swarm-stat-lbl">Partners</div>
          </div>
          <div className="swarm-stat-div" />
          <div className="swarm-stat">
            <div className="swarm-stat-num">10</div>
            <div className="swarm-stat-lbl">Countries</div>
          </div>
          <div className="swarm-stat-div" />
          <div className="swarm-stat">
            <div className="swarm-stat-num">4</div>
            <div className="swarm-stat-lbl">Demonstrators</div>
          </div>
        </div>
      </div>

      <div className="swarm-body">
        {/* ── Objectives ── */}
        <section className="swarm-section">
          <h2 className="swarm-section-title">Project Objectives</h2>
          <div className="swarm-objectives">
            {OBJECTIVES.map((o, i) => (
              <div key={i} className="swarm-obj-card">
                <div className="swarm-obj-icon"><ObjIcon type={o.icon} /></div>
                <p className="swarm-obj-text">{o.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demonstrators ── */}
        <section className="swarm-section">
          <h2 className="swarm-section-title">Demonstrators</h2>
          <div className="swarm-demos">
            {DEMONSTRATORS.map((d, i) => (
              <a key={i} className="swarm-demo-card" href={d.href} target="_blank" rel="noreferrer">
                <div className="swarm-demo-icon">{d.icon}</div>
                <div className="swarm-demo-name">{d.name}</div>
                <p className="swarm-demo-desc">{d.desc}</p>
                <div className="swarm-demo-link">Learn more →</div>
              </a>
            ))}
          </div>
        </section>

        {/* ── ICCS / OptimusDB connection ── */}
        <section className="swarm-section">
          <h2 className="swarm-section-title">ICCS Contribution — Optimus Stack</h2>
          <div className="swarm-iccs-box">
            <div className="swarm-iccs-left">
              <div className="swarm-iccs-title">Knowledge Management Work Package</div>
              <p className="swarm-iccs-desc">
                The ICCS team at NTUA, led by the Information Management Unit (IMU), contributes to the trusted, reliable, and transparent knowledge management work package within Swarmchestrate. The contribution is materialised through the <strong>Optimus Stack</strong> — a decentralised knowledge base and data catalog layer enabling federated metadata management across swarm nodes.
              </p>
              <div className="swarm-iccs-chips">
                <span className="swarm-chip">OptimusDB</span>
                <span className="swarm-chip">OptimusDDC</span>
                <span className="swarm-chip">LibP2P</span>
                <span className="swarm-chip">OrbitDB</span>
                <span className="swarm-chip">GossipSub</span>
                <span className="swarm-chip">Raft Consensus</span>
              </div>
            </div>
            <div className="swarm-iccs-links">
              <a className="swarm-iccs-link" href="/about/optimus">Optimus Stack →</a>
              <a className="swarm-iccs-link" href="/about/iccs">IMU / ICCS →</a>
            </div>
          </div>
        </section>

        {/* ── Consortium ── */}
        <section className="swarm-section">
          <h2 className="swarm-section-title">Consortium — 15 Partners across 10 Countries</h2>
          <div className="swarm-consortium">
            {CONSORTIUM.map((p, i) => (
              <div key={i} className={`swarm-partner${p.role === 'Coordinator' ? ' swarm-partner--coord' : ''}`}>
                <div className="swarm-partner-name">{p.name}</div>
                <div className="swarm-partner-meta">{p.country} · {p.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Follow ── */}
        <section className="swarm-section swarm-follow">
          <h2 className="swarm-section-title">Follow Swarmchestrate</h2>
          <div className="swarm-follow-links">
            <a className="swarm-follow-btn" href="https://www.swarmchestrate.eu/" target="_blank" rel="noreferrer">🌐 Website</a>
            <a className="swarm-follow-btn" href="https://www.linkedin.com/company/swarmchestrate/" target="_blank" rel="noreferrer">💼 LinkedIn</a>
            <a className="swarm-follow-btn" href="https://www.youtube.com/@swarmchestrate" target="_blank" rel="noreferrer">▶ YouTube</a>
            <a className="swarm-follow-btn" href="https://www.swarmchestrate.eu/scientific-publications/" target="_blank" rel="noreferrer">📄 Publications</a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutSwarmchestatePage;
