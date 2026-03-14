// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// About — ICCS / Information Management Unit (IMU), NTUA

import * as React from 'react';
import './styles.scss';

const RESEARCH_AREAS = [
  { label: 'Analyse', subtitle: 'From Data to Insight', icon: 'analyse', desc: 'AI, machine learning and prescriptive data analytics methods to mine and combine data and discover useful knowledge.' },
  { label: 'Compute', subtitle: 'From Cloud to Edge', icon: 'compute', desc: 'Resource allocation across hybrid environments (cloud, fog, edge) and context-aware security and privacy.' },
  { label: 'Decide', subtitle: 'From Insights to Intelligence', icon: 'decide', desc: 'Agentic AI solutions and multi-criteria optimisation methods that proactively recommend appropriate decisions.' },
];

const MEMBERSHIPS = [
  { name: 'ADRA', fullName: 'AI, Data and Robotics Association', desc: 'Joins BDVA, CLAIRE, ELLIS, EurAI and euRobotics — Horizon Europe AI, Data & Robotics Partnership', color: '#38bdf8' },
  { name: 'IDSA', fullName: 'International Data Spaces Association', desc: '130+ member coalition designing a trustworthy architecture for the data economy and data sovereignty', color: '#7c3aed' },
  { name: 'BDVA', fullName: 'Big Data Value Association', desc: 'Industry-driven international organisation with 230+ members advancing Data and AI in Europe', color: '#0d9488' },
  { name: 'CAIRNE', fullName: 'Confederation of Labs for AI Research in Europe', desc: 'International non-profit strengthening European excellence in AI research and innovation', color: '#d97706' },
  { name: 'GAIA-X', fullName: 'GAIA-X Federation', desc: 'Co-creating European federated digital infrastructure connecting cloud services with data sovereignty', color: '#6366f1' },
];

const APP_DOMAINS = [
  { name: 'Factories of the Future', icon: '🏭' },
  { name: 'Electronic Governance', icon: '🏛' },
  { name: 'Digital Health & Well-being', icon: '🏥' },
  { name: 'Digital Innovation', icon: '💡' },
  { name: 'Sustainable & Green Economy', icon: '🌱' },
];

const AreaIcon: React.FC<{ type: string }> = ({ type }) => {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'analyse') return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  if (type === 'compute') return <svg {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
};

const AboutICCSPage: React.FC = () => {
  return (
    <div className="iccs-page">
      {/* ── Hero ── */}
      <div className="iccs-hero">
        <div className="iccs-hero-glow" />
        <div className="iccs-hero-inner">
          <div className="iccs-logo-block">
            <div className="iccs-logo-circle">
              <svg viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" stroke="#38bdf8" strokeWidth="1.5" opacity=".4"/>
                <text x="28" y="34" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="700" fontFamily="sans-serif">IMU</text>
              </svg>
            </div>
            <div className="iccs-logo-sub">ICCS · NTUA</div>
          </div>
          <div className="iccs-hero-text">
            <div className="iccs-hero-kicker">Institute of Communication and Computer Systems · NTUA</div>
            <h1 className="iccs-hero-title">Information Management Unit</h1>
            <p className="iccs-hero-tagline">Research and development in information Technology Management</p>
            <p className="iccs-hero-desc">
              The Information Management Unit (IMU) is a research unit of ICCS, established in 1989 by the Ministry of Education and the School of Electrical &amp; Computer Engineering of the National Technical University of Athens. Our mission is to support knowledge-driven organisations with <strong>trustworthy AI services</strong> and <strong>data-driven, secure and reliable computing</strong> infrastructures.
            </p>
            <div className="iccs-hero-actions">
              <a className="iccs-cta" href="https://imu.ntua.gr/wp/" target="_blank" rel="noreferrer">Visit IMU Website</a>
              <a className="iccs-cta iccs-cta--sec" href="http://imu.ntua.gr/static/presentation/IMU-2024.pdf" target="_blank" rel="noreferrer">Download Presentation</a>
            </div>
          </div>
        </div>
      </div>

      <div className="iccs-body">
        {/* ── Research Areas ── */}
        <section className="iccs-section">
          <h2 className="iccs-section-title">Research Areas</h2>
          <div className="iccs-areas">
            {RESEARCH_AREAS.map((a) => (
              <div key={a.label} className="iccs-area-card">
                <div className="iccs-area-icon"><AreaIcon type={a.icon} /></div>
                <div className="iccs-area-label">{a.label}</div>
                <div className="iccs-area-subtitle">{a.subtitle}</div>
                <p className="iccs-area-desc">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Application Domains ── */}
        <section className="iccs-section">
          <h2 className="iccs-section-title">Application Domains</h2>
          <div className="iccs-domains">
            {APP_DOMAINS.map((d) => (
              <div key={d.name} className="iccs-domain-card">
                <div className="iccs-domain-icon">{d.icon}</div>
                <div className="iccs-domain-name">{d.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TrAIL ── */}
        <section className="iccs-section">
          <h2 className="iccs-section-title">Trustworthy AI Lab (TrAIL)</h2>
          <div className="iccs-trail-box">
            <div className="iccs-trail-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="iccs-trail-text">
              <div className="iccs-trail-title">Trustworthy AI Lab (TrAIL)</div>
              <p className="iccs-trail-desc">
                IMU operates the TrAIL specialised lab, focusing on the development, assessment and deployment of trustworthy AI systems. TrAIL contributes to EU frameworks for ethical AI, including Z-Inspection® methodology for holistic AI trustworthiness assessment, incorporating ethical principles and socio-technical scenarios to identify potential risks.
              </p>
              <a className="iccs-trail-link" href="http://imu.ntua.gr/wp/trail/" target="_blank" rel="noreferrer">TrAIL Lab →</a>
            </div>
          </div>
        </section>

        {/* ── Memberships ── */}
        <section className="iccs-section">
          <h2 className="iccs-section-title">Memberships &amp; Associations</h2>
          <div className="iccs-memberships">
            {MEMBERSHIPS.map((m) => (
              <div key={m.name} className="iccs-membership-card" style={{ borderLeftColor: m.color }}>
                <div className="iccs-membership-badge" style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}12` }}>{m.name}</div>
                <div className="iccs-membership-full">{m.fullName}</div>
                <p className="iccs-membership-desc">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="iccs-section">
          <h2 className="iccs-section-title">Contact</h2>
          <div className="iccs-contact">
            <div className="iccs-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              9 Iroon Polytechniou street, Zografou, 15780, Athens, Greece
            </div>
            <div className="iccs-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              contact@imuresearch.eu
            </div>
            <div className="iccs-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.18-1.18a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +30-210-772-3895
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutICCSPage;
