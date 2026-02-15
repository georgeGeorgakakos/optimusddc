/* eslint-disable no-debugger */
// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

// ==============================================================================
// NavBar — Two-Row Redesign
// Row 1 (white): Logo | ICCS + IMU + Avatar
// Row 2 (dark):  Nav items with SVG icons (centered)
// ==============================================================================

import * as React from 'react';
import * as Avatar from 'react-avatar';
import { RouteComponentProps } from 'react-router';
import { Link, NavLink, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { Binoculars, GridIcon } from 'components/SVGIcons';

import { LinkConfig, TourConfig } from 'config/config-types';
import {
  getLogoPath,
  feedbackEnabled,
  indexUsersEnabled,
  getNavLinks,
  getLogoTitle,
  getProductToursFor,
  getNavAppSuite,
} from 'config/config-utils';

import { GlobalState } from 'ducks/rootReducer';
import { LoggedInUser } from 'interfaces';
import { logClick, logAction } from 'utils/analytics';

import Feedback from 'features/Feedback';
import SearchBar from 'features/SearchBar';
import { Tour } from 'components/Tour';
import { NavIconMap } from './NavIcons';

import './styles.scss';

// ==============================================================================
// Constants
// ==============================================================================

const NUM_CHARS_FOR_KEY = 9;
const DEFAULT_PAGE_TOUR_KEY = 'default-key';
const DEFAULT_FEATURE_TOUR_KEY = 'default-feature-key';
const PROFILE_LINK_TEXT = 'My Profile';
const PRODUCT_TOUR_BUTTON_TEXT = 'Discover OptimusDDC';
const APP_SUITE_BUTTON_TEXT = 'Related Apps';
export const HOMEPAGE_PATH = '/';
const AVATAR_SIZE = 32;

const GENERIC_LOGO_PATH = '/static/images/optimus-logo.png';
const ICCS_LOGO_PATH = '/static/images/logo3.png';
// const IMU_LOGO_PATH = '/static/images/imu-logo-white-full-black.png';
const IMU_LOGO_PATH = '/static/images/imu.png';


const TRACKING_MESSAGES = {
  START_TOUR: 'Start Tour',
  END_TOUR: 'End Tour',
  NEXT_TOUR_STEP: 'Next Tour Step',
  CLOSE_TOUR: 'Tour Closed',
  OPEN_APP_SUITE: 'Open App Suite Menu',
  CLOSE_APP_SUITE: 'Close App Suite Menu',
  followAppSuiteLink: (label: string) => `Follow App Suite Link: ${label}`,
};

// ==============================================================================
// Tour Helpers (unchanged)
// ==============================================================================

const reduceToPageTours = (acc: TourConfig[], tour: TourConfig) => {
  if (!tour.isFeatureTour) {
    return [...acc, tour];
  }

  return acc;
};

const reduceToFeatureTours = (acc: TourConfig[], tour: TourConfig) => {
  if (tour.isFeatureTour) {
    return [...acc, tour];
  }

  return acc;
};

const generateKeyFromSteps = (tourSteps: TourConfig[], pathname: string) =>
  tourSteps.length
    ? `${tourSteps[0].steps[0].content.substring(
        0,
        NUM_CHARS_FOR_KEY
      )}-path:${pathname}`
    : false;

const getPageTourInfo = (pathname: string) => {
  const { result: productToursForThisPage, tourPath } =
    getProductToursFor(pathname);
  const pageTours = productToursForThisPage
    ? productToursForThisPage.reduce(reduceToPageTours, [])
    : [];
  const pageTourSteps = pageTours.length ? pageTours[0].steps : [];
  const pageTourKey =
    generateKeyFromSteps(pageTours, tourPath) || DEFAULT_PAGE_TOUR_KEY;
  const hasPageTour = productToursForThisPage ? !!pageTours.length : false;

  return { hasPageTour, pageTourKey, pageTourSteps };
};

const getFeatureTourInfo = (pathname: string) => {
  const { result: productToursForThisPage, tourPath } =
    getProductToursFor(pathname);
  const featureTours = productToursForThisPage
    ? productToursForThisPage.reduce(reduceToFeatureTours, [])
    : [];
  const featureTourSteps = featureTours.length ? featureTours[0].steps : [];
  const featureTourKey =
    generateKeyFromSteps(featureTours, tourPath) || DEFAULT_FEATURE_TOUR_KEY;
  const hasFeatureTour = productToursForThisPage
    ? !!featureTourSteps.length
    : false;

  return { hasFeatureTour, featureTourKey, featureTourSteps };
};

// ==============================================================================
// Sub-Components
// ==============================================================================

type ProductTourButtonProps = {
  onClick: () => void;
};

export const ProductTourButton: React.FC<ProductTourButtonProps> = ({
  onClick,
}) => (
  <button
    className="btn btn-nav-bar-icon btn-flat-icon nav-row2-action"
    type="button"
    onClick={onClick}
  >
    <Binoculars fill="#c8d6e5" />
    <span className="sr-only">{PRODUCT_TOUR_BUTTON_TEXT}</span>
  </button>
);

type AppSuiteMenuProps = {
  onClick: (isOpen: boolean) => void;
  onItemClick?: (itemLabel: string) => void;
};

export const AppSuiteMenu: React.FC<AppSuiteMenuProps> = ({
  onClick,
  onItemClick,
}) => {
  const appList = getNavAppSuite();

  if (appList?.length === 0) {
    return null;
  }

  const handleItemClick = (_, e: React.MouseEvent) => {
    onItemClick?.((e.target as HTMLAnchorElement).text);
  };

  return (
    <Dropdown
      id="app-suite-dropdown"
      pullRight
      onToggle={onClick}
      onSelect={handleItemClick}
    >
      <Dropdown.Toggle
        noCaret
        className="btn btn-nav-bar-icon btn-flat-icon nav-row2-action"
      >
        <GridIcon fill="#c8d6e5" />
        <span className="sr-only">{APP_SUITE_BUTTON_TEXT}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="app-suite-menu">
        {appList?.map(({ label, id, href, target, iconPath }) => (
          <MenuItem
            key={id}
            className="app-suite-link"
            href={href}
            target={target}
          >
            {iconPath && (
              <img className="app-suite-logo" src={iconPath} alt="" />
            )}
            {label}
          </MenuItem>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

// ── Logo (Row 1 Left) — uses optimus-logo.png ──
export const Logo: React.FC = () => (
  <Link className="logo-link" to="/" onClick={logClick}>
    <img
      id="logo-icon"
      className="logo-icon"
      src={getLogoPath() || GENERIC_LOGO_PATH}
      alt="Swarmchestrate"
    />
    {getLogoTitle() && <span className="logo-text">{getLogoTitle()}</span>}
  </Link>
);

// ── Partner Logos (Row 1 Right) ──
export const PartnerLogos: React.FC = () => (
  <div className="partner-logos">
    <img
      className="partner-logo"
      src={ICCS_LOGO_PATH}
      alt="ICCS"
      title="ICCS - Institute of Communication and Computer Systems"
    />
    <img className="partner-logo" src={IMU_LOGO_PATH} alt="IMU" title="IMU" />
  </div>
);

// ── Profile Menu (Row 1 Right) ──
type ProfileMenuProps = {
  loggedInUser: LoggedInUser;
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ loggedInUser }) => {
  const { user_id, display_name, email } = loggedInUser;
  const userLink = `/user/${user_id}?source=navbar`;

  let avatar = <div className="nav-shimmering-circle is-shimmer-animated" />;

  if (display_name) {
    avatar = <Avatar name={display_name} size={AVATAR_SIZE} round />;
  }

  if (!indexUsersEnabled()) {
    return <div className="nav-bar-avatar">{avatar}</div>;
  }

  return (
    <Dropdown id="user-dropdown" pullRight>
      <Dropdown.Toggle noCaret className="nav-bar-avatar avatar-dropdown">
        {avatar}
      </Dropdown.Toggle>
      <Dropdown.Menu className="profile-menu">
        <div className="profile-menu-header">
          <div className="title-2">{display_name}</div>
          <div>{email}</div>
        </div>
        <MenuItem
          componentClass={Link}
          id="nav-bar-avatar-link"
          to={userLink}
          href={userLink}
        >
          {PROFILE_LINK_TEXT}
        </MenuItem>
      </Dropdown.Menu>
    </Dropdown>
  );
};

// ── Nav Link Generator (Row 2) — with icons ──
const generateNavLinks = (navLinks: LinkConfig[]) =>
  navLinks.map((link, index) => {
    const icon = link.icon ? NavIconMap[link.icon] : null;

    if (link.use_router) {
      return (
        <NavLink
          className="nav-bar-link"
          key={index}
          to={link.href}
          exact={link.href === '/'}
          target={link.target}
          onClick={logClick}
          data-test={`link-to-${link.label}`}
          title={link.label}
          aria-label={link.label}
        >
          {icon && <span className="nav-link-icon">{icon}</span>}
          <span className="nav-link-label">{link.label}</span>
        </NavLink>
      );
    }

    return (
      <a
        className="nav-bar-link"
        key={index}
        href={link.href}
        target={link.target}
        onClick={logClick}
        data-test={`link-to-${link.label}`}
        title={link.label}
        aria-label={link.label}
      >
        {icon && <span className="nav-link-icon">{icon}</span>}
        <span className="nav-link-label">{link.label}</span>
      </a>
    );
  });

// ── SearchBar (inside Row 2, right side) ──
const renderSearchBar = (pathname: string) => {
  if (pathname !== HOMEPAGE_PATH) {
    return (
      <div className="nav-search-bar">
        <SearchBar size="small" />
      </div>
    );
  }

  return null;
};

// ==============================================================================
// Main NavBar Component
// ==============================================================================

interface StateFromProps {
  loggedInUser: LoggedInUser;
}

export type NavBarProps = StateFromProps & RouteComponentProps<{}>;

export const NavBar: React.FC<NavBarProps> = ({ loggedInUser, location }) => {
  const [runTour, setRunTour] = React.useState(false);
  const { pathname } = location;
  const { hasPageTour, pageTourKey, pageTourSteps } = getPageTourInfo(pathname);
  const { hasFeatureTour, featureTourKey, featureTourSteps } =
    getFeatureTourInfo(pathname);

  React.useEffect(() => {
    setRunTour(false);
  }, [pathname]);

  const handleAppSuiteToggle = (isOpen: boolean) => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: isOpen
        ? TRACKING_MESSAGES.OPEN_APP_SUITE
        : TRACKING_MESSAGES.CLOSE_APP_SUITE,
    });
  };

  const handleAppSuiteItemClick = (label: string) => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: TRACKING_MESSAGES.followAppSuiteLink(label),
    });
  };

  const handleTourClick = () => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: TRACKING_MESSAGES.START_TOUR,
    });
    setRunTour(true);
  };

  const handleTourEnd = () => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: TRACKING_MESSAGES.END_TOUR,
    });
    setRunTour(false);
  };

  const handleNextStep = () => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: TRACKING_MESSAGES.NEXT_TOUR_STEP,
    });
  };

  const handleTourClose = () => {
    logAction({
      target_id: '',
      command: 'click',
      target_type: 'button',
      label: TRACKING_MESSAGES.CLOSE_TOUR,
    });
  };

  const hasAppSuite = getNavAppSuite() !== null;

  return (
    <nav className="container-fluid nav-container">
      {/* ════════════════════════════════════════════════
          ROW 1: Logo Bar (White)
          Left:  optimus-logo.png
          Right: ICCS | IMU | divider | Avatar
          ════════════════════════════════════════════════ */}
      <div className="nav-row1">
        <div className="nav-row1-left">
          <Logo />
        </div>
        <div className="nav-row1-right">
          <PartnerLogos />
          <div className="nav-row1-divider" />
          {loggedInUser && <ProfileMenu loggedInUser={loggedInUser} />}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          ROW 2: Navigation Bar (Dark)
          Center: Nav items with icons
          Right:  SearchBar (non-home pages) + Tour + Feedback + AppSuite
          ════════════════════════════════════════════════ */}
      <div className="nav-row2">
        <div className="nav-row2-links">{generateNavLinks(getNavLinks())}</div>
        <div className="nav-row2-right">
          {renderSearchBar(pathname)}
          {hasPageTour && <ProductTourButton onClick={handleTourClick} />}
          {feedbackEnabled() && <Feedback theme="dark" />}
          {hasAppSuite && (
            <AppSuiteMenu
              onClick={handleAppSuiteToggle}
              onItemClick={handleAppSuiteItemClick}
            />
          )}
        </div>
      </div>

      {/* Tour overlay */}
      {(hasPageTour || hasFeatureTour) && (
        <Tour
          run={runTour}
          steps={hasPageTour ? pageTourSteps : featureTourSteps}
          onTourEnd={handleTourEnd}
          onTourClose={handleTourClose}
          onNextStep={handleNextStep}
          triggersOnFirstView
          key={hasPageTour ? pageTourKey : featureTourKey}
          triggerFlagId={hasPageTour ? pageTourKey : featureTourKey}
        />
      )}
    </nav>
  );
};

export const mapStateToProps = (state: GlobalState) => ({
  loggedInUser: state.user.loggedInUser,
});

export default connect<StateFromProps>(mapStateToProps)(withRouter(NavBar));
