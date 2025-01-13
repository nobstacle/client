"use client";

import { useState } from "react";
import Modal from "../../../components/Modal";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useFormTemplateControllerDeleteFormTemplateOne,
  useFormTemplateControllerPatchFormTemplateOrder,
} from "../../../lib/client/api";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { GetFormTemplateRes } from "../../../lib/client/model";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CreateFormTemplateForm } from "../../../components/pages/dashboard/CreateFormTemplateForm";
import { WebsiteIcon } from "../../../components/icons/sidebar/WebsiteIcon";
import { UpdateFormTemplateForm } from "../../../components/pages/dashboard/UpdateFormTemplateForm";

export default function Dashboard() {
  const [editTemplate, setEditTemplate] = useState<null | GetFormTemplateRes>(
    null,
  );
  const hasHydrated = useHasHydrated();

  const params = useSearchParams();
  const { setForms, forms, searchForms, setSearchForms } = useTemplateStore();
  const { search } = useSearchTemplate(forms, setSearchForms);

  const deleteFormTemplate = useFormTemplateControllerDeleteFormTemplateOne();

  const updateTextTemplateOrder =
    useFormTemplateControllerPatchFormTemplateOrder();

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
      refType: ChatType.Form,
      station: Number(params.get("station") ?? 1),
    });
  };

  const onDeleteCard = (id: number) => {
    deleteFormTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newForms = forms.filter((data) => data.id !== id);
          setForms(newForms);
        },
      },
    );
  };

  const onUpdateCard = (Form: GetFormTemplateRes) => {
    setEditTemplate(Form);
    updateHandleOpen();
  };

  const sortForms = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    const setResource = searchForms.length > 0 ? setSearchForms : setForms;
    const FormsResource = searchForms.length > 0 ? searchForms : forms;

    const oldIndex = FormsResource.findIndex((item) => item.id === item1);
    const newIndex = FormsResource.findIndex((item) => item.id === item2);

    let shallow = [...FormsResource];
    shallow = arrayMove(FormsResource, oldIndex, newIndex);

    shallow.forEach(({ id }, index) => {
      updateTextTemplateOrder.mutate({
        data: { order: index + 1 },
        id,
      });
    });

    setResource(shallow);
  };

  const sendFormTemplateMessage = (url: string) => {
    console.log("runned", url);
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: ChatType.Form,
      station: Number(params.get("station") ?? 1),
      directContent: url,
    });
  };

  const formsSource = searchForms.length > 0 ? searchForms : forms;

  if (hasHydrated)
    return (
      <div className="flex h-full w-full flex-col justify-start gap-4 overflow-y-auto  p-6">
        {formsSource.length > 0 && (
          <div className="w-50">
            <SearchTemplateForm searchOnChange={search} />
          </div>
        )}
        {userData?.user.Roles?.includes("Admin") && (
          <Modal title="Create Form" closeModal={handleClose} isOpen={isOpen}>
            <CreateFormTemplateForm
              cb={(template, isUpdate) => {
                handleClose();
                if (!isUpdate) {
                  forms.push(template);
                  setForms(forms);
                } else {
                  const shallow = [...forms];
                  const index = shallow.findIndex(
                    ({ id }) => id === template.id,
                  );
                  shallow[index]["langCode"] = template.langCode;
                  shallow[index]["values"] = template.values;
                  setForms(shallow);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={formsSource} sort={sortForms}>
              {formsSource?.map((val) => (
                <DraggableCardItem
                  id={val.id}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  key={val.id}
                  tag={val.tag}
                  onUpdate={() => onUpdateCard(val)}
                  onDelete={() => {
                    onDeleteCard(val.id);
                  }}
                  sendOnClick={
                    () => {}
                    // sendTemplate(
                    //   val.id,
                    //   val.langCode.includes(
                    //     params.get("lang") ||
                    //       companyData?.defaultLangCode ||
                    //       "",
                    //   ),
                    // )
                  }
                  isAvailable={val.langCode.includes(
                    params.get("lang") || companyData?.defaultLangCode || "",
                  )}
                  icon={
                    userData?.user.Roles?.includes("Staff") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // if (val.values) {
                          //   window.open(`${val.url}`);
                          // }
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
                  isDraggable={searchForms.length === 0}
                >
                  <div className="flex w-full items-center justify-center">
                    <WebsiteIcon width="100px" height="100px" />
                  </div>
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>

            {/* {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateFormTemplateForm
                  defaultLangCode={
                    params.get("lang") || companyData?.defaultLangCode || "en"
                  }
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(template) => {
                    updateHandleClose();
                    const shallow = [...forms];
                    const index = shallow.findIndex(
                      ({ id }) => id === template.id,
                    );
                    shallow[index]["langCode"] = template.langCode;
                    shallow[index]["values"] = template.values;
                    setForms(shallow);
                  }}
                />
              </Modal>
            )} */}
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
