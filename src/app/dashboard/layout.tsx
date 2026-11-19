import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { SocketContextProvider } from "../../context/SocketContextProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { ShortcutsProvider } from "./ShortcutProvider";
import { DashboardShell } from "./DashboardShell";

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div
      id="parent"
      className="box-border flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#3b5998]"
      style={{ paddingTop: "var(--safe-area-inset-top)" }}
    >
      <CompanyContextProvider>
        <SocketContextProvider>
          <ShortcutsProvider>
            <DashboardShell initialSession={session}>{children}</DashboardShell>
          </ShortcutsProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

export default DashboardLayout;
