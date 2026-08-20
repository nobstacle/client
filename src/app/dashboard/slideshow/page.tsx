"use client";

import Image from "next/image";
import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useSlideshowTemplateControllerDeleteSlideshowTemplateOne,
  useSlideshowTemplateControllerPatchSlideshowTemplateOrder,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { CreateSlideshowTemplateForm } from "../../../components/pages/dashboard/CreateSlideshowTemplateForm";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { DashboardPageSkeleton } from "../../../components/DashboardPageSkeleton";
import { TemplateContextProvider, useTemplateContext } from "../../../context/TemplatesProvider";
import { UpdateSlideshowTemplateForm } from "../../../components/pages/dashboard/UpdateSlideshowTemplateForm";
import { useState, useMemo } from "react";
import {
  GetSlideshowTemplateRes,
} from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Card } from 'antd';
import "../../../styles/base.css";
import {
  groupLanguageAwareTemplates,
  type LanguageAwareTemplate,
} from "../../../utils/templateVariants";

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "m4v"];

const resolvePreviewUrl = (src?: string | string[] | null) => {
  if (Array.isArray(src)) {
    return src.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    ) ?? null;
  }

  if (typeof src === "string" && src.trim().length > 0) {
    return src;
  }

  return null;
};

const isVideoSource = (src?: string | null) => {
  if (!src) return false;
  const normalized = src.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(`.${ext}`));
};

function SlideshowDashboardContent() {
  const [editTemplate, setEditTemplate] =
    useState<null | GetSlideshowTemplateRes>(null);
  const isHydrated = useHasHydrated();
  const { refetchSlideshow } = useTemplateContext();

  const { slideshows, setSlideshows, setSearchSlideshows, searchSlideshows } =
    useTemplateStore();

  const { search, clearSearch } = useSearchTemplate(slideshows, setSearchSlideshows);

  const params = useSearchParams();
  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();

  const deleteSlideshowTemplate =
    useSlideshowTemplateControllerDeleteSlideshowTemplateOne();

  const updateSlideshowTemplateOrder =
    useSlideshowTemplateControllerPatchSlideshowTemplateOrder();

  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  // Get current language
  const defaultLangCode = companyData?.defaultLangCode || "en";
  const currentLang = params.get("lang") || defaultLangCode;

  const editTemplateLangCode = useMemo(() => {
    if (!editTemplate?.langCode?.length) {
      return currentLang;
    }

    if (editTemplate.langCode.includes(currentLang)) {
      return currentLang;
    }

    if (editTemplate.langCode.includes(defaultLangCode)) {
      return defaultLangCode;
    }

    return editTemplate.langCode[0];
  }, [currentLang, defaultLangCode, editTemplate]);

  const slideshowSource = searchSlideshows.length > 0 ? searchSlideshows : slideshows;
  const displayedSlideshowsWithAvailability = useMemo(
    () =>
      groupLanguageAwareTemplates(
        slideshowSource,
        currentLang,
        defaultLangCode,
      ),
    [slideshowSource, currentLang, defaultLangCode],
  );

  const sendTemplate = (
    template: LanguageAwareTemplate<GetSlideshowTemplateRes>,
  ) => {
    emitSendTemplate({
      refId: template.shareTemplate.id,
      langCode: template.shareLangCode,
      refType: ChatType.Slideshow,
      station: Number(params.get("station") ?? 1),
    });
  };

  const onDeleteCard = (id: number) => {
    deleteSlideshowTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newslideshows = slideshows.filter(
            (slideshow) => slideshow.id !== id,
          );
          setSlideshows(newslideshows);
        },
      },
    );
  };

  const onUpdateCard = (slideshow: GetSlideshowTemplateRes) => {
    setEditTemplate(slideshow);
    updateHandleOpen();
  };

  const sortSlideshows = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    // Always work with the full slideshows array (not filtered/displayed array)
    const oldIndex = slideshows.findIndex((item) => item.id === item1);
    const newIndex = slideshows.findIndex((item) => item.id === item2);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not find items for sorting');
      return;
    }

    // Create a shallow copy and move the item
    let reorderedSlideshows = arrayMove(slideshows, oldIndex, newIndex);

    // Group by tag to update order properly
    const groupedByTag = reorderedSlideshows.reduce((acc, slideshow) => {
      if (!acc[slideshow.tag]) {
        acc[slideshow.tag] = [];
      }
      acc[slideshow.tag].push(slideshow);
      return acc;
    }, {} as Record<string, GetSlideshowTemplateRes[]>);

    // Get unique tags in the new order
    const uniqueTags = reorderedSlideshows
      .map(slide => slide.tag)
      .filter((tag, index, self) => self.indexOf(tag) === index);

    // Rebuild the array with all language variants maintaining the new tag order
    const finalOrderedSlideshows: GetSlideshowTemplateRes[] = [];
    let orderCounter = 1;

    uniqueTags.forEach(tag => {
      const tagSlideshows = groupedByTag[tag];
      tagSlideshows.forEach(slide => {
        finalOrderedSlideshows.push({ ...slide, order: orderCounter });
      });
      orderCounter++;
    });

    // Update the order in the backend
    finalOrderedSlideshows.forEach(({ id, order }) => {
      updateSlideshowTemplateOrder.mutate({
        data: { order },
        id,
      });
    });

    // Update the state
    setSlideshows(finalOrderedSlideshows);
  };

  if (isHydrated)
    return (
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto p-2 md:p-4 lg:p-6">
        {displayedSlideshowsWithAvailability.length > 0 && (
          <Card className="w-full customCards">
            <div className="searchInputWidth">
              <SearchTemplateForm
                searchOnChange={search}
                onClear={clearSearch}
                placeholder="Search template"
              />
            </div>
          </Card>
        )}
        {userData?.user.Roles?.includes("Admin") && (
          <Modal
            title="Create template"
            closeModal={handleClose}
            isOpen={isOpen}
            panelStyleClass="max-w-2xl"
          >
            <CreateSlideshowTemplateForm
              cb={async () => {
                handleClose();
                const res = await refetchSlideshow();
                if (res?.data) {
                  setSlideshows(res.data);
                }
              }}
            />
          </Modal>
        )}
        {editTemplate && (
          <Modal
            title="Update template"
            closeModal={updateHandleClose}
            isOpen={updateIsOpen}
          >
            <UpdateSlideshowTemplateForm
              tag={editTemplate.tag}
              langCode={editTemplateLangCode}
              cb={async () => {
                updateHandleClose();
                const res = await refetchSlideshow();
                if (res?.data) {
                  setSlideshows(res.data);
                }
              }}
              sourceId={editTemplate.id}
            />
          </Modal>
        )}

        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer
              items={displayedSlideshowsWithAvailability}
              sort={sortSlideshows}
            >
              {displayedSlideshowsWithAvailability?.map((val) => (
                // Some slideshow records may not have a signed media URL yet.
                // In that case, show a safe placeholder instead of letting next/image crash.
                <DraggableCardItem
                  id={val.id}
                  tag={val.tag}
                  key={val.id}
                  onDelete={() => onDeleteCard(val.id)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  isAvailable={val.isAvailableInCurrentLang}
                  onUpdate={() => onUpdateCard(val)}
                  sendOnClick={() => sendTemplate(val)}
                  isDraggable={searchSlideshows.length === 0}
                  type="slideshow"
                >
                  {(() => {
                    const previewUrl = resolvePreviewUrl(val.url);

                    if (!previewUrl) {
                      return (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-center text-xs text-neutral-500">
                          No preview available
                        </div>
                      );
                    }

                    if (isVideoSource(previewUrl)) {
                      return (
                        <video
                          src={previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      );
                    }

                    return (
                      <Image
                        alt="template_image"
                        width="250"
                        height="100"
                        style={{
                          objectFit: "cover",
                          width: "100%",
                          height: "100%",
                        }}
                        src={previewUrl}
                      />
                    );
                  })()}
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>
          </div>
        </div>
        {userData?.user.Roles?.includes("Admin") && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
            <button
              onClick={handleOpen}
              className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
              aria-label="Create new template"
            >
              <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />

              {/* Tooltip */}
              <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Create Template
                <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
              </div>
            </button>
          </div>
        )}
      </div>
    );

  return <DashboardPageSkeleton />;
}

// Template data is only needed here. Keeping the provider at route scope
// prevents every dashboard route from fetching slideshow templates on mount.
export default function SlideshowDashboard() {
  return (
    <TemplateContextProvider>
      <SlideshowDashboardContent />
    </TemplateContextProvider>
  );
}
