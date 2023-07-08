import { Component, Show, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";

// FIXME rename this component to `AddTextTemplateModal`
import { addTextTemplate } from "../services/company";
import CloseSvg from "../svg/close.svg";
import TickSvg from "../svg/tick.svg";
import AllLanguagesDropdown from "./Header/AllLanguagesDropdown";

type Props = {
  companyDefaultLangLabel: string;

  onDismiss: (hasAnyAdded: boolean) => void;
};

type FormFields = {
  tag: string;
  langLabel: string;
  text: string;
};

const TextTemplateForm: Component<Props> = (props) => {
  const [formData, setFormData] = createStore<FormFields>({
    tag: "",
    langLabel: props.companyDefaultLangLabel,
    text: "",
  });

  const [message, setMessage] = createSignal<string>("");

  const isFormSubmittable = createMemo(
    () =>
      formData.tag.length > 0 &&
      formData.langLabel.length > 0 &&
      formData.text.length > 0,
  );

  let hasAnyAdded = false;

  function handleAdd() {
    // TODO notify parent that a new text template has been added
    // console.log(formData.tag, formData.langLabel, formData.text);
    addTextTemplate("FIXME_some_token", {
      tag: formData.tag,
      langLabel: formData.langLabel,
      text: formData.text.replaceAll("\n", "<br>"),
    }).then((_res) => {
      hasAnyAdded = true;
      setMessage("Congratulations, a new text template has been created.");

      setFormData("langLabel", "");
      setFormData("text", "");
      // TODO focus language selector
    });
  }

  function maybeCloseModal() {
    if (
      formData.langLabel.length > 0 &&
      formData.text.length > 0 &&
      !confirm(
        "You didn't add current template, are you sure you want to exit?",
      )
    ) {
      return;
    }

    props.onDismiss(hasAnyAdded);
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
              Add New Text Template
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
                    onInput={(e) => {
                      setFormData("tag", e.currentTarget.value);
                      setMessage("");
                    }}
                    value={formData.tag}
                    autofocus
                    required
                  ></input>
                </div>

                <div style="width: 29%">
                  <label
                    for="language"
                    class="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Language
                  </label>
                  {/* <input
                    id="language"
                    style="border: solid 2px rgb(59, 89, 152);"
                    class="rounded block w-full p-2.5"
                    required
                  ></input> */}
                  <AllLanguagesDropdown
                    id="language"
                    class="rounded block w-full p-2.5"
                    style="border: solid 2px rgb(59, 89, 152); height: 42px;"
                    emptyValueText="Select Language"
                    selectedValue={formData.langLabel}
                    onChange={(e) => {
                      setFormData("langLabel", e.currentTarget.value);
                      setMessage("");
                    }}
                  />
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
                  onInput={(e) => {
                    setFormData("text", e.currentTarget.value);
                    setMessage("");
                  }}
                  value={formData.text}
                ></textarea>
              </div>
            </form>
          </div>

          <div class="flex flex-row-reverse justify-between items-center p-6 space-x-2 rounded-b border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              class="text-white bg-primary hover:bg-primary-dark font-medium rounded text-sm px-5 py-2.5 text-center disabled:(bg-gray-300 hover:bg-gray-300 cursor-not-allowed)"
              style="width: 13%"
              onClick={handleAdd}
              disabled={isFormSubmittable() === false}
            >
              Add
            </button>

            <Show when={message().length > 0}>
              <p style="color: #2b632c;" class="font-medium">
                <TickSvg />
                &nbsp;
                <span>{message}</span>
              </p>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextTemplateForm;
