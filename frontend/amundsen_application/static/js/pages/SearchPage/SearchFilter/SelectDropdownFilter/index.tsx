// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { GlobalState } from 'ducks/rootReducer';
import {
  updateFilterByCategory,
  UpdateFilterRequest,
} from 'ducks/search/filters/reducer';

import './styles.scss';

export interface SelectFilterOption {
  displayName?: string;
  value: string;
}

interface OwnProps {
  categoryId: string;
  options: SelectFilterOption[];
}

interface StateFromProps {
  currentValue: string;
}

interface DispatchFromProps {
  applyFilter: (
    categoryId: string,
    value: string[] | undefined
  ) => UpdateFilterRequest;
}

type SelectDropdownFilterProps = OwnProps & StateFromProps & DispatchFromProps;

export class SelectDropdownFilter extends React.Component<SelectDropdownFilterProps> {
  handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { categoryId, applyFilter } = this.props;
    const val = e.target.value;

    applyFilter(categoryId, val ? [val] : undefined);
  };

  render() {
    const { categoryId, options, currentValue } = this.props;

    return (
      <div className="select-dropdown-filter">
        <div className="select-dropdown-filter__wrap">
          <select
            className="select-dropdown-filter__select form-control"
            id={categoryId}
            name={categoryId}
            value={currentValue}
            onChange={this.handleChange}
            aria-label={categoryId}
          >
            <option value="">All</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.displayName || opt.value}
              </option>
            ))}
          </select>
          <svg
            className="select-dropdown-filter__chevron"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
        </div>
      </div>
    );
  }
}

export const mapStateToProps = (
  state: GlobalState,
  ownProps: OwnProps
): StateFromProps => {
  const filterState = state.search.filters;
  const resourceFilters = filterState[state.search.resource];
  const catFilter = resourceFilters
    ? resourceFilters[ownProps.categoryId]
    : undefined;
  const currentValue = catFilter ? catFilter.value : '';

  return { currentValue: currentValue || '' };
};

export const mapDispatchToProps = (dispatch: any): DispatchFromProps =>
  bindActionCreators(
    {
      applyFilter: (categoryId: string, value: string[] | undefined) =>
        updateFilterByCategory({
          searchFilters: [{ categoryId, value }],
        }),
    },
    dispatch
  );

export default connect<StateFromProps, DispatchFromProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps
)(SelectDropdownFilter);
