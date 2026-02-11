import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  useVideoTemplateControllerGetVideoTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Select, Form, Space, Input, Upload, message } from "antd";
import { languages } from "../../../constant/languages";
import type { GetScrollTemplateRes } from "../../../app/dashboard/scroll/page";
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
import { FaImage, FaFilm, FaGripVertical, FaUpload } from "react-icons/fa";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import { useSession } from "next-auth/react";

const { Dragger } = Upload;

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ITEMS = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SequenceEntry {
  uid: string;
  file: RcFile;
  name: string;
  mediaType: "image" | "video";
  order: number;
}

interface FormValues {
  langCode: string;
  tagSelect?: string;
  tagCreate?: string;
}

const schema = yup.object().shape(
  {
    langCode: yup.string().required("Language is required"),
    tagSelect: yup.string().when("tagCreate", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () => yup.string().required("Tag is required"),
    }),
    tagCreate: yup.string().when("tagSelect", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () =>
        yup.string().required("Tag is required").max(30, "Max 30 characters"),
    }),
  },
  [["tagCreate", "tagSelect"]],
);

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

      {/* File size */}
      <span className="flex-shrink-0 text-xs text-gray-400">
        {(entry.file.size / 1024 / 1024).toFixed(1)}MB
      </span>

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
export const CreateScrollTemplateForm: React.FC<{
  cb?: (scroll: GetScrollTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const [sequence, setSequence] = React.useState<SequenceEntry[]>([]);
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const { data } = useSession();
  const videoTags = useVideoTemplateControllerGetVideoTags();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

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
        uid: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        mediaType,
        order: prev.length + 1,
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
  const onSubmit: SubmitHandler<FormValues> = async (value) => {
    if (sequence.length === 0) {
      setSequenceError("Please upload at least one file.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("tag", (value.tagCreate as string) || (value.tagSelect as string) || "scroll");
      formData.append("langCode", value.langCode);

      // Add files in order
      sequence.forEach((entry) => {
        formData.append("files", entry.file);
      });

      // Add metadata
      const itemsMetadata = sequence.map((entry) => ({
        order: entry.order,
        name: entry.name,
      }));
      formData.append("itemsMetadata", JSON.stringify(itemsMetadata));

      // Make API call
      const response = await fetch(`${Url}/api/v1/scrolls`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${data.user.backendTokens.at}` },
      });

      if (!response.ok) {
        throw new Error("Failed to create scroll template");
      }

      const result = await response.json();

      message.success("Scroll template created successfully!");
      cb?.(result, !!value.tagSelect);
    } catch (error) {
      console.error("Create scroll error:", error);
      message.error("Failed to create scroll template");
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
        {/* ── File Upload ────────────────────────────────────────────────── */}
        <Form.Item
          label={
            <span>
              Upload files{" "}
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
            <p className="ant-upload-text">Click or drag files to upload</p>
            <p className="ant-upload-hint">
              Support for images (jpg, png, webp, gif) and videos (mp4, webm, mov).
              <br />
              Max file size: 100MB. Max files: {MAX_ITEMS}
            </p>
          </Dragger>
        </Form.Item>

        {/* ── Sequence list ─────────────────────────────────────────────── */}
        {sequence.length > 0 && (
          <Form.Item label="Sequence — drag to reorder">
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

        {/* ── Tag Create ────────────────────────────────────────────────── */}
        <Form.Item
          label="Create a tag"
          validateStatus={errors.tagCreate ? "error" : ""}
          help={errors.tagCreate?.message}
        >
          <Controller
            name="tagCreate"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" placeholder="Type tag name here…" />
            )}
          />
        </Form.Item>

        {/* ── Tag Select ────────────────────────────────────────────────── */}
        <Form.Item
          label="Or select an existing tag"
          validateStatus={errors.tagSelect ? "error" : ""}
          help={errors.tagSelect?.message}
        >
          <Controller
            name="tagSelect"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select tag…"
                style={{ width: "100%" }}
                allowClear
              >
                {videoTags.data?.map((value, index) => (
                  <Select.Option value={value.tag} key={`${value.tag}-${index}`}>
                    {value.tag}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

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
            {uploading ? "Creating..." : "Create Scroll Template"}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};