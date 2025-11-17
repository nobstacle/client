import * as React from "react";
import { useState } from "react";
import { Modal, Input, Button, Tooltip } from "antd";
import { FaSmile } from "react-icons/fa";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FaCircle } from "react-icons/fa6";

interface HeaderRecordingShortcutProps {
    confirmationNumber: string;
    clearConfirmationNumber: () => void;
}
export const HeaderRecordingShortcut: React.FC<HeaderRecordingShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { emitSendRecording } = useSocketContext();
    const params = useSearchParams();

    const handleConfirmSend = async () => {
        setIsLoading(true);
        try {
            emitSendRecording({
                tag: confirmationNumber.trim(),
                station: params.get("station") ? Number(params.get("station")) : 1,
                langCode: params.get("lang") || "en",
            });

            toast.success("Survey sent successfully!", {
                position: "bottom-right",
                autoClose: 3000,
                theme: "colored",
            });
            clearConfirmationNumber();
        } catch (error) {
            console.error("Error sending survey:", error);
            toast.error("Failed to send survey. Please try again.", {
                position: "bottom-right",
                autoClose: 3000,
                theme: "colored",
            });
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <>
            {/* Trigger Button */}
            <Tooltip title="Send Recording" placement="bottom">
                <Button
                    type="primary"
                    icon={<FaCircle style={{ fontSize: "20px" }} />}
                    onClick={handleConfirmSend}
                    className="flex items-center justify-center customHeaderButton"
                    style={{
                        backgroundColor: "#3b5998",
                        border: "none",
                        height: "40px",
                    }}
                />
            </Tooltip>
        </>
    )
}
