import * as React from "react";
import { useState } from "react";
import { Button, Tooltip,message } from "antd";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
    useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { IoChatbubbleEllipses } from "react-icons/io5";

interface HeaderTextShortcutProps {
    confirmationNumber: string;
    clearConfirmationNumber: () => void;
}
export const TextSurveyShortcut: React.FC<HeaderTextShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { emitSendTemplate } = useSocketContext();
    const params = useSearchParams();
    const { data: companyData } = useCompanyControllerGetCompany();

    const handleConfirmSend = async () => {
        if (confirmationNumber !== "") {
            setIsLoading(true);

            try {
                emitSendTemplate({
                    refId: 1,
                    langCode: params.get("lang") || companyData?.defaultLangCode || "en",
                    refType: "TextTemplateMessage",
                    station: Number(params.get("station") ?? 1),
                    directContent: confirmationNumber,
                });
                toast.success("Text sent!", {
                    position: "bottom-right",
                    autoClose: 3000,
                    theme: "colored",
                });
                clearConfirmationNumber();
            } catch (error) {
                console.error("Error sending text:", error);
                toast.error("Failed to send text. Please try again.", {
                    position: "bottom-right",
                    autoClose: 3000,
                    theme: "colored",
                });
            } finally {
                setIsLoading(false);
            }
        } else {
   message.warning('Please enter an identifier or a text');
        }

    };
    return (
        <>
            {/* Trigger Button */}
            <Tooltip title="Display Text" placement="bottom">
                <Button
                    type="primary"
                    icon={<IoChatbubbleEllipses style={{ fontSize: "20px" }} />}
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
