'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { ClientLink } from "../../components/pages/dashboard/Sidebar/ClientLink";
import { Logout } from "../../components/pages/dashboard/Header/Logout";
import { CompanyLogo } from "../../components/pages/dashboard/Header/CompanyLogo";
import { LogoutIcon } from "../../components/icons/sidebar/LogoutIcon";

interface ClientSidebarProps {
    user: Session | null;
}

interface MenuItem {
    title: string;
    href?: string;
    children?: MenuItem[];
    roles?: string[];
    condition?: boolean;
}

const ClientSidebar = ({ user }: ClientSidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Define menu structure
    const menuItems: MenuItem[] = [
        {
            title: "Display",
            children: [
                { title: "Image", href: "/dashboard/image" },
                { title: "Video", href: "/dashboard/video" },
                { title: "Slideshow", href: "/dashboard/slideshow" },
                { title: "Documents", href: "/dashboard/documents" },
                { title: "Survey", href: "/dashboard/survey" },
                { title: "Maps", href: "/dashboard/maps" },
                { title: "Website", href: "/dashboard/website" }
            ],
            roles: ["Admin", "User", "Staff"]
        },
        {
            title: "Communicate",
            children: [
                { title: "Text", href: "/dashboard/text" },
                { title: "Chat", href: "/dashboard/chat" }
            ],
            roles: ["Admin", "User", "Staff"]
        },
        {
            title: "Team",
            children: [
                { title: "Handover", href: "/dashboard/documents" },
                { title: "Reminider", href: "/dashboard/documents" },
                { title: "Information", href: "/dashboard/documents" },
                { title: "Documents", href: "/dashboard/documents" },
            ],
            roles: ["Admin", "User", "Staff"]
        },
        {
            title: "Register",
            children: [
                { title: "Form", href: "/dashboard/form" }
            ],
            roles: ["Admin", "User", "Staff"]
        },
        // {
        //     title: "Promote",
        //     children: [
        //         { title: "Whatsapp", href: "/dashboard/form" },
        //         { title: "Email", href: "/dashboard/form" },
        //         { title: "Upselling", href: "/dashboard/form" },
        //     ],
        //     roles: ["Admin", "User", "Staff"]
        // },
        {
            title: "Settings",
            href: "/dashboard/settings",
            roles: ["Admin"]
        },
        {
            title: "Test Mic",
            href: "/dashboard/test",
            condition: typeof window !== 'undefined' ? process.env.VERCEL_ENV === "preview" : false
        },
        {
            title: "Admin",
            children: [
                { title: "Assign Forms", href: "/dashboard/asignForms" }
            ],
            roles: ["SAdmin"]
        }
    ];

    // Function to find which parent menu contains the active route
    const findActiveParentMenu = (items: MenuItem[], currentPath: string): string | null => {
        for (const item of items) {
            if (item.children) {
                const hasActiveChild = item.children.some(child => child.href === currentPath);
                if (hasActiveChild) {
                    return item.title;
                }
            } else if (item.href === currentPath) {
                return null; // Direct route, no parent menu
            }
        }
        return null;
    };

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
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Auto-expand menu containing active route
    useEffect(() => {
        if (mounted && pathname) {
            const activeParent = findActiveParentMenu(menuItems, pathname);
            if (activeParent) {
                setExpandedMenus([activeParent]);
            } else {
                // If no parent menu contains active route, keep current state or collapse all
                setExpandedMenus([]);
            }
        }
    }, [pathname, mounted]);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        if (mounted && isMobile) {
            setIsOpen(false);
        }
    };

    const toggleMenu = (menuData: MenuItem) => {
        setExpandedMenus(prev =>
            prev.includes(menuData.title)
                ? []
                : [menuData.title]
        );
    };

    const hasAccess = (roles?: string[]) => {
        if (!roles) return true;
        return roles.some(role => user?.user.Roles?.includes(role));
    };

    const renderMenuItem = (item: MenuItem, level: number = 0) => {
        // Check access permissions and conditions
        if (item.roles && !hasAccess(item.roles)) return null;
        if (item.condition !== undefined && !item.condition) return null;

        const isExpanded = expandedMenus.includes(item.title);
        const hasChildren = item.children && item.children.length > 0;
        const isActive = item.href === pathname;
        const hasActiveChild = item.children?.some(child => child.href === pathname);

        return (
            <li key={item.title} className="w-full">
                {hasChildren ? (
                    <>
                        <div
                            onClick={() => toggleMenu(item)}
                            className={`
                                flex items-center justify-between w-full px-4 py-3 cursor-pointer
                                hover:bg-primary-dark transition-colors duration-200
                                ${level > 0 ? 'pl-8' : ''}
                                ${hasActiveChild ? 'bg-primary-dark/50 text-white' : 'text-white/90 hover:text-white'}
                            `}
                        >
                            <span className="font-medium text-sm tracking-wide">
                                {item.title}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                    }`}
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
                                ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                            `}
                        >
                            <ul>
                                {item.children?.map(child => renderMenuItem(child, level + 1))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <div onClick={closeSidebar}>
                        <ClientLink
                            href={item.href!}
                            title={item.title}
                            className={`
                                flex items-center px-4 py-2 transition-colors duration-200 text-sm
                                ${isActive
                                    ? 'bg-primary-dark text-white'
                                    : 'text-white/80 hover:text-white hover:bg-primary-dark/50'
                                }
                            `}
                        />
                    </div>
                )}
            </li>
        );
    };

    if (!mounted) {
        return (
            <div className="relative w-[18%] sm:w-[16%] md:w-[13%] lg:w-[11.5%] xl:w-[10%] flex h-full flex-col bg-primary customSidebar">
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
                    <div className="flex-1 overflow-y-auto">
                        <ul className="w-full py-2">
                        </ul>
                    </div>
                    <ul className="w-full border-t border-white/20">
                        <li className="flex gap-2 p-4">
                            <LogoutIcon />
                            <Logout />
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

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
                    <div className="flex-1 overflow-y-auto">
                        <ul className="w-full py-2">
                            {menuItems.map(item => renderMenuItem(item))}
                        </ul>
                    </div>

                    <ul className="w-full border-t border-white/20">
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