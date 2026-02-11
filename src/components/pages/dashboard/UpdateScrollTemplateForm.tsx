import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Select, Form, Space, Upload, message } from "antd";
import { languages } from "../../../constant/languages";
import type { GetScrollTemplateRes, ScrollMediaItem } from "../../../app/dashboard/scroll/page";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaImage, FaFilm, FaGripVertical } from "react-icons/fa";
import { InboxOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";

const { Dragger } = Upload;

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ITEMS = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// ─── Types ────────────────────────────────────────────────────────────────────
interface SequenceEntry {
  uid: string;
  name: string;
  mediaType: "image" | "video";
  order: number;
  isExisting: boolean;
  file?: RcFile;
  existingData?: ScrollMediaItem;
}

interface FormValues {
  langCode: string;
}

const schema = yup.object().shape({
  langCode: yup.string().required("Language is required"),
});

// ─── Sortable Row ─────────────────────────────────────────────────────────────
const SortableRow: React.FC<{
  entry: SequenceEntry;
  index: number;
  onRemove: (uid: string) => void;
}> = ({ entry, index, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5"
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-move text-gray-300 hover:text-gray-500 flex-shrink-0 leading-none"
        style={{ fontSize: 12 }}
      >
        <FaGripVertical />
      </span>

      {/* Order number */}
      <span className="flex-shrink-0 w-4 text-center text-xs font-semibold text-gray-400">
        {index + 1}
      </span>

      {/* Type icon */}
      <span className="flex-shrink-0 text-gray-400 leading-none" style={{ fontSize: 11 }}>
        {entry.mediaType === "image" ? <FaImage /> : <FaFilm />}
      </span>

      {/* Name */}
      <span className="flex-1 text-xs text-gray-700 truncate">{entry.name}</span>

      {/* Badge */}
      {entry.isExisting && (
        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
          existing
        </span>
      )}

      {/* File size for new files */}
      {!entry.isExisting && entry.file && (
        <span className="flex-shrink-0 text-xs text-gray-400">
          {(entry.file.size / 1024 / 1024).toFixed(1)}MB
        </span>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(entry.uid)}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors leading-none"
        style={{ fontSize: 14, fontWeight: 600 }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────
export const UpdateScrollTemplateForm: React.FC<{
  sourceId: number;
  tag: string;
  defaultLangCode: string;
  existingItems: ScrollMediaItem[];
  cb?: (scroll: GetScrollTemplateRes) => void;
}> = ({ sourceId, tag, defaultLangCode, existingItems, cb }) => {
  const [sequence, setSequence] = React.useState<SequenceEntry[]>(() =>
    existingItems.map((item, idx) => ({
      uid: `existing-${idx}`,
      name: item.name,
      mediaType: item.mediaType,
      order: item.order,
      isExisting: true,
      existingData: item,
    }))
  );
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      langCode: defaultLangCode,
    },
  });

  // ── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSequence((prev) => {
        const old = prev.findIndex((e) => e.uid === active.id);
        const next = prev.findIndex((e) => e.uid === over.id);
        const reordered = arrayMove(prev, old, next);
        // Update order values
        return reordered.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    }
  };

  // ── File upload handler ──────────────────────────────────────────────────────
  const handleFileUpload = (file: RcFile): boolean => {
    setSequenceError(null);

    // Check max items
    if (sequence.length >= MAX_ITEMS) {
      setSequenceError(`Maximum ${MAX_ITEMS} items allowed.`);
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      message.error(`File size must be less than 100MB`);
      return false;
    }

    // Determine media type
    const mediaType = file.type.startsWith("image/") ? "image" : "video";

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowedTypes.includes(file.type)) {
      message.error("Only images (jpg, png, webp, gif) and videos (mp4, webm, mov) are allowed");
      return false;
    }

    // Add to sequence
    setSequence((prev) => [
      ...prev,
      {
        uid: `new-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        mediaType,
        order: prev.length + 1,
        isExisting: false,
      },
    ]);

    return false; // Prevent default upload behavior
  };

  const removeItem = (uid: string) => {
    setSequence((prev) => {
      const filtered = prev.filter((e) => e.uid !== uid);
      // Reorder after removal
      return filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
    setSequenceError(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (sequence.length === 0) {
      setSequenceError("Please keep or upload at least one file.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("langCode", data.langCode);

      // Separate existing and new items
      const existingItemsToKeep = sequence
        .filter((entry) => entry.isExisting)
        .map((entry) => ({
          ...entry.existingData,
          order: entry.order,
        }));

      const newFiles = sequence.filter((entry) => !entry.isExisting);

      // Add existing items
      if (existingItemsToKeep.length > 0) {
        formData.append("existingItems", JSON.stringify(existingItemsToKeep));
      }

      // Add new files
      if (newFiles.length > 0) {
        newFiles.forEach((entry) => {
          if (entry.file) {
            formData.append("files", entry.file);
          }
        });

        // Add metadata for new files
        const itemsMetadata = newFiles.map((entry) => ({
          order: entry.order,
          name: entry.name,
        }));
        formData.append("itemsMetadata", JSON.stringify(itemsMetadata));
      }

      // Make API call
      const response = await fetch(`/api/v1/scrolls/${sourceId}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update scroll template");
      }

      const result = await response.json();

      message.success("Scroll template updated successfully!");
      cb?.(result);
    } catch (error) {
      console.error("Update scroll error:", error);
      message.error("Failed to update scroll template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(onSubmit)}
      className="create-template-form customMapForm"
    >
      <hr />
      <Space
        direction="vertical"
        size="small"
        style={{ width: "100%", rowGap: "0.4rem", paddingTop: "1rem" }}
      >
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700">
            Tag: <span className="font-normal text-gray-600">{tag}</span>
          </p>
        </div>

        {/* ── File Upload ────────────────────────────────────────────────── */}
        <Form.Item
          label={
            <span>
              Add more files{" "}
              <span className="text-gray-400 font-normal text-xs">
                ({sequence.length}/{MAX_ITEMS})
              </span>
            </span>
          }
          validateStatus={sequenceError ? "error" : ""}
          help={sequenceError}
        >
          <Dragger
            name="files"
            multiple
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={sequence.length >= MAX_ITEMS}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag files to add</p>
            <p className="ant-upload-hint">
              Upload additional images or videos
              <br />
              Max file size: 100MB. Max total files: {MAX_ITEMS}
            </p>
          </Dragger>
        </Form.Item>

        {/* ── Sequence list ─────────────────────────────────────────────── */}
        {sequence.length > 0 && (
          <Form.Item label="Sequence — drag to reorder, click × to remove">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sequence.map((e) => e.uid)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {sequence.map((entry, i) => (
                    <SortableRow
                      key={entry.uid}
                      entry={entry}
                      index={i}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Form.Item>
        )}

        {/* ── Language ──────────────────────────────────────────────────── */}
        <Form.Item
          label="Language"
          validateStatus={errors.langCode ? "error" : ""}
          help={errors.langCode?.message || "Language is required"}
        >
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Search or select language…"
                style={{ width: "100%" }}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                optionFilterProp="children"
              >
                {languages.map(({ code, name }, index) => (
                  <Select.Option value={code} key={index}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <Form.Item style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ width: "100%" }}
            className="create-template-button"
            loading={uploading}
            disabled={uploading}
          >
            {uploading ? "Updating..." : "Update Scroll Template"}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};