interface PropsI {
  searchOnChange: (x: string) => void;
  placeholder?: string;
}

export const SearchTemplateForm: React.FC<PropsI> = ({
  searchOnChange,
  placeholder = "Search template",
}) => {
  return (
    <input
      className="rounded-md border-2  p-2"
      placeholder={placeholder}
      onChange={(e) => searchOnChange(e.currentTarget.value)}
    />
  );
};
