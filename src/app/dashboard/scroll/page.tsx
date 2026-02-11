"use client";

import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { useCompanyControllerGetCompany } from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useState, useMemo, useEffect } from "react";
import { Card, Tooltip, message } from "antd";
import { FaPlay, FaImage, FaFilm } from "react-icons/fa";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import "../../../styles/base.css";
import { CreateScrollTemplateForm } from "../../../components/pages/dashboard/CreateScrollTemplateForm";
import { UpdateScrollTemplateForm } from "../../../components/pages/dashboard/UpdateScrollTemplateForm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrollMediaItem {
  url: string;
  name: string;
  mediaType: "image" | "video";
  order: number;
  ext: string;
  signedUrl?: string;
}

export interface GetScrollTemplateRes {
  id: number;
  tag: string;
  langCode: string;
  order: number;
  items: ScrollMediaItem[];
}

const Url = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrollDashboard() {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 500;
  const [scrolls, setScrolls] = useState<GetScrollTemplateRes[]>([]);
  const [searchResults, setSearchResults] = useState<GetScrollTemplateRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] =
    useState<null | GetScrollTemplateRes>(null);
  const [previewTemplate, setPreviewTemplate] =
    useState<null | GetScrollTemplateRes>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const isHydrated = useHasHydrated();

  // ── Params / company ────────────────────────────────────────────────────────
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();
  const { emitSendTemplate } = useSocketContext();
  const { data } = useSession();

  const currentLang =
    params.get("lang") || companyData?.defaultLangCode || "en";

  // ── Fetch scrolls ───────────────────────────────────────────────────────────
  const fetchScrolls = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${Url}/api/v1/scrolls?limit=100`, {
        headers: { Authorization: `Bearer ${data.user.backendTokens.at}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch scrolls");
      }

      const result = await response.json();
      setScrolls(result.data || []);
    } catch (error) {
      console.error("Error fetching scrolls:", error);
      message.error("Failed to load scroll templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && data?.user.backendTokens.at) {
      fetchScrolls();
    }
  }, [isHydrated, data?.user]);

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    if (!value) {
      setSearchResults([]);
      return;
    }
    const filtered = scrolls.filter((s) =>
      s.tag.toLowerCase().includes(value.toLowerCase()),
    );
    setSearchResults(filtered);
  };

  const handleClearSearch = () => setSearchResults([]);

  // ── Derived display list ─────────────────────────────────────────────────────
  const displayedScrolls = useMemo(() => {
    const source = searchResults.length > 0 ? searchResults : scrolls;

    const grouped = source.reduce(
      (acc, s) => {
        if (!acc[s.tag]) acc[s.tag] = [];
        acc[s.tag].push(s);
        return acc;
      },
      {} as Record<string, GetScrollTemplateRes[]>,
    );

    const display: (GetScrollTemplateRes & {
      isAvailableInCurrentLang: boolean;
    })[] = [];

    Object.values(grouped).forEach((tagScrolls) => {
      // ── Defensive find ───────────────────────────────────────
      const defaultLang =
        tagScrolls.find((s) => {
          // Guard against undefined / null / non-string langCode
          const lc = s.langCode;
          if (typeof lc !== "string") return false;
          return lc.includes(companyData?.defaultLangCode || "en");
        }) || tagScrolls[0];

      // ── Defensive some ───────────────────────────────────────
      const isAvailableInCurrentLang = tagScrolls.some((s) => {
        const lc = s.langCode;
        if (typeof lc !== "string") return false;
        return lc.includes(currentLang);
      });

      // Fallback if tagScrolls is empty (shouldn't happen, but safe)
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
  const sendTemplate = (
    id: number,
    isAvailable: boolean,
    items: ScrollMediaItem[],
  ) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable ? currentLang : companyData?.defaultLangCode || "en",
      refType: ChatType.Scroll,
      station: Number(params.get("station") ?? 1),
      contentExtra: JSON.stringify(items),
    });
  };

  const onDeleteCard = async (id: number) => {
    try {
      const response = await fetch(`${Url}/api/v1/scrolls/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${data.user.backendTokens.at}` },
      });

      if (!response.ok) throw new Error("Failed to delete scroll");

      await fetchScrolls();
      message.success("Scroll template deleted successfully");
    } catch (error) {
      console.error("Error deleting scroll:", error);
      message.error("Failed to delete scroll template");
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

    const reordered = arrayMove(scrolls, oldIndex, newIndex);

    const grouped = reordered.reduce((acc: any, s: any) => {
      if (!acc[s.tag]) acc[s.tag] = [];
      acc[s.tag].push(s);
      return acc;
    }, {} as Record<string, any[]>);

    const uniqueTags = reordered
      .map((s) => s.tag)
      .filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i);

    const final: GetScrollTemplateRes[] = [];
    let counter = 1;
    uniqueTags.forEach((tag: string) => {
      grouped[tag].forEach((s: GetScrollTemplateRes) => {
        final.push({ ...s, order: counter });
      });
      counter++;
    });

    setScrolls(final);

    // Update order on backend
    try {
      const updates = final.map((s) => ({ id: s.id, order: s.order }));

      await fetch(`${Url}/api/v1/scrolls/order/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.user.backendTokens.at}`
        },
        body: JSON.stringify({ scrolls: updates }),
      });
    } catch (error) {
      console.error("Error updating scroll order:", error);
      message.error("Failed to update scroll order");
    }
  };

  // ── Preview helpers ──────────────────────────────────────────────────────────
  const currentPreviewItem = previewTemplate?.items?.[previewIndex] ?? null;
  const goNext = () =>
    setPreviewIndex((i) =>
      Math.min(i + 1, (previewTemplate?.items?.length ?? 1) - 1),
    );
  const goPrev = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!isHydrated) return <div />;

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-gray-500">Loading scroll templates...</div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? "p-2" : "p-6"
        }`}
    >
      {/* Search bar */}
      {displayedScrolls.length > 0 && (
        <Card className="w-full customCards">
          <div className="searchInputWidth">
            <SearchTemplateForm
              searchOnChange={handleSearch}
              onClear={handleClearSearch}
              placeholder="Search scroll template"
            />
          </div>
        </Card>
      )}

      {/* Create modal */}
      {userData?.user.Roles?.includes("Admin") && (
        <Modal
          title="Create scroll template"
          closeModal={handleClose}
          isOpen={isOpen}
        >
          <CreateScrollTemplateForm
            cb={(newScroll: GetScrollTemplateRes) => {
              handleClose();
              setScrolls(prev => [...prev, newScroll]);

              fetchScrolls().catch(() => {
                setScrolls(prev => prev.filter(s => s.id !== newScroll.id));
                message.error("Failed to refresh list after creation");
              });
            }}
          />
        </Modal>
      )}

      {/* Card grid */}
      <div id="card-wrapper" className="flex h-full w-full">
        <div className="flex w-full flex-wrap content-start gap-4">
          {displayedScrolls.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-lg">No scroll templates found</p>
              {userData?.user.Roles?.includes("Admin") && (
                <p className="text-sm mt-2">Click the + button to create your first scroll template</p>
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
                  tag={val.tag}
                  isAvailable={val.isAvailableInCurrentLang}
                  sendOnClick={() =>
                    sendTemplate(val.id, val.isAvailableInCurrentLang, val.items)
                  }
                  isDraggable={searchResults.length === 0}
                  id={val.id}
                >
                  {/* Card thumbnail */}
                  <Tooltip title="Click to preview scroll">
                    <div
                      className="relative w-full h-full bg-gradient-to-br from-indigo-900 to-violet-800 flex items-center justify-center cursor-pointer group overflow-hidden"
                      onClick={() => {
                        setPreviewIndex(0);
                        setPreviewTemplate(val);
                      }}
                    >
                      {/* Media-type badge strip */}
                      <div className="absolute top-1 left-1 flex gap-0.5 flex-wrap max-w-full">
                        {val.items?.slice(0, 6).map((item, i) => (
                          <span
                            key={i}
                            className="flex items-center justify-center w-4 h-4 rounded-sm bg-white/20 backdrop-blur-sm"
                          >
                            {item.mediaType === "image" ? (
                              <FaImage className="w-2 h-2 text-white" />
                            ) : (
                              <FaFilm className="w-2 h-2 text-white" />
                            )}
                          </span>
                        ))}
                        {(val.items?.length ?? 0) > 6 && (
                          <span className="text-white/70 text-[9px] leading-4">
                            +{val.items.length - 6}
                          </span>
                        )}
                      </div>

                      {/* Count badge */}
                      <div className="absolute bottom-8 right-1 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        {val.items?.length ?? 0} items
                      </div>

                      {/* Play button */}
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

          {/* Update modal */}
          {editTemplate && (
            <Modal
              title="Update scroll template"
              closeModal={updateHandleClose}
              isOpen={updateIsOpen}
            >
              <UpdateScrollTemplateForm
                defaultLangCode={currentLang}
                sourceId={editTemplate.id}
                tag={editTemplate.tag}
                existingItems={editTemplate.items}
                cb={() => {
                  updateHandleClose();
                  fetchScrolls();         // ← this is the key change
                }}
              />
            </Modal>
          )}
        </div>
      </div>

      {/* Scroll Preview Modal */}
      {previewTemplate && (
        <Modal
          title={`Preview: ${previewTemplate.tag}`}
          closeModal={() => setPreviewTemplate(null)}
          isOpen={!!previewTemplate}
        >
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full relative bg-black rounded-lg overflow-hidden min-h-[240px] flex items-center justify-center">
              {currentPreviewItem?.mediaType === "video" ? (
                <video
                  key={currentPreviewItem.signedUrl || currentPreviewItem.url}
                  controls
                  autoPlay
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
              <button
                disabled={previewIndex === 0}
                onClick={goPrev}
                className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-sm font-medium"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                {previewIndex + 1} / {previewTemplate.items?.length ?? 0}
              </span>
              <button
                disabled={
                  previewIndex === (previewTemplate.items?.length ?? 1) - 1
                }
                onClick={goNext}
                className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-sm font-medium"
              >
                Next →
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto w-full pb-1">
              {previewTemplate.items?.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewIndex(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${i === previewIndex
                    ? "border-indigo-500 scale-105"
                    : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                >
                  {item.mediaType === "image" ? (
                    <img
                      src={item.signedUrl || item.url}
                      alt={`thumb-${i}`}
                      className="w-full h-full object-cover"
                    />
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

      {/* FAB */}
      {userData?.user.Roles?.includes("Admin") && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <button
            onClick={handleOpen}
            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
            aria-label="Create new scroll template"
          >
            <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />
            <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              Create Scroll Template
              <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}