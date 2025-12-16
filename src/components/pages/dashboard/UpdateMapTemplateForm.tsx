import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  getContentControllerFindOneQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useMapTemplateControllerPatchMapTemplateOne,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { GetMapTemplateRes } from "../../../lib/client/model";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { parseLocation } from "../../../utils";

interface CreateMapTemplateFormFieldValues {
  origin: string;
  destination: string;
}

const schema = yup
  .object({
    origin: yup.string().required("Origin address is required"),
    destination: yup.string().required("Destination address is required"),
  })
  .required();

export const UpdateMapTemplateForm: React.FC<{
  cb?: (template: GetMapTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, sourceId, defaultLangCode, tag }) => {
  const content = useContentControllerFindOne(
    {
      refType: "Map",
      sourceId,
      langCode: defaultLangCode,
    },
    {
      query: {
        staleTime: 0,
        gcTime: 0,
        queryKey: getContentControllerFindOneQueryKey({
          refType: "Map",
          sourceId,
          langCode: defaultLangCode,
        }),
      },
    },
  );

  const company = useCompanyControllerGetCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateMapTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      origin: "",
      destination: "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (content.isSuccess) {
      setValue("origin", content.data.content ?? "");
      setValue("destination", content.data.extraContent ?? "");
    }
  }, [content.isSuccess]);

  const updateMapTemplate = useMapTemplateControllerPatchMapTemplateOne();
  const handleUpdateMapTemplate = (data: CreateMapTemplateFormFieldValues) => {
    updateMapTemplate.mutate(
      {
        tag,
        data: {
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          origin: data.origin,
          destination: data.destination,
          langCode: defaultLangCode,
        },
      },
      {
        onSuccess: (template) => {
          if (cb) {
            cb(template);
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateMapTemplateFormFieldValues> = (data) =>
    handleUpdateMapTemplate(data);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBB5xoUCTVJoyYUy-4r7LAySR8SpfaVsHA",
    libraries: ["places"],
    language: "en",
  });

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Autocomplete>
            <Input
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
              register={register}
              name="destination"
              label="Destination Address"
              type="text"
              required
              placeholder="Type destination address here..."
            />
          </Autocomplete>
        </div>
       
        <div className="Map-center">
          {errors.origin && (
            <p className="text-xs text-rose-600">{errors.origin.message}</p>
          )}

          {errors.destination && (
            <p className="text-xs text-rose-600">
              {errors.destination.message}
            </p>
          )}

          {updateMapTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {updateMapTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={updateMapTemplate.status === "pending"}
          disabled={updateMapTemplate.status === "pending"}
          type="submit"
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
