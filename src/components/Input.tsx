import React, { ReactHTML } from "react";
import { FieldValues, Path, UseFormRegister } from "react-hook-form";

type InputProps = {
  label: Path<any>;
  register: UseFormRegister<any>;
  required: boolean;
  name: string;
};

// The following component is an example of your existing Input Component
const Input = ({
  label,
  register,
  required,
  ...props
}: InputProps & React.HTMLProps<HTMLInputElement>) => (
  <>
  {label &&
    <label className="text-md text-gray-500">{label}</label>
  }
    <input
      className="w-full rounded-3xl  border-2 border-black p-2"
      {...register(props.name, { required })}
      {...props}
    />
  </>
);

export default Input;
