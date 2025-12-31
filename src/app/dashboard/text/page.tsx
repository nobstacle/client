"use client";

import { useState } from "react";
import Modal from "../../../components/Modal";
import { CreateTextTemplateForm } from "../../../components/pages/dashboard/CreateTextTemplateForm";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerDeleteTextTemplateOne,
  useTextTemplateControllerPatchTextTemplateOrder,
} from "../../../lib/client/api";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchParams } from "next/navigation";
// import { Card } from "../../../components/Card";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { SendTextTemplateForm } from "../../../components/pages/dashboard/SendTextTemplateForm";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { UpdateTextTemplateForm } from "../../../components/pages/dashboard/UpdateTextTemplateForm";
import { GetTextTemplateRes } from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Card } from "antd";

export default function Dashboard() {
  const [editTemplate, setEditTemplate] = useState<null | GetTextTemplateRes>(
    null,
  );
  const hasHydrated = useHasHydrated();

  const params = useSearchParams();
  const { setTexts, texts, searchTexts, setSearchTexts } = useTemplateStore();
  const { search } = useSearchTemplate(texts, setSearchTexts);

  const deleteTextTemplate = useTextTemplateControllerDeleteTextTemplateOne();
  const updateTextTemplateOrder =
    useTextTemplateControllerPatchTextTemplateOrder();

  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();
  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  // Get current selected language
  const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

  const sendTemplate = (id: number, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? selectedLang
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Text,
      station: Number(params.get("station") ?? 1),
    });
  };

  const sendTextTemplateMessage = (content: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: selectedLang,
      refType: "TextTemplateMessage",
      station: Number(params.get("station") ?? 1),
      directContent: content,
    });
  };

  const onDeleteCard = (id: number) => {
    deleteTextTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newTexts = texts.filter((data) => data.id !== id);
          setTexts(newTexts);
        },
      },
    );
  };

  const onUpdateCard = (text: GetTextTemplateRes) => {
    setEditTemplate(text);
    updateHandleOpen();
  };

  const sortTexts = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    // Always use the main texts array for sorting, not searchTexts
    const oldIndex = texts.findIndex((item) => item.id === item1);
    const newIndex = texts.findIndex((item) => item.id === item2);

    let shallow = [...texts];
    shallow = arrayMove(texts, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateTextTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setTexts(shallow);
  };

  // Show search results if searching, otherwise show all texts
  const textsSource = searchTexts.length > 0 ? searchTexts : texts;

  if (hasHydrated)
    return (
      <div className="flex h-full w-full justify-start gap-2 overflow-y-auto  p-6">
        <div className="flex w-full flex-col gap-4">
          <Card className="w-full customCards">
            <SendTextTemplateForm onSend={sendTextTemplateMessage} />
            {textsSource.length > 0 && (
              <div className="searchInputWidth">
                <SearchTemplateForm searchOnChange={search} />
              </div>
            )}
          </Card>
          {userData?.user.Roles?.includes("Admin") && (
            <Modal
              title="Create template"
              closeModal={handleClose}
              isOpen={isOpen}
            >
              <CreateTextTemplateForm
                cb={(template, isUpdate) => {
                  handleClose();
                  if (!isUpdate) {
                    texts.push(template);
                    setTexts(texts);
                  } else {
                    const shallow = [...texts];
                    const index = shallow.findIndex(
                      ({ id }) => id === template.id,
                    );
                    shallow[index]["langCode"] = template.langCode;
                    shallow[index]["content"] = template.content;

                    setTexts(shallow);
                  }
                }}
              />
            </Modal>
          )}
          <div id="card-wrapper" className="mt-5 flex h-full w-full   ">
            <div className="flex w-full flex-wrap content-start gap-4">
              <DraggableCardContainer items={textsSource} sort={sortTexts}>
                {textsSource?.map((val) => {
                  // Check if template is available in selected language
                  const isAvailable = val.langCode.includes(selectedLang);
                  
                  return (
                    <DraggableCardItem
                      id={val.id}
                      isAdmin={userData?.user.Roles?.includes("Admin")}
                      key={val.id}
                      tag={val.tag}
                      onUpdate={() => onUpdateCard(val)}
                      onDelete={() => {
                        onDeleteCard(val.id);
                      }}
                      sendOnClick={() => sendTemplate(val.id, isAvailable)}
                      isAvailable={isAvailable}
                      isDraggable={searchTexts.length === 0}
                      type="text"
                    >
                      <p className="line-clamp-5 text-sm ">{val.content ?? ""}</p>
                    </DraggableCardItem>
                  );
                })}
              </DraggableCardContainer>
            </div>

            {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateTextTemplateForm
                  defaultLangCode={selectedLang}
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(template) => {
                    updateHandleClose();
                    const shallow = [...texts];
                    const index = shallow.findIndex(
                      ({ id }) => id === template.id,
                    );
                    shallow[index]["langCode"] = template.langCode;
                    shallow[index]["content"] = template.content;
                    setTexts(shallow);
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