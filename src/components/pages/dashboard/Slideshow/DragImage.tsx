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
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useState } from "react";

export const SlideShowDragImage: React.FC<{
  items: { id: number; src: string }[];
  sort: (item1: UniqueIdentifier, item2: UniqueIdentifier) => void;
  removeImagePreview: (id: number) => void;
}> = ({ items, sort, removeImagePreview }) => {
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
      <div className="flex flex-wrap gap-4 ">
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={horizontalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableItem
              removeImagePreview={removeImagePreview}
              src={item.src}
              key={item.id}
              id={item.id}
            />
          ))}
        </SortableContext>
      </div>
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

function SortableItem(props: {
  id: number;
  src: string;
  removeImagePreview: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

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
      style={{ ...style, zIndex: isDragging ? 9999 : 1, position: "relative" }}
    >
      <Image
        src={props.src}
        width="100"
        height="100"
        alt={`preview-image-${props.id}`}
        {...attributes}
        {...listeners}
        style={{
          objectFit: "cover",
          minHeight: "100px",
          maxHeight: "100px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      />
      <button
        type="button"
        className="absolute right-0 top-0 h-[20px] w-[20px] bg-black text-white"
        onClick={() => props.removeImagePreview(props.id)}
      >
        X
      </button>
    </div>
  );
}
