// ==============================================================================
// FILE: DataSovereigntyPage/index.tsx
// DATA SOVEREIGNTY & ACCESS CONTROL DASHBOARD
// Visual RBAC/ABAC policy editor, geo-fencing, consent provenance, GDPR tracking
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DocumentTitle from 'react-document-title';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface PolicyRule {
  id: string;
  name: string;
  type: 'RBAC' | 'ABAC' | 'GEO';
  subject: string;
  resource: string;
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  effect: 'ALLOW' | 'DENY';
  conditions: PolicyCondition[];
  geoRestriction?: GeoRestriction;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  priority: number;
}

interface PolicyCondition {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'contains';
  value: string;
}

interface GeoRestriction {
  allowedRegions: string[];
  deniedRegions: string[];
  dataResidency: string;
}

interface ConsentRecord {
  id: string;
  dataSubject: string;
  purpose: string;
  legalBasis: string;
  grantedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scope: string[];
  processingActivities: string[];
}

interface DSARRequest {
  id: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION';
  dataSubject: string;
  submittedAt: string;
  deadline: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  assignedTo: string;
  affectedNodes: string[];
  progress: number;
}

interface NodeDataMap {
  nodeId: string;
  nodeName: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  datasets: string[];
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  isCompliant: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  node: string;
  result: 'GRANTED' | 'DENIED';
  policyId: string;
  details: string;
}

// ==============================================================================
// MOCK DATA GENERATORS
// ==============================================================================

const REGIONS = ['EU-West', 'EU-Central', 'EU-South', 'EU-North', 'US-East', 'US-West', 'APAC'];
const COUNTRIES = { 'EU-West': 'France', 'EU-Central': 'Germany', 'EU-South': 'Greece', 'EU-North': 'Finland', 'US-East': 'USA', 'US-West': 'USA', 'APAC': 'Japan' };
const GEO_COORDS: Record<string, { lat: number; lng: number }> = {
  'EU-West': { lat: 48.8566, lng: 2.3522 },
  'EU-Central': { lat: 52.52, lng: 13.405 },
  'EU-South': { lat: 37.9838, lng: 23.7275 },
  'EU-North': { lat: 60.1699, lng: 24.9384 },
  'US-East': { lat: 39.0438, lng: -77.4874 },
  'US-West': { lat: 37.7749, lng: -122.4194 },
  'APAC': { lat: 35.6762, lng: 139.6503 },
};

function generatePolicies(): PolicyRule[] {
  const policies: PolicyRule[] = [
    {
      id: 'pol-001', name: 'EU Data Residency', type: 'GEO', subject: 'all-users',
      resource: 'energy_metrics.*', action: 'READ', effect: 'ALLOW',
      conditions: [{ attribute: 'user.region', operator: 'in', value: 'EU-West,EU-Central,EU-South,EU-North' }],
      geoRestriction: { allowedRegions: ['EU-West', 'EU-Central', 'EU-South', 'EU-North'], deniedRegions: ['US-East', 'US-West', 'APAC'], dataResidency: 'EU' },
      createdAt: '2025-11-15T10:00:00Z', updatedAt: '2026-03-20T14:30:00Z', isActive: true, priority: 1,
    },
    {
      id: 'pol-002', name: 'Admin Full Access', type: 'RBAC', subject: 'role:admin',
      resource: '*', action: 'ADMIN', effect: 'ALLOW', conditions: [],
      createdAt: '2025-10-01T08:00:00Z', updatedAt: '2026-01-15T09:00:00Z', isActive: true, priority: 0,
    },
    {
      id: 'pol-003', name: 'Analyst Read-Only', type: 'RBAC', subject: 'role:analyst',
      resource: 'swarmkb.*', action: 'READ', effect: 'ALLOW',
      conditions: [{ attribute: 'time.hour', operator: 'gt', value: '6' }, { attribute: 'time.hour', operator: 'lt', value: '22' }],
      createdAt: '2026-01-10T12:00:00Z', updatedAt: '2026-04-01T16:00:00Z', isActive: true, priority: 2,
    },
    {
      id: 'pol-004', name: 'PII Data Protection', type: 'ABAC', subject: 'all-users',
      resource: '*.personal_data', action: 'READ', effect: 'DENY',
      conditions: [{ attribute: 'data.classification', operator: 'eq', value: 'PII' }, { attribute: 'user.clearance', operator: 'lt', value: '3' }],
      createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-04-10T11:00:00Z', isActive: true, priority: 1,
    },
    {
      id: 'pol-005', name: 'Cross-Border Transfer Block', type: 'GEO', subject: 'all-users',
      resource: 'health_records.*', action: 'WRITE', effect: 'DENY',
      conditions: [{ attribute: 'destination.region', operator: 'not_in', value: 'EU-West,EU-Central,EU-South,EU-North' }],
      geoRestriction: { allowedRegions: ['EU-West', 'EU-Central', 'EU-South', 'EU-North'], deniedRegions: ['US-East', 'US-West', 'APAC'], dataResidency: 'EU-only' },
      createdAt: '2026-03-01T08:00:00Z', updatedAt: '2026-04-15T10:00:00Z', isActive: true, priority: 0,
    },
    {
      id: 'pol-006', name: 'Sensor Data Ingestion', type: 'ABAC', subject: 'service:iot-gateway',
      resource: 'sensor_readings.*', action: 'WRITE', effect: 'ALLOW',
      conditions: [{ attribute: 'source.type', operator: 'eq', value: 'iot-device' }, { attribute: 'data.schema', operator: 'eq', value: 'sensor_v2' }],
      createdAt: '2026-02-15T14:00:00Z', updatedAt: '2026-03-28T09:00:00Z', isActive: true, priority: 3,
    },
    {
      id: 'pol-007', name: 'Delete Restriction', type: 'RBAC', subject: 'role:operator',
      resource: '*', action: 'DELETE', effect: 'DENY', conditions: [],
      createdAt: '2025-12-01T10:00:00Z', updatedAt: '2026-02-20T13:00:00Z', isActive: false, priority: 1,
    },
  ];
  return policies;
}

function generateConsents(): ConsentRecord[] {
  return [
    { id: 'cns-001', dataSubject: 'user-42@energy.eu', purpose: 'Energy consumption analytics', legalBasis: 'Consent (Art. 6(1)(a))', grantedAt: '2026-01-15T09:00:00Z', expiresAt: '2027-01-15T09:00:00Z', status: 'ACTIVE', scope: ['energy_metrics', 'usage_patterns'], processingActivities: ['Aggregation', 'Trend Analysis', 'Anomaly Detection'] },
    { id: 'cns-002', dataSubject: 'operator-7@grid.eu', purpose: 'Grid optimization', legalBasis: 'Legitimate Interest (Art. 6(1)(f))', grantedAt: '2025-11-01T08:00:00Z', expiresAt: '2026-11-01T08:00:00Z', status: 'ACTIVE', scope: ['grid_topology', 'load_balancing'], processingActivities: ['Real-time Monitoring', 'Predictive Maintenance'] },
    { id: 'cns-003', dataSubject: 'citizen-128@municipality.gr', purpose: 'Smart city telemetry', legalBasis: 'Public Interest (Art. 6(1)(e))', grantedAt: '2026-03-01T12:00:00Z', expiresAt: '2026-09-01T12:00:00Z', status: 'ACTIVE', scope: ['traffic_sensors', 'air_quality'], processingActivities: ['Data Collection', 'Statistical Aggregation'] },
    { id: 'cns-004', dataSubject: 'user-89@telco.de', purpose: 'Network performance benchmarking', legalBasis: 'Consent (Art. 6(1)(a))', grantedAt: '2025-08-20T15:00:00Z', expiresAt: '2026-02-20T15:00:00Z', status: 'EXPIRED', scope: ['network_metrics'], processingActivities: ['Benchmarking', 'Capacity Planning'] },
    { id: 'cns-005', dataSubject: 'patient-256@health.fi', purpose: 'Health data research', legalBasis: 'Explicit Consent (Art. 9(2)(a))', grantedAt: '2026-02-10T10:00:00Z', expiresAt: '2028-02-10T10:00:00Z', status: 'REVOKED', scope: ['health_records', 'anonymized_stats'], processingActivities: ['Research Analytics', 'De-identification'] },
  ];
}

function generateDSARs(): DSARRequest[] {
  return [
    { id: 'dsar-001', type: 'ACCESS', dataSubject: 'user-42@energy.eu', submittedAt: '2026-04-01T08:00:00Z', deadline: '2026-05-01T08:00:00Z', status: 'IN_PROGRESS', assignedTo: 'DPO Office', affectedNodes: ['optimusdb1', 'optimusdb3', 'optimusdb5'], progress: 65 },
    { id: 'dsar-002', type: 'ERASURE', dataSubject: 'patient-256@health.fi', submittedAt: '2026-04-10T14:00:00Z', deadline: '2026-05-10T14:00:00Z', status: 'PENDING', assignedTo: 'Unassigned', affectedNodes: ['optimusdb2', 'optimusdb4', 'optimusdb6', 'optimusdb7'], progress: 0 },
    { id: 'dsar-003', type: 'PORTABILITY', dataSubject: 'operator-7@grid.eu', submittedAt: '2026-03-15T10:00:00Z', deadline: '2026-04-15T10:00:00Z', status: 'COMPLETED', assignedTo: 'Data Engineering', affectedNodes: ['optimusdb1', 'optimusdb2'], progress: 100 },
    { id: 'dsar-004', type: 'RECTIFICATION', dataSubject: 'citizen-128@municipality.gr', submittedAt: '2026-04-18T09:00:00Z', deadline: '2026-05-18T09:00:00Z', status: 'IN_PROGRESS', assignedTo: 'Data Quality Team', affectedNodes: ['optimusdb3'], progress: 30 },
  ];
}

function generateNodeDataMap(nodes: OptimusDBNode[]): NodeDataMap[] {
  return nodes.map((node, i) => {
    const region = REGIONS[i % REGIONS.length];
    const coords = GEO_COORDS[region];
    return {
      nodeId: node.name, nodeName: node.name, region,
      country: COUNTRIES[region] || 'Unknown',
      lat: coords.lat + (Math.random() - 0.5) * 2,
      lng: coords.lng + (Math.random() - 0.5) * 2,
      datasets: [`knowledgebase`, `sensor_data_${i}`, `swarmkb`],
      classification: (['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const)[i % 4],
      isCompliant: Math.random() > 0.15,
    };
  });
}

function generateAuditLog(nodes: OptimusDBNode[]): AuditLogEntry[] {
  const actions = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'EXPORT', 'REPLICATE'];
  const actors = ['admin@swarm.eu', 'analyst@energy.eu', 'iot-gateway-svc', 'etl-pipeline', 'user-42@energy.eu'];
  const resources = ['energy_metrics.readings', 'swarmkb.knowledge_base', 'sensor_readings.raw', 'health_records.patient_data', 'grid_topology.nodes'];
  const entries: AuditLogEntry[] = [];
  for (let i = 0; i < 50; i++) {
    const isGranted = Math.random() > 0.2;
    entries.push({
      id: `audit-${String(i).padStart(3, '0')}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      actor: actors[Math.floor(Math.random() * actors.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      resource: resources[Math.floor(Math.random() * resources.length)],
      node: nodes[Math.floor(Math.random() * nodes.length)]?.name || 'optimusdb1',
      result: isGranted ? 'GRANTED' : 'DENIED',
      policyId: `pol-00${Math.floor(Math.random() * 7) + 1}`,
      details: isGranted ? 'Access permitted by policy evaluation' : 'Access denied: insufficient clearance or geo-restriction',
    });
  }
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ==============================================================================
// SUB-COMPONENTS
// ==============================================================================

// ── Policy Type Badge ──
const PolicyTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const cls = type === 'RBAC' ? 'badge-rbac' : type === 'ABAC' ? 'badge-abac' : 'badge-geo';
  return <span className={`ds-badge ${cls}`}>{type}</span>;
};

// ── Effect Badge ──
const EffectBadge: React.FC<{ effect: string }> = ({ effect }) => (
  <span className={`ds-badge ${effect === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>{effect}</span>
);

// ── Priority indicator ──
const PriorityDots: React.FC<{ level: number }> = ({ level }) => (
  <div className="priority-dots">
    {[0, 1, 2, 3].map(i => (
      <span key={i} className={`dot ${i <= level ? 'active' : ''}`} />
    ))}
  </div>
);

// ── DSAR Status Badge ──
const DSARStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = status === 'COMPLETED' ? 'status-completed' : status === 'IN_PROGRESS' ? 'status-progress' : status === 'PENDING' ? 'status-pending' : 'status-rejected';
  return <span className={`ds-status-badge ${cls}`}>{status.replace('_', ' ')}</span>;
};

// ── Consent Status Indicator ──
const ConsentStatus: React.FC<{ status: string }> = ({ status }) => {
  const cls = status === 'ACTIVE' ? 'consent-active' : status === 'REVOKED' ? 'consent-revoked' : 'consent-expired';
  return <span className={`ds-consent-status ${cls}`}><span className="status-dot" />{status}</span>;
};

// ── Mini Geo Map (SVG) ──
const GeoMapSVG: React.FC<{ nodes: NodeDataMap[]; selectedRegion: string | null; onSelectRegion: (r: string | null) => void }> = ({ nodes, selectedRegion, onSelectRegion }) => {
  // Simple projected map of node locations
  const minLat = 30, maxLat = 65, minLng = -130, maxLng = 150;
  const w = 700, h = 300;
  const project = (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * w,
    y: h - ((lat - minLat) / (maxLat - minLng)) * h,
  });

  return (
    <svg className="geo-map-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <React.Fragment key={`grid-${i}`}>
          <line x1={0} y1={h * i / 4} x2={w} y2={h * i / 4} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
          <line x1={w * i / 4} y1={0} x2={w * i / 4} y2={h} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        </React.Fragment>
      ))}
      {/* Region labels */}
      {Object.entries(GEO_COORDS).map(([region, coords]) => {
        const pos = project(coords.lat, coords.lng);
        const isSelected = selectedRegion === region;
        const regionNodes = nodes.filter(n => n.region === region);
        const allCompliant = regionNodes.every(n => n.isCompliant);
        return (
          <g key={region} className="geo-region-group" onClick={() => onSelectRegion(isSelected ? null : region)} style={{ cursor: 'pointer' }}>
            {/* Pulse ring */}
            <circle cx={pos.x} cy={pos.y} r={isSelected ? 28 : 22} fill="none" stroke={allCompliant ? 'rgba(0,200,120,0.3)' : 'rgba(255,80,80,0.3)'} strokeWidth={1}>
              <animate attributeName="r" values={isSelected ? '28;35;28' : '22;28;22'} dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Main dot */}
            <circle cx={pos.x} cy={pos.y} r={isSelected ? 8 : 5} fill={allCompliant ? '#00c878' : '#ff5050'} stroke={isSelected ? '#fff' : 'none'} strokeWidth={isSelected ? 2 : 0} />
            {/* Node count */}
            <text x={pos.x} y={pos.y - 14} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9} fontFamily="monospace">{region}</text>
            <text x={pos.x} y={pos.y + 20} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={8} fontFamily="monospace">{regionNodes.length} node{regionNodes.length !== 1 ? 's' : ''}</text>
          </g>
        );
      })}
      {/* Connection lines between EU regions */}
      {['EU-West', 'EU-Central', 'EU-South', 'EU-North'].reduce((pairs, r, i, arr) => {
        if (i < arr.length - 1) pairs.push([r, arr[i + 1]]);
        return pairs;
      }, [] as string[][]).map(([a, b]) => {
        const pa = project(GEO_COORDS[a].lat, GEO_COORDS[a].lng);
        const pb = project(GEO_COORDS[b].lat, GEO_COORDS[b].lng);
        return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="rgba(0,200,120,0.15)" strokeWidth={1} strokeDasharray="4,4" />;
      })}
    </svg>
  );
};

// ── Policy Editor Modal ──
const PolicyEditor: React.FC<{ policy: PolicyRule | null; onClose: () => void; onSave: (p: PolicyRule) => void }> = ({ policy, onClose, onSave }) => {
  const [editPolicy, setEditPolicy] = useState<PolicyRule>(policy || {
    id: `pol-${Date.now()}`, name: '', type: 'RBAC', subject: '', resource: '', action: 'READ',
    effect: 'ALLOW', conditions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    isActive: true, priority: 2,
  });

  if (!policy && !editPolicy) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-header">
          <h3>{policy ? 'Edit Policy' : 'New Policy'}</h3>
          <button className="ds-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ds-modal-body">
          <div className="ds-form-row">
            <label>Policy Name</label>
            <input type="text" value={editPolicy.name} onChange={e => setEditPolicy({ ...editPolicy, name: e.target.value })} placeholder="e.g. EU Data Residency" />
          </div>
          <div className="ds-form-row ds-form-row-split">
            <div>
              <label>Type</label>
              <select value={editPolicy.type} onChange={e => setEditPolicy({ ...editPolicy, type: e.target.value as any })}>
                <option value="RBAC">RBAC (Role-Based)</option>
                <option value="ABAC">ABAC (Attribute-Based)</option>
                <option value="GEO">GEO (Geographic)</option>
              </select>
            </div>
            <div>
              <label>Effect</label>
              <select value={editPolicy.effect} onChange={e => setEditPolicy({ ...editPolicy, effect: e.target.value as any })}>
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
              </select>
            </div>
          </div>
          <div className="ds-form-row ds-form-row-split">
            <div>
              <label>Subject</label>
              <input type="text" value={editPolicy.subject} onChange={e => setEditPolicy({ ...editPolicy, subject: e.target.value })} placeholder="e.g. role:admin" />
            </div>
            <div>
              <label>Action</label>
              <select value={editPolicy.action} onChange={e => setEditPolicy({ ...editPolicy, action: e.target.value as any })}>
                <option value="READ">READ</option>
                <option value="WRITE">WRITE</option>
                <option value="DELETE">DELETE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <div className="ds-form-row">
            <label>Resource Pattern</label>
            <input type="text" value={editPolicy.resource} onChange={e => setEditPolicy({ ...editPolicy, resource: e.target.value })} placeholder="e.g. energy_metrics.* or *" />
          </div>
          <div className="ds-form-row">
            <label>Priority (0 = highest)</label>
            <input type="range" min={0} max={5} value={editPolicy.priority} onChange={e => setEditPolicy({ ...editPolicy, priority: Number(e.target.value) })} />
            <span className="ds-range-label">{editPolicy.priority}</span>
          </div>
          <div className="ds-form-row">
            <label className="ds-toggle-label">
              <input type="checkbox" checked={editPolicy.isActive} onChange={e => setEditPolicy({ ...editPolicy, isActive: e.target.checked })} />
              <span className="ds-toggle-track"><span className="ds-toggle-thumb" /></span>
              Active
            </label>
          </div>
        </div>
        <div className="ds-modal-footer">
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ds-btn ds-btn-primary" onClick={() => { onSave(editPolicy); onClose(); }}>Save Policy</button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

const DataSovereigntyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policies' | 'geo' | 'consent' | 'dsar' | 'audit'>('policies');
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [dsars, setDsars] = useState<DSARRequest[]>([]);
  const [nodeMap, setNodeMap] = useState<NodeDataMap[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<PolicyRule | null>(null);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [policyFilter, setPolicyFilter] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'GRANTED' | 'DENIED'>('all');

  // Initialize data
  useEffect(() => {
    let cancelled = false;
    getAvailableNodes().then(nodes => {
      if (cancelled) return;
      setPolicies(generatePolicies());
      setConsents(generateConsents());
      setDsars(generateDSARs());
      setNodeMap(generateNodeDataMap(nodes));
      setAuditLog(generateAuditLog(nodes));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Computed stats
  const stats = useMemo(() => ({
    totalPolicies: policies.length,
    activePolicies: policies.filter(p => p.isActive).length,
    geoPolicies: policies.filter(p => p.type === 'GEO').length,
    denyRules: policies.filter(p => p.effect === 'DENY').length,
    activeConsents: consents.filter(c => c.status === 'ACTIVE').length,
    pendingDSARs: dsars.filter(d => d.status === 'PENDING' || d.status === 'IN_PROGRESS').length,
    complianceRate: nodeMap.length > 0 ? Math.round((nodeMap.filter(n => n.isCompliant).length / nodeMap.length) * 100) : 0,
    deniedActions: auditLog.filter(a => a.result === 'DENIED').length,
    totalAuditEvents: auditLog.length,
  }), [policies, consents, dsars, nodeMap, auditLog]);

  const filteredPolicies = useMemo(() =>
    policies.filter(p => !policyFilter || p.name.toLowerCase().includes(policyFilter.toLowerCase()) || p.type === policyFilter.toUpperCase()),
    [policies, policyFilter]
  );

  const filteredAudit = useMemo(() =>
    auditFilter === 'all' ? auditLog : auditLog.filter(a => a.result === auditFilter),
    [auditLog, auditFilter]
  );

  const handleSavePolicy = (updated: PolicyRule) => {
    setPolicies(prev => {
      const idx = prev.findIndex(p => p.id === updated.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...updated, updatedAt: new Date().toISOString() }; return copy; }
      return [...prev, updated];
    });
  };

  const handleTogglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p));
  };

  // ── Render ──
  if (isLoading) {
    return (
      <DocumentTitle title="Data Sovereignty - OptimusDDC">
        <main className="ds-page">
          <div className="ds-loading">
            <div className="ds-loading-spinner" />
            <p>Initializing sovereignty engine…</p>
          </div>
        </main>
      </DocumentTitle>
    );
  }

  return (
    <DocumentTitle title="Data Sovereignty - OptimusDDC">
      <main className="ds-page">
        {/* ── Header ── */}
        <header className="ds-header">
          <div className="ds-header-left">
            <div className="ds-header-icon">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h1 className="ds-title">Data Sovereignty & Access Control</h1>
              <p className="ds-subtitle">RBAC/ABAC Policy Management · Geo-Fencing · GDPR Compliance</p>
            </div>
          </div>
          <div className="ds-header-right">
            <button className="ds-btn ds-btn-primary" onClick={() => { setEditingPolicy(null); setShowPolicyEditor(true); }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Policy
            </button>
          </div>
        </header>

        {/* ── Stats Strip ── */}
        <div className="ds-stats-strip">
          <div className="ds-stat-card">
            <div className="ds-stat-value">{stats.activePolicies}<span className="ds-stat-total">/{stats.totalPolicies}</span></div>
            <div className="ds-stat-label">Active Policies</div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-value ds-stat-geo">{stats.geoPolicies}</div>
            <div className="ds-stat-label">Geo-Fence Rules</div>
          </div>
          <div className="ds-stat-card">
            <div className={`ds-stat-value ${stats.complianceRate === 100 ? 'ds-stat-ok' : 'ds-stat-warn'}`}>{stats.complianceRate}%</div>
            <div className="ds-stat-label">Node Compliance</div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-value">{stats.activeConsents}</div>
            <div className="ds-stat-label">Active Consents</div>
          </div>
          <div className="ds-stat-card">
            <div className={`ds-stat-value ${stats.pendingDSARs > 0 ? 'ds-stat-warn' : 'ds-stat-ok'}`}>{stats.pendingDSARs}</div>
            <div className="ds-stat-label">Pending DSARs</div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-value">{stats.deniedActions}</div>
            <div className="ds-stat-label">Denied (7d)</div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="ds-tabs">
          {([
            ['policies', 'Policy Engine', 'M3 11l-1-2H2v2h3l.4 2H1v2h5l1.5-4zm3 0l-1-2h-2l1 2h2z'],
            ['geo', 'Geo-Fencing', ''],
            ['consent', 'Consent Registry', ''],
            ['dsar', 'DSAR Requests', ''],
            ['audit', 'Audit Trail', ''],
          ] as [string, string, string][]).map(([key, label]) => (
            <button key={key} className={`ds-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key as any)}>
              {label}
              {key === 'dsar' && stats.pendingDSARs > 0 && <span className="ds-tab-badge">{stats.pendingDSARs}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="ds-content">
          {/* POLICIES TAB */}
          {activeTab === 'policies' && (
            <div className="ds-panel ds-policies-panel">
              <div className="ds-panel-toolbar">
                <input className="ds-search-input" placeholder="Filter policies by name or type…" value={policyFilter} onChange={e => setPolicyFilter(e.target.value)} />
              </div>
              <div className="ds-table-wrapper">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Status</th><th>Policy Name</th><th>Type</th><th>Subject</th><th>Resource</th><th>Action</th><th>Effect</th><th>Priority</th><th>Updated</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.map(p => (
                      <tr key={p.id} className={!p.isActive ? 'row-inactive' : ''}>
                        <td>
                          <button className={`ds-toggle-btn ${p.isActive ? 'on' : 'off'}`} onClick={() => handleTogglePolicy(p.id)} title={p.isActive ? 'Deactivate' : 'Activate'}>
                            <span className="ds-toggle-indicator" />
                          </button>
                        </td>
                        <td className="td-name">{p.name}</td>
                        <td><PolicyTypeBadge type={p.type} /></td>
                        <td className="td-mono">{p.subject}</td>
                        <td className="td-mono">{p.resource}</td>
                        <td><span className={`ds-action-chip action-${p.action.toLowerCase()}`}>{p.action}</span></td>
                        <td><EffectBadge effect={p.effect} /></td>
                        <td><PriorityDots level={3 - p.priority} /></td>
                        <td className="td-date">{new Date(p.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <button className="ds-icon-btn" title="Edit" onClick={() => { setEditingPolicy(p); setShowPolicyEditor(true); }}>
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredPolicies.length === 0 && <div className="ds-empty">No policies match the current filter.</div>}
            </div>
          )}

          {/* GEO-FENCING TAB */}
          {activeTab === 'geo' && (
            <div className="ds-panel ds-geo-panel">
              <div className="ds-geo-layout">
                <div className="ds-geo-map-container">
                  <h3 className="ds-section-title">Data Residency Map</h3>
                  <GeoMapSVG nodes={nodeMap} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
                  <div className="ds-geo-legend">
                    <span className="ds-legend-item"><span className="ds-legend-dot compliant" /> Compliant</span>
                    <span className="ds-legend-item"><span className="ds-legend-dot non-compliant" /> Non-Compliant</span>
                    <span className="ds-legend-item"><span className="ds-legend-line" /> EU Data Transfer Path</span>
                  </div>
                </div>
                <div className="ds-geo-details">
                  <h3 className="ds-section-title">Node Inventory {selectedRegion && `— ${selectedRegion}`}</h3>
                  <div className="ds-node-cards">
                    {(selectedRegion ? nodeMap.filter(n => n.region === selectedRegion) : nodeMap).map(node => (
                      <div key={node.nodeId} className={`ds-node-card ${node.isCompliant ? '' : 'non-compliant'}`}>
                        <div className="ds-node-card-header">
                          <span className={`ds-compliance-dot ${node.isCompliant ? 'ok' : 'fail'}`} />
                          <strong>{node.nodeName}</strong>
                          <span className={`ds-classification-tag cls-${node.classification.toLowerCase()}`}>{node.classification}</span>
                        </div>
                        <div className="ds-node-card-meta">
                          <span>{node.region} · {node.country}</span>
                        </div>
                        <div className="ds-node-card-datasets">
                          {node.datasets.map(d => <span key={d} className="ds-dataset-chip">{d}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONSENT REGISTRY TAB */}
          {activeTab === 'consent' && (
            <div className="ds-panel">
              <div className="ds-table-wrapper">
                <table className="ds-table">
                  <thead>
                    <tr><th>Status</th><th>Data Subject</th><th>Purpose</th><th>Legal Basis</th><th>Scope</th><th>Granted</th><th>Expires</th></tr>
                  </thead>
                  <tbody>
                    {consents.map(c => (
                      <tr key={c.id} className={c.status !== 'ACTIVE' ? 'row-inactive' : ''}>
                        <td><ConsentStatus status={c.status} /></td>
                        <td className="td-mono">{c.dataSubject}</td>
                        <td>{c.purpose}</td>
                        <td className="td-legal">{c.legalBasis}</td>
                        <td>
                          <div className="ds-scope-chips">{c.scope.map(s => <span key={s} className="ds-scope-chip">{s}</span>)}</div>
                        </td>
                        <td className="td-date">{new Date(c.grantedAt).toLocaleDateString()}</td>
                        <td className="td-date">{new Date(c.expiresAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DSAR REQUESTS TAB */}
          {activeTab === 'dsar' && (
            <div className="ds-panel">
              <div className="ds-dsar-grid">
                {dsars.map(d => (
                  <div key={d.id} className="ds-dsar-card">
                    <div className="ds-dsar-card-header">
                      <span className={`ds-dsar-type type-${d.type.toLowerCase()}`}>{d.type}</span>
                      <DSARStatusBadge status={d.status} />
                    </div>
                    <div className="ds-dsar-subject">{d.dataSubject}</div>
                    <div className="ds-dsar-meta">
                      <div><span className="meta-label">Submitted</span>{new Date(d.submittedAt).toLocaleDateString()}</div>
                      <div><span className="meta-label">Deadline</span>{new Date(d.deadline).toLocaleDateString()}</div>
                      <div><span className="meta-label">Assigned</span>{d.assignedTo}</div>
                    </div>
                    <div className="ds-dsar-progress">
                      <div className="ds-progress-bar">
                        <div className="ds-progress-fill" style={{ width: `${d.progress}%` }} />
                      </div>
                      <span className="ds-progress-label">{d.progress}%</span>
                    </div>
                    <div className="ds-dsar-nodes">
                      <span className="meta-label">Affected Nodes:</span>
                      {d.affectedNodes.map(n => <span key={n} className="ds-node-chip">{n}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT TRAIL TAB */}
          {activeTab === 'audit' && (
            <div className="ds-panel">
              <div className="ds-panel-toolbar">
                <div className="ds-filter-group">
                  {(['all', 'GRANTED', 'DENIED'] as const).map(f => (
                    <button key={f} className={`ds-filter-btn ${auditFilter === f ? 'active' : ''}`} onClick={() => setAuditFilter(f)}>
                      {f === 'all' ? 'All Events' : f}
                    </button>
                  ))}
                </div>
                <span className="ds-audit-count">{filteredAudit.length} events</span>
              </div>
              <div className="ds-audit-timeline">
                {filteredAudit.slice(0, 30).map(entry => (
                  <div key={entry.id} className={`ds-audit-entry ${entry.result.toLowerCase()}`}>
                    <div className="ds-audit-time">{new Date(entry.timestamp).toLocaleString()}</div>
                    <div className="ds-audit-indicator">
                      <span className={`ds-audit-dot ${entry.result.toLowerCase()}`} />
                      <span className="ds-audit-line" />
                    </div>
                    <div className="ds-audit-body">
                      <div className="ds-audit-action">
                        <span className={`ds-audit-result ${entry.result.toLowerCase()}`}>{entry.result}</span>
                        <strong>{entry.actor}</strong> → <code>{entry.action}</code> on <code>{entry.resource}</code>
                      </div>
                      <div className="ds-audit-detail">Node: {entry.node} · Policy: {entry.policyId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Policy Editor Modal */}
        {showPolicyEditor && (
          <PolicyEditor policy={editingPolicy} onClose={() => setShowPolicyEditor(false)} onSave={handleSavePolicy} />
        )}
      </main>
    </DocumentTitle>
  );
};

export default DataSovereigntyPage;
