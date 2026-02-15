// ==============================================================================
// FILE: ClusterTopologyPage/index.tsx
// ENHANCED: Tab system + Communication Mesh visualization
// ==============================================================================
// PRESERVES: All existing topology, election, agent card functionality
// ADDS: Tab navigation, Communication Mesh tab with live API data
// NEW ENDPOINTS: /debug/optimusdb/mesh, /agent/inventory
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { buildApiUrl, getAvailableNodes } from 'config/apiConfig';
import './styles.scss';

// ==============================================================================
// TypeScript Interfaces — EXISTING (unchanged)
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
  nodeId: number;
  apiContext: string;
  refreshInterval: number;
}

// ==============================================================================
// TypeScript Interfaces — NEW (Communication Mesh)
// ==============================================================================

interface OrbitDBStore {
  name: string;
  type: string;      // "docstore" | "eventlog"
  address?: string;
  initialized: boolean;
  access_controller?: string;
  entry_count?: number;
}

interface MeshGossipSub {
  mesh_peers: number;
  topic_subscribers: number;
}

interface MeshLibP2P {
  connected_peers: number;
  addresses: string[];
}

interface MeshHealthInfo {
  coverage?: string;
  coverage_pct?: number;
  replication_capability?: boolean;
  can_replicate?: boolean;
  missing_connections?: number;
  missing?: number;
  status: string;  // "EXCELLENT" | "GOOD" | "POOR"
}

interface MeshDiscovery {
  discovered_peers?: string[];
  discovered?: number;
  peers?: string[];
}

interface MeshDiagnostics {
  system_status?: string;
  // API may also return a string[] of diagnostic lines
  [key: string]: any;
}

/** Response from /debug/optimusdb/mesh */
interface MeshData {
  orbitdb_stores: OrbitDBStore[] | Record<string, { initialized: boolean; type: string | null; address?: string; access_controller?: string; entry_count?: number }>;
  gossipsub: MeshGossipSub;
  libp2p: MeshLibP2P;
  mesh_health: MeshHealthInfo;
  discovery: MeshDiscovery;
  diagnostics: MeshDiagnostics;
}

/** Normalize orbitdb_stores from API (may be object or array) into a flat array */
function normalizeOrbitDBStores(
  stores: MeshData['orbitdb_stores']
): OrbitDBStore[] {
  if (!stores) return [];
  if (Array.isArray(stores)) return stores;
  // Object format: { storeName: { initialized, type, ... } }
  return Object.entries(stores).map(([name, info]) => ({
    name,
    type: info.type || 'unknown',
    initialized: info.initialized ?? false,
    address: info.address,
    access_controller: info.access_controller,
    entry_count: info.entry_count,
  }));
}

interface RDBMSTable {
  name: string;
  rows: number;
}

interface RDBMSDatabase {
  name: string;
  file: string;
  size: string;
  tables: RDBMSTable[];
}

interface InventoryOrbitDBStore {
  name: string;
  type: string;
  access: string;
  replicated: boolean;
  entry_count?: number;
}

interface InventoryService {
  name: string;
  type: string;
  description: string;
  status: string;
}

interface InventoryQueryCache {
  max_entries: number;
  hit_rate: string;
}

/** Response from /agent/inventory */
interface InventoryData {
  rdbms_databases: RDBMSDatabase[];
  orbitdb_stores: {
    active: InventoryOrbitDBStore[];
    planned: Array<{ name: string; description: string }>;
  };
  services: InventoryService[];
  query_cache: InventoryQueryCache;
}

/** Per-agent aggregated data for the Communication Mesh */
interface AgentMeshInfo {
  nodeId: number;
  name: string;
  peerId: string;
  role: string;
  isLeader: boolean;
  ip: string;
  httpPort: string;
  mesh?: MeshData;
  inventory?: InventoryData;
  status?: ClusterData;
  fetchError?: string;
}

// ==============================================================================
// Tab definitions
// ==============================================================================

type TabKey = 'topology' | 'mesh';

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'topology', label: 'Network Topology', icon: '🌐' },
  { key: 'mesh', label: 'Communication Mesh', icon: '🔗' },
];

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
  const [activeTab, setActiveTab] = useState<TabKey>('topology');

  // Communication Mesh state
  const [agentMeshData, setAgentMeshData] = useState<AgentMeshInfo[]>([]);
  const [meshLoading, setMeshLoading] = useState<boolean>(false);

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('optimusdb_cluster_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      nodeId: 1,
      apiContext: 'swarmkb',
      refreshInterval: 300000,
    };
  });

  useEffect(() => {
    localStorage.setItem('optimusdb_cluster_settings', JSON.stringify(settings));
  }, [settings]);

  // ── Fetch cluster data (existing) ──
  const fetchClusterData = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = buildApiUrl('optimusdb', `/${settings.apiContext}/agent/status`, settings.nodeId);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

  // ── Fetch Communication Mesh data from ALL agents ──
  const fetchMeshData = useCallback(async () => {
    if (!clusterData) return;

    setMeshLoading(true);
    try {
      // Determine how many agents we have from cluster info
      const totalPeers = clusterData.cluster.total_peers || 1;
      const agentPromises: Promise<AgentMeshInfo>[] = [];

      for (let nodeId = 1; nodeId <= totalPeers; nodeId++) {
        agentPromises.push(
          (async () => {
            const info: AgentMeshInfo = {
              nodeId,
              name: `OptimusDB-${nodeId}`,
              peerId: '',
              role: 'Unknown',
              isLeader: false,
              ip: '',
              httpPort: '8089',
            };

            try {
              // Fetch status
              const statusUrl = buildApiUrl('optimusdb', `/${settings.apiContext}/agent/status`, nodeId);
              const statusRes = await fetch(statusUrl);
              if (statusRes.ok) {
                const statusData: ClusterData = await statusRes.json();
                info.status = statusData;
                info.peerId = statusData.agent.peer_id;
                info.role = statusData.agent.role;
                info.isLeader = statusData.agent.is_current_leader;
                // Extract IP from addresses
                if (statusData.agent.addresses && statusData.agent.addresses.length > 0) {
                  for (const addr of statusData.agent.addresses) {
                    const ipMatch = addr.match(/\/ip4\/([0-9.]+)/);
                    if (ipMatch) { info.ip = ipMatch[1]; break; }
                  }
                }
                info.httpPort = statusData.configuration?.http_port || '8089';
              }
            } catch { /* continue */ }

            try {
              // Fetch mesh debug
              const meshUrl = buildApiUrl('optimusdb', `/${settings.apiContext}/debug/optimusdb/mesh`, nodeId);
              const meshRes = await fetch(meshUrl);
              if (meshRes.ok) {
                const meshJson = await meshRes.json();
                // The response might be the mesh data directly, or wrapped
                info.mesh = meshJson;
                // Ensure orbitdb_stores is normalized for downstream use
                if (meshJson.orbitdb_stores && !Array.isArray(meshJson.orbitdb_stores)) {
                  // Keep raw format — normalizeOrbitDBStores() handles conversion at render time
                }
              }
            } catch { /* continue */ }

            try {
              // Fetch inventory
              const invUrl = buildApiUrl('optimusdb', `/${settings.apiContext}/agent/inventory`, nodeId);
              const invRes = await fetch(invUrl);
              if (invRes.ok) {
                info.inventory = await invRes.json();
              }
            } catch { /* continue — endpoint may not exist yet */ }

            return info;
          })()
        );
      }

      const results = await Promise.all(agentPromises);
      setAgentMeshData(results);
    } catch (err) {
      console.error('Failed to fetch mesh data:', err);
    } finally {
      setMeshLoading(false);
    }
  }, [clusterData, settings]);

  // Fetch mesh data when tab becomes active or cluster data changes
  useEffect(() => {
    if (activeTab === 'mesh' && clusterData) {
      fetchMeshData();
    }
  }, [activeTab, clusterData, fetchMeshData]);

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

  // Helper functions (unchanged)
  const formatTime = (timestamp: string): string => {
    if (!timestamp || timestamp === 'Never') return 'Never';
    try { return new Date(timestamp).toLocaleString(); } catch { return timestamp; }
  };

  const getHealthClass = (score: string): string => {
    const numScore = parseFloat(score || '0');
    if (numScore <= 20) return 'excellent';
    if (numScore <= 40) return 'good';
    if (numScore <= 60) return 'fair';
    if (numScore <= 80) return 'poor';
    return 'critical';
  };

  const getHealthLabel = (score: string): string => {
    const numScore = parseFloat(score || '0');
    if (numScore <= 20) return 'Excellent';
    if (numScore <= 40) return 'Good';
    if (numScore <= 60) return 'Fair';
    if (numScore <= 80) return 'Poor';
    return 'Critical';
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setShowSettings(false);
    setTimeout(() => fetchClusterData(), 100);
  };

  const getCurrentApiUrl = () => {
    return buildApiUrl('optimusdb', `/${settings.apiContext}/agent/status`, settings.nodeId);
  };

  // ── Loading state ──
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

  // ── Error state ──
  if (error && !clusterData) {
    return (
      <div className="cluster-topology-page">
        <div className="resource-header">
          <div className="header-section">
            <h1 className="header-title">OptimusDB Cluster Topology</h1>
            <button className="btn btn-primary btn-sm settings-button" onClick={() => setShowSettings(true)}>
              ⚙️ Settings
            </button>
          </div>
        </div>
        <div className="error-container">
          <div className="alert alert-danger">
            <strong>Connection Error:</strong> {error}
            <br />
            <div className="error-actions">
              <button className="btn btn-primary" onClick={fetchClusterData}>🔄 Retry Connection</button>
              <button className="btn btn-default" onClick={() => setShowSettings(true)}>⚙️ Open Settings</button>
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
        {showSettings && (
          <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
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
            <button className="btn btn-default btn-sm refresh-button" onClick={() => { fetchClusterData(); if (activeTab === 'mesh') fetchMeshData(); }} disabled={loading}>
              {loading ? '⟳ Refreshing...' : '↻ Refresh Now'}
            </button>
            <button className="btn btn-default btn-sm settings-button" onClick={() => setShowSettings(true)}>
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
          {/* Cluster Statistics — always visible */}
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

          {/* Tab Navigation */}
          <div className="topology-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`topology-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ══════════ TAB: Network Topology (existing) ══════════ */}
          {activeTab === 'topology' && (
            <>
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
                    <div className="value">{formatTime(clusterData.election.last_election_time)}</div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="main-grid">
                <div className="topology-section">
                  <h2 className="section-title">🌐 Network Topology</h2>
                  <TopologyCanvas
                    agent={clusterData.agent}
                    peers={clusterData.peers}
                    currentLeader={clusterData.election.current_leader}
                  />
                </div>
                <div className="agents-section">
                  <h2 className="section-title">🤖 Agent Details</h2>
                  <div className="agents-container">
                    <AgentCard
                      peerId={clusterData.agent.peer_id}
                      role={clusterData.agent.role}
                      isLeader={clusterData.agent.is_current_leader}
                      health={clusterData.agent.health}
                      metrics={clusterData.agent.metrics}
                      isSelf={true}
                      connected={true}
                    />
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
            </>
          )}

          {/* ══════════ TAB: Communication Mesh (NEW) ══════════ */}
          {activeTab === 'mesh' && (
            <CommunicationMesh
              agents={agentMeshData}
              loading={meshLoading}
              onRefresh={fetchMeshData}
              settings={settings}
            />
          )}

          {/* Auto-refresh Info */}
          <div className="refresh-info">
            🔄 Auto-refresh: Next update in <strong>{refreshTimer}</strong> seconds
            <span className="separator">|</span>
            Last updated: {formatTime(clusterData.timestamp)}
          </div>
        </>
      )}

      {showSettings && (
        <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

// ==============================================================================
// Communication Mesh Sub-Component (NEW)
// ==============================================================================

interface CommunicationMeshProps {
  agents: AgentMeshInfo[];
  loading: boolean;
  onRefresh: () => void;
  settings: Settings;
}

const CommunicationMesh: React.FC<CommunicationMeshProps> = ({ agents, loading, onRefresh, settings }) => {
  const [viewMode, setViewMode] = useState<'full' | 'internal' | 'external'>('full');
  const [showPlanned, setShowPlanned] = useState(false);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.3));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleFitToView = () => { setZoom(0.85); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.max(0.3, Math.min(4, z * delta)));
  }, []);

  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePanStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-pan')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOrigin({ ...pan });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panOrigin.x + (e.clientX - panStart.x) / zoom,
      y: panOrigin.y + (e.clientY - panStart.y) / zoom,
    });
  };

  const handlePanEnd = () => setIsPanning(false);

  // ── Derive display data from agents ──

  // Build agent positions for SVG
  const agentPositions = useMemo(() => {
    if (agents.length === 0) return [];
    const spacing = 330;
    const startX = 270;
    return agents.map((agent, i) => ({
      ...agent,
      cx: startX + i * spacing,
    }));
  }, [agents]);

  // Aggregate store info from first agent that has inventory data
  const inventoryAgent = agents.find((a) => a.inventory);
  const meshAgent = agents.find((a) => a.mesh);

  // Build CRUD stores list from mesh or inventory data
  // ALWAYS returns { active: InventoryOrbitDBStore[], planned: Array<{name,description}> }
  const crudStores = useMemo(() => {
    const empty = { active: [] as InventoryOrbitDBStore[], planned: [] as Array<{ name: string; description: string }> };

    // Try inventory data first
    if (inventoryAgent?.inventory?.orbitdb_stores) {
      const raw = inventoryAgent.inventory.orbitdb_stores;
      // If it already has { active: [...], planned: [...] } structure, use it
      if (raw.active && Array.isArray(raw.active)) {
        return {
          active: raw.active as InventoryOrbitDBStore[],
          planned: Array.isArray(raw.planned) ? raw.planned : [],
        };
      }
      // If it's an array of stores, wrap it
      if (Array.isArray(raw)) {
        return {
          active: raw.map((s: any) => ({
            name: s.name || 'unknown',
            type: s.type || 'unknown',
            access: s.access || 'unknown',
            replicated: s.replicated ?? s.initialized ?? false,
            entry_count: s.entry_count,
          })),
          planned: [],
        };
      }
      // If it's an object map like { storeName: { initialized, type } }, normalize it
      if (typeof raw === 'object') {
        const normalized = normalizeOrbitDBStores(raw as any);
        return {
          active: normalized.map((s) => ({
            name: s.name,
            type: s.type,
            access: 'unknown',
            replicated: s.initialized,
            entry_count: s.entry_count,
          })),
          planned: [],
        };
      }
    }

    // Fallback from mesh data — normalize object-or-array format
    if (meshAgent?.mesh?.orbitdb_stores) {
      const normalized = normalizeOrbitDBStores(meshAgent.mesh.orbitdb_stores);
      return {
        active: normalized.map((s) => ({
          name: s.name,
          type: s.type,
          access: 'unknown',
          replicated: s.initialized,
          entry_count: s.entry_count,
        })),
        planned: [],
      };
    }

    return empty;
  }, [inventoryAgent, meshAgent]);

  // Build RDBMS data
  const rdbmsDatabases = useMemo(() => {
    if (inventoryAgent?.inventory?.rdbms_databases) {
      return inventoryAgent.inventory.rdbms_databases;
    }
    return [] as RDBMSDatabase[];
  }, [inventoryAgent]);

  // Services
  const services = useMemo(() => {
    if (inventoryAgent?.inventory?.services) {
      return inventoryAgent.inventory.services;
    }
    return [] as InventoryService[];
  }, [inventoryAgent]);

  // Loading state
  if (loading && agents.length === 0) {
    return (
      <div className="mesh-loading">
        <div className="loading-spinner" />
        <p>Loading Communication Mesh data from all agents...</p>
      </div>
    );
  }

  // Error state — catches render issues from unexpected API data shapes
  if (renderError) {
    return (
      <div className="mesh-loading">
        <p style={{ color: '#dc2626' }}>⚠️ Error rendering Communication Mesh: {renderError}</p>
        <button className="btn btn-default btn-sm" onClick={() => { setRenderError(null); onRefresh(); }}>🔄 Retry</button>
      </div>
    );
  }

  // Derive viewBox height based on content
  const hasExternalZone = viewMode === 'full' || viewMode === 'external';
  const hasInternalData = viewMode === 'full' || viewMode === 'internal';
  const agentY = hasExternalZone ? 320 : 120;
  const svgHeight = hasInternalData ? (agentY + 280) : (agentY + 80);

  const svgWidth = Math.max(1200, agentPositions.length * 330 + 200);
  const svgVB = `0 0 ${svgWidth} ${svgHeight}`;

  return (
    <div className="communication-mesh">
      {/* Mesh Header */}
      <div className="mesh-header">
        <div className="mesh-header-info">
          <h2 className="section-title">🔗 Communication Mesh</h2>
          <p className="mesh-subtitle">
            LibP2P connections, protocols, data stores, and external interfaces across the decentralized middleware
          </p>
        </div>
        <div className="mesh-header-controls">
          <div className="mesh-view-toggle">
            {(['full', 'internal', 'external'] as const).map((m) => (
              <button
                key={m}
                className={`mesh-vt-btn ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m === 'full' ? '🌐 Full View' : m === 'internal' ? '🔗 Internal' : '🌍 External'}
              </button>
            ))}
          </div>
          <button className="btn btn-default btn-sm" onClick={onRefresh} disabled={loading}>
            {loading ? '⟳ Loading...' : '↻ Refresh Mesh'}
          </button>
        </div>
      </div>

      {/* SVG Mesh Visualization */}
      <div className="mesh-svg-wrapper">
        {/* Zoom Controls */}
        <div className="mesh-zoom-controls">
          <button className="mesh-zoom-btn" onClick={handleZoomIn} title="Zoom In">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <button className="mesh-zoom-btn" onClick={handleZoomOut} title="Zoom Out">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <div className="mesh-zoom-level">{Math.round(zoom * 100)}%</div>
          <button className="mesh-zoom-btn text" onClick={handleZoomReset} title="Reset">1:1</button>
          <button className="mesh-zoom-btn text" onClick={handleFitToView} title="Fit">Fit</button>
        </div>
        <div className="mesh-zoom-hint">Scroll to zoom · Drag to pan</div>

        <div
          ref={svgContainerRef}
          className="mesh-svg-container"
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <svg viewBox={svgVB} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <pattern id="meshGridP" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e8ecf1" strokeWidth="0.5" />
              </pattern>
              <filter id="meshDropShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.07" />
              </filter>
              <filter id="meshSoftGlow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="meshArr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" opacity="0.5" />
              </marker>
              <marker id="meshArrExt" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#059669" opacity="0.6" />
              </marker>
              <marker id="meshArrGossip" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#d97706" opacity="0.5" />
              </marker>
            </defs>

            {/* Background */}
            <rect width={svgWidth} height={svgHeight} fill="#ffffff" rx="10" />
            <rect width={svgWidth} height={svgHeight} fill="url(#meshGridP)" rx="10" />

            {/* Transform group for zoom + pan */}
            <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>

              {/* ── EXTERNAL ZONE ── */}
              {hasExternalZone && (
                <g>
                  <rect x="20" y="14" width="146" height="26" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                  <text x="93" y="31" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="700">🌍 EXTERNAL ZONE</text>

                  {/* External clients */}
                  <g transform="translate(200, 60)">
                    <rect x="-72" y="-24" width="144" height="48" rx="10" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                    <text textAnchor="middle" dy="-4" fill="#059669" fontSize="10" fontWeight="700">🖥️ OptimusDDC</text>
                    <text textAnchor="middle" dy="10" fill="#6b7280" fontSize="8">Frontend UI</text>
                  </g>
                  <g transform="translate(430, 60)">
                    <rect x="-72" y="-24" width="144" height="48" rx="10" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                    <text textAnchor="middle" dy="-4" fill="#059669" fontSize="10" fontWeight="700">📱 REST Clients</text>
                    <text textAnchor="middle" dy="10" fill="#6b7280" fontSize="8">curl / SDK / Apps</text>
                  </g>
                  <g transform="translate(680, 60)">
                    <rect x="-82" y="-24" width="164" height="48" rx="10" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                    <text textAnchor="middle" dy="-4" fill="#7c3aed" fontSize="10" fontWeight="700">🎛️ Swarmchestrate</text>
                    <text textAnchor="middle" dy="10" fill="#6b7280" fontSize="8">TOSCA Orchestrator</text>
                  </g>
                  <g transform="translate(950, 60)">
                    <rect x="-68" y="-24" width="136" height="48" rx="10" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                    <text textAnchor="middle" dy="-4" fill="#2563eb" fontSize="10" fontWeight="700">🌐 IPFS Network</text>
                    <text textAnchor="middle" dy="10" fill="#6b7280" fontSize="8">Content Gateway</text>
                  </g>

                  {/* Lines to Ingress */}
                  <line x1="200" y1="84" x2="200" y2="138" stroke="#059669" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.45" markerEnd="url(#meshArrExt)" />
                  <line x1="430" y1="84" x2="430" y2="138" stroke="#059669" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.45" markerEnd="url(#meshArrExt)" />
                  <line x1="680" y1="84" x2="600" y2="138" stroke="#7c3aed" strokeWidth="1" strokeDasharray="4 3" opacity="0.35" markerEnd="url(#meshArrExt)" />
                  <line x1="950" y1="84" x2="880" y2="138" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 3" opacity="0.35" markerEnd="url(#meshArrExt)" />

                  {/* K3s Ingress bar */}
                  <rect x="120" y="140" width="850" height="36" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                  <text x="545" y="163" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="700">
                    K3s Ingress — 193.225.250.240 — HTTP Routes: {agentPositions.map((a) => `/optimusdb${a.nodeId}`).join('  ')}
                  </text>

                  {/* Ingress → Agents */}
                  {agentPositions.map((a) => (
                    <line key={`ingress-${a.nodeId}`} x1={a.cx} y1="176" x2={a.cx} y2="225" stroke="#059669" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.4" markerEnd="url(#meshArrExt)" />
                  ))}
                </g>
              )}

              {/* ── AGENT NODES + INTERNAL MESH ── */}
              <g>
                {/* Internal mesh links (between all agent pairs) */}
                {hasInternalData && agentPositions.length > 1 && (
                  <g>
                    {agentPositions.map((a, i) =>
                      agentPositions.slice(i + 1).map((b, j) => {
                        const isAdjacent = Math.abs(i - (i + j + 1)) === 1;
                        return (
                          <g key={`link-${a.nodeId}-${b.nodeId}`}>
                            {/* LibP2P (upper arc) */}
                            <path
                              d={isAdjacent
                                ? `M${a.cx + 40},${agentY} Q${(a.cx + b.cx) / 2},${agentY - 65} ${b.cx - 40},${agentY}`
                                : `M${a.cx + 40},${agentY + 22} Q${(a.cx + b.cx) / 2},${agentY + 145} ${b.cx - 40},${agentY + 22}`
                              }
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth={isAdjacent ? 2 : 1.5}
                              opacity={isAdjacent ? 0.3 : 0.18}
                              markerEnd="url(#meshArr)"
                            />
                            {/* GossipSub (lower arc, only adjacent) */}
                            {isAdjacent && (
                              <path
                                d={`M${b.cx - 40},${agentY + 12} Q${(a.cx + b.cx) / 2},${agentY + 75} ${a.cx + 40},${agentY + 12}`}
                                fill="none"
                                stroke="#d97706"
                                strokeWidth="1.5"
                                strokeDasharray="6 3"
                                opacity="0.3"
                                markerEnd="url(#meshArrGossip)"
                              />
                            )}
                            {/* Labels */}
                            {isAdjacent && (
                              <>
                                <text x={(a.cx + b.cx) / 2} y={agentY - 40} textAnchor="middle" fill="#6366f1" fontSize="8" fontWeight="600">LibP2P TCP :4001</text>
                                <text x={(a.cx + b.cx) / 2} y={agentY + 58} textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="600">GossipSub PubSub</text>
                              </>
                            )}
                            {!isAdjacent && (
                              <text x={(a.cx + b.cx) / 2} y={agentY + 118} textAnchor="middle" fill="#6366f1" fontSize="8" fontWeight="600" opacity="0.6">LibP2P + CRDT Sync</text>
                            )}
                            {/* Animated particle */}
                            <circle r={isAdjacent ? 3.5 : 3} fill={isAdjacent ? '#818cf8' : '#a78bfa'} filter="url(#meshSoftGlow)">
                              <animateMotion
                                dur={`${4 + j * 1.5}s`}
                                repeatCount="indefinite"
                                path={isAdjacent
                                  ? `M${a.cx + 40},${agentY} Q${(a.cx + b.cx) / 2},${agentY - 65} ${b.cx - 40},${agentY}`
                                  : `M${a.cx + 40},${agentY + 22} Q${(a.cx + b.cx) / 2},${agentY + 145} ${b.cx - 40},${agentY + 22}`
                                }
                              />
                            </circle>
                          </g>
                        );
                      })
                    )}
                  </g>
                )}

                {/* Agent circles */}
                {agentPositions.map((agent) => (
                  <g
                    key={agent.nodeId}
                    transform={`translate(${agent.cx}, ${agentY})`}
                    className="no-pan"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedAgent(selectedAgent === agent.peerId ? null : agent.peerId)}
                  >
                    {/* Outer orbit ring */}
                    <circle r="48" fill="none" stroke={agent.isLeader ? '#fbbf24' : '#93c5fd'} strokeWidth="1" opacity="0.25" strokeDasharray="4 3">
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="25s" repeatCount="indefinite" />
                    </circle>
                    {/* Shadow fill */}
                    <circle r="40" fill={agent.isLeader ? '#fffbeb' : '#eff6ff'} filter="url(#meshDropShadow)" />
                    {/* Main circle */}
                    <circle r="40" fill="#ffffff" stroke={agent.isLeader ? '#f59e0b' : '#3b82f6'} strokeWidth="2.5" />
                    {/* Inner accent ring */}
                    <circle r="36" fill="none" stroke={agent.isLeader ? '#fef3c7' : '#dbeafe'} strokeWidth="6" />
                    {/* Labels */}
                    <text textAnchor="middle" dy="-14" fill={agent.isLeader ? '#b45309' : '#1d4ed8'} fontSize="8" fontWeight="700">
                      {agent.isLeader ? '⭐ COORDINATOR' : '○ FOLLOWER'}
                    </text>
                    <text textAnchor="middle" dy="3" fill="#0f172a" fontSize="12" fontWeight="800">{agent.name}</text>
                    <text textAnchor="middle" dy="16" fill="#6b7280" fontSize="8" fontFamily="monospace">
                      {agent.ip || '—'}:{agent.httpPort}
                    </text>
                    <text textAnchor="middle" dy="28" fill="#9ca3af" fontSize="7" fontFamily="monospace">
                      {agent.peerId ? `${agent.peerId.substring(0, 12)}...` : `Node ${agent.nodeId}`}
                    </text>
                  </g>
                ))}

                {/* ── INTERNAL DATA LAYER (below agents) ── */}
                {hasInternalData && agentPositions.length > 0 && (
                  <g>
                    <rect x="20" y={agentY + 76} width="174" height="26" rx="6" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1" />
                    <text x="107" y={agentY + 93} textAnchor="middle" fill="#4f46e5" fontSize="10" fontWeight="700">🔗 INTERNAL DATA LAYER</text>

                    {agentPositions.map((pos, idx) => {
                      const storeY = agentY + 105;
                      const storeCount = pos.mesh?.orbitdb_stores
                        ? normalizeOrbitDBStores(pos.mesh.orbitdb_stores).length
                        : (crudStores.active?.length || 0);
                      const meshStatus = pos.mesh?.mesh_health?.status || '—';

                      return (
                        <g key={`stores-${idx}`}>
                          {/* Connector line */}
                          <line x1={pos.cx} y1={agentY + 48} x2={pos.cx} y2={storeY - 6} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" opacity="0.35" />

                          {/* CRUD Store block */}
                          <g transform={`translate(${pos.cx - 82}, ${storeY})`}>
                            <rect width="76" height="84" rx="8" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                            <text x="38" y="15" textAnchor="middle" fill="#6d28d9" fontSize="9" fontWeight="800">CRUD Store</text>
                            <text x="38" y="26" textAnchor="middle" fill="#9ca3af" fontSize="6.5">(OrbitDB / CRDT)</text>
                            <line x1="8" y1="32" x2="68" y2="32" stroke="#e9d5ff" strokeWidth="1" />
                            <text x="38" y="44" textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="600">{storeCount} active</text>
                            <text x="38" y="55" textAnchor="middle" fill="#9ca3af" fontSize="6.5">KBdata, DsSWres</text>
                            <text x="38" y="64" textAnchor="middle" fill="#9ca3af" fontSize="6.5">Validations,</text>
                            <text x="38" y="73" textAnchor="middle" fill="#9ca3af" fontSize="6.5">Contributions...</text>
                            {/* R badge */}
                            <circle cx="65" cy="8" r="5" fill="#8b5cf6" opacity="0.15" stroke="#8b5cf6" strokeWidth="0.5" />
                            <text x="65" y="11" textAnchor="middle" fill="#7c3aed" fontSize="6" fontWeight="700">R</text>
                          </g>

                          {/* RDBMS SQLite block */}
                          <g transform={`translate(${pos.cx + 6}, ${storeY})`}>
                            <rect width="76" height="84" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" filter="url(#meshDropShadow)" />
                            <text x="38" y="15" textAnchor="middle" fill="#1d4ed8" fontSize="9" fontWeight="800">RDBMS</text>
                            <text x="38" y="26" textAnchor="middle" fill="#9ca3af" fontSize="6.5">(SQLite)</text>
                            <line x1="8" y1="32" x2="68" y2="32" stroke="#bfdbfe" strokeWidth="1" />
                            <text x="38" y="44" textAnchor="middle" fill="#2563eb" fontSize="8" fontWeight="600">
                              {rdbmsDatabases.length > 0 ? `${rdbmsDatabases.length} databases` : '3 databases'}
                            </text>
                            <text x="38" y="55" textAnchor="middle" fill="#9ca3af" fontSize="6.5">kbrdbms 380KB</text>
                            <text x="38" y="64" textAnchor="middle" fill="#9ca3af" fontSize="6.5">optimuslog 12MB</text>
                            <text x="38" y="73" textAnchor="middle" fill="#9ca3af" fontSize="6.5">reputation 20KB</text>
                            {/* L badge */}
                            <circle cx="65" cy="8" r="5" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" strokeWidth="0.5" />
                            <text x="65" y="11" textAnchor="middle" fill="#2563eb" fontSize="6" fontWeight="700">L</text>
                          </g>

                          {/* Services row */}
                          <g transform={`translate(${pos.cx - 82}, ${storeY + 94})`}>
                            <rect width="164" height="30" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" filter="url(#meshDropShadow)" />
                            <text x="12" y="13" fill="#059669" fontSize="7.5" fontWeight="700">🧠 TinyLlama</text>
                            <text x="12" y="23" fill="#9ca3af" fontSize="6">Metadata enrichment</text>
                            <text x="95" y="13" fill="#0284c7" fontSize="7.5" fontWeight="700">📦 IPFS</text>
                            <text x="95" y="23" fill="#9ca3af" fontSize="6">Content store</text>
                          </g>

                          {/* CRDT replication arrows between adjacent agents */}
                          {idx < agentPositions.length - 1 && (
                            <g>
                              <path
                                d={`M${pos.cx - 6},${storeY + 42} L${pos.cx + 256},${storeY + 42}`}
                                fill="none"
                                stroke="#a78bfa"
                                strokeWidth="1"
                                strokeDasharray="4 3"
                                opacity="0.2"
                                markerEnd="url(#meshArr)"
                              />
                              <circle r="2.5" fill="#8b5cf6" filter="url(#meshSoftGlow)">
                                <animateMotion
                                  dur={`${5 + idx * 2}s`}
                                  repeatCount="indefinite"
                                  path={`M${pos.cx - 6},${storeY + 42} L${pos.cx + 256},${storeY + 42}`}
                                />
                              </circle>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Replication label */}
                    <text x={svgWidth / 2} y={agentY + 230} textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="600" opacity="0.5">
                      ← — — CRDT Replication across CRUD Stores — — →
                    </text>
                  </g>
                )}

                {/* LEGEND */}
                <g transform={`translate(20, ${svgHeight - 44})`}>
                  <rect width={svgWidth - 40} height="34" rx="7" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="18" y="21" fill="#475569" fontSize="9" fontWeight="700">LEGEND:</text>
                  <line x1="82" y1="19" x2="117" y2="19" stroke="#6366f1" strokeWidth="2" /><text x="122" y="22" fill="#6366f1" fontSize="8">LibP2P</text>
                  <line x1="170" y1="19" x2="205" y2="19" stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 3" /><text x="210" y="22" fill="#d97706" fontSize="8">GossipSub</text>
                  <line x1="280" y1="19" x2="315" y2="19" stroke="#059669" strokeWidth="1" strokeDasharray="4 3" /><text x="320" y="22" fill="#059669" fontSize="8">External HTTP</text>
                  <line x1="410" y1="19" x2="445" y2="19" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 3" /><text x="450" y="22" fill="#8b5cf6" fontSize="8">CRDT Sync</text>
                  <circle cx="530" cy="19" r="5" fill="#8b5cf6" opacity="0.12" stroke="#8b5cf6" strokeWidth="0.5" /><text x="540" y="22" fill="#64748b" fontSize="8">R = Replicated</text>
                  <circle cx="630" cy="19" r="5" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" strokeWidth="0.5" /><text x="640" y="22" fill="#64748b" fontSize="8">L = Local only</text>
                  <text x="730" y="22" fill="#94a3b8" fontSize="7.5">● Animated dots = active data flow</text>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* ═══════ DETAIL PANELS ═══════ */}
      <div className="mesh-detail-grid">
        {/* Protocol Stack */}
        <div className="mesh-detail-card">
          <h3 className="mesh-dc-title">Decentralized Middleware Stack</h3>
          <div className="mesh-protocol-stack">
            {[
              { label: 'External Access', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', items: ['K3s Ingress', 'HTTP REST :8089', 'NGINX Proxy', '/optimusdb{N} routes'] },
              { label: 'Application', color: '#b45309', bg: '#fffbeb', border: '#fde68a', items: ['OptimusDB API', 'Agent Status', 'Query Engine', 'TinyLlama LLM'] },
              { label: 'Data — CRUD Store', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', items: ['OrbitDB', 'CRDT Merge', 'IPFS Blocks', `${crudStores.active?.length || 6} DocStores + EventLog`] },
              { label: 'Data — RDBMS', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', items: ['SQLite', `knowledgebase (${rdbmsDatabases[0]?.tables?.length || 16} tbl)`, `logger (${rdbmsDatabases[1]?.tables?.[0]?.rows?.toLocaleString() || '76K'} rows)`, `reputation (${rdbmsDatabases[2]?.tables?.[0]?.rows || 3} nodes)`] },
              { label: 'Messaging', color: '#b45309', bg: '#fffbeb', border: '#fde68a', items: ['GossipSub', 'PubSub Topics', 'mDNS Discovery', 'Peer Heartbeat'] },
              { label: 'Network', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', items: ['LibP2P', 'TCP :4001', 'Multiaddr', 'NAT Traversal'] },
            ].map((layer, i) => (
              <div key={i}>
                <div className="mesh-stack-layer" style={{ borderColor: layer.border, background: layer.bg }}>
                  <div className="mesh-stack-label" style={{ color: layer.color }}>{layer.label}</div>
                  <div className="mesh-stack-items">
                    {layer.items.map((item, j) => (
                      <span key={j} className="mesh-stack-chip" style={{ color: layer.color, borderColor: layer.border, background: '#fff' }}>{item}</span>
                    ))}
                  </div>
                </div>
                {i < 5 && <div className="mesh-stack-arrow">▼</div>}
              </div>
            ))}
          </div>
        </div>

        {/* CRUD Stores */}
        <div className="mesh-detail-card">
          <h3 className="mesh-dc-title">
            CRUD Stores <span className="mesh-dc-badge purple">OrbitDB / CRDT</span>
            {(crudStores.planned?.length || 0) > 0 && (
              <button className="mesh-dc-toggle" onClick={() => setShowPlanned(!showPlanned)}>
                {showPlanned ? 'Hide Planned' : `Show Planned (${crudStores.planned?.length || 0})`}
              </button>
            )}
          </h3>
          <div className="mesh-store-list">
            {(crudStores.active || []).map((s) => (
              <div key={s.name} className="mesh-store-row">
                <div className="mesh-sr-status active" />
                <div className="mesh-sr-info">
                  <span className="mesh-sr-name">{s.name}</span>
                  <span className="mesh-sr-type">{s.type}{s.entry_count !== undefined ? ` · ${s.entry_count} entries` : ''}</span>
                </div>
                <div className="mesh-sr-meta">
                  <span className={`mesh-sr-access ${s.access === 'full_rw' ? 'rw' : s.access === 'owner_only' ? 'owner' : s.access === 'write_owner' ? 'write' : ''}`}>
                    {s.access}
                  </span>
                  <span className={`mesh-sr-repl ${s.replicated ? 'yes' : 'no'}`}>
                    {s.replicated ? '↔ Replicated' : '⊘ Local'}
                  </span>
                </div>
              </div>
            ))}
            {showPlanned && (crudStores.planned?.length || 0) > 0 && (
              <>
                <div className="mesh-planned-divider">Planned / Dynamic Stores</div>
                {(crudStores.planned || []).map((s) => (
                  <div key={s.name} className="mesh-store-row planned">
                    <div className="mesh-sr-status planned" />
                    <div className="mesh-sr-info">
                      <span className="mesh-sr-name">{s.name}</span>
                      <span className="mesh-sr-type">{s.description}</span>
                    </div>
                    <div className="mesh-sr-meta">
                      <span className="mesh-sr-access pending">pending</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RDBMS */}
        <div className="mesh-detail-card">
          <h3 className="mesh-dc-title">
            RDBMS Databases <span className="mesh-dc-badge blue">SQLite — Local per Agent</span>
          </h3>
          {(rdbmsDatabases.length > 0 ? rdbmsDatabases : FALLBACK_RDBMS).map((db) => {
            const dbColor = db.name === 'knowledgebase' ? '#2563eb' : db.name === 'logger' ? '#d97706' : '#059669';
            return (
              <div key={db.name} className="mesh-rdbms-section">
                <div className="mesh-rdbms-header" onClick={() => setExpandedDb(expandedDb === db.name ? null : db.name)}>
                  <div className="mesh-rdbms-dot" style={{ background: dbColor }} />
                  <div className="mesh-rdbms-info">
                    <span className="mesh-rdbms-name">{db.name}</span>
                    <span className="mesh-rdbms-file">{db.file} — {db.size}</span>
                  </div>
                  <div className="mesh-rdbms-count">{db.tables.length} tables</div>
                  <span className="mesh-rdbms-expand">{expandedDb === db.name ? '▲' : '▼'}</span>
                </div>
                {expandedDb === db.name && (
                  <div className="mesh-rdbms-tables">
                    {db.tables.map((t) => (
                      <div key={t.name} className="mesh-rdbms-table-row">
                        <span className="mesh-rt-name">{t.name}</span>
                        <span className={`mesh-rt-rows ${t.rows > 0 ? 'has-data' : ''}`}>{t.rows.toLocaleString()} rows</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="mesh-services-section">
            <div className="mesh-dc-sub-title">Agent Services</div>
            {(services.length > 0 ? services : FALLBACK_SERVICES).map((s) => (
              <div key={s.name} className="mesh-service-row">
                <span className="mesh-svc-status" />
                <span className="mesh-svc-name">{s.name}</span>
                <span className="mesh-svc-type">{s.type}</span>
                <span className="mesh-svc-desc">{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Footer */}
      <div className="mesh-api-footer">
        <div className="mesh-api-label">📡 API Endpoints Used</div>
        <div className="mesh-api-chips">
          <code className="mesh-ep existing">GET /optimusdb{'{N}'}/{settings.apiContext}/agent/status</code>
          <code className="mesh-ep existing">GET /optimusdb{'{N}'}/{settings.apiContext}/debug/optimusdb/mesh</code>
          <code className="mesh-ep new">GET /optimusdb{'{N}'}/{settings.apiContext}/agent/inventory</code>
        </div>
        <div className="mesh-api-note">
          Fetches from all {agents.length || 'N'} agents and aggregates. The inventory endpoint provides RDBMS databases, CRUD store details, IPFS, LLM status, and planned stores.
        </div>
      </div>
    </div>
  );
};

// Fallback data when inventory endpoint is not yet available
const FALLBACK_RDBMS: RDBMSDatabase[] = [
  {
    name: 'knowledgebase', file: 'kbrdbms.db', size: '380 KB',
    tables: [
      { name: 'users', rows: 1 }, { name: 'badges', rows: 8 }, { name: 'datacatalog', rows: 0 },
      { name: 'metadata_catalog', rows: 0 }, { name: 'column_metadata', rows: 0 },
      { name: 'dashboards', rows: 0 }, { name: 'toscametadata', rows: 0 },
      { name: 'credentials_metadata', rows: 0 }, { name: 'type_metadata', rows: 0 },
      { name: 'access_log', rows: 0 }, { name: 'search_cache', rows: 0 },
      { name: 'resource_dependencies', rows: 0 }, { name: 'user_table_relations', rows: 0 },
      { name: 'user_dashboard_relations', rows: 0 }, { name: 'user_resource_relations', rows: 0 },
      { name: 'table_dashboard_relations', rows: 0 },
    ],
  },
  {
    name: 'logger', file: 'optimuslog.db', size: '12.5 MB',
    tables: [{ name: 'optimusLogger', rows: 76372 }, { name: 'ems_events', rows: 0 }],
  },
  {
    name: 'reputation', file: 'optimusreputation.db', size: '20 KB',
    tables: [{ name: 'reputation', rows: 3 }, { name: 'election_log', rows: 0 }],
  },
];

const FALLBACK_SERVICES: InventoryService[] = [
  { name: 'TinyLlama 1.1B', type: 'LLM', description: 'Metadata enrichment', status: 'active' },
  { name: 'IPFS Node', type: 'Storage', description: 'Content-addressed storage', status: 'active' },
  { name: 'Query Cache', type: 'Cache', description: '1000 entry LRU, 65% hit rate', status: 'active' },
  { name: 'Lineage Graph', type: 'Analytics', description: 'Data dependency tracking', status: 'active' },
];

// ==============================================================================
// Settings Modal Component — UNCHANGED
// ==============================================================================

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleSave = () => { onSave(localSettings); };

  const handleTest = async () => {
    try {
      const apiUrl = buildApiUrl('optimusdb', `/${localSettings.apiContext}/agent/status`, localSettings.nodeId);
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

  const previewUrl = buildApiUrl('optimusdb', `/${localSettings.apiContext}/agent/status`, localSettings.nodeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Cluster Topology Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>OptimusDB Node</label>
            <select className="form-control" value={localSettings.nodeId} onChange={(e) => setLocalSettings({ ...localSettings, nodeId: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>Node {n}{n === 1 ? ' (Primary)' : ''}</option>
              ))}
            </select>
            <small className="form-text">Select which OptimusDB node to query</small>
          </div>
          <div className="form-group">
            <label>API Context</label>
            <input type="text" className="form-control" value={localSettings.apiContext} onChange={(e) => setLocalSettings({ ...localSettings, apiContext: e.target.value })} placeholder="swarmkb" />
            <small className="form-text">API context path (usually "swarmkb")</small>
          </div>
          <div className="form-group">
            <label>Auto-Refresh Interval</label>
            <select className="form-control" value={localSettings.refreshInterval} onChange={(e) => setLocalSettings({ ...localSettings, refreshInterval: Number(e.target.value) })}>
              <option value="60000">1 minute</option>
              <option value="180000">3 minutes</option>
              <option value="300000">5 minutes (recommended)</option>
              <option value="600000">10 minutes</option>
            </select>
            <small className="form-text">How often to refresh cluster data</small>
          </div>
          <div className="endpoint-preview">
            <strong>Full Endpoint:</strong>
            <code>{previewUrl}</code>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={handleTest}>🧪 Test Connection</button>
          <button className="btn btn-default" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 Save & Retry</button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// Topology Canvas Sub-Component — UNCHANGED
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
  const [draggedNode, setDraggedNode] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = React.useState<Map<string, { x: number; y: number }>>(new Map());
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: 500 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const nodes = React.useMemo(() => {
    const allNodes = [
      {
        id: agent.peer_id, label: 'YOU', role: agent.role,
        isLeader: agent.is_current_leader, health: parseFloat(agent.health.score || '0'),
        isSelf: true, addresses: agent.addresses || [], x: 0, y: 0,
      },
      ...peers.map((peer) => ({
        id: peer.peer_id, label: peer.peer_id.substring(0, 8), role: peer.role,
        isLeader: peer.is_leader, health: parseFloat(peer.health.score || '0'),
        isSelf: false, addresses: [], x: 0, y: 0,
      })),
    ];
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    const coordinator = allNodes.find((n) => n.isLeader);
    const followers = allNodes.filter((n) => !n.isLeader);

    if (coordinator) {
      const customPos = nodePositions.get(coordinator.id);
      if (customPos) { coordinator.x = customPos.x; coordinator.y = customPos.y; }
      else { coordinator.x = centerX; coordinator.y = centerY; }
    }
    followers.forEach((node, i) => {
      const customPos = nodePositions.get(node.id);
      if (customPos) { node.x = customPos.x; node.y = customPos.y; }
      else {
        const angle = (2 * Math.PI * i) / followers.length;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
      }
    });
    return allNodes;
  }, [agent, peers, dimensions, nodePositions]);

  const links = React.useMemo(() => {
    const meshLinks: Array<{ source: any; target: any; id: string }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        meshLinks.push({ source: nodes[i], target: nodes[j], id: `${nodes[i].id}-${nodes[j].id}` });
        meshLinks.push({ source: nodes[j], target: nodes[i], id: `${nodes[j].id}-${nodes[i].id}` });
      }
    }
    return meshLinks;
  }, [nodes]);

  const getLinkPath = (source: any, target: any, reverse: boolean = false) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const curve = reverse ? dr * 0.3 : dr * 0.2;
    return `M${source.x},${source.y}A${dr},${curve} 0 0,${reverse ? 0 : 1} ${target.x},${target.y}`;
  };

  const getIpAddress = (addresses: string[]): string => {
    if (!addresses || addresses.length === 0) return 'N/A';
    for (const addr of addresses) {
      const ipMatch = addr.match(/\/ip4\/([0-9.]+)/);
      if (ipMatch) return ipMatch[1];
      const ip6Match = addr.match(/\/ip6\/([0-9a-f:]+)/);
      if (ip6Match) return ip6Match[1];
    }
    return addresses[0].substring(0, 20) + '...';
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setDraggedNode(nodeId);
      setDragOffset({ x: svgP.x - node.x, y: svgP.y - node.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    if (draggedNode) {
      setNodePositions((prev) => {
        const newMap = new Map(prev);
        newMap.set(draggedNode, { x: svgP.x - dragOffset.x, y: svgP.y - dragOffset.y });
        return newMap;
      });
      return;
    }
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan((prevPan) => ({ x: prevPan.x + dx, y: prevPan.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => { setDraggedNode(null); setIsPanning(false); };
  const handleMouseLeave = () => { setDraggedNode(null); setIsPanning(false); };
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (draggedNode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prevZoom) => Math.max(0.3, Math.min(3, prevZoom * delta)));
  };
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };
  const handleResetLayout = () => {
    setNodePositions(new Map()); setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null);
  };
  const isLinkHighlighted = (link: any) => {
    if (!selectedNode) return false;
    return link.source.id === selectedNode || link.target.id === selectedNode;
  };

  return (
    <div ref={containerRef} className="topology-canvas-container">
      <div className="topology-controls">
        <button className="topology-control-btn" onClick={handleResetLayout} title="Reset layout and zoom">🔄 Reset</button>
        <span className="topology-zoom-indicator">Zoom: {(zoom * 100).toFixed(0)}%</span>
        <span className="topology-hint">💡 Drag nodes • Scroll to zoom • Drag background to pan • Click node to highlight</span>
      </div>
      <svg
        ref={svgRef} className="topology-canvas" width={dimensions.width} height={dimensions.height}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
        onMouseDown={handleBackgroundMouseDown} onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#667eea" opacity="0.8" />
            </marker>
            <marker id="arrowhead-highlighted" markerWidth="12" markerHeight="12" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" opacity="1" />
            </marker>
          </defs>
          {links.map((link, i) => {
            const isReverse = i % 2 === 1;
            const isHighlighted = isLinkHighlighted(link);
            return (
              <path key={link.id} className="topology-link" d={getLinkPath(link.source, link.target, isReverse)}
                    stroke={isHighlighted ? '#f59e0b' : '#667eea'} strokeWidth={isHighlighted ? 3 : 2}
                    strokeOpacity={isHighlighted ? 0.8 : 0.4} fill="none"
                    markerEnd={isHighlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                    style={{ transition: 'all 0.2s' }} />
            );
          })}
          {nodes.map((node) => {
            let fillColor = '#3b82f6';
            if (node.isLeader) fillColor = '#f59e0b';
            if (node.isSelf) fillColor = '#10b981';
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const nodeRadius = node.isLeader ? 40 : 30;
            const ipAddress = getIpAddress(node.addresses);
            return (
              <g key={node.id} className="topology-node" transform={`translate(${node.x}, ${node.y})`}
                 onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                 onMouseDown={(e) => handleNodeMouseDown(node.id, e)} onClick={() => handleNodeClick(node.id)}
                 style={{ cursor: draggedNode === node.id ? 'grabbing' : 'grab' }}>
                {isSelected && (
                  <circle r={nodeRadius + 8} fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5,5" opacity="0.8">
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={isHovered || isSelected ? nodeRadius + 5 : nodeRadius} fill={fillColor} stroke="#fff" strokeWidth="3" style={{ transition: 'r 0.2s' }} />
                <text textAnchor="middle" dy="5" fill="#fff" fontSize="12" fontWeight="bold">{node.label}</text>
                <text textAnchor="middle" dy="50" fill="#333" fontSize="9" fontWeight="600">{node.id.substring(0, 12)}...</text>
                <text textAnchor="middle" dy="63" fill="#555" fontSize="9">{node.role}</text>
                {node.isSelf && <text textAnchor="middle" dy="76" fill="#10b981" fontSize="8" fontWeight="500">{ipAddress}</text>}
                <text textAnchor="middle" dy={node.isSelf ? 89 : 76} fill="#666" fontSize="9">📊 {node.health.toFixed(1)}%</text>
                {isHovered && (
                  <g>
                    <rect x="-100" y="-110" width="200" height="80" fill="rgba(0,0,0,0.9)" rx="6" stroke="#667eea" strokeWidth="2" />
                    <text textAnchor="middle" dy="-85" fill="#fff" fontSize="11" fontWeight="bold">{node.isSelf ? 'YOU' : node.id.substring(0, 16)}</text>
                    <text textAnchor="middle" dy="-70" fill="#10b981" fontSize="10">Role: {node.role} {node.isLeader && '⭐'}</text>
                    <text textAnchor="middle" dy="-55" fill="#fbbf24" fontSize="10">Utilization: {node.health.toFixed(1)}%</text>
                    {node.isSelf && <text textAnchor="middle" dy="-40" fill="#60a5fa" fontSize="9">IP: {ipAddress}</text>}
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
// Agent Card Sub-Component — UNCHANGED
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

const AgentCard: React.FC<AgentCardProps> = ({ peerId, role, isLeader, health, metrics, isSelf, connected }) => {
  const getHealthClass = (score: string): string => {
    const numScore = parseFloat(score || '0');
    if (numScore <= 20) return 'excellent';
    if (numScore <= 40) return 'good';
    if (numScore <= 60) return 'fair';
    if (numScore <= 80) return 'poor';
    return 'critical';
  };
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
        <span className={`role-badge role-${roleClass}`}>{isLeader ? '⭐ Coordinator' : '➡️ Follower'}</span>
        {isSelf && <span className="self-badge">YOU</span>}
        {!connected && <span className="disconnected-badge">Disconnected</span>}
      </div>
      <div className="agent-peer-id" title={peerId}>
        <strong>Peer ID:</strong> {peerId.substring(0, 16)}...
      </div>
      <div className="health-bar-container">
        <div className={`health-bar health-${healthClass}`} style={{ width: `${healthScore}%` }}>
          {healthLabel} - {health.score}% Utilization
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-item"><span className="metric-label">💻 CPU</span><span className="metric-value">{health.cpu_usage || 'N/A'}</span></div>
        <div className="metric-item"><span className="metric-label">🧠 Memory</span><span className="metric-value">{health.memory_used || 'N/A'}</span></div>
        <div className="metric-item"><span className="metric-label">📀 Disk Read</span><span className="metric-value">{health.disk_read || 'N/A'}</span></div>
        <div className="metric-item"><span className="metric-label">📀 Disk Write</span><span className="metric-value">{health.disk_write || 'N/A'}</span></div>
        <div className="metric-item"><span className="metric-label">⚡ Latency</span><span className="metric-value">{health.latency || 'N/A'}</span></div>
        <div className="metric-item"><span className="metric-label">👑 Leadership</span><span className="metric-value">{metrics.leadership_count || 0}</span></div>
      </div>
    </div>
  );
};

export default ClusterTopologyPage;
