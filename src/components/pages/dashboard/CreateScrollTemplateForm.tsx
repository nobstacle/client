import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  useScrollControllerGetScrolls,
  useScrollControllerCreate,
  type GetScrollTemplateRes,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Select, Form, Space, Input, Upload, message, InputNumber } from "antd";
import { languages } from "../../../constant/languages";
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
import { FaImage, FaFilm, FaGripVertical, FaPlus } from "react-icons/fa";
import { InboxOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import {
  isScrollTagInScope,
  toDisplayScrollTag,
  toScopedScrollTag,
} from "../../../utils/scrollScope";

const { Dragger } = Upload;

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ITEMS = 15;                     // updated from 10
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50 MB — updated from 100 MB

// ─── Types ────────────────────────────────────────────────────────────────────
interface SequenceEntry {
  uid: string;
  file: RcFile;
  name: string;
  mediaType: "image" | "video";
  order: number;
  expiresAt?: string;
  imageDurationSeconds?: number;
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
  showPlaybackSettings: boolean;
  onRemove: (uid: string) => void;
  onChange: (uid: string, updates: Partial<SequenceEntry>) => void;
}> = ({ entry, index, showPlaybackSettings, onRemove, onChange }) => {
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
        <span className="flex-shrink-0 text-xs text-gray-400">
          {(entry.file.size / 1024 / 1024).toFixed(1)}MB
        </span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        <Input
          size="small"
          value={entry.name}
          onChange={(event) =>
            onChange(entry.uid, { name: event.target.value })
          }
          placeholder="Media name"
        />

        {showPlaybackSettings && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────
export const CreateScrollTemplateForm: React.FC<{
  cb?: () => void;
  entityLabel?: string;
  templateScope?: "scroll" | "public";
}> = ({ cb, entityLabel = "Scroll", templateScope }) => {
  const [sequence, setSequence] = React.useState<SequenceEntry[]>([]);
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);
  const resolvedScope =
    templateScope ??
    (entityLabel.toLowerCase() === "public" || entityLabel.toLowerCase() === "screens"
      ? "public"
      : "scroll");
  const isPublicTemplate = resolvedScope === "public";

  const scrollTags = useScrollControllerGetScrolls({ limit: 100, scope: resolvedScope });
  // Use the API hook — authentication header is injected automatically
  // by nobstacleBackendApiInstance, same as every other form in this project.
  const createScroll = useScrollControllerCreate();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      tagCreate: "",
      tagSelect: undefined,
    },
  });

  const existingTagOptions = React.useMemo(() => {
    const unique = new Set<string>();
    const tagSources = [...(scrollTags.data?.data || []).map((value) => value?.tag)];

    tagSources.forEach((rawTag) => {
      if (!rawTag || !isScrollTagInScope(rawTag, resolvedScope)) return;
      const displayTag = toDisplayScrollTag(rawTag);
      if (!displayTag) return;
      unique.add(displayTag);
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [scrollTags.data?.data, resolvedScope]);

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
        return arrayMove(prev, old, next).map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    }
  };

  // ── File upload handlers ─────────────────────────────────────────────────────
  const appendFileToSequence = (
    file: RcFile,
    forcedMediaType?: "image" | "video",
  ): boolean => {
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

    const detectedMediaType = file.type.startsWith("image/") ? "image" : "video";
    const mediaType = forcedMediaType ?? detectedMediaType;

    if (forcedMediaType && forcedMediaType !== detectedMediaType) {
      message.error(`Please select a valid ${forcedMediaType} file.`);
      return false;
    }

    const defaultExpiry = isPublicTemplate
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    setSequence((prev) => [
      ...prev,
      {
        uid: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        mediaType,
        order: prev.length + 1,
        expiresAt: defaultExpiry,
        imageDurationSeconds:
          isPublicTemplate && mediaType === "image" ? 10 : undefined,
      },
    ]);
    return false; // prevent default ant upload behaviour
  };

  const handleFileUpload = (file: RcFile): boolean => appendFileToSequence(file);
  const handleAddImage = (file: RcFile): boolean => appendFileToSequence(file, "image");
  const handleAddVideo = (file: RcFile): boolean => appendFileToSequence(file, "video");

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
  const onSubmit: SubmitHandler<FormValues> = async (value) => {
    if (sequence.length === 0) {
      setSequenceError("Please upload at least one file.");
      return;
    }

    const formData = new FormData();
    const createdTag = (value.tagCreate || "").trim();
    const selectedTag = (value.tagSelect || "").trim();
    const rawTag = createdTag || selectedTag || "scroll";
    const scopedTag = toScopedScrollTag(rawTag, resolvedScope);
    formData.append("tag", scopedTag);
    formData.append("langCode", value.langCode);
    sequence.forEach((entry) => formData.append("files", entry.file));
    formData.append(
      "itemsMetadata",
      JSON.stringify(
        sequence.map((e) => ({
          order: e.order,
          name: e.name?.trim() || e.file.name,
          expiresAt: isPublicTemplate
            ? e.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          imageDurationSeconds: isPublicTemplate && e.mediaType === "image"
            ? e.imageDurationSeconds || 10
            : undefined,
        }))
      )
    );

    try {
      await createScroll.mutateAsync({ data: formData });
      message.success(`${entityLabel} template created successfully!`);
      cb?.();
    } catch (error) {
      console.error("Create scroll error:", error);
      message.error(`Failed to create ${entityLabel.toLowerCase()} template`);
    }
  };

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(onSubmit)}
      className="create-template-form customMapForm"
    >
      <hr />
      <Space direction="vertical" size="small" style={{ width: "100%", rowGap: "0.4rem", paddingTop: "1rem" }}>

        {isPublicTemplate ? (
          <Form.Item
            label={
              <span>
                Add media one by one{" "}
                <span className="text-gray-400 font-normal text-xs">
                  ({sequence.length}/{MAX_ITEMS})
                </span>
              </span>
            }
            validateStatus={sequenceError ? "error" : ""}
            help={sequenceError || "Add each image/video individually, then reorder below."}
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Upload
                  beforeUpload={(file) => handleAddImage(file as RcFile)}
                  showUploadList={false}
                  maxCount={1}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  disabled={sequence.length >= MAX_ITEMS}
                >
                  <Button
                    type="default"
                    icon={<FaPlus size={12} />}
                    className="w-full md:w-auto public-media-add-btn"
                  >
                    Add Image
                  </Button>
                </Upload>
                <Upload
                  beforeUpload={(file) => handleAddVideo(file as RcFile)}
                  showUploadList={false}
                  maxCount={1}
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={sequence.length >= MAX_ITEMS}
                >
                  <Button
                    type="default"
                    icon={<FaPlus size={12} />}
                    className="w-full md:w-auto public-media-add-btn"
                  >
                    Add Video
                  </Button>
                </Upload>
                <div className="text-xs text-gray-500 flex items-center">
                  Max file size: 50MB per item
                </div>
              </div>
            </div>
          </Form.Item>
        ) : (
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
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag files to upload</p>
              <p className="ant-upload-hint">
                Images (jpg, png, webp, gif) and videos (mp4, webm, mov).
                Max file size: 50MB. Max files: {MAX_ITEMS}
              </p>
            </Dragger>
          </Form.Item>
        )}

        {/* ── Sequence list ─────────────────────────────────────────────── */}
        {sequence.length > 0 && (
          <Form.Item
            label={
              isPublicTemplate
                ? "Sequence — drag to reorder and edit item settings"
                : "Sequence — drag to reorder"
            }
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sequence.map((e) => e.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {sequence.map((entry, i) => (
                    <SortableRow
                      key={entry.uid}
                      entry={entry}
                      index={i}
                      showPlaybackSettings={isPublicTemplate}
                      onRemove={removeItem}
                      onChange={updateItem}
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
                <Input
                  {...field}
                  type="text"
                  placeholder="Type tag name here…"
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    if (event.target.value.trim().length > 0) {
                      setValue("tagSelect", undefined, { shouldValidate: true });
                    }
                  }}
              />
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
                placeholder="Select tag…"
                style={{ width: "100%" }}
                value={field.value || undefined}
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                onChange={(selected) => {
                  field.onChange(selected);
                  if (selected) {
                    setValue("tagCreate", "", { shouldValidate: true });
                  }
                }}
                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                popupClassName="modal-select-dropdown"
              >
                {existingTagOptions.map((tag, index) => (
                  <Select.Option value={tag} key={`${tag}-${index}`}>
                    {tag}
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
                placeholder="Search or select language…"
                style={{ width: "100%" }}
                value={field.value || undefined}
                onChange={field.onChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                optionFilterProp="children"
                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                popupClassName="modal-select-dropdown"
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
            loading={createScroll.isPending}
            disabled={createScroll.isPending}
          >
            {createScroll.isPending ? "Creating..." : `Create ${entityLabel} Template`}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};
