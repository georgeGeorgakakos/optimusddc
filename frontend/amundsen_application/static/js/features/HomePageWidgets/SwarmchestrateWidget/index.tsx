// SwarmchestrateWidget - Shows renewable energy dataset statistics
import * as React from 'react';
import './styles.scss';

interface EnergyStats {
  wind: {
    count: number;
    totalCapacity?: string;
    trend: 'up' | 'down' | 'stable';
  };
  solar: {
    count: number;
    totalCapacity?: string;
    trend: 'up' | 'down' | 'stable';
  };
  hydro: {
    count: number;
    totalCapacity?: string;
    trend: 'up' | 'down' | 'stable';
  };
  regions: number;
  lastUpdate: string;
}

const SwarmchestrateWidget: React.FC = () => {
  const [stats, setStats] = React.useState<EnergyStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/metadata/renewable-energy/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
        setError(false);
      })
      .catch((err) => {
        console.error('Failed to fetch energy stats:', err);
        setLoading(false);
        setError(true);
      });
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="re-stats-widget">
        <div className="widget-header">
          <span className="widget-icon">⚡</span>
          <h3>Renewable Energy Data</h3>
        </div>
        <div className="loading-shimmer" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="re-stats-widget">
        <div className="widget-header">
          <span className="widget-icon">⚡</span>
          <h3>Persisted Data</h3>
        </div>
        <div className="error-message">Unable to load Dataset statistics</div>
      </div>
    );
  }

  const totalDatasets =
    stats.wind.count + stats.solar.count + stats.hydro.count;

  return (
    <div className="re-stats-widget">
      <div className="widget-header">
        <span className="widget-icon">⚡</span>
        <h3>Renewable Energy Data</h3>
      </div>

      <div className="widget-content">
        <div className="total-count">
          <div className="total-label">Total Datasets</div>
          <div className="total-value">{totalDatasets}</div>
        </div>

        <div className="energy-type-stats">
          <div className="energy-type wind">
            <div className="type-icon">🌬️</div>
            <div className="type-info">
              <div className="type-label">Wind</div>
              <div className="type-count">
                <strong>{stats.wind.count}</strong>
                <span className="trend">{getTrendIcon(stats.wind.trend)}</span>
              </div>
              {stats.wind.totalCapacity && (
                <div className="type-capacity">{stats.wind.totalCapacity}</div>
              )}
            </div>
          </div>

          <div className="energy-type solar">
            <div className="type-icon">☀️</div>
            <div className="type-info">
              <div className="type-label">Solar</div>
              <div className="type-count">
                <strong>{stats.solar.count}</strong>
                <span className="trend">{getTrendIcon(stats.solar.trend)}</span>
              </div>
              {stats.solar.totalCapacity && (
                <div className="type-capacity">{stats.solar.totalCapacity}</div>
              )}
            </div>
          </div>

          <div className="energy-type hydro">
            <div className="type-icon">💧</div>
            <div className="type-info">
              <div className="type-label">Hydro</div>
              <div className="type-count">
                <strong>{stats.hydro.count}</strong>
                <span className="trend">{getTrendIcon(stats.hydro.trend)}</span>
              </div>
              {stats.hydro.totalCapacity && (
                <div className="type-capacity">{stats.hydro.totalCapacity}</div>
              )}
            </div>
          </div>
        </div>

        <div className="geography-stats">
          <div className="geo-icon">📍</div>
          <div className="geo-label">Geographic Coverage</div>
          <div className="geo-value">
            <strong>{stats.regions}</strong> regions
          </div>
        </div>

        <div className="last-update">Last updated: {stats.lastUpdate}</div>
      </div>

      <div className="widget-footer">
        <a
          href="/browse?resource=table&tag=renewable-energy"
          className="view-all-link"
        >
          View All Datasets →
        </a>
      </div>
    </div>
  );
};

export default SwarmchestrateWidget;
