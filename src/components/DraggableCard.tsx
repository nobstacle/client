import type {
  DragStartEvent,
  DragOverEvent,
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
  horizontalListSortingStrategy,
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
import { Color } from "antd/es/color-picker";

export const DraggableCardContainer: React.FC<{
  items: any[];
  sort: (item1: UniqueIdentifier, item2: UniqueIdentifier) => void;
  children: React.ReactNode;
}> = ({ items, sort, children }) => {
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
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={horizontalListSortingStrategy}
      >
        {/* Improved responsive grid with better breakpoints and full width utilization */}
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 
                         grid-cols-2 
                         sm:grid-cols-3 
                         md:grid-cols-4 
                         lg:grid-cols-4 
                         xl:grid-cols-5 
                         2xl:grid-cols-6 
                         3xl:grid-cols-8
                         w-full">
            {children}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

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
      transition: transition || 'transform 200ms ease',
    };

    return (
      <div
        ref={setNodeRef}
        onMouseOver={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (sendOnClick) {
            sendOnClick();
          }
        }}
        id="card-container"
        className="relative flex cursor-pointer flex-col rounded-lg bg-neutral-300 shadow-md hover:shadow-lg transition-all duration-200
                   w-full aspect-[4/5]
                   min-h-[140px]
                   sm:min-h-[160px] sm:shadow-lg hover:sm:shadow-xl
                   md:min-h-[170px] md:shadow-xl hover:md:shadow-2xl
                   lg:min-h-[180px]
                   xl:min-h-[190px]
                   2xl:min-h-[200px]"
        style={{
          ...style,
          zIndex: isDragging ? 9999 : 1,
          position: "relative",
        }}
      >
        {/* Content Area - Flexible height */}
        <div className="flex-1 p-2 sm:p-3 md:p-3 lg:p-4 overflow-hidden">
          <div className="h-full text-xs sm:text-sm md:text-sm lg:text-base leading-tight">
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
              <PencilIcon />
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
                           sm:h-9 sm:text-sm
                           md:h-10 md:text-sm
                           lg:h-11 lg:text-base
                           xl:h-12 xl:text-base
                           transition-colors duration-200 hover:bg-primary/90">
            <span className="truncate px-2 sm:px-3 md:px-3 lg:px-4">{tag}</span>

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