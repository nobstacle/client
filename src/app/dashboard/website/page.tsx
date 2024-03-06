"use client";

import { useState } from "react";
import Modal from "../../../components/Modal";
import { CreateWebsiteTemplateForm } from "../../../components/pages/dashboard/CreateWebsiteTemplateForm";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useWebsiteTemplateControllerDeleteWebsiteTemplateOne,
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

  const sendWebsiteTemplateMessage = (url: string) => {
    console.log("runned", url);
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
            {websitesSource?.map((val) => (
              <>
                <Card
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
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (val.url) {
                        window.open(`${val.url}`);
                      }
                    }}
                    className="absolute right-1 top-1 flex bg-white p-2"
                  >
                    <OpenLinkIcon />
                  </button>
                  <div className="flex w-full items-center justify-center">
                    <WebsiteIcon width="100px" height="100px" />
                  </div>
                </Card>
              </>
            ))}

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
