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

    // Get user's default language from localStorage or session
    let companyData = JSON.parse(localStorage?.getItem('company-storage') || '{}');
    let currentUserDefaultLang = companyData?.state?.company?.defaultLangCode || 'en';

    // Helper function to determine if message should be on the right
    const isCurrentUserMessage = (messageRole: string) => {
      return messageRole === userRole;
    };

    // Function to determine which message to display based on current user's role
    const getDisplayMessage = (messageObj: ReceivedMessageContent) => {
      const { message, originalMessage, role } = messageObj;

      // If current user is Admin
      if (userRole === 'Admin') {

        // Show own messages in English (originalMessage)
        if (role === 'Admin') {
          return originalMessage || message;
        }
        else {
          return message;
        }
      }
      // If current user is Guest/User
      else {
        // Show own messages in their language (originalMessage)
        if (role === 'User') {
          return originalMessage || message;
        }
        // Show admin messages in their language (translated to their language)
        else {
          return message;
        }
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
                        console.info("2",messages);
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
              .map((messageObj) => (
                <ChatMessage
                  key={messageObj.id}
                  message={getDisplayMessage(messageObj)}
                  isRight={isCurrentUserMessage(messageObj.role)}
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
              placeholder="Message"
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