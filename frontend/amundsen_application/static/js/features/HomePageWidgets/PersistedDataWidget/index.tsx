// ==============================================================================
// PersistedDataWidget - OptimusDB Distributed Cluster Inventory Visualization
// ==============================================================================
// PHASE 2: Now uses dynamic apiConfig for Docker + K3s compatibility
// Dynamically discovers all available nodes instead of hardcoded AGENTS array
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { getAvailableNodes, OptimusDBNode } from 'config/apiConfig'; // ← PHASE 2 IMPORT
import './styles.scss';

// ==============================================================================
// TYPES
// ==============================================================================

interface SQLiteTable {
  database: string;
  tableName: string;
  rowCount: number;
  agentCount: number;
  agents: string[];
}

interface OrbitDBStore {
  storeName: string;
  storeType: 'docstore' | 'eventlog';
  entryCount: { min: number; max: number; avg: number };
  isSynced: boolean;
  agentCount: number;
  agents: string[];
}

interface AgentHealth {
  agentId: string;
  nodeType: 'coordinator' | 'follower';
  isOnline: boolean;
  databaseCount: number;
  storeCount: number;
}

interface InventoryData {
  tables: SQLiteTable[];
  stores: OrbitDBStore[];
  agentHealth: AgentHealth[];
  totalRows: number;
  onlineAgents: number;
}

interface InventoryFetchSuccess {
  agentId: string;
  data: any;
  success: true;
}

interface InventoryFetchFailure {
  agentId: string;
  success: false;
}

type InventoryFetchResult = InventoryFetchSuccess | InventoryFetchFailure;

// ==============================================================================
// MINI COMPONENTS
// ==============================================================================

const ReplicationHeatmap: React.FC<{
  tables: SQLiteTable[];
  agents: OptimusDBNode[]; // ← PHASE 2: Changed type
}> = ({ tables, agents }) => {
  const topTables = tables.slice(0, 5);

  return (
    <div className="replication-heatmap-mini">
      <h4>Replication Distribution</h4>
      <div className="heatmap-grid">
        <div className="heatmap-row heatmap-header">
          <div className="row-label">Table</div>
          {agents.map((agent) => (
            <div key={agent.id} className="agent-cell">
              A{agent.id}
            </div>
          ))}
        </div>
        {topTables.map((table) => (
          <div
            key={`${table.database}.${table.tableName}`}
            className="heatmap-row"
          >
            <div
              className="row-label"
              title={`${table.database}.${table.tableName}`}
            >
              <span className="table-name-short">{table.tableName}</span>
              <span className="database-badge-mini">{table.database}</span>
            </div>
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`data-cell ${
                  table.agents.includes(`agent-${agent.id}`)
                    ? 'replicated'
                    : 'not-replicated'
                }`}
                title={`${table.tableName} on Agent ${agent.id}: ${
                  table.agents.includes(`agent-${agent.id}`)
                    ? 'Replicated'
                    : 'Not Replicated'
                }`}
              >
                {table.agents.includes(`agent-${agent.id}`) && (
                  <div className="replication-indicator" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <div className="legend-item">
          <div className="legend-square replicated" />
          <span>Replicated</span>
        </div>
        <div className="legend-item">
          <div className="legend-square not-replicated" />
          <span>Not Replicated</span>
        </div>
      </div>
    </div>
  );
};

const DatabaseDistribution: React.FC<{ tables: SQLiteTable[] }> = ({
  tables,
}) => {
  const dbStats = tables.reduce((acc, table) => {
    if (!acc[table.database]) {
      acc[table.database] = { count: 0, rows: 0 };
    }
    acc[table.database].count++;
    acc[table.database].rows += table.rowCount;

    return acc;
  }, {} as Record<string, { count: number; rows: number }>);

  const dbData = Object.entries(dbStats)
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      rows: stats.rows,
      percentage: (stats.count / tables.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const colors = ['#667eea', '#764ba2', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="database-distribution">
      <h4>Database Distribution</h4>
      <div className="db-bars">
        {dbData.map((db, idx) => (
          <div key={db.name} className="db-bar-item">
            <div className="db-bar-header">
              <span className="db-name">{db.name}</span>
              <span className="db-count">{db.count} tables</span>
            </div>
            <div className="db-bar-track">
              <div
                className="db-bar-fill"
                style={{
                  width: `${db.percentage}%`,
                  background: colors[idx % colors.length],
                }}
              />
            </div>
            <div className="db-bar-footer">
              <span className="db-rows">
                {(db.rows / 1000).toFixed(1)}K rows
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrbitDBSyncStatus: React.FC<{ stores: OrbitDBStore[] }> = ({
  stores,
}) => {
  const syncedCount = stores.filter((s) => s.isSynced).length;
  const outOfSyncCount = stores.length - syncedCount;
  const syncPercentage =
    stores.length > 0 ? (syncedCount / stores.length) * 100 : 0;

  return (
    <div className="orbitdb-sync-status">
      <h4>CRUD Store Sync Status</h4>
      <div className="sync-visual">
        <svg
          className="sync-donut"
          width="140"
          height="140"
          viewBox="0 0 140 140"
        >
          <circle
            className="donut-bg"
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="#e9ecef"
            strokeWidth="12"
          />
          <circle
            className="donut-fill"
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="#00C49F"
            strokeWidth="12"
            strokeDasharray={`${(syncPercentage / 100) * 377} 377`}
            transform="rotate(-90 70 70)"
          />
          <text x="70" y="65" textAnchor="middle" className="donut-percentage">
            {syncPercentage.toFixed(0)}%
          </text>
          <text x="70" y="82" textAnchor="middle" className="donut-label">
            Synced
          </text>
        </svg>
        <div className="sync-stats">
          <div className="sync-stat">
            <div className="stat-indicator synced" />
            <div className="stat-info">
              <span className="stat-value">{syncedCount}</span>
              <span className="stat-label">Synced</span>
            </div>
          </div>
          <div className="sync-stat">
            <div className="stat-indicator out-of-sync" />
            <div className="stat-info">
              <span className="stat-value">{outOfSyncCount}</span>
              <span className="stat-label">Out of Sync</span>
            </div>
          </div>
        </div>
      </div>
      <div className="store-types">
        {stores.slice(0, 3).map((store) => (
          <div key={store.storeName} className="store-type-item">
            <span className={`store-type-badge ${store.storeType}`}>
              {store.storeType}
            </span>
            <span className="store-name">{store.storeName}</span>
            <span
              className={`sync-badge ${
                store.isSynced ? 'synced' : 'out-of-sync'
              }`}
            >
              {store.isSynced ? '✓' : '⚠'}
            </span>
          </div>
        ))}
        {stores.length > 3 && (
          <div className="more-stores">+{stores.length - 3} more stores</div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// MAIN WIDGET COMPONENT - PHASE 2 UPDATED
// ==============================================================================

const PersistedDataWidget: React.FC = () => {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeView, setActiveView] = useState<
    'overview' | 'tables' | 'stores'
  >('overview');
  const [discoveredAgents, setDiscoveredAgents] = useState<OptimusDBNode[]>([]); // ← PHASE 2

  // ==============================================================================
  // DATA FETCHING - PHASE 2 UPDATED
  // ==============================================================================

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      // ✅ PHASE 2: Dynamically discover all available nodes
      const nodes = await getAvailableNodes();

      console.log(`PersistedDataWidget: Discovered ${nodes.length} nodes`);
      setDiscoveredAgents(nodes);

      // ✅ PHASE 2: Fetch inventory from each discovered node
      const promises = nodes.map((node) =>
        fetch(`${node.url}/swarmkb/agent/inventory`)
          .then((res) => res.json())
          .then(
            (data): InventoryFetchSuccess => ({
              agentId: `agent-${node.id}`,
              data,
              success: true,
            })
          )
          .catch(
            (): InventoryFetchFailure => ({
              agentId: `agent-${node.id}`,
              success: false,
            })
          )
      );

      const results: InventoryFetchResult[] = await Promise.all(promises);

      // Aggregate data
      const tablesMap = new Map<string, SQLiteTable>();
      const storesMap = new Map<string, OrbitDBStore>();
      const agentHealthMap = new Map<string, AgentHealth>();
      let totalRows = 0;
      let onlineCount = 0;

      results.forEach((result) => {
        if (!result.success) {
          agentHealthMap.set(result.agentId, {
            agentId: result.agentId,
            nodeType: 'follower',
            isOnline: false,
            databaseCount: 0,
            storeCount: 0,
          });

          return;
        }

        onlineCount++;
        const { agentId, data } = result;

        // Process SQLite tables
        if (data.databases) {
          Object.entries(data.databases).forEach(
            ([dbName, dbData]: [string, any]) => {
              if (dbData.tables) {
                Object.entries(dbData.tables).forEach(
                  ([tableName, tableInfo]: [string, any]) => {
                    const key = `${dbName}.${tableName}`;

                    if (tablesMap.has(key)) {
                      const existing = tablesMap.get(key)!;

                      existing.rowCount += tableInfo.row_count || 0;
                      existing.agents.push(agentId);
                      existing.agentCount++;
                    } else {
                      tablesMap.set(key, {
                        database: dbName,
                        tableName,
                        rowCount: tableInfo.row_count || 0,
                        agentCount: 1,
                        agents: [agentId],
                      });
                    }
                    totalRows += tableInfo.row_count || 0;
                  }
                );
              }
            }
          );
        }

        // Process OrbitDB stores
        if (data.orbitdb_stores && data.orbitdb_stores.active_stores) {
          data.orbitdb_stores.active_stores.forEach((store: any) => {
            const key = store.name;
            const entryCount = store.event_count || 0;

            if (storesMap.has(key)) {
              const existing = storesMap.get(key)!;

              existing.agents.push(agentId);
              existing.agentCount++;
              existing.entryCount.min = Math.min(
                existing.entryCount.min,
                entryCount
              );
              existing.entryCount.max = Math.max(
                existing.entryCount.max,
                entryCount
              );
              existing.entryCount.avg =
                (existing.entryCount.avg * (existing.agentCount - 1) +
                  entryCount) /
                existing.agentCount;
            } else {
              storesMap.set(key, {
                storeName: store.name,
                storeType: store.type === 'docstore' ? 'docstore' : 'eventlog',
                entryCount: {
                  min: entryCount,
                  max: entryCount,
                  avg: entryCount,
                },
                isSynced: true,
                agentCount: 1,
                agents: [agentId],
              });
            }
          });
        }

        agentHealthMap.set(agentId, {
          agentId,
          nodeType: data.agent_info?.node_type || 'follower',
          isOnline: true,
          databaseCount: data.databases
            ? Object.keys(data.databases).length
            : 0,
          storeCount: data.orbitdb_stores?.active_stores
            ? data.orbitdb_stores.active_stores.length
            : 0,
        });
      });

      // Check sync status
      storesMap.forEach((store) => {
        store.isSynced = store.entryCount.max - store.entryCount.min <= 5;
      });

      setData({
        tables: Array.from(tablesMap.values()).sort(
          (a, b) => b.rowCount - a.rowCount
        ),
        stores: Array.from(storesMap.values()),
        agentHealth: Array.from(agentHealthMap.values()),
        totalRows,
        onlineAgents: onlineCount,
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
    const interval = setInterval(fetchInventoryData, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [fetchInventoryData]);

  // ==============================================================================
  // RENDER
  // ==============================================================================

  if (loading && !data) {
    return (
      <div className="persisted-data-widget">
        <div className="widget-header">
          <div className="header-content">
            <div className="icon-wrapper">
              <span className="widget-icon">💾</span>
            </div>
            <div className="header-text">
              <h3>Agent Data Overview</h3>
              <p className="subtitle">Cluster Inventory & Replication</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="persisted-data-widget">
        <div className="widget-header">
          <div className="header-content">
            <div className="icon-wrapper">
              <span className="widget-icon">💾</span>
            </div>
            <div className="header-text">
              <h3>Agent Data Overview</h3>
              <p className="subtitle">Cluster Inventory & Replication</p>
            </div>
          </div>
        </div>
        <div className="widget-body">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>Unable to load inventory data</p>
            <button className="retry-btn" onClick={fetchInventoryData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="persisted-data-widget">
      <div className="widget-header">
        <div className="header-content">
          <div className="icon-wrapper">
            <span className="widget-icon">💾</span>
          </div>
          <div className="header-text">
            <h3>Agent Data Overview</h3>
            <p className="subtitle">Cluster Inventory & Replication</p>
          </div>
        </div>
        <div className="header-metrics">
          <div className="header-metric">
            <span className="metric-value">{data.tables.length}</span>
            <span className="metric-label">Tables</span>
          </div>
          <div className="header-metric">
            <span className="metric-value">{data.stores.length}</span>
            <span className="metric-label">Stores</span>
          </div>
          <div className="header-metric">
            <span className="metric-value">
              {data.onlineAgents}/{discoveredAgents.length}
            </span>
            <span className="metric-label">Agents</span>
          </div>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`tab-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <span className="tab-icon">📊</span>
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeView === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveView('tables')}
        >
          <span className="tab-icon">🗄️</span>
          <span>Tables</span>
        </button>
        <button
          className={`tab-btn ${activeView === 'stores' ? 'active' : ''}`}
          onClick={() => setActiveView('stores')}
        >
          <span className="tab-icon">📦</span>
          <span>Stores</span>
        </button>
      </div>

      <div className="widget-body">
        {activeView === 'overview' && (
          <div className="overview-content">
            <div className="key-metrics">
              <div className="metric-card">
                <div className="metric-icon-large">🗄️</div>
                <div className="metric-details-large">
                  <span className="metric-value-xl">{data.tables.length}</span>
                  <span className="metric-label-large">RDBMS Tables</span>
                  <span className="metric-subtext">
                    {(data.totalRows / 1000).toFixed(2)}K total rows
                  </span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon-large">📦</div>
                <div className="metric-details-large">
                  <span className="metric-value-xl">{data.stores.length}</span>
                  <span className="metric-label-large">CRUD Data Stores</span>
                  <span className="metric-subtext">
                    {data.stores.filter((s) => s.isSynced).length} synchronized
                  </span>
                </div>
              </div>
            </div>

            <div className="visualization-grid">
              <div className="viz-card">
                <DatabaseDistribution tables={data.tables} />
              </div>
              <div className="viz-card">
                <OrbitDBSyncStatus stores={data.stores} />
              </div>
            </div>

            <div className="viz-card full-width">
              <ReplicationHeatmap
                tables={data.tables}
                agents={discoveredAgents}
              />
            </div>
          </div>
        )}

        {activeView === 'tables' && (
          <div className="tables-content">
            <div className="content-header">
              <h4>RDBMS Tables ({data.tables.length})</h4>
              <span className="total-rows">
                {(data.totalRows / 1000).toFixed(2)}K total rows
              </span>
            </div>
            <div className="tables-list">
              {data.tables.slice(0, 10).map((table) => (
                <div
                  key={`${table.database}.${table.tableName}`}
                  className="table-item"
                >
                  <div className="table-item-header">
                    <span className="table-name">{table.tableName}</span>
                    <span className="table-database">{table.database}</span>
                  </div>
                  <div className="table-item-metrics">
                    <div className="item-metric">
                      <span className="metric-icon-sm">📊</span>
                      <span>{table.rowCount.toLocaleString()} rows</span>
                    </div>
                    <div className="item-metric">
                      <span className="metric-icon-sm">🔄</span>
                      <span>
                        {table.agentCount}/{discoveredAgents.length} agents
                      </span>
                    </div>
                  </div>
                  <div className="replication-bar">
                    <div
                      className="replication-fill"
                      style={{
                        width: `${
                          (table.agentCount / discoveredAgents.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {data.tables.length > 10 && (
              <div className="view-more">
                <a href="/persisted-data">
                  View all {data.tables.length} tables →
                </a>
              </div>
            )}
          </div>
        )}

        {activeView === 'stores' && (
          <div className="stores-content">
            <div className="content-header">
              <h4>CRUD Data Stores ({data.stores.length})</h4>
              <span className="sync-summary">
                {data.stores.filter((s) => s.isSynced).length} synced,{' '}
                {data.stores.filter((s) => !s.isSynced).length} out of sync
              </span>
            </div>
            <div className="stores-list">
              {data.stores.map((store) => (
                <div key={store.storeName} className="store-item">
                  <div className="store-item-header">
                    <span className="store-name">{store.storeName}</span>
                    <span className={`store-type-badge ${store.storeType}`}>
                      {store.storeType}
                    </span>
                    <span
                      className={`sync-indicator ${
                        store.isSynced ? 'synced' : 'out-of-sync'
                      }`}
                    >
                      {store.isSynced ? '✓ Synced' : '⚠ Out of Sync'}
                    </span>
                  </div>
                  <div className="store-item-details">
                    <div className="detail-item">
                      <span className="detail-label">Entries:</span>
                      <span className="detail-value">
                        {Math.round(store.entryCount.avg).toLocaleString()} avg
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Variance:</span>
                      <span className="detail-value">
                        {store.entryCount.max - store.entryCount.min}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Agents:</span>
                      <span className="detail-value">
                        {store.agentCount}/{discoveredAgents.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="widget-footer">
        <div className="footer-info">
          <span className="footer-icon">🕐</span>
          <span className="footer-text">
            Updated {new Date().toLocaleTimeString()}
          </span>
        </div>
        <a href="/persisted-data" className="view-details-btn">
          View Full Details →
        </a>
      </div>
    </div>
  );
};

export default PersistedDataWidget;
