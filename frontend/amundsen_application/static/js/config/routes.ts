// js/config/routes.ts

export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  BROWSE: '/browse',
  TABLE_DETAIL: '/table_detail/:cluster/:database/:schema/:table',
  DASHBOARD: '/dashboard/:group/:name',
  FEATURE: '/feature/:feature_group/:feature_name/:version',
  LINEAGE: '/lineage/table/:cluster/:database/:schema/:table/:direction',
  USER_PROFILE: '/user/:userId',
  ANNOUNCEMENTS: '/announcements',
  CLUSTER_TOPOLOGY: '/cluster/topology',
  OPTIMUSDDC_DASHBOARD: '/operations',
  NOT_FOUND: '/404',
};
export const QUERY_WORKBENCH = '/queryworkbench';
// Helper functions to build URLs
export const buildTableDetailUrl = (
  cluster: string,
  database: string,
  schema: string,
  table: string
): string => {
  return `/table_detail/${cluster}/${database}/${schema}/${table}`;
};

export const buildDashboardUrl = (group: string, name: string): string => {
  return `/dashboard/${group}/${name}`;
};

export const buildUserProfileUrl = (userId: string): string => {
  return `/user/${userId}`;
};

export const buildLineageUrl = (
  cluster: string,
  database: string,
  schema: string,
  table: string,
  direction: 'upstream' | 'downstream' | 'both'
): string => {
  return `/lineage/table/${cluster}/${database}/${schema}/${table}/${direction}`;
};
