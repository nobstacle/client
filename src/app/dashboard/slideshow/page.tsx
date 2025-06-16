"use client";

import Image from "next/image";
import { Button } from "../../../components/Button";
import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useCompanyControllerGetCompany,
  useSlideshowTemplateControllerDeleteSlideshowTemplateOne,
  useSlideshowTemplateControllerPatchSlideshowTemplateOrder,
  useTemplateControllerGetSlideshowTemplates,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { CreateSlideshowTemplateForm } from "../../../components/pages/dashboard/CreateSlideshowTemplateForm";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useTemplateContext } from "../../../context/TemplatesProvider";
import { UpdateSlideshowTemplateForm } from "../../../components/pages/dashboard/UpdateSlideshowTemplateForm";
import { useState } from "react";
import {
  // GetImageTemplateRes,
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

export default function SlideshowDashboard() {
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

  const sendTemplate = (id: number, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || companyData?.defaultLangCode || "en"
        : companyData?.defaultLangCode || "en",
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
    const setResource =
      searchSlideshows.length > 0 ? setSearchSlideshows : setSlideshows;
    const slideshowsResource =
      searchSlideshows.length > 0 ? searchSlideshows : slideshows;

    const oldIndex = slideshowsResource.findIndex((item) => item.id === item1);
    const newIndex = slideshowsResource.findIndex((item) => item.id === item2);

    let shallow = [...slideshowsResource];
    shallow = arrayMove(slideshowsResource, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateSlideshowTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const slideshowsSource =
    searchSlideshows.length > 0 ? searchSlideshows : slideshows;

  if (isHydrated)
    return (
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto  p-6">
        {slideshowsSource.length > 0 && (
          <Card className="w-full customCards">
            <div className="searchInputWidth">
              <SearchTemplateForm
                searchOnChange={search}
                onClear={clearSearch}
                placeholder="Search documents by name, tag, or file type..."
              />
            </div>
          </Card>
        )}
        {userData?.user.Roles?.includes("Admin") && (
          <div className="flex w-2/12 flex-col gap-4">
            <Modal
              title="Create template"
              closeModal={handleClose}
              isOpen={isOpen}
              panelStyleClass="max-w-2xl"
            >
              <CreateSlideshowTemplateForm
                cb={() => {
                  handleClose();
                  refetchSlideshow();
                }}
              />
            </Modal>
          </div>
        )}
        {editTemplate && (
          <Modal
            title="Update template"
            closeModal={updateHandleClose}
            isOpen={updateIsOpen}
          >
            <UpdateSlideshowTemplateForm
              tag={editTemplate.tag}
              langCode={
                params.get("lang") || companyData?.defaultLangCode || "en"
              }
              cb={() => {
                updateHandleClose();
                refetchSlideshow();
              }}
              sourceId={editTemplate.id}
            />
          </Modal>
        )}

        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer
              items={slideshowsSource}
              sort={sortSlideshows}
            >
              {slideshowsSource?.map((val) => (
                <DraggableCardItem
                  id={val.id}
                  tag={val.tag}
                  key={val.id}
                  onDelete={() => onDeleteCard(val.id)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  isAvailable={val.langCode.includes(
                    params.get("lang") || companyData?.defaultLangCode || "",
                  )}
                  onUpdate={() => onUpdateCard(val)}
                  sendOnClick={() =>
                    sendTemplate(
                      val.id,
                      val.langCode.includes(
                        params.get("lang") ||
                        companyData?.defaultLangCode ||
                        "",
                      ),
                    )
                  }
                  isDraggable={searchSlideshows.length === 0}
                >
                  <Image
                    alt="template_image"
                    width="250"
                    height="100"
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                    src={val.url as any}
                  />
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

  return <div></div>;
}
