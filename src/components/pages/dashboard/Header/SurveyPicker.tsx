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
  checkTooltip: boolean,
  user: string,
  isMobile: boolean,
  compactDesktop?: boolean
}

export const HeaderSurveyShortcut: React.FC<HeaderSurveyShortcutProps> = ({
  confirmationNumber,
  clearConfirmationNumber,
  checkTooltip,
  user,
  isMobile,
  compactDesktop = false
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
          sentBy: JSON.stringify(user),
        });

        if (!checkTooltip) {
          toast.success("Survey sent!", {
            position: "bottom-right",
            autoClose: 3000,
            theme: "colored",
          });
        }
        clearConfirmationNumber();
      } catch (error) {
        console.error("Error sending survey:", error);
        if (!checkTooltip) {
          toast.error("Failed to send survey. Please try again.", {
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
        <Tooltip title="Display Survey" placement="bottom">
          <Button
            type="primary"
            icon={<IoSpeedometer style={{ fontSize: compactDesktop ? "18px" : "20px" }} />}
            onClick={handleConfirmSend}
            disabled={isLoading}
            className={isMobile ? "flex items-center justify-center customHeaderButtonMobile " : "ml-2 flex items-center justify-center customHeaderButton"}
            style={{
              backgroundColor: "#3b5998",
              border: "none",
              height: compactDesktop ? "36px" : "40px",
            }}
          />
        </Tooltip>
      ) : (
        <Button
          type="primary"
          icon={<IoSpeedometer style={{ fontSize: compactDesktop ? "18px" : "20px" }} />}
          onClick={handleConfirmSend}
          disabled={isLoading}
            className={isMobile ? "flex items-center justify-center customHeaderButtonMobile " : "ml-2 flex items-center justify-center customHeaderButton"}
          style={{
            backgroundColor: "#3b5998",
            border: "none",
            height: compactDesktop ? "36px" : "40px",
          }}
        />
      )}
    </>
  );
};
