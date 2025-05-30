import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Form, Input as AntdInput, Button as AntdButton, Row, Col, Card } from "antd";
import {
  useMapTemplateControllerCreateMapTemplate,
} from "../../../lib/client/api";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { SendIcon } from "@/components/icons/SendIcon";
import "../../../styles/base.css";

interface SendMapTemplateFormFieldValues {
  origin: string;
  destination: string;
}

const schema = yup.object().shape({
  origin: yup.string().required("Origin address is required"),
  destination: yup.string().required("Destination address is required"),
});

export const SendDocumentForm: React.FC<{
  onSend: (origin: string, destination: string) => void;
}> = ({ onSend }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBB5xoUCTVJoyYUy-4r7LAySR8SpfaVsHA",
    libraries: ["places"],
    language: "en",
  });

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SendMapTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      origin: "",
      destination: "",
    },
  });

  const createMapsTemplate = useMapTemplateControllerCreateMapTemplate();

  const originRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const destinationRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = (field: "origin" | "destination", ref: any) => {
    if (ref.current) {
      const place = ref.current.getPlace();
      const address = place?.formatted_address || ref.current?.value || "";
      if (address) {
        setValue(field, address);
      }
    }
  };

  const onSubmit: SubmitHandler<SendMapTemplateFormFieldValues> = (data) => {
    onSend(data.origin, data.destination);
  };

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  return (
    <Card className="customCards">
      <Form layout="inline" onFinish={handleSubmit(onSubmit)} >
        <Row gutter={16} style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Col xs={24} md={8}>
            <Form.Item
              validateStatus={errors.origin ? "error" : ""}
              help={errors.origin?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                name="origin"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    onLoad={(ref) => (originRef.current = ref)}
                    onPlaceChanged={() => onPlaceChanged("origin", originRef)}
                  >
                    <AntdInput {...field} placeholder="Origin Address" className="customInputHorizontal" />
                  </Autocomplete>
                )}
              />
            </Form.Item>
          </Col>

          <Col md={4} xs={24}>
            <Form.Item style={{ marginBottom: 0 }}>
              <AntdButton
                type="primary"
                htmlType="submit"
                loading={createMapsTemplate.status === "pending"}
                disabled={createMapsTemplate.status === "pending"}
                icon={<SendIcon size={20}/>}
                className="headerButton"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

    </Card>
  );
};
