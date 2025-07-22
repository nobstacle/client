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

export default function Upsell() {
    const [loadingData, setLoadingData] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [editingRecord, setEditingRecord] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<any>({});
    const pageSize = 10;
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef<NodeJS.Timeout>();
    const { emitSendPackages } = useSocketContext();
    const params = useSearchParams();
    const { data: companyData } = useCompanyControllerGetCompany();
    const isAdmin = data?.user.Roles[0] || false;

    const handlePageChange = (page: number, pageSize: number) => {
        setCurrentPage(page);
    };

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchTransactions();
        }
    }, [data]);

    const fetchTransactions = useCallback((searchValue: string = "") => {
        setLoadingData(true);
        fetch(`${Url}/api/v1/uploads/get-al-upsell-transactions`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
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
    }, [data, Url, setTransactions]);

    const getSalesTypeColor = (type: string) => {
        switch (type) {
            case 'ROOM_UPGRADE': return 'blue';
            case 'PACKAGE_SALE': return 'purple';
            case 'ADD_ON': return 'cyan';
            default: return 'default';
        }
    };

    const updateStatusAPI = async (id: string, status: string) => {
        return await fetch(`/api/update-status/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
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

        console.log('Updates to be sent:', updates); // Debug log

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

                return isEditing ? (
                    <Space size="small">
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
                    </Space>
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
                    </>
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

    const handlePackageSend = () => {
        console.info("Sending packages...");
        setLoadingData(true);

        fetch(`${Url}/api/v1/uploads/get-all-packages`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch packages');
                }
                const result = await response.json();
                let packageList = result?.data;
                console.log("Response from server:", packageList);

                const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";
                const filterPackages = packageList?.filter((item) => {
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
                emitSendPackages({
                    refId: filterPackages.length > 0 ? filterPackages[0].id : 0,
                    langCode: params.get("lang") || companyData?.defaultLangCode || "en",
                    refType: "Packages",
                    station: Number(params.get("station") ?? 1),
                    sentBy: JSON.stringify(data.user),
                    contentExtra: JSON.stringify(filterPackages)
                } as SendPackagePayloadType, (response) => {
                    console.log("Package send response:", response);
                    if (response && (response === true)) {
                        message.success("Packages sent successfully!");
                    } else {
                        message.error("Failed to send packages. Please try again.");
                    }
                });
            })
            .catch((error) => {
                console.error("Error sending packages:", error);
                message.error("Failed to send packages. Please try again.");
            })
            .finally(() => {
                setLoadingData(false);
            });
    };


    return (
        <div className="min-h-full bg-gray-50">
            <div className="mx-auto p-6">
                {/* Controls Section */}
                <Card className="mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex gap-3 max-w-md w-full" style={{ display: 'flex', alignItems: 'center' }}>
                            <Input
                                placeholder="Search by confirmation, package, email, or status..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchTerm}
                                onChange={searchTransactions}
                                className="flex-1"
                            />
                            <Button
                                type="primary"
                                icon={<SendIcon />}
                                onClick={handlePackageSend}
                                loading={loadingData}
                                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white headerButton customHeaderButton"
                            />
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