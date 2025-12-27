// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import 'core-js/stable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReduxPromise from 'redux-promise';
import 'config/apiConfig';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, Route, Switch } from 'react-router-dom';
import DocumentTitle from 'react-document-title';
import { getDocumentTitle } from 'config/config-utils';
import { analyticsMiddleware } from 'ducks/middlewares';
import { logAction } from 'utils/analytics';
import { BrowserHistory } from 'utils/navigation';
import { pageViewed } from 'ducks/ui';
import rootReducer from 'ducks/rootReducer';
import rootSaga from 'ducks/rootSaga';
import PostmanInterface from 'components/PostmanInterface';
import AnnouncementPage from './pages/AnnouncementPage';
import BrowsePage from './pages/BrowsePage';
import DashboardPage from './pages/DashboardPage';
import FeaturePage from './pages/FeaturePage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import TableDetail from './pages/TableDetailPage';
import LineagePage from './pages/LineagePage';
import ClusterTopologyPage from './pages/ClusterTopologyPage';
import QueryWorkbenchPage from './pages/QueryWorkbenchPage';
import LogAnalyticsPage from './pages/LogAnalyticsPage';
import Preloader from './components/Preloader';
import Footer from './features/Footer';
import NavBar from './features/NavBar';
import metricsPage from './pages/MetricsPage';
import DataCatalogAssistant from './components/DataCatalogAssistant';
import WikiPage from './pages/WikiPage';

const sagaMiddleware = createSagaMiddleware();
const createStoreWithMiddleware = applyMiddleware(
  ReduxPromise,
  analyticsMiddleware,
  sagaMiddleware
)(createStore);
const store = createStoreWithMiddleware(rootReducer);

sagaMiddleware.run(rootSaga);

const Routes: React.FC = () => {
  const history = BrowserHistory;

  function trackPageView() {
    logAction({
      command: 'analytics/pageView',
      target_id: 'browser',
      label: window.location.search || '',
    });
    store.dispatch(pageViewed(window.location.pathname));
  }

  React.useEffect(() => {
    trackPageView(); // To track the first pageview upon load
    history.listen(trackPageView); // To track the subsequent pageviews
  }, [history]);

  return (
    <>
      <Route component={NavBar} />
      <Switch>
        <Route path="/announcements" component={AnnouncementPage} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/cluster/topology" component={ClusterTopologyPage} />
        <Route path="/queryworkbench" component={QueryWorkbenchPage} />
        <Route path="/logs" component={LogAnalyticsPage} />
        <Route path="/dashboard/:uri" component={DashboardPage} />
        <Route path="/feature/:group/:name/:version" component={FeaturePage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/metrics" component={metricsPage} />
        <Route path="/api-testing" component={PostmanInterface} />
        <Route path="/wiki" component={WikiPage} />
        <Route
          path="/table_detail/:cluster/:database/:schema/:table"
          component={TableDetail}
        />
        <Route
          path="/lineage/:resource/:cluster/:database/:schema/:table"
          component={LineagePage}
        />
        <Route path="/user/:userId" component={ProfilePage} />
        <Route path="/404" component={NotFoundPage} />
        <Route path="/" component={HomePage} />
      </Switch>
    </>
  );
};

ReactDOM.render(
  <DocumentTitle title={getDocumentTitle()}>
    <Provider store={store}>
      <Router history={BrowserHistory}>
        <div id="main">
          <Preloader />
          <Routes />
          <DataCatalogAssistant />
          <Footer />
        </div>
      </Router>
    </Provider>
  </DocumentTitle>,
  document.getElementById('content') || document.createElement('div')
);
