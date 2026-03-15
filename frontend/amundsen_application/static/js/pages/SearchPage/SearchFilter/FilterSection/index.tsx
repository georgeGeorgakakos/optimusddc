import * as React from 'react';

import { FilterType, FilterOperationType, IconSizes } from 'interfaces';
import InfoButton from 'components/InfoButton';

import CheckBoxFilter, { CheckboxFilterProperties } from '../CheckBoxFilter';
import InputFilter from '../InputFilter';
import ToggleFilter from '../ToggleFilter';
import SelectDropdownFilter, {
  SelectFilterOption,
} from '../SelectDropdownFilter';
import ChipInputFilter from '../ChipInputFilter';
import RangeSliderFilter from '../RangeSliderFilter';

export interface FilterSectionProps {
  categoryId: string;
  allowableOperation?: FilterOperationType;
  defaultValue?: string[];
  helpText?: string;
  title: string;
  type: FilterType;
  options?: CheckboxFilterProperties[];
  selectOptions?: SelectFilterOption[];
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}

const Filter: React.FC<FilterSectionProps> = ({
  categoryId,
  helpText,
  allowableOperation,
  options,
  selectOptions,
  sliderMin,
  sliderMax,
  sliderStep,
  title,
  type,
}) => {
  if (type === FilterType.INPUT_SELECT) {
    return (
      <InputFilter
        categoryId={categoryId}
        helpText={helpText}
        allowableOperation={allowableOperation}
      />
    );
  }
  if (type === FilterType.CHECKBOX_SELECT) {
    return (
      <CheckBoxFilter
        categoryId={categoryId}
        checkboxProperties={options || []}
      />
    );
  }
  if (type === FilterType.TOGGLE_FILTER) {
    return (
      <ToggleFilter
        categoryId={categoryId}
        filterName={title}
        helpText={helpText}
      />
    );
  }
  if (type === FilterType.SELECT_DROPDOWN) {
    return (
      <SelectDropdownFilter
        categoryId={categoryId}
        options={selectOptions || []}
      />
    );
  }
  if (type === FilterType.CHIP_INPUT) {
    return (
      <ChipInputFilter
        categoryId={categoryId}
        placeholder="Add tag, press Enter…"
      />
    );
  }
  if (type === FilterType.RANGE_SLIDER) {
    return (
      <RangeSliderFilter
        categoryId={categoryId}
        sliderMin={sliderMin !== undefined ? sliderMin : 0}
        sliderMax={sliderMax !== undefined ? sliderMax : 1000}
        sliderStep={sliderStep !== undefined ? sliderStep : 10}
      />
    );
  }

  return null;
};

const FilterTitle: React.FC<FilterSectionProps> = ({
  categoryId,
  helpText,
  title,
  type,
}) => {
  if (type === FilterType.TOGGLE_FILTER) return null;

  return (
    <div className="search-filter-section-header">
      <div className="search-filter-section-title">
        <label className="search-filter-section-label" htmlFor={categoryId}>
          {title}
        </label>
        {helpText && type === FilterType.CHECKBOX_SELECT && (
          <InfoButton
            infoText={helpText}
            placement="top"
            size={IconSizes.SMALL}
          />
        )}
      </div>
    </div>
  );
};

const FilterSection: React.FC<FilterSectionProps> = ({
  categoryId,
  allowableOperation,
  helpText,
  title,
  type,
  options,
  selectOptions,
  sliderMin,
  sliderMax,
  sliderStep,
}: FilterSectionProps) => (
  <div className="search-filter-section">
    <FilterTitle
      categoryId={categoryId}
      helpText={helpText}
      title={title}
      type={type}
    />
    <Filter
      categoryId={categoryId}
      helpText={helpText}
      allowableOperation={allowableOperation}
      options={options}
      selectOptions={selectOptions}
      sliderMin={sliderMin}
      sliderMax={sliderMax}
      sliderStep={sliderStep}
      title={title}
      type={type}
    />
  </div>
);

export default FilterSection;
