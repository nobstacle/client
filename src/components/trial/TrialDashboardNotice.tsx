"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { useSession } from "next-auth/react";
import { useCompanyControllerGetCompany } from "@/lib/client/api";
import { TrialBadge } from "./TrialBadge";
import { TrialStatusBanner } from "./TrialStatusBanner";
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
      <TrialStatusBanner
        trial={trialSource}
        action={
          <Button size="small" onClick={() => setOpen(true)}>
            View details
          </Button>
        }
      />

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
