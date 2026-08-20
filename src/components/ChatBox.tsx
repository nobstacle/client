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
  activeLangCode?: string;
  station?: number;
  mode?: "client" | "header";
}

export const ChatBox = React.forwardRef<HTMLDivElement, ChatBoxProps>(
  ({ messages, sendMessage, children, activeLangCode, station, mode }, ref) => {
    const [viewportHeight, setViewportHeight] = useState<number>(0);
    const params = useSearchParams();
    const [message, setMessage] = useState("");
    const { data } = useSession();
    const userRole = data?.user?.Roles[0];
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Get user's default language from localStorage or session
    let companyData = JSON.parse(localStorage?.getItem('company-storage') || '{}');
    let currentUserDefaultLang = companyData?.state?.company?.defaultLangCode || 'en';

    // Helper function to determine if message should be on the right
    const isCurrentUserMessage = (messageRole: string) => {
      return messageRole === userRole;
    };

    // Function to determine which message to display based on current user's role and translation rules
    const getDisplayMessage = (messageObj: ReceivedMessageContent) => {
      const { message, originalMessage, role, adminMessage, clientMessage } = messageObj;
      const isViewerAdmin = ['Admin', 'Staff', 'SAdmin'].includes(userRole);

      if (isViewerAdmin) {
        // Rule 1: Always render adminMessage for Admin/Staff viewer
        return adminMessage || originalMessage || message;
      } else {
        // Customer Viewer
        return clientMessage || originalMessage || message;
      }
    };

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

    useEffect(() => {
      const updateViewportHeight = () => {
        const height = window.visualViewport?.height || window.innerHeight;
        setViewportHeight(height);
      };

      updateViewportHeight();
      window.addEventListener("resize", updateViewportHeight);
      window.visualViewport?.addEventListener("resize", updateViewportHeight);
      window.visualViewport?.addEventListener("scroll", updateViewportHeight);

      return () => {
        window.removeEventListener("resize", updateViewportHeight);
        window.visualViewport?.removeEventListener("resize", updateViewportHeight);
        window.visualViewport?.removeEventListener("scroll", updateViewportHeight);
      };
    }, []);

    return (
      <div
        className="density-chatbox relative flex h-full min-h-[360px] w-full flex-col"
        style={{
          maxHeight: viewportHeight ? Math.max(360, viewportHeight - 48) : undefined,
        }}
      >
        {children}
        <div className="flex w-full flex-grow flex-col overflow-hidden rounded-md bg-primary shadow-xl">
          <div
            ref={ref}
            className="density-chatbox-messages flex h-0 flex-grow flex-col overflow-auto p-4"
          >
            {messages
              .filter(
                ({ station }) => station === Number(params.get("station") ?? 1),
              )
              .map((messageObj) => (
                <ChatMessage
                  key={messageObj.id}
                  message={getDisplayMessage(messageObj)}
                  isRight={isCurrentUserMessage(messageObj.role)}
                />
              ))}
          </div>

          <div className="density-chatbox-actions flex items-end justify-start gap-2 bg-gray-300 p-4">
            <textarea
              ref={textareaRef}
              onKeyDown={handleKeyDown}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => textareaRef.current?.scrollIntoView({ block: "center" })}
              onBlur={() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  document.body.scrollTop = 0;
                }, 100);
              }}
              className="density-chatbox-input h-[44px] w-full resize-none overflow-y-auto rounded-md px-3 py-2 text-sm leading-5"
              placeholder="Message"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 transparent'
              }}
            />

            <div className="flex shrink-0 gap-2">
              <Button
                className="border-1 flex min-h-[44px] min-w-[56px] justify-center rounded-md border-black p-2 text-center text-white"
                type="button"
                onClick={handleSendMessage}
              >
                <SendIcon />
              </Button>
              <AudioRecorder
                mode={mode || "client"}
                activeLangCode={activeLangCode}
                station={station}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ChatBox.displayName = "ChatBox";
