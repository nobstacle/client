"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, message } from "antd";
import Modal from "../../../components/Modal";
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSession } from "next-auth/react";
import "../../../styles/base.css";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import CreatePackageForm from "../../../components/pages/dashboard/CreatePackageTemplateForm";
import ViewPackage from "./ViewPackage";

export default function Package() {
    const { data: userData } = useSession();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const [loadingData, setLoadingData] = useState(false);
    const [totalItems, setTotalItems] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [editingPackage, setEditingPackage] = useState(null);
    const [modalMode, setModalMode] = useState('create');
    const [viewPackage, setViewPackage] = useState(false);
    const [viewPackageData, setViewPackageData] = useState(null);
    const { setPackages, packages, searchPackages, setSearchPackages } = useTemplateStore();
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef<NodeJS.Timeout>();

    const fetchPackages = useCallback((searchValue: string = "") => {
        setLoadingData(true);
        fetch(`${Url}/api/v1/uploads/get-all-packages`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                setPackages(data);
                setTotalItems(json.pagination?.totalCount);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data, Url, setPackages]);

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchPackages("");
        }
    }, [data, fetchPackages]);

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
        fetchPackages(searchTerm);
    }, [fetchPackages, searchTerm]);


    const HandlePackageDelete = (record: any) => {
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
                fetchPackages("");
            })
            .catch((error) => {
                console.warn("Error deleting package:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
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
            dataIndex: ["packageNames", "en"],
            key: "packageName",
            width: 200,
        },
        {
            title: "Description",
            dataIndex: ["packageDescriptions", "en"],
            key: "packageDescription",
            width: 250,
            render: (text: string) => (
                <div className="truncate" title={text}>
                    {text}
                </div>
            ),
        },
        {
            title: "Benefits",
            dataIndex: ["packageBenefits", "en"],
            key: "packageBenefits",
            width: 200,
            render: (benefits: string[]) => (
                <div className="truncate" title={benefits?.join(", ")}>
                    {benefits?.join(", ")}
                </div>
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
            dataIndex: ["packageTags", "en"],
            key: "tags",
            width: 150,
            render: (tags: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {tags?.slice(0, 2).map((tag, index) => (
                        <Tag key={index} size="small">{tag}</Tag>
                    ))}
                    {tags?.length > 2 && <Tag size="small">+{tags.length - 2}</Tag>}
                </div>
            ),
        },
 {
    title: "Original Price",
    dataIndex: "originalPrice",
    key: "originalPrice",
    width: 120,
    render: (price: string, record: any) => {
        const currency = record?.currencies?.en || '';
        return price ? `${currency} ${price}` : "N/A";
    }
},
{
    title: "Discounted Price",
    dataIndex: "discountedPrice",
    key: "discountedPrice",
    width: 160,
    render: (price: string, record: any) => {
        const currency = record?.currencies?.en || '';
        return price ? `${currency} ${price}` : "N/A";
    }
},
        {
            title: "Tax Included",
            dataIndex: "includesTax",
            key: "includesTax",
            width: 140,
            render: (includesTax: boolean) => (
                <Tag color={includesTax ? "green" : "orange"}>
                    {includesTax ? "Yes" : "No"}
                </Tag>
            ),
        },
        {
            title: "Tax Info",
            dataIndex: ["taxInformation", "en"],
            key: "taxInformation",
            width: 150,
            render: (text: string) => (
                <div className="truncate" title={text}>
                    {text}
                </div>
            ),
        },
        {
            title: "Tax %",
            dataIndex: "taxPercentage",
            key: "taxPercentage",
            width: 80,
            render: (percentage: string) => percentage ? `${percentage}%` : "N/A",
        },
        {
            title: "Price Algorithm",
            dataIndex: "priceAlgorithm",
            key: "priceAlgorithm",
            width: 220,
        },
        {
            title: "Package Alert",
            dataIndex: ["packageAlerts", "en"],
            key: "packageAlert",
            width: 120,
            render: (alert: string) => (
                <div className="truncate" title={alert}>
                    {alert}
                </div>
            ),
        },
        {
            title: "Status",
            dataIndex: "active",
            key: "active",
            width: 100,
            render: (active: boolean) => (
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
            render: (images: string[]) => (
                <Tag color={images?.length > 0 ? "blue" : "gray"}>
                    {images?.length || 0}
                </Tag>
            ),
        },
        {
            title: "Button Text",
            dataIndex: ["buttonTexts", "en"],
            key: "buttonText",
            width: 120,
        },
        {
            title: "Price Level",
            dataIndex: "priceLevel",
            key: "priceLevel",
            width: 100,
            render: (level: number) => (
                <Tag color={level >= 4 ? "red" : level >= 3 ? "orange" : "green"}>
                    Level {level}
                </Tag>
            ),
        },
        {
            title: "Room Upgrade",
            dataIndex: "roomUpgrade",
            key: "roomUpgrade",
            width: 140,
            render: (roomUpgrade: boolean) => (
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
            render: (percentage: string) => `${percentage}%`,
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
                            Swal.fire({
                                title: "Are you sure?",
                                text: `Delete package: ${record.packageNames?.en}?`,
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

    const handlePageChange = (page: number, pageSize: number) => {
        setCurrentPage(page);
    };

    const debouncedSearch = useCallback((searchValue: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            setCurrentPage(1);
            setHasMore(true);
            fetchPackages(searchValue);
        }, 500);
    }, [fetchPackages]);

    const searchNotes = (e: any) => {
        const searchValue = e.target.value.toLowerCase().trim();
        setSearchTerm(searchValue);
        debouncedSearch(searchValue);
    }

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
                <div className="customSearchWrapper mb-4">
                    <Card className="w-full customCards" >
                        <div className="searchInputWidth">
                            <Input placeholder='Search Packages' className='w-full rounded-md p-2' onChange={searchNotes} />
                        </div>
                    </Card>
                </div>
                <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={Array.isArray(packages) ? packages : []}
                        pagination={false}
                        className="jotFormTable"
                        scroll={{ x: 2500 }}
                        loading={loadingData}
                    />
                    <div className="flex justify-center mt-6">
                        <Pagination
                            current={currentPage}
                            total={totalItems}
                            pageSize={pageSize}
                            onChange={handlePageChange}
                            showSizeChanger
                            pageSizeOptions={["10", "20", "50", "100"]}
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
                <ViewPackage packageData={viewPackageData} onClose={handleCloseModal} viewPackageToggle={viewPackage} />
            )}
        </div>
    );
}