'use client';
// import ReactDOM from 'react-dom';
import { useCallback, useEffect, useRef, useMemo } from "react";

declare global {
    interface Window {
        chrome?: {
            storage?: {
                local: {
                    get: (keys: string[], callback: (result: Record<string, unknown>) => void) => void;
                    set: (items: Record<string, unknown>, callback?: () => void) => void;
                };
            };
        };
    }
}

const isChromeExtension = (): boolean => {
    return typeof window !== 'undefined' &&
        typeof (window as any).chrome !== 'undefined' &&
        typeof (window as any).chrome.storage !== 'undefined';
};

import { useState } from "react";
import { Drawer, Button, List, Tag, Spin, Empty, message } from "antd";
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
import { useMessageStore } from "../../lib/zustand/store/messageStore";
import { useUploadControllerUploadSpeechToTextFile } from '../../lib/client/api';
import { IoChatbubbleEllipses } from "react-icons/io5";
import { SendPackagePayloadType } from "../../constant/types";
import { useSession } from "next-auth/react";

interface ClientHeaderProps {
    user: Session | null;
}
interface Category {
    id: number;
    name: string;
    priceLevel: number;
    taxPercentage: string;
    soldOut: boolean;
    images: string[];
    signedImages: Array<{
        url: string;
        signedUrl: string;
    }>;
    packageCounts: {
        packages: number;
        fromCategoryPackages: number;
        toCategoryPackages: number;
        totalPackages: number;
    };
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
    const { emitSendTemplate, emitSendPackages, socketConnected } = useSocketContext();
    const debounceTimerRef = useRef(null);
    const confirmationTimerRef = useRef(null);
    const justSelectedRef = useRef(false);
    const isSAdmin = user?.user.Roles?.includes("SAdmin");
    const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
    const hamburgerMenuRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, width: 0 });
    const [hamburgerPosition, setHamburgerPosition] = useState({ top: 0, right: 0 });
    const [isInIframe, setIsInIframe] = useState(false);
    const messageStore = useMessageStore();
    const { emitSendMessage, emitClearMessage, emitLeaveChat } = useSocketContext();
    const speechToTextMutation = useUploadControllerUploadSpeechToTextFile();
    const [allPackages, setAllPackages] = useState([]);
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { data } = useSession();
    const [selectedCategoryForUpsell, setSelectedCategoryForUpsell] = useState<number | null>(null);
    const [selectedCategories, setSelectedCategories] = useState(null);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [categoriesData, setCategoriesData] = useState([]);
    const [categoriesFetched, setCategoriesFetched] = useState(false);

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

    useEffect(() => {
        // Prefetch categories on mount
        if (data?.user?.backendTokens?.at && !categoriesFetched) {
            fetchCategories();
        }
    }, [data?.user?.backendTokens?.at, categoriesFetched]);

    useEffect(() => {
      const STATION_STORAGE_KEY = 'nobstacle_selected_station';
      
      // On mount, check if we have a saved station
      const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
      const currentStation = params.get("station");
      
      if (savedStation && !currentStation) {
        // We have a saved station but no URL param - restore it
        console.log('[ClientHeader] Restoring saved station:', savedStation);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('station', savedStation);
        window.history.replaceState({}, '', currentUrl.toString());
        
        // Trigger router update
        const popStateEvent = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popStateEvent);
      } else if (currentStation && savedStation !== currentStation) {
        // URL has station but storage doesn't match - sync it
        localStorage.setItem(STATION_STORAGE_KEY, currentStation);
        console.log('[ClientHeader] Synced station to storage:', currentStation);
      }
    }, []);

    useEffect(() => {
        if (isChromeExtension()) {
            (window as any).chrome.storage.local.get(['selectedStation'], (result: any) => {
                if (result.selectedStation) {
                    const savedStation = result.selectedStation;
                    const currentStation = params.get("station");

                    // If URL doesn't have station or is different, update it
                    if (!currentStation || currentStation !== String(savedStation)) {
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('station', String(savedStation));
                        window.history.replaceState({}, '', currentUrl.toString());

                        console.log('[ClientHeader] Restored saved station:', savedStation);
                    }
                }
            });
        }
    }, []);

    useEffect(() => {
        const fetchPackages = async () => {
            if (allPackages.length > 0) return;

            try {
                const response = await fetch(`${Url}/api/v1/uploads/get-all-packages?limit=9999`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                        'Cache-Control': 'no-cache'
                    },
                });
                if (response.ok) {
                    const packageData = await response.json();
                    const filterPackages = packageData.data?.filter((item) => {
                        return item?.active === true
                    });
                    setAllPackages(filterPackages);
                }
            } catch (error) {
                console.error('Error fetching packages:', error);
            }
        };

        if (data?.user?.backendTokens?.at && allPackages.length === 0) {
            fetchPackages();
        }
    }, [data?.user?.backendTokens?.at, allPackages.length, Url]);

    const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

    useEffect(() => {
  // Only run in iframe mode
  if (!isInIframe) return;

  // Listen for INITIAL_STATION from content script
  const handleInitialStation = (event: MessageEvent) => {
    if (event.data.type === 'INITIAL_STATION') {
      const savedStation = String(event.data.station);
      console.log('[ClientHeader] Received INITIAL_STATION:', savedStation);
      
      const currentStation = params.get("station");
      
      // Only update if different or missing
      if (!currentStation || currentStation !== savedStation) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('station', savedStation);
        window.history.replaceState({}, '', currentUrl.toString());
        
        // Trigger a router update
        const popStateEvent = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popStateEvent);
        
        console.log('[ClientHeader] ✓ Applied initial station:', savedStation);
      }
    }
  };

  window.addEventListener('message', handleInitialStation);
  return () => window.removeEventListener('message', handleInitialStation);
}, [isInIframe, params]);

    const fetchCategories = async () => {
        if (categoriesFetched && categoriesData.length > 0) {
            return categoriesData;
        }

        try {
            const response = await fetch(`${Url}/api/v1/uploads/get-all-categories?fetchAll=true&limit=100`, {
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Cache-Control': 'no-cache'
                },
            });
            if (response.ok) {
                const json = await response.json();
                const categories = json.data || json;

                setCategoriesData(categories);
                setCategoriesFetched(true);
                return categories;
            } else {
                return [];
            }
        } catch (error) {
            return [];
        }
    };

    const showCategoryDropdown = () => {

        if (isInIframe) {
            window.parent.postMessage({
                type: 'CATEGORIES_DATA',
                categories: categoriesData
            }, '*');
        } else {
            window.parent.postMessage({
                type: 'CATEGORIES_DATA',
                categories: categoriesData
            }, '*');
        }
    };

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
        text: { icon: <IoChatbubbleEllipses />, color: '#3b5998', label: 'Text' },
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

        if (searchValue === '/') {
            setIsDropdownVisible(true);
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

    const openQuickActions = () => {
        setShortcutMenuOpen(true);
    }

    const closeQuickActions = () => setShortcutMenuOpen(false);

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
        let contentExtra = templateToSend?.ext;

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
            // For map templates, we need to send both origin and destination
            contentExtra = JSON.stringify({
                origin: templateToSend?.origin || '',
                destination: templateToSend?.destination || ''
            });
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
            contentExtra: contentExtra,
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

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearchValue(value);

        if (value === '/') {
            if (categoriesData.length === 0 && !categoriesFetched) {
                fetchCategories().then(categories => {
                    if (categories.length > 0) {
                        setFilteredTemplates([]);

                        window.parent.postMessage({
                            type: 'CATEGORIES_DATA',
                            categories: categories
                        }, '*');
                    } else {
                        message.warning('No categories found.');
                    }
                });
            } else if (categoriesData.length > 0) {
                setFilteredTemplates([]);
                window.parent.postMessage({
                    type: 'CATEGORIES_DATA',
                    categories: categoriesData
                }, '*');
            }
        }
    }, [categoriesData, categoriesFetched, fetchCategories]);

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

    useEffect(() => {
        if (isHamburgerMenuOpen && isInIframe) {
            // Generate fresh station picker HTML with current stationCount
            const currentStation = params.get("station") ?? "1";
            const stationCount = companyData?.stationCount || 10;

            const stationOptions = Array(stationCount)
                .fill(1)
                .map((x, y) => x + y)
                .map(num => `
            <option value="${num}" ${num == currentStation ? 'selected' : ''}>
                Station ${num}
            </option>
        `)
                .join('');

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
            >
                ${stationOptions}
            </select>
        </div>
    `;

            window.parent.postMessage({
                type: 'HAMBURGER_MENU',
                isOpen: true,
                content: {
                    station: params.get("station") ?? 1,
                    companyName: companyData?.name || 'Company Name',
                    userName: user?.user?.name || user?.user?.email || 'User Name',
                    stationPickerHTML: stationPickerHTML
                }
            }, '*');
        } else if (!isHamburgerMenuOpen && isInIframe) {
            window.parent.postMessage({
                type: 'HAMBURGER_MENU',
                isOpen: false
            }, '*');
        }
    }, [isHamburgerMenuOpen, params, companyData, user, isInIframe]);

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
        let contentExtra = templateToSend?.ext;

        if (template?.type === 'image') {
            contentType = ChatType.Image;
        } else if (template?.type === 'video') {
            contentType = ChatType.Video;
        } else if (template?.type === 'website') {
            contentType = ChatType.Website;
        } else if (template?.type === 'slideshow') {
            contentType = ChatType.Slideshow;
        } else if (template?.type === 'map') {
            contentType = 'MapTemplateQr';
            contentExtra = JSON.stringify({
                origin: templateToSend?.origin || '',
                destination: templateToSend?.destination || ''
            });
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
            contentExtra: contentExtra,
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

    const generateSearchDropdownHTML = useCallback((templates, categories, isLoading, searchVal) => {
        if (isLoading) {
            return `
            <div style="padding: 20px; text-align: center;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3b5998; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        }

        if (searchVal === '/' && categories.length > 0) {
            return `
            <div style="padding: 12px 16px; border-bottom: 2px solid #3b5998; background: #f8fafc; position: sticky; top: 0; z-index: 1;">
                <div style="font-weight: 600; font-size: 14px; color: #1f2937;">
                    Select Category for Upsell
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                    Click to send room upgrade packages
                </div>
            </div>
            ${categories.map(category => `
                <div 
                    class="category-item"
                    data-category-id="${category.id}"
                    style="
                        cursor: pointer;
                        padding: 12px 16px;
                        border-bottom: 1px solid #f0f0f0;
                        transition: background-color 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    "
                    onmouseover="this.style.backgroundColor='#f5f5f5'"
                    onmouseout="this.style.backgroundColor='white'"
                >
                    <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
                        ${category.signedImages?.[0]?.signedUrl ? `
                            <img 
                                src="${category.signedImages[0].signedUrl}" 
                                alt="${category.name}"
                                style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;"
                            />
                        ` : `
                            <div style="
                                width: 40px;
                                height: 40px;
                                border-radius: 8px;
                                background-color: #3b5998;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 18px;
                                font-weight: bold;
                            ">
                                ${category.name.charAt(0).toUpperCase()}
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: 500; font-size: 14px; color: #1f2937;">
                                ${category.name}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                                Level ${category.priceLevel} • ${category.packageCounts.totalPackages} packages
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
        }


        if (templates.length === 0) {
            return `
            <div style="padding: 20px; text-align: center; color: #999;">
                <svg style="width: 48px; height: 48px; margin: 0 auto 12px; color: #e5e7eb;" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <div style="font-size: 14px; color: #666;">No templates found</div>
            </div>
        `;
        }


        const templateIcons = {
            // IoChatbubbleEllipses - Text icon
            text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" style="width: 24px; height: 24px;">
  <path d="M256 32C132.3 32 32 115.6 32 218.7c0 57.4 32.2 108.6 82.6 143.2L96 480l120.4-67.6c12.6 1.7 25.5 2.6 39.6 2.6 123.7 0 224-83.6 224-186.7S379.7 32 256 32z"/>
  <circle cx="176" cy="224" r="24" fill="#fff"/>
  <circle cx="256" cy="224" r="24" fill="#fff"/>
  <circle cx="336" cy="224" r="24" fill="#fff"/>
</svg>`,

            // IoImage - Image icon
            image: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M416 64H96a64.07 64.07 0 00-64 64v256a64.07 64.07 0 0064 64h320a64.07 64.07 0 0064-64V128a64.07 64.07 0 00-64-64zm-80 64a48 48 0 11-48 48 48.05 48.05 0 0148-48zM96 416a32 32 0 01-32-32v-67.63l94.84-84.3a48.06 48.06 0 0165.8 1.9l64.95 64.81L172.37 416zm352-32a32 32 0 01-32 32H217.63l121.42-121.42a47.72 47.72 0 0161.64-.16L448 333.84z"/>
  </svg>`,

            // IoPlay - Video icon
            video: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16z"/>
  </svg>`,

            // IoGlobe - Website icon
            website: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
    <path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
    <path d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34M394.67 394.67c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
    <path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M256 48v416M464 256H48"/>
  </svg>`,

            // IoImages - Slideshow icon
            slideshow: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M450.29 112H142c-34 0-62 27.51-62 61.33v245.34c0 33.82 28 61.33 62 61.33h308.29c34 0 61.71-27.51 61.71-61.33V173.33c0-33.82-27.68-61.33-61.71-61.33zm-77.15 61.34a46 46 0 11-46.28 46 46.19 46.19 0 0146.28-46.01zm-231.55 276c-17 0-29.86-13.75-29.86-30.66v-64.83l90.46-80.79a46.54 46.54 0 0163.44 1.83L328.27 337l-112 112.33zM480 418.67a30.67 30.67 0 01-30.71 30.66H259L376.08 333a46.24 46.24 0 0159.44-.16L480 370.59z"/>
    <path d="M384 32H64A64 64 0 000 96v256a64.11 64.11 0 0048 62V152a72 72 0 0172-72h326a64.11 64.11 0 00-62-48z"/>
  </svg>`,

            // IoMap - Map icon
            map: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M48.17 113.34A32 32 0 0032 141.24V438a32 32 0 0047 28.37c.43-.23.85-.47 1.26-.74l84.14-55.05a8 8 0 003.63-6.72V46.45a8 8 0 00-12.51-6.63zM212.36 39.31a8 8 0 00-8.42.15L171 58.55a8 8 0 00-3 6.78v357.51a8 8 0 0011.58 7.15 183.28 183.28 0 0140.43-17.16 8 8 0 004.99-7.42V46.45a8 8 0 00-12.64-6.63zM464.53 46.47a31.64 31.64 0 00-31.5-.88 201.48 201.48 0 01-70.55 14.77 201.32 201.32 0 01-70.68-12.87 8 8 0 00-11.8 7.14v358.12a8 8 0 004.52 7.21A183.87 183.87 0 01345 436a177.06 177.06 0 0171-15.29q5.14 0 10.13.32a31.62 31.62 0 0038.38-30.81V76.92a32 32 0 00-16.98-30.45z"/>
  </svg>`,

            // IoDocuments - Document icon
            document: `<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 512 512">
    <path d="M298.39 248a4 4 0 002.86-6.8l-78.4-79.72a4 4 0 00-6.85 2.81V236a12 12 0 0012 12z"/>
    <path d="M197 267a43.67 43.67 0 01-13-31v-92h-72a64.19 64.19 0 00-64 64v224a64 64 0 0064 64h144a64 64 0 0064-64V280h-92a43.61 43.61 0 01-31-13zm175-147h70.39a4 4 0 002.86-6.8l-78.4-79.72a4 4 0 00-6.85 2.81V108a12 12 0 0012 12z"/>
    <path d="M372 152a44.34 44.34 0 01-44-44V16H220a60.07 60.07 0 00-60 60v36h42.12A40.81 40.81 0 01231 124.14l109.16 111a41.11 41.11 0 0111.83 29V400h53.05c32.51 0 58.95-26.92 58.95-60V152z"/>
  </svg>`
        };

        // QR Code icon (IoQrCode)
        const qrIcon = `<svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 512 512">
  <rect x="336" y="336" width="80" height="80" rx="8" ry="8"/>
  <rect x="272" y="272" width="64" height="64" rx="8" ry="8"/>
  <rect x="416" y="416" width="64" height="64" rx="8" ry="8"/>
  <rect x="432" y="272" width="48" height="48" rx="8" ry="8"/>
  <rect x="272" y="432" width="48" height="48" rx="8" ry="8"/>
  <rect x="336" y="96" width="80" height="80" rx="8" ry="8"/>
  <rect x="288" y="48" width="176" height="176" rx="16" ry="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
  <rect x="96" y="96" width="80" height="80" rx="8" ry="8"/>
  <rect x="48" y="48" width="176" height="176" rx="16" ry="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
  <rect x="96" y="336" width="80" height="80" rx="8" ry="8"/>
  <rect x="48" y="288" width="176" height="176" rx="16" ry="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
</svg>`;

        return templates.map(template => {
            const icon = templateIcons[template.type] || templateIcons.text;
            const showQR = template.type !== "slideshow" && template.type !== "text";
            const langTag = !template.availableInSelectedLang
                ? `<span style="display: inline-block; background: #ff9800; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${companyData?.defaultLangCode?.toUpperCase() || 'EN'}</span>`
                : '';

            return `
            <div style="
                cursor: pointer;
                padding: 12px 16px;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                justify-content: space-between;
            "
            onmouseover="this.style.backgroundColor='#f5f5f5'"
            onmouseout="this.style.backgroundColor='white'"
            >
                <div style="flex: 1; display: flex; align-items: center; gap: 12px;" data-template-id="${template.id}" data-is-qr="false">
                    <div style="color: #3b5998; display: flex; align-items: center;">
                        ${icon}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #1f2937; font-size: 14px;">
                            ${template.tag}${langTag}
                        </div>
                    </div>
                </div>
                ${showQR ? `
                    <div 
                        data-template-id="${template.id}"
                        data-is-qr="true"
                        style="
                            color: #3b5998;
                            padding: 8px;
                            border-radius: 6px;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        "
                        onmouseover="this.style.backgroundColor='#e8eef7'; this.style.transform='scale(1.1)'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.transform='scale(1)'"
                    >
                        ${qrIcon}
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');
    }, [companyData]);

    useEffect(() => {
        if (isDropdownVisible && isInIframe) {
            const rect = searchRef.current?.getBoundingClientRect();
            if (rect) {
                const html = generateSearchDropdownHTML(filteredTemplates, categoriesData, isLoading, searchValue);

                window.parent.postMessage({
                    type: 'SEARCH_DROPDOWN',
                    isOpen: true,
                    content: {
                        html: html,
                        position: {
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                            width: Math.max(300, rect.width)
                        }
                    }
                }, '*');
            }
        } else if (!isDropdownVisible && isInIframe) {
            window.parent.postMessage({
                type: 'SEARCH_DROPDOWN',
                isOpen: false
            }, '*');
        }

        // Update local dropdown position for non-iframe
        if (isDropdownVisible && !isInIframe && searchRef.current) {
            const rect = searchRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
                width: Math.max(300, rect.width)
            });
        }
    }, [isDropdownVisible, filteredTemplates, isLoading, isInIframe, generateSearchDropdownHTML]);

    const updateChatPopupMessages = useCallback(() => {
        if (!isInIframe) return;

        const userRole = user?.user?.Roles?.[0];
        const currentUserDefaultLang = companyData?.defaultLangCode || 'en';

        // Get messages for current station
        const stationMessages = messageStore.receivedMessage.filter(
            (msg) => msg.station === Number(params.get("station") ?? 1)
        );

        // Helper to determine if message is from current user
        const isCurrentUserMessage = (messageRole: string) => {
            return messageRole === userRole;
        };

        useEffect(() => {
            if (isInIframe && messageStore.receivedMessage.length > 0) {
                updateChatPopupMessages();
            }
        }, [messageStore.receivedMessage.length, isInIframe, updateChatPopupMessages]);

        // Helper to get display message based on role
        const getDisplayMessage = (messageObj) => {
            const { message, originalMessage, role } = messageObj;

            if (userRole === 'Admin') {
                if (role === 'Admin') {
                    return originalMessage || message;
                } else {
                    return message;
                }
            } else {
                if (role === 'User') {
                    return originalMessage || message;
                } else {
                    return message;
                }
            }
        };

        // Generate messages HTML
        const messagesHTML = stationMessages.length === 0 ? `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px;">
      No messages yet. Start a conversation!
    </div>
  ` : stationMessages.map(messageObj => {
            const isRight = isCurrentUserMessage(messageObj.role);
            const displayMessage = getDisplayMessage(messageObj);

            return `
      <div style="display: flex; justify-content: ${isRight ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
        <div style="
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          background: ${isRight ? '#3b5998' : '#f3f4f6'};
          color: ${isRight ? 'white' : '#1f2937'};
          word-wrap: break-word;
        ">
          <div style="font-size: 14px; line-height: 1.5;">
            ${displayMessage}
          </div>
          ${messageObj.originalMessage && messageObj.originalMessage !== displayMessage ? `
            <div style="
              font-size: 12px;
              opacity: 0.7;
              font-style: italic;
              border-top: ${isRight ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'};
              padding-top: 6px;
              margin-top: 6px;
            ">
              Original: ${messageObj.originalMessage}
            </div>
          ` : ''}
        </div>
      </div>
    `;
        }).join('');

        // Send update to parent
        window.parent.postMessage({
            type: 'CHAT_UPDATE_MESSAGES',
            html: messagesHTML
        }, '*');
    }, [isInIframe, messageStore.receivedMessage, params, user, companyData]);

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
                const currentStation = params.get("station") ?? "1";
                const stationCount = companyData?.stationCount || 10;

                const stationOptions = Array(stationCount)
                    .fill(1)
                    .map((x, y) => x + y)
                    .map(num => `
                    <option value="${num}" ${num == currentStation ? 'selected' : ''}>
                        Station ${num}
                    </option>
                `)
                    .join('');

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
                    >
                        ${stationOptions}
                    </select>
                </div>
            `;

                window.parent.postMessage({
                    type: 'STATION_PICKER_HTML',
                    html: stationPickerHTML
                }, '*');
            }

            if (event.data.type === 'STATION_CHANGE') {
                const newStation = String(event.data.station);
                
                // Save to localStorage
                localStorage.setItem('nobstacle_selected_station', newStation);
                console.log('[ClientHeader] ✓ Saved station to localStorage:', newStation);
                
                // Update URL params
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('station', newStation);
                window.history.pushState({}, '', currentUrl.toString());

                // Trigger events
                const stationEvent = new CustomEvent('stationChanged', {
                    detail: { station: newStation }
                });
                window.dispatchEvent(stationEvent);

                const popStateEvent = new PopStateEvent('popstate', { state: {} });
                window.dispatchEvent(popStateEvent);

                message.success(`Switched to Station ${newStation}`);
            }

            if (event.data.type === 'TEMPLATE_SELECT') {
                const template = filteredTemplates.find(t => t.id === parseInt(event.data.templateId));
                if (template) {
                    handleTemplateSelect(template);
                }
            }

            if (event.data.type === 'INITIAL_STATION') {
                const savedStation = String(event.data.station);
                console.log('[ClientHeader] Received initial station from extension:', savedStation);

                // Update URL if needed
                const currentStation = params.get("station");
                if (!currentStation || currentStation !== savedStation) {
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set('station', savedStation);
                    window.history.replaceState({}, '', currentUrl.toString());

                    // Trigger re-render
                    const stationEvent = new CustomEvent('stationChanged', {
                        detail: { station: savedStation }
                    });
                    window.dispatchEvent(stationEvent);
                }
            }

            if (event.data.type === 'TEMPLATE_QR_CLICK') {
                const template = filteredTemplates.find(t => t.id === parseInt(event.data.templateId));
                if (template) {
                    handleQRCodeClick(template);
                }
            }

            if (event.data.type === 'TEMPLATE_SHORTCUT_CLICK') {
                const { id, templateType, refType, tag } = event.data;

                const type = refType || templateType;

                let template;
                let contentExtra;

                if (type === 'Text' && textTemplates) {
                    template = textTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );

                    // Fallback to default language
                    if (!template && companyData?.defaultLangCode) {
                        template = textTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                    }
                } else if (type === 'Image' && imageTemplates) {
                    template = imageTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = template?.ext;

                    if (!template && companyData?.defaultLangCode) {
                        template = imageTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = template?.ext;
                    }
                } else if (type === 'Video' && videoTemplates) {
                    template = videoTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = template?.ext;

                    if (!template && companyData?.defaultLangCode) {
                        template = videoTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = template?.ext;
                    }
                } else if (type === 'Website' && websiteTemplates) {
                    template = websiteTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = template?.ext;

                    if (!template && companyData?.defaultLangCode) {
                        template = websiteTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = template?.ext;
                    }
                } else if (type === 'Slideshow' && slideshowTemplates) {
                    template = slideshowTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = template?.ext;

                    if (!template && companyData?.defaultLangCode) {
                        template = slideshowTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = template?.ext;
                    }
                } else if (type === 'Map' && mapTemplates) {
                    template = mapTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = JSON.stringify({
                        origin: template?.origin || '',
                        destination: template?.destination || ''
                    });

                    if (!template && companyData?.defaultLangCode) {
                        template = mapTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = JSON.stringify({
                            origin: template?.origin || '',
                            destination: template?.destination || ''
                        });
                    }
                } else if (type === 'Document' && documentTemplates) {
                    template = documentTemplates.find(t =>
                        t.tag === tag &&
                        t.langCode?.includes(selectedLang)
                    );
                    contentExtra = template?.ext;

                    if (!template && companyData?.defaultLangCode) {
                        template = documentTemplates.find(t =>
                            t.tag === tag &&
                            t.langCode?.includes(companyData.defaultLangCode)
                        );
                        contentExtra = template?.ext;
                    }
                }

                if (template && socketConnected) {
                    emitSendTemplate({
                        refId: template.id,
                        langCode: selectedLang,
                        refType: type,
                        station: Number(params.get("station") ?? 1),
                        contentExtra: contentExtra,
                    });

                }
            }

            if (event.data.type === 'SEARCH_DROPDOWN_CLOSED') {
                setIsDropdownVisible(false);
            }

            if (event.data.type === 'CHAT_SEND_MESSAGE') {
                const messageText = event.data.message;
                if (socketConnected) {
                    const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

                    emitSendMessage({
                        message: messageText,
                        station: Number(params.get("station") ?? 1),
                        refType: "ChatMessage",
                        langCode: selectedLang,
                    });
                } else {
                    console.error('[ClientHeader] Socket not connected');
                }
            }

            if (event.data.type === 'CHAT_CLEAR') {
                try {
                    // Clear the message store
                    messageStore.reset();
                    emitLeaveChat({
                        station: Number(params.get("station") ?? 1),
                    });
                    emitClearMessage({
                        station: Number(params.get("station") ?? 1),
                    });
                    window.parent.postMessage({
                        type: 'CHAT_CLEARED',
                        success: true
                    }, '*');

                } catch (error) {
                    console.error('[ClientHeader] Error clearing chat:', error);

                    window.parent.postMessage({
                        type: 'CHAT_CLEARED',
                        success: false,
                        error: error.message
                    }, '*');
                }
            }

            if (event.data.type === 'CHAT_POPUP_CLOSED') {
                console.log('[ClientHeader] Chat popup closed');
            }

            if (event.data.type === 'CLEAR_CHAT_MESSAGES') {
                messageStore.reset();

                // Update the popup to show empty state
                setTimeout(() => {
                    updateChatPopupMessages();
                }, 100);
            }

            if (event.data.type === 'CHAT_TOGGLE_RECORDING') {
                const iframeElement = document.getElementById('nobstacle-header-iframe') as HTMLIFrameElement;

                if (iframeElement && iframeElement.contentWindow) {
                    // Forward to iframe to trigger recording
                    iframeElement.contentWindow.postMessage({
                        type: 'CHAT_TOGGLE_RECORDING'
                    }, '*');

                } else {
                    console.error('[ClientHeader] ERROR: Header iframe not found or contentWindow not available');
                }
            }

            if (event.data.type === 'CHAT_RECORDING_RESULT') {
                window.parent.postMessage({
                    type: 'CHAT_RECORDING_RESULT',
                    text: event.data.text
                }, '*');
            }

            if (event.data.type === 'PROCESS_AUDIO') {
                try {
                    // Convert base64 back to blob
                    const base64Audio = event.data.audioData;
                    const mimeType = event.data.mimeType;

                    // Decode base64 to binary
                    const binaryString = atob(base64Audio);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    // Create blob from binary data
                    const audioBlob = new Blob([bytes], { type: mimeType });

                    // ALWAYS use English for speech recognition
                    const recognitionLangCode = "en";

                    // Call the speech-to-text API with English
                    speechToTextMutation.mutate(
                        {
                            data: {
                                file: audioBlob,
                                langCode: recognitionLangCode
                            }
                        },
                        {
                            onSuccess: (response) => {
                                // Send English transcription back
                                // Backend will handle translation based on selected language
                                window.parent.postMessage({
                                    type: 'AUDIO_TRANSCRIPTION',
                                    text: response.transcription
                                }, '*');
                            },
                            onError: (error) => {
                                console.error('[ClientHeader] Speech-to-text error:', error);
                                window.parent.postMessage({
                                    type: 'AUDIO_TRANSCRIPTION_ERROR',
                                    error: 'Failed to transcribe audio'
                                }, '*');
                            }
                        }
                    );
                } catch (error) {
                    console.error('[ClientHeader] Error processing audio:', error);
                    window.parent.postMessage({
                        type: 'AUDIO_TRANSCRIPTION_ERROR',
                        error: 'Failed to process audio data'
                    }, '*');
                }
            }

            if (event.data.type === 'SEND_UPSELL_PACKAGES') {
                const categoryId = event.data.categoryId ?? selectedCategories;

                const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

                // Filter packages by language requirements
                let filteredPackages = allPackages.filter((item) => {
                    return (
                        item?.packageNames?.[selectedLang] != null &&
                        item?.packageDescriptions?.[selectedLang] != null &&
                        item?.packageBenefits?.[selectedLang] != null &&
                        item?.packageTags?.[selectedLang] != null &&
                        item?.taxInformation?.[selectedLang] != null &&
                        item?.currencies?.[selectedLang] != null &&
                        item?.buttonTexts?.[selectedLang] != null &&
                        item?.packageAlerts?.[selectedLang] != null
                    );
                });

                // Filter by category if provided
                if (categoryId && categoryId !== null) {
                    const beforeCount = filteredPackages.length;

                    filteredPackages = filteredPackages.filter(pkg => {
                        // For room upgrades, check from_category_id
                        if (pkg.roomUpgrade === true) {
                            const matches = pkg.from_category_id === categoryId;
                            return matches;
                        }
                        return true;
                    });
                }

                // Also filter out selected packages if any
                if (selectedPackages && selectedPackages?.length > 0) {
                    filteredPackages = filteredPackages.filter(pkg =>
                        !selectedPackages.some(selected => selected.id === pkg.id)
                    );
                }

                if (filteredPackages.length > 0) {
                    emitSendPackages({
                        refId: filteredPackages[0].id,
                        langCode: selectedLang,
                        refType: "Packages",
                        station: Number(params.get("station") ?? 1),
                        sentBy: JSON.stringify(user),
                        contentExtra: JSON.stringify(filteredPackages)
                    } as SendPackagePayloadType, (response) => {
                        if (response && (response === true)) {
                            const categoryMsg = categoryId ? ' for selected category' : '';
                            message.success(`✓ Sent ${filteredPackages.length} packages${categoryMsg}`);
                        } else {
                            message.error("Failed to send packages");
                            console.error('[ClientHeader] ✗ Failed to send packages');
                        }
                    });
                } else {
                    const reason = categoryId
                        ? "No room upgrade packages available for the selected category"
                        : "No packages available for selected criteria";
                    message.warning(reason);
                }
            }

            if (event.data.type === 'CATEGORY_SELECT') {
                const categoryId = event.data.categoryId;
                const category = categoriesData?.find(c => c.id === categoryId);

                if (category) {
                    setSelectedCategories(categoryId);
                    setSearchValue('');
                    setIsDropdownVisible(false);

                    // Call your existing function
                    handleSendPackage(categoryId);

                    message.success(`Category "${category.name}" selected for upsell`);
                }
            }

            if (event.data.type === 'SHOW_CATEGORIES') {
                if (categoriesData.length === 0 && !categoriesFetched) {
                    fetchCategories().then(categories => {
                        if (categories.length > 0) {
                            window.parent.postMessage({
                                type: 'CATEGORIES_DATA',
                                categories: categories
                            }, '*');
                        }
                    });
                } else if (categoriesData.length > 0) {
                    window.parent.postMessage({
                        type: 'CATEGORIES_DATA',
                        categories: categoriesData
                    }, '*');
                }
            }

            if (event.data.type === 'REQUEST_CATEGORIES') {
                if (categoriesData.length === 0 && !categoriesFetched) {
                    fetchCategories().then(categories => {
                        window.parent.postMessage({
                            type: 'CATEGORIES_DATA',
                            categories: categories
                        }, '*');
                    });
                } else {
                    window.parent.postMessage({
                        type: 'CATEGORIES_DATA',
                        categories: categoriesData
                    }, '*');
                }
            }

        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [
        isInIframe,
        filteredTemplates,
        handleTemplateSelect,
        handleQRCodeClick,
        textTemplates,
        imageTemplates,
        videoTemplates,
        websiteTemplates,
        slideshowTemplates,
        mapTemplates,
        documentTemplates,
        selectedLang,
        socketConnected,
        emitSendTemplate,
        params,
        companyData,
        user,
        emitSendMessage,
        messageStore,
        updateChatPopupMessages,
        allPackages,
        selectedPackages,
        selectedCategories,
        selectedCategoryForUpsell,
    ]);

    const handleSendPackage = (categoryId: any) => {
        let filteredPackages = allPackages.filter((item) => {
            return (
                item?.packageNames?.[selectedLang] != null &&
                item?.packageDescriptions?.[selectedLang] != null &&
                item?.packageBenefits?.[selectedLang] != null &&
                item?.packageTags?.[selectedLang] != null &&
                item?.taxInformation?.[selectedLang] != null &&
                item?.currencies?.[selectedLang] != null &&
                item?.buttonTexts?.[selectedLang] != null &&
                item?.packageAlerts?.[selectedLang] != null
            );
        });

        if (categoryId && categoryId !== null) {
            filteredPackages = filteredPackages.filter(pkg => {
                if (pkg.roomUpgrade === true) {
                    return pkg.from_category_id === categoryId;
                }
                return true;
            });
        }

        if (filteredPackages.length > 0) {
            emitSendPackages({
                refId: filteredPackages[0].id,
                langCode: selectedLang,
                refType: "Packages",
                station: Number(params.get("station") ?? 1),
                sentBy: JSON.stringify(data.user),
                contentExtra: JSON.stringify(filteredPackages)
            } as SendPackagePayloadType, (response) => {
                if (response && (response === true)) {
                    message.success("Packages sent!");
                } else {
                    message.error("Failed to send packages. Please try again.");
                }
            });
        } else {
            message.warning("No packages available on selected language.");
        }
    }

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
                // Allow clicks to pass through transparent areas
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
                                    onClick={openQuickActions}
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
                        height: isInIframe ? '3.5rem' : '4.09rem',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <div className="flex h-full w-full items-center justify-between mx-auto">
                        <div className="flex items-center gap-2 lg:gap-6">
                            <div
                                onClick={() => {
                                    const defaultSlideshow = slideshowTemplates?.[0];
                                    if (defaultSlideshow && socketConnected) {
                                        const isAvailable = defaultSlideshow.langCode?.includes(selectedLang);
                                        emitSendTemplate({
                                            refId: defaultSlideshow.id,
                                            langCode: isAvailable ? selectedLang : (companyData?.defaultLangCode || "en"),
                                            refType: ChatType.Slideshow,
                                            station: Number(params.get("station") ?? 1),
                                            contentExtra: defaultSlideshow.ext,
                                        });
                                    }
                                }}
                                style={{
                                    paddingTop: "0.2em",
                                    paddingRight: isInIframe ? "0.5em" : "1em",
                                    width: isInIframe ? '3vw' : '4vw',
                                    minWidth: '40px',
                                    cursor: 'pointer'
                                }}
                            >
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
                                {/* Recording - First (leftmost) */}
                                <div className="scale-75 lg:scale-100">
                                    <HeaderRecordingShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>

                                {/* Website Shortcut */}
                                <div className="scale-75 lg:scale-100">
                                    <WebsiteShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>

                                {/* Survey Shortcut */}
                                <div className="scale-75 lg:scale-100">
                                    <HeaderSurveyShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>

                                {/* Text Survey Shortcut */}
                                <div className="scale-75 lg:scale-100">
                                    <TextSurveyShortcut
                                        confirmationNumber={searchValue !== "" ? searchValue : confirmationNumber}
                                        clearConfirmationNumber={clearConfirmationNumber}
                                        checkTooltip={isInIframe}
                                    />
                                </div>

                                {/* ChatBot - Last (closest to input box) */}
                                <div className="scale-75 lg:scale-100">
                                    <ChatBot checkTooltip={isInIframe} />
                                </div>

                                {/* Template Search Input */}
                                <div ref={searchRef} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1" style={{
                                    position: 'relative',
                                    zIndex: 1000
                                }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            ref={inputRef}
                                            readOnly
                                            autoComplete="search-template"
                                            type="text"
                                            placeholder="ID# or Search Template"
                                            value={searchValue}
                                            onChange={handleSearchChange}
                                            onFocus={(e) => {
                                                e.target.removeAttribute('readOnly');
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

                                {/* Hamburger Menu */}
                                <div ref={hamburgerMenuRef} style={{ position: 'relative', marginLeft: '8px' }}>
                                    <div
                                        onClick={() => {
                                            const newState = !isHamburgerMenuOpen;
                                            setIsHamburgerMenuOpen(newState);

                                            if (isInIframe) {
                                                // Generate station picker HTML with correct stationCount
                                                const currentStation = params.get("station") ?? "1";
                                                const stationCount = companyData?.stationCount || 10;

                                                const stationOptions = Array(stationCount)
                                                    .fill(1)
                                                    .map((x, y) => x + y)
                                                    .map(num => `
                                                        <option value="${num}" ${num == currentStation ? 'selected' : ''}>
                                                            Station ${num}
                                                        </option>
                                                    `)
                                                    .join('');


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
                                                            >
                                                                ${stationOptions}
                                                            </select>
                                                        </div>
                                                    `;

                                                window.parent.postMessage({
                                                    type: 'HAMBURGER_MENU',
                                                    isOpen: newState,
                                                    content: {
                                                        station: params.get("station") ?? 1,
                                                        companyName: companyData?.name || 'Company Name',
                                                        userName: user?.user?.name || user?.user?.email || 'User Name',
                                                        stationPickerHTML: stationPickerHTML
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
                                            {Number(params.get("station") ?? 1)}
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
                {isDropdownVisible && !isInIframe && (
                    <div
                        style={{
                            position: 'fixed',
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
                        ) : searchValue === '/' && categoriesData.length > 0 ? (
                            <List
                                dataSource={categoriesData}
                                renderItem={(category: Category) => (
                                    <List.Item
                                        style={{
                                            cursor: 'pointer',
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #f0f0f0',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSelectedCategories(category.id);
                                            setSearchValue('');
                                            setIsDropdownVisible(false);
                                            handleSendPackage(category.id);
                                            message.success(`Category "${category.name}" selected for upsell`);
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                category.signedImages?.[0]?.signedUrl ? (
                                                    <img
                                                        src={category.signedImages[0].signedUrl}
                                                        alt={category.name}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '8px',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#3b5998',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: '18px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {category.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )
                                            }
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{category.name}</span>
                                                    <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                                                        {category.packageCounts.totalPackages} packages
                                                    </Tag>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
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
                            onClick={closeQuickActions}
                            className="border-none shadow-none hover:bg-white/20 rounded-lg"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                }
                placement="right"
                closable={false}
                onClose={closeQuickActions}
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