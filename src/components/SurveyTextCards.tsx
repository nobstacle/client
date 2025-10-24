import React from "react";
import {Button} from "./Button";
import { FaTrash, FaPencilAlt } from "react-icons/fa";
import { CardPropsI } from "./Card";

export const CardContainer: React.FC<{
  items: any[];
  children: React.ReactNode;
}> = ({ items, children }) => {
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 sm:gap-2 md:gap-2 lg:gap-4 
                     w-full justify-start items-start">
        {children}
      </div>
    </div>
  );
};

export const SurveyTemplate: React.FC<
  React.PropsWithChildren<CardPropsI & { id: number }>
> = function ({
  id,
  children,
  icon,
  isAdmin,
  isRecevied,
  isAvailable,
  onDelete,
  onUpdate,
  tag,
}) {
  const [isHover, setIsHover] = React.useState(false);

  return (
    <div
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      id="card-container"
      className="relative flex cursor-pointer flex-col rounded-lg bg-neutral-300 shadow-md hover:shadow-lg transition-all duration-200
                 flex-shrink-0 flex-grow-0
                 w-[calc(50%-0.375rem)] aspect-[4/5]
                 min-h-[150px] 
                 sm:w-[120px] sm:h-[150px] sm:shadow-lg hover:sm:shadow-xl
                 md:w-[120px] md:h-[150px] md:shadow-xl hover:md:shadow-2xl
                 lg:w-[120px] lg:h-[170px]
                 xl:w-[130px] xl:h-[180px]
                 2xl:w-[160px] 2xl:h-[180px]"
    >
      {/* Content Area - Flexible height */}
      <div className="flex-1 p-2 sm:p-3 md:p-3 lg:p-4 overflow-hidden">
        <div className="h-full text-xs sm:text-sm md:text-sm lg:text-base leading-tight" style={{whiteSpace: 'pre-wrap'}}>
          {children}
        </div>
      </div>

      {/* Edit Button - Top Left */}
      {!isRecevied && isHover && isAdmin && (
        <div className="absolute left-1 top-1 z-10">
          <button
            className="flex items-center justify-center
                       h-6 w-6 sm:h-7 sm:w-7 md:h-7 md:w-7 lg:h-8 lg:w-8
                       rounded-md text-gray-700 bg-white/90 hover:bg-white 
                       shadow-sm hover:shadow-md transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              if (onUpdate) {
                onUpdate();
              }
            }}
          >
            <FaPencilAlt className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Delete Button - Top Right */}
      {!isRecevied && isHover && isAdmin && (
        <div className="absolute right-1 top-1 z-10">
          <button
            className="flex items-center justify-center
                       h-6 w-6 sm:h-7 sm:w-7 md:h-7 md:w-7 lg:h-8 lg:w-8
                       rounded-md text-red-600 bg-white/90 hover:bg-white 
                       shadow-sm hover:shadow-md transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete();
              }
            }}
          >
            <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Button Footer - Fixed at bottom */}
      <div className="mt-auto">
        <Button className="relative w-full rounded-b-lg bg-primary text-white customFont
               h-8 text-xs
               sm:h-9 sm:text-xs
               md:h-10 md:text-xs
               lg:h-11 lg:text-sm
               xl:h-12 xl:text-sm
               transition-colors duration-200 hover:bg-primary/90">
          <span className="block px-1 sm:px-2 md:px-2 lg:px-3 overflow-hidden 
                 text-xs sm:text-xs md:text-xs lg:text-xs xl:text-sm
                 leading-tight text-center"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={tag}>
            {tag}
          </span>

          {/* Availability Indicator - Triangle */}
          {!icon && isAvailable && (
            <span
              className="absolute bottom-0 right-0 
               border-b-[8px] border-l-[8px]
               border-green-500 border-l-transparent
               sm:border-b-[10px] sm:border-l-[10px]
               md:border-b-[10px] md:border-l-[10px]
               lg:border-b-[12px] lg:border-l-[12px]
               xl:border-b-[12px] xl:border-l-[12px]"
            />
          )}
          {!icon && !isAvailable && (
            <span
              className="absolute bottom-0 right-0 
               border-b-[8px] border-l-[8px]
               border-red-500 border-l-transparent
               sm:border-b-[10px] sm:border-l-[10px]
               md:border-b-[10px] md:border-l-[10px]
               lg:border-b-[12px] lg:border-l-[12px]
               xl:border-b-[12px] xl:border-l-[12px]"
            />
          )}
        </Button>
      </div>
    </div>
  );
};