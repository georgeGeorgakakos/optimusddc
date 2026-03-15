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
  placeholder?: string;
}

interface StateFromProps {
  chips: string[];
}

interface DispatchFromProps {
  applyFilter: (categoryId: string, value: string[] | undefined) => UpdateFilterRequest;
}

type ChipInputFilterProps = OwnProps & StateFromProps & DispatchFromProps;

interface ChipInputFilterState {
  inputValue: string;
}

export class ChipInputFilter extends React.Component<
  ChipInputFilterProps,
  ChipInputFilterState
> {
  private inputRef = React.createRef<HTMLInputElement>();

  state: ChipInputFilterState = { inputValue: '' };

  handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { inputValue } = this.state;
    const { chips, categoryId, applyFilter } = this.props;

    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/,/g, '');
      if (!chips.includes(newTag)) {
        const next = [...chips, newTag];
        applyFilter(categoryId, next);
      }
      this.setState({ inputValue: '' });
      return;
    }

    if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      const next = chips.slice(0, -1);
      applyFilter(categoryId, next.length > 0 ? next : undefined);
    }
  };

  removeChip = (tag: string) => {
    const { chips, categoryId, applyFilter } = this.props;
    const next = chips.filter((c) => c !== tag);
    applyFilter(categoryId, next.length > 0 ? next : undefined);
  };

  focusInput = () => {
    if (this.inputRef.current) this.inputRef.current.focus();
  };

  render() {
    const { chips, placeholder = 'Add tag, press Enter…' } = this.props;
    const { inputValue } = this.state;

    return (
      <div
        className="chip-input-filter"
        onClick={this.focusInput}
        role="presentation"
      >
        {chips.map((chip) => (
          <span key={chip} className="chip-input-filter__chip">
            {chip}
            <button
              type="button"
              className="chip-input-filter__remove"
              onClick={(e) => { e.stopPropagation(); this.removeChip(chip); }}
              aria-label={`Remove ${chip}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={this.inputRef}
          className="chip-input-filter__input"
          type="text"
          value={inputValue}
          placeholder={chips.length === 0 ? placeholder : ''}
          onChange={(e) => this.setState({ inputValue: e.target.value })}
          onKeyDown={this.handleKeyDown}
          aria-label="Add tag filter"
        />
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
  const chips = raw ? raw.split(',').map((v) => v.trim()).filter(Boolean) : [];
  return { chips };
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
)(ChipInputFilter);
