export const ChatMessage = ({
  isRight,
  message,
}: {
  isRight?: boolean;
  message: string;
}) => {
  const parentClass = isRight
    ? "ml-auto mt-2 flex w-full max-w-xs justify-end space-x-3"
    : "mt-2 flex w-full max-w-xs space-x-3";
  const bubbleClass = isRight
    ? "rounded-l-lg rounded-br-lg bg-white p-3 text-black"
    : "rounded-r-lg rounded-bl-lg bg-green-300 p-3";

  return (
    <div className={parentClass} style={{ fontFamily: 'var(--font-inter)' }}>
      <div>
        <div className={bubbleClass} style={{ fontFamily: 'inherit' }}>
          <p className="text-sm" style={{ fontFamily: 'inherit' }}>{message}</p>
        </div>
      </div>
    </div>
  );
};
