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
import { Card } from "../../../components/Card";
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

  const sendTemplate = (id: number, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || companyData?.defaultLangCode || "en"
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Text,
      station: Number(params.get("station") ?? 1),
    });
  };

  const sendTextTemplateMessage = (content: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
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
    const setResource = searchTexts.length > 0 ? setSearchTexts : setTexts;
    const textsResource = searchTexts.length > 0 ? searchTexts : texts;

    const oldIndex = textsResource.findIndex((item) => item.id === item1);
    const newIndex = textsResource.findIndex((item) => item.id === item2);

    let shallow = [...textsResource];
    shallow = arrayMove(textsResource, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateTextTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const textsSource = searchTexts.length > 0 ? searchTexts : texts;

  if (hasHydrated)
    return (
      <div className="flex h-full w-full justify-start gap-2 overflow-y-auto  p-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex gap-4 ">
            <SendTextTemplateForm onSend={sendTextTemplateMessage} />
            {textsSource.length > 0 && (
              <div className="w-full">
                <div className="w-50">
                  <SearchTemplateForm searchOnChange={search} />
                </div>
              </div>
            )}
          </div>
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
                {textsSource?.map((val) => (
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
                    isDraggable={searchTexts.length === 0}
                  >
                    <p className="line-clamp-6 text-sm ">{val.content ?? ""}</p>
                  </DraggableCardItem>
                ))}
              </DraggableCardContainer>
            </div>

            {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateTextTemplateForm
                  defaultLangCode={
                    params.get("lang") || companyData?.defaultLangCode || "en"
                  }
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
