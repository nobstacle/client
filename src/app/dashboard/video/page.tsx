"use client";

import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useVideoTemplateControllerDeleteVideoTemplateOne,
  useVideoTemplateControllerPatchVideoTemplateOrder,
} from "../../../lib/client/api";
import { Card } from "../../../components/Card";
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

export default function VideoDashboard() {
  const [editTemplate, setEditTemplate] = useState<null | GetVideoTemplateRes>(
    null,
  );
  const isHydrated = useHasHydrated();
  const { videos, setVideos, setSearchVideos, searchVideos } =
    useTemplateStore();

  const { search } = useSearchTemplate(videos, setSearchVideos);

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
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto  p-6">
        {videosSource.length > 0 && (
          <div className="w-50">
            <SearchTemplateForm searchOnChange={search} />
          </div>
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
          <div className="fixed bottom-0 right-0 p-4">
            <button onClick={handleOpen}>
              <PlusIcon />
            </button>
          </div>
        )}
      </div>
    );

  return <div></div>;
}
