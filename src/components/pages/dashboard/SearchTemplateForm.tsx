import React from "react";
import { Input } from "antd";

interface PropsI {
  searchOnChange: (x: string) => void;
  placeholder?: string;
}

export const SearchTemplateForm: React.FC<PropsI> = ({
  searchOnChange,
  placeholder = "Search template",
}) => {
  return (
    <Input
      placeholder={placeholder}
      onChange={(e) => searchOnChange(e.target.value)}
      className="rounded-md border-2 p-2"
    />
  );
};
