import * as React from "react";
import { Spinner } from "./Spinner";

export const Button: React.FC<
  React.HTMLProps<HTMLButtonElement> & { isLoading?: boolean }
> = ({ isLoading = false, ...props }) => {
  return (
    <button
      className="border-1 flex justify-center rounded-md border-black  p-2 text-center text-white"
      style={{
        backgroundColor: isLoading ? "gray" : "rgb(59, 89, 152)",
        opacity: isLoading ? 0.5 : 1,
      }}
      {...(props as any)}
    >
      {!isLoading && props.children}
      {isLoading && <Spinner color="fill-white" />}
    </button>
  );
};
