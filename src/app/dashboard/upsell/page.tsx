"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, message, Button, Typography } from "antd";
import { SearchOutlined, SendOutlined } from "@ant-design/icons";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";
import "../../../styles/base.css";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import {
    useCompanyControllerGetCompany,
} from "../../../lib/client/api";
import { SendPackagePayloadType } from "../../../constant/types";

const { Title } = Typography;

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

    const handlePageChange = (page: number, pageSize: number) => {
        setCurrentPage(page);
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

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

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: true,
        },
        {
            title: 'Transaction',
            dataIndex: 'transaction',
            key: 'transaction',
            width: 200,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 120,
            render: (amount: number) => `$${amount?.toFixed(2) || '0.00'}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
                    {status?.toUpperCase() || 'UNKNOWN'}
                </Tag>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date: string) => new Date(date).toLocaleDateString(),
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
                        <div className="flex-1 max-w-md">
                            <Input
                                placeholder="Search transactions..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchTerm}
                                onChange={searchTransactions}
                                className="w-full"
                                size="large"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handlePackageSend}
                                loading={loadingData}
                                size="large"
                                className="flex items-center"
                            >
                                Send Packages
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Table Section */}
                <Card className="shadow-sm">
                    <div className="overflow-hidden">
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={Array.isArray(transactions) ? transactions : []}
                            pagination={false}
                            loading={loadingData}
                            scroll={{ x: 1200 }}
                            className="w-full"
                            size="middle"
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