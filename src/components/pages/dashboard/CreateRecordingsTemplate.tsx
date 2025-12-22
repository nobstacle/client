import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { Card } from "antd";
import { Input as AntdInput } from "antd";
import { toast } from "react-toastify";

interface SendRecordingFormValues {
  identifier: string;
}

const schema = yup.object().shape({
  identifier: yup.string().required("Recording tag is required"),
});

interface SendRecordingTriggerProps {
  onSearch?: (searchTerm: string) => void;
}

export const SendRecordingTrigger: React.FC<SendRecordingTriggerProps> = ({ onSearch }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<SendRecordingFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      identifier: "",
    },
  });

  const params = useSearchParams();
  const { emitSendRecording } = useSocketContext();
  const identifierValue = watch("identifier");
  
    React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(identifierValue || "");
      }
    }, 500); 

    return () => clearTimeout(timer);
  }, [identifierValue, onSearch]);

  const handleSendRecording: SubmitHandler<SendRecordingFormValues> = (data) => {
    emitSendRecording({
      tag: data.identifier.trim(),
      station: params.get("station") ? Number(params.get("station")) : 1,
      langCode: params.get("lang") || "en",
    });

    toast.success("Recording trigger sent!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });

    reset();
  };

  return (
    <Card bordered className="w-full mb-6 pb-0 customRecordingHeaderCard">
      <form
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full"
        onSubmit={handleSubmit(handleSendRecording)}
      >
        {/* Input + Send Button */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-1/2 formInnerContainer">
          <Controller
            name="identifier"
            control={control}
            render={({ field }) => (
              <AntdInput
                {...field}
                placeholder="Type to search or enter confirmation tag to trigger recording"
                status={errors.identifier ? "error" : ""}
                onChange={(e) => field.onChange(e)}
                style={{ width: "100%" }}
                className="recording-tag-input"
                allowClear
              />
            )}
          />

          <Button
            className="flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-md px-4 py-2 text-white headerButton"
            type="submit"
          >
            <SendIcon />
          </Button>

          {errors.identifier && (
            <p className="text-sm text-red-600">{errors.identifier.message}</p>
          )}
        </div>

      </form>
    </Card>
  );
};