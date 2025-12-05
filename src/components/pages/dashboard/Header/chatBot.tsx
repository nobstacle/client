"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, Button, Tooltip } from "antd";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useMessageStore } from "../../../../lib/zustand/store/messageStore";
import { useSearchParams } from "next/navigation";
import { ChatBox } from "../../../../components/ChatBox";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { useCompanyControllerGetCompany } from "../../../../lib/client/api";
import { EndChatIcon } from "../../../../components/icons/EndChatIcon";
import { IoChatbubbles } from "react-icons/io5";

interface ChatBotProps {
  cb?: () => void;
  checkTooltip?: boolean;
}

export const ChatBot: React.FC<ChatBotProps> = ({ cb, checkTooltip = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const params = useSearchParams();
  const { emitSendMessage, emitClearMessage } = useSocketContext();
  const { receivedMessage, receivedType } = useMessageStore();
  const hasHydrated = useHasHydrated();
  const { data: companyData } = useCompanyControllerGetCompany();

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    if (!receivedType || receivedType === "ChatMessage") {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }
  }, [receivedMessage.length, receivedType]);

  // Update chat messages in extension popup
  useEffect(() => {
    if (isInIframe && isModalOpen) {
      const messagesHTML = generateChatMessagesHTML(receivedMessage);
      window.parent.postMessage({
        type: 'CHAT_UPDATE_MESSAGES',
        html: messagesHTML
      }, '*');
    }
  }, [receivedMessage, isInIframe, isModalOpen]);

  // Listen for messages from extension
  useEffect(() => {
    if (!isInIframe) return;

    const handler = (event: MessageEvent) => {
      if (event.data.type === 'CHAT_POPUP_CLOSED') {
        setIsModalOpen(false);
      }
      if (event.data.type === 'CHAT_SEND_MESSAGE') {
        sendMessage(event.data.message);
      }
      if (event.data.type === 'CHAT_CLEAR') {
        handleClearChat();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isInIframe, params, companyData]);

  const generateChatMessagesHTML = (messages: any[]) => {
    if (messages.length === 0) {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
          No messages yet. Start a conversation!
        </div>
      `;
    }

    return messages.map((msg, idx) => {
      const isUser = msg.sender === 'user';
      return `
        <div key="${idx}" style="
          display: flex;
          justify-content: ${isUser ? 'flex-end' : 'flex-start'};
          margin-bottom: 12px;
        ">
          <div style="
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            background: ${isUser ? '#3b5998' : '#f3f4f6'};
            color: ${isUser ? 'white' : '#1f2937'};
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
          ">
            ${msg.message || msg.content || ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const generateChatPopupHTML = () => {
    const messagesHTML = generateChatMessagesHTML(receivedMessage);

    return `
      <div style="display: flex; flex-direction: column; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <!-- Header -->
        <div style="
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
        ">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">Chat Assistant</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="chat-clear-button" style="
              padding: 6px 12px;
              background: transparent;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
              color: #ef4444;
              transition: all 0.2s;
            " onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">
              Clear
            </button>
            <button id="chat-close-button" style="
              width: 32px;
              height: 32px;
              background: transparent;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6b7280;
              transition: all 0.2s;
            " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages Container -->
        <div id="chat-messages-container" style="
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: white;
        ">
          ${messagesHTML}
        </div>

        <!-- Input Area -->
        <div style="
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        ">
          <div style="display: flex; gap: 12px; align-items: flex-end;">
            <textarea id="chat-message-input" placeholder="Type your message..." style="
              flex: 1;
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              font-size: 14px;
              font-family: inherit;
              resize: none;
              min-height: 44px;
              max-height: 120px;
              outline: none;
            " onkeypress="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();document.getElementById('chat-send-button').click();}" onfocus="this.style.borderColor='#3b5998'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
            <button id="chat-send-button" style="
              padding: 12px 24px;
              background: #3b5998;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              white-space: nowrap;
              transition: all 0.2s;
            " onmouseover="this.style.background='#2d4373'" onmouseout="this.style.background='#3b5998'">
              Send
            </button>
          </div>
        </div>
      </div>
    `;
  };

  const showModal = () => {
    setIsModalOpen(true);
    cb?.();

    if (isInIframe && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 600;
      const popupHeight = 500;

      window.parent.postMessage({
        type: 'CHAT_POPUP',
        isOpen: true,
        content: {
          html: generateChatPopupHTML(),
          position: {
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
            width: popupWidth,
            height: popupHeight
          }
        }
      }, '*');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    if (isInIframe) {
      window.parent.postMessage({
        type: 'CHAT_POPUP',
        isOpen: false
      }, '*');
    }
  };

  const sendMessage = (message: string) => {
    emitSendMessage({
      message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
    });
  };

  const handleClearChat = () => {
    emitClearMessage({
      station: Number(params.get("station") ?? 1),
    });
  };

  const chatButton = (
    <Button
      ref={buttonRef}
      type="text"
      icon={<IoChatbubbles className="text-white text-xl" />}
      onClick={showModal}
      className="border-none shadow-none hover:bg-white/20 transition-colors duration-200"
      style={{
        background: "transparent",
        border: "none",
        color: "white",
      }}
    />
  );

  return (
    <>
      {!checkTooltip ? (
        <Tooltip title="Chat" placement="bottom">
          {chatButton}
        </Tooltip>
      ) : (
        chatButton
      )}

      {/* Only render Modal when NOT in iframe */}
      {!isInIframe && (
        <Modal
          title="Chat Assistant"
          open={isModalOpen}
          onCancel={handleCancel}
          footer={null}
          width={800}
          centered
          styles={{
            body: {
              padding: "20px",
              minHeight: "500px",
              maxHeight: "70vh",
            },
          }}
        >
          {hasHydrated ? (
            <div className="flex w-full flex-col items-center justify-center">
              <div className="w-full">
                <ChatBox ref={chatBoxRef} messages={receivedMessage} sendMessage={sendMessage}>
                  <div className="absolute right-0">
                    <button onClick={handleClearChat}>
                      <div className="mr-2 mt-2 text-gray-600 hover:text-red-600 transition-colors">
                        <EndChatIcon />
                      </div>
                    </button>
                  </div>
                </ChatBox>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <span>Loading...</span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};