"use client";

import React, {  useEffect  } from "react";
import { SocketContextProvider } from "../../context/SocketContextProvider";

function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.add("client-fullscreen");
    body.classList.add("client-fullscreen");

    return () => {
      root.classList.remove("client-fullscreen");
      body.classList.remove("client-fullscreen");
    };
  }, []);

  return (
    <main
      className="flex w-[100dvw] items-stretch justify-stretch overflow-hidden bg-black"
      style={{
        // Use dynamic viewport height and extend behind the iOS home indicator
        // bar (safe-area-inset-bottom) so the black background fills the full
        // screen in PWA / standalone mode on newer iPads.
        minHeight: "100dvh",
        height: "calc(100dvh + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxSizing: "border-box",
      }}
    >
      <SocketContextProvider>{children}</SocketContextProvider>
    </main>
  );
}

export default Layout;
