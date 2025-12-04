// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import DocumentTitle from 'react-document-title';

import OptimusDDCDashboard from 'features/OptimusDDCDashboard';

import './styles.scss';

export const OPTIMUSDDC_DASHBOARD_TITLE = 'OptimusDDC Dashboard';

/**
 * OptimusDDC Dashboard Page
 *
 * This page displays the OptimusDDC decentralized data catalog dashboard
 * with real-time metrics, health status, and quick access to key features.
 */
const OptimusDDCDashboardPage: React.FC = () => {
  return (
    <DocumentTitle title={`${OPTIMUSDDC_DASHBOARD_TITLE} - Amundsen`}>
      <main className="container-fluid optimusddc-dashboard-page">
        <div className="row">
          <div className="col-xs-12">
            <OptimusDDCDashboard />
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default OptimusDDCDashboardPage;
