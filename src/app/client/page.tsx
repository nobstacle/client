"use client";

import React, { useEffect, useRef, useState } from "react";
import { Content } from "../../components/pages/client/Content";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { useMessageStore } from "../../lib/zustand/store/messageStore";
import { useSocketContext } from "../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import Modal from "../../components/Modal";
import { useDisclousure } from "../../hooks/useDisclosure";
import { LogoutIcon } from "../../components/icons/sidebar/LogoutIcon";
import { signOut } from "next-auth/react";
import { ErudaContainer } from "../../components/containers/ErudaContainer";
import TestAudioRecorder from "../../components/TestAudioRecorder";

export default function Client() {
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
    <>
      <NetworkStatusIndicator />
      <Content />
      <ClientStationPicker />
    </>
  );
}

const NetworkStatusIndicator = () => {
  const { socketConnected } = useSocketContext();
  const [isOffline, setIsOffline] = useState(false);
  const [isWeak, setIsWeak] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const hadNetworkIssueRef = useRef(false);

  const evaluateStatus = React.useCallback(() => {
    const offline = typeof navigator !== "undefined" ? !navigator.onLine : false;
    setIsOffline(offline);

    let weak = false;
    if (!offline && typeof navigator !== "undefined") {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      const rtt = Number(connection?.rtt);
      const downlink = Number(connection?.downlink);

      weak =
        effectiveType === "slow-2g" ||
        effectiveType === "2g" ||
        (Number.isFinite(rtt) && rtt > 800) ||
        (Number.isFinite(downlink) && downlink > 0 && downlink < 1);
    }

    setIsWeak(weak);

    const currentlyProblematic = offline || weak || !socketConnected;

    if (hadNetworkIssueRef.current && !currentlyProblematic) {
      setShowReconnected(true);
      window.setTimeout(() => setShowReconnected(false), 4000);
    }

    hadNetworkIssueRef.current = currentlyProblematic;
  }, [socketConnected]);

  useEffect(() => {
    evaluateStatus();

    const connection = (navigator as any)?.connection;
    const onConnectivityChange = () => evaluateStatus();

    window.addEventListener("online", onConnectivityChange);
    window.addEventListener("offline", onConnectivityChange);
    connection?.addEventListener?.("change", onConnectivityChange);

    return () => {
      window.removeEventListener("online", onConnectivityChange);
      window.removeEventListener("offline", onConnectivityChange);
      connection?.removeEventListener?.("change", onConnectivityChange);
    };
  }, [evaluateStatus]);

  if (isOffline) {
    return (
      <div className="fixed top-4 right-4 z-[9999] rounded-md bg-red-600 text-white px-3 py-2 text-xs shadow-lg">
        Network unavailable
      </div>
    );
  }

  if (!socketConnected) {
    return (
      <div className="fixed top-4 right-4 z-[9999] rounded-md bg-orange-500 text-white px-3 py-2 text-xs shadow-lg">
        Reconnecting to server
      </div>
    );
  }

  if (isWeak) {
    return (
      <div className="fixed top-4 right-4 z-[9999] rounded-md bg-amber-500 text-white px-3 py-2 text-xs shadow-lg">
        Weak network detected
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed top-4 right-4 z-[9999] rounded-md bg-green-600 text-white px-3 py-2 text-xs shadow-lg">
        Network reconnected
      </div>
    );
  }

  return null;
};

const ClientStationPicker = () => {
  const { clearReceivedContent } = useMessageStore();
  const { emitLeaveChat, socketConnected } = useSocketContext();
  const searchParams = useSearchParams();
  const { isOpen, handleOpen, handleClose } = useDisclousure();
  const fullscreenHoldTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const fullscreenHoldStartRef = useRef<number | null>(null);
  const fullscreenHoldReadyRef = useRef(false);

  const handleLogout = async () => {
    localStorage.clear();
    await signOut({
      redirect: true,
      callbackUrl: "/"
    });
  };

  const clearFullscreenHold = () => {
    if (fullscreenHoldTimerRef.current) {
      window.clearTimeout(fullscreenHoldTimerRef.current);
      fullscreenHoldTimerRef.current = null;
    }

    fullscreenHoldStartRef.current = null;
    fullscreenHoldReadyRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (fullscreenHoldTimerRef.current) {
        window.clearTimeout(fullscreenHoldTimerRef.current);
      }
    };
  }, []);

  const requestClientFullscreen = async () => {
    // Disabled fullscreen mode for now as it causes layout issues with the keyboard on iOS/tablets
    /*
    if (document.fullscreenElement) return;

    try {
      await document.documentElement.requestFullscreen?.({
        navigationUI: "hide",
      } as FullscreenOptions);
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
    }
    */
  };

  const handleFullscreenHoldStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    clearFullscreenHold();
    fullscreenHoldStartRef.current = Date.now();
    fullscreenHoldTimerRef.current = window.setTimeout(() => {
      fullscreenHoldReadyRef.current = true;
      void requestClientFullscreen();
    }, 2000);
  };

  const handleFullscreenHoldEnd = () => {
    const holdStart = fullscreenHoldStartRef.current;
    const heldLongEnough =
      fullscreenHoldReadyRef.current ||
      (holdStart !== null && Date.now() - holdStart >= 2000);

    clearFullscreenHold();

    if (heldLongEnough) {
      void requestClientFullscreen();
    }
  };

  return (
    <>
      <div
        onClick={handleOpen}
        className="fixed z-[9998]"
        style={{ left: '0.5rem', bottom: '0.5rem', height: '4rem', width: '8rem' }}
      >
      </div>
      {/* Fullscreen hold mode disabled for now to prevent keyboard-related layout issues on tablet devices */}
      {/* <div
        className="fixed z-[9998] select-none touch-none"
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={clearFullscreenHold}
        onPointerDown={handleFullscreenHoldStart}
        onPointerLeave={clearFullscreenHold}
        onPointerUp={handleFullscreenHoldEnd}
        style={{ right: '0.5rem', bottom: '0.5rem', height: '4rem', width: '8rem' }}
      /> */}
      <Modal title="" isOpen={isOpen} closeModal={handleClose}>
        <div className="mb-4 flex w-full justify-end ">
          {socketConnected ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">Status: </p>
              <span className="block h-[10px] w-[10px] rounded-full bg-green-600" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">Status: </p>
              <span className="block h-[10px] w-[10px] rounded-full bg-danger-dark" />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col justify-center">
          <StationPicker
            cb={() => {
              clearReceivedContent();
              emitLeaveChat({
                station: Number(searchParams.get("station")) ?? 1,
              });
            }}
          />
        </div>

        <div className="mt-8 flex w-full justify-end gap-2">
          <LogoutIcon />
          <button onClick={handleLogout}>Logout</button>
        </div>
        <hr />

        {process.env.VERCEL_ENV === "preview" && (
          <div className="mt-2">
            <p>Mic test:</p>
            <TestAudioRecorder />
            <ErudaContainer />
          </div>
        )}
      </Modal>
    </>
  );
};
