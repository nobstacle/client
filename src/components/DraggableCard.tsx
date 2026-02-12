import type {
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardPropsI } from "./Card";
import React from "react";
import { Button } from "./Button";
import { TrashIcon } from "./icons/TrashIcon";
import { PencilIcon } from "./icons/PencilIcon";
import { DragIcon } from "./icons/DragIcon";
import { IoQrCode } from "react-icons/io5";

export const DraggableCardContainer: React.FC<{
  items: any[];
  sort: (item1: UniqueIdentifier, item2: UniqueIdentifier) => void;
  children: React.ReactNode;
}> = ({ items, sort, children }) => {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="w-full">
          <div className="flex flex-wrap gap-3 sm:gap-2 md:gap-2 lg:gap-4 
                         w-full justify-start items-start">
            {children}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);

    if (over && active.id !== over.id) {
      sort(active.id, over.id);
    }
  }
};

export const DraggableCardItem: React.FC<
  React.PropsWithChildren<CardPropsI & { id: number; isDraggable: boolean }>
> = function ({
  id,
  children,
  icon,
  isAdmin,
  isRecevied,
  isAvailable,
  onDelete,
  onUpdate,
  sendOnClick,
  tag,
  isDraggable,
  onQrCodeClick,
  type
}) {
    const [isHover, setIsHover] = React.useState(false);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const transformValues = transform
      ? {
        ...transform,
        scaleX: isDragging ? 1.02 : 1.0,
        scaleY: isDragging ? 1.02 : 1.0,
      }
      : null;

    const style = {
      transform: CSS.Transform.toString(transformValues),
      transition: isDragging ? 'none' : (transition || 'transform 200ms ease'),
    };

    return (
      <div
        ref={setNodeRef}
        onMouseOver={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (sendOnClick && !isDragging) {
            sendOnClick();
          }
        }}
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
        style={{
          ...style,
          zIndex: isDragging ? 9999 : 1,
          position: "relative",
          opacity: isDragging ? 0.8 : 1,
        }}
      >
        {/* Content Area - Flexible height */}
        <div className="flex-1 p-2 sm:p-3 md:p-3 lg:p-4 overflow-hidden">
          <div className="h-full text-xs sm:text-sm md:text-sm lg:text-base leading-tight" style={{ whiteSpace: 'pre-wrap' }}>
            {children}
          </div>
        </div>

        {type !== "slideshow" && type !== 'text' && type !== 'teamDocs' && !type?.includes('Scroll') && (
          <div className="absolute right-1 top-1 z-10">
            <button
              className="flex items-center justify-center
                       h-6 w-6 sm:h-7 sm:w-7 md:h-7 md:w-7 lg:h-8 lg:w-8
                       rounded-md text-gray-700 bg-white/90 hover:bg-blue-500 hover:text-white
                       shadow-sm hover:shadow-md transition-all duration-150"
              onClick={(e) => {
                e.stopPropagation();
                if (onQrCodeClick) {
                  onQrCodeClick();
                }
              }}
              title="Generate QR Code"
            >
              <IoQrCode />
            </button>
          </div>
        )}

        {/* Edit Button - Top Left */}
        {!isRecevied && isHover && isAdmin && !isDragging && (
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
              <PencilIcon />
            </button>
          </div>
        )}

        {/* Delete Button - Top Right */}
        {!isRecevied && isHover && isAdmin && !isDragging && (
          <div className="absolute right-1 z-10" style={{ bottom: '3rem' }}>
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
              <TrashIcon />
            </button>
          </div>
        )}

        {/* Drag Handle - Bottom Left */}
        {!isRecevied && isHover && isAdmin && isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="absolute bottom-8 left-1 z-10 cursor-move
                       sm:bottom-9 
                       md:bottom-10 
                       lg:bottom-11 
                       xl:bottom-12"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-center
                           h-6 w-6 sm:h-7 sm:w-7 md:h-7 md:w-7 lg:h-8 lg:w-8
                           bg-white/90 hover:bg-white rounded-md 
                           shadow-sm hover:shadow-md transition-all duration-150">
              <DragIcon />
            </div>
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