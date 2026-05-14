/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getContentControllerFindOneQueryKey,
  getSlideshowTemplateControllerGetTextTagsQueryKey,
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useUploadControllerPatchCompanyFileMany,
} from "../../../lib/client/api";
import { Button } from "../../Button";
import { arrayMove } from "@dnd-kit/sortable";
import { linkToFile } from "../../../utils";
import { Spinner } from "../../Spinner";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, Typography, Input, InputNumber } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { FaGripVertical, FaPlay } from "react-icons/fa";
import type { RcFile } from "antd/es/upload/interface";
import { RecommendedDimensions } from "./RecommendedDimensions";

const { Text } = Typography;

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

interface SlideshowItemMetadata {
  order?: number;
  mediaType?: "image" | "video";
  expiresAt?: string;
  durationSeconds?: number;
}

interface SequenceEntry {
  uid: string;
  file?: RcFile;
  name: string;
  previewUrl: string;
  mediaType: "image" | "video";
  order: number;
  expiresAt?: string;
  durationSeconds?: number;
}

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

const parseSlideshowMetadata = (
  raw?: string | null,
): SlideshowItemMetadata[] => {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getFilenameFromUrl = (value: string) => {
  if (!value) return "existing-media";

  try {
    const parsed = new URL(value);
    const filename = parsed.pathname.split("/").filter(Boolean).pop();
    return filename || "existing-media";
  } catch {
    const filename = value.split("?")[0].split("/").filter(Boolean).pop();
    return filename || "existing-media";
  }
};

const isVideoSource = (value: string) => {
  if (!value) return false;
  const normalized = value.split("?")[0].toLowerCase();
  return [".mp4", ".webm", ".mov", ".avi", ".m4v"].some((ext) =>
    normalized.endsWith(ext),
  );
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
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-xs">
                <FaPlay />
              </div>
            </>
          ) : (
            <img
              src={entry.previewUrl}
              alt={`slideshow-preview-${index + 1}`}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <span className="flex-1 text-xs text-gray-700 truncate">{entry.name}</span>

        {entry.file ? (
          <span className="flex-shrink-0 text-xs text-gray-400">
            {(entry.file.size / 1024 / 1024).toFixed(1)}MB
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs text-gray-400">Existing</span>
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

export const UpdateSlideshowTemplateForm: React.FC<{
  cb?: () => void;
  langCode: string;
  sourceId: number;
  tag: string;
}> = ({ cb, sourceId, langCode, tag }) => {
  const queryClient = useQueryClient();
  const [sequence, setSequence] = React.useState<SequenceEntry[]>([]);
  const [sequenceError, setSequenceError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const content = useContentControllerFindOne(
    {
      refType: "Slideshow",
      sourceId,
      langCode,
    },
      {
        query: {
          queryKey: getContentControllerFindOneQueryKey({
            refType: "Slideshow",
            sourceId,
            langCode,
          }),
          retry: 0,
        },
      },
    );

  React.useEffect(() => {
    if (!content.isLoading && content.isError) {
      console.error("Failed to load slideshow template for editing:", content.error);
      setLoadError("Failed to load slideshow template. Please reopen and try again.");
      setSequenceError(null);
      setSequence([]);
    }
  }, [content.error, content.isError, content.isLoading]);

  const fetchContent = React.useCallback(() => {
    if (!content.isSuccess) return;

    try {
      const metadata = parseSlideshowMetadata(content.data?.extraContent);
      const storedContents = Array.isArray(content.data?.contents)
        ? content.data.contents
        : [];

      const nextSequence: SequenceEntry[] = storedContents.map((itemUrl, index) => {
        const itemMeta = metadata[index] || {};
        const mediaType = itemMeta.mediaType || (isVideoSource(itemUrl) ? "video" : "image");

        return {
          uid: `${Date.now()}-${index}-${Math.random()}`,
          file: undefined,
          name: getFilenameFromUrl(itemUrl),
          previewUrl: itemUrl,
          mediaType,
          order: index + 1,
          expiresAt: itemMeta.expiresAt,
          durationSeconds: mediaType === "image" ? itemMeta.durationSeconds : undefined,
        };
      });

      setLoadError(null);
      setSequence(nextSequence);
    } catch (error) {
      console.error("Failed to load slideshow template for editing:", error);
      setLoadError("Failed to load slideshow template. Please reopen and try again.");
      setSequenceError(null);
      setSequence([]);
    }
  }, [content.data?.contents, content.data?.extraContent, content.isSuccess]);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const company = useCompanyControllerGetCompany();

  const uploadManyFile = useUploadControllerPatchCompanyFileMany({
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
        name: file.name,
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

  const handleCreateSlideshowTemplate = async () => {
    if (sequence.length === 0) {
      setSequenceError("Please upload at least one media item.");
      return;
    }

    try {
      const ordered = [...sequence].sort((a, b) => a.order - b.order);
      const files = await Promise.all(
        ordered.map(async (entry) => {
          if (entry.file) return entry.file;

          const linked = (await linkToFile(entry.previewUrl)) as RcFile;
          return new File([linked], linked.name || `${entry.name || "media"}.bin`, {
            type: linked.type,
          }) as RcFile;
        }),
      );

      uploadManyFile.mutate(
        {
          data: {
            file: files,
            defaultLangCode: company.data?.defaultLangCode ?? "en",
            langCode,
            tag,
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
    } catch (error) {
      console.error("Failed to prepare slideshow files for editing:", error);
      setLoadError("Failed to load one or more slideshow items for editing.");
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleCreateSlideshowTemplate();
      }}
    >
      <div className="mt-3 flex flex-col gap-4">
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
              disabled={sequence.length >= MAX_ITEMS || content.isLoading}
            >
              <Button type="button" style={{ color: "#000" }}>
                <UploadOutlined className="mr-1" />
                Add Image
              </Button>
            </Upload>

            <Upload
              beforeUpload={(file) => handleAddVideo(file as RcFile)}
              showUploadList={false}
              maxCount={1}
              accept="video/mp4,video/webm,video/quicktime"
              disabled={sequence.length >= MAX_ITEMS || content.isLoading}
            >
              <Button type="button" style={{ color: "#000" }}>
                <UploadOutlined className="mr-1" />
                Add Video
              </Button>
            </Upload>
          </div>
          {sequenceError && <p className="text-xs text-rose-600 mt-1">{sequenceError}</p>}
        </div>

        <div className="flex flex-col gap-2">
          {loadError && <p className="text-xs text-rose-600">{loadError}</p>}
          {content.isLoading && sequence.length === 0 && <Spinner />}

          {sequence.length > 0 && (
            <>
              <Text>Sequence (drag to reorder)</Text>
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
            </>
          )}
        </div>

        <div className="text-center">
          {uploadManyFile.error?.message && (
            <p className="text-xs text-rose-600">
              {uploadManyFile.error.response?.data.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          isLoading={uploadManyFile.status === "pending"}
          disabled={uploadManyFile.status === "pending" || sequence.length < 1}
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
