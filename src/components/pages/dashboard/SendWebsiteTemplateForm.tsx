import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import Input from "../../Input";

interface PropsI {
  onSend: (url: string) => void;
}

type FormValues = {
  url: string;
};

const schema = yup
  .object({
    url: yup.string().required(),
  })
  .required();

export const SendWebsiteTemplateForm: React.FC<PropsI> = ({ onSend }) => {
  const { register, formState, handleSubmit } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { url: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => onSend(data.url);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className=" w-full  gap-4">
      <div className="flex items-end gap-4">
        <Input
          register={register}
          name="url"
          label=""
          type="text"
          required
          placeholder="Type the url to send here..."
          className="rounded-md border-2  p-2"
        />
        <div className="flex items-start gap-2">
          <div>
            <Button
              className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
              type="submit"
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </div>

      {formState.errors.url && (
        <p className="text-xs text-rose-600">Url is required</p>
      )}
    </form>
  );
};
