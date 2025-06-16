"use client";

import {
  useCompanyControllerGetCompany,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { SendJotFormTemplateForm } from "../../../components/pages/dashboard/SendJotFormTemplateForm";

export default function Dashboard() {

  const hasHydrated = useHasHydrated();
  const params = useSearchParams();
  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const sendJotFormTemplateMessage = (url: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: "JotFormTemplateMessage",
      station: Number(params.get("station") ?? 1),
      directContent: url,
    });
  };

  if (hasHydrated)
    return (
      <div className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col items-end gap-4 ">
            <SendJotFormTemplateForm onSend={sendJotFormTemplateMessage} />
          </div>
        </div>
      </div>
    );

  return <div></div>;
}
