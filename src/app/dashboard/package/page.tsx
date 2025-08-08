"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Table, Tag, Card, Pagination, Input, message, Select, Tooltip } from "antd";
import Modal from "../../../components/Modal";
import { FaTrash, FaEdit, FaEye, FaSearch, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSession } from "next-auth/react";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import CreatePackageForm from "../../../components/pages/dashboard/CreatePackageTemplateForm";
import ViewPackage from "./ViewPackage";
import { FaGlobe } from "react-icons/fa";

const { Option } = Select;

export default function Package() {
    const { data: userData } = useSession();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const [loadingData, setLoadingData] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [editingPackage, setEditingPackage] = useState(null);
    const [modalMode, setModalMode] = useState('create');
    const [viewPackage, setViewPackage] = useState(false);
    const [viewPackageData, setViewPackageData] = useState(null);

    // Enhanced search states
    const [searchFilters, setSearchFilters] = useState({
        searchText: '',
        status: 'all',
        priceRange: 'all',
        priceLevel: 'all',
        taxIncluded: 'all',
        roomUpgrade: 'all',
        sortBy: 'name',
        sortOrder: 'asc'
    });
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

    const { setPackages, packages, searchPackages, setSearchPackages } = useTemplateStore();
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef();

    // Original packages data (unfiltered)
    const [originalPackages, setOriginalPackages] = useState([]);

    const fetchPackages = useCallback(() => {
        setLoadingData(true);

        fetch(`${Url}/api/v1/uploads/get-all-packages`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                setOriginalPackages(data); // Store original data
                setPackages(data);
                setTotalItems(json.pagination?.totalCount || data.length);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data, Url, setPackages]);

    // Enhanced search function
    const performSearch = useCallback((filters) => {
        if (!originalPackages.length) return [];

        let filteredPackages = [...originalPackages];

        // Text search across multiple fields
        if (filters.searchText && filters.searchText.trim() !== '') {
            const searchLower = filters.searchText.toLowerCase().trim();
            filteredPackages = filteredPackages.filter(pkg => {
                const searchFields = [
                    pkg.packageCode,
                    pkg.packageNames?.en || pkg.packageNames?.ar || '',
                    pkg.packageDescriptions?.en || pkg.packageDescriptions?.ar || '',
                    pkg.priceAlgorithm,
                    pkg.Company?.name || '',
                    ...(pkg.packageBenefits?.en || pkg.packageBenefits?.ar || []),
                    ...(pkg.packageTags?.en || pkg.packageTags?.ar || []),
                    pkg.buttonTexts?.en || pkg.buttonTexts?.ar || '',
                    pkg.packageAlerts?.en || pkg.packageAlerts?.ar || ''
                ];

                return searchFields.some(field =>
                    field && field.toString().toLowerCase().includes(searchLower)
                );
            });
        }

        // Status filter
        if (filters.status !== 'all') {
            const isActive = filters.status === 'active';
            filteredPackages = filteredPackages.filter(pkg => pkg.active === isActive);
        }

        // Price range filter
        if (filters.priceRange !== 'all') {
            filteredPackages = filteredPackages.filter(pkg => {
                const price = parseFloat(pkg.discountedPrice || pkg.originalPrice || 0);
                switch (filters.priceRange) {
                    case 'low': return price < 1000;
                    case 'medium': return price >= 1000 && price < 5000;
                    case 'high': return price >= 5000 && price < 20000;
                    case 'premium': return price >= 20000;
                    default: return true;
                }
            });
        }

        // Price level filter
        if (filters.priceLevel !== 'all') {
            const level = parseInt(filters.priceLevel);
            filteredPackages = filteredPackages.filter(pkg => pkg.priceLevel === level);
        }

        // Tax included filter
        if (filters.taxIncluded !== 'all') {
            const includesTax = filters.taxIncluded === 'yes';
            filteredPackages = filteredPackages.filter(pkg => pkg.includesTax === includesTax);
        }

        // Room upgrade filter
        if (filters.roomUpgrade !== 'all') {
            const hasUpgrade = filters.roomUpgrade === 'yes';
            filteredPackages = filteredPackages.filter(pkg => pkg.roomUpgrade === hasUpgrade);
        }

        // Sorting
        filteredPackages.sort((a, b) => {
            let aValue, bValue;

            switch (filters.sortBy) {
                case 'name':
                    aValue = (a.packageNames?.en || a.packageNames?.ar || '').toLowerCase();
                    bValue = (b.packageNames?.en || b.packageNames?.ar || '').toLowerCase();
                    break;
                case 'code':
                    aValue = a.packageCode;
                    bValue = b.packageCode;
                    break;
                case 'price':
                    aValue = parseFloat(a.discountedPrice || a.originalPrice || 0);
                    bValue = parseFloat(b.discountedPrice || b.originalPrice || 0);
                    break;
                case 'purchases':
                    aValue = a.numberOfPurchases || 0;
                    bValue = b.numberOfPurchases || 0;
                    break;
                case 'created':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                default:
                    aValue = a.id;
                    bValue = b.id;
            }

            if (filters.sortOrder === 'desc') {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
        });

        return filteredPackages;
    }, [originalPackages]);

    // Debounced search effect
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const filtered = performSearch(searchFilters);
            setPackages(filtered);
            setTotalItems(filtered.length);
            setCurrentPage(1); // Reset to first page when searching
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchFilters, performSearch, setPackages]);

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchPackages();
        }
    }, [data, fetchPackages]);

    // Handle search filter changes
    const handleFilterChange = (key, value) => {
        setSearchFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Function to handle opening modal for creating new package
    const handleCreatePackage = () => {
        setModalMode('create');
        setEditingPackage(null);
        setViewPackage(null);
        handleOpen();
    };

    // Function to handle opening modal for editing package
    const handleEditPackage = (packageData) => {
        setModalMode('edit');
        setEditingPackage(packageData);
        handleOpen();
    };

    // Function to handle closing modal and resetting state
    const handleCloseModal = () => {
        handleClose();
        setEditingPackage(null);
        setViewPackage(false);
        setViewPackageData(null);
        setModalMode('create');
    };

    // Callback function to handle successful create/update operations
    const handlePackageOperationComplete = useCallback((template, isUpdate) => {
        handleCloseModal();
        fetchPackages(); // Refresh data after operations
    }, [fetchPackages]);

    const HandlePackageDelete = (record) => {
        setLoadingData(true);
        let Id = record.id;

        fetch(`${Url}/api/v1/uploads/delete-package/${Id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${data?.user.backendTokens.at}`,
            },
        })
            .then(async (response) => {
                const text = await response.text();
                message.success('Package deleted!');
                fetchPackages();
            })
            .catch((error) => {
                console.warn("Error deleting package:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    };

    // Helper function to get the first available language value from an object
    const getFirstAvailableValue = (langObject, fallback = 'N/A') => {
        if (!langObject || typeof langObject !== 'object') return fallback;

        // Priority order: en, ar, then any other language
        const priorityLangs = ['en', 'ar'];

        // First try priority languages
        for (const lang of priorityLangs) {
            if (langObject[lang] && langObject[lang] !== '') {
                return langObject[lang];
            }
        }

        // Then try any other available language
        const availableLangs = Object.keys(langObject);
        for (const lang of availableLangs) {
            if (langObject[lang] && langObject[lang] !== '') {
                return langObject[lang];
            }
        }

        return fallback;
    };

    // Helper function to get all language variants for tooltip display
    const getAllLanguageVariants = (langObject) => {
        if (!langObject || typeof langObject !== 'object') return [];

        return Object.entries(langObject)
            .filter(([lang, value]) => value && value !== '')
            .map(([lang, value]) => ({
                lang: lang.toUpperCase(),
                value: Array.isArray(value) ? value.join(', ') : value
            }));
    };

    // Component to render multi-language content with tooltip
    const MultiLangCell = ({ langObject, isArray = false, maxDisplay = 3 }) => {
        const value = getFirstAvailableValue(langObject, isArray ? [] : '');

        // Handle nested objects
        const processValue = (val) => {
            if (Array.isArray(val)) {
                return val.map(item => {
                    // If item is an object with language keys, extract the value
                    if (typeof item === 'object' && item !== null) {
                        return getFirstAvailableValue(item, '');
                    }
                    return item;
                }).filter(Boolean);
            }
            return val;
        };

        const processedValue = processValue(value);

        if (isArray && Array.isArray(processedValue)) {
            return (
                <div>
                    {processedValue.slice(0, maxDisplay).map((item, index) => (
                        <Tag key={index} size="small">{item}</Tag>
                    ))}
                    {processedValue.length > maxDisplay && (
                        <span>+{processedValue.length - maxDisplay} more</span>
                    )}
                </div>
            );
        }

        return <span>{processedValue || 'N/A'}</span>;
    };

    const columns = [
        {
            title: "Package Code",
            dataIndex: "packageCode",
            key: "packageCode",
            width: 120,
        },
        {
            title: "Package Name",
            key: "packageName",
            width: 200,
            render: (_, record) => (
                <MultiLangCell langObject={record.packageNames} />
            ),
        },
        {
            title: "Description",
            key: "packageDescription",
            width: 250,
            render: (_, record) => (
                <MultiLangCell langObject={record.packageDescriptions} />
            ),
        },
        {
            title: "Benefits",
            key: "packageBenefits",
            width: 200,
            render: (_, record) => (
                <MultiLangCell
                    langObject={record.packageBenefits}
                    isArray={true}
                    maxDisplay={2}
                />
            ),
        },
        {
            title: "Purchases",
            dataIndex: "numberOfPurchases",
            key: "numberOfPurchases",
            width: 140,
        },
        {
            title: "Tags",
            key: "tags",
            width: 150,
            render: (_, record) => {
                let tags = getFirstAvailableValue(record.packageTags, []);

                // Handle nested objects in tags
                if (Array.isArray(tags)) {
                    tags = tags.map(tag => {
                        if (typeof tag === 'object' && tag !== null) {
                            return getFirstAvailableValue(tag, '');
                        }
                        return tag;
                    }).filter(Boolean);
                }

                const allVariants = getAllLanguageVariants(record.packageTags);
                const hasMultipleLanguages = allVariants.length > 1;

                return (
                    <div className="flex flex-wrap gap-1 items-center">
                        {tags.slice(0, 2).map((tag, index) => (
                            <Tag key={index} size="small">{tag}</Tag>
                        ))}
                        {tags.length > 2 && (
                            <Tag size="small">+{tags.length - 2}</Tag>
                        )}
                        {hasMultipleLanguages && (
                            <Tooltip title={
                                <div className="space-y-1">
                                    {allVariants.map(({ lang, value }) => (
                                        <div key={lang}>
                                            <strong>{lang}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                                        </div>
                                    ))}
                                </div>
                            }>
                                <FaGlobe className="text-blue-500 text-xs cursor-help" />
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Original Price",
            dataIndex: "originalPrice",
            key: "originalPrice",
            width: 120,
            render: (price, record) => {
                const currency = getFirstAvailableValue(record.currencies, '');
                return price ? `${currency} ${price}` : "N/A";
            }
        },
        {
            title: "Discounted Price",
            dataIndex: "discountedPrice",
            key: "discountedPrice",
            width: 160,
            render: (price, record) => {
                const currency = getFirstAvailableValue(record.currencies, '');
                return price ? `${currency} ${price}` : "N/A";
            }
        },
        {
            title: "Tax Included",
            dataIndex: "includesTax",
            key: "includesTax",
            width: 140,
            render: (includesTax) => (
                <Tag color={includesTax ? "green" : "orange"}>
                    {includesTax ? "Yes" : "No"}
                </Tag>
            ),
        },
        {
            title: "Tax Info",
            key: "taxInformation",
            width: 150,
            render: (_, record) => (
                <MultiLangCell langObject={record.taxInformation} />
            ),
        },
        {
            title: "Tax %",
            dataIndex: "taxPercentage",
            key: "taxPercentage",
            width: 80,
            render: (percentage) => percentage ? `${percentage}%` : "N/A",
        },
        {
            title: "Price Algorithm",
            dataIndex: "priceAlgorithm",
            key: "priceAlgorithm",
            width: 220,
        },
        {
            title: "Package Alert",
            key: "packageAlert",
            width: 200,
            render: (_, record) => (
                <MultiLangCell langObject={record.packageAlerts} />
            ),
        },
        {
            title: "Status",
            dataIndex: "active",
            key: "active",
            width: 100,
            render: (active) => (
                <Tag color={active ? "green" : "red"}>
                    {active ? "Active" : "Inactive"}
                </Tag>
            ),
        },
        {
            title: "Images",
            dataIndex: "images",
            key: "images",
            width: 80,
            render: (images) => (
                <Tag color={images?.length > 0 ? "blue" : "gray"}>
                    {images?.length || 0}
                </Tag>
            ),
        },
        {
            title: "Button Text",
            key: "buttonText",
            width: 150,
            render: (_, record) => (
                <MultiLangCell langObject={record.buttonTexts} />
            ),
        },
        {
            title: "Price Level",
            dataIndex: "priceLevel",
            key: "priceLevel",
            width: 100,
            render: (level) => (
                <Tag color={level >= 4 ? "red" : level >= 3 ? "orange" : "green"}>
                    Level {level}
                </Tag>
            ),
        },
        {
            title: "Category Upgrade",
            dataIndex: "roomUpgrade",
            key: "roomUpgrade",
            width: 140,
            render: (roomUpgrade) => (
                <Tag color={roomUpgrade ? "blue" : "gray"}>
                    {roomUpgrade ? "Yes" : "No"}
                </Tag>
            ),
        },
        {
            title: "Incentive %",
            dataIndex: "incentivePercentage",
            key: "incentivePercentage",
            width: 120,
            render: (percentage) => percentage ? `${percentage}%` : "N/A",
        },
        {
            title: "Company",
            dataIndex: ["Company", "name"],
            key: "company",
            width: 120,
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <div className="flex flex-wrap gap-1 sm:gap-2 items-center justify-center sm:justify-start">
                    <button
                        title="View"
                        onClick={() => {
                            setViewPackageData(record);
                            setViewPackage(true);
                        }}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs"
                    >
                        <FaEye size={14} />
                    </button>

                    <button
                        title="Edit"
                        onClick={() => handleEditPackage(record)}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-full text-xs"
                    >
                        <FaEdit size={14} />
                    </button>

                    <button
                        title="Delete"
                        onClick={() => {
                            const packageName = getFirstAvailableValue(record.packageNames, 'this package');
                            Swal.fire({
                                title: "Are you sure?",
                                text: `Delete package: ${packageName}?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d33",
                                cancelButtonColor: "#3085d6",
                                confirmButtonText: "Yes, delete it!"
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    HandlePackageDelete(record);
                                }
                            });
                        }}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-full text-xs"
                    >
                        <FaTrash size={12} />
                    </button>
                </div>
            ),
        }
    ];

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const handlePageChange = (page, pageSize) => {
        setCurrentPage(page);
    };

    // Get paginated data for display
    const paginatedPackages = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return Array.isArray(packages) ? packages.slice(startIndex, endIndex) : [];
    }, [packages, currentPage, pageSize]);

    return (
        <div className="h-full overflow-y-auto p-4 customPackageContainer">
            {userData?.user.Roles?.includes("Admin") && (
                <Modal
                    title={modalMode === 'create' ? "Create template" : "Edit template"}
                    closeModal={handleCloseModal}
                    isOpen={isOpen}
                    className="packageModal"
                >
                    <CreatePackageForm
                        initialData={editingPackage}
                        isEdit={modalMode === 'edit'}
                        cb={handlePackageOperationComplete}
                    />
                </Modal>
            )}

            <Card className="bg-gray-50">
                {/* Enhanced Search Section */}
                <div className="mb-4 space-y-4">
                    {/* Main Search Bar */}
                    <Card className="w-full customCards">
                        <div className="searchInputWidth">
                            <div className="flex-1 min-w-0">
                                <Input
                                    placeholder="Search packages by name, code, description, benefits, tags..."
                                    className="rounded-md"
                                    prefix={<FaSearch className="text-gray-400" />}
                                    value={searchFilters.searchText}
                                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                                    allowClear
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Table Section */}
                <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={paginatedPackages}
                        pagination={false}
                        className="jotFormTable"
                        scroll={{ x: 2500 }}
                        loading={loadingData}
                    />
                    <div className="flex justify-center mt-6">
                        <Pagination
                            current={currentPage}
                            total={packages?.length || 0}
                            pageSize={pageSize}
                            onChange={handlePageChange}
                            showSizeChanger
                            pageSizeOptions={["10", "20", "50", "100"]}
                            showTotal={(total, range) =>
                                `${range[0]}-${range[1]} of ${total} packages`
                            }
                        />
                    </div>
                </div>
            </Card>

            {userData?.user.Roles?.includes("Admin") && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                    <button
                        onClick={handleCreatePackage}
                        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
                        aria-label="Create new template"
                    >
                        <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />

                        {/* Tooltip */}
                        <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                            Create Template
                            <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                        </div>
                    </button>
                </div>
            )}

            {viewPackage !== false && (
                <ViewPackage
                    packageData={viewPackageData}
                    onClose={handleCloseModal}
                    viewPackageToggle={viewPackage}
                />
            )}
        </div>
    );
}