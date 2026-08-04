'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Session } from 'next-auth';
import { ClientLink } from "../../components/pages/dashboard/Sidebar/ClientLink";
import { GetUserResRolesItem } from "../../lib/client/model";
import useCompanyStore from "../../lib/zustand/store/companyStore";
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
    IoMegaphone,
    IoDesktop
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
    featureKey?: FeatureKey;
}

interface SettingsItem {
    title: string;
    href: string;
    roles?: string[];
    featureKey?: FeatureKey;
}

interface TeamItem {
    title: string;
    href: string;
    roles?: string[];
    featureKey?: FeatureKey;
}

type FeatureKey =
    | 'display'
    | 'screens'
    | 'recordings'
    | 'upsell'
    | 'forms'
    | 'whatsapp'
    | 'team';

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
    {
        title: "Device Library",
        href: "/dashboard/device-library",
        roles: ["SAdmin"],
        icon: <IoDesktop size={18} />,
        iconColor: "white"
    },
];

const displayItems: MenuItem[] = [
    {
        title: "Image",
        href: "/dashboard/image",
        roles: ["Admin", "User", "Staff"],
        icon: <IoImage size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Slideshow",
        href: "/dashboard/slideshow",
        roles: ["Admin", "User", "Staff"],
        icon: <IoImages size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Video",
        href: "/dashboard/video",
        roles: ["Admin", "User", "Staff"],
        icon: <IoPlay size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Scroll",
        href: "/dashboard/scroll",
        roles: ["Admin", "User", "Staff"],
        icon: <IoCaretDownCircle size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Website",
        href: "/dashboard/website",
        roles: ["Admin", "User", "Staff"],
        icon: <IoGlobe size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Document",
        href: "/dashboard/documents",
        roles: ["Admin", "User", "Staff"],
        icon: <IoDocuments size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Map",
        href: "/dashboard/maps",
        roles: ["Admin", "User", "Staff"],
        icon: <IoMap size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Text",
        href: "/dashboard/text",
        roles: ["Admin", "User", "Staff"],
        icon: <IoChatbubbleEllipses size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
    {
        title: "Survey",
        href: "/dashboard/survey",
        roles: ["Admin", "User", "Staff"],
        icon: <IoSpeedometer size={18} />,
        iconColor: "white",
        featureKey: "display",
    },
];

const menuItems: MenuItem[] = [
    {
        title: "Screens",
        href: "/dashboard/public",
        roles: ["Admin", "User", "Staff"],
        icon: <IoMegaphone size={18} />,
        iconColor: "white",
        featureKey: "screens",
    },
    {
        title: "Recordings",
        href: "/dashboard/recordings",
        roles: ["Admin", "User", "Staff"],
        icon: <FaMicrophone size={18} />,
        iconColor: "white",
        featureKey: "recordings",
    },
    {
        title: "Upsell",
        href: "/dashboard/upsell",
        roles: ["Admin", "User", "Staff"],
        icon: <IoWallet size={18} />,
        iconColor: "#F6C6AD",
        textColor: "#F6C6AD",
        featureKey: "upsell",
    },
    {
        title: "Forms",
        href: "/dashboard/form",
        roles: ["Admin", "User", "Staff"],
        icon: <IoDocumentText size={18} />,
        iconColor: "#FAFA86",
        textColor: "#FAFA86",
        featureKey: "forms",
    },
    {
        title: "WhatsApp",
        href: "/dashboard/whatsapp",
        roles: ["Admin", "User", "Staff"],
        icon: <IoLogoWhatsapp size={18} />,
        iconColor: "#D9F2D0",
        textColor: "#D9F2D0",
        featureKey: "whatsapp",
    },
];

const teamItems: TeamItem[] = [
    { title: "Handover", href: "/dashboard/handover", roles: ["Admin", "User", "Staff"], featureKey: "team" },
    { title: "Reminder", href: "/dashboard/reminder", roles: ["Admin", "User", "Staff"], featureKey: "team" },
    { title: "Information", href: "/dashboard/information", roles: ["Admin", "User", "Staff"], featureKey: "team" },
    { title: "Documents", href: "/dashboard/documentDownload", roles: ["Admin", "User", "Staff"], featureKey: "team" },
];

const settingsItems: SettingsItem[] = [
    { title: "General Settings", href: "/dashboard/settings", roles: ["Admin"] },
    { title: "Upsell Categories", href: "/dashboard/category", roles: ["Admin", "User"], featureKey: "upsell" },
    { title: "Upsell Packages", href: "/dashboard/package", roles: ["Admin", "User"], featureKey: "upsell" },
];

const ClientSidebar = ({ user }: ClientSidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [windowWidth, setWindowWidth] = useState(0);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [teamExpanded, setTeamExpanded] = useState(false);
    const [displayExpanded, setDisplayExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchParamsString = searchParams.toString();
    const company = useCompanyStore((state) => state.company);

    // Check if user is SAdmin
    const isSAdmin = user?.user?.Roles?.includes("SAdmin" as GetUserResRolesItem);
    const featureFlags = {
        display: company?.displayEnabled ?? true,
        screens: company?.screensEnabled ?? true,
        recordings: company?.recordingsEnabled ?? true,
        upsell: company?.upsellEnabled ?? true,
        forms: company?.formsEnabled ?? true,
        whatsapp: company?.whatsappEnabled ?? true,
        team: company?.teamEnabled ?? true,
    };

    // Select which menu to display based on user role
    const displayMenuItems = isSAdmin ? sAdminMenuItems : menuItems;

    useEffect(() => {
        setMounted(true);

        const checkScreenSize = () => {
            setWindowWidth(window.innerWidth);
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

        // Auto-expand display if any display route is active
        const isDisplayRoute = displayItems.some(item => item.href === pathname);
        if (isDisplayRoute) {
            setDisplayExpanded(true);
        }

        // Auto-expand team if any team route is active
        const isTeamRoute = teamItems.some(item => item.href === pathname);
        if (isTeamRoute) {
            setTeamExpanded(true);
        }

        return () => window.removeEventListener('resize', checkScreenSize);
    }, [pathname]);

    // Warm JS chunks for the heaviest dashboard routes so sidebar clicks feel instant.
    useEffect(() => {
        const query = searchParamsString ? `?${searchParamsString}` : "";
        const heavyRoutes = ["/dashboard/form", "/dashboard/upsell"];
        heavyRoutes.forEach((route) => {
            router.prefetch(`${route}${query}`);
        });
    }, [router, searchParamsString]);

    const isCompactDesktop = windowWidth >= 1024 && windowWidth < 1350;

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
            setDisplayExpanded(false);
        }
    };

    const toggleDisplay = () => {
        setDisplayExpanded(!displayExpanded);
        if (!displayExpanded) {
            setSettingsExpanded(false);
            setTeamExpanded(false);
        }
    };

    const hasAccess = (roles?: string[]) => {
        if (!roles) return true;
        return roles.some(role => user?.user.Roles?.includes(role as GetUserResRolesItem));
    };

    const isFeatureEnabled = (featureKey?: FeatureKey) => {
        if (!featureKey) return true;
        return featureFlags[featureKey];
    };

    const renderMenuItem = (item: MenuItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;
        if (item.condition !== undefined && !item.condition) return null;

        const isActive = item.href === pathname;
        const isDisabled = !isFeatureEnabled(item.featureKey);

        return (
            <li key={item.title} className="w-full">
                <ClientLink
                    href={item.href}
                    searchParamsString={searchParamsString}
                    onClick={!isDisabled ? closeSidebar : undefined}
                    disabled={isDisabled}
                    className={`
                        flex items-center gap-3 px-6 py-3 transition-colors duration-200
                        ${isCompactDesktop ? 'px-4 py-2.5 gap-2.5' : ''}
                        ${isDisabled
                            ? 'cursor-not-allowed opacity-45 bg-white/0'
                            : 'cursor-pointer'
                        }
                        ${!isDisabled && isActive
                            ? 'bg-white/10 border-l-4 border-white'
                            : !isDisabled ? 'hover:bg-white/5 border-l-4 border-transparent' : 'border-l-4 border-transparent'
                        }
                        ${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal flex-1
                    `}
                    style={{ color: isDisabled ? 'rgba(255,255,255,0.45)' : (item.textColor || '#fff') }}
                >
                    {item.icon && (
                        <span style={{ color: isDisabled ? 'rgba(255,255,255,0.45)' : (item.iconColor || 'white') }}>
                            {item.icon}
                        </span>
                    )}
                    {item.title}
                </ClientLink>
            </li>
        );
    };

    const renderTeamItem = (item: TeamItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;

        const isActive = item.href === pathname;
        const isDisabled = !isFeatureEnabled(item.featureKey);

        return (
            <li key={item.title} className="w-full">
                <ClientLink
                    href={item.href}
                    searchParamsString={searchParamsString}
                    onClick={!isDisabled ? closeSidebar : undefined}
                    disabled={isDisabled}
                    className={`
                    flex items-center pl-10 pr-0 py-2.5 pr-2 transition-colors duration-200
                    ${isCompactDesktop ? 'pl-8 py-2' : ''}
                    ${isDisabled
                            ? 'opacity-45 cursor-not-allowed'
                            : ''
                        }
                    ${!isDisabled && isActive
                            ? 'bg-white/10 text-white border-l-4 border-white'
                            : !isDisabled ? 'text-white/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent' : 'text-white/80 border-l-4 border-transparent'
                        }
                    ${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal flex-1
                    `}
                >
                    {item.title}
                </ClientLink>
            </li>
        );
    };

    const renderDisplayItem = (item: MenuItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;

        const isActive = item.href === pathname;
        const isDisabled = !isFeatureEnabled(item.featureKey);

        return (
            <li key={item.title} className="w-full">
                <ClientLink
                    href={item.href}
                    searchParamsString={searchParamsString}
                    onClick={!isDisabled ? closeSidebar : undefined}
                    disabled={isDisabled}
                    className={`
                        flex items-center pl-10 pr-0 py-2.5 transition-colors duration-200
                        ${isCompactDesktop ? 'pl-8 py-2' : ''}
                        ${isDisabled
                            ? 'opacity-45 cursor-not-allowed'
                            : 'cursor-pointer'
                        }
                        ${!isDisabled && isActive
                            ? 'bg-white/10 text-white border-l-4 border-white'
                            : !isDisabled ? 'text-white/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent' : 'text-white/80 border-l-4 border-transparent'
                        }
                        ${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal flex-1
                    `}
                >
                    {item.icon && (
                        <span className="mr-3 opacity-80">
                            {React.cloneElement(item.icon as React.ReactElement, { size: 14 })}
                        </span>
                    )}
                    {item.title}
                </ClientLink>
            </li>
        );
    };

    const renderSettingsItem = (item: SettingsItem) => {
        if (item.roles && !hasAccess(item.roles)) return null;

        const isActive = item.href === pathname;
        const isDisabled = !isFeatureEnabled(item.featureKey);

        return (
            <li key={item.title} className="w-full">
                <ClientLink
                    href={item.href}
                    searchParamsString={searchParamsString}
                    onClick={!isDisabled ? closeSidebar : undefined}
                    disabled={isDisabled}
                    className={`
                        flex items-center pl-10 py-2.5 pr-2 transition-colors duration-200
                        ${isCompactDesktop ? 'pl-8 py-2' : ''}
                        ${isDisabled
                            ? 'opacity-45 cursor-not-allowed'
                            : ''
                        }
                        ${!isDisabled && isActive
                            ? 'bg-white/10 text-white border-l-4 border-white'
                            : !isDisabled ? 'text-white/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent' : 'text-white/80 border-l-4 border-transparent'
                        }
                        ${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal flex-1
                    `}
                >
                    {item.title}
                </ClientLink>
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
                        : `relative h-full ${isCompactDesktop ? 'w-[clamp(190px,15vw,230px)]' : 'w-[clamp(210px,17vw,260px)]'}`
                    }
    `}
            >
                <div className="flex h-full w-full flex-col justify-between" style={{ overflow: 'hidden' }}>
                    <div className="flex-1 overflow-y-auto">
                        <ul className="w-full py-2">
                            {/* Display Dropdown (only for non-SAdmin) */}
                            {!isSAdmin && (
                                <div className="w-full">
                                    <div
                                        onClick={toggleDisplay}
                                        className={`
                                            flex items-center justify-between gap-3 px-6 py-3 cursor-pointer
                                            ${isCompactDesktop ? 'px-4 py-2.5 gap-2.5' : ''}
                                            transition-colors duration-200
                                            text-white/90 hover:bg-white/5 hover:text-white border-l-4 border-transparent
                                        `}
                                    >
                                        <div className={`flex items-center gap-3 flex-1 ${isCompactDesktop ? 'gap-2' : ''}`}>
                                            <IoDesktop size={isCompactDesktop ? 16 : 18} />
                                            <span className={`${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal`}>Display</span>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-300 ${displayExpanded ? 'rotate-180' : ''}`}
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
                                            ${displayExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                        `}
                                    >
                                        <ul className="bg-primary-dark/30">
                                            {displayItems.map(item => renderDisplayItem(item))}
                                        </ul>
                                    </div>
                                </div>
                            )}

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
                                                ${isCompactDesktop ? 'px-4 py-2.5 gap-2.5' : ''}
                                                transition-colors duration-200
                                                text-white/90 hover:bg-white/5 hover:text-white border-l-4 border-transparent
                                            `}
                                        >
                                            <div className={`flex items-center gap-3 flex-1 ${isCompactDesktop ? 'gap-2' : ''}`}>
                                                <IoPeople size={isCompactDesktop ? 16 : 18} />
                                                <span className={`${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal`}>Team</span>
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
                                                ${isCompactDesktop ? 'px-4 py-2.5' : ''}
                                                transition-colors duration-200
                                                text-white/90 hover:bg-white/5 hover:text-white border-l-4 border-transparent
                                            `}
                                        >
                                            <div className={`flex items-center gap-3 flex-1 ${isCompactDesktop ? 'gap-2' : ''}`}>
                                                <IoSettings size={isCompactDesktop ? 16 : 18} />
                                                <span className={`${isCompactDesktop ? 'text-xs' : 'text-sm'} font-normal`}>Settings</span>
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
