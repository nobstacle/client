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
import { Card, CardPropsI } from "./Card";
import React from "react";
import { Button } from "./Button";
import { TrashIcon } from "./icons/TrashIcon";
import { PencilIcon } from "./icons/PencilIcon";
import { DragIcon } from "./icons/DragIcon";
import { GetTextTemplateRes } from "../lib/client/model/getTextTemplateRes";

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
        {children}
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
        scaleX: isDragging ? 1.1 : 1.0,
        scaleY: isDragging ? 1.1 : 1.0,
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
      className="relative flex h-[166px] w-full max-w-[166px] cursor-pointer flex-col rounded-md bg-neutral-300 shadow-2xl"
      style={{
        ...style,
        zIndex: isDragging ? 9999 : 1,
        position: "relative",
      }}
    >
      <div className="min-h-[118px] px-3 pt-3">{children}</div>

      {!isRecevied && isHover && isAdmin && (
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
        <div className="absolute right-0 top-0 z-10 flex">
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

      {!isRecevied && isHover && isAdmin && isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute bottom-0 left-0 z-10 flex cursor-move"
        >
          <DragIcon />
        </div>
      )}

      <div className="p-2"></div>
      <div className="h-full">
        <Button className="relative h-full w-full rounded-b-md bg-primary  text-sm text-white">
          {tag}
          {/* {icon} */}
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
};
