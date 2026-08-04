import React from "react";
import { languages } from "../constant/languages";

interface AllLanguagesDropdownProps {
  selectElName: string;
  selectedValue: string;
  onChange: (e: string) => void;
  style?: string;
  class?: string;
  id?: string;
  emptyValueText?: string;
}

interface Props {
  style?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  [k: string]: unknown;
  defaultValue?: string;
}

const Dropdown: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const { children, style, defaultValue, onChange, ...otherProps } = props;

  return (
    <select
      style={{
        height: "30px",
        paddingLeft: "4px",
        borderRadius: "3px",
      }}
      onChange={onChange}
      defaultValue={defaultValue}
      {...otherProps}
    >
      {children}
    </select>
  );
};

const AllLanguagesDropdown: React.FC<AllLanguagesDropdownProps> = ({
  id,
  selectElName,
  selectedValue,
  onChange,
}) => {
  const _class = "ml-6 w-10rem";
  const _emptyValueText = "Language";

  return (
    <Dropdown
      class={_class}
      id={id}
      name={selectElName}
      onChange={(e) => onChange(e.currentTarget.value)}
    >
      {!selectedValue && <option value="">{_emptyValueText}</option>}

      {languages.map(({ code, name }, index) => (
        <option key={index} value={code} selected={selectedValue === code}>
          {name}
        </option>
      ))}
    </Dropdown>
  );
};

export default AllLanguagesDropdown;
export { AllLanguagesDropdown, Dropdown };
