import * as React from "react";
import { useState } from "react";
import { Button, Tooltip, message } from "antd";
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
    checkTooltip: boolean;
    isMobile: boolean
}
export const TextSurveyShortcut: React.FC<HeaderTextShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber,
    checkTooltip,
    isMobile
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
                if (!checkTooltip) {
                    toast.success("Text sent!", {
                        position: "bottom-right",
                        autoClose: 3000,
                        theme: "colored",
                    });
                }

                clearConfirmationNumber();
            } catch (error) {
                console.error("Error sending text:", error);
                if (!checkTooltip) {
                    toast.error("Failed to send text. Please try again.", {
                        position: "bottom-right",
                        autoClose: 3000,
                        theme: "colored",
                    });
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            message.warning('Please enter an identifier or a text');
        }

    };
    return (
        <>
            {!checkTooltip ? (
                <Tooltip title="Display Text" placement="bottom">
                    <Button
                        type="primary"
                        icon={<IoChatbubbleEllipses style={{ fontSize: "20px" }} />}
                        onClick={handleConfirmSend}
                        className={isMobile ? "flex items-center justify-center customHeaderButtonMobile" : "flex items-center justify-center customHeaderButton"}
                        style={{
                            backgroundColor: "#3b5998",
                            border: "none",
                            height: "40px",
                        }}
                    />
                </Tooltip>
            ) : (
                <Button
                    type="primary"
                    icon={<IoChatbubbleEllipses style={{ fontSize: "20px" }} />}
                    onClick={handleConfirmSend}
                    className={isMobile ? "flex items-center justify-center customHeaderButtonMobile" : "flex items-center justify-center customHeaderButton"}
                    style={{
                        backgroundColor: "#3b5998",
                        border: "none",
                        height: "40px",
                    }}
                />
            )}
        </>
    )
}
