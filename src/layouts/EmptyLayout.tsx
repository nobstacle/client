interface Props {
  class: string
}

const EmptyLayout: React.FC<React.PropsWithChildren<Props>> = (props) => {
  return <main className={props.class}>{props.children}</main>
}

export default EmptyLayout
