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

interface OwnProps {
  categoryId: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
}

interface StateFromProps {
  value: number;
}

interface DispatchFromProps {
  applyFilter: (categoryId: string, value: string[] | undefined) => UpdateFilterRequest;
}

type RangeSliderFilterProps = OwnProps & StateFromProps & DispatchFromProps;

export class RangeSliderFilter extends React.Component<RangeSliderFilterProps> {
  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { categoryId, sliderMin, applyFilter } = this.props;
    const num = parseInt(e.target.value, 10);
    applyFilter(categoryId, num > sliderMin ? [String(num)] : undefined);
  };

  render() {
    const { categoryId, sliderMin, sliderMax, sliderStep, value } = this.props;
    const midpoint = Math.round((sliderMin + sliderMax) / 2);
    const displayValue = value > sliderMin
      ? `> ${value.toLocaleString()}`
      : 'Any';

    return (
      <div className="range-slider-filter">
        <div className="range-slider-filter__row">
          <input
            type="range"
            className="range-slider-filter__input"
            id={categoryId}
            name={categoryId}
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={value}
            onChange={this.handleChange}
            aria-label={`Minimum rows: ${displayValue}`}
          />
          <span className="range-slider-filter__value">{displayValue}</span>
        </div>
        <div className="range-slider-filter__scale">
          <span>{sliderMin}</span>
          <span>{midpoint.toLocaleString()}</span>
          <span>{sliderMax.toLocaleString()}</span>
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
  const catFilter = resourceFilters ? resourceFilters[ownProps.categoryId] : undefined;
  const raw = catFilter ? catFilter.value : '';
  const parsed = raw ? parseInt(raw, 10) : ownProps.sliderMin;
  return { value: isNaN(parsed) ? ownProps.sliderMin : parsed };
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
)(RangeSliderFilter);
