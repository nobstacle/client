"use client";
import { ColorShortcutForm } from "../../../components/pages/dashboard/Settings/ColorShortcutForm";
import { DefaultSlideshowShortcutForm } from "../../../components/pages/dashboard/Settings/DefaultSlideshowShortcutForm";
import { LanguageShortcutForm } from "../../../components/pages/dashboard/Settings/LanguageShortcutForm";
import { UpdateCompanyForm } from "../../../components/pages/dashboard/Settings/UpdateCompanyImageForm";
import { UpdateCompanyUsers } from "../../../components/pages/dashboard/Settings/UpdateCompanyUsers";
import { useHasHydrated } from "../../../hooks/useHydrated";

export default function SettingsPage() {
  const hasHydrated = useHasHydrated();
  // TODO shorcuts settings
  // - language shortcuts
  // - color shortcuts for any template

  if (hasHydrated) {
    return (
      <div
        id="setting-container"
        className="flex h-full w-full  justify-start gap-4 overflow-y-auto  p-6"
      >
        <div
          id="company-info-box"
          className="bg-red flex w-5/12 rounded-md border-2 p-4"
        >
          <div className="w-full">
            <div className="w-full p-1">
              <UpdateCompanyForm />
              <UpdateCompanyUsers />
            </div>
          </div>
        </div>

        <div
          id="company-info-box"
          className="bg-red flex w-5/12 rounded-md border-2 p-4"
        >
          <div className="w-full">
            <div className="w-50 p-1">
              <DefaultSlideshowShortcutForm />
            </div>

            <div className="w-50 mt-4 flex justify-start  p-1">
              <LanguageShortcutForm />
            </div>

            <div className="w-50 mt-4 flex justify-start  p-1">
              <ColorShortcutForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div></div>;
}
