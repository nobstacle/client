"use client";

import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useVideoTemplateControllerDeleteVideoTemplateOne,
  useVideoTemplateControllerPatchVideoTemplateOrder,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { CreateVideoTemplateForm } from "../../../components/pages/dashboard/CreateVideoTemplateForm";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { DashboardPageSkeleton } from "../../../components/DashboardPageSkeleton";
import { useState, useMemo } from "react";
import { GetVideoTemplateRes } from "../../../lib/client/model";
import { UpdateVideoTemplateForm } from "../../../components/pages/dashboard/UpdateVideoTemplateForm";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { Card, Tooltip } from "antd";
import { FaPlay } from "react-icons/fa";
import "../../../styles/base.css";
import {
  groupLanguageAwareTemplates,
  type LanguageAwareTemplate,
} from "../../../utils/templateVariants";

export default function VideoDashboard() {
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [editTemplate, setEditTemplate] = useState<null | GetVideoTemplateRes>(
    null,
  );
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const isHydrated = useHasHydrated();
  const { videos, setVideos, setSearchVideos, searchVideos } =
    useTemplateStore();

  const { search, clearSearch } = useSearchTemplate(videos, setSearchVideos);

  const params = useSearchParams();

  const updateVideoTemplateOrder =
    useVideoTemplateControllerPatchVideoTemplateOrder();

  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();

  const deleteVideoTemplate =
    useVideoTemplateControllerDeleteVideoTemplateOne();

  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  // Get current language
  const defaultLangCode = companyData?.defaultLangCode || "en";
  const currentLang = params.get("lang") || defaultLangCode;

  const videosSource = searchVideos.length > 0 ? searchVideos : videos;
  const displayedVideosWithAvailability = useMemo(
    () =>
      groupLanguageAwareTemplates(
        videosSource,
        currentLang,
        defaultLangCode,
      ),
    [videosSource, currentLang, defaultLangCode],
  );

  const sendTemplate = (
    template: LanguageAwareTemplate<GetVideoTemplateRes>,
    ext: string,
  ) => {
    emitSendTemplate({
      refId: template.shareTemplate.id,
      langCode: template.shareLangCode,
      refType: ChatType.Video,
      station: Number(params.get("station") ?? 1),
      contentExtra: ext,
    });
  };

  const handleQrCodeClick = (
    template: LanguageAwareTemplate<GetVideoTemplateRes>,
  ) => {
    emitSendTemplate({
      refId: template.shareTemplate.id,
      langCode: template.shareLangCode,
      refType: ChatType.Video,
      station: Number(params.get("station") ?? 1),
      contentExtra: template.shareTemplate.url,
      directContent: 'QR'
    });
  };

  const onDeleteCard = (id: number) => {
    deleteVideoTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newVideo = videos.filter((data) => data.id !== id);
          setVideos(newVideo);
        },
      },
    );
  };

  const onUpdateCard = (video: GetVideoTemplateRes) => {
    setEditTemplate(video);
    updateHandleOpen();
  };

  const sortVideos = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    // Always work with the full videos array (not filtered/displayed array)
    const oldIndex = videos.findIndex((item) => item.id === item1);
    const newIndex = videos.findIndex((item) => item.id === item2);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not find items for sorting');
      return;
    }

    // Create a shallow copy and move the item
    let reorderedVideos = arrayMove(videos, oldIndex, newIndex);

    // Group by tag to update order properly
    const groupedByTag = reorderedVideos.reduce((acc, video) => {
      if (!acc[video.tag]) {
        acc[video.tag] = [];
      }
      acc[video.tag].push(video);
      return acc;
    }, {} as Record<string, GetVideoTemplateRes[]>);

    // Get unique tags in the new order
    const uniqueTags = reorderedVideos
      .map(vid => vid.tag)
      .filter((tag, index, self) => self.indexOf(tag) === index);

    // Rebuild the array with all language variants maintaining the new tag order
    const finalOrderedVideos: GetVideoTemplateRes[] = [];
    let orderCounter = 1;

    uniqueTags.forEach(tag => {
      const tagVideos = groupedByTag[tag];
      tagVideos.forEach(vid => {
        finalOrderedVideos.push({ ...vid, order: orderCounter });
      });
      orderCounter++;
    });

    // Update the order in the backend
    finalOrderedVideos.forEach(({ id, order }) => {
      updateVideoTemplateOrder.mutate({
        data: { order },
        id,
      });
    });

    // Update the state
    setVideos(finalOrderedVideos);
  };

  if (isHydrated)
    return (
      <div
        className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-2' : 'p-6'}`}>
        {displayedVideosWithAvailability.length > 0 && (
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
          >
            <CreateVideoTemplateForm
              cb={(video, isUpdate = false) => {
                handleClose();

                if (!isUpdate) {
                  setVideos([...videos, video]);
                } else {
                  const updatedVideos = videos.map((item) =>
                    item.id === video.id
                      ? { ...item, url: video.url, langCode: video.langCode }
                      : item
                  );

                  if (!videos.some((item) => item.id === video.id)) {
                    updatedVideos.push(video);
                  }

                  setVideos(updatedVideos);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={displayedVideosWithAvailability} sort={sortVideos}>
              {displayedVideosWithAvailability?.map((val) => (
                <DraggableCardItem
                  onDelete={() => onDeleteCard(val.id)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  onUpdate={() => onUpdateCard(val)}
                  onQrCodeClick={() => handleQrCodeClick(val)}
                  key={val.id}
                  tag={val.tag}
                  isAvailable={val.isAvailableInCurrentLang}
                  sendOnClick={() =>
                    sendTemplate(
                      val,
                      val.ext,
                    )
                  }
                  isDraggable={searchVideos.length === 0}
                  id={val.id}
                >
                  <Tooltip title="Click play to preview">
                    <div
                      className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center cursor-pointer group overflow-hidden"
                      onClick={() => setPreviewVideo(val.url)}
                    >
                      {/* Video Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-90">
                          <FaPlay className="w-4 h-4 text-white ml-1" />
                        </div>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    </div>
                  </Tooltip>
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>

            {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateVideoTemplateForm
                  defaultLangCode={currentLang}
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(video) => {
                    updateHandleClose();

                    const shallow = [...videos];
                    const index = shallow.findIndex(
                      ({ id }) => id === video.id,
                    );
                    shallow[index]["url"] = video.url;
                    shallow[index]["langCode"] = video.langCode;

                    setVideos(shallow);
                  }}
                />
              </Modal>
            )}
          </div>
        </div>

        {/* Video Preview Modal */}
        {previewVideo && (
          <Modal
            title="Video Preview"
            closeModal={() => setPreviewVideo(null)}
            isOpen={!!previewVideo}
          >
            <div className="w-full">
              <video
                controls
                autoPlay
                className="w-full h-auto rounded-lg"
                src={previewVideo}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </Modal>
        )}

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
