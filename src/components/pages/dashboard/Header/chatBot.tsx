"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, Button, Tooltip, message as antMessage } from "antd";
import { IoChatbubbles, IoMicOutline, IoMicOffOutline } from "react-icons/io5";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useMessageStore } from "../../../../lib/zustand/store/messageStore";

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  originalText: string;
  translatedText?: string;
  originalLang: string;
  targetLang: string;
  timestamp: number;
}

interface ChatBotProps {
  cb?: () => void;
  checkTooltip?: boolean;
}

export const ChatBot: React.FC<ChatBotProps> = ({ cb, checkTooltip = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userLang, setUserLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Add socket and params
  const { emitSendMessage, socketConnected } = useSocketContext();
  const params = useSearchParams();
  const messageStore = useMessageStore();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = userLang;

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsRecording(false);
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
      }
    }
  }, [userLang]);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate translation API call
  const translateText = async (text: string, fromLang: string, toLang: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
      );
      const data = await response.json();
      return data.responseData.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    
    if (!textToSend) {
      antMessage.warning('Please enter a message');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      originalText: textToSend,
      originalLang: userLang,
      targetLang: targetLang,
      timestamp: Date.now()
    };

    try {
      const translated = await translateText(textToSend, userLang, targetLang);
      userMessage.translatedText = translated;
      
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");

      // Simulate response
      setTimeout(async () => {
        const responseText = "Thank you for your message. How can I help you?";
        const translatedResponse = await translateText(responseText, targetLang, userLang);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          originalText: responseText,
          translatedText: translatedResponse,
          originalLang: targetLang,
          targetLang: userLang,
          timestamp: Date.now() + 1
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Failed to send message');
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
        recognitionRef.current.lang = userLang;
        recognitionRef.current.start();
        setIsRecording(true);
        antMessage.info('Listening... Speak now');
      } catch (error) {
        console.error('Error starting recognition:', error);
        antMessage.error('Failed to start speech recognition');
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    antMessage.success('Chat cleared');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateMessagesHTML = () => {
    if (messages.length === 0) {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
          No messages yet. Start a conversation!
        </div>
      `;
    }

    return messages.map(msg => {
      const isUser = msg.sender === 'user';
      return `
        <div style="display: flex; justify-content: ${isUser ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
          <div style="
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            background: ${isUser ? '#3b5998' : '#f3f4f6'};
            color: ${isUser ? 'white' : '#1f2937'};
          ">
            <div style="font-size: 14px; line-height: 1.5; margin-bottom: ${msg.originalText !== msg.translatedText ? '8px' : '0'};">
              ${msg.translatedText || msg.originalText}
            </div>
            ${msg.originalText !== msg.translatedText && msg.translatedText ? `
              <div style="
                font-size: 12px;
                opacity: 0.7;
                font-style: italic;
                border-top: ${isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'};
                padding-top: 6px;
              ">
                Original: ${msg.originalText}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const showModal = () => {
    console.log('[ChatBot] showModal called, isInIframe:', isInIframe);
    
    if (isInIframe && buttonRef.current) {
      console.log('[ChatBot] Sending CHAT_POPUP message to parent');
      // Send message to parent to create chat popup
      const rect = buttonRef.current.getBoundingClientRect();
      console.log('[ChatBot] Button rect:', rect);
      
      const chatHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <!-- Header -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 16px;">Chat Assistant</span>
            <div style="display: flex; gap: 12px; font-size: 12px; color: #666;">
              <span>You: ${userLang.toUpperCase()}</span>
              <span>→</span>
              <span>Customer: ${targetLang.toUpperCase()}</span>
            </div>
          </div>

          <!-- Messages Container -->
          <div id="chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; background: white;">
            ${generateMessagesHTML()}
          </div>

          <!-- Input Area -->
          <div style="padding: 16px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <div style="display: flex; gap: 12px; align-items: flex-end;">
              <textarea
                id="chat-message-input"
                placeholder="Type in ${userLang.toUpperCase()}... (Press Enter to send)"
                style="
                  flex: 1;
                  padding: 12px;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  fontSize: 14px;
                  font-family: inherit;
                  resize: none;
                  min-height: 44px;
                  max-height: 120px;
                  outline: none;
                "
              ></textarea>
              
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
                  padding: 12px;
                  background: transparent;
                  color: #ef4444;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
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
      
      console.log('[ChatBot] ✓ CHAT_POPUP message sent to parent');
    } else {
      console.log('[ChatBot] Opening modal (not in iframe)');
      setIsModalOpen(true);
    }
    cb?.();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

 const renderMessage = (msg: Message) => {
    const isUser = msg.sender === 'user';
    
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isUser ? '#3b5998' : '#f3f4f6',
            color: isUser ? 'white' : '#1f2937'
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            lineHeight: '1.5',
            marginBottom: msg.originalText !== msg.translatedText ? '8px' : '0'
          }}>
            {msg.translatedText || msg.originalText}
          </div>
          
          {msg.originalText !== msg.translatedText && msg.translatedText && (
            <div style={{
              fontSize: '12px',
              opacity: 0.7,
              fontStyle: 'italic',
              borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
              paddingTop: '6px'
            }}>
              Original: {msg.originalText}
            </div>
          )}
        </div>
      </div>
    );
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
        <Tooltip title="Chat with Translation" placement="bottom">
          {chatButton}
        </Tooltip>
      ) : (
        chatButton
      )}

      {!isInIframe && (
        <Modal
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Chat Assistant</span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#666' }}>
                <span>You: {userLang.toUpperCase()}</span>
                <span>→</span>
                <span>Customer: {targetLang.toUpperCase()}</span>
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
              {messages.length === 0 ? (
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
                messages.map(renderMessage)
              )}
            </div>

            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                  placeholder={`Type in ${userLang.toUpperCase()}... (Press Enter to send)`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
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
                    outline: 'none'
                  }}
                />
                
                <button
                  onClick={toggleRecording}
                  style={{
                    padding: '12px',
                    background: isRecording ? '#ef4444' : '#3b5998',
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
                  {isRecording ? (
                    <IoMicOffOutline style={{ fontSize: '20px' }} />
                  ) : (
                    <IoMicOutline style={{ fontSize: '20px' }} />
                  )}
                </button>

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
                    <polygon style={{ fill: 'white' }} points="97.478,235.728 147.096,478.242 512,33.758 "/>
                    <polygon style={{ fill: '#ccc' }} points="251.837,373.231 147.096,478.242 164.932,325.531 231.773,327.360 "/>
                    <polygon style={{ fill: 'white' }} points="512,33.758 109.455,294.271 0,232.606"/>
                    <polygon style={{ fill: 'white' }} points="512,33.758 511.471,35.232 300.246,399.799 164.932,325.531"/>
                  </svg>
                </button>

                <button
                  onClick={handleClearChat}
                  style={{
                    padding: '12px',
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};