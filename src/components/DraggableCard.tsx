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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
  }

  function handleDragOver(event: DragOverEvent) {
    // const activeContainerIndex = findContainerIndex(event.active.id);
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
        scaleX: isDragging ? 1.05 : 1.0,
        scaleY: isDragging ? 1.05 : 1.0,
      }
      : null;

    const style = {
      transform: CSS.Transform.toString(transformValues),
      transition,
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
        className="relative flex cursor-pointer flex-col rounded-md bg-neutral-300 shadow-lg 
                   h-32 w-full
                   xs:h-36 
                   sm:h-40 sm:shadow-xl
                   md:h-44 md:shadow-2xl
                   lg:h-48
                   xl:h-52"
        style={{
          ...style,
          zIndex: isDragging ? 9999 : 1,
          position: "relative",
        }}
      >
        <div className="flex-1 p-2 sm:p-3 md:px-3 md:pt-3 overflow-hidden">
          <div className="h-full text-xs sm:text-sm md:text-base">
            {children}
          </div>
        </div>

        {!isRecevied && isHover && isAdmin && (
          <div className="absolute left-0 top-0 z-10 flex">
            <button
              className="m-0 h-4 w-4 sm:h-5 sm:w-5 rounded-b-md text-center text-black bg-white/80 hover:bg-white"
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
          <div className="absolute right-0 top-0 z-10 flex">
            <button
              className="m-0 h-4 w-4 sm:h-5 sm:w-5 rounded-b-md text-center text-danger bg-white/80 hover:bg-white"
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

        {!isRecevied && isHover && isAdmin && isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="absolute bottom-8 left-0 z-10 flex cursor-move 
                       sm:bottom-10 
                       md:bottom-12 
                       lg:bottom-14 
                       xl:bottom-16"
          >
            <div className="p-1 bg-white/80 rounded-tr-md hover:bg-white">
              <DragIcon />
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Button className="relative h-8 w-full rounded-b-md bg-primary text-xs text-white
                           sm:h-10 sm:text-sm
                           md:text-base
                           lg:h-12">
            <span className="truncate px-2">{tag}</span>
            {/* {icon} */}
            {!icon && isAvailable && (
              <span
                className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[10px] border-l-[10px]
                 border-green-500
                 border-l-transparent
                 sm:border-b-[12px] sm:border-l-[12px]
                 md:border-b-[15px] md:border-l-[15px]"
              />
            )}
            {!icon && !isAvailable && (
              <span
                className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[10px] border-l-[10px]
                 border-red-500
                 border-l-transparent
                 sm:border-b-[12px] sm:border-l-[12px]
                 md:border-b-[15px] md:border-l-[15px]"
              />
            )}
          </Button>
        </div>
      </div>
    );
  };