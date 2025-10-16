"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, message, Button, Space, Select, InputNumber, DatePicker, Tooltip, Row, Col, Modal, Divider } from "antd";
import { SearchOutlined, UserOutlined, CalendarOutlined, EditOutlined, SaveOutlined, CloseOutlined, FilterOutlined } from "@ant-design/icons";
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
import { SendIcon } from "../../../components/icons/SendIcon";
import { MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import { useMessageStore } from "../../../lib/zustand/store/messageStore";
import { FaFileDownload } from "react-icons/fa";
import dayjs from 'dayjs';
import { IoExpandSharp } from "react-icons/io5";

const { RangePicker } = DatePicker;
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
    const [selectedCategories, setSelectedCategories] = useState(null);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [allPackages, setAllPackages] = useState([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const pageSize = 10;
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef<NodeJS.Timeout>();
    const { emitSendPackages } = useSocketContext();
    const params = useSearchParams();
    const { data: companyData } = useCompanyControllerGetCompany();
    const isAdmin = data?.user.Roles[0] || false;
    const { receivedContent } = useMessageStore();
    const [exportLoading, setExportLoading] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedModalTitle, setSelectedModalTitle] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(undefined);
    const [selectedStatus, setSelectedStatus] = useState(undefined);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        topSellingProducts: [],
        topSellers: [],
        topIncentives: [],
        pendingApprovals: [],
        stats: {
            totalTransactions: 0,
            totalRevenue: '0.00',
            totalIncentives: '0.00',
            pendingCount: 0,
        },
    });

    // Keep only the beforeunload handler for preventing accidental reloads
    useEffect(() => {
        const handleBeforeUnload = (e) => {
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

    const fetchDashboardData = useCallback(async () => {
        setDashboardLoading(true);
        try {
            const queryParams = new URLSearchParams();

            if (dateRange && dateRange[0] && dateRange[1]) {
                queryParams.append('startDate', dateRange[0].toISOString());
                queryParams.append('endDate', dateRange[1].toISOString());
            }

            if (selectedPackage && Array.isArray(selectedPackage) && selectedPackage.length > 0) {
                selectedPackage.forEach(id => queryParams.append('packageId', id.toString()));
            }

            if (selectedStatus) {
                queryParams.append('status', selectedStatus);
            }

            if (companyData?.id) {
                queryParams.append('companyId', companyData.id.toString());
            }

            const url = `${Url}/api/v1/uploads/get-dashboard-data?${queryParams.toString()}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Cache-Control': 'no-cache',
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setDashboardData(result.data);
                }
            } else {
                message.error('Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            message.error('Error loading dashboard data');
        } finally {
            setDashboardLoading(false);
        }
    }, [dateRange, selectedPackage, selectedStatus, companyData?.id, data?.user?.backendTokens?.at, Url]);

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
                    setAllPackages(packageData.data || packageData);
                }
            } catch (error) {
                console.error('Error fetching packages:', error);
            }
        };

        if (data?.user?.backendTokens?.at && allPackages.length === 0) {
            fetchPackages();
        }
    }, [data?.user?.backendTokens?.at, allPackages.length, Url]);

    // Packages for dropdown - only those without from/to categories
    const dropdownPackages = allPackages.filter(pkg => pkg?.roomUpgrade === false);

    // Modified fetch function - remove visibility and loading checks that cause issues
    const fetchTransactions = useCallback((searchValue: string = "") => {
        setLoadingData(true);
        fetch(`${Url}/api/v1/uploads/get-al-upsell-transactions`, {
            headers: {
                Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                'Cache-Control': 'no-cache'
            },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const responseData = json.data || json;
                setTransactions(responseData);
                setTotalItems(json.pagination?.totalCount || 0);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
                message.error("Failed to fetch transactions");
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data?.user?.backendTokens?.at, Url]);


    useEffect(() => {
        if (data?.user?.backendTokens?.at && !dataLoaded) {
            fetchTransactions();
            setDataLoaded(true);
        }
    }, [data?.user?.backendTokens?.at, dataLoaded, fetchTransactions]);

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
            let requestBody;
            if (field === 'bulk' && typeof value === 'object') {
                requestBody = value;
            } else {
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
            fetchTransactions();
            await fetchDashboardData();

            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            message.error(`Failed to update transaction: ${error.message}`);
            return false;
        }
    };

    const handleExportToExcel = async () => {
        setExportLoading(true);

        try {
            const response = await fetch(`${Url}/api/v1/uploads/export-upsell-transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${data?.user.backendTokens.at}`,
                },
                body: JSON.stringify({
                    searchTerm: searchTerm,
                    // Send any other filter criteria you might add later
                }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get the blob from response
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `upsell-transactions-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            message.success('Export completed successfully');
        } catch (error) {
            console.error('Export error:', error);
            message.error('Failed to export data');
        } finally {
            setExportLoading(false);
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

        if (editingData.confirmationNumber !== record.confirmationNumber) {
            updates.confirmationNumber = editingData.confirmationNumber;
        }
        if (editingData.numberOfAdults !== record.numberOfAdults) {
            updates.numberOfAdults = Number(editingData.numberOfAdults);
        }
        if (editingData.numberOfChildren !== record.numberOfChildren) {
            updates.numberOfChildren = Number(editingData.numberOfChildren);
        }

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
                await fetchDashboardData();
            }
        } else {
            message.info('No changes detected');
            setEditingRecord(null);
            setEditingData({});
        }
    };

    const handleCancel = () => {
        setEditingRecord(null);
        setEditingData({});
    };

    const getAllLanguageVariants = (obj: Record<string, any> | null | undefined) => {
        if (!obj || typeof obj !== 'object') return [];

        return Object.entries(obj)
            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
            .map(([lang, value]) => ({ lang, value }));
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
                    {record?.station}
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
            render: (packageName: string, record: any) => {
                // Get multilingual package names from nested package object
                const packageNames = record.package?.packageNames;
                const allVariants = getAllLanguageVariants(packageNames);
                const hasMultipleLanguages = allVariants.length > 1;

                return (
                    <div className="flex items-center gap-2">
                        <div>
                            <div className="font-medium">{packageName}</div>
                            <div className="text-xs text-gray-500">{record.packageCode}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'totalRevenue',
            width: 120,
            render: (revenue: number, record: any) => {
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
                                        disabled={record?.approved === "APPROVED" || (data?.user.Roles[0] === "Staff" && record?.soldByUser?.id !== data?.user.id)}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete Transaction">
                                    <button
                                        title="Delete"
                                        onClick={() => handleDelete(record)}
                                        className="text-gray-500"
                                        disabled={data?.user.Roles[0] === "Staff" ? true : false}
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

    const fetchTransactionsWithSearch = useCallback((searchValue: string = "") => {
        setLoadingData(true);
        const url = new URL(`${Url}/api/v1/uploads/get-al-upsell-transactions`);

        if (searchValue) {
            url.searchParams.append('search', searchValue);
        }

        if (selectedPackage && Array.isArray(selectedPackage) && selectedPackage.length > 0) {
            selectedPackage.forEach(id => url.searchParams.append('packageId', id.toString()));
        }

        if (selectedStatus) {
            url.searchParams.append('approved', selectedStatus.toUpperCase());
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            url.searchParams.append('startDate', dateRange[0].toISOString());
            url.searchParams.append('endDate', dateRange[1].toISOString());
        }

        url.searchParams.append('page', currentPage.toString());
        url.searchParams.append('limit', pageSize.toString());

        fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                'Cache-Control': 'no-cache'
            },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const responseData = json.data || json;
                setTransactions(responseData);
                setTotalItems(json.pagination?.totalCount || responseData.length);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
                message.error("Failed to fetch transactions");
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data?.user?.backendTokens?.at, Url, selectedPackage, selectedStatus, dateRange, currentPage, pageSize]);

    useEffect(() => {
        if (data?.user?.backendTokens?.at && dataLoaded) {
            fetchTransactionsWithSearch(searchTerm);
        }
    }, [selectedPackage, selectedStatus, dateRange, currentPage, data?.user?.backendTokens?.at, dataLoaded, fetchTransactionsWithSearch, searchTerm]);

    const debouncedSearch = useCallback((searchValue: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchTransactionsWithSearch(searchValue);
        }, 500);
    }, [fetchTransactionsWithSearch]);

    const searchTransactions = (e: any) => {
        const searchValue = e.target.value.trim();
        setSearchTerm(searchValue);
        setCurrentPage(1);
        debouncedSearch(searchValue);
    };

    // Filter transactions based on search term
    // const filteredTransactions = Array.isArray(transactions) ? transactions.filter((transaction: any) => {
    //     // Only client-side filtering for ROOM_UPGRADE type
    //     if (transaction.typeOfSales !== 'ROOM_UPGRADE') return false;

    //     // Package filter (client-side)
    //     if (selectedPackage && Array.isArray(selectedPackage) && selectedPackage.length > 0) {
    //         if (!selectedPackage.includes(transaction.package?.id)) return false;
    //     }

    //     // Status filter (client-side)
    //     if (selectedStatus) {
    //         if (transaction.approved?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    //     }

    //     // Date filter (client-side)
    //     if (dateRange && dateRange[0] && dateRange[1]) {
    //         const transactionDate = new Date(transaction.createdAt);
    //         const startDate = new Date(dateRange[0].toISOString());
    //         const endDate = new Date(dateRange[1].toISOString());
    //         if (transactionDate < startDate || transactionDate > endDate) return false;
    //     }

    //     return true;
    // }) : [];

    // Function to send filtered package data
    const sendPackageData = (categoryId = null) => {
        const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

        // First filter by language requirements
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

        if (selectedPackages && selectedPackages?.length > 0) {
            // Then filter out selected packages
            filteredPackages = filteredPackages.filter(pkg =>
                !selectedPackages.some(selected => selected.id === pkg.id)
            );
        }

        // Finally filter by category if provided
        if (categoryId && categoryId !== null) {
            filteredPackages = filteredPackages.filter(pkg =>
                pkg.from_category_id === categoryId
            );
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
                    message.success("Packages sent successfully!");
                } else {
                    message.error("Failed to send packages. Please try again.");
                }
            });
        } else {
            message.warning("No packages available on selected language.");
        }
    };

    const handlePackageSend = () => {
        setLoadingData(true);

        const categoryId = selectedCategories !== null ? selectedCategories : null;

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
        if (categoryData.length > 0) return;

        setLoadingData(true);

        fetch(`${Url}/api/v1/uploads/get-all-categories?fetchAll=true&limit=100`, {
            headers: {
                Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                'Cache-Control': 'no-cache'
            },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const responseData = json.data || json;
                setCategoryData(responseData);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data?.user?.backendTokens?.at, Url, categoryData.length]);

    useEffect(() => {
        if (data?.user?.backendTokens?.at && categoryData.length === 0) {
            fetchCategories();
        }
    }, [data?.user?.backendTokens?.at, categoryData.length, fetchCategories]);

    useEffect(() => {
        if (data?.user?.backendTokens?.at && dataLoaded) {
            fetchDashboardData();
        }
    }, [data?.user?.backendTokens?.at, dataLoaded, fetchDashboardData]);

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

    useEffect(() => {
        if (receivedContent) {

            if (dataLoaded && receivedContent && receivedContent?.length > 0) {
                setTransactions(receivedContent);
            }
        }
    }, [receivedContent, data?.user, dataLoaded, fetchTransactions]);

    const viewDetails = (title) => {
        setDetailModal(true);
        setSelectedModalTitle(title);
    }

    const handleOk = () => {
        setDetailModal(false);
    };

    const handleCancelModal = () => {
        setDetailModal(false);
    };

    // Updated RankingCard with stats in header - Optimized for 5 records
    const RankingCard = ({ title, data, color, statValue, statLabel }) => (
        <Card
            className="hover:shadow-lg transition-shadow duration-300"
            bodyStyle={{ padding: '12px' }}
        >
            <div className="mb-2">
                {/* Stats Header - Compact */}
                <div className="text-center mb-2 pb-2 border-b border-gray-200">
                    <div className={`text-2xl font-bold text-${color}-600 mb-0.5`}>
                        {statValue}
                    </div>
                    <div className="text-xs text-gray-600">{statLabel}</div>
                </div>

                {/* Title and View All - Compact */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        {/* <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500`}></div> */}
                        <h3 className="text-xs font-semibold text-gray-700 m-0">{title}</h3>
                    </div>
                    <div>
                        <Button
                            onClick={() => viewDetails(title)}
                            className="customModalBtn text-xs h-6 px-2"
                            size="small"
                        >
                            View<IoExpandSharp />
                        </Button>
                    </div>
                </div>
            </div>
            <Space direction="vertical" size={2} className="w-full">
                {data.slice(0, 5).map((item) => (
                    <div
                        key={item.rank}
                        className="flex items-center justify-between hover:bg-gray-50 px-1.5 py-1 rounded transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center justify-center w-4 h-4 text-${color}-600 text-[10px] font-bold`}>
                                {item.rank}
                            </span>
                            <span className="text-xs text-gray-700 truncate" style={{ maxWidth: '8vw' }}>{item.name || item.confirmation}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900 whitespace-nowrap ml-2">{item.revenue || item.amount}</span>
                    </div>
                ))}
            </Space>
        </Card>
    );

    const rangePresets = [
        { label: 'Today', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
        { label: 'Yesterday', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
        { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
        { label: 'Previous Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
        { label: 'This Year', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
        { label: 'Previous Year', value: [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')] },
    ];

    const getDetailData = () => {
        switch (selectedModalTitle) {
            case 'Top Selling Products':
                return dashboardData.topSellingProducts;
            case 'Top Sellers':
                return dashboardData.topSellers;
            case 'Top Incentive':
                return dashboardData.topIncentives;
            case 'Pending Approvals':
                return dashboardData.pendingApprovals;
            default:
                return [];
        }
    };

    const renderDetailContent = () => {
        const data = getDetailData();

        if (!data || data.length === 0) {
            return <div className="text-center py-8 text-gray-500">No data available</div>;
        }

        return (
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                                {item.rank}
                            </span>
                            <div>
                                <div className="font-medium text-gray-900">
                                    {item.name || item.confirmation}
                                </div>
                                {item.email && (
                                    <div className="text-xs text-gray-500">{item.email}</div>
                                )}
                                {item.code && (
                                    <div className="text-xs text-gray-500">{item.code}</div>
                                )}
                                {item.soldBy && (
                                    <div className="text-xs text-gray-500">Sold by: {item.soldBy}</div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold text-gray-900">
                                {item.revenue || item.amount}
                            </div>
                            {item.transactionCount && (
                                <div className="text-xs text-gray-500">
                                    {item.transactionCount} transactions
                                </div>
                            )}
                            {item.count && (
                                <div className="text-xs text-gray-500">
                                    {item.count} sales
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="mx-auto space-y-6 upsellMainWrapper">
                {/* Controls Section */}
                <Card className="shadow-sm">
                    <Row gutter={[12, 12]}>
                        {/* Package Selection & Category with Send Button */}
                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Space.Compact className="w-full" style={{ gap: '1rem' }}>
                                <Select
                                    placeholder="Select packages to exclude"
                                    allowClear
                                    mode="multiple"
                                    className="w-full customMultiSelect"
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
                                <Select
                                    placeholder="From Category"
                                    allowClear
                                    className="w-full customMultiSelect"
                                    maxTagCount="responsive"
                                    showSearch
                                    optionFilterProp="children"
                                    value={selectedCategories}
                                    onChange={handleCategoryChange}
                                    onDeselect={handleCategoryDeselect}
                                    dropdownStyle={{
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        minHeight: 200
                                    }}
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
                                    {(Array.isArray(categoryData) ? [...categoryData] : [])
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
                                <Button
                                    type="primary"
                                    icon={<SendIcon />}
                                    onClick={handlePackageSend}
                                    loading={loadingData}
                                    style={{ borderRadius: '0.375rem' }}
                                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white headerButton"
                                />
                            </Space.Compact>
                        </Col>

                        {/* Filters Row */}
                        <Col xs={24} sm={24} md={24} lg={16} className="customRightHeaderCol">
                            <Space wrap className="w-full" size={[8, 8]}>
                                {/* Search Input */}
                                <Input
                                    placeholder="Search by confirmation, package, email, or status..."
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    value={searchTerm}
                                    onChange={searchTransactions}
                                    className="w-full"
                                />

                                <Select
                                    placeholder="Packages"
                                    mode="multiple"
                                    maxTagCount="responsive"
                                    allowClear
                                    suffixIcon={<FilterOutlined />}
                                    value={selectedPackage}
                                    onChange={setSelectedPackage}
                                    style={{ minWidth: 120, width: '100%', maxWidth: 150 }}
                                    allowClear
                                >
                                    {allPackages.map(pkg => (
                                        <Option key={pkg.id} value={pkg.id}>
                                            {pkg.packageNames?.en || `Package ${pkg.id}`}
                                        </Option>
                                    ))}
                                </Select>
                                <Select
                                    placeholder="Status"
                                    suffixIcon={<FilterOutlined />}
                                    value={selectedStatus}
                                    onChange={setSelectedStatus}
                                    style={{ minWidth: 120, width: '100%', maxWidth: 150 }}
                                    allowClear
                                >
                                    <Option value="pending">Pending</Option>
                                    <Option value="approved">Approved</Option>
                                    <Option value="rejected">Rejected</Option>
                                    <Option value="cancelled">Cancelled</Option>
                                </Select>
                                <RangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                    className="customDateRangePicker"
                                    style={{ minWidth: 240, width: '100%', maxWidth: 300 }}
                                    format="MMM DD, YYYY"
                                    presets={rangePresets}
                                />
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Top Performance Cards with Stats */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <RankingCard
                            title="Top Selling Products"
                            data={dashboardData.topSellingProducts}
                            color="blue"
                            statValue={dashboardData.stats.totalRevenue}
                            statLabel="Total Revenue"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <RankingCard
                            title="Top Sellers"
                            data={dashboardData.topSellers}
                            color="green"
                            statValue={dashboardData.stats.totalTransactions}
                            statLabel="Total Transactions"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <RankingCard
                            title="Top Incentive"
                            data={dashboardData.topIncentives}
                            color="purple"
                            statValue={dashboardData.stats.totalIncentives}
                            statLabel="Total Incentives"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <RankingCard
                            title="Pending Approvals"
                            data={dashboardData.pendingApprovals}
                            color="red"
                            statValue={dashboardData.stats.pendingCount}
                            statLabel="Pending Approval"
                        />
                    </Col>
                </Row>

                {/* Table Section */}
                <Card className="shadow-sm customUpsellCard">
                    <div className="overflow-hidden">
                        {/* Header with Title and Export Button */}
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-800">Transactions List</h2>

                            {/* Export Button - Top Right */}
                            {totalItems > 0 && (
                                <Button
                                    type="default"
                                    icon={<FaFileDownload />}
                                    onClick={handleExportToExcel}
                                    loading={exportLoading}
                                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white exportButton"
                                >
                                    Export
                                </Button>
                            )}
                        </div>

                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={transactions}
                            pagination={false}
                            loading={loadingData}
                            scroll={{ x: 1600 }}
                            className="w-full"
                            size="small"
                            bordered={false}
                            showSorterTooltip={false}
                        />

                        {/* Pagination Container - Centered */}
                        {totalItems > 0 && (
                            <div className="flex justify-center items-center mt-6 pt-4 border-t border-gray-100">
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
            <Modal
                title={selectedModalTitle || "Details"}
                closable={{ 'aria-label': 'Custom Close Button' }}
                open={detailModal}
                footer={false}
                // onOk={handleOk}
                onCancel={handleCancelModal}
            >
                {renderDetailContent()}
                <Divider />
                <div className="flex justify-center align-items-center">
                    <Button onClick={handleOk} className="customBtn">Close</Button>
                </div>
            </Modal>
        </div>
    );
}