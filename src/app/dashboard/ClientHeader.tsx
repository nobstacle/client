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
    IoSpeedometer,
    IoDocumentText,
    IoWallet,
    IoPeople,
    IoSettings
} from 'react-icons/io5';

const ClientHeader = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [shortcutMenuOpen, setShortcutMenuOpen] = useState(false);
    const [confirmationNumber, setConfirmationNumber] = useState("");
    const [searchValue, setSearchValue] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const searchRef = useRef(null);
    const inputRef = useRef(null); // Add ref for input
    const params = useSearchParams();
    const { emitSendTemplate, socketConnected } = useSocketContext();
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const confirmationTimeoutRef = useRef(null); // Ref to store timeout

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

        if (textTemplates) {
            textTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'text',
                        content: template.content,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (imageTemplates) {
            imageTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'image',
                        url: template.url,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (videoTemplates) {
            videoTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'video',
                        url: template.url,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (websiteTemplates) {
            websiteTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'website',
                        url: template.url,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (slideshowTemplates) {
            slideshowTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'slideshow',
                        urls: template.url,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (mapTemplates) {
            mapTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'map',
                        origin: template.origin,
                        destination: template.destination,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        if (documentTemplates) {
            documentTemplates.forEach(template => {
                if (template.langCode?.includes(selectedLang)) {
                    combined.push({
                        id: template.id,
                        tag: template.tag,
                        type: 'document',
                        url: template.url,
                        langCode: template.langCode,
                        order: template.order,
                        templateData: template
                    });
                }
            });
        }

        combined.sort((a, b) => (a.order || 999) - (b.order || 999));
        return combined;
    }, [
        textTemplates,
        imageTemplates,
        videoTemplates,
        websiteTemplates,
        slideshowTemplates,
        mapTemplates,
        documentTemplates,
        selectedLang
    ]);

    // Separate debounce effect for search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchValue(debouncedSearch);
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearch]);

    // Separate effect for confirmation number that doesn't interfere with input
    useEffect(() => {
        // Clear previous timeout
        if (confirmationTimeoutRef.current) {
            clearTimeout(confirmationTimeoutRef.current);
        }

        // Set new timeout
        confirmationTimeoutRef.current = setTimeout(() => {
            const isNumeric = /^\d+$/.test(searchValue);

            if (isNumeric && searchValue) {
                setConfirmationNumber(searchValue);
            } else if (!searchValue) {
                setConfirmationNumber("");
            }
        }, 1000);

        return () => {
            if (confirmationTimeoutRef.current) {
                clearTimeout(confirmationTimeoutRef.current);
            }
        };
    }, [searchValue]);

    // Filter templates based on search
    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setFilteredTemplates([]);
            setIsDropdownVisible(false);
            return;
        }

        const searchLower = debouncedSearch.toLowerCase().trim();
        const filtered = allTemplates.filter(template =>
            template.tag.toLowerCase().includes(searchLower)
        );

        setFilteredTemplates(filtered);
        setIsDropdownVisible(filtered.length > 0);
    }, [debouncedSearch, allTemplates]);

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
        // Set the selected template tag in the input
        setDebouncedSearch(template.tag);
        setSearchValue(template.tag);

        if (!socketConnected) {
            message.warning('Connection not ready, please try again in a moment');
            return;
        }

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
            refId: template?.id,
            langCode: params.get("lang") || companyData?.defaultLangCode || "en",
            refType: contentType,
            station: Number(params.get("station") ?? 1),
            contentExtra: template?.templateData?.ext,
        });

        // Close dropdown after selection
        setIsDropdownVisible(false);
    }, [socketConnected, emitSendTemplate, params, companyData]);

    const handleClear = useCallback(() => {
        setSearchValue('');
        setDebouncedSearch('');
        setFilteredTemplates([]);
        setIsDropdownVisible(false);
        setConfirmationNumber("");
    }, []);

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setDebouncedSearch(value);

        // Ensure input keeps focus
        if (inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

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
                </nav>
            </div>

            {/* Desktop Header */}
            <nav className="h-20 w-full shadow-sm border-b border-gray-100 px-6 hidden lg:block"
                style={{ backgroundColor: '#3b5998' }}>
                <div className="flex h-full w-full items-center justify-between mx-auto">
                    <div className="flex items-center gap-6">
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
                    </div>

                    <div className="flex items-center">
                        <div style={{ padding: '0.2rem' }}>
                            <HeaderSurveyShortcut
                                confirmationNumber={confirmationNumber}
                                clearConfirmationNumber={clearConfirmationNumber}
                            />
                        </div>
                        <div className="rounded-lg" style={{ padding: '0.2rem' }}>
                            <ChatBot />
                        </div>
                        {/* Template Search Input */}
                        <div ref={searchRef} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1" style={{
                            position: 'relative',
                            zIndex: 1000
                        }}>
                            <Input
                                ref={inputRef}
                                placeholder="ID# or Search Template"
                                value={debouncedSearch}
                                onChange={handleSearchChange}
                                onFocus={() => debouncedSearch && setIsDropdownVisible(true)}
                                suffix={
                                    searchValue ? (
                                        <CloseOutlined
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleClear();
                                            }}
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        />
                                    ) : null
                                }
                                className="bg-transparent border-none text-white placeholder-white/60 customInputBox"
                                style={{
                                    width: '190px',
                                    color: 'white',
                                }}
                            />

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
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleTemplateSelect(template);
                                                        }}
                                                        style={{
                                                            cursor: 'pointer',
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
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
                                                                </div>
                                                            }
                                                        />
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