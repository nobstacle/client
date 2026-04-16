import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Select, Form, Space, Upload, message, Input, InputNumber } from "antd";
import { languages } from "../../../constant/languages";
import {
  useScrollControllerUpdate,
  type GetScrollTemplateRes,
  type ScrollMediaItem,
} from "../../../lib/client/api";
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
// Kept consistent with CreateScrollTemplateForm
const MAX_ITEMS = 15;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── Types ────────────────────────────────────────────────────────────────────
interface SequenceEntry {
  uid: string;
  name: string;
  mediaType: "image" | "video";
  order: number;
  isExisting: boolean;
  file?: RcFile;
  existingData?: ScrollMediaItem;
  expiresAt?: string;
  imageDurationSeconds?: number;
}

interface FormValues {
  langCode: string;
}

const schema = yup.object().shape({
  langCode: yup.string().required("Language is required"),
});

const toLocalDateTimeInputValue = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const fromLocalDateTimeInputValue = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

// ─── Sortable Row ─────────────────────────────────────────────────────────────
const SortableRow: React.FC<{
  entry: SequenceEntry;
  index: number;
  onRemove: (uid: string) => void;
  onChange: (uid: string, updates: Partial<SequenceEntry>) => void;
}> = ({ entry, index, onRemove, onChange }) => {
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
      className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-md px-2 py-2"
    >
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-300 hover:text-gray-500 flex-shrink-0 leading-none"
          style={{ fontSize: 12 }}
        >
          <FaGripVertical />
        </span>

        <span className="flex-shrink-0 w-4 text-center text-xs font-semibold text-gray-400">
          {index + 1}
        </span>

        <span className="flex-shrink-0 text-gray-400 leading-none" style={{ fontSize: 11 }}>
          {entry.mediaType === "image" ? <FaImage /> : <FaFilm />}
        </span>

        <span className="flex-1 text-xs text-gray-700 truncate">{entry.name}</span>

        {entry.isExisting && (
          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
            existing
          </span>
        )}

        {!entry.isExisting && entry.file && (
          <span className="flex-shrink-0 text-xs text-gray-400">
            {(entry.file.size / 1024 / 1024).toFixed(1)}MB
          </span>
        )}

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          size="small"
          value={entry.name}
          onChange={(event) =>
            onChange(entry.uid, { name: event.target.value })
          }
          placeholder="Media name"
        />

        <Input
          size="small"
          type="datetime-local"
          value={toLocalDateTimeInputValue(entry.expiresAt)}
          onChange={(event) =>
            onChange(entry.uid, {
              expiresAt: fromLocalDateTimeInputValue(event.target.value),
            })
          }
          placeholder="Expiration date"
        />

        {entry.mediaType === "image" ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 whitespace-nowrap">
              Duration
            </span>
            <InputNumber
              size="small"
              min={1}
              max={1209600}
              value={entry.imageDurationSeconds}
              onChange={(value) =>
                onChange(entry.uid, {
                  imageDurationSeconds:
                    typeof value === "number" ? Math.floor(value) : undefined,
                })
              }
              placeholder="Image duration"
              addonAfter="sec"
              className="w-full"
            />
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 flex items-center px-1">
            Video plays until it ends
          </div>
        )}
      </div>
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
  entityLabel?: string;
}> = ({ sourceId, tag, defaultLangCode, existingItems, cb, entityLabel = "Scroll" }) => {
  const [sequence, setSequence] = React.useState<SequenceEntry[]>(() =>
    existingItems.map((item, idx) => ({
      uid: `existing-${idx}`,
      name: item.name,
      mediaType: item.mediaType,
      order: item.order,
      isExisting: true,
      existingData: item,
      expiresAt: item.expiresAt,
      imageDurationSeconds: item.imageDurationSeconds,
    }))
  );
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);

  // ✅ Use the generated API hook — auth headers injected automatically
  const updateScroll = useScrollControllerUpdate();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { langCode: defaultLangCode },
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
        const oldIdx = prev.findIndex((e) => e.uid === active.id);
        const newIdx = prev.findIndex((e) => e.uid === over.id);
        return arrayMove(prev, oldIdx, newIdx).map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
      });
    }
  };

  // ── File upload handler ──────────────────────────────────────────────────────
  const handleFileUpload = (file: RcFile): boolean => {
    setSequenceError(null);

    if (sequence.length >= MAX_ITEMS) {
      setSequenceError(`Maximum ${MAX_ITEMS} items allowed.`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error(`File size must be less than 50MB`);
      return false;
    }

    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      message.error("Only images (jpg, png, webp, gif) and videos (mp4, webm, mov) are allowed");
      return false;
    }

    const mediaType = file.type.startsWith("image/") ? "image" : "video";
    const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setSequence((prev) => [
      ...prev,
      {
        uid: `new-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        mediaType,
        order: prev.length + 1,
        isExisting: false,
        expiresAt: defaultExpiry,
        imageDurationSeconds: mediaType === "image" ? 10 : undefined,
      },
    ]);

    return false; // prevent default ant upload behaviour
  };

  const removeItem = (uid: string) => {
    setSequence((prev) =>
      prev.filter((e) => e.uid !== uid).map((item, idx) => ({ ...item, order: idx + 1 }))
    );
    setSequenceError(null);
  };

  const updateItem = (uid: string, updates: Partial<SequenceEntry>) => {
    setSequence((prev) =>
      prev.map((entry) => (entry.uid === uid ? { ...entry, ...updates } : entry))
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (sequence.length === 0) {
      setSequenceError("Please keep or upload at least one file.");
      return;
    }

    const formData = new FormData();
    formData.append("langCode", data.langCode);

    const existingItemsToKeep = sequence
      .filter((e) => e.isExisting)
      .map((e) => ({
        ...e.existingData,
        order: e.order,
        name: e.name?.trim() || e.existingData?.name,
        expiresAt: e.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        imageDurationSeconds:
          e.mediaType === "image" ? e.imageDurationSeconds || 10 : undefined,
      }));

    const newFiles = sequence.filter((e) => !e.isExisting);

    if (existingItemsToKeep.length > 0) {
      formData.append("existingItems", JSON.stringify(existingItemsToKeep));
    }

    if (newFiles.length > 0) {
      newFiles.forEach((e) => { if (e.file) formData.append("files", e.file); });
      formData.append(
        "itemsMetadata",
        JSON.stringify(
          newFiles.map((e) => ({
            order: e.order,
            name: e.name?.trim() || e.file?.name,
            expiresAt: e.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            imageDurationSeconds:
              e.mediaType === "image" ? e.imageDurationSeconds || 10 : undefined,
          }))
        )
      );
    }

    try {
      // ✅ mutateAsync via the generated hook — no manual fetch, no localStorage token
      const result = await updateScroll.mutateAsync({ id: sourceId, data: formData });
      message.success(`${entityLabel} template updated successfully!`);
      cb?.(result);
    } catch (error) {
      console.error("Update scroll error:", error);
      message.error(`Failed to update ${entityLabel.toLowerCase()} template`);
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
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag files to add</p>
            <p className="ant-upload-hint">
              Images (jpg, png, webp, gif) and videos (mp4, webm, mov).
              Max file size: 50MB. Max total files: {MAX_ITEMS}
            </p>
          </Dragger>
        </Form.Item>

        {/* ── Sequence list ─────────────────────────────────────────────── */}
        {sequence.length > 0 && (
          <Form.Item label="Sequence — drag to reorder and edit item settings">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sequence.map((e) => e.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {sequence.map((entry, i) => (
                    <SortableRow
                      key={entry.uid}
                      entry={entry}
                      index={i}
                      onRemove={removeItem}
                      onChange={updateItem}
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
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                optionFilterProp="children"
              >
                {languages.map(({ code, name }, index) => (
                  <Select.Option value={code} key={index}>{name}</Select.Option>
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
            loading={updateScroll.isPending}
            disabled={updateScroll.isPending}
          >
            {updateScroll.isPending ? "Updating..." : `Update ${entityLabel} Template`}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};
