import {
  MutableRefObject,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { ReceivedMessageContent } from "../constant/types";
import { ChatMessage } from "./ChatMessage";
import React from "react";
import { Button } from "./Button";
import { SendIcon } from "./icons/SendIcon";
import { useSearchParams } from "next/navigation";
import AudioRecorder from "./AudioRecorder";
import { useSession } from "next-auth/react";

interface ChatBoxProps {
  sendMessage: (value: string) => void;
  messages: ReceivedMessageContent[];
  children?: React.ReactNode;
}

export const ChatBox = React.forwardRef<HTMLDivElement, ChatBoxProps>(
  ({ messages, sendMessage, children }, ref) => {
    const params = useSearchParams();
    const [message, setMessage] = useState("");
    const { data } = useSession();
    const userRole = data?.user?.Roles[0];

    // Helper function to determine if message should be on the right
    const isCurrentUserMessage = (messageRole: string) => {
      return messageRole === userRole;
    };

    return (
      <div className="relative flex h-[500px] w-full flex-col ">
        {children}
        <div className="flex w-full flex-grow flex-col overflow-hidden rounded-md bg-primary shadow-xl">
          <div
            ref={ref}
            className="flex h-0 flex-grow flex-col overflow-auto p-4"
          >
            {messages
              .filter(
                ({ station }) => station === Number(params.get("station") ?? 1),
              )
              .map(({ id, message, role }) => (
                <ChatMessage
                  key={id}
                  message={message}
                  isRight={isCurrentUserMessage(role)}
                />
              ))}
          </div>

          <div className="flex items-center justify-start gap-2 bg-gray-300 p-4">
            <input
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.keyCode === 13) {
                  if (e.currentTarget.value) {
                    sendMessage(message);
                    setMessage("");
                  }
                }
              }}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              className="flex h-10 w-full items-center rounded-md px-3 text-sm"
              type="text"
              placeholder="Type your message…"
            />

            <div className="flex gap-2">
              <Button
                className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
                type="button"
                onClick={() => {
                  if (message.trim()) {
                    sendMessage(message);
                    setMessage("");
                  }
                }}
              >
                <SendIcon />
              </Button>
              <AudioRecorder />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ChatBox.displayName = "ChatBox";