import { ResourceType } from 'interfaces/Resources';
import { getDisplayNameByResource } from 'config/config-utils';

export const PAGINATION_PAGE_RANGE = 10;

// TODO: Hard-coded text strings should be translatable/customizable
export const DOCUMENT_TITLE_SUFFIX = ' - OptimusDDC Search';
export const SEARCHPAGE_TITLE = 'OptimusDDC Semantic Search';

export const PAGE_INDEX_ERROR_MESSAGE =
  'Page index out of bounds for available matches';

export const SEARCH_DEFAULT_MESSAGE =
  'Search the Distributed Data Catalog.\n\
Enter a search term or use the filters to discover datasets across \
SQLite, OrbitDB, IPFS, and AI-enriched metadata.';

export const SEARCH_SOURCE_NAME = 'search_results';
export const SEARCH_ERROR_MESSAGE_PREFIX = 'Your search did not match any ';
export const SEARCH_ERROR_MESSAGE_SUFFIX = ' results';

export const RESOURCE_SELECTOR_TITLE = 'Resource';
export const DASHBOARD_RESOURCE_TITLE = getDisplayNameByResource(
  ResourceType.dashboard
);
export const TABLE_RESOURCE_TITLE = getDisplayNameByResource(
  ResourceType.table
);
export const USER_RESOURCE_TITLE = getDisplayNameByResource(ResourceType.user);
export const FEATURE_RESOURCE_TITLE = getDisplayNameByResource(
  ResourceType.feature
);

export const INPUT_FILTER_PLACEHOLDER_MESSAGE = 'Exact name or *wild card*';
export const DELAY_SHOW_POPOVER_MS = 300;
