// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// EmptyState — Swarmchestrate context-aware empty/error states
//
// Usage:
//   <EmptyState variant="no-results" query="energy_storage" />
//   <EmptyState variant="offline" agentCount={0} />
//   <EmptyState variant="no-tables" />
//   <EmptyState variant="empty-query" />
//   <EmptyState variant="no-stores" />
//   <EmptyState variant="load-error" onRetry={() => refetch()} />

import * as React from 'react';
import './styles.scss';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmptyStateVariant =
  | 'no-results'
  | 'offline'
  | 'no-tables'
  | 'empty-query'
  | 'no-stores'
  | 'load-error';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** For 'no-results' — the search term attempted */
  query?: string;
  /** For 'offline' — how many agents are currently up */
  agentCount?: number;
  /** For 'load-error' — retry callback */
  onRetry?: () => void;
  /** Override the default title */
  title?: string;
  /** Override the default description */
  description?: string;
  /** Optional call-to-action link/button rendered below the description */
  action?: React.ReactNode;
  /** Extra className on the root */
  className?: string;
}

// ── SVG illustrations ─────────────────────────────────────────────────────────

const IllustrationNoResults: React.FC<{ query?: string }> = ({ query }) => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Search circle */}
    <circle cx="88" cy="76" r="40" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.3" />
    <circle cx="88" cy="76" r="40" fill="rgba(56,189,248,0.04)" />
    {/* Handle */}
    <line x1="118" y1="106" x2="142" y2="130"
      stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    {/* X inside the lens */}
    <line x1="76" y1="64" x2="100" y2="88" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    <line x1="100" y1="64" x2="76" y2="88" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    {/* Floating nodes around — disconnected */}
    <circle cx="36" cy="38" r="4" fill="#7c3aed" opacity="0.5" />
    <circle cx="160" cy="50" r="3" fill="#7c3aed" opacity="0.4" />
    <circle cx="150" cy="130" r="4" fill="#38bdf8" opacity="0.3" />
    <circle cx="28" cy="120" r="3" fill="#38bdf8" opacity="0.35" />
    {query && (
      <text x="88" y="136" textAnchor="middle" fill="#475569"
        fontSize="9" fontFamily="monospace">
        {`"${query.length > 18 ? `${query.slice(0, 16)}…` : query}"`}
      </text>
    )}
  </svg>
);

const IllustrationOffline: React.FC<{ agentCount?: number }> = ({ agentCount }) => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Central node — dark */}
    <circle cx="100" cy="80" r="22" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" opacity="0.8" />
    <circle cx="100" cy="80" r="6" fill="#ef4444" opacity="0.6" />
    {/* Warning icon inside */}
    <line x1="100" y1="70" x2="100" y2="80" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    <circle cx="100" cy="85" r="1.5" fill="#ef4444" />
    {/* Broken connection lines */}
    {[
      [100, 58, 60, 36],
      [120, 68, 155, 45],
      [122, 80, 162, 80],
      [118, 92, 152, 118],
      [100, 102, 100, 135],
      [82, 92, 48, 118],
      [78, 80, 38, 80],
      [80, 68, 45, 45],
    ].map(([x1, y1, x2, y2], i) => (
      <line key={i}
        x1={x1} y1={y1} x2={(x1 + x2) / 2} y2={(y1 + y2) / 2}
        stroke="#ef4444" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" />
    ))}
    {/* Ghost peer circles at ends */}
    {[
      [60, 36], [155, 45], [162, 80], [152, 118],
      [100, 135], [48, 118], [38, 80], [45, 45],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="5"
        fill="#1e293b" stroke="#334155" strokeWidth="1" opacity="0.5" />
    ))}
    {typeof agentCount === 'number' && (
      <text x="100" y="155" textAnchor="middle" fill="#ef4444"
        fontSize="9" fontFamily="monospace" opacity="0.7">
        {agentCount} / 3 agents online
      </text>
    )}
  </svg>
);

const IllustrationNoTables: React.FC = () => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Table outline — empty */}
    <rect x="30" y="40" width="140" height="90" rx="6"
      fill="rgba(30,41,59,0.6)" stroke="#334155" strokeWidth="1.5" />
    {/* Header row */}
    <rect x="30" y="40" width="140" height="22" rx="6"
      fill="rgba(56,189,248,0.06)" stroke="none" />
    <line x1="30" y1="62" x2="170" y2="62" stroke="#334155" strokeWidth="1" />
    {/* Column dividers */}
    <line x1="75" y1="40" x2="75" y2="130" stroke="#1e293b" strokeWidth="1" />
    <line x1="125" y1="40" x2="125" y2="130" stroke="#1e293b" strokeWidth="1" />
    {/* Empty row placeholders */}
    {[76, 94, 112].map((y) => (
      <React.Fragment key={y}>
        <rect x="38" y={y} width="28" height="7" rx="3" fill="#1e293b" opacity="0.8" />
        <rect x="83" y={y} width="34" height="7" rx="3" fill="#1e293b" opacity="0.6" />
        <rect x="133" y={y} width="28" height="7" rx="3" fill="#1e293b" opacity="0.5" />
      </React.Fragment>
    ))}
    {/* Plus icon overlay */}
    <circle cx="100" cy="85" r="16" fill="rgba(56,189,248,0.08)"
      stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
    <line x1="100" y1="78" x2="100" y2="92" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <line x1="93" y1="85" x2="107" y2="85" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IllustrationEmptyQuery: React.FC = () => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Terminal window */}
    <rect x="25" y="30" width="150" height="100" rx="8"
      fill="#0d1724" stroke="#334155" strokeWidth="1.5" />
    {/* Traffic lights */}
    <circle cx="42" cy="45" r="4" fill="#ef4444" opacity="0.7" />
    <circle cx="56" cy="45" r="4" fill="#fbbf24" opacity="0.7" />
    <circle cx="70" cy="45" r="4" fill="#34d399" opacity="0.7" />
    <line x1="25" y1="55" x2="175" y2="55" stroke="#1e293b" strokeWidth="1" />
    {/* Query lines — present but grayed */}
    <text x="36" y="72" fill="#38bdf8" fontSize="9" fontFamily="monospace" opacity="0.7">SELECT * FROM</text>
    <text x="36" y="85" fill="#7c3aed" fontSize="9" fontFamily="monospace" opacity="0.6">  energy_storage</text>
    <text x="36" y="98" fill="#38bdf8" fontSize="9" fontFamily="monospace" opacity="0.7">WHERE agent_id = ?</text>
    {/* Empty result block */}
    <rect x="36" y="108" width="128" height="14" rx="3"
      fill="#1e293b" stroke="#334155" strokeWidth="1" />
    <text x="100" y="117" textAnchor="middle" fill="#475569"
      fontSize="8" fontFamily="monospace">0 rows returned</text>
  </svg>
);

const IllustrationNoStores: React.FC = () => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Box/crate outline */}
    <rect x="55" y="55" width="90" height="75" rx="6"
      fill="rgba(30,41,59,0.5)" stroke="#334155" strokeWidth="1.5" />
    {/* Box lid */}
    <rect x="48" y="42" width="104" height="18" rx="5"
      fill="rgba(30,41,59,0.7)" stroke="#334155" strokeWidth="1.5" />
    {/* Latch */}
    <rect x="92" y="38" width="16" height="10" rx="3"
      fill="#1e293b" stroke="#475569" strokeWidth="1" />
    {/* Empty interior lines */}
    <line x1="72" y1="90" x2="128" y2="90" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
    <line x1="72" y1="103" x2="128" y2="103" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
    {/* Floating cubes — representing stores that don't exist */}
    <rect x="28" y="35" width="14" height="14" rx="3"
      fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.5" />
    <rect x="158" y="60" width="12" height="12" rx="3"
      fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.4" />
    <rect x="42" y="118" width="10" height="10" rx="2"
      fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.35" />
    {/* CRUD label faded */}
    <text x="100" y="88" textAnchor="middle" fill="#334155"
      fontSize="8" fontFamily="monospace" fontWeight="700">NO CRUD STORES</text>
  </svg>
);

const IllustrationLoadError: React.FC = () => (
  <svg viewBox="0 0 200 160" className="es-illustration" aria-hidden="true">
    {/* Warning triangle */}
    <polygon points="100,28 168,138 32,138"
      fill="rgba(245,158,11,0.07)" stroke="#f59e0b" strokeWidth="1.5"
      strokeLinejoin="round" opacity="0.8" />
    {/* Exclamation */}
    <line x1="100" y1="65" x2="100" y2="105"
      stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    <circle cx="100" cy="118" r="3" fill="#f59e0b" opacity="0.9" />
    {/* Scatter nodes — broken */}
    <circle cx="48" cy="48" r="5" fill="#7c3aed" opacity="0.3" />
    <circle cx="158" cy="42" r="4" fill="#7c3aed" opacity="0.25" />
    <circle cx="165" cy="125" r="5" fill="#38bdf8" opacity="0.25" />
    <circle cx="35" cy="120" r="4" fill="#38bdf8" opacity="0.25" />
    <line x1="48" y1="48" x2="68" y2="90" stroke="#7c3aed"
      strokeWidth="1" strokeDasharray="3 4" opacity="0.2" />
    <line x1="158" y1="42" x2="135" y2="88" stroke="#7c3aed"
      strokeWidth="1" strokeDasharray="3 4" opacity="0.2" />
  </svg>
);

// ── Variant configuration ─────────────────────────────────────────────────────

interface VariantConfig {
  illustration: (props: EmptyStateProps) => React.ReactNode;
  defaultTitle: string;
  defaultDesc: string;
  accentColor: string;
  badgeLabel: string;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, VariantConfig> = {
  'no-results': {
    illustration: (p) => <IllustrationNoResults query={p.query} />,
    defaultTitle: 'No matching resources',
    defaultDesc: 'The search returned no results in the knowledge base. Try broadening your query, removing filters, or checking the spelling of your search terms.',
    accentColor: '#38bdf8',
    badgeLabel: 'Search returned empty',
  },
  'offline': {
    illustration: (p) => <IllustrationOffline agentCount={p.agentCount} />,
    defaultTitle: 'Agents offline',
    defaultDesc: 'No active agents are currently connected to the swarm mesh. Check that your OptimusDB nodes are running and that peer discovery is functioning correctly.',
    accentColor: '#ef4444',
    badgeLabel: 'Swarm unreachable',
  },
  'no-tables': {
    illustration: () => <IllustrationNoTables />,
    defaultTitle: 'No tables found',
    defaultDesc: 'This store contains no RDBMS tables yet. Tables are discovered automatically when OptimusDB agents crawl connected data sources.',
    accentColor: '#38bdf8',
    badgeLabel: 'Empty store',
  },
  'empty-query': {
    illustration: () => <IllustrationEmptyQuery />,
    defaultTitle: 'Query returned no rows',
    defaultDesc: 'The federated query executed successfully but returned an empty result set. The table may be empty, or your WHERE clause may be too restrictive.',
    accentColor: '#7c3aed',
    badgeLabel: '0 rows returned',
  },
  'no-stores': {
    illustration: () => <IllustrationNoStores />,
    defaultTitle: 'No data stores registered',
    defaultDesc: 'No CRUD data stores have been registered with this agent. Stores are added when OptimusDB connects to external databases, document stores, or key-value backends.',
    accentColor: '#d97706',
    badgeLabel: 'No stores configured',
  },
  'load-error': {
    illustration: () => <IllustrationLoadError />,
    defaultTitle: 'Failed to load data',
    defaultDesc: 'An error occurred while fetching data from the OptimusDB API. This may be a transient network issue or the agent may be temporarily unavailable.',
    accentColor: '#f59e0b',
    badgeLabel: 'Load error',
  },
};

// ── Main component ────────────────────────────────────────────────────────────

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  query,
  agentCount,
  onRetry,
  title,
  description,
  action,
  className = '',
}) => {
  const config = VARIANT_CONFIG[variant];

  const resolvedTitle = title || config.defaultTitle;
  const resolvedDesc  = description || config.defaultDesc;

  return (
    <div className={`es-root es-root--${variant} ${className}`}>
      <div className="es-illustration-wrap">
        {config.illustration({ variant, query, agentCount, onRetry })}
      </div>

      <div className="es-body">
        <div className="es-badge" style={{
          color: config.accentColor,
          background: `${config.accentColor}14`,
          border: `1px solid ${config.accentColor}30`,
        }}>
          {config.badgeLabel}
        </div>

        <h3 className="es-title">{resolvedTitle}</h3>
        <p className="es-desc">{resolvedDesc}</p>

        <div className="es-actions">
          {/* Variant-specific default action */}
          {!action && variant === 'load-error' && onRetry && (
            <button
              type="button"
              className="es-btn-retry"
              onClick={onRetry}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retry
            </button>
          )}
          {!action && variant === 'no-results' && (
            <a className="es-btn-link" href="/search">Clear search & browse all</a>
          )}
          {!action && variant === 'offline' && (
            <a className="es-btn-link" href="/cluster/topology">View Agents Topology</a>
          )}
          {/* Custom action override */}
          {action}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
