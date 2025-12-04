'use client';
import ReactDOM from 'react-dom';
import { useCallback, useEffect, useRef, useMemo } from "react";
import { useState } from "react";
import { Drawer, Button, Input, List, Tag, Spin, Empty, message } from "antd";
import { MenuOutlined, CloseOutlined, SettingOutlined, MoreOutlined } from "@ant-design/icons";
import { HeaderLanguagePicker } from "../../components/pages/dashboard/Header/LanguagePicker";
import { LanguageShortcutPicker } from "../../components/pages/dashboard/Header/LanguageShortcutPicker";
import { TemplateShortcutPicker } from "../../components/pages/dashboard/Header/TemplateShortcutPicker";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { ChatBot } from "../../components/pages/dashboard/Header/chatBot";
import { HeaderSurveyShortcut } from "../../components/pages/dashboard/Header/SurveyPicker";
import { HeaderRecordingShortcut } from "../../components/pages/dashboard/Header/SendRecording";
import { TextSurveyShortcut } from "../../components/pages/dashboard/Header/TextSurveyShortcut";
import { WebsiteShortcut } from "../../components/pages/dashboard/Header/WebsiteShortcut";
import {
    useTemplateControllerGetTextTemplates,
    useTemplateControllerGetImageTemplates,
    useTemplateControllerGetVideoTemplates,
    useTemplateControllerGetWebsiteTemplates,
    useTemplateControllerGetSlideshowTemplates,
    useTemplateControllerGetMapTemplates,
    useTemplateControllerGetDocumenttemplates,
    useCompanyControllerGetCompany
} from '../../lib/client/api';
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../context/SocketContextProvider";
import { ChatType } from "@/constant/types";
import {
    IoImage,
    IoImages,
    IoPlay,
    IoGlobe,
    IoDocuments,
    IoMap,
    IoChatboxEllipses,
    IoQrCode
} from 'react-icons/io5';
import { Logout } from "../../components/pages/dashboard/Header/Logout";
import { LogoutIcon } from "../../components/icons/sidebar/LogoutIcon";
import { Session } from 'next-auth';
import { CompanyLogo } from "../../components/pages/dashboard/Header/CompanyLogo";
import { GiHamburgerMenu } from "react-icons/gi";
import { RiLockPasswordLine, RiLogoutBoxLine } from 'react-icons/ri';
import { HiOutlineOfficeBuilding, HiOutlineUser } from 'react-icons/hi';
import { signOut } from "next-auth/react";

interface ClientHeaderProps {
    user: Session | null;
}

const ClientHeader = ({ user }: ClientHeaderProps) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [shortcutMenuOpen, setShortcutMenuOpen] = useState(false);
    const [confirmationNumber, setConfirmationNumber] = useState("");
    const [searchValue, setSearchValue] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const params = useSearchParams();
    const { emitSendTemplate, socketConnected } = useSocketContext();
    const debounceTimerRef = useRef(null);
    const confirmationTimerRef = useRef(null);
    const justSelectedRef = useRef(false);
    const isSAdmin = user?.user.Roles?.includes("SAdmin");
    const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
    const hamburgerMenuRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, width: 0 });
    const [hamburgerPosition, setHamburgerPosition] = useState({ top: 0, right: 0 });
    const [isInIframe, setIsInIframe] = useState(false);

    useEffect(() => {
        setIsInIframe(window.self !== window.top);
    }, []);

    // Get company data with proper caching
    const { data: companyData } = useCompanyControllerGetCompany({
        query: {
            queryKey: ['company'],
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
        }
    });

    const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

    // Add this useEffect near the top with other useEffects:
    useEffect(() => {
        if (!isInIframe) return;

        const handler = (event: MessageEvent) => {
            if (event.data.type === 'HAMBURGER_CLOSED') {
                setIsHamburgerMenuOpen(false);
            }
            if (event.data.type === 'LOGOUT') {
                handleLogout();
            }
            if (event.data.type === 'CHANGE_PASSWORD') {
                // Handle password change
                console.log('Change password clicked');
            }
               if (event.data.type === 'REQUEST_STATION_PICKER') {
            // Get the current station from URL params
            const currentStation = params.get("station") ?? 1;
            
            // Create station picker HTML that will work in the extension context
            const stationPickerHTML = `
                <div style="position: relative;">
                    <select 
                        id="extension-station-select"
                        style="
                            width: 100%;
                            padding: 6px 12px;
                            border: 1px solid #e5e7eb;
                            border-radius: 6px;
                            font-size: 14px;
                            font-weight: 600;
                            color: #1f2937;
                            background: white;
                            cursor: pointer;
                            outline: none;
                        "
                        onchange="window.parent.postMessage({type: 'STATION_CHANGE', station: this.value}, '*')"
                    >
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => `
                            <option value="${num}" ${num == currentStation ? 'selected' : ''}>
                                Station ${num}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
            
            window.parent.postMessage({
                type: 'STATION_PICKER_HTML',
                html: stationPickerHTML
            }, '*');
        }

         if (event.data.type === 'STATION_CHANGE') {
            const newStation = event.data.station;
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('station', newStation);
            window.location.href = currentUrl.toString();
        }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [isInIframe, params]);

    // Fetch all template types with proper caching configuration
    const { data: textTemplates, isLoading: textLoading } = useTemplateControllerGetTextTemplates(
        undefined,
        {
            query: {
                queryKey: ['textTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: imageTemplates, isLoading: imageLoading } = useTemplateControllerGetImageTemplates(
        undefined,
        {
            query: {
                queryKey: ['imageTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: videoTemplates, isLoading: videoLoading } = useTemplateControllerGetVideoTemplates(
        undefined,
        {
            query: {
                queryKey: ['videoTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: websiteTemplates, isLoading: websiteLoading } = useTemplateControllerGetWebsiteTemplates(
        undefined,
        {
            query: {
                queryKey: ['websiteTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: slideshowTemplates, isLoading: slideshowLoading } = useTemplateControllerGetSlideshowTemplates(
        undefined,
        {
            query: {
                queryKey: ['slideshowTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: mapTemplates, isLoading: mapLoading } = useTemplateControllerGetMapTemplates(
        {
            query: {
                queryKey: ['mapTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const { data: documentTemplates, isLoading: documentLoading } = useTemplateControllerGetDocumenttemplates(
        undefined,
        {
            query: {
                queryKey: ['documentTemplates'],
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 10,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        }
    );

    const isLoading = textLoading || imageLoading || videoLoading ||
        websiteLoading || slideshowLoading || mapLoading || documentLoading;

    // Template type configurations
    const templateConfig = useMemo(() => ({
        text: { icon: <IoChatboxEllipses />, color: '#3b5998', label: 'Text' },
        image: { icon: <IoImage />, color: '#3b5998', label: 'Image' },
        video: { icon: <IoPlay />, color: '#3b5998', label: 'Video' },
        website: { icon: <IoGlobe />, color: '#3b5998', label: 'Website' },
        slideshow: { icon: <IoImages />, color: '#3b5998', label: 'Slideshow' },
        map: { icon: <IoMap />, color: '#3b5998', label: 'Map' },
        document: { icon: <IoDocuments />, color: '#3b5998', label: 'Document' }
    }), []);

    // Combine all templates
    const allTemplates = useMemo(() => {
        const combined = [];
        const templateMap = new Map();

        const addTemplate = (template, type, extraData = {}) => {
            const tag = template.tag;

            if (!templateMap.has(tag)) {
                // First time seeing this tag
                templateMap.set(tag, {
                    id: template.id,
                    tag: template.tag,
                    type: type,
                    langCode: template.langCode,
                    order: template.order,
                    templateData: template,
                    availableInSelectedLang: template.langCode?.includes(selectedLang),
                    defaultLangData: template, // Store default language version
                    ...extraData
                });
            } else {
                // Tag exists, check if this version has the selected language
                const existing = templateMap.get(tag);
                if (template.langCode?.includes(selectedLang) && !existing.availableInSelectedLang) {
                    // Update with selected language version
                    templateMap.set(tag, {
                        ...existing,
                        id: template.id,
                        langCode: template.langCode,
                        templateData: template,
                        availableInSelectedLang: true,
                        ...extraData
                    });
                } else if (!existing.availableInSelectedLang && template.langCode?.includes(companyData?.defaultLangCode)) {
                    // Store default language version as fallback
                    templateMap.set(tag, {
                        ...existing,
                        defaultLangData: template
                    });
                }
            }
        };

        if (textTemplates) {
            textTemplates.forEach(template => {
                addTemplate(template, 'text', { content: template.content });
            });
        }

        if (imageTemplates) {
            imageTemplates.forEach(template => {
                addTemplate(template, 'image', { url: template.url });
            });
        }

        if (videoTemplates) {
            videoTemplates.forEach(template => {
                addTemplate(template, 'video', { url: template.url });
            });
        }

        if (websiteTemplates) {
            websiteTemplates.forEach(template => {
                addTemplate(template, 'website', { url: template.url });
            });
        }

        if (slideshowTemplates) {
            slideshowTemplates.forEach(template => {
                addTemplate(template, 'slideshow', { urls: template.url });
            });
        }

        if (mapTemplates) {
            mapTemplates.forEach(template => {
                addTemplate(template, 'map', {
                    origin: template.origin,
                    destination: template.destination
                });
            });
        }

        if (documentTemplates) {
            documentTemplates.forEach(template => {
                addTemplate(template, 'document', { url: template.url });
            });
        }

        const result = Array.from(templateMap.values());
        result.sort((a, b) => (a.order || 999) - (b.order || 999));
        return result;
    }, [
        textTemplates,
        imageTemplates,
        videoTemplates,
        websiteTemplates,
        slideshowTemplates,
        mapTemplates,
        documentTemplates,
        selectedLang,
        companyData?.defaultLangCode
    ]);

    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!searchValue.trim()) {
            setFilteredTemplates([]);
            setIsDropdownVisible(false);
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            const searchLower = searchValue.toLowerCase().trim();
            const filtered = allTemplates.filter(template =>
                template.tag.toLowerCase().includes(searchLower)
            );

            setFilteredTemplates(filtered);
            setIsDropdownVisible(filtered.length > 0);
        }, 300);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [searchValue, allTemplates]);

    // Confirmation number detection (separate from search)
    useEffect(() => {
        if (confirmationTimerRef.current) {
            clearTimeout(confirmationTimerRef.current);
        }

        confirmationTimerRef.current = setTimeout(() => {
            const isNumeric = /^\d+$/.test(searchValue);
            if (isNumeric && searchValue) {
                setConfirmationNumber(searchValue);
            } else if (!searchValue) {
                setConfirmationNumber("");
            }
        }, 1500);

        return () => {
            if (confirmationTimerRef.current) {
                clearTimeout(confirmationTimerRef.current);
            }
        };
    }, [searchValue]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isDropdownVisible && searchRef.current) {
            const rect = searchRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
                width: Math.max(300, rect.width)
            });
        }
    }, [isDropdownVisible]);

    const showDrawer = () => setDrawerOpen(true);
    const closeDrawer = () => setDrawerOpen(false);
    const showShortcutMenu = () => setShortcutMenuOpen(true);
    const closeShortcutMenu = () => setShortcutMenuOpen(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(event.target)) {
                setIsHamburgerMenuOpen(false);
            }
        };

        if (isHamburgerMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isHamburgerMenuOpen]);

    const clearConfirmationNumber = useCallback(() => {
        setConfirmationNumber("");
        setSearchValue("");
    }, []);

    const handleTemplateSelect = useCallback((template) => {
        justSelectedRef.current = true;
        setSearchValue(template.tag);
        setIsDropdownVisible(false);

        if (!socketConnected) {
            message.warning('Connection not ready, please try again in a moment');
            return;
        }

        const templateToSend = template.availableInSelectedLang
            ? template.templateData
            : template.defaultLangData;

        const langToSend = template.availableInSelectedLang
            ? selectedLang
            : (companyData?.defaultLangCode || "en");

        let contentType = "";
        if (template?.type === 'image') {
            contentType = ChatType.Image;
        } else if (template?.type === 'video') {
            contentType = ChatType.Video;
        } else if (template?.type === 'website') {
            contentType = ChatType.Website;
        } else if (template?.type === 'slideshow') {
            contentType = ChatType.Slideshow;
        } else if (template?.type === 'map') {
            contentType = ChatType.Map;
        } else if (template?.type === 'document') {
            contentType = ChatType.Document;
        } else {
            contentType = ChatType.Text;
        }

        emitSendTemplate({
            refId: templateToSend?.id,
            langCode: langToSend,
            refType: contentType,
            station: Number(params.get("station") ?? 1),
            contentExtra: templateToSend?.ext,
        });

        if (!template.availableInSelectedLang) {
            message.info(`Template not available in selected language. Sending in ${langToSend.toUpperCase()}`);
        }

        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);

        setIsDropdownVisible(false);
    }, [socketConnected, emitSendTemplate, params, companyData, selectedLang]);

    const handleClear = useCallback(() => {
        setSearchValue('');
        setFilteredTemplates([]);
        setIsDropdownVisible(false);
        setConfirmationNumber("");
        justSelectedRef.current = false; // Reset flag
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // REPLACE with:
    const handleSearchChange = useCallback((e) => {
        setSearchValue(e.target.value);
    }, []);

    useEffect(() => {
        if (isHamburgerMenuOpen && hamburgerMenuRef.current) {
            const rect = hamburgerMenuRef.current.getBoundingClientRect();
            const isInIframe = window.self !== window.top;

            setHamburgerPosition({
                top: rect.bottom + 8,
                right: isInIframe ? 16 : (window.innerWidth - rect.right)
            });
        }
    }, [isHamburgerMenuOpen]);

    const handleQRCodeClick = useCallback((template) => {
        justSelectedRef.current = true;
        setSearchValue(template.tag);
        setIsDropdownVisible(false);

        if (!socketConnected) {
            message.warning('Connection not ready, please try again in a moment');
            return;
        }

        const templateToSend = template.availableInSelectedLang
            ? template.templateData
            : template.defaultLangData;

        const langToSend = template.availableInSelectedLang
            ? selectedLang
            : (companyData?.defaultLangCode || "en");

        let contentType = "";
        if (template?.type === 'image') {
            contentType = ChatType.Image;
        } else if (template?.type === 'video') {
            contentType = ChatType.Video;
        } else if (template?.type === 'website') {
            contentType = ChatType.Website;
        } else if (template?.type === 'slideshow') {
            contentType = ChatType.Slideshow;
        } else if (template?.type === 'map') {
            contentType = ChatType.Map;
        } else if (template?.type === 'document') {
            contentType = ChatType.Document;
        } else {
            contentType = ChatType.Text;
        }

        emitSendTemplate({
            refId: templateToSend?.id,
            langCode: langToSend,
            refType: contentType,
            station: Number(params.get("station") ?? 1),
            contentExtra: templateToSend?.ext,
            directContent: 'QR'
        });

        if (!template.availableInSelectedLang) {
            message.info(`Template not available in selected language. Sending QR in ${langToSend.toUpperCase()}`);
        }

        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);

        setIsDropdownVisible(false);
    }, [socketConnected, emitSendTemplate, params, companyData, selectedLang]);

    const handleLogout = async () => {
        localStorage.clear();
        await signOut({
            redirect: true,
            callbackUrl: "/"
        });
    };

    return (
        <>

            <style jsx global>{`
                html, body {
                    background: transparent !important;
                }
                `}</style>
            <div style={{
                width: '100%',
                position: 'relative',
                pointerEvents: 'none' // Allow clicks to pass through transparent areas
            }}>
                {/* Mobile Header */}
                <div className="block lg:hidden" style={{ backgroundColor: '#3b5998' }}>
                    <nav className="h-14 w-full shadow-sm border-b border-white/20 px-4">
                        <div className="flex h-full w-full items-center justify-between">
                            <Button
                                type="text"
                                icon={<MenuOutlined className="text-white text-xl" />}
                                onClick={showDrawer}
                                className="border-none shadow-none hover:bg-white/20 transition-colors duration-200 rounded-lg p-3"
                                style={{
                                    background: 'transparent',
                                    border: 'none'
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <div className="customLogoutMobile">
                                    <LogoutIcon />
                                    <Logout />
                                </div>
                                <Button
                                    type="text"
                                    icon={<MoreOutlined className="text-white text-xl" />}
                                    onClick={showShortcutMenu}
                                    className="border-none shadow-none hover:bg-white/20 transition-colors duration-200 rounded-lg p-3"
                                    style={{
                                        background: 'transparent',
                                        border: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </nav>
                </div>

                {/* Desktop Header */}
                <nav
                    className="w-full shadow-sm px-6 hidden lg:block"
                    style={{
                        backgroundColor: '#3b5998',
                        height: '4.09rem',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <div className="flex h-full w-full items-center justify-between mx-auto">
                        <div className="flex items-center gap-2 lg:gap-6">
                            <div style={{
                                paddingTop: "0.2em",
                                paddingRight: isInIframe ? "0.5em" : "1em",
                                width: isInIframe ? '3vw' : '4vw',
                                minWidth: '40px'
                            }}>
                                <CompanyLogo />
                            </div>
                            {!isSAdmin && (
                                <div className="flex items-center gap-1 lg:gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 lg:px-4 text-xs lg:text-xs">
                                        <LanguageShortcutPicker checkIframe={isInIframe} />
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 lg:px-4 lg:py-2 text-xs lg:text-sm">
                                        <HeaderLanguagePicker checkIframe={isInIframe} />
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 lg:px-4  text-xs lg:text-sm">
                                        <TemplateShortcutPicker checkIframe={isInIframe} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isSAdmin && (
                            <div className="flex items-center gap-0.5 lg:gap-1">
                                <div className="scale-75 lg:scale-100">
                                    <ChatBot checkTooltip={isInIframe} />
                                </div>

                                <div className="scale-75 lg:scale-100">
                                    <TextSurveyShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>
                                <div className="scale-75 lg:scale-100">
                                    <HeaderSurveyShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>
                                <div className="scale-75 lg:scale-100">
                                    <WebsiteShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>

                                <div className="scale-75 lg:scale-100">
                                    <HeaderRecordingShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe} />
                                </div>

                                {/* Template Search Input */}
                                <div ref={searchRef} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1" style={{
                                    position: 'relative',
                                    zIndex: 1000
                                }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            ref={inputRef}
                                            autoComplete="off"
                                            type="text"
                                            placeholder="ID# or Search Template"
                                            value={searchValue}
                                            onChange={handleSearchChange}
                                            onFocus={() => {
                                                if (justSelectedRef.current) return;
                                                if (searchValue.trim() && filteredTemplates.length > 0) {
                                                    setIsDropdownVisible(true);
                                                }
                                            }}
                                            style={{
                                                width: isInIframe ? '140px' : '190px',
                                                color: 'white',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                fontSize: '14px',
                                                padding: '4px 24px 4px 0',
                                                caretColor: 'white',
                                            }}
                                            className="placeholder-white/60"
                                        />
                                        {searchValue && (
                                            <CloseOutlined
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleClear();
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    color: 'rgba(255, 255, 255, 0.6)',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    padding: '4px'
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div ref={hamburgerMenuRef} style={{ position: 'relative', marginLeft: '8px' }}>
                                    <div
                                        onClick={() => {
                                            const newState = !isHamburgerMenuOpen;
                                            setIsHamburgerMenuOpen(newState);

                                            if (isInIframe) {
                                                window.parent.postMessage({
                                                    type: 'HAMBURGER_MENU',
                                                    isOpen: newState,
                                                    content: {
                                                        station: params.get("station") ?? 1,
                                                        companyName: companyData?.name || 'Company Name',
                                                        userName: user?.user?.name || user?.user?.email || 'User Name'
                                                    }
                                                }, '*');
                                            }
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: isHamburgerMenuOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                            position: 'relative',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isHamburgerMenuOpen) {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isHamburgerMenuOpen) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <GiHamburgerMenu
                                            style={{
                                                color: 'white',
                                                fontSize: '20px',
                                                transition: 'transform 0.2s ease',
                                                transform: isHamburgerMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            borderRadius: '10px',
                                            minWidth: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 4px',
                                            border: '2px solid #3b5998',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}>
                                            {params.get("station") ?? 1}
                                        </div>
                                    </div>

                                    {/* Dropdown Menu */}
                                    {isHamburgerMenuOpen && !isInIframe && (
                                        <div style={{
                                            position: 'fixed',
                                            top: `${hamburgerPosition.top}px`,
                                            right: `${hamburgerPosition.right}px`,
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                            minWidth: '280px',
                                            zIndex: 2147483647,
                                            overflow: 'hidden',
                                            border: '1px solid #e5e7eb',
                                            animation: 'slideDown 0.2s ease-out'
                                        }}>
                                            {/* Station Number */}
                                            <div style={{
                                                padding: '16px 20px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#f8fafc'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#3b5998',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <HiOutlineOfficeBuilding style={{ color: 'white', fontSize: '20px' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: '#6b7280',
                                                            fontWeight: '500',
                                                            marginBottom: '2px',
                                                            textTransform: 'uppercase'
                                                        }}>Station</div>
                                                        <div style={{
                                                            fontSize: '15px',
                                                            fontWeight: '600',
                                                            color: '#1f2937',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}> <StationPicker /></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Company Name */}
                                            <div style={{
                                                padding: '16px 20px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#f8fafc'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#3b5998',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <HiOutlineOfficeBuilding style={{ color: 'white', fontSize: '20px' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: '#6b7280',
                                                            fontWeight: '500',
                                                            marginBottom: '2px',
                                                            textTransform: 'uppercase'
                                                        }}>Company</div>
                                                        <div style={{
                                                            fontSize: '15px',
                                                            fontWeight: '600',
                                                            color: '#1f2937',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>{companyData?.name || 'Company Name'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* User Name */}
                                            <div style={{
                                                padding: '16px 20px',
                                                borderBottom: '1px solid #f0f0f0'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#e8eef7',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <HiOutlineUser style={{ color: '#3b5998', fontSize: '20px' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: '#6b7280',
                                                            fontWeight: '500',
                                                            marginBottom: '2px',
                                                            textTransform: 'uppercase'
                                                        }}>User</div>
                                                        <div style={{
                                                            fontSize: '15px',
                                                            fontWeight: '600',
                                                            color: '#1f2937',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>{user?.user?.name || user?.user?.email || 'User Name'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Buttons */}
                                            <div style={{ padding: '8px' }}>
                                                <button
                                                    onClick={() => {
                                                        setIsHamburgerMenuOpen(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px 16px',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        color: '#374151',
                                                        marginBottom: '4px'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#fef3c7',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <RiLockPasswordLine style={{ color: '#d97706', fontSize: '18px' }} />
                                                    </div>
                                                    <span>Change Password</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        handleLogout();
                                                        setIsHamburgerMenuOpen(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px 16px',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        color: '#dc2626'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#fee2e2',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <RiLogoutBoxLine style={{ color: '#dc2626', fontSize: '18px' }} />
                                                    </div>
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
                {isDropdownVisible && (
                    <div
                        style={{
                            position: 'fixed', // Always fixed
                            top: `${dropdownPosition.top}px`,
                            right: `${dropdownPosition.right}px`,
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            zIndex: 2147483647,
                            border: '1px solid #e5e7eb',
                            minWidth: `${dropdownPosition.width}px`
                        }}
                    >
                        {isLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center' }}>
                                <Spin />
                            </div>
                        ) : filteredTemplates.length > 0 ? (
                            <List
                                dataSource={filteredTemplates}
                                renderItem={(template) => {
                                    const config = templateConfig[template.type];

                                    return (
                                        <List.Item
                                            style={{
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div
                                                style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleTemplateSelect(template);
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={
                                                        <div style={{
                                                            fontSize: '24px',
                                                            color: config.color,
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}>
                                                            {config.icon}
                                                        </div>
                                                    }
                                                    title={
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span>{template.tag}</span>
                                                            {!template.availableInSelectedLang && (
                                                                <Tag color="orange" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                                                                    {companyData?.defaultLangCode?.toUpperCase() || 'EN'}
                                                                </Tag>
                                                            )}
                                                        </div>
                                                    }
                                                />
                                            </div>
                                            {template.type !== "slideshow" && template.type !== "text" && (
                                                <div
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleQRCodeClick(template);
                                                    }}
                                                    style={{
                                                        fontSize: '20px',
                                                        color: '#3b5998',
                                                        cursor: 'pointer',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#e8eef7';
                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    <IoQrCode />
                                                </div>
                                            )}
                                        </List.Item>
                                    );
                                }}
                            />
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No templates found"
                                style={{ padding: '20px' }}
                            />
                        )}
                    </div>
                )}
            </div>
            {/* Drawers remain the same */}
            <Drawer
                title={
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <SettingOutlined className="text-white text-lg" />
                            <span className="text-lg font-semibold text-white">Settings</span>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined className="text-white" />}
                            onClick={closeDrawer}
                            className="border-none shadow-none hover:bg-white/20 rounded-lg"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                }
                placement="top"
                closable={false}
                onClose={closeDrawer}
                open={drawerOpen}
                height="auto"
                className="block lg:hidden"
                bodyStyle={{
                    padding: '24px',
                    backgroundColor: '#f8fafc',
                    minHeight: 'calc(100vh - 120px)'
                }}
                headerStyle={{
                    backgroundColor: '#3b5998',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '16px 24px'
                }}
            >
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Language Settings</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block">Language Shortcut</label>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <LanguageShortcutPicker />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block">Language</label>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <HeaderLanguagePicker />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Template Settings</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600 block">Template Shortcut</label>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <TemplateShortcutPicker />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Station Settings</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600 block">Station</label>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <StationPicker />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 space-y-3">
                        <Button
                            type="primary"
                            onClick={closeDrawer}
                            className="w-full h-12 text-base font-semibold rounded-xl shadow-sm"
                            style={{
                                backgroundColor: '#3b5998',
                                borderColor: '#3b5998',
                                color: 'white'
                            }}
                        >
                            Apply Settings
                        </Button>
                        <Button
                            onClick={closeDrawer}
                            className="w-full h-12 text-base font-medium rounded-xl border-2 text-gray-600 hover:bg-gray-50"
                            style={{
                                borderColor: '#e5e7eb',
                                background: 'white'
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Drawer>

            {/* Shortcut Menu Drawer - Mobile */}
            <Drawer
                title={
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <MoreOutlined className="text-white text-lg" />
                            <span className="text-lg font-semibold text-white">Quick Actions</span>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined className="text-white" />}
                            onClick={closeShortcutMenu}
                            className="border-none shadow-none hover:bg-white/20 rounded-lg"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                }
                placement="right"
                closable={false}
                onClose={closeShortcutMenu}
                open={shortcutMenuOpen}
                width={300}
                className="block lg:hidden"
                bodyStyle={{
                    padding: '24px',
                    backgroundColor: '#f8fafc'
                }}
                headerStyle={{
                    backgroundColor: '#3b5998',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '16px 24px'
                }}
            >
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Template Search</h3>
                        <div ref={searchRef} style={{ position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    ref={inputRef}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    type="text"
                                    placeholder="ID# or Search Template"
                                    value={searchValue}
                                    onChange={handleSearchChange}
                                    onFocus={() => {
                                        if (justSelectedRef.current) return;
                                        if (searchValue.trim() && filteredTemplates.length > 0) {
                                            setIsDropdownVisible(true);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '8px 32px 8px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    className="focus:border-blue-500"
                                />
                                {searchValue && (
                                    <CloseOutlined
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleClear();
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            color: 'rgba(0, 0, 0, 0.45)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            padding: '4px'
                                        }}
                                    />
                                )}
                            </div>

                            {isDropdownVisible && (
                                <div
                                    style={{
                                        position: 'fixed', // Always fixed
                                        top: `${dropdownPosition.top}px`,
                                        right: `${hamburgerPosition.right}px`,
                                        left: 'auto',
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                        minWidth: '280px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        zIndex: 2147483647,
                                        border: '1px solid #e5e7eb',
                                        animation: 'slideDown 0.2s ease-out'
                                    }}
                                >
                                    {isLoading ? (
                                        <div style={{ padding: '20px', textAlign: 'center' }}>
                                            <Spin />
                                        </div>
                                    ) : filteredTemplates.length > 0 ? (
                                        <List
                                            dataSource={filteredTemplates}
                                            renderItem={(template) => {
                                                const config = templateConfig[template.type];
                                                return (
                                                    <List.Item
                                                        style={{
                                                            cursor: 'pointer',
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                    >
                                                        <div
                                                            style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleTemplateSelect(template);
                                                            }}
                                                        >
                                                            <List.Item.Meta
                                                                avatar={
                                                                    <div style={{
                                                                        fontSize: '24px',
                                                                        color: config.color,
                                                                        display: 'flex',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        {config.icon}
                                                                    </div>
                                                                }
                                                                title={
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span>{template.tag}</span>
                                                                        {!template.availableInSelectedLang && (
                                                                            <Tag color="orange" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                                                                                {companyData?.defaultLangCode?.toUpperCase() || 'EN'}
                                                                            </Tag>
                                                                        )}
                                                                    </div>
                                                                }
                                                            />
                                                        </div>
                                                        {template.type !== "slideshow" && template.type !== "texts" && (
                                                            <div
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleQRCodeClick(template);
                                                                }}
                                                                style={{
                                                                    fontSize: '20px',
                                                                    color: '#3b5998',
                                                                    cursor: 'pointer',
                                                                    padding: '8px',
                                                                    borderRadius: '6px',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = '#e8eef7';
                                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.transform = 'scale(1)';
                                                                }}
                                                            >
                                                                <IoQrCode />
                                                            </div>
                                                        )}
                                                    </List.Item>
                                                );
                                            }}
                                        />
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="No templates found"
                                            style={{ padding: '20px' }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h3>
                        <div className="flex gap-2">
                            <HeaderSurveyShortcut
                                confirmationNumber={confirmationNumber}
                                clearConfirmationNumber={clearConfirmationNumber}
                                checkTooltip={isInIframe}
                            />
                            <HeaderRecordingShortcut confirmationNumber={confirmationNumber} clearConfirmationNumber={clearConfirmationNumber} checkTooltip={isInIframe} />
                            <ChatBot />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Language Shortcut Picker</h3>
                        <LanguageShortcutPicker />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Language</h3>
                        <HeaderLanguagePicker />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Template Shortcut</h3>
                        <TemplateShortcutPicker />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Station Picker</h3>
                        <StationPicker />
                    </div>
                </div>
            </Drawer>
        </>
    );
};

export default ClientHeader;