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
} from "../../../../lib/client/api";
import { ChatType, PostShortcutReq } from "../../../../lib/client/model";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";

export const ColorShortcutForm: React.FC = () => {
  const { company } = useCompanyStore();
  const { templatesShortcuts, setTemplatesShortcuts } = useShortcutStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [currColors, setCurrColors] = React.useState<
    { color: string; tag: string; type: ChatType; order: number }[]
  >([]);
  const [currType, setType] = React.useState<ChatType>();
  const [currTag, setTag] = React.useState<string>("");

  const [error, setError] = React.useState<string>("");

  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  const textTags = useTextTemplateControllerGetTextTags();
  const imageTags = useImageTemplateControllerGetImageTags();
  const slideshowTags = useSlideshowTemplateControllerGetTextTags();
  const videoTags = useVideoTemplateControllerGetVideoTags();
  const mapTags = useMapTemplateControllerGetMapTags();
  const websiteTags = useWebsiteTemplateControllerGetWebsiteTags();

  React.useEffect(() => {
    const mappedInitial =
      templatesShortcuts.map(({ order, key, value, extraValue }) => {
        return {
          color: extraValue ?? "#fff",
          order: order ?? 0,
          tag: value,
          type: key as any,
        };
      }) ?? [];

    setCurrColors(mappedInitial);
  }, [templatesShortcuts]);

  const handleAddLangaugeShortcut = () => {
    const color = inputRef.current?.value;

    const isValid = validateForm(color);

    if (!isValid) return;
    if (!currType) return;

    setCurrColors((prev) => [
      ...prev,
      { color: color!, tag: currTag, type: currType, order: prev.length },
    ]);
  };

  const handleSubmit = () => {
    if (currColors.length === 0) return;

    const postShortCutReqArray: PostShortcutReq[] = currColors.map(
      (color, index) => {
        return {
          type: "Template",
          value: color.tag,
          key: color.type,
          order: index + 1,
          extraValue: color.color,
        };
      },
    );

    createShortcutMany.mutate(
      { data: { postShortCutReqArray } },
      {
        onSuccess: (data) => {
          // save to local state
          setTemplatesShortcuts(data);
        },
      },
    );
  };
  const validateForm = (color?: string) => {
    let isValid = false;

    if (!currType) {
      setError("You must select type of template");
      return isValid;
    }

    if (!currTag) {
      setError("You must select tag of template");
      return isValid;
    }

    if (!color) {
      setError("You must select color to add");
      return isValid;
    }

    const isColorExist = currColors.some(
      (currColor) => currColor.color === color,
    );

    if (isColorExist) {
      setError("The color already assigned");
      return isValid;
    }

    const isTemplateAssigned = currColors.some(
      (currColor) => currColor.tag === currTag && currColor.type === currType,
    );

    if (isTemplateAssigned) {
      setError("The template already assigned to color");
      return isValid;
    }

    if (currColors.length === 7) {
      setError("You can't add more than 7 language shortcut");
      return isValid;
    }

    isValid = true;

    return isValid;
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
        <input
          placeholder="Add language shortcut"
          list="colors"
          name="naming"
          id="naming"
          type="color"
          autoComplete="off"
          ref={inputRef}
          onFocus={() => (error ? setError("") : null)}
          onBlur={() => (error ? setError("") : null)}
        />

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
          {["Text", "Image", "Video", "Slideshow", "Map", "Website"].map(
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
        </select>
        <button onClick={handleAddLangaugeShortcut} type="button">
          <PlusIcon height="25px" width="25px" />
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        {currColors.map((res) => (
          <div
            className="flex cursor-pointer gap-2"
            onClick={() => {
              if (error !== "") {
                setError("");
              }
              setCurrColors((prev) =>
                prev.filter(({ color }) => color !== res.color),
              );
            }}
          >
            <span
              title={`${res.type}/${res.tag}`}
              className="block h-[25px] w-[25px] rounded-full"
              style={{ backgroundColor: res.color }}
            />
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
