import { getServerSession } from "next-auth";
import { PropsWithChildren } from "react";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { HeaderLanguagePicker } from "../../components/pages/dashboard/Header/LanguagePicker";
import { ClientLink } from "../../components/pages/dashboard/Sidebar/ClientLink";
import { Logout } from "../../components/pages/dashboard/Header/Logout";
import { SocketContextProvider } from "../../context/SocketContextProvider";
import { TemplateContextProvider } from "../../context/TemplatesProvider";
import { CompanyContextProvider } from "../../context/CompanyProvider";
import { LanguageShortcutPicker } from "../../components/pages/dashboard/Header/LanguageShortcutPicker";
import { TemplateShortcutPicker } from "../../components/pages/dashboard/Header/TemplateShortcutPicker";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { CompanyLogo } from "../../components/pages/dashboard/Header/CompanyLogo";
import { LogoutIcon } from "../../components/icons/sidebar/LogoutIcon";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="parent" className="flex h-screen w-full flex-row bg-white">
      <CompanyContextProvider>
        <SocketContextProvider>
          <TemplateContextProvider>
            <Sidebar />
            <div className="flex w-full flex-col">
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
        {/* <div className="w-full">
          <CompanyLogo />
        </div> */}
        <div className="flex w-full gap-4 ">
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

const Sidebar = async () => {
  const user = await getServerSession(authOptions);

  return (
    <div
      id="child2"
      className="flex h-full  flex-col bg-primary"
      style={{ width: "10%" }}
    >
      <div
        style={{
          minHeight: "5rem",
          maxHeight: "5rem",
          height: "5rem",
          paddingTop: "0.2em",
          paddingLeft: "0.2em",
          paddingRight: "0.2em",
        }}
        className="flex items-center justify-center"
      >
        <CompanyLogo />
      </div>

      <div className="flex h-full w-full flex-col justify-between">
        <ul className="w-full">
          <ClientLink href="/dashboard/text" title="Text" />
          <ClientLink href="/dashboard/chat" title="Chat" />
          <ClientLink href="/dashboard/image" title="Image" />
          <ClientLink href="/dashboard/video" title="Video" />
          <ClientLink href="/dashboard/slideshow" title="Slideshow" />
          <ClientLink href="/dashboard/maps" title="Maps" />
          <ClientLink href="/dashboard/survey" title="Survey" />
          <ClientLink href="/dashboard/website" title="Website" />

          {user?.user.Roles?.includes("Admin") && (
            <ClientLink href="/dashboard/settings" title="Settings" />
          )}
          {process.env.VERCEL_ENV === "preview" && (
            <ClientLink href="/dashboard/test" title="Test Mic" />
          )}
        </ul>
        <ul className="w-full">
          <li className="flex gap-2 p-4">
            <LogoutIcon />
            <Logout />
          </li>
        </ul>
      </div>
    </div>
  );
};

const Body: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="child3"
      className="h-[calc(100vh-6rem)] w-full flex-col items-stretch justify-stretch overflow-hidden overflow-x-hidden bg-white"
    >
      {children}
    </div>
  );
};

export default DashboardLayout;
