"use client";
import * as React from "react";

export const ErudaContainer: React.FC = () => {
  React.useEffect(() => {
    import("eruda")
      .then((eruda) => {
        eruda.default.init();
      })
      .catch((err) => console.log("err", err));

    return () => {
      import("eruda")
        .then((eruda) => {
          eruda.default.destroy();
        })
        .catch((err) => console.log("err", err));
    };
  }, []);

  return null;
};
