// js/features/SearchFilter/FilterSection/ChipInputFilter/index.tsx

import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { GlobalState } from 'ducks/rootReducer';
import { updateFilterByCategory } from 'ducks/search/reducer';
import { UpdateSearchFilterRequest } from 'ducks/search/types';
import { ResourceType } from 'interfaces';

import './styles.scss';

export interface OwnProps {
  categoryId:   string;
  resourceType: ResourceType;
  placeholder?: string;
}

export interface StateFromProps {
  chips: string[];
}

export interface DispatchFromProps {
  updateFilter: (
    resourceType: ResourceType,
    categoryId:   string,
    value:        string | undefined
  ) => UpdateSearchFilterRequest;
}

type Props = OwnProps & StateFromProps & DispatchFromProps;

interface LocalState {
  inputValue: string;
}

export class ChipInputFilter extends React.Component<Props, LocalState> {
  private inputRef = React.createRef<HTMLInputElement>();

  state: LocalState = { inputValue: '' };

  handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { inputValue } = this.state;
    const { chips, categoryId, resourceType, updateFilter } = this.props;

    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/,/g, '');
      if (!chips.includes(newTag)) {
        const next = [...chips, newTag];
        updateFilter(resourceType, categoryId, next.join(','));
      }
      this.setState({ inputValue: '' });
      return;
    }

    // Backspace on empty input removes last chip
    if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      const next = chips.slice(0, -1);
      updateFilter(
        resourceType,
        categoryId,
        next.length > 0 ? next.join(',') : undefined
      );
    }
  };

  removeChip = (tag: string) => {
    const { chips, categoryId, resourceType, updateFilter } = this.props;
    const next = chips.filter((c) => c !== tag);
    updateFilter(
      resourceType,
      categoryId,
      next.length > 0 ? next.join(',') : undefined
    );
  };

  focusInput = () => {
    this.inputRef.current?.focus();
  };

  render() {
    const { chips, placeholder = 'Add tag, press Enter...' } = this.props;
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
              className="chip-input-filter__chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                this.removeChip(chip);
              }}
              aria-label={`Remove tag ${chip}`}
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
  const filters =
    (state.search.filters[ownProps.resourceType] as Record<string, any>) || {};
  const catFilter = filters[ownProps.categoryId];
  const raw =
    catFilter && typeof catFilter === 'object'
      ? catFilter.value || ''
      : catFilter || '';
  const chips = raw
    ? raw.split(',').map((v: string) => v.trim()).filter(Boolean)
    : [];
  return { chips };
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
)(ChipInputFilter);
