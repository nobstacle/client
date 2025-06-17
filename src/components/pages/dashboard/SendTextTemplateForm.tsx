import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { Button, Form, Input, Card, Row, Col } from "antd";
import "../../../styles/base.css";
import { SendIcon } from "@/components/icons/SendIcon";
interface PropsI {
  onSend: (content: string) => void;
}

type FormValues = {
  content: string;
};

const schema = yup
  .object({
    content: yup.string().required("Message is required"),
  })
  .required();

export const SendTextTemplateForm: React.FC<PropsI> = ({ onSend }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { content: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    onSend(data.content);
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="w-full gap-4 customTextTemplateForm">
      <Row gutter={16}>
        <Col md={23} xs={19}>
          <Form.Item
            validateStatus={errors.content ? "error" : ""}
            help={errors.content?.message}
          >
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={5}
                  placeholder="Type your message here"
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col md={1} xs={4} style={{
          display: 'flex',
          alignItems: 'end'
        }}>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendIcon size={20} />}
              className="headerButton"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
