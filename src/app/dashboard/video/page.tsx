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
import { useState } from "react";
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
import { Card } from "antd";
import "../../../styles/base.css";

export default function VideoDashboard() {
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [editTemplate, setEditTemplate] = useState<null | GetVideoTemplateRes>(
    null,
  );
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

  const sendTemplate = (id: number, isAvailable: boolean, ext: string) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || companyData?.defaultLangCode || "en"
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Video,
      station: Number(params.get("station") ?? 1),
      contentExtra: ext,
    });
  };

    const handleQrCodeClick = (id: number, url: string, tag: string, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || companyData?.defaultLangCode || "en"
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Video,
      station: Number(params.get("station") ?? 1),
      contentExtra: url,
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

  const onUpdateCard = (image: GetVideoTemplateRes) => {
    setEditTemplate(image);
    updateHandleOpen();
  };

  const sortVideos = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    const setResource = searchVideos.length > 0 ? setSearchVideos : setVideos;
    const videosResources = searchVideos.length > 0 ? searchVideos : videos;

    const oldIndex = videosResources.findIndex((item) => item.id === item1);
    const newIndex = videosResources.findIndex((item) => item.id === item2);

    let shallow = [...videosResources];
    shallow = arrayMove(videosResources, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateVideoTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const videosSource = searchVideos.length > 0 ? searchVideos : videos;

  if (isHydrated)
    return (
      <div
        className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-2' : 'p-6'}`}>
        {videosSource.length > 0 && (
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
              cb={(video, isUpdate) => {
                handleClose();

                if (!isUpdate) {
                  videos.push(video);
                  setVideos(videos);
                } else {
                  const shallow = [...videos];
                  const index = shallow.findIndex(({ id }) => id === video.id);
                  shallow[index]["langCode"] = video.langCode;
                  setVideos(shallow);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={videosSource} sort={sortVideos}>
              {videosSource?.map((val) => (
                <DraggableCardItem
                  onDelete={() => onDeleteCard(val.id)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  onUpdate={() => onUpdateCard(val)}
                    onQrCodeClick={() => handleQrCodeClick(val.id, val.ext, val.tag, val.langCode.includes(params.get("lang") || companyData?.defaultLangCode || ""),)}
                  key={val.id}
                  tag={val.tag}
                  isAvailable={val.langCode.includes(
                    params.get("lang") || companyData?.defaultLangCode || "",
                  )}
                  sendOnClick={() =>
                    sendTemplate(
                      val.id,
                      val.langCode.includes(
                        params.get("lang") ||
                        companyData?.defaultLangCode ||
                        "",
                      ),
                      val.ext,
                    )
                  }
                  isDraggable={searchVideos.length === 0}
                  id={val.id}
                >
                  <video
                    key={val.url}
                    controls
                    width="250"
                    height="100"
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                    src={val.url}
                  />
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
                  defaultLangCode={
                    params.get("lang") || companyData?.defaultLangCode || "en"
                  }
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(image) => {
                    updateHandleClose();

                    const shallow = [...videos];
                    const index = shallow.findIndex(
                      ({ id }) => id === image.id,
                    );
                    shallow[index]["url"] = image.url;
                    shallow[index]["langCode"] = image.langCode;

                    setVideos(shallow);
                  }}
                />
              </Modal>
            )}
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

  return <div></div>;
}
