"use client";

import Image from "next/image";
import { Button } from "../../../components/Button";
import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useCompanyControllerGetCompany,
  useSlideshowTemplateControllerDeleteSlideshowTemplateOne,
  useTemplateControllerGetSlideshowTemplates,
} from "../../../lib/client/api";
import { Card } from "../../../components/Card";
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
  GetImageTemplateRes,
  GetSlideshowTemplateRes,
} from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";

export default function SlideshowDashboard() {
  const [editTemplate, setEditTemplate] =
    useState<null | GetSlideshowTemplateRes>(null);
  const isHydrated = useHasHydrated();
  const { refetchSlideshow } = useTemplateContext();

  const { slideshows, setSlideshows, setSearchSlideshows, searchSlideshows } =
    useTemplateStore();

  const { search } = useSearchTemplate(slideshows, setSearchSlideshows);

  const params = useSearchParams();
  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();

  const deleteSlideshowTemplate =
    useSlideshowTemplateControllerDeleteSlideshowTemplateOne();

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

  const slideshowsSource =
    searchSlideshows.length > 0 ? searchSlideshows : slideshows;

  if (isHydrated)
    return (
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto  p-6">
        {slideshowsSource.length > 0 && (
          <div className="w-50">
            <SearchTemplateForm searchOnChange={search} />
          </div>
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
            {slideshowsSource.map((val) => (
              <Card
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
                      params.get("lang") || companyData?.defaultLangCode || "",
                    ),
                  )
                }
              >
                <Image
                  alt="template_image"
                  width="250"
                  height="100"
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  src={val.url as any}
                />
              </Card>
            ))}
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
