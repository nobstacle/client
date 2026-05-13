/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  getSlideshowTemplateControllerGetTextTagsQueryKey,
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useCompanyControllerGetCompany,
  useSlideshowTemplateControllerGetTextTags,
  useUploadControllerUploadCompanyFileMany,
} from "../../../lib/client/api";
import { Button, Upload, Select, Typography, Space, Alert, Input, InputNumber } from "antd";
import { UploadOutlined } from "@ant-design/icons";
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
import { FaGripVertical, FaPlay } from "react-icons/fa";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { languages } from "../../../constant/languages";
import type { RcFile } from "antd/es/upload/interface";
import { RecommendedDimensions } from "./RecommendedDimensions";

const { Text } = Typography;
const { Option } = Select;

const SUPPORTED_SLIDESHOW_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_ITEMS = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface SequenceEntry {
  uid: string;
  file: RcFile;
  previewUrl: string;
  mediaType: "image" | "video";
  order: number;
  expiresAt?: string;
  durationSeconds?: number;
}

interface CreateSlideshowTemplateFormFieldValues {
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
        yup
          .string()
          .required("Tag is required")
          .max(30, "Tag must be at most 30 characters"),
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

        <div className="relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-gray-200 bg-white">
          {entry.mediaType === "video" ? (
            <>
              <video
                src={entry.previewUrl}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-xs">
                <FaPlay />
              </div>
            </>
          ) : (
            <img
              src={entry.previewUrl}
              alt={`slideshow-preview-${index + 1}`}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <span className="flex-1 text-xs text-gray-700 truncate">{entry.file.name}</span>

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

      <div
        className={
          entry.mediaType === "image"
            ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
            : "grid grid-cols-1 gap-2"
        }
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 whitespace-nowrap">
            Expiry
          </span>
          <Input
            size="small"
            type="datetime-local"
            value={toLocalDateTimeInputValue(entry.expiresAt)}
            onChange={(event) =>
              onChange(entry.uid, {
                expiresAt: fromLocalDateTimeInputValue(event.target.value),
              })
            }
            placeholder="Date and time"
          />
        </div>

        {entry.mediaType === "image" ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                Duration
              </span>
              <InputNumber
                size="small"
                min={1}
                max={1209600}
                value={entry.durationSeconds}
                onChange={(value) =>
                  onChange(entry.uid, {
                    durationSeconds:
                      typeof value === "number" ? Math.floor(value) : undefined,
                  })
                }
                placeholder="Display duration"
                addonAfter="sec"
                className="w-full"
              />
            </div>
            <div className="text-[11px] text-gray-500">
              Controls how long the image is shown.
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500">
            Videos play until they end.
          </div>
        )}
      </div>
    </div>
  );
};

export const CreateSlideshowTemplateForm: React.FC<{
  cb?: () => void;
}> = ({ cb }) => {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateSlideshowTemplateFormFieldValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      langCode: "",
      tagCreate: "",
      tagSelect: "",
    },
  });

  const company = useCompanyControllerGetCompany();
  const slideshowTags = useSlideshowTemplateControllerGetTextTags();

  const [sequence, setSequence] = React.useState<SequenceEntry[]>([]);
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);

  const uploadManyFile = useUploadControllerUploadCompanyFileMany({
    mutation: { retry: 0 },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSequence((prev) => {
        const oldIndex = prev.findIndex((item) => item.uid === active.id);
        const newIndex = prev.findIndex((item) => item.uid === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((entry, idx) => ({
          ...entry,
          order: idx + 1,
        }));
      });
    }
  };

  const appendMedia = (file: RcFile): boolean => {
    setSequenceError(null);

    if (sequence.length >= MAX_ITEMS) {
      setSequenceError(`Maximum ${MAX_ITEMS} items allowed.`);
      return false;
    }

    if (!SUPPORTED_SLIDESHOW_MIME_TYPES.has(file.type)) {
      setSequenceError("Only image/video files are allowed.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSequenceError("File size must be less than 50MB.");
      return false;
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const previewUrl = URL.createObjectURL(file);

    setSequence((prev) => [
      ...prev,
      {
        uid: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        mediaType,
        order: prev.length + 1,
        expiresAt: undefined,
        durationSeconds: mediaType === "image" ? 6 : undefined,
      },
    ]);

    return false;
  };

  const handleAddImage = (file: RcFile): boolean => {
    if (!file.type.startsWith("image/")) {
      setSequenceError("Please select a valid image file.");
      return false;
    }
    return appendMedia(file);
  };

  const handleAddVideo = (file: RcFile): boolean => {
    if (!file.type.startsWith("video/")) {
      setSequenceError("Please select a valid video file.");
      return false;
    }
    return appendMedia(file);
  };

  const removeItem = (uid: string) => {
    setSequence((prev) =>
      prev
        .filter((entry) => entry.uid !== uid)
        .map((entry, index) => ({ ...entry, order: index + 1 })),
    );
  };

  const updateItem = (uid: string, updates: Partial<SequenceEntry>) => {
    setSequence((prev) =>
      prev.map((entry) => (entry.uid === uid ? { ...entry, ...updates } : entry)),
    );
  };

  const onSubmit = (data: CreateSlideshowTemplateFormFieldValues) => {
    if (sequence.length === 0) {
      setSequenceError("Please upload at least one media item.");
      return;
    }

    const ordered = [...sequence].sort((a, b) => a.order - b.order);

    uploadManyFile.mutate(
      {
        data: {
          file: ordered.map((entry) => entry.file),
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          langCode: data.langCode,
          tag: (data.tagCreate as string) || (data.tagSelect as string),
          itemsMetadata: JSON.stringify(
            ordered.map((entry) => ({
              order: entry.order,
              mediaType: entry.mediaType,
              expiresAt: entry.expiresAt,
              durationSeconds:
                entry.mediaType === "image" ? entry.durationSeconds : undefined,
            })),
          ),
        },
      },
      {
        onSuccess: () => {
          cb?.();
          void queryClient.invalidateQueries({
            queryKey: getTemplateControllerGetSlideshowTemplatesQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getSlideshowTemplateControllerGetTextTagsQueryKey(),
          });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="create-template-form">
      <hr />
      <Space direction="vertical" size="middle" style={{ width: "100%", paddingTop: "1rem" }}>
        <RecommendedDimensions />
        <div>
          <Text>
            Add media ({sequence.length}/{MAX_ITEMS})
          </Text>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <Upload
              beforeUpload={(file) => handleAddImage(file as RcFile)}
              showUploadList={false}
              maxCount={1}
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              disabled={sequence.length >= MAX_ITEMS}
            >
              <Button htmlType="button" style={{ color: "#000" }}>
                <UploadOutlined className="mr-1" />
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
              <Button htmlType="button" style={{ color: "#000" }}>
                <UploadOutlined className="mr-1" />
                Add Video
              </Button>
            </Upload>
          </div>
          {sequenceError && (
            <div className="text-xs text-rose-600 mt-1">{sequenceError}</div>
          )}
        </div>

        {sequence.length > 0 && (
          <div>
            <Text>Sequence (drag to reorder)</Text>
            <div className="mt-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sequence.map((entry) => entry.uid)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {sequence.map((entry, index) => (
                      <SortableRow
                        key={entry.uid}
                        entry={entry}
                        index={index}
                        onRemove={removeItem}
                        onChange={updateItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ width: "100%" }}>
            <Text>Create a tag</Text>
            <Controller
              name="tagCreate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Type tag name here..."
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    if (event.target.value.trim().length > 0) {
                      setValue("tagSelect", "", { shouldValidate: true });
                    }
                  }}
                />
              )}
            />
          </div>

          <div style={{ marginTop: "16px", width: "100%" }}>
            <Text>Or select an existing tag</Text>
            <Controller
              name="tagSelect"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="Select tag..."
                  style={{ width: "100%" }}
                  value={field.value || undefined}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      setValue("tagCreate", "", { shouldValidate: true });
                    }
                  }}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                  popupClassName="modal-select-dropdown"
                  allowClear
                >
                  {slideshowTags.data?.map((value, index) => (
                    <Option value={value.tag} key={`${value.tag}-${index}`}>
                      {value.tag}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Text>Language</Text>
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                placeholder="Search or select language..."
                style={{ width: "100%" }}
                value={field.value || undefined}
                onChange={field.onChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                optionFilterProp="children"
                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                popupClassName="modal-select-dropdown"
              >
                {languages.map(({ code, name }, index) => (
                  <Select.Option value={code} key={index}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </div>

        <div style={{ textAlign: "center" }}>
          {errors.tagSelect && (
            <Alert
              message={errors.tagSelect?.message || "Tag is required"}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
          {errors.tagCreate && (
            <Alert
              message={errors.tagCreate?.message}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
          {errors.langCode && (
            <Alert
              message={errors.langCode?.message || "Language is required"}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}

          {uploadManyFile.error?.message && (
            <Alert
              message={uploadManyFile.error.response?.data.message}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          loading={uploadManyFile.status === "pending"}
          disabled={uploadManyFile.status === "pending" || sequence.length === 0}
          style={{ width: "100%" }}
          className="create-template-button"
        >
          Create Template
        </Button>
      </Space>
    </form>
  );
};
