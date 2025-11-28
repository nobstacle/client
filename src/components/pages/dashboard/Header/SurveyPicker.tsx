import * as React from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Tooltip, message } from "antd";
import { toast } from "react-toastify";
import { FaSmile } from "react-icons/fa";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { IoSpeedometer } from 'react-icons/io5';
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
    if (confirmationNumber !== "") {
      setIsLoading(true);
      try {
        emitSendSurvey({
          tag: confirmationNumber.trim(),
          station: params.get("station") ? Number(params.get("station")) : 1,
          langCode: params.get("lang") || "en",
        });

        toast.success("Survey sent!", {
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
    } else {
   message.warning('Please enter an identifier or a text');
    }
  };


  return (
    <>
      {/* Trigger Button */}
      <Tooltip title="Display Survey" placement="bottom">
        <Button
          type="primary"
          icon={<IoSpeedometer style={{ fontSize: "20px" }} />}
          onClick={handleConfirmSend}
          disabled={isLoading}
          className="flex items-center justify-center customHeaderButton"
          style={{
            backgroundColor: "#3b5998",
            border: "none",
            height: "40px",
          }}
        />
      </Tooltip>
    </>
  );
};