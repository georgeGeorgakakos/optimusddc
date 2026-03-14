// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// About — The Author: George Georgakakos

import * as React from 'react';
import './styles.scss';

const PUBLICATIONS = [
  {
    title: 'OptimusDB: A Decentralised Knowledge Base for the Swarmchestrate Ecosystem',
    venue: 'CENTERIS 2025',
    year: '2025',
    type: 'Conference',
    color: 'pub-purple',
  },
  {
    title: 'Decentralized Data Catalog for Renewable Energy Metadata Management',
    venue: 'AINA 2025',
    year: '2025',
    type: 'Conference',
    color: 'pub-blue',
  },
  {
    title: 'Swarm-based Knowledge Management in Cognitive Computing Continua',
    venue: 'Horizon Europe Deliverable PA4',
    year: '2025',
    type: 'Journal (in prep.)',
    color: 'pub-teal',
  },
];

const SKILLS = [
  { label: 'Go / LibP2P', level: 85, color: '#38bdf8' },
  { label: 'TypeScript / React', level: 88, color: '#7c3aed' },
  { label: 'Kubernetes / K3s', level: 80, color: '#0f6e56' },
  { label: 'IBM watsonx / Azure', level: 82, color: '#1d4ed8' },
  { label: 'OrbitDB / IPFS', level: 78, color: '#0891b2' },
  { label: 'Python / ML', level: 75, color: '#d97706' },
];

const ROLES = [
  {
    period: '2023 – present',
    role: 'Business Development Director',
    org: 'iKnowHow S.A.',
    desc: 'Presales leadership, enterprise architecture, vendor partnerships across Energy, Telco, Banking, Public Sector.',
    icon: 'biz',
  },
  {
    period: '2023 – present',
    role: 'Associate Researcher',
    org: 'ICCS / IMU — NTUA',
    desc: 'PhD research on decentralised knowledge management systems within the EU Horizon Europe Swarmchestrate project.',
    icon: 'phd',
  },
  {
    period: '2020 – 2023',
    role: 'Associate Director / Consult Partner',
    org: 'Kyndryl Greece',
    desc: 'Data & AI, cybersecurity, cloud infrastructure and managed services across Greek and European clients.',
    icon: 'corp',
  },
];

const RoleIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'biz')
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  if (type === 'phd')
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
};

const AboutAuthorPage: React.FC = () => {
  return (
    <div className="author-page">
      {/* ── Hero ── */}
      <div className="author-hero">
        <div className="author-hero-bg" />
        <div className="author-hero-content">
          <div className="author-avatar">
            <span className="author-avatar-initials">GG</span>
            <span className="author-avatar-ring" />
          </div>
          <div className="author-hero-text">
            <h1 className="author-name">George Georgakakos</h1>
            <p className="author-title">Associate Researcher · ICCS / IMU — NTUA</p>
            <p className="author-subtitle">Business Development Director · iKnowHow S.A.</p>
            <div className="author-tags">
              <span className="author-tag">Decentralised Systems</span>
              <span className="author-tag">P2P Networks</span>
              <span className="author-tag">AI-Augmented Infrastructure</span>
              <span className="author-tag">Enterprise Consulting</span>
            </div>
          </div>
          <div className="author-links">
            <a className="author-link-btn" href="https://github.com/georgeGeorgakakos" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.52 11.52 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.838 1.235 1.91 1.235 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.814 1.102.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a className="author-link-btn" href="https://www.linkedin.com/in/georgegeorgakakos/" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a>
            <a className="author-link-btn" href="https://imu.ntua.gr/wp/" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              IMU / NTUA
            </a>
          </div>
        </div>
      </div>

      <div className="author-body">
        {/* ── Bio ── */}
        <section className="author-section">
          <h2 className="author-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Bio
          </h2>
          <div className="author-bio-card">
            <p>
              George Georgakakos is a technology professional and researcher combining enterprise consulting with academic research in distributed systems. He currently serves as <strong>Business Development Director</strong> at iKnowHow S.A. — a Greek technology consulting group with ~300 professionals and €25M revenue — where he leads presales, RFP/RFI responses, and vendor partnerships across Energy, Telco, Banking, and Public Sector.
            </p>
            <p>
              Simultaneously, he pursues a <strong>PhD at Athens University of Economics and Business (AUEB)</strong> under Prof. Yiannis Verginadis, focused on decentralised knowledge management systems. His research is embedded in the EU Horizon Europe <strong>Swarmchestrate project</strong> (Grant No. 101135012), for which he is building <em>OptimusDB</em> and <em>OptimusDDC</em> — a decentralised knowledge base engine and data catalog frontend for the Swarmchestrate ecosystem.
            </p>
            <p>
              His background spans Kyndryl Greece (Associate Director), Satori Analytics, and UniSystems, with deep expertise in Data &amp; AI, cloud infrastructure, cybersecurity, and managed services across Greek and European markets.
            </p>
          </div>
        </section>

        {/* ── Roles Timeline ── */}
        <section className="author-section">
          <h2 className="author-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Career
          </h2>
          <div className="author-timeline">
            {ROLES.map((r, i) => (
              <div key={i} className="author-timeline-item">
                <div className="author-timeline-icon">
                  <RoleIcon type={r.icon} />
                </div>
                <div className="author-timeline-body">
                  <div className="author-timeline-header">
                    <span className="author-timeline-role">{r.role}</span>
                    <span className="author-timeline-period">{r.period}</span>
                  </div>
                  <div className="author-timeline-org">{r.org}</div>
                  <p className="author-timeline-desc">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech Skills ── */}
        <section className="author-section">
          <h2 className="author-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Technical Stack
          </h2>
          <div className="author-skills">
            {SKILLS.map((s) => (
              <div key={s.label} className="author-skill">
                <div className="author-skill-header">
                  <span className="author-skill-label">{s.label}</span>
                  <span className="author-skill-pct">{s.level}%</span>
                </div>
                <div className="author-skill-bar">
                  <div
                    className="author-skill-fill"
                    style={{ width: `${s.level}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Publications ── */}
        <section className="author-section">
          <h2 className="author-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Publications
          </h2>
          <div className="author-pubs">
            {PUBLICATIONS.map((p, i) => (
              <div key={i} className={`author-pub-card ${p.color}`}>
                <div className="author-pub-type">{p.type}</div>
                <div className="author-pub-title">{p.title}</div>
                <div className="author-pub-meta">{p.venue} · {p.year}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Optimus Projects ── */}
        <section className="author-section">
          <h2 className="author-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            Optimus Stack Projects
          </h2>
          <div className="author-projects">
            <a className="author-project-card" href="/about/optimus">
              <div className="author-project-icon project-db">DB</div>
              <div>
                <div className="author-project-name">OptimusDB</div>
                <div className="author-project-desc">Decentralised knowledge base engine — Go, LibP2P, OrbitDB, Raft consensus, TinyLlama</div>
              </div>
            </a>
            <a className="author-project-card" href="/about/optimus">
              <div className="author-project-icon project-ddc">DDC</div>
              <div>
                <div className="author-project-name">OptimusDDC</div>
                <div className="author-project-desc">Decentralised data catalog frontend — Amundsen fork, React/TypeScript, five dashboards, AI assistant</div>
              </div>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutAuthorPage;
