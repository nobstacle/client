"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PropsWithChildren } from "react";
import type { GetCompanyRes } from "../../../lib/client/model";
import useCompanyStore from "../../../lib/zustand/store/companyStore";

type FeatureKey =
  | "display"
  | "screens"
  | "recordings"
  | "upsell"
  | "forms"
  | "whatsapp"
  | "team";

type FeatureGateConfig = {
  featureKey: FeatureKey;
  title: string;
  description: string;
};

const getFeatureEnabled = (
  company: GetCompanyRes | null,
  featureKey: FeatureKey,
) => {
  switch (featureKey) {
    case "display":
      return company?.displayEnabled ?? true;
    case "screens":
      return company?.screensEnabled ?? true;
    case "recordings":
      return company?.recordingsEnabled ?? true;
    case "upsell":
      return company?.upsellEnabled ?? true;
    case "forms":
      return company?.formsEnabled ?? true;
    case "whatsapp":
      return company?.whatsappEnabled ?? true;
    case "team":
      return company?.teamEnabled ?? true;
    default:
      return true;
  }
};

const featureFlagsByPath: Array<[RegExp, FeatureGateConfig]> = [
  [
    /^\/dashboard\/(image|slideshow|video|scroll|website|documents|maps|text|survey)$/,
    {
      featureKey: "display",
      title: "Display feature disabled",
      description:
        "This company does not currently have access to the Display section. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/public$/,
    {
      featureKey: "screens",
      title: "Screens feature disabled",
      description:
        "This company does not currently have access to Screens. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/recordings$/,
    {
      featureKey: "recordings",
      title: "Recordings feature disabled",
      description:
        "This company does not currently have access to Recordings. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/(upsell|category|package)$/,
    {
      featureKey: "upsell",
      title: "Upsell feature disabled",
      description:
        "This company does not currently have access to Upsell. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/(form|asignForms)$/,
    {
      featureKey: "forms",
      title: "Forms feature disabled",
      description:
        "This company does not currently have access to Forms. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/whatsapp$/,
    {
      featureKey: "whatsapp",
      title: "WhatsApp feature disabled",
      description:
        "This company does not currently have access to WhatsApp. A superadmin can re-enable it from company settings.",
    },
  ],
  [
    /^\/dashboard\/(handover|reminder|information|documentDownload)$/,
    {
      featureKey: "team",
      title: "Team feature disabled",
      description:
        "This company does not currently have access to Team tools. A superadmin can re-enable it from company settings.",
    },
  ],
];

export default function DashboardFeatureGate({
  children,
}: PropsWithChildren) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const company = useCompanyStore((state) => state.company);

  const isSAdmin = session?.user?.Roles?.includes("SAdmin");

  if (isSAdmin) {
    return <>{children}</>;
  }

  const match = featureFlagsByPath.find(([pattern]) => pattern.test(pathname));

  if (!match) {
    return <>{children}</>;
  }

  const [, config] = match;
  const featureEnabled = getFeatureEnabled(company, config.featureKey);

  if (featureEnabled) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
          Feature locked
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          {config.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {config.description}
        </p>
      </div>
    </div>
  );
}
