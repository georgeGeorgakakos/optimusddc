import * as React from 'react';
import AgentMetricsWidget from 'features/HomePageWidgets/AgentMetricsWidget';
import './styles.scss';

class MetricsPage extends React.Component {
  render() {
    return (
      <div className="metrics-page">
        <div className="page-header">
          <h1>📊 Agent Performance Visualizations</h1>
          <p className="page-description">
            Real-time metrics and predictive analytics for all agents
          </p>
        </div>

        {/* Agent Metrics Widget */}
        <div className="metrics-content">
          <AgentMetricsWidget />
        </div>
      </div>
    );
  }
}

export default MetricsPage;
