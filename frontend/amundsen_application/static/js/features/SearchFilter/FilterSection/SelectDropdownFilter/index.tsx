// js/features/SearchFilter/FilterSection/SelectDropdownFilter/index.tsx

import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { GlobalState } from 'ducks/rootReducer';
import { updateFilterByCategory } from 'ducks/search/reducer';
import { UpdateSearchFilterRequest } from 'ducks/search/types';
import { ResourceType } from 'interfaces';

import './styles.scss';

export interface FilterOption {
  label: string;
  value: string;
}

export interface OwnProps {
  categoryId:   string;
  resourceType: ResourceType;
  options:      FilterOption[];
}

export interface StateFromProps {
  currentValue: string;
}

export interface DispatchFromProps {
  updateFilter: (
    resourceType: ResourceType,
    categoryId:   string,
    value:        string | undefined
  ) => UpdateSearchFilterRequest;
}

type Props = OwnProps & StateFromProps & DispatchFromProps;

export const SelectDropdownFilter: React.FC<Props> = ({
  categoryId,
  resourceType,
  options,
  currentValue,
  updateFilter,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value || undefined;
    updateFilter(resourceType, categoryId, val);
  };

  return (
    <div className="select-dropdown-filter">
      <div className="select-dropdown-filter__wrap">
        <select
          className="select-dropdown-filter__select"
          value={currentValue}
          onChange={handleChange}
          aria-label={categoryId}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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
};

export const mapStateToProps = (
  state: GlobalState,
  ownProps: OwnProps
): StateFromProps => {
  const filters =
    (state.search.filters[ownProps.resourceType] as Record<string, any>) || {};
  const catFilter = filters[ownProps.categoryId];
  const currentValue =
    catFilter && typeof catFilter === 'object'
      ? catFilter.value || ''
      : catFilter || '';
  return { currentValue };
};

export const mapDispatchToProps = (dispatch: any): DispatchFromProps =>
  bindActionCreators(
    {
      updateFilter: (
        resourceType: ResourceType,
        categoryId:   string,
        value:        string | undefined
      ) =>
        updateFilterByCategory({
          resourceType,
          categoryId,
          value: value ? { value } : undefined,
        }),
    },
    dispatch
  );

export default connect<StateFromProps, DispatchFromProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps
)(SelectDropdownFilter);
