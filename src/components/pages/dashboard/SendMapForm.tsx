import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import {
  useCompanyControllerGetCompany,
  useMapTemplateControllerCreateMapTemplate,
  useMapTemplateControllerGetMapTags,
} from "../../../lib/client/api";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { SendIcon } from "../../icons/SendIcon";

interface SendMapTemplateFormFieldValues {
  origin: string;
  destination: string;
}

const schema = yup.object().shape({
  origin: yup.string().required("Origin address is required"),
  destination: yup.string().required("Destination address is required"),
});

export const SendMapForm: React.FC<{
  onSend: (origin: string, destination: string) => void;
}> = ({ onSend }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA9YqouCB4d0Kk-_jQ3m4GJd1nuxSQHxVU",
    libraries: ["places"],
    language: "en",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SendMapTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      origin: "",
      destination: "",
    },
  });

  const createMapsTemplate = useMapTemplateControllerCreateMapTemplate();

  const handleCreateMapsTemplate = (data: SendMapTemplateFormFieldValues) => {
    onSend(data.origin, data.destination);
  };

  const onSubmit: SubmitHandler<SendMapTemplateFormFieldValues> = (data) =>
    handleCreateMapsTemplate(data);

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex gap-4">
        <div className="flex items-end gap-4  ">
          <Autocomplete>
            <Input
              className="w-full rounded-md  border-2 p-2"
              register={register}
              name="origin"
              label="Origin Address"
              type="text"
              required
              placeholder="Type origin address here..."
            />
          </Autocomplete>

          <Autocomplete>
            <Input
              className="w-full rounded-md  border-2 p-2"
              register={register}
              name="destination"
              label="Destination Address"
              type="text"
              required
              placeholder="Type destination address here..."
            />
          </Autocomplete>

          <div className="flex items-center gap-4 pb-1">
            <Button
              className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
              isLoading={createMapsTemplate.status === "pending"}
              disabled={createMapsTemplate.status === "pending"}
              type="submit"
            >
              <SendIcon />
            </Button>

            <div className="text-center">
              {errors.destination && (
                <p className="text-xs text-rose-600">
                  {errors.destination.message}
                </p>
              )}
              {errors.origin && (
                <p className="text-xs text-rose-600">{errors.origin.message}</p>
              )}

              {createMapsTemplate.error?.message && (
                <p className="text-xs text-rose-600">
                  {createMapsTemplate.error.response?.data.message}{" "}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
