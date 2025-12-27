// This file should be used to add new config variables or overwrite defaults from config-default.ts

import { AppConfigCustom } from './config-types';

const configCustom: AppConfigCustom = {
  analytics: {
    plugins: [],
  },
  announcements: {
    enabled: false,
  },
  browse: {
    curatedTags: [],
    hideNonClickableBadges: false,
    showAllTags: true,
    showBadgesInHome: true,
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
  mailClientFeatures: {
    feedbackEnabled: false,
    notificationsEnabled: false,
  },
  productTour: {},
  userIdLabel: 'email address',
  // ... keep existing config

  // Show your own logo image:
  logoPath: "/static/images/optimus-logo.png",

  // Change the text next to it (top-left):
  logoTitle: "",

  // (optional) change browser tab title:
  documentTitle: "OptimusDB - Data Discovery Portal",
};

export default configCustom;
