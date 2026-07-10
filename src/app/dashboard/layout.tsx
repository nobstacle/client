import { getServerSession } from "next-auth";
import { PropsWithChildren } from "react";
import { SocketContextProvider } from "../../context/SocketContextProvider";
import { TemplateContextProvider } from "../../context/TemplatesProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { authOptions } from "../../lib/auth";
import { ShortcutsProvider } from "./ShortcutProvider";
import ClientSidebar from "./Sidebar";
import ClientHeader from "./ClientHeader";
import { TrialDashboardNotice } from "../../components/trial/TrialDashboardNotice";
import DashboardFeatureGate from "../../components/pages/dashboard/DashboardFeatureGate";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="parent"
      className="box-border flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#3b5998]"
      style={{ paddingTop: "var(--safe-area-inset-top)" }}
    >
      <CompanyContextProvider>
        <SocketContextProvider>
          <TemplateContextProvider>
            <ShortcutsProvider>
              <ServerLayoutContent>
                {children}
              </ServerLayoutContent>
            </ShortcutsProvider>
          </TemplateContextProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

/**
 * Single async Server Component that fetches the session exactly ONCE per
 * render, then passes it to both ClientHeader and ClientSidebar.
 * Previously two separate async wrappers each called getServerSession(),
 * doubling the session-lookup latency on every route navigation.
 */
const ServerLayoutContent = async ({ children }: { children: React.ReactNode }) => {
  const user = await getServerSession(authOptions);
  return (
    <>
      <ClientHeader user={user} />
      <TrialDashboardNotice />
      <div className="flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden bg-white">
        <ClientSidebar user={user} />
        <Body>
          <DashboardFeatureGate>{children}</DashboardFeatureGate>
        </Body>
      </div>
    </>
  );
};

const Body: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="child3"
      className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-stretch overflow-hidden bg-white"
    >
      {children}
    </div>
  );
};

export default DashboardLayout;
