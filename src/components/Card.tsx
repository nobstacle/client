import * as React from "react";
import { Button } from "./Button";
import { TrashIcon } from "./icons/TrashIcon";
import { PencilIcon } from "./icons/PencilIcon";

interface PropsI {
  tag?: string;
  isAvailable?: boolean;
  sendOnClick?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  isRecevied?: boolean;
  isAdmin?: boolean;
  icon?: JSX.Element;
}

export const Card: React.FC<React.PropsWithChildren<PropsI>> = ({
  isAvailable,
  sendOnClick,
  onDelete,
  onUpdate,
  isRecevied,
  tag,
  children,
  isAdmin,
  icon,
}) => {
  const [isHover, setIsHover] = React.useState(false);

  return (
    <div
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (sendOnClick) {
          sendOnClick();
        }
      }}
      id="card-container"
      className="relative flex h-[166px] w-full max-w-[166px] cursor-pointer flex-col rounded-md bg-neutral-300 shadow-2xl"
    >
      <div className="min-h-[118px] px-3 pt-3">{children}</div>

      {!isRecevied && isAvailable && isHover && isAdmin && (
        <div className="absolute left-0 top-0 z-10 flex ">
          <button
            className="m-0 h-5 w-5 rounded-b-md    text-center text-black"
            onClick={(e) => {
              e.stopPropagation();

              if (onUpdate) {
                onUpdate();
              }
            }}
          >
            <PencilIcon />
          </button>
        </div>
      )}
      {!isRecevied && isHover && isAdmin && (
        <div className="absolute right-0 top-0 z-10 flex ">
          <button
            className="rounded-t-r-md m-0 h-5 w-5 rounded-b-md    text-center text-danger"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete();
              }
            }}
          >
            <TrashIcon />
          </button>
        </div>
      )}
      <div className="p-2"></div>
      <div className="h-full">
        <Button className="relative h-full w-full rounded-b-md bg-primary  text-sm text-white">
          {tag}
          {icon}
          {!icon && isAvailable && (
            <span
              className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-green-500
                 border-l-transparent"
            />
          )}
          {!icon && !isAvailable && (
            <span
              className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-red-500
                 border-l-transparent"
            />
          )}
        </Button>
      </div>
      {/* <div
        id="body"
        className="flex h-[166px] w-full flex-col justify-between "
      >
        <div className="h-full w-full px-4 pb-3">{children}</div>
        {!isRecevied && (
          <Button className="relative w-full rounded-b-md bg-primary  text-white">
            {tag}
            {isAvailable && (
              <span
                className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-green-500
                 border-l-transparent"
              />
            )}
            {!isAvailable && (
              <span
                className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-red-500
                 border-l-transparent"
              />
            )}
          </Button>
        )}
      </div> */}
    </div>
  );
  // return (
  //   <div
  //     className="relative h-full max-h-[166px] w-full max-w-[166px] cursor-pointer flex-col justify-between rounded-t-md bg-neutral-300"
  //   >
  //     <div className="h-full min-h-[126px] px-4 pt-4">
  //       <div>{children}</div>
  //     </div>
  //     <div className="h-[40px]">
  //     </div>
  //     <div className="h-full w-full max-w-[200px] rounded-t-md bg-neutral-300 px-4 pt-4">
  //       {children}
  //     </div>

  //      */}
  //   </div>
  // );
};
