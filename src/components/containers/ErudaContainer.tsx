"use client";
import * as React from "react";

export const ErudaContainer: React.FC = () => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
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
