// js/features/SearchFilter/FilterSection/CheckboxGroupFilter/index.tsx

import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { GlobalState } from 'ducks/rootReducer';
import { updateFilterByCategory } from 'ducks/search/reducer';
import { UpdateSearchFilterRequest } from 'ducks/search/types';
import { ResourceType } from 'interfaces';

import './styles.scss';

export interface FilterOption {
  label:  string;
  value:  string;
  count?: number;
}

export interface OwnProps {
  categoryId:   string;
  resourceType: ResourceType;
  options:      FilterOption[];
}

export interface StateFromProps {
  checkedValues: string[];
}

export interface DispatchFromProps {
  updateFilter: (
    resourceType: ResourceType,
    categoryId:   string,
    value:        string | undefined
  ) => UpdateSearchFilterRequest;
}

type Props = OwnProps & StateFromProps & DispatchFromProps;

export const CheckboxGroupFilter: React.FC<Props> = ({
  categoryId,
  resourceType,
  options,
  checkedValues,
  updateFilter,
}) => {
  const handleChange = (optValue: string, checked: boolean) => {
    const next = checked
      ? [...checkedValues, optValue]
      : checkedValues.filter((v) => v !== optValue);

    // If all options selected or none selected → clear filter (show all)
    const newVal =
      next.length === 0 || next.length === options.length
        ? undefined
        : next.join(',');

    updateFilter(resourceType, categoryId, newVal);
  };

  // When no filter is active every checkbox reads as checked
  const isChecked = (optValue: string) =>
    checkedValues.length === 0 || checkedValues.includes(optValue);

  return (
    <div className="checkbox-group-filter">
      {options.map((opt) => (
        <label key={opt.value} className="checkbox-group-filter__row">
          <input
            type="checkbox"
            className="checkbox-group-filter__cb"
            checked={isChecked(opt.value)}
            onChange={(e) => handleChange(opt.value, e.target.checked)}
          />
          <span className="checkbox-group-filter__label">{opt.label}</span>
          {opt.count !== undefined && (
            <span className="checkbox-group-filter__count">{opt.count}</span>
          )}
        </label>
      ))}
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
  const raw =
    catFilter && typeof catFilter === 'object'
      ? catFilter.value || ''
      : catFilter || '';
  const checkedValues = raw
    ? raw.split(',').map((v: string) => v.trim()).filter(Boolean)
    : [];
  return { checkedValues };
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
)(CheckboxGroupFilter);
