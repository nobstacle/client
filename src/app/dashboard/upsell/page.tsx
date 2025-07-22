"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, message, Button, Typography, Space, Select } from "antd";
import { SearchOutlined, SendOutlined, UserOutlined, CalendarOutlined } from "@ant-design/icons";
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

const { Title } = Typography;
const { Option } = Select;

export default function Upsell() {
    const [loadingData, setLoadingData] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMore, setHasMore] = useState(true);
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

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: true,
        },
        {
            title: 'Confirmation',
            dataIndex: 'confirmationNumber',
            key: 'confirmationNumber',
            width: 200,
            render: (confirmationNumber: string) => (
                <span className="font-mono text-xs">{confirmationNumber}</span>
            ),
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
            render: (revenue: number, record: any) => (
                <div>
                    <div className="font-medium">
                        {record.package?.currencies["en"] + " " + revenue?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-green-600">
                        Incentive: {record.package?.currencies["en"] + " " + record.totalIncentive?.toLocaleString() || '0'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Guests',
            key: 'guests',
            width: 100,
            render: (record: any) => (
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
            ),
        },
        {
            title: 'Stay Period',
            key: 'stayPeriod',
            width: 160,
            render: (record: any) => (
                <div className="text-xs">
                    <div>
                        <CalendarOutlined /> Arrival: {new Date(record.arrivalDate).toLocaleDateString()}
                    </div>
                    <div className="text-gray-500">
                        Departure: {new Date(record.departureDate).toLocaleDateString()}
                    </div>
                </div>
            ),
        },
        {
            title: "Status",
            dataIndex: "approved",
            key: "approved",
            width: 100,
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
                    <div className="text-gray-500">ID: {record.soldBy}</div>
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

                emitSendPackages({
                    refId: packageList.length > 0 ? packageList[0].id : 0,
                    langCode: params.get("lang") || companyData?.defaultLangCode || "en",
                    refType: "Packages",
                    station: Number(params.get("station") ?? 1),
                    contentExtra: JSON.stringify(packageList)
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
                        <div className="flex gap-3 max-w-md w-full">
                            <Input
                                placeholder="Search by confirmation, package, email, or status..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchTerm}
                                onChange={searchTransactions}
                                className="flex-1"
                                size="large"
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handlePackageSend}
                                loading={loadingData}
                                size="large"
                                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white headerButton"
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
                            {filteredTransactions.reduce((sum: number, t: any) => sum + (t.totalRevenue || 0), 0).toLocaleString()}
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
                            {filteredTransactions.reduce((sum: number, t: any) => sum + (t.totalIncentive || 0), 0).toLocaleString()}
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
                            scroll={{ x: 1400 }}
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