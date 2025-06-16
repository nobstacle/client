
import { getServerSession } from "next-auth";
import { PropsWithChildren, useState } from "react";
import { SocketContextProvider } from "../../context/SocketContextProvider";
import { TemplateContextProvider } from "../../context/TemplatesProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { authOptions } from "../api/auth/[...nextauth]/route";
import ClientSidebar from './Sidebar';
import ClientHeader from './ClientHeader';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="parent" className="flex h-screen w-full flex-row bg-white">
      <CompanyContextProvider>
        <SocketContextProvider>
          <TemplateContextProvider>
            <ServerSidebarWrapper />
            <div className="flex w-full flex-col overflow-hidden">
              <ServerHeaderWrapper />
              <Body>{children}</Body>
            </div>
          </TemplateContextProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

const ServerHeaderWrapper = async () => {
  return <ClientHeader  />;
};

const ServerSidebarWrapper = async () => {
  const user = await getServerSession(authOptions);

  return <ClientSidebar user={user} />;
};

const Body: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="child3"
      className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-6rem)] w-full flex-col items-stretch justify-stretch overflow-x-hidden bg-white"
    >
      {children}
    </div>
  );
};

export default DashboardLayout;