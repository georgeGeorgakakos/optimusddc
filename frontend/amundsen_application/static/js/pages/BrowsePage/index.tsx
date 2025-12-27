// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// BrowsePage with Swarmchestrate Metadata Dashboard + World Map
// VERSION: SWARMCHESTRATE-WITH-MAP

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
} from 'recharts';
import './styles.scss';

// ==================== TYPES ====================

interface MetadataSummary {
  systems: { total: number; sensitive: number };
  environments: { total: number; sensitive: number };
  tables: { total: number; sensitive: number };
  columns: { total: number; sensitive: number };
}

interface CatalogItem {
  name: string;
  size: number;
  color: string;
}

interface EnvironmentLineage {
  name: string;
  value: number;
  color: string;
}

interface SensitiveDataItem {
  name: string;
  value: number;
  color: string;
}

interface SystemDistribution {
  name: string;
  noClassify: number;
  confidential: number;
  phi: number;
  public: number;
  restricted: number;
  secret: number;
  spi: number;
}

interface ScheduledScan {
  id: string;
  name: string;
  type: string;
  time: string;
  color: string;
}

interface RefreshedEnvironment {
  id: string;
  name: string;
  source: string;
  status: 'success' | 'warning' | 'error';
  time: string;
}

interface TopTable {
  rank: number;
  name: string;
  associations: number;
  system: string;
  owner: string;
}

interface TopSystem {
  name: string;
  count: number;
  color: string;
}

interface MapLocation {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  type: 'cluster' | 'edge' | 'swarm' | 'orchestrator';
  status: 'online' | 'warning' | 'offline';
  nodes: number;
  region: string;
}

// ==================== SWARMCHESTRATE MOCK DATA ====================

const MOCK_SUMMARY: MetadataSummary = {
  systems: { total: 24, sensitive: 5 },
  environments: { total: 38, sensitive: 8 },
  tables: { total: 2847, sensitive: 42 },
  columns: { total: 48562, sensitive: 156 },
};

// Data Catalog Distribution - Swarmchestrate Data Sources
const MOCK_CATALOG_DISTRIBUTION: CatalogItem[] = [
  { name: 'Kubernetes', size: 480, color: '#326CE5' },
  { name: 'Docker Swarm', size: 320, color: '#2496ED' },
  { name: 'TOSCA Registry', size: 280, color: '#FF6B35' },
  { name: 'Prometheus', size: 240, color: '#E6522C' },
  { name: 'etcd', size: 200, color: '#419EDA' },
  { name: 'Consul', size: 180, color: '#CA2171' },
  { name: 'Redis Cache', size: 160, color: '#DC382D' },
  { name: 'PostgreSQL', size: 150, color: '#336791' },
  { name: 'MongoDB', size: 130, color: '#4DB33D' },
  { name: 'InfluxDB', size: 110, color: '#22ADF6' },
  { name: 'Grafana', size: 90, color: '#F46800' },
  { name: 'Elasticsearch', size: 80, color: '#FEC514' },
];

// Top Environments in Data Lineage - Swarmchestrate Clusters
const MOCK_ENVIRONMENT_LINEAGE: EnvironmentLineage[] = [
  { name: 'EU-West Swarm', value: 58, color: '#326CE5' },
  { name: 'US-East Cluster', value: 52, color: '#2496ED' },
  { name: 'Edge Network EU', value: 45, color: '#FF6B35' },
  { name: 'Dev Orchestrator', value: 38, color: '#9B59B6' },
  { name: 'Staging Swarm', value: 35, color: '#E6522C' },
  { name: 'Asia-Pacific Node', value: 30, color: '#1ABC9C' },
  { name: 'IoT Edge Mesh', value: 28, color: '#F39C12' },
  { name: 'ML Pipeline Env', value: 24, color: '#2ECC71' },
  { name: 'Backup Cluster', value: 18, color: '#95A5A6' },
];

// Sensitive Data Classification - Swarmchestrate Context
const MOCK_SENSITIVE_DATA: SensitiveDataItem[] = [
  { name: 'API Keys', value: 28.5, color: '#E74C3C' },
  { name: 'Config Secrets', value: 22.3, color: '#9B59B6' },
  { name: 'Node Credentials', value: 18.2, color: '#3498DB' },
  { name: 'Public Metrics', value: 15.8, color: '#2ECC71' },
  { name: 'Deployment Tokens', value: 8.4, color: '#F39C12' },
  { name: 'Service Accounts', value: 4.2, color: '#1ABC9C' },
  { name: 'Unclassified', value: 2.6, color: '#95A5A6' },
];

// Sensitive Data Distribution By Systems - Swarmchestrate Components
const MOCK_SYSTEM_DISTRIBUTION: SystemDistribution[] = [
  {
    name: 'K8s Master',
    noClassify: 25,
    confidential: 45,
    phi: 5,
    public: 15,
    restricted: 8,
    secret: 2,
    spi: 0,
  },
  {
    name: 'Swarm Mgr',
    noClassify: 30,
    confidential: 38,
    phi: 8,
    public: 12,
    restricted: 10,
    secret: 2,
    spi: 0,
  },
  {
    name: 'TOSCA Engine',
    noClassify: 40,
    confidential: 25,
    phi: 5,
    public: 20,
    restricted: 8,
    secret: 2,
    spi: 0,
  },
  {
    name: 'Edge Nodes',
    noClassify: 35,
    confidential: 30,
    phi: 10,
    public: 15,
    restricted: 8,
    secret: 2,
    spi: 0,
  },
  {
    name: 'Orchestrator',
    noClassify: 28,
    confidential: 42,
    phi: 8,
    public: 12,
    restricted: 8,
    secret: 2,
    spi: 0,
  },
  {
    name: 'API Gateway',
    noClassify: 20,
    confidential: 48,
    phi: 5,
    public: 18,
    restricted: 7,
    secret: 2,
    spi: 0,
  },
  {
    name: 'Service Mesh',
    noClassify: 32,
    confidential: 35,
    phi: 8,
    public: 15,
    restricted: 8,
    secret: 2,
    spi: 0,
  },
];

// Upcoming Scheduled Scans - Swarmchestrate Scans
const MOCK_SCHEDULED_SCANS: ScheduledScan[] = [
  {
    id: '1',
    name: 'K8s Cluster Scan',
    type: 'Full Discovery',
    time: 'Today 14:00',
    color: '#326CE5',
  },
  {
    id: '2',
    name: 'TOSCA Templates',
    type: 'Schema Sync',
    time: 'Today 16:30',
    color: '#FF6B35',
  },
  {
    id: '3',
    name: 'Edge Node Metrics',
    type: 'Incremental',
    time: 'Tomorrow 08:00',
    color: '#2496ED',
  },
  {
    id: '4',
    name: 'Swarm Services',
    type: 'Full Discovery',
    time: 'Tomorrow 10:00',
    color: '#9B59B6',
  },
  {
    id: '5',
    name: 'Agent Registry',
    type: 'Delta Sync',
    time: 'Wed 09:00',
    color: '#1ABC9C',
  },
  {
    id: '6',
    name: 'Deployment Logs',
    type: 'Archival',
    time: 'Wed 14:00',
    color: '#E6522C',
  },
];

// Last Refreshed Environments - Swarmchestrate Nodes
const MOCK_REFRESHED_ENVIRONMENTS: RefreshedEnvironment[] = [
  {
    id: '1',
    name: 'swarm-master-eu-01',
    source: 'Docker Swarm',
    status: 'success',
    time: '1 min ago',
  },
  {
    id: '2',
    name: 'k8s-worker-us-03',
    source: 'Kubernetes',
    status: 'success',
    time: '3 min ago',
  },
  {
    id: '3',
    name: 'edge-node-iot-15',
    source: 'Edge Network',
    status: 'warning',
    time: '8 min ago',
  },
  {
    id: '4',
    name: 'tosca-parser-dev',
    source: 'TOSCA Engine',
    status: 'success',
    time: '12 min ago',
  },
  {
    id: '5',
    name: 'prometheus-eu',
    source: 'Monitoring',
    status: 'success',
    time: '15 min ago',
  },
  {
    id: '6',
    name: 'agent-asia-07',
    source: 'Swarm Agent',
    status: 'error',
    time: '22 min ago',
  },
  {
    id: '7',
    name: 'orchestrator-prod',
    source: 'Orchestrator',
    status: 'success',
    time: '28 min ago',
  },
];

// Top Tables - Swarmchestrate Data Tables
const MOCK_TOP_TABLES: TopTable[] = [
  {
    rank: 1,
    name: 'swarm_agents',
    associations: 248,
    system: 'PostgreSQL',
    owner: 'swarm_core',
  },
  {
    rank: 2,
    name: 'node_metrics',
    associations: 215,
    system: 'InfluxDB',
    owner: 'monitoring_team',
  },
  {
    rank: 3,
    name: 'tosca_templates',
    associations: 186,
    system: 'MongoDB',
    owner: 'tosca_engine',
  },
  {
    rank: 4,
    name: 'deployment_configs',
    associations: 164,
    system: 'etcd',
    owner: 'orchestrator',
  },
  {
    rank: 5,
    name: 'service_registry',
    associations: 142,
    system: 'Consul',
    owner: 'service_mesh',
  },
  {
    rank: 6,
    name: 'container_logs',
    associations: 128,
    system: 'Elasticsearch',
    owner: 'logging_team',
  },
  {
    rank: 7,
    name: 'cluster_events',
    associations: 115,
    system: 'Kubernetes',
    owner: 'k8s_admin',
  },
  {
    rank: 8,
    name: 'workflow_states',
    associations: 98,
    system: 'Redis',
    owner: 'workflow_engine',
  },
];

// Top Systems - Swarmchestrate Infrastructure
const MOCK_TOP_SYSTEMS: TopSystem[] = [
  { name: 'Kubernetes', count: 620, color: '#326CE5' },
  { name: 'Docker Swarm', count: 485, color: '#2496ED' },
  { name: 'TOSCA Registry', count: 380, color: '#FF6B35' },
  { name: 'Prometheus', count: 320, color: '#E6522C' },
  { name: 'etcd', count: 275, color: '#419EDA' },
  { name: 'Consul', count: 220, color: '#CA2171' },
];

// ==================== MAP LOCATIONS - SWARMCHESTRATE GLOBAL INFRASTRUCTURE ====================

const MOCK_MAP_LOCATIONS: MapLocation[] = [
  // Europe
  {
    id: '1',
    name: 'EU-West Swarm Master',
    coordinates: [-0.1276, 51.5074],
    type: 'swarm',
    status: 'online',
    nodes: 12,
    region: 'London, UK',
  },
  {
    id: '2',
    name: 'EU-Central Kubernetes',
    coordinates: [8.6821, 50.1109],
    type: 'cluster',
    status: 'online',
    nodes: 24,
    region: 'Frankfurt, Germany',
  },
  {
    id: '3',
    name: 'EU-North Edge Network',
    coordinates: [18.0686, 59.3293],
    type: 'edge',
    status: 'online',
    nodes: 8,
    region: 'Stockholm, Sweden',
  },
  {
    id: '4',
    name: 'EU-South Orchestrator',
    coordinates: [12.4964, 41.9028],
    type: 'orchestrator',
    status: 'online',
    nodes: 6,
    region: 'Rome, Italy',
  },
  {
    id: '5',
    name: 'Athens Edge Node',
    coordinates: [23.7275, 37.9838],
    type: 'edge',
    status: 'online',
    nodes: 4,
    region: 'Athens, Greece',
  },
  {
    id: '6',
    name: 'Paris Swarm Cluster',
    coordinates: [2.3522, 48.8566],
    type: 'swarm',
    status: 'online',
    nodes: 16,
    region: 'Paris, France',
  },
  {
    id: '7',
    name: 'Amsterdam Data Hub',
    coordinates: [4.9041, 52.3676],
    type: 'cluster',
    status: 'warning',
    nodes: 10,
    region: 'Amsterdam, Netherlands',
  },

  // North America
  {
    id: '8',
    name: 'US-East Primary Cluster',
    coordinates: [-74.006, 40.7128],
    type: 'cluster',
    status: 'online',
    nodes: 32,
    region: 'New York, USA',
  },
  {
    id: '9',
    name: 'US-West Kubernetes',
    coordinates: [-122.4194, 37.7749],
    type: 'cluster',
    status: 'online',
    nodes: 28,
    region: 'San Francisco, USA',
  },
  {
    id: '10',
    name: 'US-Central Edge Mesh',
    coordinates: [-87.6298, 41.8781],
    type: 'edge',
    status: 'online',
    nodes: 14,
    region: 'Chicago, USA',
  },
  {
    id: '11',
    name: 'Canada Orchestrator',
    coordinates: [-79.3832, 43.6532],
    type: 'orchestrator',
    status: 'online',
    nodes: 8,
    region: 'Toronto, Canada',
  },

  // Asia Pacific
  {
    id: '12',
    name: 'Asia-Pacific Primary',
    coordinates: [103.8198, 1.3521],
    type: 'cluster',
    status: 'online',
    nodes: 20,
    region: 'Singapore',
  },
  {
    id: '13',
    name: 'Japan Swarm Cluster',
    coordinates: [139.6917, 35.6895],
    type: 'swarm',
    status: 'online',
    nodes: 18,
    region: 'Tokyo, Japan',
  },
  {
    id: '14',
    name: 'Australia Edge Node',
    coordinates: [151.2093, -33.8688],
    type: 'edge',
    status: 'warning',
    nodes: 6,
    region: 'Sydney, Australia',
  },
  {
    id: '15',
    name: 'India Orchestrator',
    coordinates: [72.8777, 19.076],
    type: 'orchestrator',
    status: 'online',
    nodes: 10,
    region: 'Mumbai, India',
  },
  {
    id: '16',
    name: 'Hong Kong Data Center',
    coordinates: [114.1694, 22.3193],
    type: 'cluster',
    status: 'online',
    nodes: 12,
    region: 'Hong Kong',
  },

  // South America
  {
    id: '17',
    name: 'Brazil Edge Network',
    coordinates: [-46.6333, -23.5505],
    type: 'edge',
    status: 'online',
    nodes: 8,
    region: 'São Paulo, Brazil',
  },

  // Middle East
  {
    id: '18',
    name: 'UAE Cloud Hub',
    coordinates: [55.2708, 25.2048],
    type: 'cluster',
    status: 'online',
    nodes: 10,
    region: 'Dubai, UAE',
  },

  // Africa
  {
    id: '19',
    name: 'South Africa Node',
    coordinates: [18.4241, -33.9249],
    type: 'edge',
    status: 'offline',
    nodes: 4,
    region: 'Cape Town, South Africa',
  },
];

// ==================== CUSTOM TREEMAP CONTENT ====================

const CustomTreemapContent: React.FC<any> = (props) => {
  const { x, y, width, height, name, color } = props;

  if (width < 40 || height < 35) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
        />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={width > 80 ? 12 : 10}
        fontWeight="bold"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
      >
        {name}
      </text>
    </g>
  );
};

// ==================== SIMPLE SVG WORLD MAP COMPONENT ====================

const WorldMap: React.FC<{ locations: MapLocation[] }> = ({ locations }) => {
  const [hoveredLocation, setHoveredLocation] =
    React.useState<MapLocation | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#2ECC71';
      case 'warning':
        return '#F39C12';
      case 'offline':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'cluster':
        return '🔷';
      case 'swarm':
        return '🐝';
      case 'edge':
        return '📡';
      case 'orchestrator':
        return '🎛️';
      default:
        return '📍';
    }
  };

  // Convert geo coordinates to SVG coordinates
  // Simple Mercator-like projection
  const projectCoordinates = (
    lon: number,
    lat: number
  ): { x: number; y: number } => {
    const x = ((lon + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 500;

    return { x, y };
  };

  const handleMouseEnter = (location: MapLocation, event: React.MouseEvent) => {
    setHoveredLocation(location);
    setTooltipPos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredLocation(null);
  };

  return (
    <div className="world-map-container">
      <svg viewBox="0 0 1000 500" className="world-map-svg">
        {/* Background */}
        <rect x="0" y="0" width="1000" height="500" fill="#1a2332" />

        {/* Grid lines */}
        {[...Array(19)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 27.78}
            x2="1000"
            y2={i * 27.78}
            stroke="#2a3a4a"
            strokeWidth="0.5"
          />
        ))}
        {[...Array(37)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 27.78}
            y1="0"
            x2={i * 27.78}
            y2="500"
            stroke="#2a3a4a"
            strokeWidth="0.5"
          />
        ))}

        {/* Simplified continent outlines */}
        {/* North America */}
        <path
          d="M 120 80 L 180 70 L 240 90 L 280 120 L 290 180 L 260 220 L 200 240 L 160 220 L 130 180 L 100 140 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />
        {/* South America */}
        <path
          d="M 200 280 L 240 270 L 280 300 L 300 360 L 280 420 L 240 450 L 200 420 L 180 360 L 190 300 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />
        {/* Europe */}
        <path
          d="M 440 80 L 520 70 L 560 90 L 580 130 L 560 160 L 500 170 L 460 150 L 440 120 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />
        {/* Africa */}
        <path
          d="M 460 180 L 540 180 L 580 220 L 600 300 L 560 380 L 500 400 L 460 360 L 440 280 L 450 220 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />
        {/* Asia */}
        <path
          d="M 580 60 L 700 50 L 820 80 L 880 120 L 900 180 L 860 240 L 780 260 L 700 240 L 620 200 L 580 140 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />
        {/* Australia */}
        <path
          d="M 800 320 L 880 310 L 920 350 L 900 400 L 840 420 L 790 390 L 780 350 Z"
          fill="#3d5a6e"
          stroke="#4a6b7c"
          strokeWidth="1"
        />

        {/* Connection lines between major hubs */}
        <g className="connection-lines">
          {locations
            .filter((l) => l.type === 'cluster')
            .map((loc, i, arr) => {
              if (i === 0) return null;
              const prev = arr[i - 1];
              const start = projectCoordinates(
                prev.coordinates[0],
                prev.coordinates[1]
              );
              const end = projectCoordinates(
                loc.coordinates[0],
                loc.coordinates[1]
              );

              return (
                <line
                  key={`conn-${i}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#326CE5"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  opacity="0.4"
                />
              );
            })}
        </g>

        {/* Location markers */}
        {locations.map((location) => {
          const { x, y } = projectCoordinates(
            location.coordinates[0],
            location.coordinates[1]
          );
          const markerColor = getMarkerColor(location.status);
          const isHovered = hoveredLocation?.id === location.id;

          return (
            <g
              key={location.id}
              className="map-marker"
              onMouseEnter={(e) => handleMouseEnter(location, e)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse animation for online nodes */}
              {location.status === 'online' && (
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 20 : 12}
                  fill={markerColor}
                  opacity="0.3"
                  className="pulse-ring"
                />
              )}

              {/* Main marker */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 10 : 6}
                fill={markerColor}
                stroke="#fff"
                strokeWidth="2"
                className="marker-dot"
              />

              {/* Node count label for larger markers */}
              {location.nodes >= 10 && (
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {location.nodes}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredLocation && (
        <div
          className="map-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-icon">
              {getMarkerIcon(hoveredLocation.type)}
            </span>
            <span className="tooltip-name">{hoveredLocation.name}</span>
          </div>
          <div className="tooltip-details">
            <div className="tooltip-row">
              <span className="tooltip-label">Region:</span>
              <span className="tooltip-value">{hoveredLocation.region}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Type:</span>
              <span className="tooltip-value">{hoveredLocation.type}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Nodes:</span>
              <span className="tooltip-value">{hoveredLocation.nodes}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Status:</span>
              <span className={`tooltip-status ${hoveredLocation.status}`}>
                {hoveredLocation.status === 'online' && '🟢 Online'}
                {hoveredLocation.status === 'warning' && '🟡 Warning'}
                {hoveredLocation.status === 'offline' && '🔴 Offline'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-title">Node Types</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon">🔷</span>
            <span>Kubernetes Cluster</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🐝</span>
            <span>Docker Swarm</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📡</span>
            <span>Edge Network</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🎛️</span>
            <span>Orchestrator</span>
          </div>
        </div>
        <div className="legend-title" style={{ marginTop: '12px' }}>
          Status
        </div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="status-dot online" />
            <span>
              Online ({locations.filter((l) => l.status === 'online').length})
            </span>
          </div>
          <div className="legend-item">
            <span className="status-dot warning" />
            <span>
              Warning ({locations.filter((l) => l.status === 'warning').length})
            </span>
          </div>
          <div className="legend-item">
            <span className="status-dot offline" />
            <span>
              Offline ({locations.filter((l) => l.status === 'offline').length})
            </span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="map-stats">
        <div className="stat-item">
          <span className="stat-value">{locations.length}</span>
          <span className="stat-label">Total Nodes</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {locations.reduce((sum, l) => sum + l.nodes, 0)}
          </span>
          <span className="stat-label">Total Instances</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">5</span>
          <span className="stat-label">Continents</span>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const BrowsePage: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [summary] = React.useState<MetadataSummary>(MOCK_SUMMARY);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  // Simulate data loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 500);
  };

  // Export functionality
  const handleExport = () => {
    const data = {
      summary: MOCK_SUMMARY,
      catalogDistribution: MOCK_CATALOG_DISTRIBUTION,
      topTables: MOCK_TOP_TABLES,
      topSystems: MOCK_TOP_SYSTEMS,
      mapLocations: MOCK_MAP_LOCATIONS,
      exportedAt: new Date().toISOString(),
      source: 'Swarmchestrate DDC',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `swarmchestrate-metadata-${
      new Date().toISOString().split('T')[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="metadata-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading Swarmchestrate Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metadata-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>🐝 Swarmchestrate DDC</h1>
          <p>Decentralized Data Catalog - Metadata Intelligence</p>
        </div>
        <div className="header-center">
          <span className="last-updated">
            Last sync: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
        <div className="header-right">
          <button className="btn refresh-btn" onClick={handleRefresh}>
            🔄 Refresh
          </button>
          <button className="btn export-btn" onClick={handleExport}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Enterprise Metadata Summary - Row 1 */}
      <div className="widget-row summary-row">
        <div className="summary-card systems">
          <div className="card-header">
            <span className="card-icon">🖥️</span>
            <span className="card-title">Systems</span>
          </div>
          <div className="card-body">
            <div className="stat">
              <span className="label">Total</span>
              <span className="value">{summary.systems.total}</span>
            </div>
            <div className="stat sensitive">
              <span className="label">Sensitive</span>
              <span className="value">{summary.systems.sensitive}</span>
            </div>
          </div>
        </div>

        <div className="summary-card environments">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <span className="card-title">Environments</span>
          </div>
          <div className="card-body">
            <div className="stat">
              <span className="label">Total</span>
              <span className="value">{summary.environments.total}</span>
            </div>
            <div className="stat sensitive">
              <span className="label">Sensitive</span>
              <span className="value">{summary.environments.sensitive}</span>
            </div>
          </div>
        </div>

        <div className="summary-card tables">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <span className="card-title">Tables</span>
          </div>
          <div className="card-body">
            <div className="stat">
              <span className="label">Total</span>
              <span className="value">
                {summary.tables.total.toLocaleString()}
              </span>
            </div>
            <div className="stat sensitive">
              <span className="label">Sensitive</span>
              <span className="value">{summary.tables.sensitive}</span>
            </div>
          </div>
        </div>

        <div className="summary-card columns">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <span className="card-title">Columns</span>
          </div>
          <div className="card-body">
            <div className="stat">
              <span className="label">Total</span>
              <span className="value">
                {summary.columns.total.toLocaleString()}
              </span>
            </div>
            <div className="stat sensitive">
              <span className="label">Sensitive</span>
              <span className="value">{summary.columns.sensitive}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Distribution + Lineage + Scheduled Scans */}
      <div className="widget-row three-col">
        {/* Data Catalog Distribution - TreeMap */}
        <div className="widget catalog-distribution">
          <div className="widget-header red">
            <span className="widget-number">2</span>
            <span className="widget-title">Data Catalog Distribution</span>
          </div>
          <div className="widget-content">
            <ResponsiveContainer width="100%" height={220}>
              <Treemap
                data={MOCK_CATALOG_DISTRIBUTION}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<CustomTreemapContent />}
              >
                {MOCK_CATALOG_DISTRIBUTION.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Environments in Data Lineage */}
        <div className="widget environment-lineage">
          <div className="widget-header orange">
            <span className="widget-number">3</span>
            <span className="widget-title">Top Clusters & Environments</span>
          </div>
          <div className="widget-content">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={MOCK_ENVIRONMENT_LINEAGE}
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                />
                <XAxis type="number" fontSize={11} />
                <YAxis
                  dataKey="name"
                  type="category"
                  fontSize={11}
                  width={95}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2C3E50',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#ECF0F1' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Connections">
                  {MOCK_ENVIRONMENT_LINEAGE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Scheduled Scans */}
        <div className="widget scheduled-scans">
          <div className="widget-header dark-red">
            <span className="widget-number">8</span>
            <span className="widget-title">Scheduled Discovery Scans</span>
          </div>
          <div className="widget-content list-content">
            {MOCK_SCHEDULED_SCANS.map((scan) => (
              <div key={scan.id} className="list-item">
                <span
                  className="color-bar"
                  style={{ backgroundColor: scan.color }}
                />
                <div className="item-info">
                  <span className="item-name">{scan.name}</span>
                  <span className="item-time">{scan.time}</span>
                </div>
                <span className="item-badge">{scan.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Sensitive Data */}
      <div className="widget-row three-col">
        {/* Sensitive Data Summary - Donut */}
        <div className="widget sensitive-summary">
          <div className="widget-header teal">
            <span className="widget-number">4</span>
            <span className="widget-title">Data Classification</span>
          </div>
          <div className="widget-content">
            <div className="chart-with-legend">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={MOCK_SENSITIVE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {MOCK_SENSITIVE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {MOCK_SENSITIVE_DATA.map((item) => (
                  <div key={item.name} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sensitive Data Distribution By Systems - Stacked Bar */}
        <div className="widget system-distribution">
          <div className="widget-header yellow">
            <span className="widget-number">5</span>
            <span className="widget-title">Classification by Component</span>
          </div>
          <div className="widget-content">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={MOCK_SYSTEM_DISTRIBUTION}
                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2C3E50',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#ECF0F1', fontSize: '11px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  iconSize={10}
                />
                <Bar
                  dataKey="noClassify"
                  stackId="a"
                  fill="#95A5A6"
                  name="Unclassified"
                />
                <Bar
                  dataKey="confidential"
                  stackId="a"
                  fill="#E74C3C"
                  name="Confidential"
                />
                <Bar dataKey="phi" stackId="a" fill="#9B59B6" name="Secrets" />
                <Bar
                  dataKey="public"
                  stackId="a"
                  fill="#2ECC71"
                  name="Public"
                />
                <Bar
                  dataKey="restricted"
                  stackId="a"
                  fill="#F39C12"
                  name="Restricted"
                />
                <Bar
                  dataKey="secret"
                  stackId="a"
                  fill="#E91E63"
                  name="Critical"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Last Refreshed Environments */}
        <div className="widget refreshed-environments">
          <div className="widget-header dark-red">
            <span className="widget-number">9</span>
            <span className="widget-title">Recently Synced Nodes</span>
          </div>
          <div className="widget-content list-content">
            {MOCK_REFRESHED_ENVIRONMENTS.map((env) => (
              <div key={env.id} className="list-item">
                <span className={`status-icon ${env.status}`}>
                  {env.status === 'success' && '✅'}
                  {env.status === 'warning' && '⚠️'}
                  {env.status === 'error' && '❌'}
                </span>
                <div className="item-info">
                  <span className="item-name">{env.name}</span>
                  <span className="item-source">{env.source}</span>
                </div>
                <span className="item-time">{env.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Top Tables + Top Systems */}
      <div className="widget-row two-col">
        {/* Top Tables By Associations */}
        <div className="widget top-tables">
          <div className="widget-header purple">
            <span className="widget-number">6</span>
            <span className="widget-title">Top Tables By Associations</span>
          </div>
          <div className="widget-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Table Name</th>
                  <th>Links</th>
                  <th>System</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TOP_TABLES.map((table) => (
                  <tr key={table.rank}>
                    <td className="rank">{table.rank}</td>
                    <td className="table-name">
                      <a href={`/table_detail/default/${table.name}`}>
                        {table.name}
                      </a>
                    </td>
                    <td className="associations">
                      <span className="badge">{table.associations}</span>
                    </td>
                    <td className="system">{table.system}</td>
                    <td className="owner">{table.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Systems */}
        <div className="widget top-systems">
          <div className="widget-header orange">
            <span className="widget-number">7</span>
            <span className="widget-title">Top Infrastructure Systems</span>
          </div>
          <div className="widget-content">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={MOCK_TOP_SYSTEMS}
                margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2C3E50',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#ECF0F1' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tables">
                  {MOCK_TOP_SYSTEMS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: World Map */}
      <div className="widget-row full-width">
        <div className="widget world-map-widget">
          <div className="widget-header blue">
            <span className="widget-number">10</span>
            <span className="widget-title">🌍 Global Infrastructure Map</span>
          </div>
          <div className="widget-content map-content">
            <WorldMap locations={MOCK_MAP_LOCATIONS} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-left">
          <span>🐝 Swarmchestrate Decentralized Data Catalog v1.0</span>
        </div>
        <div className="footer-right">
          <span>Powered by OptimusDB</span>
          <span className="separator">|</span>
          <span>Last sync: {lastUpdated.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;
