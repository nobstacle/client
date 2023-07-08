import Dropdown from "../Dropdown"
import AllLangs from "../../constants/AllLangs"

interface AllLanguagesDropdownProps {
  selectElName: string
  selectedValue: string
  onChange: (e: string) => void
  style?: string
  class?: string
  id?: string
  emptyValueText?: string
}

const AllLanguagesDropdown: React.FC<AllLanguagesDropdownProps> = ({
  id,
  selectElName,
  selectedValue,
  onChange
}) => {
  const _class = "ml-6 w-10rem"
  const _emptyValueText = "Language"

  return (
    <Dropdown
      class={_class}
      id={id}
      name={selectElName}
      onChange={(e) => onChange(e.currentTarget.value)}
    >
      {!selectedValue && <option value="">{_emptyValueText}</option>}

      {AllLangs.map(({ code, name }, index) => (
        <option key={index} value={code} selected={selectedValue === code}>
          {name}
        </option>
      ))}
    </Dropdown>
  )
}

export default AllLanguagesDropdown
