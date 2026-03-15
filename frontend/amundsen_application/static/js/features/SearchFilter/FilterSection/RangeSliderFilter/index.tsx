// js/features/SearchFilter/FilterSection/RangeSliderFilter/index.tsx

import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { GlobalState } from 'ducks/rootReducer';
import {
  updateFilterByCategory,
  UpdateFilterRequest,
} from 'ducks/search/filters/reducer';
import { ResourceType } from 'interfaces';

import './styles.scss';

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
}

export interface OwnProps {
  categoryId: string;
  resourceType: ResourceType;
  sliderConfig: SliderConfig;
}

export interface StateFromProps {
  value: number;
}

export interface DispatchFromProps {
  updateFilter: (
    resourceType: ResourceType,
    categoryId: string,
    value: string | undefined
  ) => UpdateFilterRequest;
}

type Props = OwnProps & StateFromProps & DispatchFromProps;

export const RangeSliderFilter: React.FC<Props> = ({
  categoryId,
  resourceType,
  sliderConfig,
  value,
  updateFilter,
}) => {
  const { min, max, step } = sliderConfig;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);

    updateFilter(resourceType, categoryId, num > min ? String(num) : undefined);
  };

  const displayValue = value > min ? `> ${value.toLocaleString()}` : 'Any';

  const midpoint = Math.round((min + max) / 2);

  return (
    <div className="range-slider-filter">
      <div className="range-slider-filter__row">
        <input
          type="range"
          className="range-slider-filter__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          aria-label={`Minimum rows: ${displayValue}`}
        />
        <span className="range-slider-filter__value">{displayValue}</span>
      </div>
      <div className="range-slider-filter__scale">
        <span>{min}</span>
        <span>{midpoint.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
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
  const raw =
    catFilter && typeof catFilter === 'object'
      ? catFilter.value || ''
      : catFilter || '';
  const parsed = raw ? parseInt(raw, 10) : ownProps.sliderConfig.min;

  return { value: isNaN(parsed) ? ownProps.sliderConfig.min : parsed };
};

export const mapDispatchToProps = (dispatch: any): DispatchFromProps =>
  bindActionCreators(
    {
      updateFilter: (
        resourceType: ResourceType,
        categoryId: string,
        value: string | undefined
      ) =>
        updateFilterByCategory({
          searchFilters: [{ categoryId, value: value ? [value] : undefined }],
        }),
    },
    dispatch
  );

export default connect<StateFromProps, DispatchFromProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps
)(RangeSliderFilter);
