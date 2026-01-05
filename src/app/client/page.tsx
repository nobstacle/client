"use client";

import React from "react";
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
  return (
    <>
      <Content />
      <ClientStationPicker />
    </>
  );
}

const ClientStationPicker = () => {
  const { clearReceivedContent } = useMessageStore();
  const { emitLeaveChat, socketConnected } = useSocketContext();
  const searchParams = useSearchParams();
  const { isOpen, handleOpen, handleClose } = useDisclousure();

    const handleLogout = async () => {
        localStorage.clear();
        await signOut({
            redirect: true,
            callbackUrl: "/"
        });
    };

  return (
    <>
      <div
        onClick={handleOpen}
        className="fixed"
        style={{ left: '0.5rem', bottom: '0.5rem', height: '4rem', width: '8rem' }}
      >
      </div>
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
