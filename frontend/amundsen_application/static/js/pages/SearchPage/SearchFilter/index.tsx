import * as React from 'react';
import { connect } from 'react-redux';

import { GlobalState } from 'ducks/rootReducer';

import { getFilterConfigByResource } from 'config/config-utils';
import {
  FilterType,
  FilterOperationType,
  ResourceType,
  SearchFilterInput,
} from 'interfaces';
import { bindActionCreators } from 'redux';
import {
  updateFilterByCategory,
  UpdateFilterRequest,
} from 'ducks/search/filters/reducer';
import { FilterOption as CheckboxGroupFilterOption } from 'features/SearchFilter/FilterSection/CheckboxGroupFilter';
import { CheckboxFilterProperties } from './CheckBoxFilter';
import FilterSection from './FilterSection';

import './styles.scss';
import { APPLY_BTN_TEXT, CLEAR_BTN_TEXT } from './constants';

export interface FilterSectionItem {
  categoryId: string;
  allowableOperation?: FilterOperationType;
  helpText?: string;
  title: string;
  type: FilterType;
  defaultValue?: string[];
  resourceType: ResourceType;
  // NEW: carried for SelectDropdown and RangeSlider
  selectOptions?: Array<{ displayName?: string; value: string }>;
  checkboxGroupOptions?: CheckboxGroupFilterOption[];
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}

export interface CheckboxFilterSection extends FilterSectionItem {
  options: CheckboxFilterProperties[];
}

export interface StateFromProps {
  filterSections: FilterSectionItem[];
}

interface DispatchFromProps {
  applyFilters: () => UpdateFilterRequest;
  clearFilters: (searchFilters: SearchFilterInput[]) => UpdateFilterRequest;
}

export type SearchFilterProps = StateFromProps & DispatchFromProps;

export class SearchFilter extends React.Component<SearchFilterProps> {
  onApplyChanges = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { applyFilters } = this.props;

    applyFilters();
  };

  onClearFilter = () => {
    const { filterSections, clearFilters } = this.props;
    const filters = filterSections.map((section) => ({
      categoryId: section.categoryId,
      value: undefined,
    }));

    clearFilters(filters);
  };

  createFilterSection = (
    key: string,
    section: FilterSectionItem | CheckboxFilterSection
  ) => {
    const {
      categoryId,
      allowableOperation,
      helpText,
      title,
      defaultValue,
      type,
      resourceType,
      selectOptions,
      checkboxGroupOptions,
      sliderMin,
      sliderMax,
      sliderStep,
    } = section;
    const options = (section as CheckboxFilterSection).options
      ? (section as CheckboxFilterSection).options
      : undefined;

    return (
      <FilterSection
        key={key}
        categoryId={categoryId}
        allowableOperation={allowableOperation}
        helpText={helpText}
        title={title}
        defaultValue={defaultValue}
        type={type}
        resourceType={resourceType}
        options={options}
        checkboxGroupOptions={checkboxGroupOptions}
        selectOptions={selectOptions}
        sliderMin={sliderMin}
        sliderMax={sliderMax}
        sliderStep={sliderStep}
      />
    );
  };

  renderFilterSections = (filterSections) =>
    filterSections.map((section, index) =>
      this.createFilterSection(
        `section:${section.categoryId}-${index}`,
        section
      )
    );

  render = () => {
    const { filterSections } = this.props;

    return (
      <div className="search-filter-section">
        {Object.keys(filterSections).length > 0 && (
          <form
            id="input-filters-form"
            className="input-section-content form-group"
            onSubmit={this.onApplyChanges}
          >
            {this.renderFilterSections(filterSections)}
            <div className="input-section-buttons">
              <button
                name="search-filter-apply-btn"
                className="btn btn-default"
                type="submit"
              >
                {APPLY_BTN_TEXT}
              </button>
              <button
                onClick={this.onClearFilter}
                className="btn btn-default"
                type="button"
              >
                {CLEAR_BTN_TEXT}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };
}

export const mapStateToProps = (state: GlobalState) => {
  const resourceType = state.search.resource;
  const filterCategories = getFilterConfigByResource(resourceType);
  const filterSections: CheckboxFilterSection[] = [];

  if (filterCategories) {
    filterCategories.forEach((categoryConfig) => {
      const section: CheckboxFilterSection = {
        categoryId: categoryConfig.categoryId,
        allowableOperation: categoryConfig.allowableOperation,
        helpText: categoryConfig.helpText,
        title: categoryConfig.displayName,
        type: categoryConfig.type,
        defaultValue: categoryConfig.defaultValue,
        resourceType,
        options: [],
      };

      if (categoryConfig.type === FilterType.CHECKBOX_SELECT) {
        section.options = (categoryConfig as any).options.map(
          ({
            value,
            displayName,
          }: {
            value: string;
            displayName?: string;
          }) => ({ value, label: displayName || '' })
        );
      }

      if (categoryConfig.type === FilterType.CHECKBOX_GROUP) {
        section.checkboxGroupOptions = (
          (categoryConfig as any).options || []
        ).map(
          ({
            value,
            displayName,
            count,
          }: {
            value: string;
            displayName?: string;
            count?: number;
          }) => ({ value, label: displayName || value, count })
        );
      }

      if (categoryConfig.type === FilterType.SELECT_DROPDOWN) {
        section.selectOptions = (categoryConfig as any).options || [];
      }

      if (categoryConfig.type === FilterType.RANGE_SLIDER) {
        const cfg = categoryConfig as any;

        section.sliderMin = cfg.sliderMin !== undefined ? cfg.sliderMin : 0;
        section.sliderMax = cfg.sliderMax !== undefined ? cfg.sliderMax : 1000;
        section.sliderStep = cfg.sliderStep !== undefined ? cfg.sliderStep : 10;
      }

      filterSections.push(section);
    });
  }

  return {
    filterSections,
  };
};

export const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      applyFilters: () => updateFilterByCategory({ searchFilters: [] }),
      clearFilters: (searchFilters: SearchFilterInput[]) =>
        updateFilterByCategory({ searchFilters }),
    },
    dispatch
  );

export default connect<StateFromProps, DispatchFromProps>(
  mapStateToProps,
  mapDispatchToProps
)(SearchFilter);
