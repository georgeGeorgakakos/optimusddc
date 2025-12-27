// ==============================================================================
// FILE: amundsen_application/static/js/pages/ClusterTopologyPage/index.tsx
// PHASE 3 COMPLETE VERSION WITH DYNAMIC API CONFIG + FULL TOPOLOGY VISUALIZATION
// ✅ FIXED: UTILIZATION-BASED HEALTH (Lower is better!)
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from 'config/apiConfig'; // ← PHASE 3 IMPORT
import './styles.scss';

// ==============================================================================
// TypeScript Interfaces
// ==============================================================================

interface NodeHealth {
  score: string;
  status: string;
  cpu_usage: string;
  cpu_idle: string;
  memory_used: string;
  memory_total: string;
  memory_sys: string;
  disk_read: string;
  disk_write: string;
  latency: string;
  uptime: string;
}

interface NodeMetrics {
  leadership_count: number;
  geography_score?: number;
}

interface PeerNode {
  peer_id: string;
  role: string;
  is_leader: boolean;
  connected: boolean;
  health: NodeHealth;
  metrics: NodeMetrics;
}

interface AgentInfo {
  peer_id: string;
  addresses: string[];
  role: string;
  is_coordinator: boolean;
  is_current_leader: boolean;
  health: NodeHealth;
  metrics: NodeMetrics;
}

interface ElectionInfo {
  current_leader: string;
  current_term: number;
  last_election_time: string;
  last_election_term: number;
}

interface ClusterInfo {
  total_peers: number;
  connected_peers: number;
  discovered_peers: number;
  coordinators: number;
  followers: number;
}

interface ClusterData {
  status: string;
  agent: AgentInfo;
  election: ElectionInfo;
  cluster: ClusterInfo;
  peers: PeerNode[];
  configuration: {
    context: string;
    http_port: string;
  };
  timestamp: string;
}

interface Settings {
  nodeId: number; // ← PHASE 3: Which OptimusDB node to query
  apiContext: string;
  refreshInterval: number;
}

// ==============================================================================
// Main Component
// ==============================================================================

const ClusterTopologyPage: React.FC = () => {
  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<number>(300);
  const [connected, setConnected] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // ✅ PHASE 3: Settings now use nodeId instead of hardcoded URL
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('optimusdb_cluster_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to default
      }
    }
    return {
      nodeId: 1, // Default to node 1
      apiContext: 'swarmkb',
      refreshInterval: 300000, // 5 minutes
    };
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('optimusdb_cluster_settings', JSON.stringify(settings));
  }, [settings]);

  // ✅ PHASE 3: Fetch cluster data using dynamic URL
  const fetchClusterData = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ PHASE 3: Build dynamic URL that works in Docker + K3s
      const apiUrl = buildApiUrl('optimusdb', `/${settings.apiContext}/agent/status`, settings.nodeId);

      console.log(`Fetching cluster data from: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ClusterData = await response.json();
      setClusterData(data);
      setConnected(true);
      setError(null);
      setRefreshTimer(settings.refreshInterval / 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cluster data';
      setError(errorMessage);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchClusterData();

    const refreshInterval = setInterval(fetchClusterData, settings.refreshInterval);
    const countdownInterval = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : settings.refreshInterval / 1000));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchClusterData, settings.refreshInterval]);

  // Helper function - format timestamp
  const formatTime = (timestamp: string): string => {
    if (!timestamp || timestamp === 'Never') return 'Never';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // ✅ FIXED: Helper function - get health class (UTILIZATION-based)
  // IMPORTANT: Health score = UTILIZATION (lower is better!)
  const getHealthClass = (score: string): string => {
    const numScore = parseFloat(score || '0');

    // ✅ FIXED: Inverted logic for utilization
    if (numScore <= 20) return 'excellent';  // 0-20% utilization = Excellent (80-100% free)
    if (numScore <= 40) return 'good';       // 20-40% utilization = Good (60-80% free)
    if (numScore <= 60) return 'fair';       // 40-60% utilization = Fair (40-60% free)
    if (numScore <= 80) return 'poor';       // 60-80% utilization = Poor (20-40% free)
    return 'critical';                        // 80-100% utilization = Critical (0-20% free)
  };

  // Helper function - get health label
  const getHealthLabel = (score: string): string => {
    const numScore = parseFloat(score || '0');

    if (numScore <= 20) return 'Excellent';
    if (numScore <= 40) return 'Good';
    if (numScore <= 60) return 'Fair';
    if (numScore <= 80) return 'Poor';
    return 'Critical';
  };

  // Handle settings save
  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setShowSettings(false);
    // Auto-retry connection
    setTimeout(() => {
      fetchClusterData();
    }, 100);
  };

  // ✅ PHASE 3: Get current API URL for display
  const getCurrentApiUrl = () => {
    return buildApiUrl('optimusdb', `/${settings.apiContext}/agent/status`, settings.nodeId);
  };

  // Render loading state
  if (loading && !clusterData && !error) {
    return (
      <div className="cluster-topology-page">
        <div className="resource-header">
          <div className="header-section">
            <h1 className="header-title">OptimusDB Cluster Topology</h1>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading cluster data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !clusterData) {
    return (
      <div className="cluster-topology-page">
        <div className="resource-header">
          <div className="header-section">
            <h1 className="header-title">OptimusDB Cluster Topology</h1>
            <button
              className="btn btn-primary btn-sm settings-button"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
        <div className="error-container">
          <div className="alert alert-danger">
            <strong>Connection Error:</strong> {error}
            <br />
            <div className="error-actions">
              <button className="btn btn-primary" onClick={fetchClusterData}>
                🔄 Retry Connection
              </button>
              <button className="btn btn-default" onClick={() => setShowSettings(true)}>
                ⚙️ Open Settings
              </button>
            </div>
          </div>
          <div className="error-help">
            <h4>Troubleshooting:</h4>
            <ul>
              <li>Current API URL: <code>{getCurrentApiUrl()}</code></li>
              <li>Current Node: <strong>OptimusDB Node {settings.nodeId}</strong></li>
              <li>Check OptimusDB is running</li>
              <li>Try a different node in Settings</li>
              <li>Check for CORS issues in browser console (F12)</li>
            </ul>
            <div className="quick-test">
              <strong>Quick Test:</strong>
              <pre>curl {getCurrentApiUrl()}</pre>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="cluster-topology-page">
      {/* Header */}
      <div className="resource-header">
        <div className="header-section">
          <h1 className="header-title">
            OptimusDB Cluster Topology
            <span className={`status-badge ${connected ? 'online' : 'offline'}`}>
              {connected ? '● Connected' : '○ Disconnected'}
            </span>
          </h1>
          <div className="header-buttons">
            <button
              className="btn btn-default btn-sm refresh-button"
              onClick={fetchClusterData}
              disabled={loading}
            >
              {loading ? '⟳ Refreshing...' : '↻ Refresh Now'}
            </button>
            <button
              className="btn btn-default btn-sm settings-button"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
        <div className="header-subtitle">
          Decentralized Data Catalog - Real-time Visualization
          <span className="api-endpoint">Node: OptimusDB {settings.nodeId}</span>
        </div>
      </div>

      {clusterData && (
        <>
          {/* Cluster Statistics */}
          <div className="cluster-stats">
            <div className="stat-card">
              <div className="stat-value">{clusterData.cluster.total_peers}</div>
              <div className="stat-label">Total Peers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{clusterData.cluster.coordinators}</div>
              <div className="stat-label">Coordinators</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{clusterData.cluster.followers}</div>
              <div className="stat-label">Followers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{clusterData.cluster.connected_peers}</div>
              <div className="stat-label">Connected</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{clusterData.election.current_term}</div>
              <div className="stat-label">Election Term</div>
            </div>
          </div>

          {/* Election Information */}
          <div className="election-section">
            <h2 className="section-title">🗳️ Election State</h2>
            <div className="election-info">
              <div className="election-card">
                <div className="label">Current Coordinator</div>
                <div className="value" title={clusterData.election.current_leader}>
                  {clusterData.election.current_leader.substring(0, 12)}...
                </div>
              </div>
              <div className="election-card">
                <div className="label">Your Role</div>
                <div className="value">{clusterData.agent.role}</div>
              </div>
              <div className="election-card">
                <div className="label">Your Utilization</div>
                <div className="value">
                  {clusterData.agent.health.score}% ({getHealthLabel(clusterData.agent.health.score)})
                </div>
              </div>
              <div className="election-card">
                <div className="label">Last Election</div>
                <div className="value">
                  {formatTime(clusterData.election.last_election_time)}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="main-grid">
            {/* Topology Visualization */}
            <div className="topology-section">
              <h2 className="section-title">🌐 Network Topology</h2>
              <TopologyCanvas
                agent={clusterData.agent}
                peers={clusterData.peers}
                currentLeader={clusterData.election.current_leader}
              />
            </div>

            {/* Agent Cards */}
            <div className="agents-section">
              <h2 className="section-title">🤖 Agent Details</h2>
              <div className="agents-container">
                {/* Self Card */}
                <AgentCard
                  peerId={clusterData.agent.peer_id}
                  role={clusterData.agent.role}
                  isLeader={clusterData.agent.is_current_leader}
                  health={clusterData.agent.health}
                  metrics={clusterData.agent.metrics}
                  isSelf={true}
                  connected={true}
                />

                {/* Peer Cards */}
                {clusterData.peers && clusterData.peers.length > 0 ? (
                  clusterData.peers.map((peer) => (
                    <AgentCard
                      key={peer.peer_id}
                      peerId={peer.peer_id}
                      role={peer.role}
                      isLeader={peer.is_leader}
                      health={peer.health}
                      metrics={peer.metrics}
                      isSelf={false}
                      connected={peer.connected}
                    />
                  ))
                ) : (
                  <div className="no-peers">
                    No other peers discovered yet. Start more OptimusDB agents to see them here.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Auto-refresh Info */}
          <div className="refresh-info">
            🔄 Auto-refresh: Next update in <strong>{refreshTimer}</strong> seconds
            <span className="separator">|</span>
            Last updated: {formatTime(clusterData.timestamp)}
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

// ==============================================================================
// Settings Modal Component - PHASE 3 UPDATED
// ==============================================================================

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleTest = async () => {
    try {
      const apiUrl = buildApiUrl('optimusdb', `/${localSettings.apiContext}/agent/status`, localSettings.nodeId);
      console.log(`Testing connection to: ${apiUrl}`);

      const response = await fetch(apiUrl);
      if (response.ok) {
        alert(`✅ Connection successful to Node ${localSettings.nodeId}!`);
      } else {
        alert(`❌ Connection failed: HTTP ${response.status}`);
      }
    } catch (err) {
      alert(`❌ Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // ✅ PHASE 3: Preview current URL
  const previewUrl = buildApiUrl('optimusdb', `/${localSettings.apiContext}/agent/status`, localSettings.nodeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Cluster Topology Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Node Selection */}
          <div className="form-group">
            <label>OptimusDB Node</label>
            <select
              className="form-control"
              value={localSettings.nodeId}
              onChange={(e) => setLocalSettings({ ...localSettings, nodeId: Number(e.target.value) })}
            >
              <option value="1">Node 1 (Primary)</option>
              <option value="2">Node 2</option>
              <option value="3">Node 3</option>
              <option value="4">Node 4</option>
              <option value="5">Node 5</option>
              <option value="6">Node 6</option>
              <option value="7">Node 7</option>
              <option value="8">Node 8</option>
            </select>
            <small className="form-text">Select which OptimusDB node to query</small>
          </div>

          {/* API Context */}
          <div className="form-group">
            <label>API Context</label>
            <input
              type="text"
              className="form-control"
              value={localSettings.apiContext}
              onChange={(e) => setLocalSettings({ ...localSettings, apiContext: e.target.value })}
              placeholder="swarmkb"
            />
            <small className="form-text">API context path (usually "swarmkb")</small>
          </div>

          {/* Refresh Interval */}
          <div className="form-group">
            <label>Auto-Refresh Interval</label>
            <select
              className="form-control"
              value={localSettings.refreshInterval}
              onChange={(e) => setLocalSettings({ ...localSettings, refreshInterval: Number(e.target.value) })}
            >
              <option value="60000">1 minute</option>
              <option value="180000">3 minutes</option>
              <option value="300000">5 minutes (recommended)</option>
              <option value="600000">10 minutes</option>
            </select>
            <small className="form-text">How often to refresh cluster data</small>
          </div>

          {/* Full Endpoint Preview */}
          <div className="endpoint-preview">
            <strong>Full Endpoint:</strong>
            <code>{previewUrl}</code>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-default" onClick={handleTest}>
            🧪 Test Connection
          </button>
          <button className="btn btn-default" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save & Retry
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// Topology Canvas Sub-Component - FULL INTERACTIVE VERSION (UNCHANGED)
// Features: Drag nodes, Zoom/Pan, Link highlighting, Names & IPs
// ==============================================================================

interface TopologyCanvasProps {
  agent: AgentInfo;
  peers: PeerNode[];
  currentLeader: string;
}

const TopologyCanvas: React.FC<TopologyCanvasProps> = ({ agent, peers, currentLeader }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // Drag state
  const [draggedNode, setDraggedNode] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = React.useState<Map<string, { x: number; y: number }>>(new Map());

  // Zoom & Pan state
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 500,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate initial node positions
  const nodes = React.useMemo(() => {
    const allNodes = [
      {
        id: agent.peer_id,
        label: 'YOU',
        role: agent.role,
        isLeader: agent.is_current_leader,
        health: parseFloat(agent.health.score || '0'),
        isSelf: true,
        addresses: agent.addresses || [],
        x: 0,
        y: 0,
      },
      ...peers.map((peer) => ({
        id: peer.peer_id,
        label: peer.peer_id.substring(0, 8),
        role: peer.role,
        isLeader: peer.is_leader,
        health: parseFloat(peer.health.score || '0'),
        isSelf: false,
        addresses: [], // Peers don't have addresses in the current API
        x: 0,
        y: 0,
      })),
    ];

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

    // Position coordinator in CENTER, followers in CIRCLE
    const coordinator = allNodes.find(n => n.isLeader);
    const followers = allNodes.filter(n => !n.isLeader);

    if (coordinator) {
      // Check if we have a custom position for coordinator
      const customPos = nodePositions.get(coordinator.id);
      if (customPos) {
        coordinator.x = customPos.x;
        coordinator.y = customPos.y;
      } else {
        coordinator.x = centerX;
        coordinator.y = centerY;
      }
    }

    followers.forEach((node, i) => {
      // Check if we have a custom position for this node
      const customPos = nodePositions.get(node.id);
      if (customPos) {
        node.x = customPos.x;
        node.y = customPos.y;
      } else {
        const angle = (2 * Math.PI * i) / followers.length;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
      }
    });

    return allNodes;
  }, [agent, peers, dimensions, nodePositions]);

  // FULL MESH TOPOLOGY - Every node connects to every other node
  const links = React.useMemo(() => {
    const meshLinks: Array<{ source: any; target: any; id: string }> = [];

    // Create bidirectional links between ALL nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        meshLinks.push({
          source: nodes[i],
          target: nodes[j],
          id: `${nodes[i].id}-${nodes[j].id}`,
        });
        meshLinks.push({
          source: nodes[j],
          target: nodes[i],
          id: `${nodes[j].id}-${nodes[i].id}`,
        });
      }
    }

    return meshLinks;
  }, [nodes]);

  // Calculate curve path for bidirectional links
  const getLinkPath = (source: any, target: any, reverse: boolean = false) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);

    // Add slight curve to distinguish bidirectional links
    const curve = reverse ? dr * 0.3 : dr * 0.2;

    return `M${source.x},${source.y}A${dr},${curve} 0 0,${reverse ? 0 : 1} ${target.x},${target.y}`;
  };

  // Get IP address from addresses array
  const getIpAddress = (addresses: string[]): string => {
    if (!addresses || addresses.length === 0) return 'N/A';

    // Try to find an IP address in the multiaddr format
    // e.g., "/ip4/172.18.0.2/tcp/8089" -> "172.18.0.2"
    for (const addr of addresses) {
      const ipMatch = addr.match(/\/ip4\/([0-9.]+)/);
      if (ipMatch) return ipMatch[1];

      const ip6Match = addr.match(/\/ip6\/([0-9a-f:]+)/);
      if (ip6Match) return ip6Match[1];
    }

    // Fallback: return first address (truncated)
    return addresses[0].substring(0, 20) + '...';
  };

  // ============================================
  // DRAG HANDLERS
  // ============================================

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggedNode(nodeId);
      setDragOffset({
        x: svgP.x - node.x,
        y: svgP.y - node.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    // Handle node dragging
    if (draggedNode) {
      const newX = svgP.x - dragOffset.x;
      const newY = svgP.y - dragOffset.y;

      setNodePositions(prev => {
        const newMap = new Map(prev);
        newMap.set(draggedNode, { x: newX, y: newY });
        return newMap;
      });
      return;
    }

    // Handle panning
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prevPan => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  // ============================================
  // PAN HANDLERS
  // ============================================

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (draggedNode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  // ============================================
  // ZOOM HANDLER
  // ============================================

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.max(0.3, Math.min(3, prevZoom * delta)));
  };

  // ============================================
  // NODE CLICK HANDLER
  // ============================================

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  // ============================================
  // RESET LAYOUT
  // ============================================

  const handleResetLayout = () => {
    setNodePositions(new Map());
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Check if link is connected to selected node
  const isLinkHighlighted = (link: any) => {
    if (!selectedNode) return false;
    return link.source.id === selectedNode || link.target.id === selectedNode;
  };

  return (
    <div ref={containerRef} className="topology-canvas-container">
      {/* Controls */}
      <div className="topology-controls">
        <button
          className="topology-control-btn"
          onClick={handleResetLayout}
          title="Reset layout and zoom"
        >
          🔄 Reset
        </button>
        <span className="topology-zoom-indicator">
          Zoom: {(zoom * 100).toFixed(0)}%
        </span>
        <span className="topology-hint">
          💡 Drag nodes • Scroll to zoom • Drag background to pan • Click node to highlight
        </span>
      </div>

      <svg
        ref={svgRef}
        className="topology-canvas"
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleBackgroundMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab' }}
      >
        {/* Transform group for zoom and pan */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Define arrow markers */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#667eea" opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-highlighted"
              markerWidth="12"
              markerHeight="12"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" opacity="1" />
            </marker>
          </defs>

          {/* Draw all links with arrows */}
          {links.map((link, i) => {
            const isReverse = i % 2 === 1;
            const isHighlighted = isLinkHighlighted(link);

            return (
              <path
                key={link.id}
                className="topology-link"
                d={getLinkPath(link.source, link.target, isReverse)}
                stroke={isHighlighted ? '#f59e0b' : '#667eea'}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeOpacity={isHighlighted ? 0.8 : 0.4}
                fill="none"
                markerEnd={isHighlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                style={{ transition: 'all 0.2s' }}
              />
            );
          })}

          {/* Draw nodes */}
          {nodes.map((node) => {
            let fillColor = '#3b82f6'; // Default blue
            if (node.isLeader) fillColor = '#f59e0b'; // Orange for leader
            if (node.isSelf) fillColor = '#10b981'; // Green for YOU

            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const radius = node.isLeader ? 40 : 30;
            const ipAddress = getIpAddress(node.addresses);

            return (
              <g
                key={node.id}
                className="topology-node"
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: draggedNode === node.id ? 'grabbing' : 'grab' }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node circle */}
                <circle
                  r={isHovered || isSelected ? radius + 5 : radius}
                  fill={fillColor}
                  stroke="#fff"
                  strokeWidth="3"
                  style={{ transition: 'r 0.2s' }}
                />

                {/* Node label (inside circle) */}
                <text textAnchor="middle" dy="5" fill="#fff" fontSize="12" fontWeight="bold">
                  {node.label}
                </text>

                {/* Peer ID (below circle) */}
                <text textAnchor="middle" dy="50" fill="#333" fontSize="9" fontWeight="600">
                  {node.id.substring(0, 12)}...
                </text>

                {/* Role label */}
                <text textAnchor="middle" dy="63" fill="#555" fontSize="9">
                  {node.role}
                </text>

                {/* IP Address */}
                {node.isSelf && (
                  <text textAnchor="middle" dy="76" fill="#10b981" fontSize="8" fontWeight="500">
                    {ipAddress}
                  </text>
                )}

                {/* Utilization score (FIXED label) */}
                <text textAnchor="middle" dy={node.isSelf ? 89 : 76} fill="#666" fontSize="9">
                  📊 {node.health.toFixed(1)}%
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x="-100"
                      y="-110"
                      width="200"
                      height="80"
                      fill="rgba(0,0,0,0.9)"
                      rx="6"
                      stroke="#667eea"
                      strokeWidth="2"
                    />
                    <text textAnchor="middle" dy="-85" fill="#fff" fontSize="11" fontWeight="bold">
                      {node.isSelf ? 'YOU' : node.id.substring(0, 16)}
                    </text>
                    <text textAnchor="middle" dy="-70" fill="#10b981" fontSize="10">
                      Role: {node.role} {node.isLeader && '⭐'}
                    </text>
                    <text textAnchor="middle" dy="-55" fill="#fbbf24" fontSize="10">
                      Utilization: {node.health.toFixed(1)}%
                    </text>
                    {node.isSelf && (
                      <text textAnchor="middle" dy="-40" fill="#60a5fa" fontSize="9">
                        IP: {ipAddress}
                      </text>
                    )}
                    <text textAnchor="middle" dy="-25" fill="#9ca3af" fontSize="8" fontStyle="italic">
                      {draggedNode === node.id ? '🖱️ Dragging...' : 'Click to highlight • Drag to move'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// ==============================================================================
// Agent Card Sub-Component - ✅ FIXED UTILIZATION LOGIC
// ==============================================================================

interface AgentCardProps {
  peerId: string;
  role: string;
  isLeader: boolean;
  health: NodeHealth;
  metrics: NodeMetrics;
  isSelf: boolean;
  connected: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
                                               peerId,
                                               role,
                                               isLeader,
                                               health,
                                               metrics,
                                               isSelf,
                                               connected,
                                             }) => {
  // ✅ FIXED: Helper function - get health class (UTILIZATION-based)
  const getHealthClass = (score: string): string => {
    const numScore = parseFloat(score || '0');

    // ✅ FIXED: Inverted logic for utilization (lower is better!)
    if (numScore <= 20) return 'excellent';  // 0-20% utilization = Excellent
    if (numScore <= 40) return 'good';       // 20-40% utilization = Good
    if (numScore <= 60) return 'fair';       // 40-60% utilization = Fair
    if (numScore <= 80) return 'poor';       // 60-80% utilization = Poor
    return 'critical';                        // 80-100% utilization = Critical
  };

  // ✅ FIXED: Helper function - get health label
  const getHealthLabel = (score: string): string => {
    const numScore = parseFloat(score || '0');

    if (numScore <= 20) return 'Excellent';
    if (numScore <= 40) return 'Good';
    if (numScore <= 60) return 'Fair';
    if (numScore <= 80) return 'Poor';
    return 'Critical';
  };

  const roleClass = isLeader ? 'coordinator' : 'follower';
  const healthClass = getHealthClass(health.score);
  const healthScore = parseFloat(health.score || '0');
  const healthLabel = getHealthLabel(health.score);

  return (
    <div className={`agent-card ${roleClass}`}>
      <div className="agent-header">
        <span className={`role-badge role-${roleClass}`}>
          {isLeader ? '⭐ Coordinator' : '➡️ Follower'}
        </span>
        {isSelf && <span className="self-badge">YOU</span>}
        {!connected && <span className="disconnected-badge">Disconnected</span>}
      </div>

      <div className="agent-peer-id" title={peerId}>
        <strong>Peer ID:</strong> {peerId.substring(0, 16)}...
      </div>

      <div className="health-bar-container">
        <div
          className={`health-bar health-${healthClass}`}
          style={{ width: `${healthScore}%` }}
        >
          {healthLabel} - {health.score}% Utilization
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">💻 CPU</span>
          <span className="metric-value">{health.cpu_usage || 'N/A'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">🧠 Memory</span>
          <span className="metric-value">{health.memory_used || 'N/A'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">📀 Disk Read</span>
          <span className="metric-value">{health.disk_read || 'N/A'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">📀 Disk Write</span>
          <span className="metric-value">{health.disk_write || 'N/A'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">⚡ Latency</span>
          <span className="metric-value">{health.latency || 'N/A'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">👑 Leadership</span>
          <span className="metric-value">{metrics.leadership_count || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default ClusterTopologyPage;
