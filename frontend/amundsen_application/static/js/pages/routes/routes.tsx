// ==============================================================================
// FILE: amundsen_application/static/js/pages/routes/index.tsx
// ==============================================================================
// Central route configuration for Amundsen with OptimusDB support
// ==============================================================================

import React from 'react';
import { Switch, Route } from 'react-router-dom';

// Import all page components
import HomePage from '../HomePage';
import SearchPage from '../SearchPage';
import BrowsePage from '../BrowsePage';
import TableDetailPage from '../TableDetailPage';
import DashboardPage from '../DashboardPage';
import FeaturePage from '../FeaturePage';
import LineagePage from '../LineagePage';
import ProfilePage from '../ProfilePage';
import NotFoundPage from '../NotFoundPage';
import AnnouncementPage from '../AnnouncementPage';
import ClusterTopologyPage from '../ClusterTopologyPage';
import QueryWorkbenchPage from '../QueryWorkbenchPage';
import LogAnalyticsPage from '../LogAnalyticsPage';
import PersistedDataPage from '../PersistedDataPage';
import PostmanPage from '../PostmanPage';
/**
 * Central route configuration for Amundsen with OptimusDB support.
 *
 * Route Structure:
 * - Core Pages: Home, Search, Browse
 * - Detail Pages: Table, Dashboard, Feature
 * - Utility Pages: Lineage, Profile, Announcements
 * - OptimusDB Pages: Cluster Topology, Query Workbench
 */
const AppRoutes: React.FC = () => (
  <Switch>
    {/* ====================================================================
        CORE PAGES - Main application entry points
        ==================================================================== */}

    {/* Home page - main landing page */}
    <Route exact path="/" component={HomePage} />

    {/* Search page - global search across all resources */}
    <Route exact path="/search" component={SearchPage} />

    {/* Browse page - catalog browsing with filters */}
    <Route exact path="/browse" component={BrowsePage} />

    {/* ====================================================================
        DETAIL PAGES - Resource-specific information
        ==================================================================== */}

    {/* Table detail page - CRITICAL for viewing datasets */}
    <Route
      exact
      path="/table_detail/:cluster/:database/:schema/:table"
      component={TableDetailPage}
    />

    {/* Dashboard detail page - BI dashboard metadata */}
    <Route exact path="/dashboard/:group/:name" component={DashboardPage} />

    {/* Feature detail page - ML feature definitions */}
    <Route
      exact
      path="/feature/:feature_group/:feature_name/:version"
      component={FeaturePage}
    />

    {/* ====================================================================
        UTILITY PAGES - Supporting functionality
        ==================================================================== */}

    {/* Lineage page - upstream/downstream dependencies */}
    <Route
      exact
      path="/lineage/table/:cluster/:database/:schema/:table/:direction"
      component={LineagePage}
    />

    {/* User profile page - user information and activity */}
    <Route exact path="/user/:userId" component={ProfilePage} />

    {/* Announcements page - system-wide announcements */}
    <Route exact path="/announcements" component={AnnouncementPage} />

    {/* ====================================================================
        OPTIMUSDB PAGES - Distributed database management
        ==================================================================== */}

    {/* Cluster topology page - network visualization and health monitoring */}
    <Route exact path="/cluster/topology" component={ClusterTopologyPage} />

    {/* Query Workbench page - SQL query interface with distributed execution */}
    <Route exact path="/queryworkbench" component={QueryWorkbenchPage} />

    {/* Alternative route alias for consistency */}
    <Route exact path="/query-workbench" component={QueryWorkbenchPage} />
    <Route exact path="/logs" component={LogAnalyticsPage} />
    <Route exact path="/persisted-data" component={PersistedDataPage} />
    <Route exact path="/api-testing" component={PostmanPage} />
    {/* ====================================================================
        ERROR HANDLING - 404 and fallback routes
        ==================================================================== */}

    {/* 404 page - explicit not found */}
    <Route exact path="/404" component={NotFoundPage} />

    {/* Fallback: redirect unknown routes to 404 */}
    <Route component={NotFoundPage} />
  </Switch>
);

export default AppRoutes;
