import * as React from "react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { Modal, Input, Button, Tooltip } from "antd";
import { SmileOutlined, SendOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import { FaSmile } from "react-icons/fa";

interface SurveyFormValues {
  identifier: string;
}

const schema = yup.object().shape({
  identifier: yup.string().required("Confirmation number is required"),
});

export const HeaderSurveyShortcut: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const params = useSearchParams();
  const { emitSendSurvey } = useSocketContext();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SurveyFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      identifier: "",
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const onSubmit = (data: SurveyFormValues) => {
    try {
      emitSendSurvey({
        tag: data.identifier,
        station: params.get("station") ? Number(params.get("station")) : 1,
        langCode: params.get("lang") || "en",
      });

      toast.success("Survey sent successfully!", {
        position: "bottom-right",
        autoClose: 3000,
        theme: "colored",
      });

      handleCloseModal();
    } catch (error) {
      console.error("Error sending survey:", error);
      toast.error("Failed to send survey. Please try again.", {
        position: "bottom-right",
        autoClose: 3000,
        theme: "colored",
      });
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Tooltip title="Send Survey" placement="bottom">
        <Button
          type="primary"
          icon={<FaSmile style={{ fontSize: "20px" }} />}
          onClick={handleOpenModal}
          className="flex items-center justify-center headerButton"
          style={{
            backgroundColor: "#3b5998",
            border: "none",
            height: "40px",
            width: "40px !important",
          }}
        />
      </Tooltip>

      {/* Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SmileOutlined style={{ fontSize: "20px", color: "#3b5998" }} />
            <span>Send Survey</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={400}
        centered
      >
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmation Number <span className="text-red-500">*</span>
            </label>
            <Controller
              name="identifier"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter confirmation number"
                  status={errors.identifier ? "error" : ""}
                  size="large"
                  onPressEnter={handleSubmit(onSubmit)}
                />
              )}
            />
            {errors.identifier && (
              <p className="text-sm text-red-600 mt-1">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseModal} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={isSubmitting}
              size="large"
              style={{
                backgroundColor: "#3b5998",
                borderColor: "#3b5998",
              }}
            >
              Send Survey
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};