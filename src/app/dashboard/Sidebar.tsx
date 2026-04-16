'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { ClientLink } from "../../components/pages/dashboard/Sidebar/ClientLink";
import {
    IoImage,
    IoImages,
    IoPlay,
    IoGlobe,
    IoDocuments,
    IoMap,
    IoChatboxEllipses,
    IoSpeedometer,
    IoDocumentText,
    IoWallet,
    IoPeople,
    IoSettings,
    IoLogoWhatsapp,
    IoHome,
    IoMegaphone
} from 'react-icons/io5';
// import { IoRecordingSharp } from "react-icons/io5";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { FaMicrophone } from "react-icons/fa";
import { TiUserAdd } from "react-icons/ti";
import { FaBuilding } from "react-icons/fa";
import { FaWpforms } from "react-icons/fa";
import { IoCaretDownCircle } from "react-icons/io5";

interface ClientSidebarProps {
    user: Session | null;
}

interface MenuItem {
    title: string;
    href: string;
    roles?: string[];
    condition?: boolean;
    icon?: React.ReactNode;
    iconColor?: string;
    textColor?: string;
}

interface SettingsItem {
    title: string;
    href: string;
    roles?: string[];
}

interface TeamItem {
    title: string;
    href: string;
    roles?: string[];
}

const ClientSidebar = ({ user }: ClientSidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [teamExpanded, setTeamExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Check if user is SAdmin
    const isSAdmin = user?.user?.Roles?.includes("SAdmin");

    // Menu items for SAdmin users
    const sAdminMenuItems: MenuItem[] = [
        {
            title: "Users",
            href: "/dashboard/register",
            roles: ["SAdmin"],
            icon: <TiUserAdd size={18} />,
            iconColor: "white"
        },
        {
            title: "Companies",
            href: "/dashboard/companies",
            roles: ["SAdmin"],
            icon: <FaBuilding size={18} />,
            iconColor: "white"
        },
        {
            title: "WhatsApp Meta",
            href: "/dashboard/whatsappMetaAccounts",
            roles: ["SAdmin"],
            icon: <IoLogoWhatsapp size={18} />,
            iconColor: "white"
        },
        {
            title: "Forms",
            href: "/dashboard/asignForms",
            roles: ["SAdmin"],
            icon: <FaWpforms size={18} />,
            iconColor: "white"
        },
    ];

    // Regular menu items for other users
    const menuItems: MenuItem[] = [
        {
            title: "Image",
            href: "/dashboard/image",
            roles: ["Admin", "User", "Staff"],
            icon: <IoImage size={18} />,
            iconColor: "white"
        },
        {
            title: "Slideshow",
            href: "/dashboard/slideshow",
            roles: ["Admin", "User", "Staff"],
            icon: <IoImages size={18} />,
            iconColor: "white"
        },
        {
            title: "Video",
            href: "/dashboard/video",
            roles: ["Admin", "User", "Staff"],
            icon: <IoPlay size={18} />,
            iconColor: "white"
        },
        {
            title: "Scroll",
            href: "/dashboard/scroll",
            roles: ["Admin", "User", "Staff"],
            icon: <IoCaretDownCircle size={18} />,
            iconColor: "white"
        },
        {
            title: "Public",
            href: "/dashboard/public",
            roles: ["Admin", "User", "Staff"],
            icon: <IoMegaphone size={18} />,
            iconColor: "white"
        },
        {
            title: "Website",
            href: "/dashboard/website",
            roles: ["Admin", "User", "Staff"],
            icon: <IoGlobe size={18} />,
            iconColor: "white"
        },
        {
            title: "Document",
            href: "/dashboard/documents",
            roles: ["Admin", "User", "Staff"],
            icon: <IoDocuments size={18} />,
            iconColor: "white"
        },
        {
            title: "Map",
            href: "/dashboard/maps",
            roles: ["Admin", "User", "Staff"],
            icon: <IoMap size={18} />,
            iconColor: "white"
        },
        {
            title: "Text",
            href: "/dashboard/text",
            roles: ["Admin", "User", "Staff"],
            icon: <IoChatbubbleEllipses size={18} />,
            iconColor: "white"
        },
        {
            title: "Survey",
            href: "/dashboard/survey",
            roles: ["Admin", "User", "Staff"],
            icon: <IoSpeedometer size={18} />,
            iconColor: "white"
        },
        {
            title: "Recordings",
            href: "/dashboard/recordings",
            roles: ["Admin", "User", "Staff"],
            icon: <FaMicrophone size={18} />,
            iconColor: "white"
        },
        {
            title: "Upsell",
            href: "/dashboard/upsell",
            roles: ["Admin", "User", "Staff"],
            icon: <IoWallet size={18} />,
            iconColor: "#F6C6AD",
            textColor: "#F6C6AD"
        },
        {
            title: "Forms",
            href: "/dashboard/form",
            roles: ["Admin", "User", "Staff"],
            icon: <IoDocumentText size={18} />,
            iconColor: "#FAFA86",
            textColor: "#FAFA86"
        },
        {
            title: "WhatsApp",
            href: "/dashboard/whatsapp",
            roles: ["Admin", "User", "Staff"],
            icon: <IoLogoWhatsapp size={18} />,
            iconColor: "#D9F2D0",
            textColor: "#D9F2D0"
        },
    ];

    // Team submenu
    const teamItems: TeamItem[] = [
        { title: "Handover", href: "/dashboard/handover", roles: ["Admin", "User", "Staff"] },
        { title: "Reminder", href: "/dashboard/reminder", roles: ["Admin", "User", "Staff"] },
        { title: "Information", href: "/dashboard/information", roles: ["Admin", "User", "Staff"] },
        { title: "Documents", href: "/dashboard/documentDownload", roles: ["Admin", "User", "Staff"] },
    ];

    // Settings submenu
    const settingsItems: SettingsItem[] = [
        { title: "General Settings", href: "/dashboard/settings", roles: ["Admin"] },
        { title: "Upsell Categories", href: "/dashboard/category", roles: ["Admin", "User"] },
        { title: "Upsell Packages", href: "/dashboard/package", roles: ["Admin", "User"] },
    ];

    // Select which menu to display based on user role
    const displayMenuItems = isSAdmin ? sAdminMenuItems : menuItems;

    useEffect(() => {
        setMounted(true);

        const checkScreenSize = () => {
            const isMobileView = window.innerWidth < 768;
            setIsMobile(isMobileView);
            if (window.innerWidth >= 768) {
                setIsOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        // Auto-expand settings if any settings route is active
        const isSettingsRoute = settingsItems.some(item => item.href === pathname);
        if (isSettingsRoute) {
            setSettingsExpanded(true);
        }

        // Auto-expand team if any team route is active
        const isTeamRoute = teamItems.some(item => item.href === pathname);
        if (isTeamRoute) {
            setTeamExpanded(true);
        }

        return () => window.removeEventListener('resize', checkScreenSize);
    }, [pathname]);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        if (mounted && isMobile) {
            setIsOpen(false);
        }
    };

    const toggleSettings = () => {
        setSettingsExpanded(!settingsExpanded);
        if (!settingsExpanded) {
            setTeamExpanded(false);
        }
    };


    const toggleTeam = () => {
        setTeamExpanded(!teamExpanded);
        if (!teamExpanded) {
            setSettingsExpanded(false);
        }
    };

    const hasAccess = (roles?: string[]) => {
        if (!roles) return true;
        return roles.some(role => user?.user.Roles?.includes(role));
    };

    const renderMenuItem = (item: MenuItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;
        if (item.condition !== undefined && !item.condition) return null;

        const isActive = item.href === pathname;
        const textColor = item.textColor || (isActive ? 'white' : 'white');

        return (
            <li key={item.title} className="w-full" onClick={closeSidebar}>
                <div
                    className={`
                        flex items-center gap-3 px-6 py-3 transition-colors duration-200 cursor-pointer
                        ${isActive
                            ? 'bg-white/10 border-l-4 border-white'
                            : 'hover:bg-white/5 border-l-4 border-transparent'
                        }
                    `}
                    style={{ color: item.textColor || '#fff' }}
                >
                    {item.icon && (
                        <span style={{ color: item.iconColor || 'white' }}>
                            {item.icon}
                        </span>
                    )}
                    <ClientLink
                        href={item.href}
                        title={item.title}
                        className="flex-1 text-sm font-normal"
                        style={{ color: item.textColor }}
                    />
                </div>
            </li>
        );
    };

    const renderTeamItem = (item: TeamItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;

        const isActive = item.href === pathname;

        const handleClick = (e: React.MouseEvent) => {
            closeSidebar();
        };

        return (
            <li key={item.title} className="w-full" onClick={handleClick}>
                <div
                    className={`
                    flex items-center pl-10 pr-0 py-2.5 pr-2 transition-colors duration-200 cursor-pointer
                    ${isActive
                            ? 'bg-white/10 text-white border-l-4 border-white'
                            : 'text-white/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                        }
                `}
                >
                    <ClientLink
                        href={item.href}
                        title={item.title}
                        className="flex-1 text-sm font-normal"
                    />
                </div>
            </li>
        );
    };

    const renderSettingsItem = (item: SettingsItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;

        const isActive = item.href === pathname;

        return (
            <li key={item.title} className="w-full" onClick={closeSidebar}>
                <div
                    className={`
                        flex items-center pl-10 py-2.5 pr-2 transition-colors duration-200 cursor-pointer
                        ${isActive
                            ? 'bg-white/10 text-white border-l-4 border-white'
                            : 'text-white/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                        }
                    `}
                >
                    <ClientLink
                        href={item.href}
                        title={item.title}
                        className="flex-1 text-sm font-normal"
                    />
                </div>
            </li>
        );
    };

    const hasTeamAccess = teamItems.some(item => hasAccess(item.roles));
    const isTeamActive = teamItems.some(item => item.href === pathname);
    const hasSettingsAccess = settingsItems.some(item => hasAccess(item.roles));
    const isSettingsActive = settingsItems.some(item => item.href === pathname);

    return (
        <>
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md md:hidden customHamburger"
                aria-label="Toggle sidebar"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
        flex flex-col bg-primary customSidebar transition-transform duration-300 ease-in-out z-40
        ${isMobile
                        ? `fixed left-0 top-0 h-full w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'relative w-[20%] sm:w-[18%] md:w-[15%] lg:w-[13%] xl:w-[12%] h-full'
                    }
    `}
            >
                <div className="flex h-full w-full flex-col justify-between" style={{ overflow: 'hidden' }}>
                    <div className="flex-1 overflow-y-auto">
                        <ul className="w-full py-2">
                            {displayMenuItems.map(item => renderMenuItem(item))}
                        </ul>

                        {/* Only show Team and Settings dropdowns for non-SAdmin users */}
                        {!isSAdmin && (
                            <>
                                {/* Team Dropdown */}
                                {hasTeamAccess && (
                                    <div className="w-full">
                                        <div
                                            onClick={toggleTeam}
                                            className={`
                                                flex items-center justify-between gap-3 px-6 py-3 cursor-pointer
                                                transition-colors duration-200
                                                text-white/90 hover:bg-white/5 hover:text-white border-l-4 border-transparent
                                            `}
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <IoPeople size={18} />
                                                <span className="text-sm font-normal">Team</span>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-300 ${teamExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                        <div
                                            className={`
                                                overflow-hidden transition-all duration-300 ease-in-out
                                                ${teamExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                                            `}
                                        >
                                            <ul className="bg-primary-dark/30">
                                                {teamItems.map(item => renderTeamItem(item))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Settings Dropdown */}
                                {hasSettingsAccess && (
                                    <div className="w-full">
                                        <div
                                            onClick={toggleSettings}
                                            className={`
                                                flex items-center justify-between px-6 py-3 cursor-pointer
                                                transition-colors duration-200
                                                text-white/90 hover:bg-white/5 hover:text-white border-l-4 border-transparent
                                            `}
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <IoSettings size={18} />
                                                <span className="text-sm font-normal">Settings</span>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-300 ${settingsExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                        <div
                                            className={`
                                                overflow-hidden transition-all duration-300 ease-in-out
                                                ${settingsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                                            `}
                                        >
                                            <ul className="bg-primary-dark/30">
                                                {settingsItems.map(item => renderSettingsItem(item))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientSidebar;
