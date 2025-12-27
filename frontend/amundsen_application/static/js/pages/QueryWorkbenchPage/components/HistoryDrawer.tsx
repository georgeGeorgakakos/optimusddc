// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/HistoryDrawer.tsx
// ==============================================================================

import * as React from 'react';
import { useState } from 'react';
import { QueryHistoryItem } from '../index';

interface HistoryDrawerProps {
  history: QueryHistoryItem[];
  onClose: () => void;
  onSelect: (item: QueryHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onClose,
  onSelect,
  onToggleFavorite,
}) => {
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history
    .filter((item) => {
      if (filter === 'favorites' && !item.favorite) return false;
      if (
        searchTerm &&
        !item.query.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        // Sort by timestamp, newest first
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="history-overlay" onClick={onClose} />
      <div className="history-drawer">
        <div className="history-header">
          <h3>📋 Query History</h3>
          <button
            className="close-btn"
            onClick={onClose}
            title="Close (Ctrl+H)"
          >
            ✕
          </button>
        </div>

        <div className="history-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({history.length})
            </button>
            <button
              className={`filter-tab ${filter === 'favorites' ? 'active' : ''}`}
              onClick={() => setFilter('favorites')}
            >
              ⭐ Favorites ({history.filter((h) => h.favorite).length})
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="history-content">
          {filteredHistory.length === 0 ? (
            <div className="history-empty">
              <p>
                {filter === 'favorites'
                  ? '⭐ No favorite queries yet'
                  : searchTerm
                  ? '🔍 No matching queries found'
                  : '📝 No query history yet'}
              </p>
            </div>
          ) : (
            <div className="history-list">
              {filteredHistory.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-item-header">
                    <button
                      className="favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      title={
                        item.favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      {item.favorite ? '⭐' : '☆'}
                    </button>

                    <span className={`mode-badge mode-${item.queryMode}`}>
                      {item.queryMode === 'sql' ? '💾 SQL' : '📦 CRUD'}
                    </span>

                    <span className="history-timestamp">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>

                  <div
                    className="history-item-query"
                    onClick={() => onSelect(item)}
                    title="Click to load this query"
                  >
                    <code>
                      {item.query.length > 100
                        ? item.query.substring(0, 100) + '...'
                        : item.query}
                    </code>
                  </div>

                  <div className="history-item-footer">
                    <span className="history-stat">
                      ⏱️ {item.executionTimeMs}ms
                    </span>
                    <span className="history-stat">
                      📊 {item.rowCount} rows
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;
