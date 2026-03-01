// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

// Design tokens matching _variables-default.scss
const COLORS = {
  indigo60: '#665aff',
  indigo40: '#8481ff',
  cyan50: '#3a97d3',
  cyan30: '#82d2ff',
  strokeLight: '#e7e7ef',
  stroke: '#cacad9',
  textPrimary: '#292936',
  textTertiary: '#9191a8',
  green50: '#009b22',
  purple70: '#7b20f9',
  bgSecondary: '#f4f4fa',
};

interface ClusterNode {
  x: number;
  y: number;
  label: string;
  role: 'coordinator' | 'follower';
}

interface Particle {
  edge: number[];
  t: number;
  speed: number;
  size: number;
}

interface ClusterTopologyState {
  nodeCount: number;
  status: 'healthy' | 'warning' | 'error';
}

class ClusterTopology extends React.Component<{}, ClusterTopologyState> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private animationFrame: number = 0;
  private particles: Particle[] = [];

  state: ClusterTopologyState = {
    nodeCount: 3,
    status: 'healthy',
  };

  componentDidMount() {
    this.initParticles();
    this.draw();
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.animationFrame);
  }

  private getNodes(): ClusterNode[] {
    const W = 220;
    const H = 100;
    return [
      { x: W * 0.18, y: H * 0.55, label: 'optimusdb1', role: 'follower' },
      { x: W * 0.50, y: H * 0.22, label: 'optimusdb2', role: 'coordinator' },
      { x: W * 0.82, y: H * 0.55, label: 'optimusdb3', role: 'follower' },
    ];
  }

  private getEdges(): number[][] {
    return [[0, 1], [1, 2], [0, 2]];
  }

  private initParticles() {
    const edges = this.getEdges();
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        edge: edges[i % 3],
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        size: 1 + Math.random(),
      });
    }
  }

  private draw = () => {
    const canvas = this.canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 220;
    const H = 100;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    const nodes = this.getNodes();
    const edges = this.getEdges();

    ctx.clearRect(0, 0, W, H);

    // Draw edges
    edges.forEach(([a, b]) => {
      const na = nodes[a];
      const nb = nodes[b];
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = COLORS.strokeLight;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw particles flowing along edges
    this.particles.forEach((p) => {
      p.t += p.speed;
      if (p.t > 1) p.t -= 1;

      const na = nodes[p.edge[0]];
      const nb = nodes[p.edge[1]];
      const px = na.x + (nb.x - na.x) * p.t;
      const py = na.y + (nb.y - na.y) * p.t;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      const alpha = 0.3 + 0.5 * Math.sin(p.t * Math.PI);
      ctx.fillStyle = `rgba(102, 90, 255, ${alpha})`;
      ctx.fill();
    });

    // Draw nodes
    const now = Date.now();
    nodes.forEach((n, i) => {
      const pulse = Math.sin(now * 0.003 + i * 2) * 0.2 + 0.8;

      // Glow
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 20);
      grd.addColorStop(0, `rgba(56, 189, 248, ${0.1 * pulse})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(n.x - 20, n.y - 20, 40, 40);

      // Outer ring
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = n.role === 'coordinator'
        ? COLORS.indigo60
        : COLORS.cyan50;
      ctx.fill();

      // Coordinator dashed ring
      if (n.role === 'coordinator') {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(102, 90, 255, ${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label
      ctx.font = '500 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.textTertiary;
      ctx.fillText(n.label, n.x, n.y + 20);

      // Role sublabel
      ctx.font = '6.5px sans-serif';
      ctx.fillStyle = n.role === 'coordinator'
        ? COLORS.indigo40
        : COLORS.stroke;
      ctx.fillText(n.role, n.x, n.y + 28);
    });

    this.animationFrame = requestAnimationFrame(this.draw);
  };

  render() {
    const { status } = this.state;

    return (
      <div className="cluster-topology">
        <div className="topology-header">
          <h3 className="section-title">Cluster Topology</h3>
          <div className="topology-status">
            <span className={`status-dot status-dot--${status}`} />
            <span className={`status-text status-text--${status}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="topology-canvas-container">
          <canvas
            ref={this.canvasRef}
            style={{
              width: 220,
              height: 100,
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>
        <div className="topology-legend">
          <span className="legend-item">
            <span className="legend-dot legend-dot--coordinator" />
            Coordinator
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot--follower" />
            Follower
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot--data" />
            Data flow
          </span>
        </div>
      </div>
    );
  }
}

export default ClusterTopology;
