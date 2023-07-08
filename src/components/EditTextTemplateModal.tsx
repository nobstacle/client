import { Component, For, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import AllLangs from "../AllLangs";
import {
  deleteLangOfTextTemplate,
  editTextTemplate,
} from "../services/company";
import CloseSvg from "../svg/close.svg";
import Dropdown from "./Dropdown";

type _TextTemplate = {
  tag: string;
  langs: Array<{ label: string; text: string }>;
};

type Props = {
  template: _TextTemplate;

  onDismiss: (hasAnyEdited: boolean) => void;
};

const EditTextTemplateModal: Component<Props> = (props) => {
  const _props = JSON.parse(JSON.stringify(props));
  const _orgLangs = [...JSON.parse(JSON.stringify(props.template.langs))];
  const [formData, setFormData] = createStore<_TextTemplate>({
    tag: _props.template.tag,
    langs: _props.template.langs,
  });

  const [selectedLangLabel, setSelectedLangLabel] = createSignal<string>(
    _props.template.langs[0].label,
  );

  // TODO const isFormSubmittable = createMemo(() => true);

  async function handleDelete() {
    // FIXME make this alert beautiful
    if (confirm("Are you sure you want to delete?") === false) {
      return;
    }

    const deletionResult = await deleteLangOfTextTemplate(
      "TODO_token",
      _props.template.tag,
      selectedLangLabel(),
    );
    if (deletionResult === false) {
      console.warn(
        `couldn't del lang "${selectedLangLabel()}" for text template tagged with "${
          _props.template.tag
        }"`,
      );

      return;
    }

    setFormData((fd) => {
      const _langs = fd.langs.filter(
        ({ label }) => label !== selectedLangLabel(),
      );

      return {
        tag: fd.tag,
        langs: _langs,
      };
    });
    if (formData.langs.length === 0) {
      // if there's no any lang left to delete, close the form
      props.onDismiss(true);
    } else {
      setSelectedLangLabel(formData.langs[0].label);
    }
  }

  async function handleSave() {
    const changedLangs = formData.langs.filter(
      (fdl) =>
        fdl.text !== _orgLangs.find(({ label }) => label === fdl.label)?.text,
    );

    if (changedLangs.length > 0) {
      await editTextTemplate("TODO_token", _props.template.tag, changedLangs);

      props.onDismiss(true);
    } else {
      props.onDismiss(false);
    }
  }

  function maybeCloseModal() {
    console.log("close");
    return;

    if (
      formData.langLabel.length > 0 &&
      formData.text.length > 0 &&
      !confirm(
        "You didn't add current template, are you sure you want to exit?",
      )
    ) {
      return;
    }

    props.onDismiss(hasAnyEdited);
  }

  return (
    <div
      class="absolute"
      style="top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; xwidth: 70%; xheight: 400px; z-index: 10;"
    >
      <div class="relative p-4 w-full xmax-w-2xl h-full md:h-auto">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <div class="flex justify-between items-start p-4 rounded-t border-b dark:border-gray-600">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              Edit / Delete Text Template
            </h3>
            <button
              type="button"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              data-modal-toggle="defaultModal"
              onClick={() => maybeCloseModal()}
            >
              <CloseSvg />
              <span class="sr-only">Close modal</span>
            </button>
          </div>

          <div class="py-4 px-6">
            <form class="space-y-6" action="#">
              <div class="flex justify-between">
                <div style="width: 69%">
                  <label
                    for="tag"
                    class="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Tag
                  </label>
                  <input
                    id="tag"
                    style="border: solid 2px rgb(59, 89, 152);"
                    class="rounded block w-full p-2.5"
                    value={formData.tag}
                    readonly
                    required
                  ></input>
                </div>

                <div style="width: 29%">
                  <label
                    for="language"
                    class="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Language ({formData.langs.length})
                  </label>
                  <Dropdown
                    id="language"
                    class="rounded block w-full p-2.5"
                    style="border: solid 2px rgb(59, 89, 152); height: 42px;"
                    onChange={(e) => {
                      setSelectedLangLabel(e.currentTarget.value);
                    }}
                  >
                    <For each={formData.langs}>
                      {(lang) => (
                        <option value={lang.label}>
                          {
                            AllLangs.find(({ code }) => code === lang.label)
                              ?.name
                          }
                        </option>
                      )}
                    </For>
                  </Dropdown>
                </div>
              </div>

              <div>
                <label
                  for="text"
                  class="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                >
                  Text
                </label>
                <textarea
                  id="text"
                  style="border: solid 2px rgb(59, 89, 152);"
                  class="w-full p-2 rounded resize-none"
                  rows="5"
                  onChange={(e) => {
                    const langIdx = formData.langs.findIndex(
                      ({ label }) => label === selectedLangLabel(),
                    );

                    setFormData("langs", langIdx, ({ label }) => ({
                      label,
                      text: e.currentTarget.value,
                    }));
                  }}
                  value={
                    formData.langs.find(
                      ({ label }) => label === selectedLangLabel(),
                    )?.text
                  }
                ></textarea>
              </div>
            </form>
          </div>

          <div class="flex flex-row justify-between items-center p-6 space-x-2 rounded-b border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              class="text-white bg-danger hover:bg-danger-dark font-medium rounded text-sm px-5 py-2.5 text-center disabled:(bg-gray-300 hover:bg-gray-300 cursor-not-allowed)"
              style="width: 18%"
              onClick={handleDelete}
            >
              Delete Template
            </button>

            <button
              type="button"
              class="text-white bg-primary hover:bg-primary-dark font-medium rounded text-sm px-5 py-2.5 text-center disabled:(bg-gray-300 hover:bg-gray-300 cursor-not-allowed)"
              style="width: 18%"
              onClick={handleSave}
              // disabled={isFormSubmittable() === false}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTextTemplateModal;
