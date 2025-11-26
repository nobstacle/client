'use client';
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
console.info("fff",isSAdmin)
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

    const showDrawer = () => setDrawerOpen(true);
    const closeDrawer = () => setDrawerOpen(false);
    const showShortcutMenu = () => setShortcutMenuOpen(true);
    const closeShortcutMenu = () => setShortcutMenuOpen(false);

    const handleConfirmationNumberChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setConfirmationNumber(e.target.value);
        },
        []
    );

    const clearConfirmationNumber = useCallback(() => {
        setConfirmationNumber("");
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

    return (
        <>
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
            <nav className="h-20 w-full shadow-sm border-b border-gray-100 px-6 hidden lg:block"
                style={{ backgroundColor: '#3b5998' }}>
                <div className="flex h-full w-full items-center justify-between mx-auto">
                    <div className="flex items-center gap-6">
                        {!isSAdmin && (
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <LanguageShortcutPicker />
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <HeaderLanguagePicker />
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <TemplateShortcutPicker />
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSAdmin && (
                        <div className="flex items-center">
                            <div style={{ padding: '0.2rem' }}>
                                <HeaderSurveyShortcut
                                    confirmationNumber={confirmationNumber}
                                    clearConfirmationNumber={clearConfirmationNumber}
                                />
                            </div>
                            <div className="rounded-lg" style={{ padding: '0.2rem' }}>
                                <HeaderRecordingShortcut confirmationNumber={confirmationNumber} clearConfirmationNumber={clearConfirmationNumber} />
                            </div>
                            <div className="rounded-lg" style={{ padding: '0.2rem' }}>
                                <ChatBot />
                            </div>

                            {/* Template Search Input */}
                            <div ref={searchRef} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1" style={{
                                position: 'relative',
                                zIndex: 1000
                            }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="ID# or Search Template"
                                        value={searchValue}
                                        onChange={handleSearchChange}
                                        onFocus={() => {
                                            // Don't open if we just selected something
                                            if (justSelectedRef.current) {
                                                return;
                                            }
                                            if (searchValue.trim() && filteredTemplates.length > 0) {
                                                setIsDropdownVisible(true);
                                            }
                                        }}
                                        style={{
                                            width: '190px',
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

                                {isDropdownVisible && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            right: 0,
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            zIndex: 9999,
                                            border: '1px solid #e5e7eb',
                                            minWidth: '300px'
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
                    )}

                </div>
            </nav>

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
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Confirmation Number</h3>
                        <Input
                            placeholder="Enter confirmation number"
                            value={confirmationNumber}
                            onChange={handleConfirmationNumberChange}
                            size="large"
                            suffix={
                                confirmationNumber && (
                                    <CloseOutlined
                                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={clearConfirmationNumber}
                                    />
                                )
                            }
                        />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h3>
                        <div className="flex gap-2">
                            <HeaderSurveyShortcut
                                confirmationNumber={confirmationNumber}
                                clearConfirmationNumber={clearConfirmationNumber}
                            />
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