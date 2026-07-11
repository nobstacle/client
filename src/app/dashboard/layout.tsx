import { cache } from "react";
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

/**
 * React cache() memoizes getServerSession per request so that any other server
 * component calling getSession() in the same render tree reuses the result
 * rather than triggering another JWT decode + potential token refresh round-trip.
 */
const getSession = cache(() => getServerSession(authOptions));


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
 * Uses the per-request cached getSession() to avoid redundant JWT decodes
 * if other server components in the same render tree also need the session.
 */
const ServerLayoutContent = async ({ children }: { children: React.ReactNode }) => {
  const t0 = Date.now();
  const user = await getSession();
  const elapsed = Date.now() - t0;
  if (elapsed > 500) {
    console.log(`[Layout] getSession() took ${elapsed}ms`);
  }
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
