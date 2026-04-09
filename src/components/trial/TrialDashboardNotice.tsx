"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { useSession } from "next-auth/react";
import { useCompanyControllerGetCompany } from "@/lib/client/api";
import { TrialBadge } from "./TrialBadge";
import { formatTrialDate, getTrialStatus } from "@/utils/trial";

const { Paragraph, Title } = Typography;

export function TrialDashboardNotice() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isSAdmin = session?.user?.Roles?.includes("SAdmin");
  const hasCompany = Boolean(session?.user?.companyId);

  const { data: companyData } = useCompanyControllerGetCompany({
    query: {
      enabled: hasCompany && !isSAdmin,
      staleTime: 1000 * 60 * 5,
    },
  });

  const trialSource = useMemo(
    () => companyData ?? session?.user ?? null,
    [companyData, session?.user],
  );
  const trialStatus = getTrialStatus(trialSource);
  const sessionKey = `trial-notice:${session?.user?.id ?? "anon"}:${session?.user?.backendTokens?.rtc ?? session?.user?.backendTokens?.at ?? "none"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isSAdmin || !trialStatus.isTrialAccount || !trialStatus.isTrialActive) return;
    if (window.sessionStorage.getItem(sessionKey)) return;

    window.sessionStorage.setItem(sessionKey, "shown");
    setOpen(true);
  }, [
    isSAdmin,
    sessionKey,
    trialStatus.isTrialAccount,
    trialStatus.isTrialActive,
  ]);

  if (isSAdmin || !trialStatus.isTrialAccount || !trialStatus.isTrialActive) {
    return null;
  }

  const daysLeft = trialStatus.trialDaysLeft ?? 0;

  return (
    <>
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <TrialBadge trial={trialSource} />
            <p className="text-sm font-medium text-amber-950">
              Trial active until{" "}
              <strong>{formatTrialDate(trialStatus.trialEndsAt)}</strong>. You
              have <strong>{daysLeft}</strong> day{daysLeft === 1 ? "" : "s"} left.
            </p>
          </div>
          <Button size="small" onClick={() => setOpen(true)}>
            View details
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setOpen(false)}>
            Continue
          </Button>,
        ]}
        centered
        width={480}
        title="Trial Status"
      >
        <div className="space-y-4">
          <TrialBadge trial={trialSource} />
          <Title level={4} style={{ marginBottom: 0 }}>
            {daysLeft} day{daysLeft === 1 ? "" : "s"} left in your 30-day trial
          </Title>
          <Paragraph style={{ marginBottom: 0 }}>
            Your workspace remains active until{" "}
            <strong>{formatTrialDate(trialStatus.trialEndsAt)}</strong>.
          </Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            You’ll keep seeing this reminder in the dashboard so the expiry date
            is always easy to find.
          </Paragraph>
        </div>
      </Modal>
    </>
  );
}
