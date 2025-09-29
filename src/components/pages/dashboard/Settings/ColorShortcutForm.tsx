import * as React from "react";
import { PlusIcon } from "../../../icons/PlusIcon";
import { Button } from "../../../Button";
import {
  useImageTemplateControllerGetImageTags,
  useMapTemplateControllerGetMapTags,
  useShortcutControllerCreateShortcutMany,
  useSlideshowTemplateControllerGetTextTags,
  useTextTemplateControllerGetTextTags,
  useVideoTemplateControllerGetVideoTags,
  useWebsiteTemplateControllerGetWebsiteTags,
  useDocumentControllerGetDocumentTags
} from "../../../../lib/client/api";
import { ChatType, PostShortcutReq } from "../../../../lib/client/model";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import * as Io5Icons from "react-icons/io5";


export const ColorShortcutForm: React.FC = () => {
  const { company } = useCompanyStore();
  const { templatesShortcuts, setTemplatesShortcuts } = useShortcutStore();
  const [currShortcuts, setCurrShortcuts] = React.useState<
    { icon: string; tag: string; type: ChatType; order: number }[]
  >([]);
  const [currType, setType] = React.useState<ChatType>();
  const [currTag, setTag] = React.useState<string>("");
  const [selectedIcon, setSelectedIcon] = React.useState<string>("IoAdd");
  const [showIconPicker, setShowIconPicker] = React.useState<boolean>(false);

  const [error, setError] = React.useState<string>("");

  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  const textTags = useTextTemplateControllerGetTextTags();
  const imageTags = useImageTemplateControllerGetImageTags();
  const slideshowTags = useSlideshowTemplateControllerGetTextTags();
  const videoTags = useVideoTemplateControllerGetVideoTags();
  const mapTags = useMapTemplateControllerGetMapTags();
  const websiteTags = useWebsiteTemplateControllerGetWebsiteTags();
  const documentTags = useDocumentControllerGetDocumentTags();

  const iconKeys = Object.keys(Io5Icons).filter(
    (name) => !name.includes("Outline") && !name.includes("Sharp")
  );

  React.useEffect(() => {
    const mappedInitial =
      templatesShortcuts.map(({ order, key, value, extraValue }) => {
        return {
          icon: extraValue ?? "IoAdd",
          order: order ?? 0,
          tag: value,
          type: key as any,
        };
      }) ?? [];

    setCurrShortcuts(mappedInitial);
  }, [templatesShortcuts]);

  const handleAddLangaugeShortcut = () => {
    const isValid = validateForm();

    if (!isValid) return;
    if (!currType) return;

    setCurrShortcuts((prev) => [
      ...prev,
      { icon: selectedIcon, tag: currTag, type: currType, order: prev.length },
    ]);
  };

  const handleSubmit = () => {
    if (currShortcuts.length === 0) return;

    const postShortCutReqArray: PostShortcutReq[] = currShortcuts.map(
      (shortcut, index) => {
        return {
          type: "Template",
          value: shortcut.tag,
          key: shortcut.type,
          order: index + 1,
          extraValue: shortcut.icon,
        };
      },
    );

    createShortcutMany.mutate(
      { data: { postShortCutReqArray } },
      {
        onSuccess: (data) => {
          setTemplatesShortcuts(data);
        },
      },
    );
  };

  const validateForm = () => {
    let isValid = false;

    if (!currType) {
      setError("You must select type of template");
      return isValid;
    }

    if (!currTag) {
      setError("You must select tag of template");
      return isValid;
    }

    if (!selectedIcon) {
      setError("You must select an icon");
      return isValid;
    }

    const isIconExist = currShortcuts.some(
      (currShortcut) => currShortcut.icon === selectedIcon,
    );

    if (isIconExist) {
      setError("The icon is already assigned");
      return isValid;
    }

    const isTemplateAssigned = currShortcuts.some(
      (currShortcut) => currShortcut.tag === currTag && currShortcut.type === currType,
    );

    if (isTemplateAssigned) {
      setError("The template is already assigned to an icon");
      return isValid;
    }

    if (currShortcuts.length === 7) {
      setError("You can't add more than 7 template shortcuts");
      return isValid;
    }

    isValid = true;
    return isValid;
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Io5Icons as any)[iconName];
    return IconComponent ? <IconComponent size={20} /> : null;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex w-full flex-col gap-4"
      autoComplete="off"
    >
      <label className="font-extrabold text-gray-400">Template Shortcuts</label>
      <div className="flex justify-items-end gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            onFocus={() => (error ? setError("") : null)}
            className="flex h-10 items-center justify-center gap-2 rounded border border-gray-300 px-4 hover:bg-gray-50"
          >
            {renderIcon(selectedIcon)}
            <span className="text-sm">Select Icon</span>
          </button>
          {showIconPicker && (
            <div className="absolute z-10 mt-1 max-h-60 w-64 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg">
              <div className="grid grid-cols-6 gap-2 p-2">
                {iconKeys.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(iconName);
                      setShowIconPicker(false);
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded hover:bg-gray-100 ${
                      selectedIcon === iconName ? "bg-blue-100" : ""
                    }`}
                    title={iconName.replace("Io", "")}
                  >
                    {renderIcon(iconName)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <select
          onFocus={() => (error ? setError("") : null)}
          onBlur={() => (error ? setError("") : null)}
          onChange={(e) => {
            if (e.currentTarget.value) {
              if (currType !== e.currentTarget.value) {
                setTag("");
              }
              setType(
                (e.currentTarget.value === "null"
                  ? undefined
                  : e.currentTarget.value) as any,
              );
            }
          }}
        >
          <option value="null">Select type...</option>
          {["Text", "Image", "Video", "Slideshow", "Map", "Website", "Document"].map(
            (value, index) => (
              <option value={value} key={`${value}-${index}`}>
                {value}
              </option>
            ),
          )}
        </select>

        <select
          onFocus={() => (error ? setError("") : null)}
          onBlur={() => (error ? setError("") : null)}
          onChange={(e) =>
            e.currentTarget.value
              ? setTag(
                e.currentTarget.value === "null" ? "" : e.currentTarget.value,
              )
              : null
          }
        >
          <option value="null">Select tag...</option>
          {currType === "Text" &&
            textTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Image" &&
            imageTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Video" &&
            videoTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Slideshow" &&
            slideshowTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Map" &&
            mapTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Website" &&
            websiteTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}

          {currType === "Document" &&
            documentTags.data
              ?.filter(({ langCode }) =>
                langCode.includes(company?.defaultLangCode ?? "en"),
              )
              .map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}
        </select>

        <button onClick={handleAddLangaugeShortcut} type="button">
          <PlusIcon height="25px" width="25px" />
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        {currShortcuts.map((res) => (
          <div
            key={`${res.icon}-${res.tag}`}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2"
            onClick={() => {
              if (error !== "") {
                setError("");
              }
              setCurrShortcuts((prev) =>
                prev.filter(({ icon }) => icon !== res.icon),
              );
            }}
          >
            <span title={`${res.type}/${res.tag}`}>
              {renderIcon(res.icon)}
            </span>
            <label className="cursor-pointer">{res.tag}</label>
          </div>
        ))}
      </div>
      {error && <p className="text-center text-xs text-danger">{error}.</p>}

      <Button
        type="submit"
        className="rounded-xl  bg-primary p-2 text-white"
        disabled={createShortcutMany.isPending}
        isLoading={createShortcutMany.isPending}
      >
        Save
      </Button>
    </form>
  );
};
