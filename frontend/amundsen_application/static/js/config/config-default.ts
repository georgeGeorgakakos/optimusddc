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
    { href: '/sovereignty', id: 'nav::sovereignty', label: 'Data Sovereignty', use_router: true, icon: 'sovereignty' },
    { href: '/consensus', id: 'nav::consensus', label: 'Swarm Consensus', use_router: true, icon: 'consensus' },
    { href: '/knowledge-graph', id: 'nav::knowledge-graph', label: 'Knowledge Graph', use_router: true, icon: 'knowledge_graph' },
    { href: '/query-planner', id: 'nav::query-planner', label: 'Query Planner', use_router: true, icon: 'query_planner' },
    { href: '/data-quality', id: 'nav::data-quality', label: 'Data Quality', use_router: true, icon: 'data_quality' },
    { href: '/activity', id: 'nav::activity', label: 'Activity Timeline', use_router: true, icon: 'activity' },
    { href: '/agent-config', id: 'nav::agent-config', label: 'Agent Config', use_router: true, icon: 'agent_config' },
    { href: '/data-lineage', id: 'nav::data-lineage', label: 'Data Lineage', use_router: true, icon: 'data_lineage' },
    { href: '/benchmark', id: 'nav::benchmark', label: 'Benchmark', use_router: true, icon: 'benchmark' },
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
        { id: 'nav::agent-config', label: 'Agent Config', subtitle: 'Control plane & orchestration', icon: 'agent_config', href: '/agent-config', use_router: true },
        { id: 'nav::benchmark', label: 'Benchmark', subtitle: 'Stress test & load profiling', icon: 'benchmark', href: '/benchmark', use_router: true },
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
        { id: 'nav::data-lineage', label: 'Data Lineage', subtitle: 'Provenance & flow tracking', icon: 'data_lineage', href: '/data-lineage', use_router: true },
      ],
    },
    { id: 'nav::wiki', label: 'Wiki', icon: 'wiki', href: '/wiki', use_router: true },
    {
      id: 'nav-group::governance',
      label: 'Governance',
      icon: 'sovereignty',
      groupId: 'governance',
      children: [
        { id: 'nav::sovereignty', label: 'Data Sovereignty', subtitle: 'RBAC/ABAC policies & geo-fencing', icon: 'sovereignty', href: '/sovereignty', use_router: true },
        { id: 'nav::data-quality', label: 'Data Quality', subtitle: 'Profiling, drift & anomaly detection', icon: 'data_quality', href: '/data-quality', use_router: true },
        { id: 'nav::activity', label: 'Activity Timeline', subtitle: 'Unified swarm event stream', icon: 'activity', href: '/activity', use_router: true },
      ],
    },
    {
      id: 'nav-group::intelligence',
      label: 'Intelligence',
      icon: 'knowledge_graph',
      groupId: 'intelligence',
      children: [
        { id: 'nav::consensus', label: 'Swarm Consensus', subtitle: 'GossipSub mesh & CRDT monitor', icon: 'consensus', href: '/consensus', use_router: true },
        { id: 'nav::knowledge-graph', label: 'Knowledge Graph', subtitle: 'Semantic relationships & embeddings', icon: 'knowledge_graph', href: '/knowledge-graph', use_router: true },
        { id: 'nav::query-planner', label: 'Query Planner', subtitle: 'Federated execution plans', icon: 'query_planner', href: '/query-planner', use_router: true },
      ],
    },
    {
      id: 'nav-group::about',
      label: 'About',
      icon: 'info',
      groupId: 'about',
      children: [
        { id: 'nav::about-author', label: 'The Author', subtitle: 'ICCS · NTUA', icon: 'user', href: '/about/author', use_router: true },
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
        // ── Datastore type — SELECT_DROPDOWN (new) ────────────────────────────
        {
          categoryId:  'datastore_type',
          displayName: 'Datastore Type',
          helpText:    'Filter by the storage paradigm of the underlying datastore',
          type:        FilterType.SELECT_DROPDOWN,
          options: [
            { displayName: 'All types',          value: ''       },
            { displayName: 'RDBMS',              value: 'rdbms'  },
            { displayName: 'CRUD datastore',     value: 'crud'   },
            { displayName: 'Graph',              value: 'graph'  },
            { displayName: 'Vector',             value: 'vector' },
            { displayName: 'Log / event stream', value: 'log'    },
          ],
        },

        // ── Source node — INPUT_SELECT (scalable: any node name) ─────────────
        {
          categoryId:  'cluster',
          displayName: 'Source',
          helpText:    'Filter by OptimusDB node name (e.g. optimusdb1). Supports comma-separated values.',
          type:        FilterType.INPUT_SELECT,
        },

        // ── Schema — INPUT_SELECT (scalable: any schema name) ────────────────
        {
          categoryId:  'schema',
          displayName: 'Schema',
          helpText:    'Filter by database schema (e.g. knowledgebase, logger, swarmkb)',
          type:        FilterType.INPUT_SELECT,
        },

        // ── Column — INPUT_SELECT (unchanged) ────────────────────────────────
        {
          categoryId:  'column',
          displayName: 'Column',
          helpText:    'Search for tables containing a specific column name',
          type:        FilterType.INPUT_SELECT,
        },

        // ── Table name — INPUT_SELECT (unchanged) ─────────────────────────────
        {
          categoryId:  'name',
          displayName: 'Table',
          helpText:    'Filter by table name',
          type:        FilterType.INPUT_SELECT,
        },

        // ── Tags — CHIP_INPUT (new: multi-value chip input) ───────────────────
        {
          categoryId:  'tag',
          displayName: 'Tags',
          helpText:    'Type a tag and press Enter to add it. Multiple tags are OR-matched.',
          type:        FilterType.CHIP_INPUT,
        },

        // ── Min rows — RANGE_SLIDER (new: hides empty stub tables) ───────────
        {
          categoryId:  'min_rows',
          displayName: 'Min rows',
          helpText:    'Hide tables with fewer rows than this threshold',
          type:        FilterType.RANGE_SLIDER,
          sliderMin:   0,
          sliderMax:   5000,
          sliderStep:  100,
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