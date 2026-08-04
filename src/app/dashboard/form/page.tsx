"use client";

import dynamic from "next/dynamic";
import { useCompanyControllerGetCompany } from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { DashboardPageSkeleton } from "../../../components/DashboardPageSkeleton";

const SendJotFormTemplateForm = dynamic(
  () =>
    import("../../../components/pages/dashboard/SendJotFormTemplateForm").then(
      (mod) => ({ default: mod.SendJotFormTemplateForm }),
    ),
  {
    loading: () => <DashboardPageSkeleton />,
    ssr: false,
  },
);

export default function Dashboard() {
  const params = useSearchParams();
  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 768;

  const sendJotFormTemplateMessage = (url: string) => {
    emitSendTemplate({
      refId: 1,
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
      refType: "JotFormTemplateMessage",
      station: Number(params.get("station") ?? 1),
      directContent: url,
    });
  };

  return (
    <div
      className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? "p-4" : "p-6"}`}
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col items-end gap-4 ">
          <SendJotFormTemplateForm onSend={sendJotFormTemplateMessage} />
        </div>
      </div>
    </div>
  );
}
