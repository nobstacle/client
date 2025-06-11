'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { ClientLink } from "../../components/pages/dashboard/Sidebar/ClientLink";
import { Logout } from "../../components/pages/dashboard/Header/Logout";
import { CompanyLogo } from "../../components/pages/dashboard/Header/CompanyLogo";
import { LogoutIcon } from "../../components/icons/sidebar/LogoutIcon";

interface ClientSidebarProps {
    user: Session | null;
}

const ClientSidebar = ({ user }: ClientSidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        if (isMobile) {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md md:hidden"
                aria-label="Toggle sidebar"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {isOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            <div
                id="child2"
                className={`
          flex h-full flex-col bg-primary customSidebar transition-transform duration-300 ease-in-out z-40
          ${isMobile
                        ? `fixed left-0 top-0 w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'relative w-[18%] sm:w-[16%] md:w-[13%] lg:w-[11.5%] xl:w-[10%]'
                    }
        `}
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
                        {(user?.user.Roles?.includes("Admin") ||
                            user?.user.Roles?.includes("User") ||
                            user?.user.Roles?.includes("Staff")) && (
                                <>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/text" title="Text" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/chat" title="Chat" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/image" title="Image" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/video" title="Video" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/slideshow" title="Slideshow" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/maps" title="Maps" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/survey" title="Survey" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/website" title="Website" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/form" title="Form" />
                                    </div>
                                    <div onClick={closeSidebar}>
                                        <ClientLink href="/dashboard/documents" title="Documents" />
                                    </div>
                                </>
                            )}

                        {user?.user.Roles?.includes("Admin") && (
                            <div onClick={closeSidebar}>
                                <ClientLink href="/dashboard/settings" title="Settings" />
                            </div>
                        )}

                        {process.env.VERCEL_ENV === "preview" && (
                            <div onClick={closeSidebar}>
                                <ClientLink href="/dashboard/test" title="Test Mic" />
                            </div>
                        )}

                        {user?.user.Roles?.includes("SAdmin") && (
                            <>
                                <div onClick={closeSidebar}>
                                    <ClientLink href="/dashboard/asignForms" title="Asign Forms" />
                                </div>
                            </>
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
        </>
    );
};

export default ClientSidebar;