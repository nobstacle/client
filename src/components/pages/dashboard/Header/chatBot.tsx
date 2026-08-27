"use client";

import React, {  useState, useEffect, useRef  } from "react";
import { Modal, Button, Tooltip, message as antMessage } from "antd";
import { IoChatbubbles, IoMicOutline, IoMicOffOutline } from "react-icons/io5";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useMessageStore } from "../../../../lib/zustand/store/messageStore";
import { useCompanyControllerGetCompany, getCompanyControllerGetCompanyQueryKey } from '../../../../lib/client/api';
import { useSession } from "next-auth/react";
import AudioRecorder from "../../../../components/AudioRecorder";
import { resolveActiveStation } from "../../../../utils/station";

interface ChatBotProps {
  cb?: () => void;
  checkTooltip?: boolean;
  isMobile: boolean;
  compactDesktop?: boolean;
}

export const ChatBot: React.FC<ChatBotProps> = ({ cb, checkTooltip = true, isMobile, compactDesktop = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);


  const { emitSendMessage, emitClearMessage, emitLeaveChat, socketConnected } = useSocketContext();
  const params = useSearchParams();
  // Subscribe only to the slices used here so the chat panel does not re-render
  // on every unrelated message-store change.
  const receivedMessage = useMessageStore((s) => s.receivedMessage);
  const clearReceivedContent = useMessageStore((s) => s.clearReceivedContent);
  const resetMessages = useMessageStore((s) => s.reset);
  const { data: session } = useSession();
  const { data: companyData } = useCompanyControllerGetCompany({
    query: {
      queryKey: getCompanyControllerGetCompanyQueryKey(),
      staleTime: Infinity,
      gcTime: Infinity,
    }
  });

  const userRole = session?.user?.Roles?.[0];
  const currentUserDefaultLang = companyData?.defaultLangCode || 'en';
  const selectedLang = params.get("lang") || currentUserDefaultLang;
  const [currentStation, setCurrentStation] = useState<number>(1);

  // Sync station from URL or localStorage initially and when search params change
  useEffect(() => {
    const getInitialStation = () =>
      resolveActiveStation({ searchParams: params });
    setCurrentStation(getInitialStation());
  }, [params]);

  // Sync station from events or other tabs/storage updates reactively
  useEffect(() => {
    const handleStationChange = (event: CustomEvent) => {
      const newStation = Number(event.detail.station);
      console.log('[ChatBot] 📡 Station changed via event:', newStation);
      setCurrentStation(newStation);
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nobstacle_selected_station' && e.newValue) {
        const newStation = Number(e.newValue);
        console.log('[ChatBot] 📡 Station changed via storage:', newStation);
        setCurrentStation(newStation);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const stationMessages = receivedMessage.filter(
    (msg) => Number(msg.station) === Number(currentStation)
  );

  // Initialize speech recognition - ALWAYS use English
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          // ALWAYS use English for speech recognition
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
            setIsRecording(false);

            if (isInIframe) {
              // Send the English transcription back to extension
              window.parent.postMessage({
                type: 'CHAT_RECORDING_RESULT',
                text: transcript
              }, '*');
            }

            // Send English message - backend handles translation
            await handleSendMessage(transcript);
          };

          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            antMessage.error('Speech recognition failed. Please try again.');
            setIsRecording(false);
          };

          recognitionRef.current.onend = () => {
            setIsRecording(false);
          };
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }
    }
  }, [isInIframe]);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [stationMessages]);

  // Listen for recording state from extension
  useEffect(() => {
    if (!isInIframe) return;

    const handler = (event: MessageEvent) => {
      if (event.data.type === 'CHAT_TOGGLE_RECORDING') {
        toggleRecording();
      }

      if (event.data.type === 'CHAT_CLEAR') {
        handleClearChat();
      }

      if (event.data.type === 'CHAT_END_SESSION') {
        handleEndSession();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isInIframe, isRecording]);

  // Send recording state to extension
  useEffect(() => {
    if (isInIframe && isModalOpen) {
      window.parent.postMessage({
        type: 'CHAT_RECORDING_STATE',
        isRecording: isRecording
      }, '*');
    }
  }, [isRecording, isInIframe, isModalOpen]);

  // Update iframe popup messages
  useEffect(() => {
    if (isInIframe) {
      updateChatPopupMessages();
    }
  }, [stationMessages.length, isInIframe, currentStation]);

  const isCurrentUserMessage = (messageRole: string) => {
    return messageRole === userRole;
  };

  const getDisplayMessage = (messageObj: any) => {
    const { message, originalMessage, role, adminMessage, clientMessage } = messageObj;
    const isViewerAdmin = ['Admin', 'Staff', 'SAdmin'].includes(userRole);

    if (isViewerAdmin) {
      return adminMessage || originalMessage || message;
    } else {
      return clientMessage || originalMessage || message;
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();

    if (!textToSend) {
      antMessage.warning('Please enter a message');
      return;
    }

    if (!socketConnected) {
      antMessage.warning('Connection not ready, please try again');
      return;
    }

    const selectedLang = params.get("lang") || currentUserDefaultLang;

    try {
      // Send English message with selected language code
      // Backend handles translation
      emitSendMessage({
        message: textToSend,
        station: currentStation,
        refType: "ChatMessage",
        langCode: selectedLang,
      });

      setInputValue("");

    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Failed to send message');
    }
  };

  const handleEndSession = () => {
    try {
      emitLeaveChat({
        station: currentStation,
      });
      clearReceivedContent();
      antMessage.success('Session ended successfully');
      handleCancel();
    } catch (error) {
      console.error('Error ending session:', error);
      antMessage.error('Failed to end session');
    }
  };

  const handleClearChat = () => {
    resetMessages();

    try {
      emitClearMessage({
        station: currentStation,
      });

      setInputValue("");

      if (isInIframe) {
        const emptyStateHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
          No messages yet. Start a conversation!
        </div>
      `;

        window.parent.postMessage({
          type: 'CHAT_UPDATE_MESSAGES',
          html: emptyStateHTML
        }, '*');
      }

      antMessage.success('Chat cleared');

    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      antMessage.error('Speech recognition is not supported in this browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        // ALWAYS use English for speech recognition
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.start();
        setIsRecording(true);
        antMessage.info('Listening... Speak in English');
      } catch (error) {
        console.error('Error starting recognition:', error);
        antMessage.error('Failed to start speech recognition');
      }
    }
  };

  const updateChatPopupMessages = () => {
    if (!isInIframe) return;

    const messagesHTML = stationMessages.length === 0 ? `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
        No messages yet. Start a conversation!
      </div>
    ` : stationMessages.map(messageObj => {
      const isRight = isCurrentUserMessage(messageObj.role);
      const displayMessage = getDisplayMessage(messageObj);

      return `
        <div style="display: flex; justify-content: ${isRight ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
          <div style="
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            background: ${isRight ? '#3b5998' : '#f3f4f6'};
            color: ${isRight ? 'white' : '#1f2937'};
            word-wrap: break-word;
          ">
            <div style="font-size: 14px; line-height: 1.5;">
              ${displayMessage}
            </div>
            // ${messageObj.originalMessage && messageObj.originalMessage !== displayMessage ? `
            //   <div style="
            //     font-size: 12px;
            //     opacity: 0.7;
            //     font-style: italic;
            //     border-top: ${isRight ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'};
            //     padding-top: 6px;
            //     margin-top: 6px;
            //   ">
            //     Original: ${messageObj.originalMessage}
            //   </div>
            // ` : ''}
          </div>
        </div>
      `;
    }).join('');

    window.parent.postMessage({
      type: 'CHAT_UPDATE_MESSAGES',
      html: messagesHTML
    }, '*');
  };

  const generateMessagesHTML = () => {
    if (stationMessages.length === 0) {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
          No messages yet. Start a conversation!
        </div>
      `;
    }

    return stationMessages.map(messageObj => {
      const isRight = isCurrentUserMessage(messageObj.role);
      const displayMessage = getDisplayMessage(messageObj);

      return `
        <div style="display: flex; justify-content: ${isRight ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
          <div style="
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            background: ${isRight ? '#3b5998' : '#f3f4f6'};
            color: ${isRight ? 'white' : '#1f2937'};
            word-wrap: break-word;
          ">
            <div style="font-size: 14px; line-height: 1.5;">
              ${displayMessage}
            </div>
            // ${messageObj.originalMessage && messageObj.originalMessage !== displayMessage ? `
            //   <div style="
            //     font-size: 12px;
            //     opacity: 0.7;
            //     font-style: italic;
            //     border-top: ${isRight ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'};
            //     padding-top: 6px;
            //     margin-top: 6px;
            //   ">
            //     Original: ${messageObj.originalMessage}
            //   </div>
            // ` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const showModal = () => {
    if (isInIframe && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      const chatHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 16px; color: #000;">Chat Assistant</span>
          </div>

          <div id="chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; background: white;">
            ${generateMessagesHTML()}
          </div>

          <div style="padding: 16px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <div style="display: flex; gap: 12px; align-items: flex-end;">
              <textarea
                id="chat-message-input"
                placeholder="Type your message... (Shift+Enter for new line)"
                style="
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
                  color: #fff;
                  scrollbar-width: thin;
                  scrollbar-color: #888 transparent;
                "
              ></textarea>
              
              <button
                id="chat-mic-button"
                style="
                  padding: 12px;
                  background: #3b5998;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-width: 44px;
                  transition: all 0.2s;
                "
                data-recording="false"
              >
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>

              <button
                id="chat-send-button"
                style="
                  padding: 12px;
                  background: #3b5998;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-width: 44px;
                  transition: all 0.2s;
                "
              >
                <svg viewBox="0 0 512 512" style="width: 20px; height: 20px;">
                  <polygon style="fill: white;" points="97.478,235.728 147.096,478.242 512,33.758 "/>
                  <polygon style="fill: #ccc;" points="251.837,373.231 147.096,478.242 164.932,325.531 231.773,327.360 "/>
                  <polygon style="fill: white;" points="512,33.758 109.455,294.271 0,232.606"/>
                  <polygon style="fill: white;" points="512,33.758 511.471,35.232 300.246,399.799 164.932,325.531"/>
                </svg>
              </button>

              <button
                id="chat-clear-button"
                style="
                  padding: 8px 16px;
                  background: transparent;
                  color: #ef4444;
                  border: 1px solid #ef4444;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  transition: all 0.2s;
                "
              >
                Clear
              </button>

              <button
                id="chat-close-button"
                style="
                  padding: 12px;
                  background: transparent;
                  color: #6b7280;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  transition: all 0.2s;
                "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      window.parent.postMessage({
        type: 'CHAT_POPUP',
        isOpen: true,
        content: {
          html: chatHTML,
          position: {
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
            width: 600,
            height: 500
          }
        }
      }, '*');

      setIsModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
    cb?.();
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

  const renderMessage = (messageObj: any) => {
    const isRight = isCurrentUserMessage(messageObj.role);
    const displayMessage = getDisplayMessage(messageObj);

    return (
      <div
        key={messageObj.id}
        style={{
          display: 'flex',
          justifyContent: isRight ? 'flex-end' : 'flex-start',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isRight ? '#3b5998' : '#f3f4f6',
            color: isRight ? 'white' : '#1f2937',
            wordWrap: 'break-word'
          }}
        >
          <div style={{
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: messageObj.originalMessage && messageObj.originalMessage !== displayMessage ? '8px' : '0'
          }}>
            {displayMessage}
          </div>
        </div>
      </div>
    );
  };

  const chatButton = (
    <Button
      ref={buttonRef}
      type="text"
      icon={<IoChatbubbles className={`text-white ${compactDesktop ? 'text-lg' : 'text-xl'}`} />}
      onClick={showModal}
      className={isMobile ? "flex items-center justify-center customHeaderButtonMobile " : "flex items-center justify-center customHeaderButton"}
      style={{
        background: isMobile ? "#3b5998" : "transparent",
        border: "none",
        color: "white",
        height: isMobile ? "40px" : compactDesktop ? "36px" : "auto",
        width: isMobile ? "40px" : compactDesktop ? "36px" : "auto",
        ...(isMobile && { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }), 
      }}
    />
  );

  return (
    <>
      {!checkTooltip ? (
        <Tooltip title="Chat with Translation" placement="bottom">
          {chatButton}
        </Tooltip>
      ) : (
        chatButton
      )}

      {!isInIframe && (
        <Modal
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '2rem' }}>
              <span>Chat Assistant</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Station {currentStation}</span>
              </div>
            </div>
          }
          open={isModalOpen}
          onCancel={handleCancel}
          footer={null}
          width={800}
          centered
          styles={{
            body: {
              padding: "0",
              height: "600px",
              display: "flex",
              flexDirection: "column"
            },
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}>
            <div
              ref={chatBoxRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: 'white'
              }}
            >
              {stationMessages.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  No messages yet. Start a conversation!
                </div>
              ) : (
                stationMessages.map(renderMessage)
              )}
            </div>

            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                  ref={textareaRef}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: '44px',
                    maxHeight: '120px',
                    outline: 'none',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#888 transparent'
                  }}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleSendMessage()}
                    style={{
                      padding: '12px',
                      background: '#3b5998',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
                      <polygon style={{ fill: 'white' }} points="97.478,235.728 147.096,478.242 512,33.758 " />
                      <polygon style={{ fill: '#ccc' }} points="251.837,373.231 147.096,478.242 164.932,325.531 231.773,327.360 " />
                      <polygon style={{ fill: 'white' }} points="512,33.758 109.455,294.271 0,232.606" />
                      <polygon style={{ fill: 'white' }} points="512,33.758 511.471,35.232 300.246,399.799 164.932,325.531" />
                    </svg>
                  </button>

                  <AudioRecorder
                    mode="header"
                    activeLangCode={selectedLang}
                    station={currentStation}
                    onTranscription={(text) => setInputValue(text)}
                  />
                </div>

                <button
                  onClick={handleClearChat}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
