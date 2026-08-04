"use client";
import React, {  useEffect, useMemo, useState  } from "react";
// import { showDefaultSlideshow } from "../../services/company"
import EditSvg from "../../svg/edit.svg";
import AllLanguagesDropdown, { Dropdown } from "./Dropdown";
import { useRouter } from "next/navigation";

// FIXME [DPLCTLNGENT1]
type LanguageEntry = {
  name: string;
  label: string;
};

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
  currentTarget: HTMLInputElement;
  target: Element;
};

interface LanguageInputRadioType {
  name: string;
  label: string;
  onChange: (e: InputEvent) => void;
  checked: boolean;
}

const LanguageInputRadio: React.FC<LanguageInputRadioType> = ({
  onChange,
  name,
  checked,
  label,
}) => {
  const inputElId = `lang_rb_${name}`;

  return (
    <div className="mr-2 inline text-gray-100">
      <input
        type="radio"
        name="lang"
        id={inputElId}
        value={name}
        onChange={(e: any) => onChange(e)}
        checked={checked}
      />
      <label className="xpr-1 pl-1.5">{label}</label>
    </div>
  );
};

interface LanguageSelectorProps {
  className: string;
  // mostUsedLangs: Array<LanguageEntry>
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className,
  // mostUsedLangs
}) => {
  const [activeLangCode, setActiveLangCode] = useState("en");

  const handleLanguageOnChange = (langCode: string) => {
    setActiveLangCode(langCode);
  };

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
        selectedValue={activeLangCode}
        onChange={handleLanguageOnChange}
      />

      {/* <button className="ml-6 py-1 px-7 rounded w-69px"> */}
      {/* TODO */}
      {/* <EditSvg onClick={() => "TODO"} /> */}
      {/* </button> */}
    </div>
  );
};

const Header: React.FC = () => {
  // const mimi = useMimi()

  // const { stationId } = useParams();
  // const navigate = useNavigate();
  // const location = useLocation();
  const router = useRouter();

  const handleStationChange = (stationRef: string) => {
    const locationShallowArr = location.pathname.split("/");
    locationShallowArr.pop();
    const newLocation = locationShallowArr.join("") + "/" + stationRef;

    router.push(newLocation);
  };

  return (
    <nav
      className="flex items-center justify-between bg-primary pr-1"
      style={{ gridArea: "h" }}
    >
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
          className="mr-4 text-gray-900"
          onChange={(e) => handleStationChange(e.currentTarget.value)}
          defaultValue={"1"}
        >
          <option value="">Station</option>
          {Array.from(
            [1, 2, 3, 4, 5].map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            )),
          )}
        </Dropdown>
      </>
    </nav>
  );
};

export default Header;
