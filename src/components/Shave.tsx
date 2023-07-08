import { createSignal, onMount } from "solid-js";
import type { Component } from "solid-js";

// NOTE From https://github.com/yowainwright/shave/blob/master/src/shave.ts

type Props = {
  text: string;
  maxHeight: number;
  class?: string;
  // MAYBE observeResize?: boolean;
};

function shave(
  el: HTMLParagraphElement,
  text: string,
  maxHeight: number,
): string {
  const textProp = el.textContent === undefined ? "innerText" : "textContent";

  const words = text.split(" ");

  // If 0 or 1 words, we're done
  if (words.length < 2) {
    return text;
  }

  const heightStyle = el.style.height;
  el.style.height = "auto";
  const maxHeightStyle = el.style.maxHeight;
  el.style.maxHeight = "none";

  // If already short enough, we're done
  if (el.offsetHeight <= maxHeight) {
    el.style.height = heightStyle;
    el.style.maxHeight = maxHeightStyle;

    return text;
  }

  let max = words.length - 1;
  let min = 0;
  let pivot;
  while (min < max) {
    pivot = (min + max + 1) >> 1; // eslint-disable-line no-bitwise
    el[textProp] = (words.slice(0, pivot) as string[]).join(" ") as string;
    if (el.offsetHeight > maxHeight) {
      max = pivot - 1;
    } else {
      min = pivot;
    }
  }

  return `${words.slice(0, max).join(" ")}...`;
}

const Shave: Component<Props> = (props) => {
  let el: HTMLParagraphElement;

  const [shavedText, setShavedText] = createSignal<string>("");

  onMount(() => {
    setShavedText(shave(el, props.text, props.maxHeight));

    // MAYBE consider `props.observeResize`
  });

  return (
    <p class={props.class} ref={el}>
      {shavedText() === "" ? (
        props.text
      ) : (
        <>
          <span aria-hidden="true">{shavedText()}</span>
          {/* <span style="display: none;">{props.text}</span> */}
          <span class="sr-only">{props.text}</span>
        </>
      )}
    </p>
  );
};

export default Shave;
