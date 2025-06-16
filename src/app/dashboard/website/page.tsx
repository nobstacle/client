"use client";

import { useState } from "react";
import Modal from "../../../components/Modal";
import { CreateWebsiteTemplateForm } from "../../../components/pages/dashboard/CreateWebsiteTemplateForm";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useWebsiteTemplateControllerDeleteWebsiteTemplateOne,
  useWebsiteTemplateControllerPatchWebsiteTemplateOrder,
} from "../../../lib/client/api";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchParams } from "next/navigation";
import { Card } from "../../../components/Card";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { UpdateWebsiteTemplateForm } from "../../../components/pages/dashboard/UpdateWebsiteTemplateForm";
import { GetWebsiteTemplateRes } from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { MapIcon } from "../../../components/icons/MapIcon";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import { WebsiteIcon } from "../../../components/icons/sidebar/WebsiteIcon";
import { SendWebsiteTemplateForm } from "../../../components/pages/dashboard/SendWebsiteTemplateForm";
import { OpenLinkIcon } from "../../../components/icons/sidebar/OpenLinkIcon";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

export default function Dashboard() {
  const [editTemplate, setEditTemplate] =
    useState<null | GetWebsiteTemplateRes>(null);
  const hasHydrated = useHasHydrated();

  const params = useSearchParams();
  const { setWebsites, websites, searchWebsites, setSearchWebsites } =
    useTemplateStore();
  const { search } = useSearchTemplate(websites, setSearchWebsites);

  const deleteWebsiteTemplate =
    useWebsiteTemplateControllerDeleteWebsiteTemplateOne();

  const updateTextTemplateOrder =
    useWebsiteTemplateControllerPatchWebsiteTemplateOrder();

  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();
  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  const sendTemplate = (id: number, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || companyData?.defaultLangCode || "en"
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Website,
      station: Number(params.get("station") ?? 1),
    });
  };

  const onDeleteCard = (id: number) => {
    deleteWebsiteTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newWebsites = websites.filter((data) => data.id !== id);
          setWebsites(newWebsites);
        },
      },
    );
  };

  const onUpdateCard = (Website: GetWebsiteTemplateRes) => {
    setEditTemplate(Website);
    updateHandleOpen();
  };

  const sortWebsites = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    const setResource =
      searchWebsites.length > 0 ? setSearchWebsites : setWebsites;
    const websitesResource =
      searchWebsites.length > 0 ? searchWebsites : websites;

    const oldIndex = websitesResource.findIndex((item) => item.id === item1);
    const newIndex = websitesResource.findIndex((item) => item.id === item2);

    let shallow = [...websitesResource];
    shallow = arrayMove(websitesResource, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateTextTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const sendWebsiteTemplateMessage = (url: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: "WebsiteTemplateMessage",
      station: Number(params.get("station") ?? 1),
      directContent: url,
    });
  };

  const websitesSource = searchWebsites.length > 0 ? searchWebsites : websites;

  if (hasHydrated)
    return (
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto  p-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col items-end gap-4 ">
            <SendWebsiteTemplateForm onSend={sendWebsiteTemplateMessage} />
          </div>
        </div>
        {websitesSource.length > 0 && (
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
            <CreateWebsiteTemplateForm
              cb={(template, isUpdate) => {
                handleClose();
                if (!isUpdate) {
                  websites.push(template);
                  setWebsites(websites);
                } else {
                  const shallow = [...websites];
                  const index = shallow.findIndex(
                    ({ id }) => id === template.id,
                  );
                  shallow[index]["langCode"] = template.langCode;
                  shallow[index]["url"] = template.url;

                  setWebsites(shallow);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={websitesSource} sort={sortWebsites}>
              {websitesSource?.map((val) => (
                <DraggableCardItem
                  id={val.id}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  key={val.id}
                  tag={val.tag}
                  onUpdate={() => onUpdateCard(val)}
                  onDelete={() => {
                    onDeleteCard(val.id);
                  }}
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
                  isAvailable={val.langCode.includes(
                    params.get("lang") || companyData?.defaultLangCode || "",
                  )}
                  icon={
                    userData?.user.Roles?.includes("Staff") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (val.url) {
                            window.open(`${val.url}`);
                          }
                        }}
                        className="absolute bottom-0 right-0 text-white"
                      >
                        {val.langCode.includes(
                          params.get("lang") ||
                          companyData?.defaultLangCode ||
                          "",
                        ) ? (
                          <span
                            className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-green-500
                 border-l-transparent"
                          />
                        ) : (
                          <span
                            className="absolute bottom-0 right-0 h-0 w-0
                 border-b-[15px] border-l-[15px]
                 border-red-500
                 border-l-transparent"
                          />
                        )}
                      </button>
                    ) : undefined
                  }
                  isDraggable={searchWebsites.length === 0}
                >
                  <div className="flex w-full items-center justify-center">
                    <WebsiteIcon width="100px" height="100px" />
                  </div>
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>

            {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateWebsiteTemplateForm
                  defaultLangCode={
                    params.get("lang") || companyData?.defaultLangCode || "en"
                  }
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(template) => {
                    updateHandleClose();
                    const shallow = [...websites];
                    const index = shallow.findIndex(
                      ({ id }) => id === template.id,
                    );
                    shallow[index]["langCode"] = template.langCode;
                    shallow[index]["url"] = template.url;
                    setWebsites(shallow);
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
