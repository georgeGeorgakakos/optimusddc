// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

interface SourceInfo {
  key: string;
  label: string;
  count: number;
}

interface InventoryStatsState {
  sources: SourceInfo[];
  total: number;
  isLoading: boolean;
  animatedTotal: number;
}

class InventoryStats extends React.Component<{}, InventoryStatsState> {
  private animationTimer: ReturnType<typeof setTimeout> | null = null;

  state: InventoryStatsState = {
    sources: [
      { key: 'sqlite', label: 'SQLite Tables', count: 20 },
      { key: 'orbitdb', label: 'OrbitDB Active', count: 6 },
      { key: 'planned', label: 'OrbitDB Planned', count: 8 },
      { key: 'ipfs', label: 'IPFS Content', count: 2 },
      { key: 'ai', label: 'AI Enrichment', count: 3 },
      { key: 'agent', label: 'Agent Nodes', count: 3 },
    ],
    total: 42,
    isLoading: false,
    animatedTotal: 0,
  };

  componentDidMount() {
    this.animateCounter();
  }

  componentWillUnmount() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
  }

  private animateCounter = () => {
    const { total } = this.state;
    const duration = 800;
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(eased * total);

      this.setState({ animatedTotal: current });

      if (progress < 1) {
        this.animationTimer = setTimeout(step, 16);
      }
    };
    step();
  };

  render() {
    const { sources, animatedTotal } = this.state;

    return (
      <div className="inventory-stats">
        <h3 className="section-title">Inventory</h3>
        <div className="inventory-list">
          {sources.map((src) => (
            <div
              key={src.key}
              className={`inventory-item inventory-item--${src.key}`}
            >
              <span className="inventory-dot" />
              <span className="inventory-label">{src.label}</span>
              <span className="inventory-count">{src.count}</span>
            </div>
          ))}
        </div>
        <div className="inventory-total">
          <span className="total-number">{animatedTotal}</span>
          <span className="total-label">total datasets</span>
        </div>
      </div>
    );
  }
}

export default InventoryStats;
