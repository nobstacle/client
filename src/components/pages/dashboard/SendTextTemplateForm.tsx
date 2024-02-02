import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";

interface PropsI {
  onSend: (content: string) => void;
}

type FormValues = {
  content: string;
};

const schema = yup
  .object({
    content: yup.string().required(),
  })
  .required();

export const SendTextTemplateForm: React.FC<PropsI> = ({ onSend }) => {
  const { getValues, register, formState, handleSubmit } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { content: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => onSend(data.content);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className=" w-full  gap-4">
      <div className="flex items-end gap-4">
        <textarea
          rows={5}
          className="w-full resize-none rounded-md border-2 p-2"
          placeholder="Type your message here"
          {...register("content")}
        />
        <div className="flex flex items-start gap-2">
          <div>
            <Button
              className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
              type="submit"
            >
              <SendIcon />
            </Button>
          </div>

          <button
            className="border-1 flex justify-center rounded-md border-black  bg-green-500 p-2 px-6 text-center text-white"
            type="button"
            onClick={() => {
              const currContent = getValues("content");
              if (currContent) {
                if (/^\d{10,}$/g.test(currContent)) {
                  window.open(`https://wa.me/${currContent}`);
                }
              }
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {formState.errors.content && (
        <p className="text-xs text-rose-600">Message is required</p>
      )}
    </form>
  );
};
