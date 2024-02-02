"use client";

import { useEffect, useRef } from "react";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useMessageStore } from "../../../lib/zustand/store/messageStore";
import { useSearchParams } from "next/navigation";
import { ChatBox } from "../../../components/ChatBox";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useCompanyControllerGetCompany } from "../../../lib/client/api";
import { EndChatIcon } from "../../../components/icons/EndChatIcon";

export default function Dashboard() {
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const params = useSearchParams();
  const { emitSendMessage, emitClearMessage } = useSocketContext();
  const { receivedMessage, receivedType } = useMessageStore();
  const hasHydrated = useHasHydrated();
  const { data: companyData } = useCompanyControllerGetCompany();

  useEffect(() => {
    if (!receivedType) {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    } else if (receivedType === "ChatMessage") {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }
  }, [receivedMessage.length, chatBoxRef.current]);

  const sendMessage = (message: string) => {
    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
    });
  };

  if (hasHydrated) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 p-6">
        <div className="w-6/12 ">
          <ChatBox
            ref={chatBoxRef}
            messages={receivedMessage}
            sendMessage={sendMessage}
          >
            <div className="absolute right-0">
              <button
                onClick={() =>
                  emitClearMessage({
                    station: Number(params.get("station") ?? 1),
                  })
                }
              >
                <div className="mr-2 mt-2 text-white">
                  <EndChatIcon />
                </div>
              </button>
            </div>
          </ChatBox>
        </div>
      </div>
    );
  }

  return <div></div>;
}
