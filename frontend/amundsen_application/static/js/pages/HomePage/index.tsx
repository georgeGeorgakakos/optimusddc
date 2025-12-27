// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { resetSearchState } from 'ducks/search/reducer';
import { UpdateSearchStateReset } from 'ducks/search/types';
import Announcements from 'features/AnnouncementsWidget';
import { announcementsEnabled, getHomePageWidgets } from 'config/config-utils';
import { HomePageWidgetsConfig } from 'config/config-types';
import { HOMEPAGE_TITLE } from './constants';
import DataCatalogAssistant from 'components/DataCatalogAssistant';
import './styles.scss';

export interface DispatchFromProps {
  searchReset: () => UpdateSearchStateReset;
}

export type HomePageProps = DispatchFromProps & RouteComponentProps<any>;

const getHomePageWidgetComponents = (
  layout: HomePageWidgetsConfig
): React.ReactNode[] =>
  layout.widgets.map((widget, index) => {
    const WidgetComponent = React.lazy(
      () =>
        import('/js/features/HomePageWidgets/' + widget.options.path + '.tsx')
    );

    const additionalProps = widget.options.additionalProps
      ? widget.options.additionalProps
      : null;

    return (
      <div key={index} className="home-widget-item">
        <React.Suspense fallback={<div>Loading...</div>}>
          <WidgetComponent {...additionalProps} />
        </React.Suspense>
      </div>
    );
  });

export const HomePageWidgets = (props) => {
  const { homePageLayout } = props;

  return (
    <div className="home-widgets-container">
      {getHomePageWidgetComponents(homePageLayout)}
    </div>
  );
};

export class HomePage extends React.Component<HomePageProps> {
  componentDidMount() {
    this.props.searchReset();
  }

  render() {
    return (
      <main className="container home-page">
        <div className="row">
          <div className="col-xs-12">
            <h1 className="sr-only">{HOMEPAGE_TITLE}</h1>

            <div className="home-content-grid">
              <div className="widgets-section">
                <HomePageWidgets homePageLayout={getHomePageWidgets()} />
              </div>

              {announcementsEnabled() && (
                <div className="announcements-section">
                  <Announcements />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }
}

export const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      searchReset: () => resetSearchState(),
    },
    dispatch
  );

export default connect<DispatchFromProps>(null, mapDispatchToProps)(HomePage);
