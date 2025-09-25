import React from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Form, Input as AntdInput, Button as AntdButton, Card } from "antd";
import { SendOutlined } from "@ant-design/icons";
import "../../../styles/base.css";
import { SendIcon } from "@/components/icons/SendIcon";
import { IoQrCode } from "react-icons/io5";

interface PropsI {
  onSend: (url: string) => void;
  onsendQr: (url: string) => void; // Added missing prop
}

type FormValues = {
  url: string;
};

const schema = yup.object({
  url: yup.string().required("Url is required"),
});

export const SendWebsiteTemplateForm: React.FC<PropsI> = ({ onSend, onsendQr }) => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { url: "" },
  });

  // Watch the URL field for real-time updates
  const watchedUrl = watch("url");

  const onSubmit: SubmitHandler<FormValues> = (data) => onSend(data.url);

  const handleSendQr: SubmitHandler<FormValues> = (data) => onsendQr(data.url);

  return (
    <Card className="w-full customCards">
      <Form onFinish={handleSubmit(onSubmit)} className="customWebsiteFormWidth">
        <div className="flex items-center gap-4">
          <Form.Item
            validateStatus={errors.url ? "error" : ""}
            help={errors.url?.message}
            className="w-full mb-0"
          >
            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <AntdInput
                  {...field}
                  placeholder="Type the url to send here..."
                  className="customInputHorizontal"
                />
              )}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <AntdButton
              htmlType="submit"
              type="primary"
              icon={<SendIcon size={20} />}
              className="headerButton"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <AntdButton
              type="primary"
              icon={<IoQrCode size={20} />}
              className="headerButton"
              onClick={handleSubmit(handleSendQr)}
            />
          </Form.Item>

        </div>
      </Form>
    </Card>
  );
};