// ==============================================================================
// FILE: amundsen_application/static/js/pages/AnalyticsDashboardPage/index.tsx
// ANALYTICS DASHBOARD — Comprehensive monitoring leveraging ALL OptimusDB APIs
// Self-contained: no sub-component imports. White theme matching Query Workbench.
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';
import { buildApiUrl, getAvailableNodes } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// Types
// ==============================================================================

interface AgentInfo {
  nodeId: number;
  name: string;
  role: string;
  peerId: string;
  isLeader: boolean;
  health: number;
  uptime: string;
  cpu: string;
  memory: string;
  goroutines: number;
  electionTerm: number;
  connectedPeers: number;
}

interface LoggerEntry {
  date: string;
  hour: string;
  id: number;
  level: string;
  message: string;
  source: string;
  timestamp: string;
}

interface EmsLogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

interface EmsEventEntry {
  id: number;
  timestamp: string; // mapped from received_at
  type: string; // derived from raw metricValue range or topic
  detail: string; // parsed from raw JSON
  client_id: string;
  action: string;
  resource: string;
  topic: string;
  raw: string;
  metricValue?: number;
  metricLevel?: number;
}

interface BenchmarkData {
  ops_per_second: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  total_operations: number;
  by_strategy: StrategyBenchmark[];
}

interface StrategyBenchmark {
  strategy: string;
  ops: number;
  avg_ms: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hit_ratio: number;
  evictions: number;
  size: string;
  ttl_default: string;
}

interface MeshStoreInfo {
  type: string;
  initialized: boolean;
  entry_count: number;
}

interface NodeMeshData {
  nodeId: number;
  nodeName: string;
  stores: Record<string, MeshStoreInfo>;
}

// ── Peer Network types ──
interface PeerInfo {
  peer_id: string;
  addrs: string[];
  connected: boolean;
  latency_ms?: number;
  agent_name?: string;
  protocols?: string[];
  health?: Record<string, string>;
  role?: string;
}

interface NodePeerData {
  nodeId: number;
  nodeName: string;
  peerId: string;
  peers: PeerInfo[];
  addresses?: string[];
  cluster?: {
    total_peers: number;
    connected_peers: number;
    discovered_peers: number;
    coordinators: number;
    followers: number;
  };
}

interface ContributionData {
  nodeId: number;
  nodeName: string;
  queries_served: number;
  replications: number;
  uploads: number;
  uptime_hours: number;
  score: number;
}

// ── Credentials types ──
interface CredentialEntry {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, any>;
  revoked?: boolean;
  proof?: Record<string, any>;
}

// ── Metadata Service types ──
interface MetadataMetrics {
  total_enrichments: number;
  total_profiles: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_ratio: number;
  avg_enrichment_ms: number;
  databases_tracked: number;
  tables_tracked: number;
  last_enrichment: string;
}

interface MetadataHealth {
  status: string;
  version: string;
  uptime: string;
  optimusdb_connected: boolean;
  cache_size: number;
  ai_model_loaded: boolean;
}

type TabId =
  | 'overview'
  | 'logging'
  | 'ems-logs'
  | 'events'
  | 'performance'
  | 'stores'
  | 'peers'
  | 'credentials'
  | 'metadata';

// ==============================================================================
// Constants
// ==============================================================================

const CONTEXT = 'swarmkb';
const REFRESH_INTERVAL = 30000;

const LEVEL_COLORS: Record<string, string> = {
  INFO: '#0d9488',
  WARN: '#d97706',
  ERROR: '#dc2626',
  DEBUG: '#6b7280',
  FATAL: '#991b1b',
  ELECTION: '#8b5cf6',
  PEER: '#06b6d4',
  QUERY: '#2563eb',
  ORBITDB: '#d946ef',
  SYSTEM: '#475569',
  REPLICATION: '#7c3aed',
  CACHE: '#667eea',
  AI: '#ec4899',
  METRICS: '#0891b2',
  MESH: '#a855f7',
  LINEAGE: '#059669',
  DISCOVERY: '#ea580c',
  PROC: '#64748b',
};

const EVENT_COLORS: Record<string, string> = {
  QUERY: '#2563eb',
  REPLICATION: '#7c3aed',
  UPLOAD: '#16a34a',
  ELECTION: '#d97706',
  PEER: '#0d9488',
  CACHE: '#667eea',
  BENCHMARK: '#d946ef',
  CREDENTIAL: '#0891b2',
  CPU: '#f59e0b',
  MEMORY: '#8b5cf6',
  METRIC: '#6366f1',
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'logging', label: 'Logging', icon: '📋' },
  { id: 'ems-logs', label: 'EMS Logs', icon: '📄' },
  { id: 'events', label: 'Events', icon: '⚡' },
  { id: 'performance', label: 'Performance', icon: '🚀' },
  { id: 'stores', label: 'Data Stores', icon: '🗄️' },
  { id: 'peers', label: 'Peer Network', icon: '🌐' },
  { id: 'credentials', label: 'Credentials', icon: '🔐' },
  { id: 'metadata', label: 'Metadata', icon: '🧬' },
];

// ==============================================================================
// Helpers
// ==============================================================================

function fmtTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function fmtDateTime(ts: string): string {
  return ts.replace('T', ' ').replace('Z', '');
}

function fmtRelative(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);

  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;

  return `${Math.floor(m / 1440)}d ago`;
}

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] || '#94a3b8';
}

function getEventColor(type: string): string {
  return EVENT_COLORS[type] || '#94a3b8';
}

// ==============================================================================
// Main Component
// ==============================================================================

const AnalyticsDashboardPage: React.FC = () => {
  // ── Global state ──
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Agent / cluster state ──
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(1);

  // ── Logging tab (optimusLogger) ──
  const [loggerData, setLoggerData] = useState<LoggerEntry[]>([]);
  const [loggerLoading, setLoggerLoading] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState<Set<string>>(new Set());
  const [logSourceFilter, setLogSourceFilter] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logHourFilter, setLogHourFilter] = useState('ALL');
  const [logSortField, setLogSortField] = useState<string>('timestamp');
  const [logSortDir, setLogSortDir] = useState<'asc' | 'desc'>('desc');
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(25);
  const [logDetailEntry, setLogDetailEntry] = useState<LoggerEntry | null>(
    null
  );

  // ── EMS Logs tab ──
  const [emsLogs, setEmsLogs] = useState<EmsLogEntry[]>([]);
  const [emsLogsLoading, setEmsLogsLoading] = useState(false);
  const [emsLogLevelFilter, setEmsLogLevelFilter] = useState('ALL');

  // ── Events tab ──
  const [emsEvents, setEmsEvents] = useState<EmsEventEntry[]>([]);
  const [emsEventsLoading, setEmsEventsLoading] = useState(false);

  // ── Performance tab ──
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // ── Data Stores tab ──
  const [meshData, setMeshData] = useState<NodeMeshData[]>([]);
  const [catalogStats, setCatalogStats] = useState<{
    total: number;
    tables: number;
    updated: string;
  } | null>(null);
  const [toscaStats, setToscaStats] = useState<{
    files: number;
    size: number;
    uploaders: number;
    last: string;
  } | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);

  // ── Peer Network tab ──
  const [peerData, setPeerData] = useState<NodePeerData[]>([]);
  const [contributionData, setContributionData] = useState<ContributionData[]>(
    []
  );
  const [peersLoading, setPeersLoading] = useState(false);

  // ── Credentials tab ──
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credTypeFilter, setCredTypeFilter] = useState('ALL');
  const [credSearchTerm, setCredSearchTerm] = useState('');
  const [credDetailEntry, setCredDetailEntry] =
    useState<CredentialEntry | null>(null);

  // ── Metadata tab ──
  const [metadataMetrics, setMetadataMetrics] =
    useState<MetadataMetrics | null>(null);
  const [metadataHealth, setMetadataHealth] = useState<MetadataHealth | null>(
    null
  );
  const [metadataLoading, setMetadataLoading] = useState(false);

  // ════════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════════════════════════════════

  // ── Fetch cluster status from all agents ──
  const fetchClusterStatus = useCallback(async () => {
    try {
      const nodes = await getAvailableNodes();
      const agentInfos: AgentInfo[] = [];

      await Promise.all(
        nodes.map(async (node) => {
          try {
            const url = buildApiUrl(
              'optimusdb',
              `/${CONTEXT}/agent/status`,
              node.id
            );
            const resp = await axios.get(url, { timeout: 5000 });
            const d = resp.data;

            const agent = d.agent || {};
            const health = agent.health || {};
            const cluster = d.cluster || {};
            const election = d.election || {};

            agentInfos.push({
              nodeId: node.id,
              name: node.name || `OptimusDB-${node.id}`,
              role: agent.role === 'coordinator' ? 'Leader' : 'Follower',
              peerId: agent.peer_id || '',
              isLeader: agent.is_current_leader || false,
              health: parseFloat(health.score || '0'),
              uptime: health.uptime || 'N/A',
              cpu: health.cpu_usage || '0%',
              memory: health.memory_usage || '0%',
              goroutines: health.goroutines || 0,
              electionTerm: election.current_term || 0,
              connectedPeers: cluster.connected_peers || 0,
            });
          } catch (err) {
            agentInfos.push({
              nodeId: node.id,
              name: node.name || `OptimusDB-${node.id}`,
              role: 'Unknown',
              peerId: '',
              isLeader: false,
              health: 0,
              uptime: 'Unreachable',
              cpu: '0%',
              memory: '0%',
              goroutines: 0,
              electionTerm: 0,
              connectedPeers: 0,
            });
          }
        })
      );

      agentInfos.sort((a, b) => a.nodeId - b.nodeId);
      setAgents(agentInfos);
    } catch (err) {
      console.error('Failed to fetch cluster status:', err);
    }
  }, []);

  // ── Fetch optimusLogger via EMS SQL ──
  const fetchLoggerData = useCallback(
    async (nodeId: number = selectedAgent) => {
      setLoggerLoading(true);
      try {
        const url = buildApiUrl('optimusdb', `/${CONTEXT}/ems/sql`, nodeId);
        const resp = await axios.get(url, {
          params: { q: 'SELECT * FROM optimusLogger' },
          timeout: 10000,
        });

        let entries: LoggerEntry[] = [];

        if (resp.data && Array.isArray(resp.data)) {
          entries = resp.data;
        } else if (
          resp.data &&
          resp.data.records &&
          Array.isArray(resp.data.records)
        ) {
          entries = resp.data.records;
        } else if (
          resp.data &&
          resp.data.results &&
          Array.isArray(resp.data.results)
        ) {
          entries = resp.data.results;
        } else if (
          resp.data &&
          resp.data.data &&
          Array.isArray(resp.data.data)
        ) {
          entries = resp.data.data;
        }

        // Ensure each entry has required fields
        entries = entries
          .filter((e) => e && e.timestamp)
          .map((e, idx) => ({
            date: e.date || '',
            hour: e.hour || '',
            id: e.id || idx + 1,
            level: e.level || 'INFO',
            message: e.message || '',
            source: e.source || '',
            timestamp: e.timestamp || '',
          }));

        entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setLoggerData(entries);
      } catch (err: any) {
        console.error('Failed to fetch optimusLogger:', err);
        setLoggerData([]);
      } finally {
        setLoggerLoading(false);
      }
    },
    [selectedAgent]
  );

  // ── Fetch EMS filtered logs ──
  const fetchEmsLogs = useCallback(
    async (nodeId: number = selectedAgent) => {
      setEmsLogsLoading(true);
      try {
        const url = buildApiUrl('optimusdb', `/${CONTEXT}/ems/logs`, nodeId);
        const resp = await axios.get(url, {
          params: { limit: 100, since_min: 30 },
          timeout: 8000,
        });

        let rawLogs: any[] = [];

        if (Array.isArray(resp.data)) {
          rawLogs = resp.data;
        } else if (resp.data?.records) {
          rawLogs = resp.data.records;
        } else if (resp.data?.logs) {
          rawLogs = resp.data.logs;
        } else if (resp.data?.results) {
          rawLogs = resp.data.results;
        }

        // Map raw API fields → EmsLogEntry
        const logs: EmsLogEntry[] = rawLogs.map((r: any) => {
          // If it already has the expected fields (timestamp, level as string, message), use as-is
          if (r.timestamp && r.message && typeof r.level === 'string') {
            return r as EmsLogEntry;
          }

          // Otherwise map from raw EMS format
          let level = 'INFO';
          let message = r.raw || r.message || '';
          const source = r.client_id || r.source || '';

          // Parse the raw JSON field if present
          if (r.raw && typeof r.raw === 'string') {
            try {
              const parsed = JSON.parse(r.raw);

              // Classify by metric value
              if (parsed.metricValue !== undefined) {
                const mv = parsed.metricValue;

                if (mv < 100) {
                  level = mv > 80 ? 'WARN' : mv > 95 ? 'ERROR' : 'INFO';
                  message = `CPU utilization: ${mv.toFixed(2)}%`;
                } else if (mv > 100000) {
                  level = mv > 2000000 ? 'WARN' : 'INFO';
                  message = `Memory: ${(mv / 1024).toFixed(1)} KB`;
                } else {
                  message = `Metric: ${mv.toFixed(2)}`;
                }
              }
              // Use numeric level if present
              if (parsed.level !== undefined) {
                const nl = parsed.level;

                level = nl >= 3 ? 'ERROR' : nl >= 2 ? 'WARN' : 'INFO';
              }
            } catch {
              /* keep raw string */
            }
          }

          return {
            timestamp: r.received_at || r.timestamp || '',
            level,
            message,
            source,
          };
        });

        setEmsLogs(logs);
      } catch (err) {
        console.error('Failed to fetch EMS logs:', err);
        setEmsLogs([]);
      } finally {
        setEmsLogsLoading(false);
      }
    },
    [selectedAgent]
  );

  // ── Fetch EMS events ──
  const fetchEmsEvents = useCallback(
    async (nodeId: number = selectedAgent) => {
      setEmsEventsLoading(true);
      try {
        const url = buildApiUrl('optimusdb', `/${CONTEXT}/ems/events`, nodeId);
        const resp = await axios.get(url, {
          params: { limit: 50, since_min: 30 },
          timeout: 8000,
        });

        let rawEvents: any[] = [];

        if (Array.isArray(resp.data)) {
          rawEvents = resp.data;
        } else if (resp.data?.records) {
          rawEvents = resp.data.records;
        } else if (resp.data?.events) {
          rawEvents = resp.data.events;
        } else if (resp.data?.results) {
          rawEvents = resp.data.results;
        }

        // Map raw API fields → EmsEventEntry
        const events: EmsEventEntry[] = rawEvents.map((r: any) => {
          let metricValue: number | undefined;
          let metricLevel: number | undefined;
          let detail = r.raw || r.detail || '';
          let eventType = r.type || r.action || 'METRIC';

          // Parse the raw JSON field if present
          if (r.raw && typeof r.raw === 'string') {
            try {
              const parsed = JSON.parse(r.raw);

              metricValue = parsed.metricValue;
              metricLevel = parsed.level;
              // Classify event type by metric value range
              if (metricValue !== undefined) {
                if (metricValue < 100) {
                  eventType = 'CPU';
                  detail = `CPU utilization: ${metricValue.toFixed(2)}%`;
                } else if (metricValue > 100000) {
                  eventType = 'MEMORY';
                  detail = `Memory usage: ${(metricValue / 1024).toFixed(
                    1
                  )} KB`;
                } else {
                  eventType = 'METRIC';
                  detail = `Metric value: ${metricValue.toFixed(2)}`;
                }
              }
            } catch {
              /* keep raw string as detail */
            }
          }

          return {
            id: r.id || 0,
            timestamp: r.received_at || r.timestamp || '',
            type: eventType,
            detail,
            client_id: r.client_id || '',
            action: r.action || '',
            resource: r.resource || '',
            topic: r.topic || '',
            raw: r.raw || '',
            metricValue,
            metricLevel,
          };
        });

        events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setEmsEvents(events);
      } catch (err) {
        console.error('Failed to fetch EMS events:', err);
        setEmsEvents([]);
      } finally {
        setEmsEventsLoading(false);
      }
    },
    [selectedAgent]
  );

  // ── Fetch benchmarks + cache stats ──
  const fetchPerformanceData = useCallback(
    async (nodeId: number = selectedAgent) => {
      setPerfLoading(true);
      try {
        // Benchmarks
        const bmUrl = buildApiUrl(
          'optimusdb',
          `/${CONTEXT}/benchmarks`,
          nodeId
        );
        const bmResp = await axios
          .get(bmUrl, { timeout: 8000 })
          .catch(() => null);

        if (bmResp?.data) {
          const d = bmResp.data;

          setBenchmarks({
            ops_per_second: d.ops_per_second || d.opsPerSecond || 0,
            avg_latency_ms: d.avg_latency_ms || d.avgLatency || 0,
            p99_latency_ms: d.p99_latency_ms || d.p99Latency || 0,
            total_operations: d.total_operations || d.totalOps || 0,
            by_strategy: d.by_strategy || d.strategies || [],
          });
        }

        // Cache stats via /command
        const cacheUrl = buildApiUrl(
          'optimusdb',
          `/${CONTEXT}/command`,
          nodeId
        );
        const cacheResp = await axios
          .post(cacheUrl, { command: 'cache_stats' }, { timeout: 5000 })
          .catch(() => null);

        if (cacheResp?.data) {
          const c = cacheResp.data;

          setCacheStats({
            hits: c.hits || 0,
            misses: c.misses || 0,
            hit_ratio:
              c.hit_ratio ||
              (c.hits && c.misses ? c.hits / (c.hits + c.misses) : 0),
            evictions: c.evictions || 0,
            size: c.size || 'N/A',
            ttl_default: c.ttl_default || c.ttl || 'N/A',
          });
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
      } finally {
        setPerfLoading(false);
      }
    },
    [selectedAgent]
  );

  // ── Fetch data stores (mesh + catalog + tosca) ──
  const fetchStoresData = useCallback(async () => {
    setStoresLoading(true);
    try {
      const nodes = await getAvailableNodes();
      const meshResults: NodeMeshData[] = [];

      // Fetch mesh from all nodes
      await Promise.all(
        nodes.map(async (node) => {
          try {
            const url = buildApiUrl(
              'optimusdb',
              `/${CONTEXT}/debug/optimusdb/mesh`,
              node.id
            );
            const resp = await axios.get(url, { timeout: 5000 });
            const d = resp.data;

            const stores: Record<string, MeshStoreInfo> = {};

            if (d.orbitdb_stores) {
              // Could be object or array
              if (Array.isArray(d.orbitdb_stores)) {
                d.orbitdb_stores.forEach((s: any) => {
                  stores[s.name || s.store || 'unknown'] = {
                    type: s.type || 'unknown',
                    initialized: s.initialized !== false,
                    entry_count: s.entry_count || s.entryCount || 0,
                  };
                });
              } else {
                Object.entries(d.orbitdb_stores).forEach(
                  ([name, info]: [string, any]) => {
                    stores[name] = {
                      type: info.type || 'unknown',
                      initialized: info.initialized !== false,
                      entry_count: info.entry_count || info.entryCount || 0,
                    };
                  }
                );
              }
            }

            meshResults.push({
              nodeId: node.id,
              nodeName: node.name || `OptimusDB-${node.id}`,
              stores,
            });
          } catch (err) {
            meshResults.push({
              nodeId: node.id,
              nodeName: node.name || `OptimusDB-${node.id}`,
              stores: {},
            });
          }
        })
      );

      meshResults.sort((a, b) => a.nodeId - b.nodeId);
      setMeshData(meshResults);

      // Fetch catalog stats via POST /command (SQL DML)
      try {
        const catUrl = buildApiUrl(
          'optimusdb',
          `/${CONTEXT}/command`,
          selectedAgent
        );
        const catResp = await axios.post(
          catUrl,
          {
            method: { argcnt: 2, cmd: 'sqldml' },
            args: ['dummy1', 'dummy2'],
            dstype: 'dsswres',
            sqldml: 'select * from datacatalog;',
            graph_traversal: [{}],
            criteria: [],
          },
          { timeout: 8000 }
        );
        const catData =
          catResp.data?.data?.records ||
          catResp.data?.records ||
          (Array.isArray(catResp.data) ? catResp.data : []);
        const tables = new Set(
          catData.map((r: any) => r.table_name || r.tableName).filter(Boolean)
        );

        setCatalogStats({
          total: catData.length,
          tables: tables.size,
          updated:
            catData.length > 0
              ? catData[0].timestamp || catData[0].updated_at || ''
              : '',
        });
      } catch {
        setCatalogStats(null);
      }

      // Fetch TOSCA stats via POST /command (SQL DML)
      try {
        const toscaUrl = buildApiUrl(
          'optimusdb',
          `/${CONTEXT}/command`,
          selectedAgent
        );
        const toscaResp = await axios.post(
          toscaUrl,
          {
            method: { argcnt: 2, cmd: 'sqldml' },
            args: ['dummy1', 'dummy2'],
            dstype: 'dsswres',
            sqldml: 'select * from toscametadata;',
            graph_traversal: [{}],
            criteria: [],
          },
          { timeout: 8000 }
        );
        const toscaData =
          toscaResp.data?.data?.records ||
          toscaResp.data?.records ||
          (Array.isArray(toscaResp.data) ? toscaResp.data : []);
        const uploaders = new Set(
          toscaData.map((r: any) => r.uploader || r.uploaded_by).filter(Boolean)
        );
        const totalSize = toscaData.reduce(
          (s: number, r: any) => s + (r.size || r.file_size || 0),
          0
        );

        setToscaStats({
          files: toscaData.length,
          size: totalSize,
          uploaders: uploaders.size,
          last:
            toscaData.length > 0
              ? toscaData[0].timestamp || toscaData[0].uploaded_at || ''
              : '',
        });
      } catch {
        setToscaStats(null);
      }
    } catch (err) {
      console.error('Failed to fetch stores data:', err);
    } finally {
      setStoresLoading(false);
    }
  }, [selectedAgent]);

  // ── Fetch peer network data from all agents ──
  const fetchPeerData = useCallback(async () => {
    setPeersLoading(true);
    try {
      const nodes = await getAvailableNodes();
      const peerResults: NodePeerData[] = [];
      const contriResults: ContributionData[] = [];

      await Promise.all(
        nodes.map(async (node) => {
          try {
            // /agent/status already contains all peer data embedded
            const statusUrl = buildApiUrl(
              'optimusdb',
              `/${CONTEXT}/agent/status`,
              node.id
            );
            const statusResp = await axios.get(statusUrl, { timeout: 5000 });
            const sd = statusResp.data;
            const agentData = sd?.agent || {};
            const clusterData = sd?.cluster || {};
            const peersArray: any[] = sd?.peers || [];

            // Build peer list from the embedded peers array
            const peersList: PeerInfo[] = peersArray.map((p: any) => ({
              peer_id: p.peer_id || '',
              addrs: Array.isArray(p.addrs)
                ? p.addrs
                : Array.isArray(p.addresses)
                ? p.addresses
                : [],
              connected: p.connected === true,
              latency_ms: p.health?.latency
                ? parseFloat(p.health.latency)
                : undefined,
              agent_name: p.role || (p.is_leader ? 'Coordinator' : 'Follower'),
              protocols: Array.isArray(p.protocols) ? p.protocols : [],
              health: p.health || {},
              role: p.role || (p.is_leader ? 'Coordinator' : 'Follower'),
            }));

            peerResults.push({
              nodeId: node.id,
              nodeName: node.name || `optimusdb${node.id}`,
              peerId: agentData.peer_id || '',
              peers: peersList,
              addresses: agentData.addresses || [],
              cluster: {
                total_peers: clusterData.total_peers || 0,
                connected_peers: clusterData.connected_peers || 0,
                discovered_peers: clusterData.discovered_peers || 0,
                coordinators: clusterData.coordinators || 0,
                followers: clusterData.followers || 0,
              },
            });

            // Fetch contributions
            try {
              const contriUrl = buildApiUrl(
                'optimusdb',
                `/${CONTEXT}/command`,
                node.id
              );
              const contriResp = await axios.post(
                contriUrl,
                {
                  method: { cmd: 'contri', argcnt: 1 },
                  criteria: [],
                },
                { timeout: 5000 }
              );
              const cd =
                contriResp.data?.data ||
                contriResp.data?.result ||
                contriResp.data ||
                {};

              contriResults.push({
                nodeId: node.id,
                nodeName: node.name || `optimusdb${node.id}`,
                queries_served:
                  cd.queries_served || cd.queries || cd.queriesServed || 0,
                replications:
                  cd.replications ||
                  cd.replication_count ||
                  cd.replicationsCount ||
                  0,
                uploads: cd.uploads || cd.upload_count || cd.uploadsCount || 0,
                uptime_hours:
                  cd.uptime_hours || cd.uptime || cd.uptimeHours || 0,
                score:
                  cd.score ||
                  cd.contribution_score ||
                  cd.contributionScore ||
                  0,
              });
            } catch {
              /* contribution data optional */
            }
          } catch (err) {
            console.warn(
              `Failed to fetch peer data from node ${node.id}:`,
              err
            );
          }
        })
      );

      setPeerData(peerResults);
      setContributionData(contriResults);
    } catch (err) {
      console.error('Failed to fetch peer data:', err);
    } finally {
      setPeersLoading(false);
    }
  }, []);

  // ── Fetch credentials ──
  const fetchCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    try {
      const nodeId = selectedAgent;
      const url = buildApiUrl('optimusdb', `/${CONTEXT}/credentials`, nodeId);
      const resp = await axios.get(url, { timeout: 8000 });
      const rawCreds = resp.data;

      // Response may be an array directly or { credentials: [...] }
      const credList: CredentialEntry[] = (
        Array.isArray(rawCreds)
          ? rawCreds
          : Array.isArray(rawCreds?.credentials)
          ? rawCreds.credentials
          : []
      ).map((c: any) => ({
        id: c.id || c['@id'] || '',
        type: Array.isArray(c.type)
          ? c.type
          : [c.type || 'VerifiableCredential'],
        issuer: typeof c.issuer === 'string' ? c.issuer : c.issuer?.id || '',
        issuanceDate: c.issuanceDate || c.issued || '',
        expirationDate: c.expirationDate || c.expires || undefined,
        credentialSubject: c.credentialSubject || {},
        revoked: c.revoked || false,
        proof: c.proof || undefined,
      }));

      setCredentials(credList);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
      setCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  }, [selectedAgent]);

  // ── Fetch metadata service metrics & health ──
  const fetchMetadataData = useCallback(async () => {
    setMetadataLoading(true);
    try {
      const nodeId = selectedAgent;

      // Fetch metrics
      try {
        const metricsUrl = buildApiUrl(
          'optimusdb',
          `/api/v1/metadata/metrics`,
          nodeId
        );
        const metricsResp = await axios.get(metricsUrl, { timeout: 5000 });
        const m = metricsResp.data;

        setMetadataMetrics({
          total_enrichments: m.total_enrichments || m.enrichments || 0,
          total_profiles: m.total_profiles || m.profiles || 0,
          cache_hits: m.cache_hits || 0,
          cache_misses: m.cache_misses || 0,
          cache_hit_ratio:
            m.cache_hit_ratio ||
            (m.cache_hits && m.cache_misses
              ? m.cache_hits / (m.cache_hits + m.cache_misses)
              : 0),
          avg_enrichment_ms: m.avg_enrichment_ms || m.avg_latency_ms || 0,
          databases_tracked: m.databases_tracked || m.databases || 0,
          tables_tracked: m.tables_tracked || m.tables || 0,
          last_enrichment: m.last_enrichment || m.last_updated || '',
        });
      } catch {
        setMetadataMetrics(null);
      }

      // Fetch health
      try {
        const healthUrl = buildApiUrl(
          'optimusdb',
          `/api/v1/metadata/health`,
          nodeId
        );
        const healthResp = await axios.get(healthUrl, { timeout: 5000 });
        const h = healthResp.data;

        setMetadataHealth({
          status: h.status || 'unknown',
          version: h.version || '',
          uptime: h.uptime || '',
          optimusdb_connected: h.optimusdb_connected !== false,
          cache_size: h.cache_size || 0,
          ai_model_loaded: h.ai_model_loaded || h.model_loaded || false,
        });
      } catch {
        setMetadataHealth(null);
      }
    } catch (err) {
      console.error('Failed to fetch metadata data:', err);
    } finally {
      setMetadataLoading(false);
    }
  }, [selectedAgent]);

  // ── Master refresh ──
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchClusterStatus();
      // Fetch tab-specific data based on active tab
      if (activeTab === 'logging') await fetchLoggerData();
      if (activeTab === 'ems-logs') await fetchEmsLogs();
      if (activeTab === 'events') await fetchEmsEvents();
      if (activeTab === 'performance') await fetchPerformanceData();
      if (activeTab === 'stores') await fetchStoresData();
      if (activeTab === 'peers') await fetchPeerData();
      if (activeTab === 'credentials') await fetchCredentials();
      if (activeTab === 'metadata') await fetchMetadataData();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    fetchClusterStatus,
    fetchLoggerData,
    fetchEmsLogs,
    fetchEmsEvents,
    fetchPerformanceData,
    fetchStoresData,
    fetchPeerData,
    fetchCredentials,
    fetchMetadataData,
  ]);

  // ── Initial load + tab change ──
  useEffect(() => {
    refreshAll();
  }, [activeTab, selectedAgent]);

  // ── Auto-refresh ──
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (autoRefresh) {
      refreshRef.current = setInterval(() => {
        setRefreshTick((t) => t + 1);
        refreshAll();
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [autoRefresh, refreshAll]);

  // ════════════════════════════════════════════════════════════════════════════
  // LOGGING TAB: Derived / computed
  // ════════════════════════════════════════════════════════════════════════════

  const allLogLevels = useMemo(
    () => [...new Set(loggerData.map((l) => l.level))].sort(),
    [loggerData]
  );
  const allLogSourceFiles = useMemo(
    () =>
      [
        ...new Set(
          loggerData.map((l) => l.source.split(':')[0]).filter(Boolean)
        ),
      ].sort(),
    [loggerData]
  );
  const allLogHours = useMemo(
    () => [...new Set(loggerData.map((l) => l.hour).filter(Boolean))].sort(),
    [loggerData]
  );

  const logLevelCounts = useMemo(() => {
    const c: Record<string, number> = {};

    loggerData.forEach((l) => {
      c[l.level] = (c[l.level] || 0) + 1;
    });

    return c;
  }, [loggerData]);

  const filteredLoggerData = useMemo(() => {
    let data = [...loggerData];

    if (logLevelFilter.size > 0) {
      data = data.filter((l) => logLevelFilter.has(l.level));
    }
    if (logHourFilter !== 'ALL') {
      data = data.filter((l) => l.hour === logHourFilter);
    }
    if (logSourceFilter) {
      data = data.filter((l) =>
        l.source.toLowerCase().includes(logSourceFilter.toLowerCase())
      );
    }
    if (logSearchTerm) {
      const q = logSearchTerm.toLowerCase();

      data = data.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q) ||
          l.level.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      let cmp = 0;

      if (logSortField === 'id') cmp = a.id - b.id;
      else {
        cmp = String((a as any)[logSortField]).localeCompare(
          String((b as any)[logSortField])
        );
      }

      return logSortDir === 'desc' ? -cmp : cmp;
    });

    return data;
  }, [
    loggerData,
    logLevelFilter,
    logHourFilter,
    logSourceFilter,
    logSearchTerm,
    logSortField,
    logSortDir,
  ]);

  const filteredLogLevelCounts = useMemo(() => {
    const c: Record<string, number> = {};

    filteredLoggerData.forEach((l) => {
      c[l.level] = (c[l.level] || 0) + 1;
    });

    return c;
  }, [filteredLoggerData]);

  const logTotalPages = Math.max(
    1,
    Math.ceil(filteredLoggerData.length / logPageSize)
  );
  const pagedLogData = filteredLoggerData.slice(
    (logPage - 1) * logPageSize,
    logPage * logPageSize
  );
  const hasLogFilters =
    logLevelFilter.size > 0 ||
    logSourceFilter !== '' ||
    logSearchTerm !== '' ||
    logHourFilter !== 'ALL';

  const toggleLogLevel = (level: string) => {
    const next = new Set(logLevelFilter);

    if (next.has(level)) next.delete(level);
    else next.add(level);
    setLogLevelFilter(next);
    setLogPage(1);
  };

  const toggleLogSort = (field: string) => {
    if (logSortField === field) {
      setLogSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setLogSortField(field);
      setLogSortDir('desc');
    }
  };

  const clearLogFilters = () => {
    setLogLevelFilter(new Set());
    setLogSourceFilter('');
    setLogSearchTerm('');
    setLogHourFilter('ALL');
    setLogPage(1);
  };

  const exportLogData = (format: 'csv' | 'json') => {
    const data = filteredLoggerData;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');

      a.href = URL.createObjectURL(blob);
      a.download = `optimusLogger_${Date.now()}.json`;
      a.click();
    } else {
      const csv = [
        'id,date,hour,timestamp,level,source,message',
        ...data.map(
          (r) =>
            `${r.id},"${r.date}","${r.hour}","${r.timestamp}","${r.level}","${
              r.source
            }","${r.message.replace(/"/g, '""')}"`
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');

      a.href = URL.createObjectURL(blob);
      a.download = `optimusLogger_${Date.now()}.csv`;
      a.click();
    }
  };

  // ── EMS Logs: derived ──
  const filteredEmsLogs = useMemo(() => {
    if (emsLogLevelFilter === 'ALL') return emsLogs;

    return emsLogs.filter((l) => l.level === emsLogLevelFilter);
  }, [emsLogs, emsLogLevelFilter]);

  const emsLogLevelCounts = useMemo(() => {
    const c: Record<string, number> = {};

    emsLogs.forEach((l) => {
      c[l.level] = (c[l.level] || 0) + 1;
    });

    return c;
  }, [emsLogs]);

  // ── Computed helpers ──
  const leader = agents.find((a) => a.isLeader);
  const healthyCount = agents.filter((a) => a.health > 0).length;
  const avgHealth =
    agents.length > 0
      ? (agents.reduce((s, a) => s + a.health, 0) / agents.length).toFixed(1)
      : '0';

  // ── Store names from mesh ──
  const allStoreNames = useMemo(() => {
    const names = new Set<string>();

    meshData.forEach((n) => Object.keys(n.stores).forEach((s) => names.add(s)));

    return Array.from(names).sort();
  }, [meshData]);

  // ── Credential computed values ──
  const credTypes = useMemo(() => {
    const types = new Set<string>();

    credentials.forEach((c) => c.type.forEach((t) => types.add(t)));

    return ['ALL', ...Array.from(types)];
  }, [credentials]);

  const filteredCreds = useMemo(
    () =>
      credentials.filter((c) => {
        if (credTypeFilter !== 'ALL' && !c.type.includes(credTypeFilter)) {
          return false;
        }
        if (credSearchTerm) {
          const term = credSearchTerm.toLowerCase();

          return (
            c.id.toLowerCase().includes(term) ||
            c.issuer.toLowerCase().includes(term) ||
            JSON.stringify(c.credentialSubject).toLowerCase().includes(term)
          );
        }

        return true;
      }),
    [credentials, credTypeFilter, credSearchTerm]
  );

  const credRevokedCount = credentials.filter((c) => c.revoked).length;
  const credActiveCount = credentials.length - credRevokedCount;
  const credIssuers = useMemo(
    () => new Set(credentials.map((c) => c.issuer)),
    [credentials]
  );
  const credSubjects = useMemo(
    () =>
      new Set(credentials.map((c) => c.credentialSubject?.id).filter(Boolean)),
    [credentials]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <DocumentTitle title="Analytics Dashboard - OptimusDDC">
      <div className="adp-page">
        {/* ═══════ TOOLBAR ═══════ */}
        <div className="adp-toolbar">
          <div className="adp-tb-left">
            <h1 className="adp-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              Analytics Dashboard
            </h1>
            <div className="adp-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`adp-tab-btn ${
                    activeTab === tab.id ? 'active' : ''
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="adp-tb-right">
            <div className="adp-agent-select">
              <label>Agent:</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(Number(e.target.value))}
              >
                {(agents.length > 0
                  ? agents
                  : ([
                      { nodeId: 1, name: 'optimusdb1' },
                      { nodeId: 2, name: 'optimusdb2' },
                      { nodeId: 3, name: 'optimusdb3' },
                    ] as any[])
                ).map((a) => (
                  <option key={a.nodeId} value={a.nodeId}>
                    {a.name} {a.isLeader ? '⭐' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={`adp-btn-ghost ${
                autoRefresh ? 'adp-active-refresh' : ''
              }`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '🔄 Live' : '⏸ Paused'}{' '}
              <span className="adp-muted">30s</span>
            </button>
            <button
              className="adp-btn-ghost"
              onClick={refreshAll}
              disabled={loading}
            >
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>

        {/* ═══════ ERROR BANNER ═══════ */}
        {error && (
          <div className="adp-error-banner">
            ⚠️ {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* ═══════ CONTENT ═══════ */}
        <div className="adp-content">
          {/* ═══════════════════════════════════════════════
              TAB: OVERVIEW
              Sources: /agent/status (×N), recent logger, events
              ═══════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="adp-tab-body">
              {/* KPI cards */}
              <div className="adp-kpi-row">
                {[
                  {
                    label: 'Cluster Health',
                    value: `${avgHealth}%`,
                    sub: `${healthyCount}/${agents.length} nodes`,
                    color: '#16a34a',
                    icon: '💚',
                  },
                  {
                    label: 'Active Nodes',
                    value: `${healthyCount} / ${agents.length}`,
                    sub: leader ? `Leader: ${leader.name}` : 'No leader',
                    color: '#2563eb',
                    icon: '🖥️',
                  },
                  {
                    label: 'Election Term',
                    value: leader ? `#${leader.electionTerm}` : 'N/A',
                    sub: 'Leader stable',
                    color: '#8b5cf6',
                    icon: '🗳️',
                  },
                  {
                    label: 'Logger Entries',
                    value: String(loggerData.length),
                    sub: `${logLevelCounts.ERROR || 0} errors`,
                    color: '#667eea',
                    icon: '📋',
                  },
                  {
                    label: 'EMS Events',
                    value: String(emsEvents.length),
                    sub: 'Last hour',
                    color: '#0d9488',
                    icon: '⚡',
                  },
                  {
                    label: 'Cache Hit Ratio',
                    value: cacheStats
                      ? `${(cacheStats.hit_ratio * 100).toFixed(1)}%`
                      : 'N/A',
                    sub: cacheStats ? `${cacheStats.hits} hits` : '',
                    color: '#d97706',
                    icon: '🎯',
                  },
                ].map((m, i) => (
                  <div key={i} className="adp-kpi-card">
                    <div className="adp-kpi-header">
                      <span className="adp-kpi-label">{m.label}</span>
                      <span className="adp-kpi-icon">{m.icon}</span>
                    </div>
                    <div className="adp-kpi-value" style={{ color: m.color }}>
                      {m.value}
                    </div>
                    <div className="adp-kpi-sub">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Node status cards */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    🖥️ Node Status{' '}
                    <span className="adp-card-src">from /agent/status</span>
                  </h3>
                </div>
                <div className="adp-node-grid">
                  {agents.map((a) => (
                    <div key={a.nodeId} className="adp-node-card">
                      <div className="adp-node-top">
                        <span
                          className={`adp-node-dot ${
                            a.health > 0 ? 'healthy' : 'down'
                          }`}
                        />
                        <span className="adp-node-name">{a.name}</span>
                        <span
                          className={`adp-badge ${
                            a.isLeader ? 'leader' : 'follower'
                          }`}
                        >
                          {a.isLeader ? '⭐ Leader' : 'Follower'}
                        </span>
                      </div>
                      <div className="adp-node-stats">
                        <div>
                          <span className="adp-muted">Health:</span>{' '}
                          <strong
                            className={
                              a.health > 50 ? 'adp-green' : 'adp-amber'
                            }
                          >
                            {a.health}%
                          </strong>
                        </div>
                        <div>
                          <span className="adp-muted">CPU:</span>{' '}
                          <strong>{a.cpu}</strong>
                        </div>
                        <div>
                          <span className="adp-muted">Memory:</span>{' '}
                          <strong>{a.memory}</strong>
                        </div>
                        <div>
                          <span className="adp-muted">Uptime:</span>{' '}
                          <strong>{a.uptime}</strong>
                        </div>
                      </div>
                      <div className="adp-health-bar">
                        <div
                          className="adp-health-fill"
                          style={{
                            width: `${a.health}%`,
                            background: a.health > 50 ? '#16a34a' : '#d97706',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <div className="adp-empty">Loading cluster status...</div>
                  )}
                </div>
              </div>

              {/* Recent logs + events preview */}
              <div className="adp-two-col">
                <div className="adp-card">
                  <div className="adp-card-header">
                    <h3 className="adp-card-title">📋 Recent Logs</h3>
                    <button
                      className="adp-btn-sm"
                      onClick={() => setActiveTab('logging')}
                    >
                      View All →
                    </button>
                  </div>
                  <div className="adp-mini-list">
                    {loggerData.slice(0, 8).map((log, i) => (
                      <div key={i} className="adp-mini-row">
                        <span
                          className="adp-level-badge"
                          style={{
                            background: `${getLevelColor(log.level)}15`,
                            color: getLevelColor(log.level),
                          }}
                        >
                          {log.level}
                        </span>
                        <span className="adp-mini-msg">{log.message}</span>
                        <span className="adp-mini-time">
                          {fmtTime(log.timestamp)}
                        </span>
                      </div>
                    ))}
                    {loggerData.length === 0 && (
                      <div className="adp-empty">No log data yet</div>
                    )}
                  </div>
                </div>
                <div className="adp-card">
                  <div className="adp-card-header">
                    <h3 className="adp-card-title">⚡ Recent Events</h3>
                    <button
                      className="adp-btn-sm"
                      onClick={() => setActiveTab('events')}
                    >
                      View All →
                    </button>
                  </div>
                  <div className="adp-mini-list">
                    {emsEvents.slice(0, 8).map((ev, i) => (
                      <div key={i} className="adp-mini-row">
                        <span
                          className="adp-level-badge"
                          style={{
                            background: `${getEventColor(ev.type)}15`,
                            color: getEventColor(ev.type),
                          }}
                        >
                          {ev.type}
                        </span>
                        <span className="adp-mini-msg">{ev.detail}</span>
                        <span className="adp-mini-time">
                          {fmtTime(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                    {emsEvents.length === 0 && (
                      <div className="adp-empty">No events yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB: LOGGING — Full optimusLogger Dashboard
              Source: GET /ems/sql?q=SELECT * FROM optimusLogger
              Schema: { date, hour, id, level, message, source, timestamp }
              ═══════════════════════════════════════════════ */}
          {activeTab === 'logging' && (
            <div className="adp-tab-body">
              {/* KPI strip */}
              <div className="adp-kpi-row compact">
                {[
                  {
                    l: 'Total Entries',
                    v: loggerData.length,
                    c: '#667eea',
                    i: '📊',
                  },
                  {
                    l: 'Filtered',
                    v: filteredLoggerData.length,
                    c: '#2563eb',
                    i: '🔍',
                  },
                  {
                    l: 'Errors',
                    v: logLevelCounts.ERROR || 0,
                    c: '#dc2626',
                    i: '❌',
                  },
                  {
                    l: 'Warnings',
                    v: logLevelCounts.WARN || 0,
                    c: '#d97706',
                    i: '⚠️',
                  },
                  {
                    l: 'Elections',
                    v: logLevelCounts.ELECTION || 0,
                    c: '#8b5cf6',
                    i: '🗳️',
                  },
                  {
                    l: 'Queries',
                    v: logLevelCounts.QUERY || 0,
                    c: '#2563eb',
                    i: '🔎',
                  },
                ].map((m, i) => (
                  <div key={i} className="adp-kpi-card compact">
                    <div className="adp-kpi-header">
                      <span className="adp-kpi-label">{m.l}</span>
                      <span className="adp-kpi-icon">{m.i}</span>
                    </div>
                    <div className="adp-kpi-value" style={{ color: m.c }}>
                      {m.v}
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="adp-card adp-log-filters">
                <div className="adp-filter-row">
                  <span className="adp-filter-label">Level:</span>
                  {allLogLevels.map((lv) => {
                    const on = logLevelFilter.has(lv);
                    const c = getLevelColor(lv);

                    return (
                      <button
                        key={lv}
                        className={`adp-chip ${on ? 'active' : ''}`}
                        style={
                          on
                            ? { borderColor: c, background: `${c}15`, color: c }
                            : {}
                        }
                        onClick={() => toggleLogLevel(lv)}
                      >
                        {lv}{' '}
                        <span className="adp-chip-count">
                          ({logLevelCounts[lv] || 0})
                        </span>
                      </button>
                    );
                  })}
                  {hasLogFilters && (
                    <button
                      className="adp-chip adp-chip-clear"
                      onClick={clearLogFilters}
                    >
                      ✕ Clear All
                    </button>
                  )}
                </div>

                <div className="adp-filter-row">
                  <input
                    type="text"
                    className="adp-search-input"
                    placeholder="🔍 Search messages, sources, levels..."
                    value={logSearchTerm}
                    onChange={(e) => {
                      setLogSearchTerm(e.target.value);
                      setLogPage(1);
                    }}
                  />

                  <span className="adp-filter-label">Source:</span>
                  <select
                    className="adp-select"
                    value={logSourceFilter}
                    onChange={(e) => {
                      setLogSourceFilter(e.target.value);
                      setLogPage(1);
                    }}
                  >
                    <option value="">All Sources</option>
                    {allLogSourceFiles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <span className="adp-filter-label">Hour:</span>
                  <div className="adp-btn-group">
                    <button
                      className={logHourFilter === 'ALL' ? 'active' : ''}
                      onClick={() => {
                        setLogHourFilter('ALL');
                        setLogPage(1);
                      }}
                    >
                      All
                    </button>
                    {allLogHours.map((h) => (
                      <button
                        key={h}
                        className={logHourFilter === h ? 'active' : ''}
                        onClick={() => {
                          setLogHourFilter(h);
                          setLogPage(1);
                        }}
                      >
                        {h}:00
                      </button>
                    ))}
                  </div>

                  <div className="adp-filter-sep" />
                  <button
                    className="adp-btn-sm"
                    onClick={() => exportLogData('csv')}
                  >
                    📥 CSV
                  </button>
                  <button
                    className="adp-btn-sm"
                    onClick={() => exportLogData('json')}
                  >
                    📥 JSON
                  </button>
                </div>
              </div>

              {/* Level distribution bar */}
              <div className="adp-card adp-distrib-bar">
                <div className="adp-distrib-track">
                  {allLogLevels.map((lv) => {
                    const pct =
                      filteredLoggerData.length > 0
                        ? ((filteredLogLevelCounts[lv] || 0) /
                            filteredLoggerData.length) *
                          100
                        : 0;

                    return pct > 0 ? (
                      <div
                        key={lv}
                        className="adp-distrib-seg"
                        title={`${lv}: ${
                          filteredLogLevelCounts[lv]
                        } (${pct.toFixed(1)}%)`}
                        style={{
                          width: `${pct}%`,
                          background: getLevelColor(lv),
                        }}
                      />
                    ) : null;
                  })}
                </div>
                <div className="adp-distrib-legend">
                  {allLogLevels.map((lv) => {
                    const c = filteredLogLevelCounts[lv] || 0;

                    return c > 0 ? (
                      <span key={lv} className="adp-legend-item">
                        <span
                          className="adp-legend-dot"
                          style={{ background: getLevelColor(lv) }}
                        />
                        {lv}: <strong>{c}</strong>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Log table */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    📋 optimusLogger{' '}
                    <span className="adp-card-src">
                      /ems/sql?q=SELECT * FROM optimusLogger
                    </span>
                  </h3>
                  <div className="adp-table-info">
                    <span className="adp-muted">
                      <strong>
                        {(logPage - 1) * logPageSize + 1}–
                        {Math.min(
                          logPage * logPageSize,
                          filteredLoggerData.length
                        )}
                      </strong>{' '}
                      of <strong>{filteredLoggerData.length}</strong>
                    </span>
                    <select
                      className="adp-select sm"
                      value={logPageSize}
                      onChange={(e) => {
                        setLogPageSize(Number(e.target.value));
                        setLogPage(1);
                      }}
                    >
                      {[25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}/page
                        </option>
                      ))}
                    </select>
                    {loggerLoading && <span className="adp-spinner-sm" />}
                  </div>
                </div>

                <div className="adp-table-wrap">
                  <table className="adp-table">
                    <thead>
                      <tr>
                        {[
                          { k: 'id', l: 'ID', w: 50 },
                          { k: 'timestamp', l: 'Timestamp', w: 170 },
                          { k: 'hour', l: 'Hour', w: 55 },
                          { k: 'level', l: 'Level', w: 95 },
                          { k: 'source', l: 'Source', w: 230 },
                          { k: 'message', l: 'Message', w: undefined },
                        ].map((col) => (
                          <th
                            key={col.k}
                            style={{ width: col.w }}
                            onClick={() => toggleLogSort(col.k)}
                            className="adp-sortable"
                          >
                            {col.l}{' '}
                            {logSortField === col.k && (
                              <span className="adp-sort-arrow">
                                {logSortDir === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLogData.map((log, i) => (
                        <tr
                          key={log.id}
                          onClick={() => setLogDetailEntry(log)}
                          className={i % 2 === 1 ? 'adp-row-alt' : ''}
                        >
                          <td className="adp-td-muted">{log.id}</td>
                          <td className="adp-td-mono">
                            {fmtDateTime(log.timestamp)}
                          </td>
                          <td className="adp-td-center">{log.hour}:00</td>
                          <td>
                            <span
                              className="adp-level-badge"
                              style={{
                                background: `${getLevelColor(log.level)}15`,
                                color: getLevelColor(log.level),
                              }}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td className="adp-td-source">{log.source}</td>
                          <td className="adp-td-message">{log.message}</td>
                        </tr>
                      ))}
                      {pagedLogData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="adp-td-empty">
                            {loggerLoading
                              ? 'Loading...'
                              : 'No log entries match the current filters'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {logTotalPages > 1 && (
                  <div className="adp-pagination">
                    <button
                      disabled={logPage === 1}
                      onClick={() => setLogPage(1)}
                    >
                      ⟨⟨
                    </button>
                    <button
                      disabled={logPage === 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    >
                      ⟨
                    </button>
                    {Array.from(
                      { length: Math.min(7, logTotalPages) },
                      (_, i) => {
                        let p: number;

                        if (logTotalPages <= 7) p = i + 1;
                        else if (logPage <= 4) p = i + 1;
                        else if (logPage >= logTotalPages - 3) {
                          p = logTotalPages - 6 + i;
                        } else p = logPage - 3 + i;

                        return (
                          <button
                            key={p}
                            className={logPage === p ? 'active' : ''}
                            onClick={() => setLogPage(p)}
                          >
                            {p}
                          </button>
                        );
                      }
                    )}
                    <button
                      disabled={logPage === logTotalPages}
                      onClick={() =>
                        setLogPage((p) => Math.min(logTotalPages, p + 1))
                      }
                    >
                      ⟩
                    </button>
                    <button
                      disabled={logPage === logTotalPages}
                      onClick={() => setLogPage(logTotalPages)}
                    >
                      ⟩⟩
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ LOG DETAIL MODAL ═══════ */}
          {logDetailEntry && (
            <>
              <div
                className="adp-overlay"
                onClick={() => setLogDetailEntry(null)}
              />
              <div className="adp-modal">
                <div className="adp-modal-header">
                  <div className="adp-modal-title-row">
                    <span
                      className="adp-level-badge"
                      style={{
                        background: `${getLevelColor(logDetailEntry.level)}15`,
                        color: getLevelColor(logDetailEntry.level),
                      }}
                    >
                      {logDetailEntry.level}
                    </span>
                    <span className="adp-modal-title">
                      Log Entry #{logDetailEntry.id}
                    </span>
                  </div>
                  <button
                    className="adp-close-btn"
                    onClick={() => setLogDetailEntry(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="adp-modal-body">
                  <div className="adp-detail-grid">
                    <span className="adp-detail-key">ID:</span>
                    <span className="adp-detail-val mono">
                      {logDetailEntry.id}
                    </span>
                    <span className="adp-detail-key">Timestamp:</span>
                    <span className="adp-detail-val mono">
                      {fmtDateTime(logDetailEntry.timestamp)} UTC
                    </span>
                    <span className="adp-detail-key">Date:</span>
                    <span className="adp-detail-val mono">
                      {logDetailEntry.date}
                    </span>
                    <span className="adp-detail-key">Hour:</span>
                    <span className="adp-detail-val mono">
                      {logDetailEntry.hour}:00
                    </span>
                    <span className="adp-detail-key">Level:</span>
                    <span
                      className="adp-level-badge"
                      style={{
                        background: `${getLevelColor(logDetailEntry.level)}15`,
                        color: getLevelColor(logDetailEntry.level),
                      }}
                    >
                      {logDetailEntry.level}
                    </span>
                    <span className="adp-detail-key">Source:</span>
                    <code className="adp-code-inline">
                      {logDetailEntry.source}
                    </code>
                  </div>
                  <div className="adp-detail-section">
                    <span className="adp-detail-section-title">Message</span>
                    <p className="adp-detail-message">
                      {logDetailEntry.message}
                    </p>
                  </div>
                  <div className="adp-detail-section">
                    <span className="adp-detail-section-title">Raw JSON</span>
                    <pre className="adp-detail-json">
                      {JSON.stringify(logDetailEntry, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="adp-modal-footer">
                  <button
                    className="adp-btn-sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        JSON.stringify(logDetailEntry, null, 2)
                      )
                    }
                  >
                    📋 Copy JSON
                  </button>
                  <button
                    className="adp-btn-sm"
                    onClick={() =>
                      navigator.clipboard.writeText(logDetailEntry.message)
                    }
                  >
                    📝 Copy Message
                  </button>
                  <span style={{ flex: 1 }} />
                  <button
                    className="adp-btn-primary"
                    onClick={() => setLogDetailEntry(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════
              TAB: EMS LOGS
              Source: GET /ems/logs?limit=100&since_min=30
              ═══════════════════════════════════════════════ */}
          {activeTab === 'ems-logs' && (
            <div className="adp-tab-body">
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    📄 EMS Filtered Logs{' '}
                    <span className="adp-card-src">
                      GET /ems/logs?limit=100&since_min=30
                    </span>
                  </h3>
                  <div className="adp-filter-chips">
                    {['ALL', 'INFO', 'WARN', 'ERROR'].map((lv) => (
                      <button
                        key={lv}
                        className={`adp-chip ${
                          emsLogLevelFilter === lv ? 'active' : ''
                        }`}
                        style={
                          emsLogLevelFilter === lv
                            ? {
                                borderColor: getLevelColor(lv),
                                background: `${getLevelColor(lv)}15`,
                                color: getLevelColor(lv),
                              }
                            : {}
                        }
                        onClick={() => setEmsLogLevelFilter(lv)}
                      >
                        {lv}{' '}
                        {lv !== 'ALL' && (
                          <span className="adp-chip-count">
                            ({emsLogLevelCounts[lv] || 0})
                          </span>
                        )}
                      </button>
                    ))}
                    {emsLogsLoading && <span className="adp-spinner-sm" />}
                  </div>
                </div>
                <div className="adp-table-wrap">
                  <table className="adp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 130 }}>Time</th>
                        <th style={{ width: 80 }}>Level</th>
                        <th style={{ width: 180 }}>Source</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmsLogs.map((log, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 1 ? 'adp-row-alt' : ''}
                        >
                          <td className="adp-td-mono">
                            {fmtTime(log.timestamp)}
                          </td>
                          <td>
                            <span
                              className="adp-level-badge"
                              style={{
                                background: `${getLevelColor(log.level)}15`,
                                color: getLevelColor(log.level),
                              }}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td className="adp-td-source">{log.source}</td>
                          <td className="adp-td-message">{log.message}</td>
                        </tr>
                      ))}
                      {filteredEmsLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="adp-td-empty">
                            {emsLogsLoading
                              ? 'Loading...'
                              : 'No EMS logs available'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="adp-card-footer">
                  <span className="adp-muted">
                    Showing {filteredEmsLogs.length} of {emsLogs.length} entries
                  </span>
                  <button
                    className="adp-btn-sm"
                    onClick={() => exportLogData('json')}
                  >
                    📥 Export
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB: EVENTS
              Source: GET /ems/events?limit=50&since_min=30
              ═══════════════════════════════════════════════ */}
          {activeTab === 'events' && (
            <div className="adp-tab-body">
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    ⚡ System Events{' '}
                    <span className="adp-card-src">
                      GET /ems/events?limit=50&since_min=30
                    </span>
                  </h3>
                  {emsEventsLoading && <span className="adp-spinner-sm" />}
                </div>
                <div className="adp-timeline">
                  {emsEvents.map((ev, i) => (
                    <div key={ev.id || i} className="adp-timeline-item">
                      <div className="adp-timeline-track">
                        <div
                          className="adp-timeline-dot"
                          style={{
                            background: getEventColor(ev.type),
                            boxShadow: `0 0 0 3px ${getEventColor(ev.type)}30`,
                          }}
                        />
                        {i < emsEvents.length - 1 && (
                          <div className="adp-timeline-line" />
                        )}
                      </div>
                      <div className="adp-timeline-content">
                        <div className="adp-timeline-top">
                          <span
                            className="adp-level-badge"
                            style={{
                              background: `${getEventColor(ev.type)}15`,
                              color: getEventColor(ev.type),
                            }}
                          >
                            {ev.type}
                          </span>
                          {ev.client_id && (
                            <span
                              className="adp-muted"
                              style={{ fontSize: 11, fontFamily: 'monospace' }}
                            >
                              {ev.client_id}
                            </span>
                          )}
                          <span className="adp-muted">
                            {fmtRelative(ev.timestamp)}
                          </span>
                        </div>
                        <p className="adp-timeline-detail">{ev.detail}</p>
                      </div>
                      <span className="adp-mini-time">
                        {fmtTime(ev.timestamp)}
                      </span>
                    </div>
                  ))}
                  {emsEvents.length === 0 && (
                    <div className="adp-empty">
                      {emsEventsLoading
                        ? 'Loading events...'
                        : 'No events available'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB: PERFORMANCE
              Sources: GET /benchmarks, POST /command (cache_stats)
              ═══════════════════════════════════════════════ */}
          {activeTab === 'performance' && (
            <div className="adp-tab-body">
              {/* KPIs */}
              <div className="adp-kpi-row">
                {[
                  {
                    l: 'Ops/Second',
                    v: benchmarks ? String(benchmarks.ops_per_second) : 'N/A',
                    c: '#7c3aed',
                    s: 'Sustained throughput',
                  },
                  {
                    l: 'Avg Latency',
                    v: benchmarks ? `${benchmarks.avg_latency_ms}ms` : 'N/A',
                    c: '#2563eb',
                    s: 'Mean response',
                  },
                  {
                    l: 'P99 Latency',
                    v: benchmarks ? `${benchmarks.p99_latency_ms}ms` : 'N/A',
                    c: '#d97706',
                    s: '99th percentile',
                  },
                  {
                    l: 'Total Ops',
                    v: benchmarks
                      ? benchmarks.total_operations.toLocaleString()
                      : 'N/A',
                    c: '#0d9488',
                    s: 'Since reset',
                  },
                ].map((m, i) => (
                  <div key={i} className="adp-kpi-card">
                    <div className="adp-kpi-label">{m.l}</div>
                    <div className="adp-kpi-value" style={{ color: m.c }}>
                      {m.v}
                    </div>
                    <div className="adp-kpi-sub">{m.s}</div>
                  </div>
                ))}
              </div>

              {/* Strategy breakdown */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    🚀 Query Strategy Performance{' '}
                    <span className="adp-card-src">GET /benchmarks</span>
                  </h3>
                  {perfLoading && <span className="adp-spinner-sm" />}
                </div>
                <div className="adp-strategy-list">
                  {(benchmarks?.by_strategy || []).map((s, i) => {
                    const maxOps = Math.max(
                      ...(benchmarks?.by_strategy || []).map((x) => x.ops),
                      1
                    );
                    const pct = ((s.ops / maxOps) * 100).toFixed(0);
                    const barColor =
                      s.avg_ms < 10
                        ? '#16a34a'
                        : s.avg_ms < 30
                        ? '#2563eb'
                        : s.avg_ms < 50
                        ? '#d97706'
                        : '#dc2626';

                    return (
                      <div key={i} className="adp-strategy-row">
                        <code className="adp-strategy-name">{s.strategy}</code>
                        <div className="adp-strategy-bar-track">
                          <div
                            className="adp-strategy-bar-fill"
                            style={{ width: `${pct}%`, background: barColor }}
                          >
                            {parseInt(pct, 10) > 30 && (
                              <span className="adp-bar-label">
                                {s.ops} ops/s
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className="adp-strategy-latency"
                          style={{ color: barColor }}
                        >
                          {s.avg_ms}ms
                        </span>
                      </div>
                    );
                  })}
                  {(!benchmarks || benchmarks.by_strategy.length === 0) && (
                    <div className="adp-empty">
                      {perfLoading
                        ? 'Loading...'
                        : 'No benchmark data available'}
                    </div>
                  )}
                </div>
              </div>

              {/* Cache stats */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    🎯 Cache Statistics{' '}
                    <span className="adp-card-src">via POST /command</span>
                  </h3>
                </div>
                <div className="adp-cache-grid">
                  {cacheStats ? (
                    [
                      {
                        l: 'Hits',
                        v: cacheStats.hits.toLocaleString(),
                        c: '#16a34a',
                      },
                      {
                        l: 'Misses',
                        v: cacheStats.misses.toLocaleString(),
                        c: '#dc2626',
                      },
                      {
                        l: 'Ratio',
                        v: `${(cacheStats.hit_ratio * 100).toFixed(1)}%`,
                        c: '#0d9488',
                      },
                      {
                        l: 'Evictions',
                        v: cacheStats.evictions.toLocaleString(),
                        c: '#d97706',
                      },
                      { l: 'Size', v: cacheStats.size, c: '#2563eb' },
                      { l: 'TTL', v: cacheStats.ttl_default, c: '#7c3aed' },
                    ].map((m, i) => (
                      <div key={i} className="adp-cache-item">
                        <div className="adp-cache-label">{m.l}</div>
                        <div className="adp-cache-value" style={{ color: m.c }}>
                          {m.v}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="adp-empty">No cache data available</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB: DATA STORES
              Sources: /debug/optimusdb/mesh (×N), SQL on datacatalog, toscametadata
              ═══════════════════════════════════════════════ */}
          {activeTab === 'stores' && (
            <div className="adp-tab-body">
              {/* Summary cards */}
              <div className="adp-two-col">
                <div className="adp-card adp-store-summary">
                  <span className="adp-store-title">
                    💾 Data Catalog (OptimusDB-RDBMS)
                  </span>
                  <div className="adp-store-stats">
                    <div>
                      <span className="adp-muted">Entries:</span>{' '}
                      <strong>{catalogStats?.total ?? '–'}</strong>
                    </div>
                    <div>
                      <span className="adp-muted">Tables:</span>{' '}
                      <strong>{catalogStats?.tables ?? '–'}</strong>
                    </div>
                    <div>
                      <span className="adp-muted">Updated:</span>{' '}
                      <strong>
                        {catalogStats?.updated
                          ? fmtRelative(catalogStats.updated)
                          : '–'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="adp-card adp-store-summary">
                  <span className="adp-store-title">
                    📄 TOSCA Metadata (OptimusDB-RDBMS)
                  </span>
                  <div className="adp-store-stats">
                    <div>
                      <span className="adp-muted">Files:</span>{' '}
                      <strong>{toscaStats?.files ?? '–'}</strong>
                    </div>
                    <div>
                      <span className="adp-muted">Size:</span>{' '}
                      <strong>
                        {toscaStats
                          ? `${(toscaStats.size / 1024).toFixed(1)}KB`
                          : '–'}
                      </strong>
                    </div>
                    <div>
                      <span className="adp-muted">Uploaders:</span>{' '}
                      <strong>{toscaStats?.uploaders ?? '–'}</strong>
                    </div>
                    <div>
                      <span className="adp-muted">Last:</span>{' '}
                      <strong>
                        {toscaStats?.last ? fmtRelative(toscaStats.last) : '–'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* OptimusDB-CRUD Replication */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <h3 className="adp-card-title">
                    🗄️ OptimusDB-CRUD Replication{' '}
                    <span className="adp-card-src">
                      GET /debug/optimusdb/mesh (×{meshData.length})
                    </span>
                  </h3>
                  {storesLoading && <span className="adp-spinner-sm" />}
                </div>
                <div className="adp-table-wrap">
                  <table className="adp-table">
                    <thead>
                      <tr>
                        <th>Store</th>
                        <th>Type</th>
                        {meshData.map((n) => (
                          <th key={n.nodeId}>{n.nodeName}</th>
                        ))}
                        <th>Δ</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStoreNames.map((storeName, i) => {
                        const counts = meshData.map(
                          (n) => n.stores[storeName]?.entry_count || 0
                        );
                        const maxC = Math.max(...counts, 0);
                        const minC = Math.min(
                          ...counts.filter((c) => c > 0),
                          maxC
                        );
                        const delta = maxC - minC;
                        const synced = delta <= 2;
                        const storeType =
                          meshData.find((n) => n.stores[storeName])?.stores[
                            storeName
                          ]?.type || '';

                        return (
                          <tr
                            key={storeName}
                            className={i % 2 === 1 ? 'adp-row-alt' : ''}
                          >
                            <td className="adp-td-mono bold">{storeName}</td>
                            <td>
                              <span className="adp-type-badge">
                                {storeType === 'DocumentStore'
                                  ? 'docstore'
                                  : storeType === 'EventLogStore'
                                  ? 'eventlog'
                                  : storeType}
                              </span>
                            </td>
                            {meshData.map((n) => (
                              <td key={n.nodeId} className="adp-td-mono bold">
                                {n.stores[storeName]?.entry_count ?? '–'}
                              </td>
                            ))}
                            <td
                              className={`adp-td-mono bold ${
                                synced ? 'adp-green' : 'adp-amber'
                              }`}
                            >
                              ±{delta}
                            </td>
                            <td>
                              <span
                                className={`adp-sync-badge ${
                                  synced ? 'synced' : 'syncing'
                                }`}
                              >
                                {synced ? '✓ Synced' : '⟳ Syncing'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {allStoreNames.length === 0 && (
                        <tr>
                          <td
                            colSpan={3 + meshData.length}
                            className="adp-td-empty"
                          >
                            {storesLoading
                              ? 'Loading...'
                              : 'No OptimusDB-CRUD store data available'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PEER NETWORK TAB ═══════ */}
          {activeTab === 'peers' && (
            <div className="adp-tab-content adp-fade-in">
              {/* Peer network overview KPIs — use cluster data from /agent/status */}
              {(() => {
                const cl = peerData[0]?.cluster;
                const totalPeers =
                  cl?.total_peers ||
                  peerData.reduce((s, nd) => Math.max(s, nd.peers.length), 0);
                const connectedPeers =
                  cl?.connected_peers ||
                  peerData.reduce(
                    (s, nd) =>
                      Math.max(s, nd.peers.filter((p) => p.connected).length),
                    0
                  );
                const disconnected = totalPeers - connectedPeers;

                return (
                  <div className="adp-kpi-row">
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Total Peers</div>
                      <div className="adp-kpi-value">{totalPeers}</div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Connected</div>
                      <div className="adp-kpi-value adp-green">
                        {connectedPeers}
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Disconnected</div>
                      <div className="adp-kpi-value adp-red">
                        {disconnected}
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Nodes Reporting</div>
                      <div className="adp-kpi-value">{peerData.length}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Connectivity matrix */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <span className="adp-card-title">
                    🌐 P2P Connectivity Matrix
                  </span>
                  {peersLoading && (
                    <span className="adp-loading-badge">Loading...</span>
                  )}
                </div>
                <div className="adp-card-body">
                  {peerData.length > 0 ? (
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th className="adp-th">Node</th>
                            <th className="adp-th">Peer ID</th>
                            <th className="adp-th">Peers Found</th>
                            <th className="adp-th">Connected</th>
                            <th className="adp-th">Peer Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {peerData.map((nd) => (
                            <tr key={nd.nodeId} className="adp-tr">
                              <td className="adp-td adp-bold">{nd.nodeName}</td>
                              <td
                                className="adp-td adp-mono"
                                style={{
                                  fontSize: '11px',
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {nd.peerId || '—'}
                              </td>
                              <td className="adp-td">{nd.peers.length}</td>
                              <td className="adp-td">
                                <span
                                  className={
                                    nd.peers.filter((p) => p.connected)
                                      .length === nd.peers.length
                                      ? 'adp-green'
                                      : 'adp-amber'
                                  }
                                >
                                  {nd.peers.filter((p) => p.connected).length}/
                                  {nd.peers.length}
                                </span>
                              </td>
                              <td className="adp-td">
                                <div className="adp-peer-chips">
                                  {nd.peers.map((p, i) => (
                                    <span
                                      key={i}
                                      className={`adp-peer-chip ${
                                        p.connected
                                          ? 'connected'
                                          : 'disconnected'
                                      }`}
                                      title={`${p.peer_id}\nRole: ${
                                        p.role || 'Unknown'
                                      }\nHealth: ${p.health?.score || 'N/A'} (${
                                        p.health?.status || '—'
                                      })\nCPU: ${
                                        p.health?.cpu_usage || '—'
                                      } | Mem: ${p.health?.memory_used || '—'}`}
                                    >
                                      {p.connected ? '●' : '○'}{' '}
                                      {p.role || p.peer_id.slice(0, 12) + '…'}
                                      {p.health?.score && (
                                        <span className="adp-peer-latency">
                                          {p.health.score}%
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                  {nd.peers.length === 0 && (
                                    <span className="adp-muted">
                                      No peers discovered
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="adp-empty-state">
                      {peersLoading
                        ? 'Discovering peers…'
                        : 'No peer data available'}
                    </div>
                  )}
                </div>
              </div>

              {/* Node addresses */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <span className="adp-card-title">📡 Multiaddr Endpoints</span>
                </div>
                <div className="adp-card-body">
                  {peerData.map((nd) => (
                    <div key={nd.nodeId} className="adp-addr-block">
                      <div className="adp-addr-node-label">{nd.nodeName}</div>
                      {/* Node's own listening addresses */}
                      {(nd.addresses || []).map((addr, i) => (
                        <div key={`own-${i}`} className="adp-addr-row">
                          <span className="adp-addr-dot green">●</span>
                          <span
                            className="adp-mono"
                            style={{ fontSize: '11px' }}
                          >
                            {addr}
                          </span>
                        </div>
                      ))}
                      {(!nd.addresses || nd.addresses.length === 0) && (
                        <div
                          className="adp-muted"
                          style={{ padding: '4px 0 4px 16px' }}
                        >
                          No addresses
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contribution scores */}
              {contributionData.length > 0 && (
                <div className="adp-card">
                  <div className="adp-card-header">
                    <span className="adp-card-title">
                      🏆 Node Contributions
                    </span>
                  </div>
                  <div className="adp-card-body">
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th className="adp-th">Node</th>
                            <th className="adp-th">Queries Served</th>
                            <th className="adp-th">Replications</th>
                            <th className="adp-th">Uploads</th>
                            <th className="adp-th">Uptime (h)</th>
                            <th className="adp-th">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionData
                            .sort((a, b) => b.score - a.score)
                            .map((cd, i) => (
                              <tr key={cd.nodeId} className="adp-tr">
                                <td className="adp-td adp-bold">
                                  {i === 0 && '🥇 '}
                                  {i === 1 && '🥈 '}
                                  {i === 2 && '🥉 '}
                                  {cd.nodeName}
                                </td>
                                <td className="adp-td">
                                  {cd.queries_served.toLocaleString()}
                                </td>
                                <td className="adp-td">
                                  {cd.replications.toLocaleString()}
                                </td>
                                <td className="adp-td">
                                  {cd.uploads.toLocaleString()}
                                </td>
                                <td className="adp-td">
                                  {cd.uptime_hours.toFixed(1)}
                                </td>
                                <td className="adp-td">
                                  <div className="adp-score-bar-wrap">
                                    <div
                                      className="adp-score-bar-fill"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          (cd.score /
                                            Math.max(
                                              ...contributionData.map(
                                                (c) => c.score || 1
                                              )
                                            )) *
                                            100
                                        )}%`,
                                      }}
                                    />
                                    <span className="adp-score-label">
                                      {cd.score.toLocaleString()}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ CREDENTIALS TAB ═══════ */}
          {activeTab === 'credentials' && (
            <div className="adp-tab-content adp-fade-in">
              {/* Credential KPIs */}
              <div className="adp-kpi-row">
                <div className="adp-kpi-card">
                  <div className="adp-kpi-label">Total Credentials</div>
                  <div className="adp-kpi-value">{credentials.length}</div>
                </div>
                <div className="adp-kpi-card">
                  <div className="adp-kpi-label">Active</div>
                  <div className="adp-kpi-value adp-green">
                    {credActiveCount}
                  </div>
                </div>
                <div className="adp-kpi-card">
                  <div className="adp-kpi-label">Revoked</div>
                  <div className="adp-kpi-value adp-red">
                    {credRevokedCount}
                  </div>
                </div>
                <div className="adp-kpi-card">
                  <div className="adp-kpi-label">Unique Issuers</div>
                  <div className="adp-kpi-value">{credIssuers.size}</div>
                </div>
                <div className="adp-kpi-card">
                  <div className="adp-kpi-label">Unique Subjects</div>
                  <div className="adp-kpi-value">{credSubjects.size}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <span className="adp-card-title">
                    🔐 Verifiable Credentials (W3C DID)
                  </span>
                  {credentialsLoading && (
                    <span className="adp-loading-badge">Loading...</span>
                  )}
                </div>
                <div className="adp-filter-row">
                  <div className="adp-filter-chips">
                    {credTypes.map((t) => (
                      <button
                        key={t}
                        className={`adp-chip ${
                          credTypeFilter === t ? 'active' : ''
                        }`}
                        onClick={() => setCredTypeFilter(t)}
                      >
                        {t === 'ALL'
                          ? 'All Types'
                          : t.replace('VerifiableCredential', 'VC')}
                        {t === 'ALL'
                          ? ` (${credentials.length})`
                          : ` (${
                              credentials.filter((c) => c.type.includes(t))
                                .length
                            })`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="adp-search-input"
                    placeholder="Search by ID, issuer, subject…"
                    value={credSearchTerm}
                    onChange={(e) => setCredSearchTerm(e.target.value)}
                  />
                </div>
                <div className="adp-card-body">
                  {filteredCreds.length > 0 ? (
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th className="adp-th">ID</th>
                            <th className="adp-th">Type</th>
                            <th className="adp-th">Issuer</th>
                            <th className="adp-th">Subject</th>
                            <th className="adp-th">Issued</th>
                            <th className="adp-th">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCreds.map((cred, idx) => (
                            <tr
                              key={cred.id || idx}
                              className="adp-tr adp-clickable"
                              onClick={() => setCredDetailEntry(cred)}
                            >
                              <td
                                className="adp-td adp-mono"
                                style={{
                                  fontSize: '11px',
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {cred.id}
                              </td>
                              <td className="adp-td">
                                {cred.type.map((t) => (
                                  <span key={t} className="adp-cred-type-badge">
                                    {t.replace('VerifiableCredential', 'VC')}
                                  </span>
                                ))}
                              </td>
                              <td
                                className="adp-td adp-mono"
                                style={{
                                  fontSize: '11px',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {cred.issuer}
                              </td>
                              <td
                                className="adp-td adp-mono"
                                style={{
                                  fontSize: '11px',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {cred.credentialSubject?.id ||
                                  cred.credentialSubject?.name ||
                                  '—'}
                              </td>
                              <td className="adp-td">
                                {cred.issuanceDate
                                  ? fmtTime(cred.issuanceDate)
                                  : '—'}
                              </td>
                              <td className="adp-td">
                                {cred.revoked ? (
                                  <span className="adp-status-badge revoked">
                                    ✗ Revoked
                                  </span>
                                ) : (
                                  <span className="adp-status-badge active">
                                    ✓ Active
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="adp-empty-state">
                      {credentialsLoading
                        ? 'Loading credentials…'
                        : 'No credentials found'}
                    </div>
                  )}
                </div>
              </div>

              {/* Credential Detail Modal */}
              {credDetailEntry && (
                <div
                  className="adp-modal-overlay"
                  onClick={() => setCredDetailEntry(null)}
                >
                  <div
                    className="adp-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="adp-modal-header">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          className={`adp-status-badge ${
                            credDetailEntry.revoked ? 'revoked' : 'active'
                          }`}
                        >
                          {credDetailEntry.revoked ? '✗ Revoked' : '✓ Active'}
                        </span>
                        <span className="adp-mono" style={{ fontSize: '12px' }}>
                          {credDetailEntry.id}
                        </span>
                      </div>
                      <button
                        className="adp-modal-close"
                        onClick={() => setCredDetailEntry(null)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="adp-modal-body">
                      <div className="adp-detail-grid">
                        <div className="adp-detail-field">
                          <span className="adp-detail-label">Type</span>
                          <span>{credDetailEntry.type.join(', ')}</span>
                        </div>
                        <div className="adp-detail-field">
                          <span className="adp-detail-label">Issuer</span>
                          <span className="adp-mono">
                            {credDetailEntry.issuer}
                          </span>
                        </div>
                        <div className="adp-detail-field">
                          <span className="adp-detail-label">Issued</span>
                          <span>{credDetailEntry.issuanceDate}</span>
                        </div>
                        {credDetailEntry.expirationDate && (
                          <div className="adp-detail-field">
                            <span className="adp-detail-label">Expires</span>
                            <span>{credDetailEntry.expirationDate}</span>
                          </div>
                        )}
                      </div>
                      <div className="adp-detail-section">
                        <div className="adp-detail-label">
                          Credential Subject
                        </div>
                        <pre className="adp-json-block">
                          {JSON.stringify(
                            credDetailEntry.credentialSubject,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      {credDetailEntry.proof && (
                        <div className="adp-detail-section">
                          <div className="adp-detail-label">Proof</div>
                          <pre className="adp-json-block">
                            {JSON.stringify(credDetailEntry.proof, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="adp-detail-section">
                        <div className="adp-detail-label">Raw JSON</div>
                        <pre className="adp-json-block">
                          {JSON.stringify(credDetailEntry, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="adp-modal-footer">
                      <button
                        className="adp-btn adp-btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(credDetailEntry, null, 2)
                          );
                        }}
                      >
                        📋 Copy JSON
                      </button>
                      <button
                        className="adp-btn adp-btn-sm"
                        onClick={() => setCredDetailEntry(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ METADATA TAB ═══════ */}
          {activeTab === 'metadata' && (
            <div className="adp-tab-content adp-fade-in">
              {/* Metadata service health */}
              <div className="adp-card">
                <div className="adp-card-header">
                  <span className="adp-card-title">
                    🧬 Metadata Service Health
                  </span>
                  {metadataLoading && (
                    <span className="adp-loading-badge">Loading...</span>
                  )}
                </div>
                <div className="adp-card-body">
                  {metadataHealth ? (
                    <div className="adp-health-grid">
                      <div className="adp-health-item">
                        <span className="adp-health-label">Status</span>
                        <span
                          className={`adp-health-value ${
                            metadataHealth.status === 'healthy' ||
                            metadataHealth.status === 'ok'
                              ? 'adp-green'
                              : 'adp-red'
                          }`}
                        >
                          {metadataHealth.status === 'healthy' ||
                          metadataHealth.status === 'ok'
                            ? '● Healthy'
                            : `● ${metadataHealth.status}`}
                        </span>
                      </div>
                      <div className="adp-health-item">
                        <span className="adp-health-label">Version</span>
                        <span className="adp-health-value adp-mono">
                          {metadataHealth.version || '—'}
                        </span>
                      </div>
                      <div className="adp-health-item">
                        <span className="adp-health-label">Uptime</span>
                        <span className="adp-health-value">
                          {metadataHealth.uptime || '—'}
                        </span>
                      </div>
                      <div className="adp-health-item">
                        <span className="adp-health-label">OptimusDB</span>
                        <span
                          className={`adp-health-value ${
                            metadataHealth.optimusdb_connected
                              ? 'adp-green'
                              : 'adp-red'
                          }`}
                        >
                          {metadataHealth.optimusdb_connected
                            ? '● Connected'
                            : '● Disconnected'}
                        </span>
                      </div>
                      <div className="adp-health-item">
                        <span className="adp-health-label">Cache Size</span>
                        <span className="adp-health-value">
                          {metadataHealth.cache_size}
                        </span>
                      </div>
                      <div className="adp-health-item">
                        <span className="adp-health-label">AI Model</span>
                        <span
                          className={`adp-health-value ${
                            metadataHealth.ai_model_loaded
                              ? 'adp-green'
                              : 'adp-amber'
                          }`}
                        >
                          {metadataHealth.ai_model_loaded
                            ? '● Loaded'
                            : '○ Not Loaded'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="adp-empty-state">
                      {metadataLoading
                        ? 'Loading metadata health…'
                        : 'Metadata service not responding'}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata metrics KPIs */}
              {metadataMetrics && (
                <>
                  <div className="adp-kpi-row">
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Total Enrichments</div>
                      <div className="adp-kpi-value">
                        {metadataMetrics.total_enrichments.toLocaleString()}
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Total Profiles</div>
                      <div className="adp-kpi-value">
                        {metadataMetrics.total_profiles.toLocaleString()}
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Avg Enrichment</div>
                      <div className="adp-kpi-value">
                        {metadataMetrics.avg_enrichment_ms.toFixed(1)}
                        <span className="adp-kpi-unit">ms</span>
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Databases</div>
                      <div className="adp-kpi-value">
                        {metadataMetrics.databases_tracked}
                      </div>
                    </div>
                    <div className="adp-kpi-card">
                      <div className="adp-kpi-label">Tables</div>
                      <div className="adp-kpi-value">
                        {metadataMetrics.tables_tracked}
                      </div>
                    </div>
                  </div>

                  {/* Cache performance */}
                  <div className="adp-card">
                    <div className="adp-card-header">
                      <span className="adp-card-title">
                        💾 Metadata Cache Performance
                      </span>
                    </div>
                    <div className="adp-card-body">
                      <div className="adp-health-grid">
                        <div className="adp-health-item">
                          <span className="adp-health-label">Cache Hits</span>
                          <span className="adp-health-value adp-green">
                            {metadataMetrics.cache_hits.toLocaleString()}
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">Cache Misses</span>
                          <span className="adp-health-value adp-red">
                            {metadataMetrics.cache_misses.toLocaleString()}
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">Hit Ratio</span>
                          <span className="adp-health-value">
                            {(metadataMetrics.cache_hit_ratio * 100).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">
                            Last Enrichment
                          </span>
                          <span className="adp-health-value">
                            {metadataMetrics.last_enrichment
                              ? fmtRelative(metadataMetrics.last_enrichment)
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {/* Cache hit ratio bar */}
                      <div
                        className="adp-cache-ratio-bar"
                        style={{ marginTop: '16px' }}
                      >
                        <div className="adp-cache-ratio-label">
                          Hit Ratio:{' '}
                          {(metadataMetrics.cache_hit_ratio * 100).toFixed(1)}%
                        </div>
                        <div className="adp-ratio-track">
                          <div
                            className="adp-ratio-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                metadataMetrics.cache_hit_ratio * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrichment pipeline info */}
                  <div className="adp-card">
                    <div className="adp-card-header">
                      <span className="adp-card-title">
                        🤖 AI Enrichment Pipeline
                      </span>
                    </div>
                    <div className="adp-card-body">
                      <div className="adp-health-grid">
                        <div className="adp-health-item">
                          <span className="adp-health-label">
                            Datasets Enriched
                          </span>
                          <span className="adp-health-value">
                            {metadataMetrics.total_enrichments.toLocaleString()}
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">
                            Profiles Generated
                          </span>
                          <span className="adp-health-value">
                            {metadataMetrics.total_profiles.toLocaleString()}
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">
                            Avg Processing
                          </span>
                          <span className="adp-health-value">
                            {metadataMetrics.avg_enrichment_ms.toFixed(1)} ms
                          </span>
                        </div>
                        <div className="adp-health-item">
                          <span className="adp-health-label">Model Status</span>
                          <span
                            className={`adp-health-value ${
                              metadataHealth?.ai_model_loaded
                                ? 'adp-green'
                                : 'adp-amber'
                            }`}
                          >
                            {metadataHealth?.ai_model_loaded
                              ? 'TinyLlama Active'
                              : 'Model Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!metadataMetrics && !metadataLoading && (
                <div className="adp-card">
                  <div className="adp-card-body">
                    <div className="adp-empty-state">
                      Metadata metrics not available. The metadata service may
                      not be running or accessible.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════ STATUS BAR ═══════ */}
        <div className="adp-statusbar">
          <span className="adp-status-item">
            📊 {TABS.find((t) => t.id === activeTab)?.label}
          </span>
          <span className="adp-status-item">
            Cluster:{' '}
            <strong className="adp-green">
              {healthyCount}/{agents.length} Healthy
            </strong>
          </span>
          <span className="adp-status-item">
            Leader:{' '}
            <strong>
              {leader
                ? `${leader.name} ⭐ Term #${leader.electionTerm}`
                : 'N/A'}
            </strong>
          </span>
          {activeTab === 'logging' && (
            <span className="adp-status-item">
              Logs: <strong>{filteredLoggerData.length}</strong>/
              {loggerData.length}
              {hasLogFilters && (
                <span className="adp-filtered-badge">• Filtered</span>
              )}
            </span>
          )}
          <span className="adp-status-item">
            {autoRefresh ? '🔄 Live 30s' : '⏸ Paused'}
          </span>
          <span className="adp-status-src">
            {activeTab === 'logging'
              ? 'GET /ems/sql?q=SELECT * FROM optimusLogger'
              : activeTab === 'ems-logs'
              ? 'GET /ems/logs'
              : activeTab === 'events'
              ? 'GET /ems/events'
              : activeTab === 'performance'
              ? 'GET /benchmarks · POST /command'
              : activeTab === 'stores'
              ? 'GET /debug/optimusdb/mesh · /ems/sql'
              : activeTab === 'peers'
              ? 'GET /agent/status · POST /command (contri)'
              : activeTab === 'credentials'
              ? 'GET /credentials'
              : activeTab === 'metadata'
              ? 'GET /api/v1/metadata/metrics · /health'
              : '/agent/status · /ems/* · /benchmarks · /debug/optimusdb/mesh'}
          </span>
        </div>
      </div>
    </DocumentTitle>
  );
};

export default AnalyticsDashboardPage;
