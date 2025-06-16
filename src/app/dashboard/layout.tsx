import { getServerSession } from "next-auth";
import { PropsWithChildren } from "react";

import { HeaderLanguagePicker } from "../../components/pages/dashboard/Header/LanguagePicker";

import { SocketContextProvider } from "../../context/SocketContextProvider";
import { TemplateContextProvider } from "../../context/TemplatesProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { LanguageShortcutPicker } from "../../components/pages/dashboard/Header/LanguageShortcutPicker";
import { TemplateShortcutPicker } from "../../components/pages/dashboard/Header/TemplateShortcutPicker";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { authOptions } from "../api/auth/[...nextauth]/route";
import ClientSidebar from './Sidebar';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="parent" className="flex h-screen w-full flex-row bg-white">
      <CompanyContextProvider>
        <SocketContextProvider>
          <TemplateContextProvider>
            <ServerSidebarWrapper />
            <div className="flex w-full flex-col overflow-hidden">
              <Header />
              <Body>{children}</Body>
            </div>
          </TemplateContextProvider>
        </SocketContextProvider>
      </CompanyContextProvider>
    </div>
  );
}

const Header = () => {
  return (
    <nav className="h-20 w-full bg-primary px-4">
      <div className="flex h-full w-full items-center justify-between">
        <div className="flex w-full gap-4 items-center customJustifyHeader">
          <LanguageShortcutPicker />
          <HeaderLanguagePicker />
          <TemplateShortcutPicker />
        </div>

        <div className="flex  items-center justify-end gap-4 px-2">
          <div>
            <StationPicker />
          </div>
        </div>
      </div>
    </nav>
  );
};

const ServerSidebarWrapper = async () => {
  const user = await getServerSession(authOptions);

  return <ClientSidebar user={user} />;
};

const Body: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="child3"
      className="h-[calc(100vh-6rem)] w-full flex-col items-stretch justify-stretch overflow-x-hidden bg-white"
    >
      {children}
    </div>
  );
};

export default DashboardLayout;
