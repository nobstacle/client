import { useEffect, useMemo } from "react"
// import { showDefaultSlideshow } from "../../services/company"
import EditSvg from "../../svg/edit.svg"
import Dropdown from "../Dropdown"
import AllLanguagesDropdown from "./AllLanguagesDropdown"
import {
  usePersistedAuthStore,
  usePersistedCompanyStore,
  usePersistedConfigStore
} from "../../lib/nobstacle-api-client/zustand"
import { useLocation, useNavigate, useParams } from "react-router"

// FIXME [DPLCTLNGENT1]
type LanguageEntry = {
  name: string
  label: string
}

// GET /company/cmpid1/languages
// TODO get those from server
// const companyMostUsedLangs = [
//   {
//     name: "ar",
//     label: "Ar"
//   },
//   {
//     name: "zh-CN",
//     label: "zh-CN"
//   },
//   {
//     name: "en",
//     label: "En"
//   },
//   {
//     name: "fr",
//     label: "Fr"
//   },
//   {
//     name: "ru",
//     label: "Ru"
//   }
// ]

type SyntheticInputEvent = Event & {
  currentTarget: HTMLInputElement
  target: Element
}

interface LanguageInputRadioType {
  name: string
  label: string
  onChange: (e: InputEvent) => void
  checked: boolean
}

const LanguageInputRadio: React.FC<LanguageInputRadioType> = ({
  onChange,
  name,
  checked,
  label
}) => {
  const inputElId = `lang_rb_${name}`

  return (
    <div className="inline mr-2 text-gray-100">
      <input
        type="radio"
        name="lang"
        id={inputElId}
        value={name}
        onChange={(e: any) => onChange(e)}
        checked={checked}
      />
      <label className="pl-1.5 xpr-1">{label}</label>
    </div>
  )
}

interface LanguageSelectorProps {
  className: string
  // mostUsedLangs: Array<LanguageEntry>
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className
  // mostUsedLangs
}) => {
  const { setActiveLangCode, activeLangCode } = usePersistedConfigStore()
  const { company } = usePersistedCompanyStore()

  const handleLanguageOnChange = (langCode: string) => {
    setActiveLangCode(langCode)
  }

  return (
    <div className={className}>
      {/* {mostUsedLangs.map(({ label, name }) => (
        <LanguageInputRadio
          key={label + name}
          name={name}
          label={label}
          onChange={(e) => console.log(e)}
          checked={false}
        />
      ))} */}

      <AllLanguagesDropdown
        selectElName=""
        selectedValue={(activeLangCode || company?.defaultLangCode) ?? ""}
        onChange={handleLanguageOnChange}
      />

      {/* <button className="ml-6 py-1 px-7 rounded w-69px"> */}
      {/* TODO */}
      {/* <EditSvg onClick={() => "TODO"} /> */}
      {/* </button> */}
    </div>
  )
}

const Header: React.FC = () => {
  // const mimi = useMimi()

  const { stationId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const handleStationChange = (stationRef: string) => {
    const locationShallowArr = location.pathname.split("/")
    locationShallowArr.pop()
    const newLocation = locationShallowArr.join("") + "/" + stationRef

    navigate(newLocation)
  }

  const { member } = usePersistedAuthStore()

  return (
    <header
      className="flex items-center justify-between pr-1 bg-primary"
      style={{ gridArea: "h" }}
    >
      {member?.Role !== "User" && (
        <>
          <a
            href="#"
            style={{ width: "110px" }}
            // onClick={() => showDefaultSlideshow("FIXME_token")}
          >
            {/* <img
          className="h-12 mx-auto"
          src="brand_logo-removebg-preview.png"
          alt="nobstacle Logo"
        /> */}
          </a>

          <LanguageSelector
            className="ml-5 mr-auto"
            // mostUsedLangs={companyMostUsedLangs}
          />

          <Dropdown
            className="text-gray-900 mr-4"
            onChange={(e) => handleStationChange(e.currentTarget.value)}
            defaultValue={stationId}
          >
            <option value="">Station</option>
            {Array.from(
              [1, 2, 3, 4, 5].map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))
            )}
          </Dropdown>
        </>
      )}
    </header>
  )
}

export default Header
