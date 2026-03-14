/* eslint-disable @typescript-eslint/no-unused-vars */
import { FilterType, ResourceType, SortDirection } from '../interfaces';
import { AppConfig } from './config-types';

// @ts-ignore
const configDefault: AppConfig = {
  analytics: {
    plugins: [],
  },
  announcements: {
    enabled: false,
  },
  badges: {},
  browse: {
    curatedTags: [],
    hideNonClickableBadges: false,
    showAllTags: true,
    showBadgesInHome: true,
  },
  columnLineage: {
    inAppListEnabled: true,
    inAppPageEnabled: true,
    urlGenerator: (
      database: string,
      cluster: string,
      schema: string,
      table: string,
      column: string
    ) =>
      `https://DEFAULT_LINEAGE_URL?schema=${schema}&cluster=${cluster}&db=${database}&table=${table}&column=${column}`,
  },
  date: {
    dateTimeLong: 'MMMM Do YYYY [at] h:mm:ss a',
    dateTimeShort: 'MMM DD, YYYY ha z',
    default: 'MMM DD, YYYY',
  },
  documentTitle: 'DDC - Data Discovery Portal',
  editableText: {
    columnDescLength: 250,
    tableDescLength: 750,
  },
  featureLineage: {
    inAppListEnabled: true,
  },
  homePageWidgets: {
    widgets: [
      {
        name: 'PersistedDataWidget',
        options: {
          path: 'PersistedDataWidget/index',
        },
      },
      {
        name: 'ClusterHealthWidget',
        options: {
          path: 'ClusterHealthWidget/index',
        },
      },
      {
        name: 'SwarmchestrateWidget',
        options: {
          path: 'SwarmchestrateWidget/index',
        },
      },
      /*{
        name: 'SearchBarWidget',
        options: {
          path: 'SearchBarWidget/index',
        },
      },
      {
        name: 'MyBookmarksWidget',
        options: {
          path: 'MyBookmarksWidget/index',
        },
      },
      {
        name: 'PopularResourcesWidget',
        options: {
          path: 'PopularResourcesWidget/index',
        },
      },
      {
        name: 'BadgesWidget',
        options: {
          additionalProps: {
            shortBadgesList: true,
          },
          path: 'BadgesWidget/index',
        },
      },
      {
        name: 'TagsWidget',
        options: {
          additionalProps: {
            shortTagsList: true,
          },
          path: 'TagsWidget/index',
        },
      },*/
    ],
  },
  indexDashboards: {
    enabled: false,
  },
  indexFeatures: {
    enabled: false,
  },
  indexUsers: {
    enabled: false,
  },
  issueTracking: {
    enabled: false,
    issueDescriptionTemplate: '',
    projectSelection: {
      enabled: false,
      inputHint: '',
      title: 'Issue project key (optional)',
    },
  },
  logoPath: null,
  logoTitle: 'OptimusDDC',
  mailClientFeatures: {
    feedbackEnabled: true,
    notificationsEnabled: true,
  },
  navAppSuite: null,
  // navLinks is kept for backwards-compat with tests and any code still using getNavLinks().
  // The new grouped nav uses navItems + getNavItems().
  navLinks: [
    { href: '/', id: 'nav::home', label: '', use_router: true, iconOnly: true, icon: 'home' },
    { href: '/search', id: 'nav::search', label: 'Semantic Search', use_router: true, icon: 'search' },
    { href: '/announcements', id: 'nav::announcements', label: 'Announcements', use_router: true, icon: 'announcements' },
    { href: '/cluster/topology', id: 'nav::cluster-topology', label: 'Agents Topology', use_router: true, icon: 'topology' },
    { href: '/queryworkbench', id: 'nav::queryworkbench', label: 'Query Workbench', use_router: true, icon: 'query' },
    { href: '/etl-workbench', id: 'nav::etl-workbench', label: 'Flow Workbench', use_router: true, icon: 'flow' },
    { href: '/metrics', id: 'nav::metrics', label: 'Agents Performance', use_router: true, icon: 'performance' },
    { href: '/analytics', id: 'nav::analytics-dashboard', label: 'Log Analytics', use_router: true, icon: 'analytics_dashboard' },
    { href: '/api-testing', id: 'nav::api-testing', label: 'API Testing', use_router: true, icon: 'api' },
    { href: '/wiki', id: 'nav::wiki', label: 'Wiki', use_router: true, icon: 'wiki' },
  ],
  // ── Grouped nav items (used by the new dropdown NavBar) ──────────────────
  navItems: [
    { id: 'nav::home', label: '', icon: 'home', href: '/', use_router: true, iconOnly: true },
    { id: 'nav::search', label: 'Semantic Search', icon: 'search', href: '/search', use_router: true },
    {
      id: 'nav-group::operations',
      label: 'Operations',
      icon: 'query',
      groupId: 'operations',
      children: [
        { id: 'nav::queryworkbench', label: 'Query Workbench', subtitle: 'Execute SQL across agents', icon: 'query', href: '/queryworkbench', use_router: true },
        { id: 'nav::etl-workbench', label: 'Flow Workbench', subtitle: 'Design ETL pipelines visually', icon: 'flow', href: '/etl-workbench', use_router: true },
        { id: 'nav::api-testing', label: 'API Testing', subtitle: 'Test OptimusDB REST endpoints', icon: 'api', href: '/api-testing', use_router: true },
      ],
    },
    {
      id: 'nav-group::insights',
      label: 'Insights',
      icon: 'topology',
      groupId: 'insights',
      children: [
        { id: 'nav::cluster-topology', label: 'Agents Topology', subtitle: 'Visualise swarm connections', icon: 'topology', href: '/cluster/topology', use_router: true },
        { id: 'nav::metrics', label: 'Agents Performance', subtitle: 'Monitor swarm-level metrics', icon: 'performance', href: '/metrics', use_router: true },
        { id: 'nav::analytics-dashboard', label: 'Log Analytics', subtitle: 'Search & analyse agent logs', icon: 'analytics_dashboard', href: '/analytics', use_router: true },
      ],
    },
    { id: 'nav::wiki', label: 'Wiki', icon: 'wiki', href: '/wiki', use_router: true },
    {
      id: 'nav-group::about',
      label: 'About',
      icon: 'info',
      groupId: 'about',
      children: [
        { id: 'nav::about-author', label: 'The Author', subtitle: 'PhD · AUEB · iKnowHow BD', icon: 'user', href: '/about/author', use_router: true },
        { id: 'nav::about-swarmchestrate', label: 'Swarmchestrate', subtitle: 'EU Horizon · Grant #101135012', icon: 'globe', href: '/about/swarmchestrate', use_router: true },
        { id: 'nav::about-iccs', label: 'ICCS', subtitle: 'NTUA · Athens, Greece', icon: 'building', href: '/about/iccs', use_router: true },
        { id: 'nav::about-optimus', label: 'Optimus Stack', subtitle: 'OptimusDB · OptimusDDC', icon: 'layers', href: '/about/optimus', use_router: true },
      ],
    },
  ],
  navTheme: 'dark',
  nestedColumns: {
    maxNestedColumns: 500,
  },
  numberFormat: null,
  ownersSection: {
    categories: [],
  },
  productTour: {},
  resourceConfig: {
    [ResourceType.dashboard]: {
      displayName: 'Dashboards',
      filterCategories: [
        {
          categoryId: 'product',
          displayName: 'Product',
          helpText:
            'Enter one or more comma separated values with exact product names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'group_name',
          displayName: 'Group',
          helpText:
            'Enter one or more comma separated values with exact group names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'name',
          displayName: 'Name',
          helpText:
            'Enter one or more comma separated values with exact dashboard names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'tag',
          displayName: 'Tag',
          helpText:
            'Enter one or more comma separated values with exact tag names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
      ],
      notices: {},
      searchHighlight: {
        enableHighlight: true,
      },
      supportedSources: {
        databricks_sql: {
          displayName: 'Databricks SQL',
          iconClass: 'icon-databricks-sql',
        },
        mode: {
          displayName: 'Mode',
          iconClass: 'icon-mode',
        },
        redash: {
          displayName: 'Redash',
          iconClass: 'icon-redash',
        },
        superset: {
          displayName: 'Superset',
          iconClass: 'icon-superset',
        },
        tableau: {
          displayName: 'Tableau',
          iconClass: 'icon-tableau',
        },
        powerbi: {
          displayName: 'PowerBi',
          iconClass: 'icon-powerbi',
        },
      },
    },
    [ResourceType.feature]: {
      displayName: 'ML Features',
      supportedSources: {
        bigquery: {
          displayName: 'BigQuery',
          iconClass: 'icon-bigquery',
        },
        delta: {
          displayName: 'Delta',
          iconClass: 'icon-delta',
        },
        dremio: {
          displayName: 'Dremio',
          iconClass: 'icon-dremio',
        },
        druid: {
          displayName: 'Druid',
          iconClass: 'icon-druid',
        },
        hive: {
          displayName: 'Hive',
          iconClass: 'icon-hive',
        },
        oracle: {
          displayName: 'Oracle',
          iconClass: 'icon-oracle',
        },
        postgres: {
          displayName: 'Postgres',
          iconClass: 'icon-postgres',
        },
        presto: {
          displayName: 'Presto',
          iconClass: 'icon-presto',
        },
        redshift: {
          displayName: 'Redshift',
          iconClass: 'icon-redshift',
        },
        snowflake: {
          displayName: 'Snowflake',
          iconClass: 'icon-snowflake',
        },
        trino: {
          displayName: 'Trino',
          iconClass: 'icon-trino',
        },
      },
    },
    [ResourceType.table]: {
      displayName: 'Datasets',
      filterCategories: [
        {
          categoryId: 'database',
          displayName: 'Source',
          helpText:
            'Enter one or more comma separated values with exact database names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'column',
          displayName: 'Column',
          helpText:
            'Enter one or more comma separated values with exact column names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'schema',
          displayName: 'Schema',
          helpText:
            'Enter one or more comma separated values with exact schema names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'table',
          displayName: 'Table',
          helpText:
            'Enter one or more comma separated values with exact table names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'tag',
          displayName: 'Tag',
          helpText:
            'Enter one or more comma separated values with exact tag names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
      ],
      notices: {},
      searchHighlight: {
        enableHighlight: true,
      },
      sortCriterias: {
        name: {
          direction: SortDirection.descending,
          key: 'name',
          name: 'Alphabetical',
        },
        sort_order: {
          direction: SortDirection.ascending,
          key: 'sort_order',
          name: 'Table Default',
        },
      },
      stats: {
        iconNotRequiredTypes: [],
      },
      supportedDescriptionSources: {
        dremio: {
          displayName: 'Dremio',
          iconPath: '/static/images/icons/logo-dremio.svg',
        },
        github: {
          displayName: 'Github',
          iconPath: '/static/images/github.png',
        },
      },
      supportedSources: {
        bigquery: {
          displayName: 'BigQuery',
          iconClass: 'icon-bigquery',
        },
        delta: {
          displayName: 'Delta',
          iconClass: 'icon-delta',
        },
        dremio: {
          displayName: 'Dremio',
          iconClass: 'icon-dremio',
        },
        druid: {
          displayName: 'Druid',
          iconClass: 'icon-druid',
        },
        elasticsearch: {
          displayName: 'Elasticsearch',
          iconClass: 'icon-elasticsearch',
        },
        hive: {
          displayName: 'Hive',
          iconClass: 'icon-hive',
        },
        postgres: {
          displayName: 'Postgres',
          iconClass: 'icon-postgres',
        },
        presto: {
          displayName: 'Presto',
          iconClass: 'icon-presto',
        },
        redshift: {
          displayName: 'Redshift',
          iconClass: 'icon-redshift',
        },
        snowflake: {
          displayName: 'Snowflake',
          iconClass: 'icon-snowflake',
        },
        teradata: {
          displayName: 'Teradata',
          iconClass: 'icon-teradata',
        },
        trino: {
          displayName: 'Trino',
          iconClass: 'icon-trino',
        },
      },
    },
    [ResourceType.feature]: {
      displayName: 'ML Features',
      filterCategories: [
        {
          categoryId: 'entity',
          displayName: 'Entity',
          helpText:
            'Enter one or more comma separated values with exact entity names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'name',
          displayName: 'Feature Name',
          helpText:
            'Enter one or more comma separated values with exact feature names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'group',
          displayName: 'Feature Group',
          helpText:
            'Enter one or more comma separated values with exact feature group names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
        {
          categoryId: 'tag',
          displayName: 'Tag',
          helpText:
            'Enter one or more comma separated values with exact tag names or regex wildcard patterns',
          type: FilterType.INPUT_SELECT,
        },
      ],
      notices: {},
      searchHighlight: {
        enableHighlight: true,
      },
      supportedSources: {
        hive: {
          displayName: 'Hive',
          iconClass: 'icon-hive',
        },
      },
    },
    [ResourceType.user]: {
      displayName: 'People',
      searchHighlight: {
        enableHighlight: false,
      },
    },
  },
  searchPagination: {
    resultsPerPage: 10,
  },
  tableLineage: {
    defaultLineageDepth: 5,
    externalEnabled: false,
    iconPath: 'PATH_TO_ICON',
    inAppListEnabled: true,
    inAppPageEnabled: true,
    isBeta: false,
    urlGenerator: (
      database: string,
      cluster: string,
      schema: string,
      table: string
    ) =>
      `https://DEFAULT_LINEAGE_URL?schema=${schema}&cluster=${cluster}&db=${database}&table=${table}`,
  },
  tableProfile: {
    exploreUrlGenerator: (
      database: string,
      cluster: string,
      schema: string,
      table: string,
      partitionKey?: string,
      partitionValue?: string
    ) =>
      `https://DEFAULT_EXPLORE_URL?schema=${schema}&cluster=${cluster}&db=${database}&table=${table}`,
    isBeta: false,
    isExploreEnabled: false,
  },
  tableQualityChecks: {
    isEnabled: false,
  },
  userIdLabel: 'email address',
};

export default configDefault;