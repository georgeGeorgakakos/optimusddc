// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogFilters.tsx
// FIXED PROPS INTERFACE
// ==============================================================================

import * as React from 'react';
import { LogFiltersState, LogLevel, LogCategory } from '../index';

// ==============================================================================
// PROPS INTERFACE - FIXED
// ==============================================================================

export interface LogFiltersProps {
  filters: LogFiltersState;
  onFilterChange: (newFilters: Partial<LogFiltersState>) => void; // ADDED
  availableNodes: string[];
}

// ==============================================================================
// COMPONENT
// ==============================================================================

const LogFilters: React.FC<LogFiltersProps> = ({
  filters,
  onFilterChange,
  availableNodes,
}) => {
  const logLevels: (LogLevel | 'ALL')[] = [
    'ALL',
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
    'FATAL',
  ];
  const logCategories: (LogCategory | 'ALL')[] = [
    'ALL',
    'Query',
    'Peer',
    'Election',
    'Database',
    'Network',
    'OrbitDB',
    'System',
    'API',
    'Other',
  ];

  return (
    <div className="log-filters">
      <h3>🔍 Filters</h3>

      <div className="filters-grid">
        {/* Log Level Filter */}
        <div className="filter-group">
          <label>Log Level</label>
          <select
            value={filters.level}
            onChange={(e) =>
              onFilterChange({ level: e.target.value as LogLevel | 'ALL' })
            }
          >
            {logLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) =>
              onFilterChange({
                category: e.target.value as LogCategory | 'ALL',
              })
            }
          >
            {logCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Node Filter */}
        <div className="filter-group">
          <label>Node</label>
          <select
            value={filters.nodeId}
            onChange={(e) => onFilterChange({ nodeId: e.target.value })}
          >
            <option value="all">All Nodes</option>
            {availableNodes.map((nodeId) => (
              <option key={nodeId} value={nodeId}>
                {nodeId}
              </option>
            ))}
          </select>
        </div>

        {/* Start Time Filter */}
        <div className="filter-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={filters.startTime}
            onChange={(e) => onFilterChange({ startTime: e.target.value })}
          />
        </div>

        {/* End Time Filter */}
        <div className="filter-group">
          <label>End Time</label>
          <input
            type="datetime-local"
            value={filters.endTime}
            onChange={(e) => onFilterChange({ endTime: e.target.value })}
          />
        </div>

        {/* Search Filter */}
        <div className="filter-group filter-search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="filter-actions">
        <button
          className="btn-clear-filters"
          onClick={() =>
            onFilterChange({
              level: 'ALL',
              category: 'ALL',
              nodeId: 'all',
              startTime: '',
              endTime: '',
              searchTerm: '',
            })
          }
        >
          🗑️ Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default LogFilters;
