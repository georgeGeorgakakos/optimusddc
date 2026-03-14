/* eslint-disable no-debugger */
// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

// ==============================================================================
// NavBar — Two-Row Redesign with Grouped Dropdown Nav (Mock A — Luminous Panel)
// Row 1 (white): Logo | ICCS + IMU + Avatar
// Row 2 (dark):  Flat links + Luminous Panel dropdowns (Operations, Insights, About)
// ==============================================================================

import * as React from 'react';
import * as Avatar from 'react-avatar';
import { RouteComponentProps } from 'react-router';
import { Link, NavLink, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { Binoculars, GridIcon } from 'components/SVGIcons';

import {
  LinkConfig,
  TourConfig,
  NavItemConfig,
  NavGroupItemConfig,
} from 'config/config-types';
import {
  getLogoPath,
  feedbackEnabled,
  indexUsersEnabled,
  getNavLinks,
  getNavItems,
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
// Tour Helpers
// ==============================================================================

const reduceToPageTours = (acc: TourConfig[], tour: TourConfig) => {
  if (!tour.isFeatureTour) return [...acc, tour];

  return acc;
};

const reduceToFeatureTours = (acc: TourConfig[], tour: TourConfig) => {
  if (tour.isFeatureTour) return [...acc, tour];

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
// Static Sub-Components (unchanged from original)
// ==============================================================================

type ProductTourButtonProps = { onClick: () => void };

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

  if (appList?.length === 0) return null;

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

type ProfileMenuProps = { loggedInUser: LoggedInUser };

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

// ==============================================================================
// NavGroup — Luminous Panel Dropdown (Mock A)
// ==============================================================================

type NavGroupProps = {
  item: NavItemConfig;
  isOpen: boolean;
  onToggle: (groupId: string) => void;
};

// Single dropdown item row (icon tile + label + subtitle)
const NavGroupDropdownItem: React.FC<{ child: NavGroupItemConfig }> = ({
  child,
}) => {
  const icon = child.icon ? NavIconMap[child.icon] : null;
  const inner = (
    <>
      <div className="nav-dd-item-icon">
        {icon && <span className="nav-dd-item-icon-svg">{icon}</span>}
      </div>
      <div className="nav-dd-item-text">
        <span className="nav-dd-item-label">{child.label}</span>
        {child.subtitle && (
          <span className="nav-dd-item-subtitle">{child.subtitle}</span>
        )}
      </div>
    </>
  );

  if (child.use_router) {
    return (
      <NavLink
        className="nav-dd-item"
        to={child.href}
        onClick={logClick}
        title={child.label}
      >
        {inner}
      </NavLink>
    );
  }

  return (
    <a
      className="nav-dd-item"
      href={child.href}
      target={child.target}
      onClick={logClick}
      title={child.label}
    >
      {inner}
    </a>
  );
};

// 2-column card used inside the About dropdown
const NavGroupAboutCard: React.FC<{ child: NavGroupItemConfig }> = ({
  child,
}) => {
  const icon = child.icon ? NavIconMap[child.icon] : null;
  const inner = (
    <>
      {icon && <span className="nav-dd-about-card-icon">{icon}</span>}
      <span className="nav-dd-about-card-title">{child.label}</span>
      {child.subtitle && (
        <span className="nav-dd-about-card-sub">{child.subtitle}</span>
      )}
    </>
  );

  if (child.use_router) {
    return (
      <NavLink className="nav-dd-about-card" to={child.href} onClick={logClick}>
        {inner}
      </NavLink>
    );
  }

  return (
    <a
      className="nav-dd-about-card"
      href={child.href}
      target={child.target}
      onClick={logClick}
    >
      {inner}
    </a>
  );
};

export const NavGroup: React.FC<NavGroupProps> = ({
  item,
  isOpen,
  onToggle,
}) => {
  const groupIcon = item.icon ? NavIconMap[item.icon] : null;
  const isAbout = item.groupId === 'about';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(item.groupId!);
  };

  return (
    <div className="nav-group-wrapper">
      <button
        className={`nav-bar-link nav-group-trigger${isOpen ? ' open' : ''}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
        data-test={`nav-group-${item.groupId}`}
      >
        {groupIcon && <span className="nav-link-icon">{groupIcon}</span>}
        <span className="nav-link-label">{item.label}</span>
        <span className="nav-group-caret" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className={`nav-dropdown${isAbout ? ' nav-dropdown--about' : ''}`}
          role="menu"
          data-group={item.groupId}
        >
          {/* Header stripe */}
          <div className="nav-dd-header">
            {groupIcon && (
              <span className="nav-dd-header-icon">{groupIcon}</span>
            )}
            <span className="nav-dd-header-title">{item.label}</span>
          </div>

          {/* Item list for Operations & Insights */}
          {!isAbout && (
            <div className="nav-dd-items">
              {(item.children || []).map((child) => (
                <NavGroupDropdownItem key={child.id} child={child} />
              ))}
            </div>
          )}

          {/* 2-column card grid for About */}
          {isAbout && (
            <div className="nav-dd-about-grid">
              {(item.children || []).map((child) => (
                <NavGroupAboutCard key={child.id} child={child} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// generateNavItems — builds the row-2 link/group elements
// ==============================================================================

const generateNavItems = (
  navItems: NavItemConfig[],
  openGroupId: string | null,
  onGroupToggle: (groupId: string) => void
) =>
  navItems.map((item) => {
    // Group with dropdown
    if (item.groupId && item.children) {
      return (
        <NavGroup
          key={item.id}
          item={item}
          isOpen={openGroupId === item.groupId}
          onToggle={onGroupToggle}
        />
      );
    }

    const icon = item.icon ? NavIconMap[item.icon] : null;

    // Icon-only link (Home button)
    if (item.iconOnly) {
      return item.use_router ? (
        <NavLink
          key={item.id}
          className="nav-bar-link nav-bar-link--icon-only"
          to={item.href!}
          exact
          onClick={logClick}
          data-test="link-to-home"
          title="Home"
          aria-label="Home"
        >
          {icon && <span className="nav-link-icon">{icon}</span>}
        </NavLink>
      ) : (
        <a
          key={item.id}
          className="nav-bar-link nav-bar-link--icon-only"
          href={item.href}
          target={item.target}
          onClick={logClick}
          title="Home"
          aria-label="Home"
        >
          {icon && <span className="nav-link-icon">{icon}</span>}
        </a>
      );
    }

    // Standard labelled link
    return item.use_router ? (
      <NavLink
        key={item.id}
        className="nav-bar-link"
        to={item.href!}
        exact={item.href === '/'}
        target={item.target}
        onClick={logClick}
        data-test={`link-to-${item.label}`}
        title={item.label}
        aria-label={item.label}
      >
        {icon && <span className="nav-link-icon">{icon}</span>}
        <span className="nav-link-label">{item.label}</span>
      </NavLink>
    ) : (
      <a
        key={item.id}
        className="nav-bar-link"
        href={item.href}
        target={item.target}
        onClick={logClick}
        data-test={`link-to-${item.label}`}
        title={item.label}
        aria-label={item.label}
      >
        {icon && <span className="nav-link-icon">{icon}</span>}
        <span className="nav-link-label">{item.label}</span>
      </a>
    );
  });

// Legacy flat-link renderer — used as fallback when navItems is empty (keeps tests green)
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
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(null);
  const { pathname } = location;
  const { hasPageTour, pageTourKey, pageTourSteps } = getPageTourInfo(pathname);
  const { hasFeatureTour, featureTourKey, featureTourSteps } =
    getFeatureTourInfo(pathname);

  // Close open dropdown on route change
  React.useEffect(() => {
    setRunTour(false);
    setOpenGroupId(null);
  }, [pathname]);

  // Close dropdown when clicking outside nav groups
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.nav-group-wrapper')) {
        setOpenGroupId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close dropdown on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroupId(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGroupToggle = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

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
  const navItems = getNavItems();

  return (
    <nav className="container-fluid nav-container">
      {/* ════════ ROW 1: Logo Bar (White) ════════ */}
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

      {/* ════════ ROW 2: Navigation Bar (Dark) ════════ */}
      <div className="nav-row2">
        <div className="nav-row2-links">
          {navItems.length > 0
            ? generateNavItems(navItems, openGroupId, handleGroupToggle)
            : generateNavLinks(getNavLinks())}
        </div>
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
