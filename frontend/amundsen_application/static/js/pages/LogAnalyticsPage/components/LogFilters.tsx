// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogFilters.tsx
// UPDATED FOR OPTIMUSDB LOGGER INTEGRATION - MULTI-SELECT TYPE PILLS
// ==============================================================================

import * as React from 'react';
import { LogFiltersState, LogType, LOG_TYPE_COLORS } from '../index';

interface LogFiltersProps {
  filters: LogFiltersState;
  onFilterChange: (filters: Partial<LogFiltersState>) => void;
  availableNodes: string[];
}

const LogFilters: React.FC<LogFiltersProps> = ({
                                                 filters,
                                                 onFilterChange,
                                                 availableNodes,
                                               }) => {
  // All available log types
  const allLogTypes: LogType[] = [
    'INFO', 'DEBUG', 'QUERY', 'LINEAGE', 'MESH', 'REPLICATION',
    'ELECTION', 'CACHE', 'AI', 'METRICS', 'PROC', 'DISCOVERY',
    'WARN', 'ERROR'
  ];

  // Quick filter presets
  const quickFilters = [
    { id: 'critical', label: '🔥 Critical Only', types: ['ERROR'] as LogType[] },
    { id: 'errors-warnings', label: '⚠️ Errors & Warnings', types: ['ERROR', 'WARN'] as LogType[] },
    { id: 'replication', label: '🔄 Replication', types: ['REPLICATION', 'MESH'] as LogType[] },
    { id: 'elections', label: '🗳️ Elections', types: ['ELECTION', 'DISCOVERY'] as LogType[] },
    { id: 'queries', label: '🔍 Queries', types: ['QUERY', 'CACHE'] as LogType[] },
    { id: 'ai', label: '🤖 AI Operations', types: ['AI', 'LINEAGE'] as LogType[] },
  ];

  // Toggle log type selection
  const toggleLogType = (type: LogType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];

    onFilterChange({ types: newTypes });
  };

  // Apply quick filter
  const applyQuickFilter = (types: LogType[]) => {
    onFilterChange({ types });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange({
      types: [],
      nodeId: 'all',
      startTime: '',
      endTime: '',
      searchTerm: '',
    });
  };

  // Select all types
  const selectAllTypes = () => {
    onFilterChange({ types: allLogTypes });
  };

  // Deselect all types
  const deselectAllTypes = () => {
    onFilterChange({ types: [] });
  };

  return (
    <div className="log-filters-panel">
      {/* Header */}
      <div className="filters-header">
        <h3>🔍 Filters</h3>
        <button className="btn-link" onClick={clearAllFilters}>
          Clear All
        </button>
      </div>

      {/* Search */}
      <div className="filter-group">
        <label className="filter-label">Search</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Search messages, nodes, trace IDs..."
          value={filters.searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
        />
      </div>

      {/* Log Types - Multi-select Pills */}
      <div className="filter-group">
        <div className="filter-label-row">
          <label className="filter-label">Log Types</label>
          <div className="filter-actions">
            <button className="btn-link-sm" onClick={selectAllTypes}>All</button>
            <span>|</span>
            <button className="btn-link-sm" onClick={deselectAllTypes}>None</button>
          </div>
        </div>

        <div className="log-type-pills">
          {allLogTypes.map((type) => {
            const isActive = filters.types.length === 0 || filters.types.includes(type);
            return (
              <button
                key={type}
                className={`log-type-pill ${isActive ? 'active' : ''}`}
                style={{
                  background: isActive ? LOG_TYPE_COLORS[type] : '#e9ecef',
                  color: isActive
                    ? (['#ffc107', '#fd7e14'].includes(LOG_TYPE_COLORS[type]) ? '#000' : '#fff')
                    : '#6c757d',
                  border: isActive ? '2px solid currentColor' : '2px solid transparent',
                }}
                onClick={() => toggleLogType(type)}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="filter-group">
        <label className="filter-label">Quick Actions</label>
        <div className="quick-filters">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              className="quick-filter-btn"
              onClick={() => applyQuickFilter(filter.types)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node Selection */}
      <div className="filter-group">
        <label className="filter-label">Node</label>
        <select
          className="filter-input"
          value={filters.nodeId}
          onChange={(e) => onFilterChange({ nodeId: e.target.value })}
        >
          <option value="all">All Nodes ({availableNodes.length})</option>
          {availableNodes.map((node) => (
            <option key={node} value={node}>
              {node}
            </option>
          ))}
        </select>
      </div>

      {/* Time Range */}
      <div className="filter-group">
        <label className="filter-label">Start Time</label>
        <input
          type="datetime-local"
          className="filter-input"
          value={filters.startTime}
          onChange={(e) => onFilterChange({ startTime: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">End Time</label>
        <input
          type="datetime-local"
          className="filter-input"
          value={filters.endTime}
          onChange={(e) => onFilterChange({ endTime: e.target.value })}
        />
      </div>

      {/* Active Filters Summary */}
      {(filters.types.length > 0 || filters.nodeId !== 'all' || filters.searchTerm) && (
        <div className="filter-summary">
          <div className="filter-summary-header">Active Filters:</div>
          <div className="filter-summary-items">
            {filters.types.length > 0 && (
              <div className="filter-summary-item">
                {filters.types.length} type{filters.types.length > 1 ? 's' : ''}
              </div>
            )}
            {filters.nodeId !== 'all' && (
              <div className="filter-summary-item">
                Node: {filters.nodeId}
              </div>
            )}
            {filters.searchTerm && (
              <div className="filter-summary-item">
                Search: "{filters.searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogFilters;
