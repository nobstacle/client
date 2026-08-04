import { PropsWithChildren } from "react";
import { SocketContextProvider } from "../../context/SocketContextProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { ShortcutsProvider } from "./ShortcutProvider";
import { DashboardShell } from "./DashboardShell";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="parent"
      className="box-border flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#3b5998]"
      style={{ paddingTop: "var(--safe-area-inset-top)" }}
    >
      <CompanyContextProvider>
        <SocketContextProvider>
          <ShortcutsProvider>
            <DashboardShell>{children}</DashboardShell>
          </ShortcutsProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

export default DashboardLayout;
