import * as React from "react";
import { Modal, Input, Button, Tooltip } from "antd";
import { FaSmile } from "react-icons/fa";


export const SendRecording: React.FC = () => {
    const handleSend = () => {

    }

    return (
        <>
            {/* Trigger Button */}
            <Tooltip title="Send Survey" placement="bottom">
                <Button
                    type="primary"
                    icon={<FaSmile style={{ fontSize: "20px" }} />}
                    onClick={handleSend}
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
    )
}
