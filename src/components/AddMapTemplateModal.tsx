import { Component, createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"

import CloseSvg from "../svg/close.svg"
import TickSvg from "../svg/tick.svg"
import MapView, { RouteOpts } from "./MapView"

type Props = {
  mapElID: string
  origin: string

  onDismiss: (hasAnyAdded: boolean) => void
}

type FormFields = {
  tag: string
  origin: string
  destination: string
}

const AddMapTemplateModal: Component<Props> = (props) => {
  const [formData, setFormData] = createStore<FormFields>({
    tag: "",
    origin: props.origin, // FIXME decide if this is ecesasry or ""???
    destination: ""
  })

  const [message, setMessage] = createSignal<string>("")
  const [drawnRoute, setDrawnRoute] = createSignal<RouteOpts>()

  // const [mapOriginProp, setMapOriginProp] = createSignal<string>(props.origin);
  // const [mapDestinationProp, setMapDestinationProp] = createSignal<string>("");

  const isFormSubmittable = createMemo(
    () =>
      formData.tag.length > 0 &&
      formData.origin.length > 0 &&
      formData.destination.length > 0 &&
      !!drawnRoute()
  )

  function handleRouteDraw(opts: RouteOpts) {
    setDrawnRoute(opts)
  }

  let hasAnyAdded = false

  function handleAdd() {
    debugger // TODO
  }

  function maybeCloseModal() {
    if (
      (formData.tag.length > 0 ||
        // formData.origin.length > 0 ||
        formData.destination.length > 0) &&
      !confirm(
        "You didn't add current template, are you sure you want to exit?"
      )
    ) {
      return
    }

    props.onDismiss(hasAnyAdded)
  }

  return (
    <div
      className="absolute"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "800px",
        height: "400px",
        zIndex: "10"
      }}
    >
      <div className="relative p-4 w-full xmax-w-2xl h-full md:h-auto">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <div className="flex justify-between items-start p-4 rounded-t border-b dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New Map Template
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              data-modal-toggle="defaultModal"
              onClick={maybeCloseModal}
            >
              <CloseSvg />
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <div className="py-4 px-6">
            <form className="space-y-6" action="#">
              <div className="flex justify-between">
                <div style="width: 32%">
                  <label
                    for="tag"
                    className="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Tag
                  </label>
                  <input
                    id="tag"
                    style="border: solid 2px rgb(59, 89, 152);"
                    className="rounded block w-full p-2.5"
                    onInput={(e) => {
                      setFormData("tag", e.currentTarget.value)
                      setMessage("")
                    }}
                    value={formData.tag}
                    autofocus
                    required
                  ></input>
                </div>

                <div style="width: 32%">
                  <label
                    for="origin"
                    className="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Origin
                  </label>
                  <input
                    id="origin"
                    style="border: solid 2px rgb(59, 89, 152);"
                    className="rounded block w-full p-2.5"
                    onInput={(e) => {
                      setMessage("")
                    }}
                    onChange={(e) => {
                      // setMapOriginProp(e.currentTarget.value);
                      setFormData("origin", e.currentTarget.value)
                    }}
                    value={formData.origin}
                    autofocus
                    required
                  ></input>
                </div>

                <div style="width: 32%">
                  <label
                    for="destination"
                    className="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                  >
                    Destination
                  </label>
                  <input
                    id="destination"
                    style="border: solid 2px rgb(59, 89, 152);"
                    className="rounded block w-full p-2.5"
                    onInput={(e) => {
                      setMessage("")
                    }}
                    onChange={(e) => {
                      // setMapDestinationProp(e.currentTarget.value)
                      setFormData("destination", e.currentTarget.value)
                    }}
                    value={formData.destination}
                    autofocus
                    required
                  ></input>
                </div>
              </div>

              <div>
                <label
                  for={props.mapElID}
                  className="block mb-2 font-medium text-gray-900 dark:text-gray-300"
                >
                  Map
                </label>
                <MapView
                  id={props.mapElID}
                  onDrawRoute={handleRouteDraw}
                  showInputs={false}
                  // origin={mapOriginProp}
                  // destination={mapDestinationProp}
                  origin={() => formData.origin}
                  destination={() => formData.destination}
                />
              </div>
            </form>
          </div>

          <div className="flex flex-row-reverse justify-between items-center p-6 space-x-2 rounded-b border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              className="text-white bg-primary hover:bg-primary-dark font-medium rounded text-sm px-5 py-2.5 text-center disabled:(bg-gray-300 hover:bg-gray-300 cursor-not-allowed)"
              style="width: 13%"
              onClick={handleAdd}
              disabled={isFormSubmittable() === false}
            >
              Add
            </button>

            <Show when={message().length > 0}>
              <p style="color: #2b632c;" className="font-medium">
                <TickSvg />
                &nbsp;
                <span>{message}</span>
              </p>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddMapTemplateModal
