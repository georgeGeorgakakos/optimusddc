// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogFilters.tsx
// ==============================================================================

import * as React from 'react';
import { LogFilters as LogFiltersType, LogLevel, LogCategory } from '../index';

interface LogFiltersProps {
  filters: LogFiltersType;
  onChange: (filters: LogFiltersType) => void;
  availableNodes: string[];
}

const LogFilters: React.FC<LogFiltersProps> = ({ filters, onChange, availableNodes }) => {
  const [expanded, setExpanded] = React.useState(true);

  const logLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  const categories: LogCategory[] = [
    'QUERY', 'PEER', 'ELECTION', 'DATABASE', 'NETWORK', 'ORBITDB', 'ERROR', 'SYSTEM', 'OTHER'
  ];

  const toggleLevel = (level: LogLevel) => {
    const newLevels = filters.levels.includes(level)
      ? filters.levels.filter(l => l !== level)
      : [...filters.levels, level];
    onChange({ ...filters, levels: newLevels });
  };

  const toggleNode = (nodeId: string) => {
    const newNodes = filters.nodes.includes(nodeId)
      ? filters.nodes.filter(n => n !== nodeId)
      : [...filters.nodes, nodeId];
    onChange({ ...filters, nodes: newNodes });
  };

  const toggleCategory = (category: LogCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories: newCategories });
  };

  const setTimeRange = (range: 'hour' | 'day' | 'week') => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case 'hour':
        start = new Date(Date.now() - 3600000);
        break;
      case 'day':
        start = new Date(Date.now() - 86400000);
        break;
      case 'week':
        start = new Date(Date.now() - 604800000);
        break;
    }

    onChange({ ...filters, timeRange: { start, end } });
  };

  const clearFilters = () => {
    onChange({
      levels: logLevels,
      nodes: [],
      categories: categories,
      timeRange: {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      },
      searchTerm: '',
    });
  };

  const getLevelIcon = (level: LogLevel): string => {
    const icons = {
      DEBUG: '🐛',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      FATAL: '💀',
    };
    return icons[level];
  };

  const getCategoryIcon = (category: LogCategory): string => {
    const icons = {
      QUERY: '🔍',
      PEER: '👥',
      ELECTION: '👑',
      DATABASE: '💾',
      NETWORK: '🌐',
      ORBITDB: '📦',
      ERROR: '🚨',
      SYSTEM: '⚙️',
      OTHER: '📝',
    };
    return icons[category];
  };

  return (
    <div className="log-filters">
      <div className="filters-header">
        <h3>
          🔧 Filters
          <span className="filter-count">
            ({filters.levels.length} levels, {filters.nodes.length || 'all'} nodes, {filters.categories.length} categories)
          </span>
        </h3>
        <div className="filters-actions">
          <button className="btn-link" onClick={clearFilters}>
            Clear All
          </button>
          <button className="btn-link" onClick={() => setExpanded(!expanded)}>
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="filters-content">
          {/* Search */}
          <div className="filter-group">
            <label className="filter-label">🔍 Search</label>
            <input
              type="text"
              className="filter-search"
              placeholder="Search logs..."
              value={filters.searchTerm}
              onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
            />
          </div>

          {/* Time Range */}
          <div className="filter-group">
            <label className="filter-label">📅 Time Range</label>
            <div className="filter-buttons">
              <button
                className="filter-btn"
                onClick={() => setTimeRange('hour')}
              >
                Last Hour
              </button>
              <button
                className="filter-btn"
                onClick={() => setTimeRange('day')}
              >
                Last 24h
              </button>
              <button
                className="filter-btn"
                onClick={() => setTimeRange('week')}
              >
                Last Week
              </button>
            </div>
          </div>

          {/* Log Levels */}
          <div className="filter-group">
            <label className="filter-label">📊 Log Levels</label>
            <div className="filter-chips">
              {logLevels.map(level => (
                <button
                  key={level}
                  className={`filter-chip level-${level.toLowerCase()} ${
                    filters.levels.includes(level) ? 'active' : ''
                  }`}
                  onClick={() => toggleLevel(level)}
                >
                  {getLevelIcon(level)} {level}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="filter-group">
            <label className="filter-label">🏷️ Categories</label>
            <div className="filter-chips">
              {categories.map(category => (
                <button
                  key={category}
                  className={`filter-chip category-chip ${
                    filters.categories.includes(category) ? 'active' : ''
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  {getCategoryIcon(category)} {category}
                </button>
              ))}
            </div>
          </div>

          {/* Nodes */}
          <div className="filter-group">
            <label className="filter-label">
              🖥️ Nodes
              {filters.nodes.length === 0 && <span className="filter-hint"> (showing all)</span>}
            </label>
            <div className="filter-chips">
              {availableNodes.map(nodeId => (
                <button
                  key={nodeId}
                  className={`filter-chip node-chip ${
                    filters.nodes.includes(nodeId) ? 'active' : ''
                  }`}
                  onClick={() => toggleNode(nodeId)}
                >
                  {nodeId}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogFilters;
