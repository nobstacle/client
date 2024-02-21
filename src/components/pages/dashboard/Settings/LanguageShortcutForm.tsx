import * as React from "react";
import { languages } from "../../../../constant/languages";
import { PlusIcon } from "../../../icons/PlusIcon";
import { Button } from "../../../Button";
import { useShortcutControllerCreateShortcutMany } from "../../../../lib/client/api";
import { GetShortcutRes, PostShortcutReq } from "../../../../lib/client/model";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";

export const LanguageShortcutForm: React.FC = () => {
  const { languagesShortcuts, setLanguagesShortcuts } = useShortcutStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [currLanguages, setCurrLanguages] = React.useState<
    { lang: string; order: number }[]
  >([]);
  const [error, setError] = React.useState<string>("");
  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  React.useEffect(() => {
    const mappedInitial =
      languagesShortcuts.map(({ order, value }) => {
        return { lang: value, order: order ?? 0 };
      }) ?? [];

    setCurrLanguages(mappedInitial);
  }, [languagesShortcuts]);

  const handleAddLangaugeShortcut = () => {
    const language = inputRef.current?.value;
    const isValid = validateLanguage(language);

    if (!isValid) return;

    setCurrLanguages((prev) => [
      ...prev,
      { lang: language!, order: prev.length },
    ]);
  };

  const handleSubmit = () => {
    if (currLanguages.length === 0) return;

    const postShortCutReqArray: PostShortcutReq[] = currLanguages.map(
      (language, index) => {
        return {
          type: "Language",
          value: language.lang,
          key: language.lang,
          order: index + 1,
        };
      },
    );

    createShortcutMany.mutate(
      { data: { postShortCutReqArray } },
      {
        onSuccess: (data) => {
          setLanguagesShortcuts(data);
        },
      },
    );
  };

  const validateLanguage = (language?: string) => {
    let isValid = false;

    if (!language) {
      setError("You must select language to add");
      return isValid;
    }

    const isLanguagesInclude = languages
      .map(({ code }) => code)
      .includes(language);

    if (!isLanguagesInclude) {
      setError("You must select valid language to add");
      return isValid;
    }

    const isInclude = currLanguages.some((crr) => crr.lang === language);

    if (isInclude) return isValid;

    if (currLanguages.length === 5) {
      setError("You can't add more than 5 language shortcut");
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
      <label className="font-extrabold text-gray-400">
        Languages Shortcuts
      </label>
      <div className="flex justify-items-end gap-4">
        <input
          placeholder="Add language shortcut"
          list="languages"
          name="browser"
          id="browser"
          autoComplete="off"
          defaultValue="en"
          ref={inputRef}
          onFocus={() => (error ? setError("") : null)}
          onBlur={() => (error ? setError("") : null)}
        />
        <datalist id="languages">
          {languages.map(({ name, code }) => (
            <option value={code} label={name} />
          ))}
        </datalist>

        <button onClick={handleAddLangaugeShortcut} type="button">
          <PlusIcon height="25px" width="25px" />
        </button>
      </div>

      <div className="flex gap-4">
        {currLanguages
          .sort((a, b) => a.order - b.order)
          .map((res) => (
            <>
              <label htmlFor={res.lang}>{res.lang} </label>
              <input
                className="cursor-pointer"
                id={`${res.lang}-${res.order}`}
                onClick={(e) => {
                  if (error !== "") {
                    setError("");
                  }
                  setCurrLanguages((prev) => prev.filter((fil) => fil != res));
                }}
                type="radio"
                checked
              />
            </>
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
