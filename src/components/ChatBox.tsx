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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Helper function to determine if message should be on the right
    const isCurrentUserMessage = (messageRole: string) => {
      return messageRole === userRole;
    };

    // No auto-resize - keeping fixed height with internal scrolling

    const handleSendMessage = () => {
      if (message.trim()) {
        sendMessage(message);
        setMessage("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Allow new line with Shift+Enter
          return;
        } else {
          // Send message with Enter
          e.preventDefault();
          handleSendMessage();
        }
      }
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

          <div className="flex items-end justify-start gap-2 bg-gray-300 p-4">
            <textarea
              ref={textareaRef}
              onKeyDown={handleKeyDown}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-[40px] w-full resize-none overflow-y-auto rounded-md px-3 py-2 text-sm leading-5"
              placeholder="Type your message"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 transparent'
              }}
            />

            <div className="flex gap-2">
              <Button
                className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
                type="button"
                onClick={handleSendMessage}
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