"use client";

import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useScrollControllerGetScrolls,
  useScrollControllerDelete,
  useScrollControllerUpdateOrder,
  getScrollControllerGetScrollsQueryKey,
  type GetScrollTemplateRes,
  type ScrollMediaItem,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useState, useMemo, useRef } from "react";
import { Card, Tooltip, message } from "antd";
import { FaPlay, FaImage, FaFilm } from "react-icons/fa";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import "../../../styles/base.css";
import { CreateScrollTemplateForm } from "../../../components/pages/dashboard/CreateScrollTemplateForm";
import { UpdateScrollTemplateForm } from "../../../components/pages/dashboard/UpdateScrollTemplateForm";
import { isScrollTagInScope, toDisplayScrollTag } from "../../../utils/scrollScope";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScreensDashboard() {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 500;

  const [searchResults, setSearchResults] = useState<GetScrollTemplateRes[]>([]);
  const [editTemplate, setEditTemplate] =
    useState<null | GetScrollTemplateRes>(null);
  const [previewTemplate, setPreviewTemplate] =
    useState<null | GetScrollTemplateRes>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  // Optimistic local order — set immediately on drag, cleared after server confirms
  const [localScrolls, setLocalScrolls] = useState<GetScrollTemplateRes[] | null>(null);
  const orderPendingRef = useRef(false);
  const isHydrated = useHasHydrated();

  // ── Params / company ────────────────────────────────────────────────────────
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();
  const { emitSendTemplate } = useSocketContext();
  const queryClient = useQueryClient();

  const currentLang =
    params.get("lang") || companyData?.defaultLangCode || "en";

  // ── Data fetching via React Query ────────────────────────────────────────────
  // enabled only after hydration so we never fetch before the session is ready
  const { data: scrollsData, isLoading, refetch: refetchScrolls } = useScrollControllerGetScrolls(
    { limit: 100 },
    { query: { enabled: isHydrated } }
  );

  const deleteScroll = useScrollControllerDelete();
  const updateOrder = useScrollControllerUpdateOrder();

  const serverScrolls: GetScrollTemplateRes[] = scrollsData?.data ?? [];
  // Use local optimistic order while a drag-reorder is in flight
  const allScrolls = localScrolls ?? serverScrolls;
  const scrolls = useMemo(
    () => allScrolls.filter((s) => isScrollTagInScope(s.tag, "public")),
    [allScrolls],
  );

  const invalidateScrolls = () =>
    queryClient.invalidateQueries({
      queryKey: getScrollControllerGetScrollsQueryKey({ limit: 100 }),
    });

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    if (!value) { setSearchResults([]); return; }
    setSearchResults(
      scrolls.filter((s) =>
        toDisplayScrollTag(s.tag).toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  const handleClearSearch = () => setSearchResults([]);

  // ── Derived display list ─────────────────────────────────────────────────────
  const displayedScrolls = useMemo(() => {
    const source = searchResults.length > 0 ? searchResults : scrolls;

    const grouped = source.reduce((acc, s) => {
      if (!acc[s.tag]) acc[s.tag] = [];
      acc[s.tag].push(s);
      return acc;
    }, {} as Record<string, GetScrollTemplateRes[]>);

    const display: (GetScrollTemplateRes & { isAvailableInCurrentLang: boolean })[] = [];

    Object.values(grouped).forEach((tagScrolls) => {
      const defaultLang =
        tagScrolls.find((s) => {
          const lc = s.langCode;
          if (typeof lc !== "string") return false;
          return lc.includes(companyData?.defaultLangCode || "en");
        }) || tagScrolls[0];

      const isAvailableInCurrentLang = tagScrolls.some((s) => {
        const lc = s.langCode;
        if (typeof lc !== "string") return false;
        return lc.includes(currentLang);
      });

      if (!defaultLang) return;
      display.push({ ...defaultLang, isAvailableInCurrentLang });
    });

    return display.sort((a, b) => a.order - b.order);
  }, [scrolls, searchResults, currentLang, companyData?.defaultLangCode]);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();

  // ── Actions ──────────────────────────────────────────────────────────────────
  const sendTemplate = (id: number, isAvailable: boolean, items: ScrollMediaItem[]) => {
    const now = Date.now();
    const activeItems = (items || []).filter((item) => {
      if (!item.expiresAt) return true;
      const expiresAt = new Date(item.expiresAt).getTime();
      if (Number.isNaN(expiresAt)) return true;
      return expiresAt > now;
    });

    if (activeItems.length === 0) {
      message.warning("All media items are expired in this screens template.");
      return;
    }

    emitSendTemplate({
      refId: id,
      langCode: isAvailable ? currentLang : companyData?.defaultLangCode || "en",
      refType: ChatType.Scroll,
      station: Number(params.get("station") ?? 1),
      contentExtra: JSON.stringify(activeItems),
    });
  };

  const onDeleteCard = async (id: number) => {
    try {
      await deleteScroll.mutateAsync({ id });
      await invalidateScrolls();
      message.success("Screens template deleted successfully");
    } catch (error) {
      console.error("Error deleting scroll:", error);
      message.error("Failed to delete screens template");
    }
  };

  const onUpdateCard = (scroll: GetScrollTemplateRes) => {
    setEditTemplate(scroll);
    updateHandleOpen();
  };

  const sortScrolls = async (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    const oldIndex = scrolls.findIndex((s) => s.id === item1);
    const newIndex = scrolls.findIndex((s) => s.id === item2);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove([...scrolls], oldIndex, newIndex);

    const seenTags = new Set<string>();
    const uniqueTags: string[] = [];
    for (const s of reordered) {
      if (!seenTags.has(s.tag)) { seenTags.add(s.tag); uniqueTags.push(s.tag); }
    }

    const grouped = reordered.reduce((acc, s) => {
      if (!acc[s.tag]) acc[s.tag] = [];
      acc[s.tag].push(s);
      return acc;
    }, {} as Record<string, GetScrollTemplateRes[]>);

    const final: GetScrollTemplateRes[] = [];
    let counter = 1;
    uniqueTags.forEach((tag) => {
      grouped[tag].forEach((s) => { final.push({ ...s, order: counter }); });
      counter++;
    });

    // Optimistic update — no flicker, no reload
    orderPendingRef.current = true;
    setLocalScrolls(final);

    try {
      await updateOrder.mutateAsync({
        data: { scrolls: final.map((s) => ({ id: s.id, order: s.order })) },
      });
      await invalidateScrolls();
    } catch (error) {
      console.error("Error updating scroll order:", error);
      message.error("Failed to update screens order");
      setLocalScrolls(null); // roll back to server data
    } finally {
      orderPendingRef.current = false;
      setLocalScrolls(null);
    }
  };

  // ── Preview helpers ──────────────────────────────────────────────────────────
  const currentPreviewItem = previewTemplate?.items?.[previewIndex] ?? null;
  const goNext = () =>
    setPreviewIndex((i) => Math.min(i + 1, (previewTemplate?.items?.length ?? 1) - 1));
  const goPrev = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!isHydrated) return <div />;

  if (isLoading && scrolls.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-gray-500">Loading screens templates...</div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? "p-2" : "p-6"}`}
    >
      {displayedScrolls.length > 0 && (
        <Card className="w-full customCards">
          <div className="searchInputWidth">
            <SearchTemplateForm
              searchOnChange={handleSearch}
              onClear={handleClearSearch}
              placeholder="Search screens template"
            />
          </div>
        </Card>
      )}

      {userData?.user.Roles?.includes("Admin") && (
        <Modal
          title="Create Screen Template"
          closeModal={handleClose}
          isOpen={isOpen}
          panelStyleClass="max-w-[96vw] xl:max-w-7xl"
        >
          <div className="max-h-[78vh] overflow-y-auto pr-1">
            <CreateScrollTemplateForm
              entityLabel="Screens"
              templateScope="public"
              cb={async () => {
                setSearchResults([]);
                setLocalScrolls(null);
                handleClose();
                await invalidateScrolls();
                await refetchScrolls();
              }}
            />
          </div>
        </Modal>
      )}

      <div id="card-wrapper" className="flex h-full w-full">
        <div className="flex w-full flex-wrap content-start gap-4">
          {displayedScrolls.length === 0 && !isLoading ? (
            <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-lg">No screens templates found</p>
              {userData?.user.Roles?.includes("Admin") && (
                <p className="text-sm mt-2">Click the + button to create your first screens template</p>
              )}
            </div>
          ) : (
            <DraggableCardContainer items={displayedScrolls} sort={sortScrolls}>
              {displayedScrolls.map((val) => (
                <DraggableCardItem
                  onDelete={() => onDeleteCard(val.id)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  onUpdate={() => onUpdateCard(val)}
                  key={val.id}
                  tag={toDisplayScrollTag(val.tag)}
                  isAvailable={val.isAvailableInCurrentLang}
                  sendOnClick={() =>
                    sendTemplate(val.id, val.isAvailableInCurrentLang, val.items)
                  }
                  isDraggable={searchResults.length === 0}
                  id={val.id}
                  type="Scroll"
                >
                  <Tooltip title="Click to preview screens template">
                    <div
                      className="relative w-full h-full bg-gradient-to-br from-indigo-900 to-violet-800 flex items-center justify-center cursor-pointer group overflow-hidden"
                      onClick={() => { setPreviewIndex(0); setPreviewTemplate(val); }}
                    >
                      <div className="absolute top-1 left-1 flex gap-0.5 flex-wrap max-w-full">
                        {val.items?.slice(0, 6).map((item, i) => (
                          <span key={i} className="flex items-center justify-center w-4 h-4 rounded-sm bg-white/20 backdrop-blur-sm">
                            {item.mediaType === "image"
                              ? <FaImage className="w-2 h-2 text-white" />
                              : <FaFilm className="w-2 h-2 text-white" />}
                          </span>
                        ))}
                        {(val.items?.length ?? 0) > 6 && (
                          <span className="text-white/70 text-[9px] leading-4">
                            +{val.items.length - 6}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-8 right-1 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        {val.items?.length ?? 0} items
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-90">
                          <FaPlay className="w-4 h-4 text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    </div>
                  </Tooltip>
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>
          )}

          {editTemplate && (
          <Modal
            title="Update Screen Template"
            closeModal={updateHandleClose}
            isOpen={updateIsOpen}
            panelStyleClass="max-w-[96vw] xl:max-w-7xl"
            className="customPublicModal"
          >
              <div className="max-h-[78vh] overflow-y-auto pr-1">
                <UpdateScrollTemplateForm
                  entityLabel="Screens"
                  defaultLangCode={currentLang}
                  sourceId={editTemplate.id}
                  tag={toDisplayScrollTag(editTemplate.tag)}
                  existingItems={editTemplate.items}
                  cb={() => { updateHandleClose(); invalidateScrolls(); }}
                />
              </div>
            </Modal>
          )}
        </div>
      </div>

      {previewTemplate && (
        <Modal
          title={`Preview: ${toDisplayScrollTag(previewTemplate.tag)}`}
          closeModal={() => setPreviewTemplate(null)}
          isOpen={!!previewTemplate}
        >
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full relative bg-black rounded-lg overflow-hidden min-h-[240px] flex items-center justify-center">
              {currentPreviewItem?.mediaType === "video" ? (
                <video
                  key={currentPreviewItem.signedUrl || currentPreviewItem.url}
                  controls autoPlay
                  className="w-full h-auto max-h-[420px] rounded-lg"
                  src={currentPreviewItem.signedUrl || currentPreviewItem.url}
                >
                  Your browser does not support the video tag.
                </video>
              ) : currentPreviewItem?.mediaType === "image" ? (
                <img
                  key={currentPreviewItem.signedUrl || currentPreviewItem.url}
                  src={currentPreviewItem.signedUrl || currentPreviewItem.url}
                  alt={`Slide ${previewIndex + 1}`}
                  className="w-full h-auto max-h-[420px] object-contain rounded-lg"
                />
              ) : (
                <p className="text-white/50 text-sm">No media available</p>
              )}
            </div>

            <div className="flex items-center gap-4 w-full justify-center">
              <button disabled={previewIndex === 0} onClick={goPrev}
                className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-sm font-medium">
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                {previewIndex + 1} / {previewTemplate.items?.length ?? 0}
              </span>
              <button
                disabled={previewIndex === (previewTemplate.items?.length ?? 1) - 1}
                onClick={goNext}
                className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-sm font-medium">
                Next →
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto w-full pb-1">
              {previewTemplate.items?.map((item, i) => (
                <button key={i} onClick={() => setPreviewIndex(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${i === previewIndex ? "border-indigo-500 scale-105" : "border-transparent opacity-60 hover:opacity-90"}`}>
                  {item.mediaType === "image" ? (
                    <img src={item.signedUrl || item.url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <FaFilm className="text-white/60 w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {userData?.user.Roles?.includes("Admin") && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <button
            onClick={handleOpen}
            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
            aria-label="Create new screens template"
          >
            <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />
            <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              Create Screen Template
              <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
