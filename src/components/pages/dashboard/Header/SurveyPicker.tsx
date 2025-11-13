import * as React from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Tooltip, Modal } from "antd";
import { toast } from "react-toastify";
import { FaSmile } from "react-icons/fa";
import { useSocketContext } from "../../../../context/SocketContextProvider";

interface HeaderSurveyShortcutProps {
  confirmationNumber: string;
  clearConfirmationNumber: () => void;
}

export const HeaderSurveyShortcut: React.FC<HeaderSurveyShortcutProps> = ({
  confirmationNumber,
  clearConfirmationNumber
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const params = useSearchParams();
  const { emitSendSurvey } = useSocketContext();

  const handleConfirmSend = async () => {
    setIsLoading(true);
    try {
      emitSendSurvey({
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
      <Tooltip title="Send Survey" placement="bottom">
        <Button
          type="primary"
          icon={<FaSmile style={{ fontSize: "20px" }} />}
          onClick={handleConfirmSend}
          disabled={isLoading}
          className="flex items-center justify-center headerButton"
          style={{
            backgroundColor: "#3b5998",
            border: "none",
            height: "40px",
            width: "40px !important",
          }}
        />
      </Tooltip>
    </>
  );
};