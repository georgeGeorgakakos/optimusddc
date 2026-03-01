// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as DocumentTitle from 'react-document-title';
import { RouteComponentProps } from 'react-router';
import { Search as UrlSearch } from 'history';

import PaginatedApiResourceList from 'components/ResourceList/PaginatedApiResourceList';
import ResourceListHeader from 'components/ResourceList/ResourceListHeader';
import ShimmeringResourceLoader from 'components/ShimmeringResourceLoader';

import { GlobalState } from 'ducks/rootReducer';
import { submitSearchResource, urlDidUpdate } from 'ducks/search/reducer';
import {
  DashboardSearchResults,
  FeatureSearchResults,
  SearchResults,
  SubmitSearchResourceRequest,
  TableSearchResults,
  UrlDidUpdateRequest,
  UserSearchResults,
} from 'ducks/search/types';

import { Resource, ResourceType, SearchType } from 'interfaces';
import { getSearchResultsPerPage } from 'config/config-utils';
import SearchPanel from './SearchPanel';
import SearchFilter from './SearchFilter';
import ResourceSelector from './ResourceSelector';

import {
  DOCUMENT_TITLE_SUFFIX,
  PAGE_INDEX_ERROR_MESSAGE,
  SEARCH_ERROR_MESSAGE_PREFIX,
  SEARCH_ERROR_MESSAGE_SUFFIX,
  SEARCH_SOURCE_NAME,
  DASHBOARD_RESOURCE_TITLE,
  FEATURE_RESOURCE_TITLE,
  TABLE_RESOURCE_TITLE,
  USER_RESOURCE_TITLE,
  SEARCHPAGE_TITLE,
} from './constants';

import './styles.scss';

export interface StateFromProps {
  hasFilters: boolean;
  searchTerm: string;
  resource: ResourceType;
  isLoading: boolean;
  tables: TableSearchResults;
  dashboards: DashboardSearchResults;
  features: FeatureSearchResults;
  users: UserSearchResults;
  didSearch: boolean;
}

export interface DispatchFromProps {
  setPageIndex: (pageIndex: number) => SubmitSearchResourceRequest;
  urlDidUpdate: (urlSearch: UrlSearch) => UrlDidUpdateRequest;
}

export type SearchPageProps = StateFromProps &
  DispatchFromProps &
  RouteComponentProps<any>;

export class SearchPage extends React.Component<SearchPageProps> {
  public static defaultProps: Partial<SearchPageProps> = {};

  componentDidMount() {
    const { location, urlDidUpdate: updateUrl } = this.props;

    updateUrl(location.search);
  }

  componentDidUpdate(prevProps: SearchPageProps) {
    const { location, urlDidUpdate: updateUrl } = this.props;

    if (location.search !== prevProps.location.search) {
      updateUrl(location.search);
    }
  }

  renderSearchResults = () => {
    const { resource, tables, users, dashboards, features } = this.props;

    switch (resource) {
      case ResourceType.table:
        return this.getTabContent(tables, ResourceType.table);
      case ResourceType.user:
        return this.getTabContent(users, ResourceType.user);
      case ResourceType.dashboard:
        return this.getTabContent(dashboards, ResourceType.dashboard);
      case ResourceType.feature:
        return this.getTabContent(features, ResourceType.feature);
      default:
        return null;
    }
  };

  generateTabLabel = (tab: ResourceType): string => {
    switch (tab) {
      case ResourceType.dashboard:
        return DASHBOARD_RESOURCE_TITLE;
      case ResourceType.feature:
        return FEATURE_RESOURCE_TITLE;
      case ResourceType.table:
        return TABLE_RESOURCE_TITLE;
      case ResourceType.user:
        return USER_RESOURCE_TITLE;
      default:
        return '';
    }
  };

  getTabContent = (results: SearchResults<Resource>, tab: ResourceType) => {
    const { hasFilters, searchTerm, setPageIndex, didSearch } = this.props;
    const { page_index, total_results } = results;
    const startIndex = getSearchResultsPerPage() * page_index + 1;
    const tabLabel = this.generateTabLabel(tab);

    const hasNoSearchInputOrAction =
      searchTerm.length === 0 &&
      (!hasFilters || !didSearch) &&
      total_results === 0;

    if (hasNoSearchInputOrAction) {
      return (
        <div className="search-list-container">
          <div className="search-empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="#cacad9"
                  strokeWidth="2.5"
                />
                <path
                  d="M30 30L42 42"
                  stroke="#cacad9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="6"
                  stroke="#dcdcff"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
            <p className="empty-state-title">
              Search the Distributed Data Catalog
            </p>
            <p className="empty-state-subtitle">
              Enter a search term or use the filters to discover datasets across
              SQLite, OrbitDB, IPFS, and AI-enriched metadata.
            </p>
            <div className="search-suggestions">
              <span className="suggestions-label">Try:</span>
              {[
                'tosca',
                'orbitdb',
                'ipfs',
                'election',
                'credentials',
                'reputation',
                'metadata',
                'badges',
              ].map((term) => (
                <span key={term} className="suggestion-chip">
                  {term}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const hasNoResults =
      total_results === 0 && (searchTerm.length > 0 || hasFilters);

    if (hasNoResults) {
      return (
        <div className="search-list-container">
          <div className="search-empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="#cacad9"
                  strokeWidth="2.5"
                />
                <path
                  d="M30 30L42 42"
                  stroke="#cacad9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14 20H26"
                  stroke="#ff7689"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="empty-state-title">
              {SEARCH_ERROR_MESSAGE_PREFIX}
              <em>{tabLabel.toLowerCase()}</em>
              {SEARCH_ERROR_MESSAGE_SUFFIX}
            </p>
            <p className="empty-state-subtitle">
              Try adjusting your search or filters to find what you're looking
              for.
            </p>
          </div>
        </div>
      );
    }

    const hasIndexOutOfBounds = page_index < 0 || startIndex > total_results;

    if (hasIndexOutOfBounds) {
      return (
        <div className="search-list-container">
          <div className="search-empty-state">
            <p className="empty-state-title">{PAGE_INDEX_ERROR_MESSAGE}</p>
          </div>
        </div>
      );
    }

    const uniqueResourceTypes = [
      ...new Set(results.results.map(({ type }) => type)),
    ];

    return (
      <div className="search-list-container">
        <div className="search-results-header">
          <span className="results-count">
            <strong>{total_results}</strong> datasets found
          </span>
          <span className="results-page-info">
            Page {page_index + 1} of{' '}
            {Math.ceil(total_results / getSearchResultsPerPage())}
          </span>
        </div>
        <ResourceListHeader resourceTypes={uniqueResourceTypes} />
        <PaginatedApiResourceList
          activePage={page_index}
          onPagination={setPageIndex}
          itemsPerPage={getSearchResultsPerPage()}
          slicedItems={results.results}
          source={SEARCH_SOURCE_NAME}
          totalItemsCount={total_results}
        />
      </div>
    );
  };

  renderContent = () => {
    const { isLoading } = this.props;

    if (isLoading) {
      return (
        <div className="search-loading-container">
          <ShimmeringResourceLoader numItems={getSearchResultsPerPage()} />
        </div>
      );
    }

    return this.renderSearchResults();
  };

  render() {
    const { searchTerm } = this.props;
    const innerContent = (
      <div className="search-page">
        <SearchPanel>
          <ResourceSelector />
          <SearchFilter />
        </SearchPanel>
        <main className="search-results">
          <h1 className="sr-only">{SEARCHPAGE_TITLE}</h1>
          {this.renderContent()}
        </main>
      </div>
    );

    if (searchTerm.length > 0) {
      return (
        <DocumentTitle title={`${searchTerm}${DOCUMENT_TITLE_SUFFIX}`}>
          {innerContent}
        </DocumentTitle>
      );
    }

    return innerContent;
  }
}

export const mapStateToProps = (state: GlobalState) => {
  const resourceFilters = state.search.filters[state.search.resource];

  return {
    hasFilters: resourceFilters && Object.keys(resourceFilters).length > 0,
    searchTerm: state.search.search_term,
    resource: state.search.resource,
    isLoading: state.search.isLoading,
    tables: state.search.tables,
    users: state.search.users,
    dashboards: state.search.dashboards,
    features: state.search.features,
    didSearch: state.search.didSearch,
  };
};

export const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      urlDidUpdate,
      setPageIndex: (pageIndex: number) =>
        submitSearchResource({
          pageIndex,
          searchType: SearchType.PAGINATION,
          updateUrl: true,
        }),
    },
    dispatch
  );

export default connect<StateFromProps, DispatchFromProps>(
  mapStateToProps,
  mapDispatchToProps
)(SearchPage);
