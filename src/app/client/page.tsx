"use client";

import React from "react";
import { Content } from "../../components/pages/client/Content";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { useMessageStore } from "../../lib/zustand/store/messageStore";
import { useSocketContext } from "../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import Modal from "../../components/Modal";
import { useDisclousure } from "../../hooks/useDisclosure";

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

  return (
    <>
      <div
        onClick={handleOpen}
        className="fixed bottom-0 left-0 h-8 w-screen"
      />
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
      </Modal>
    </>
  );
};
