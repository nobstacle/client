import * as React from "react";
import { useState } from "react";
import { Button, Tooltip } from "antd";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
    useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import {
    IoGlobe,
} from 'react-icons/io5';

interface HeaderWebsiteShortcutProps {
    confirmationNumber: string;
    clearConfirmationNumber: () => void;
}
export const WebsiteShortcut: React.FC<HeaderWebsiteShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { emitSendTemplate } = useSocketContext();
    const params = useSearchParams();
    const { data: companyData } = useCompanyControllerGetCompany();

    const handleConfirmSend = async () => {
        setIsLoading(true);
        try {
            emitSendTemplate({
                refId: 1,
                langCode: params.get("lang") || companyData?.defaultLangCode || "en",
                refType: "WebsiteTemplateMessage",
                station: Number(params.get("station") ?? 1),
                directContent: confirmationNumber,
            });

            toast.success("Website sent!", {
                position: "bottom-right",
                autoClose: 3000,
                theme: "colored",
            });
            clearConfirmationNumber();
        } catch (error) {
            console.error("Error sending text:", error);
            toast.error("Failed to send website. Please try again.", {
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
            <Tooltip title="Send Website" placement="bottom">
                <Button
                    type="primary"
                    icon={<IoGlobe style={{ fontSize: "20px" }} />}
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
