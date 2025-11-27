
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
    <div id="parent" className="flex h-screen w-full flex-col bg-white">
      <CompanyContextProvider>
        <SocketContextProvider>
          <TemplateContextProvider>
            <ServerHeaderWrapper />
            <div className="flex flex-1 flex-row overflow-hidden">
              <ServerSidebarWrapper />
              <Body>{children}</Body>
            </div>
          </TemplateContextProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

const ServerHeaderWrapper = async () => {
  const user = await getServerSession(authOptions);
  return <ClientHeader user={user} />;
};

const ServerSidebarWrapper = async () => {
  const user = await getServerSession(authOptions);

  return <ClientSidebar user={user} />;
};

const Body: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="child3"
      className="h-full w-full flex-col items-stretch justify-stretch overflow-x-hidden bg-white"
    >
      {children}
    </div>
  );
};

export default DashboardLayout;