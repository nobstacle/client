import React, { useState } from "react";
import { Input } from "antd";
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';

interface PropsI {
  searchOnChange: (x: string) => void;
  onClear?: () => void;
  isSearching?: boolean;
  placeholder?: string;
}

export const SearchTemplateForm: React.FC<PropsI> = ({
  searchOnChange,
  onClear,
  isSearching = false,
  placeholder = "Search template",
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    searchOnChange(value);
  };

  const handleClear = () => {
    setSearchValue('');
    onClear?.();
  };

  return (
    <Input
      value={searchValue}
      placeholder={placeholder}
      onChange={handleInputChange}
      className="rounded-md border-2 p-2"
      suffix={
        <div className="flex items-center gap-1">
          {isSearching && <LoadingOutlined className="text-blue-500" />}
          {searchValue && !isSearching && (
            <CloseOutlined
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={handleClear}
            />
          )}
        </div>
      }
      allowClear={false} // We're handling clear manually
    />
  );
};