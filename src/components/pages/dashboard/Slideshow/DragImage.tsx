/* eslint-disable @next/next/no-img-element */
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

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "m4v"];

const isVideoSource = (src: string): boolean => {
  const normalized = src.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(`.${ext}`));
};

export const SlideShowDragImage: React.FC<{
  items: { id: number; src: string; mediaType?: "image" | "video" }[];
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
              mediaType={item.mediaType}
              key={item.id}
              id={item.id}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );

  function handleDragStart(_event: DragStartEvent) {}

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
  mediaType?: "image" | "video";
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
      {(props.mediaType === "video" || isVideoSource(props.src)) ? (
        <video
          src={props.src}
          muted
          playsInline
          preload="metadata"
          {...attributes}
          {...listeners}
          style={{
            objectFit: "cover",
            minHeight: "100px",
            maxHeight: "100px",
            width: "100px",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        />
      ) : (
        <img
          src={props.src}
          width={100}
          height={100}
          alt={`preview-image-${props.id}`}
          {...attributes}
          {...listeners}
          style={{
            objectFit: "cover",
            minHeight: "100px",
            maxHeight: "100px",
            width: "100px",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        />
      )}
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
