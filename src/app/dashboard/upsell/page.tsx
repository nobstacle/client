"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, message, Button, Typography, Space, Select, InputNumber, DatePicker, Tooltip } from "antd";
import { SearchOutlined, SendOutlined, UserOutlined, CalendarOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";
import "../../../styles/base.css";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import {
    useCompanyControllerGetCompany,
} from "../../../lib/client/api";
import { SendPackagePayloadType } from "../../../constant/types";
import { UpsellStatusCell } from "../../../components/UpdateStatusCell";
import dayjs from 'dayjs';
import { SendIcon } from "../../../components/icons/SendIcon";
import { MdDelete } from "react-icons/md";
import Swal from "sweetalert2";

const { Option } = Select;

export default function Upsell() {
    const [loadingData, setLoadingData] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [editingRecord, setEditingRecord] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<any>({});
    const [categoryData, setCategoryData] = useState([]);
    const [servicePackages, setServicePackages] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [allPackages, setAllPackages] = useState([]);
    const [initialLoad, setInitialLoad] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);
    const pageSize = 10;
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef<NodeJS.Timeout>();
    const { emitSendPackages } = useSocketContext();
    const params = useSearchParams();
    const { data: companyData } = useCompanyControllerGetCompany();
    const isAdmin = data?.user.Roles[0] || false;

    // Add visibility change handler to prevent unnecessary reloads
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabVisible(!document.hidden);
        };

        // Add event listener for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Add beforeunload handler to prevent accidental reloads
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            // Only show warning if there are unsaved changes (editing mode)
            if (editingRecord) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [editingRecord]);

    const handlePageChange = (page: number, pageSize: number) => {
        setCurrentPage(page);
    };

    // Modified useEffect with proper dependency management and caching
    useEffect(() => {
        if (data?.user !== undefined && initialLoad) {
            fetchTransactions();
            setInitialLoad(false);
        }
    }, [data?.user]); // Remove unnecessary dependencies

    // Fetch packages with caching mechanism
    useEffect(() => {
        const fetchPackages = async () => {
            // Check if we already have packages data
            if (allPackages.length > 0) return;

            try {
                const response = await fetch(`${Url}/api/v1/uploads/get-all-packages`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${data?.user.backendTokens.at}`,
                        'Cache-Control': 'no-cache' // Prevent browser caching issues
                    },
                });
                if (response.ok) {
                    const packageData = await response.json();
                    setAllPackages(packageData.data || packageData);
                }
            } catch (error) {
                console.error('Error fetching packages:', error);
            }
        };

        if (data?.user !== undefined && allPackages.length === 0) {
            fetchPackages();
        }
    }, [data?.user, allPackages.length, Url]); // More specific dependencies

    // Packages for dropdown - only those without from/to categories
    const dropdownPackages = allPackages.filter(pkg => pkg?.roomUpgrade === false);

    // Modified fetch function with better error handling and caching
    const fetchTransactions = useCallback((searchValue: string = "") => {
        // Prevent fetching if we're not visible or already loading
        if (!isTabVisible || loadingData) return;

        setLoadingData(true);
        fetch(`${Url}/api/v1/uploads/get-al-upsell-transactions`, {
            headers: {
                Authorization: `Bearer ${data?.user.backendTokens.at}`,
                'Cache-Control': 'no-cache' // Prevent browser caching
            },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                setTransactions(data);
                setTotalItems(json.pagination?.totalCount || 0);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
                message.error("Failed to fetch transactions");
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data, Url, isTabVisible, loadingData]); // Add isTabVisible and loadingData as dependencies

    const getSalesTypeColor = (type: string) => {
        switch (type) {
            case 'ROOM_UPGRADE': return 'blue';
            case 'PACKAGE_SALE': return 'purple';
            case 'ADD_ON': return 'cyan';
            default: return 'default';
        }
    };

    // New function to handle field updates
    const updateTransactionField = async (id: string, field: string, value: any) => {
        try {
            // Handle bulk updates differently
            let requestBody;
            if (field === 'bulk' && typeof value === 'object') {
                // For bulk updates, send the object directly (flattened)
                requestBody = value;
            } else {
                // For single field updates, create the field-value pair
                requestBody = { [field]: value };
            }

            const response = await fetch(`${Url}/api/v1/uploads/update-upsell/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${data?.user.backendTokens.at}`
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update transaction');
            }

            message.success('Transaction updated successfully');
            fetchTransactions(); // Refresh data
            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            message.error(`Failed to update transaction: ${error.message}`);
            return false;
        }
    };

    const handleEdit = (record: any) => {
        setEditingRecord(record.id);
        setEditingData({
            confirmationNumber: record.confirmationNumber,
            numberOfAdults: record.numberOfAdults,
            numberOfChildren: record.numberOfChildren,
            arrivalDate: record.arrivalDate ? dayjs(record.arrivalDate) : null,
            departureDate: record.departureDate ? dayjs(record.departureDate) : null,
        });
    };
    const handleDelete = (record) => {
        console.log("delete", record);

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the transaction "${record.packageName}". This action cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                setLoadingData(true);

                 fetch(`${Url}/api/v1/uploads/delete-upsell/${record.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${data?.user.backendTokens.at}`
                    }
                })
                    .then((res) => {
                        if (!res.ok) throw new Error("Failed to delete");
                        return res.json();
                    })
                    .then(() => {
                        Swal.fire({
                            title: 'Deleted!',
                            text: 'transaction has been deleted successfully.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        fetchTransactions();
                    })
                    .catch((error) => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to delete transaction. Please try again.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                        console.error('Delete error:', error);
                    })
                    .finally(() => {
                        setLoadingData(false);
                    });
            }
        });
    };

    const handleSave = async (record: any) => {
        const updates = {};

        // Check what fields have changed with better comparison
        if (editingData.confirmationNumber !== record.confirmationNumber) {
            updates.confirmationNumber = editingData.confirmationNumber;
        }
        if (editingData.numberOfAdults !== record.numberOfAdults) {
            updates.numberOfAdults = Number(editingData.numberOfAdults);
        }
        if (editingData.numberOfChildren !== record.numberOfChildren) {
            updates.numberOfChildren = Number(editingData.numberOfChildren);
        }

        // Better date comparison
        const recordArrivalDate = record.arrivalDate ? dayjs(record.arrivalDate) : null;
        const recordDepartureDate = record.departureDate ? dayjs(record.departureDate) : null;

        if (editingData.arrivalDate && (!recordArrivalDate || !editingData.arrivalDate.isSame(recordArrivalDate, 'day'))) {
            updates.arrivalDate = editingData.arrivalDate.toISOString();
        }
        if (editingData.departureDate && (!recordDepartureDate || !editingData.departureDate.isSame(recordDepartureDate, 'day'))) {
            updates.departureDate = editingData.departureDate.toISOString();
        }

        if (Object.keys(updates).length > 0) {
            const success = await updateTransactionField(record.id, 'bulk', updates);
            if (success) {
                setEditingRecord(null);
                setEditingData({});
            }
        } else {
            // No changes detected
            message.info('No changes detected');
            setEditingRecord(null);
            setEditingData({});
        }
    };

    const handleCancel = () => {
        setEditingRecord(null);
        setEditingData({});
    };

    const columns = [
        {
            title: 'Station',
            dataIndex: 'company.stationCount',
            key: 'company.stationCount',
            width: 80,
            sorter: true,
            render: (_i, record) => (
                <>
                    {record?.company?.stationCount}
                </>
            )
        },
        {
            title: 'Confirmation',
            dataIndex: 'confirmationNumber',
            key: 'confirmationNumber',
            width: 200,
            render: (confirmationNumber: string, record: any) => {
                const isEditing = editingRecord === record.id;

                return isEditing ? (
                    <Input
                        value={editingData.confirmationNumber}
                        onChange={(e) => setEditingData({ ...editingData, confirmationNumber: e.target.value })}
                        className="font-mono text-xs"
                        size="small"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{confirmationNumber}</span>
                    </div>
                );
            },
        },
        {
            title: 'Package',
            dataIndex: 'packageName',
            key: 'packageName',
            width: 180,
            render: (packageName: string, record: any) => (
                <div>
                    <div className="font-medium">{packageName}</div>
                    <div className="text-xs text-gray-500">{record.packageCode}</div>
                </div>
            ),
        },
        {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'totalRevenue',
            width: 120,
            render: (revenue: number, record: any) => {
                // Fixed calculation - use proper currency formatting
                const currency = record.package?.currencies?.en || record.package?.currency || '$';
                const formattedRevenue = revenue ? revenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) : '0.00';
                const formattedIncentive = record.totalIncentive ? record.totalIncentive.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) : '0.00';

                return (
                    <div>
                        <div className="font-medium">
                            {currency} {formattedRevenue}
                        </div>
                        <div className="text-xs text-green-600">
                            Incentive: {currency} {formattedIncentive}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Guests',
            key: 'guests',
            width: 150,
            render: (record: any) => {
                const isEditing = editingRecord === record.id;

                return isEditing ? (
                    <Space direction="vertical" size={0} className="w-full">
                        <div className="flex items-center gap-2">
                            <UserOutlined className="text-xs" />
                            <InputNumber
                                value={editingData.numberOfAdults}
                                onChange={(value) => setEditingData({ ...editingData, numberOfAdults: value })}
                                min={0}
                                size="small"
                                className="w-16"
                            />
                            <span className="text-xs">Adults</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs w-4"></span>
                            <InputNumber
                                value={editingData.numberOfChildren}
                                onChange={(value) => setEditingData({ ...editingData, numberOfChildren: value })}
                                min={0}
                                size="small"
                                className="w-16"
                            />
                            <span className="text-xs">Children</span>
                        </div>
                    </Space>
                ) : (
                    <Space direction="vertical" size={0}>
                        <span className="text-xs">
                            <UserOutlined /> {record.numberOfAdults || 0} Adults
                        </span>
                        {record.numberOfChildren > 0 && (
                            <span className="text-xs text-gray-500">
                                {record.numberOfChildren} Children
                            </span>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Stay Period',
            key: 'stayPeriod',
            width: 160,
            render: (record: any) => {
                const isEditing = editingRecord === record.id;

                return isEditing ? (
                    <div className="text-xs space-y-2">
                        <div className="flex items-center gap-2">
                            <CalendarOutlined />
                            <span>Arrival:</span>
                            <DatePicker
                                value={editingData.arrivalDate}
                                onChange={(date) => setEditingData({ ...editingData, arrivalDate: date })}
                                size="small"
                                format="MM/DD/YYYY"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4"></span>
                            <span>Departure:</span>
                            <DatePicker
                                value={editingData.departureDate}
                                onChange={(date) => setEditingData({ ...editingData, departureDate: date })}
                                size="small"
                                format="MM/DD/YYYY"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-xs">
                        <div>
                            <CalendarOutlined /> Arrival: {new Date(record.arrivalDate).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                            Departure: {new Date(record.departureDate).toLocaleDateString()}
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Status",
            dataIndex: "approved",
            key: "approved",
            width: 140,
            render: (status: string, record: any) => (
                <UpsellStatusCell
                    status={status}
                    record={record}
                    token={data?.user.backendTokens.at}
                    isAdmin={isAdmin}
                    onStatusUpdated={fetchTransactions}
                />
            ),
        },
        {
            title: 'Sales Type',
            dataIndex: 'typeOfSales',
            key: 'typeOfSales',
            width: 120,
            render: (type: string) => (
                <Tag color={getSalesTypeColor(type)}>
                    {type?.replace('_', ' ') || 'N/A'}
                </Tag>
            ),
        },
        {
            title: 'Sold By',
            key: 'soldBy',
            width: 150,
            render: (record: any) => (
                <div className="text-xs">
                    <div>{record.soldByUser?.email || 'N/A'}</div>
                    {/* <div className="text-gray-500">ID: {record.soldBy}</div> */}
                </div>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date: string) => (
                <div className="text-xs">
                    {new Date(date).toLocaleDateString()}
                    <div className="text-gray-500">
                        {new Date(date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
            ),
        },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        fixed: 'right',
            render: (record: any) => {
                const isEditing = editingRecord === record.id;

                return (
                <Space size="small">
                    {isEditing ? (
                    <>
                        <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() => handleSave(record)}
                        />
                        <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleCancel}
                        />
                    </>
                    ) : (
                    <>
                        <Tooltip title="Edit Transaction">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                        </Tooltip>
                        <Tooltip title="Delete Transaction">
                        <button
                            title="Delete"
                            onClick={() => handleDelete(record)}
                            className="text-gray-500 "
                        >
                            <MdDelete />
                        </button>
                        </Tooltip>
                    </>
                    )}
                </Space>
                );
            },
        }
    ];

    const debouncedSearch = useCallback((searchValue: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            setCurrentPage(1);
            setHasMore(true);
            fetchTransactions(searchValue);
        }, 500);
    }, [fetchTransactions]);

    const searchTransactions = (e: any) => {
        const searchValue = e.target.value.toLowerCase().trim();
        setSearchTerm(searchValue);
        debouncedSearch(searchValue);
    }

    // Filter transactions based on search term
    const filteredTransactions = Array.isArray(transactions) ? transactions.filter((transaction: any) => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            transaction.confirmationNumber?.toLowerCase().includes(searchLower) ||
            transaction.packageName?.toLowerCase().includes(searchLower) ||
            transaction.packageCode?.toLowerCase().includes(searchLower) ||
            transaction.soldByUser?.email?.toLowerCase().includes(searchLower) ||
            transaction.approved?.toLowerCase().includes(searchLower) ||
            transaction.typeOfSales?.toLowerCase().includes(searchLower)
        );
    }) : [];

    // Function to send filtered package data
    const sendPackageData = (categoryId = null) => {
        // Filter out selected packages and apply category filter
        let filteredPackages = allPackages.filter(pkg =>
            !selectedPackages.some(selected => selected.id === pkg.id)
        );

        // If a category is selected, exclude packages that have this category in to_category_id
        if (categoryId) {
            filteredPackages = filteredPackages.filter(pkg =>
                pkg.to_category_id !== categoryId
            );
        }

        const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";
        const finalFilteredPackages = filteredPackages?.filter((item) => {
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

        // Send the filtered packages
        if (finalFilteredPackages.length > 0) {
            emitSendPackages({
                refId: finalFilteredPackages[0].id,
                langCode: selectedLang,
                refType: "Packages",
                station: Number(params.get("station") ?? 1),
                sentBy: JSON.stringify(data.user),
                contentExtra: JSON.stringify(finalFilteredPackages)
            } as SendPackagePayloadType, (response) => {
                if (response && (response === true)) {
                    message.success("Packages sent successfully!");
                } else {
                    message.error("Failed to send packages. Please try again.");
                }
            });
        } else {
            message.warning("No packages available to send with current filters.");
        }
    };

    const handlePackageSend = () => {
        setLoadingData(true);

        // Use the first selected category if any, otherwise null
        const categoryId = selectedCategories.length > 0 ? selectedCategories[0] : null;

        try {
            sendPackageData(categoryId);
        } catch (error) {
            console.error("Error sending packages:", error);
            message.error("Failed to send packages. Please try again.");
        } finally {
            setLoadingData(false);
        }
    };

    // Modified fetchCategories with caching
    const fetchCategories = useCallback(() => {
        // Check if we already have category data
        if (categoryData.length > 0) return;

        setLoadingData(true);

        fetch(`${Url}/api/v1/uploads/get-all-categories`, {
            headers: {
                Authorization: `Bearer ${data?.user.backendTokens.at}`,
                'Cache-Control': 'no-cache'
            },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                setCategoryData(data);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data, Url, categoryData.length]); // Add categoryData.length as dependency

    useEffect(() => {
        if (data?.user !== undefined && categoryData.length === 0) {
            fetchCategories();
        }
    }, [data?.user, fetchCategories]);

    const handleCategoryChange = (value) => {
        setSelectedCategories(value);
    };

    const handleCategoryDeselect = (value) => {
        setSelectedCategories(prev => prev.filter(id => id !== value));
    };

    const handlePackageChange = (value) => {
        setSelectedPackages(value.map(id => allPackages.find(pkg => pkg.id === id)).filter(Boolean));
    };

    const handlePackageDeselect = (value) => {
        setSelectedPackages(prev => prev.filter(pkg => pkg.id !== value));
    };

    return (
        <div className="min-h-full bg-gray-50">
            <div className="mx-auto p-6">
                {/* Controls Section */}
                {/* Controls Section */}
                <Card className="mb-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        {/* Left side - Filter dropdowns and Send button - 50% width */}
                        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row gap-3">
                            {/* Package Select - 20% of total width (40% of left section) */}
                            <div className="flex-[2]">
                                <Select
                                    placeholder="Select packages to exclude"
                                    allowClear
                                    mode="multiple"
                                    className="w-full"
                                    maxTagCount="responsive"
                                    showSearch
                                    optionFilterProp="children"
                                    value={selectedPackages.map(pkg => pkg.id)}
                                    onChange={handlePackageChange}
                                    onDeselect={handlePackageDeselect}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                    tagRender={(props) => (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                            {props.label}
                                            <button
                                                className="ml-1 text-blue-600 hover:text-blue-800"
                                                onClick={props.onClose}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    )}
                                >
                                    {dropdownPackages.map(pkg => (
                                        <Option key={pkg.id} value={pkg.id}>
                                            {pkg.packageNames?.en || `Package ${pkg.id}`}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            {/* Category Select - 20% of total width (40% of left section) */}
                            <div className="flex-[2]">
                                <Select
                                    placeholder="From Category"
                                    allowClear
                                    className="w-full"
                                    maxTagCount="responsive"
                                    showSearch
                                    optionFilterProp="children"
                                    value={selectedCategories}
                                    onChange={handleCategoryChange}
                                    onDeselect={handleCategoryDeselect}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                    tagRender={(props) => (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                                            {props.label}
                                            <button
                                                className="ml-1 text-green-600 hover:text-green-800"
                                                onClick={props.onClose}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    )}
                                >
                                    {[...categoryData]
                                        .sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0))
                                        .map((category) => (
                                            <Option value={category.id} key={category.id}>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="font-medium">{category?.name}</span>
                                                </div>
                                            </Option>
                                        ))
                                    }
                                </Select>
                            </div>

                            {/* Send Button - 10% of total width (20% of left section) */}
                            <div className="flex-[1] flex justify-start">
                                <Button
                                    type="primary"
                                    icon={<SendIcon />}
                                    onClick={handlePackageSend}
                                    loading={loadingData}
                                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white headerButton"
                                // size="large"
                                />
                            </div>
                        </div>

                        {/* Right side - Search input - 50% width */}
                        <div className="w-full lg:w-1/2">
                            {/* Search Input - 30% of total width (60% of right section) positioned at flex-end */}
                            <div className="flex justify-end">
                                <div className="w-3/5">
                                    <Input
                                        placeholder="Search by confirmation, package, email, or status..."
                                        prefix={<SearchOutlined className="text-gray-400" />}
                                        value={searchTerm}
                                        onChange={searchTransactions}
                                        className="w-full"
                                    // size="large"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {filteredTransactions.length}
                        </div>
                        <div className="text-gray-600">Total Transactions</div>
                    </Card>
                    <Card className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {filteredTransactions.reduce((sum: number, t: any) => sum + (Number(t.totalRevenue) || 0), 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </div>
                        <div className="text-gray-600">Total Revenue</div>
                    </Card>
                    <Card className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {filteredTransactions.filter((t: any) => t.approved === 'PENDING').length}
                        </div>
                        <div className="text-gray-600">Pending Approval</div>
                    </Card>
                    <Card className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {filteredTransactions.reduce((sum: number, t: any) => sum + (Number(t.totalIncentive) || 0), 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </div>
                        <div className="text-gray-600">Total Incentives</div>
                    </Card>
                </div>

                {/* Table Section */}
                <Card className="shadow-sm">
                    <div className="overflow-hidden">
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={filteredTransactions}
                            pagination={false}
                            loading={loadingData}
                            scroll={{ x: 1600 }}
                            className="w-full"
                            size="small"
                            bordered={false}
                            showSorterTooltip={false}
                        />

                        {/* Pagination */}
                        {totalItems > 0 && (
                            <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
                                <Pagination
                                    current={currentPage}
                                    total={totalItems}
                                    pageSize={pageSize}
                                    onChange={handlePageChange}
                                    showSizeChanger
                                    showQuickJumper
                                    pageSizeOptions={["10", "20", "50", "100"]}
                                    showTotal={(total, range) =>
                                        `${range[0]}-${range[1]} of ${total} transactions`
                                    }
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}