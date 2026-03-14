// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// NotFoundPage — Swarmchestrate "Lost Peer" 404
// A disconnected swarm node that can't be found in the mesh

import * as React from 'react';
import * as DocumentTitle from 'react-document-title';
import { Link } from 'react-router-dom';
import './styles.scss';

// ── Animated SVG: disconnected swarm node ────────────────────────────────────

const SwarmAnimation: React.FC = () => (
  <svg
    className="nfp-svg"
    viewBox="0 0 420 320"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="nfp-glow-blue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="nfp-glow-purple" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </radialGradient>
      <filter id="nfp-blur">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>

    {/* Background ambient glow */}
    <ellipse cx="210" cy="160" rx="150" ry="110" fill="url(#nfp-glow-purple)" />

    {/* ── Connected cluster (left side) — stable nodes ── */}

    {/* Node A — top-left cluster */}
    <circle cx="80" cy="90" r="7" fill="#7c3aed" opacity="0.9" className="nfp-node-stable" />
    <circle cx="80" cy="90" r="14" fill="#7c3aed" opacity="0.12" className="nfp-pulse-a" />

    {/* Node B */}
    <circle cx="130" cy="60" r="6" fill="#7c3aed" opacity="0.8" className="nfp-node-stable" />
    <circle cx="130" cy="60" r="12" fill="#7c3aed" opacity="0.1" className="nfp-pulse-b" />

    {/* Node C */}
    <circle cx="75" cy="155" r="6" fill="#7c3aed" opacity="0.75" className="nfp-node-stable" />

    {/* Node D */}
    <circle cx="145" cy="130" r="8" fill="#38bdf8" opacity="0.85" className="nfp-node-stable" />
    <circle cx="145" cy="130" r="16" fill="#38bdf8" opacity="0.10" className="nfp-pulse-c" />

    {/* Node E */}
    <circle cx="110" cy="195" r="5" fill="#7c3aed" opacity="0.7" className="nfp-node-stable" />

    {/* Stable connections */}
    <line x1="80" y1="90" x2="130" y2="60"    stroke="#7c3aed" strokeWidth="1.5" opacity="0.4" />
    <line x1="80" y1="90" x2="75"  y2="155"   stroke="#7c3aed" strokeWidth="1.5" opacity="0.35" />
    <line x1="80" y1="90" x2="145" y2="130"   stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
    <line x1="130" y1="60" x2="145" y2="130"  stroke="#38bdf8" strokeWidth="1"   opacity="0.3" />
    <line x1="75" y1="155" x2="145" y2="130"  stroke="#7c3aed" strokeWidth="1"   opacity="0.3" />
    <line x1="75" y1="155" x2="110" y2="195"  stroke="#7c3aed" strokeWidth="1"   opacity="0.25" />
    <line x1="145" y1="130" x2="110" y2="195" stroke="#38bdf8" strokeWidth="1"   opacity="0.25" />

    {/* ── Right cluster — also stable ── */}
    <circle cx="295" cy="85"  r="6"  fill="#7c3aed" opacity="0.8" className="nfp-node-stable" />
    <circle cx="350" cy="110" r="7"  fill="#38bdf8" opacity="0.85" className="nfp-node-stable" />
    <circle cx="340" cy="175" r="6"  fill="#7c3aed" opacity="0.75" className="nfp-node-stable" />
    <circle cx="295" cy="205" r="5"  fill="#7c3aed" opacity="0.7" className="nfp-node-stable" />
    <circle cx="370" cy="220" r="5"  fill="#7c3aed" opacity="0.65" className="nfp-node-stable" />

    <line x1="295" y1="85"  x2="350" y2="110"  stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
    <line x1="350" y1="110" x2="340" y2="175"  stroke="#7c3aed" strokeWidth="1.5" opacity="0.3" />
    <line x1="340" y1="175" x2="295" y2="205"  stroke="#7c3aed" strokeWidth="1"   opacity="0.3" />
    <line x1="340" y1="175" x2="370" y2="220"  stroke="#7c3aed" strokeWidth="1"   opacity="0.25" />
    <line x1="295" y1="85"  x2="340" y2="175"  stroke="#7c3aed" strokeWidth="1"   opacity="0.2" />

    {/* ── The Lost Node (centre) — floating, disconnected ── */}
    {/* Outer search ring — expanding and fading */}
    <circle cx="210" cy="155" r="32" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.15" className="nfp-search-ring-1" />
    <circle cx="210" cy="155" r="50" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.08" className="nfp-search-ring-2" />

    {/* Broken connection stubs — dashed, fading out toward the clusters */}
    <line x1="145" y1="130" x2="185" y2="148"
      stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 5"
      opacity="0.3" className="nfp-broken-line-l" />
    <line x1="295" y1="85" x2="235" y2="143"
      stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 5"
      opacity="0.25" className="nfp-broken-line-r" />

    {/* Ambient glow behind lost node */}
    <circle cx="210" cy="155" r="44" fill="url(#nfp-glow-blue)" />

    {/* Lost node body */}
    <circle cx="210" cy="155" r="16" fill="#1a2840" stroke="#38bdf8" strokeWidth="1.5"
      opacity="0.95" className="nfp-lost-node" />
    {/* Inner dot */}
    <circle cx="210" cy="155" r="5" fill="#38bdf8" opacity="0.7" className="nfp-lost-inner" />

    {/* "?" mark inside lost node */}
    <text x="210" y="152" textAnchor="middle" dominantBaseline="middle"
      fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="monospace"
      opacity="0.9" className="nfp-lost-q">?</text>

    {/* Status label under lost node */}
    <rect x="170" y="180" width="80" height="18" rx="9"
      fill="#1a2840" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
    <text x="210" y="189" textAnchor="middle" dominantBaseline="middle"
      fill="#38bdf8" fontSize="8.5" fontWeight="700" fontFamily="monospace"
      letterSpacing="1.2" opacity="0.85">PEER NOT FOUND</text>
  </svg>
);

// ── 404 glitch number display ─────────────────────────────────────────────────

const GlitchNumber: React.FC = () => (
  <div className="nfp-glitch-wrap" aria-label="404">
    <span className="nfp-glitch" data-text="404">404</span>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const NotFoundPage: React.FC = () => (
  <DocumentTitle title="404 — Peer Not Found · OptimusDDC">
    <div className="nfp-page">
      {/* Background grid */}
      <div className="nfp-grid-bg" aria-hidden="true" />

      <div className="nfp-inner">
        {/* Animation */}
        <div className="nfp-anim-wrap">
          <SwarmAnimation />
        </div>

        {/* Text content */}
        <div className="nfp-content">
          <GlitchNumber />

          <div className="nfp-badge">
            <span className="nfp-badge-dot" />
            <span>Node disconnected from swarm</span>
          </div>

          <h1 className="nfp-title">Peer Not Found</h1>

          <p className="nfp-desc">
            The resource you requested could not be located in the swarm mesh.
            The node may have been decommissioned, migrated, or never existed in
            this cluster.
          </p>

          <div className="nfp-code-block">
            <span className="nfp-code-label">error</span>
            <code className="nfp-code">
              HTTP 404 · peer_lookup_failed · no route to resource
            </code>
          </div>

          <div className="nfp-actions">
            <Link to="/" className="nfp-btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Back to Cluster Home
            </Link>
            <Link to="/search" className="nfp-btn-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search the Catalog
            </Link>
            <button
              type="button"
              className="nfp-btn-ghost"
              onClick={() => window.history.back()}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>

      {/* EU Horizon badge bottom-right */}
      <div className="nfp-eu-badge" aria-label="EU Horizon Europe project">
        <span className="nfp-eu-stars">★★★</span>
        <span>EU Horizon · Grant #101135012</span>
      </div>
    </div>
  </DocumentTitle>
);

export default NotFoundPage;
