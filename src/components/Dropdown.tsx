interface Props {
  style?: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  [k: string]: unknown
  defaultValue?: string
}

const Dropdown: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const { children, style, defaultValue, onChange, ...otherProps } = props

  return (
    <select
      style={{
        height: "30px",
        paddingLeft: "4px",
        borderRadius: "3px"
      }}
      onChange={onChange}
      defaultValue={defaultValue}
      {...otherProps}
    >
      {children}
    </select>
  )
}

export default Dropdown
