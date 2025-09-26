"use client";

import { useState } from "react";
import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useMapTemplateControllerDeleteMapTemplateOne,
  useMapTemplateControllerPatchMapTemplateOrder,
} from "../../../lib/client/api";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchParams } from "next/navigation";
// import { Card } from "../../../components/Card";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { GetMapTemplateRes } from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { CreateMapsTemplateForm } from "../../../components/pages/dashboard/CreateMapTemplateForm";
import { MapIcon } from "../../../components/icons/MapIcon";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import { UpdateMapTemplateForm } from "../../../components/pages/dashboard/UpdateMapTemplateForm";
import { SendMapForm } from "../../../components/pages/dashboard/SendMapForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

export default function MapsDashboard() {
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [editTemplate, setEditTemplate] = useState<null | GetMapTemplateRes>(
    null,
  );
  const hasHydrated = useHasHydrated();

  const params = useSearchParams();
  const { setMaps, maps, searchMaps, setSearchMaps } = useTemplateStore();
  const { search } = useSearchTemplate(maps, setSearchMaps);

  const deleteMapTemplate = useMapTemplateControllerDeleteMapTemplateOne();
  const updateMapTemplateOrder =
    useMapTemplateControllerPatchMapTemplateOrder();

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
      refType: ChatType.Map,
      station: Number(params.get("station") ?? 1),
    });
  };

  const onDeleteCard = (id: number) => {
    deleteMapTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newMaps = maps.filter((data) => data.id !== id);
          setMaps(newMaps);
        },
      },
    );
  };

  const onUpdateCard = (map: GetMapTemplateRes) => {
    setEditTemplate(map);
    updateHandleOpen();
  };

  const sortMaps = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    const setResource = searchMaps.length > 0 ? setSearchMaps : setMaps;
    const mapsResource = searchMaps.length > 0 ? searchMaps : maps;

    const oldIndex = mapsResource.findIndex((item) => item.id === item1);
    const newIndex = mapsResource.findIndex((item) => item.id === item2);

    let shallow = [...mapsResource];
    shallow = arrayMove(mapsResource, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateMapTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const sendMapTemplateMessage = (origin: string, destination: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: "MapTemplateMessage",
      station: Number(params.get("station") ?? 1),
      directContent: origin,
      contentExtra: destination,
    });
  };

  const onsendQr = (origin: string, destination: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: "MapTemplateQr",
      station: Number(params.get("station") ?? 1),
      directContent: origin,
      contentExtra: destination,
    });
  };

  const mapsSource = searchMaps.length > 0 ? searchMaps : maps;

  if (hasHydrated)
    return (
      <div
        className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-2' : 'p-6'}`}>
        <div>
          <SendMapForm onSend={sendMapTemplateMessage} onsendQr={onsendQr} />
        </div>
        {mapsSource.length > 0 && (
          <div className="w-full">
            <div className="searchInputWidth">
              <SearchTemplateForm searchOnChange={search} placeholder="Search template" />
            </div>
          </div>
        )}
        {userData?.user.Roles?.includes("Admin") && (
          <Modal
            title="Create template"
            closeModal={handleClose}
            isOpen={isOpen}
          >
            <CreateMapsTemplateForm
              cb={(template, isUpdate) => {
                handleClose();
                if (!isUpdate) {
                  maps.push(template);
                  setMaps(maps);
                } else {
                  const shallow = [...maps];
                  const index = shallow.findIndex(
                    ({ id }) => id === template.id,
                  );
                  shallow[index]["langCode"] = template.langCode;
                  shallow[index]["origin"] = template.origin;
                  shallow[index]["destination"] = template.destination;

                  setMaps(shallow);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="mt-5 flex h-full w-full   ">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={mapsSource} sort={sortMaps}>
              {mapsSource?.map((val) => (
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
                  isDraggable={searchMaps.length === 0}
                >
                  <div className="flex w-full items-center justify-center">
                    <MapIcon />
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
                <UpdateMapTemplateForm
                  defaultLangCode={
                    params.get("lang") || companyData?.defaultLangCode || "en"
                  }
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(template) => {
                    updateHandleClose();
                    const shallow = [...maps];
                    const index = shallow.findIndex(
                      ({ id }) => id === template.id,
                    );
                    shallow[index]["langCode"] = template.langCode;
                    shallow[index]["origin"] = template.origin;
                    shallow[index]["destination"] = template.destination;
                    setMaps(shallow);
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
