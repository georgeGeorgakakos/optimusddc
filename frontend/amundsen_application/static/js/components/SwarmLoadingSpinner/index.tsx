// js/components/SwarmLoadingSpinner/index.tsx
import * as React from 'react';
import './styles.scss';

const MESSAGES = [
  'Querying swarm agents...',
  'Fetching table schema...',
  'Building metadata graph...',
  'Resolving replication state...',
  'Almost ready...',
];

const NODE_SEQUENCES: Array<[string, string, string]> = [
  ['active', 'dim', 'dim'],
  ['active', 'active', 'dim'],
  ['active', 'active', 'active'],
  ['active', 'active', 'active'],
  ['active', 'active', 'active'],
];

const ICCS_LOGO_PATH = '/static/images/logo2.png';

interface SwarmLoadingSpinnerProps {
  tableName?: string;
}

interface SwarmLoadingSpinnerState {
  msgIndex: number;
  fadeKey: number;
}

class SwarmLoadingSpinner extends React.Component<
  SwarmLoadingSpinnerProps,
  SwarmLoadingSpinnerState
> {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(props: SwarmLoadingSpinnerProps) {
    super(props);
    this.state = { msgIndex: 0, fadeKey: 0 };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState((prev) => ({
        msgIndex: (prev.msgIndex + 1) % MESSAGES.length,
        fadeKey: prev.fadeKey + 1,
      }));
    }, 1100);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  render() {
    const { tableName } = this.props;
    const { msgIndex, fadeKey } = this.state;
    const nodeSeq = NODE_SEQUENCES[msgIndex];

    return (
      <div className="swarm-loading-overlay">
        {/* subtle grid bg rendered via CSS ::before */}

        <div className="swarm-loading-inner">
          {/* ── Orbit system ── */}
          <div className="swarm-orbit-system">
            <div className="swarm-orbit-ring" />
            <div className="swarm-orbit-ring-outer" />

            {/* outer orbit — 4 cyan nodes */}
            <div className="swarm-spin">
              <span className="swarm-orb-node swarm-orb-n" />
              <span className="swarm-orb-node swarm-orb-s" />
              <span className="swarm-orb-node swarm-orb-e" />
              <span className="swarm-orb-node swarm-orb-w" />
            </div>

            {/* inner orbit — 3 purple nodes, counter-rotating */}
            <div className="swarm-spin-rev swarm-inner-orbit">
              <span className="swarm-orb-node swarm-orb-purple swarm-orb-pn" />
              <span className="swarm-orb-node swarm-orb-purple swarm-orb-pbl" />
              <span className="swarm-orb-node swarm-orb-purple swarm-orb-pbr" />
            </div>

            {/* center disc */}
            <div className="swarm-center-disc swarm-pulse">
              {/* Swarmchestrate icon */}
              <svg
                width="38"
                height="38"
                viewBox="0 0 100 100"
                className="swarm-icon-svg"
              >
                <defs>
                  <radialGradient id="swarm-cg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </radialGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="13"
                  fill="url(#swarm-cg)"
                  opacity=".95"
                />
                <circle cx="27" cy="27" r="8" fill="#38bdf8" opacity=".8" />
                <circle cx="73" cy="27" r="8" fill="#38bdf8" opacity=".8" />
                <circle cx="27" cy="73" r="8" fill="#38bdf8" opacity=".8" />
                <circle cx="73" cy="73" r="8" fill="#38bdf8" opacity=".8" />
                <circle cx="17" cy="50" r="6" fill="#7c3aed" opacity=".7" />
                <circle cx="83" cy="50" r="6" fill="#7c3aed" opacity=".7" />
                <circle cx="50" cy="17" r="6" fill="#7c3aed" opacity=".7" />
                <circle cx="50" cy="83" r="6" fill="#7c3aed" opacity=".7" />
                <line
                  x1="50"
                  y1="50"
                  x2="27"
                  y2="27"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="73"
                  y2="27"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="27"
                  y2="73"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="73"
                  y2="73"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="17"
                  y2="50"
                  stroke="#7c3aed"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="83"
                  y2="50"
                  stroke="#7c3aed"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="17"
                  stroke="#7c3aed"
                  strokeWidth="1.5"
                  opacity=".2"
                />
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="83"
                  stroke="#7c3aed"
                  strokeWidth="1.5"
                  opacity=".2"
                />
              </svg>

              {/* ICCS logo badge */}
              <div className="swarm-iccs-badge">
                <img
                  src={ICCS_LOGO_PATH}
                  alt="ICCS"
                  className="swarm-iccs-img"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;

                    el.style.display = 'none';
                    const parent = el.parentElement;

                    if (parent) {
                      parent.classList.add('swarm-iccs-badge--fallback');
                      parent.innerHTML =
                        '<span class="swarm-iccs-text">IC<br/>CS</span>';
                    }
                  }}
                />
              </div>
            </div>

            {/* node labels */}
            <span className="swarm-node-label swarm-node-label--top">
              optimusdb1
            </span>
            <span className="swarm-node-label swarm-node-label--bottom">
              optimusdb3
            </span>
            <span className="swarm-node-label swarm-node-label--left">
              optimusdb2
            </span>
          </div>

          {/* ── Text area ── */}
          <div className="swarm-text-area">
            {tableName && <div className="swarm-table-name">{tableName}</div>}

            <div key={fadeKey} className="swarm-main-text">
              {MESSAGES[msgIndex]}
            </div>

            <div className="swarm-sub-text">
              Swarmchestrate · OptimusDDC · ICCS 2025
            </div>

            {/* progress bar */}
            <div className="swarm-prog-track">
              <div className="swarm-prog-fill" />
            </div>

            {/* node status pills */}
            <div className="swarm-pills">
              <span className={`swarm-pill swarm-pill--${nodeSeq[0]}`}>
                ● optimusdb1
              </span>
              <span className={`swarm-pill swarm-pill--${nodeSeq[1]}`}>
                ● optimusdb2
              </span>
              <span className={`swarm-pill swarm-pill--${nodeSeq[2]}`}>
                ● optimusdb3
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SwarmLoadingSpinner;
