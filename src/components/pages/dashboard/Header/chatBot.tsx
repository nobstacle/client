"use client"

import { useState, useEffect, useRef } from "react";
import { Modal, Button, Tooltip } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useMessageStore } from "../../../../lib/zustand/store/messageStore";
import { useSearchParams } from "next/navigation";
import { ChatBox } from "../../../../components/ChatBox";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { useCompanyControllerGetCompany } from "../../../../lib/client/api";
import { EndChatIcon } from "../../../../components/icons/EndChatIcon";
import { IoChatbubbleEllipses } from "react-icons/io5";

export const ChatBot: React.FC<{ cb?: () => void }> = ({ cb }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const showModal = () => {
        setIsModalOpen(true);
        if (cb) cb();
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const sendMessage = (message: string) => {
        emitSendMessage({
            message: message,
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

    return (
        <>
            <Tooltip title="Chatbot" placement="bottom">
                <Button
                    type="text"
                    icon={<IoChatbubbleEllipses className="text-white text-xl" />}
                    onClick={showModal}
                    className="border-none shadow-none hover:bg-white/20 transition-colors duration-200"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white'
                    }}
                />
            </Tooltip>
            <Modal
                title="Chat Assistant"
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={800}
                centered
                styles={{
                    body: {
                        padding: '20px',
                        minHeight: '500px',
                        maxHeight: '70vh'
                    }
                }}
            >
                {hasHydrated ? (
                    <div className="flex w-full flex-col items-center justify-center">
                        <div className="w-full">
                            <ChatBox
                                ref={chatBoxRef}
                                messages={receivedMessage}
                                sendMessage={sendMessage}
                            >
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
        </>
    );
};