"use client";
import React, { useState, useEffect } from "react";
import {
    Form,
    Input,
    InputNumber,
    Button,
    Card,
    message,
    Typography,
    Space,
    Table,
    Modal,
    Popconfirm,
    Tag,
    Row,
    Col,
    Select,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ClearOutlined,
    FilterOutlined,
    BankOutlined,
    EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import "../../../styles/base.css";
import 'sweetalert2/dist/sweetalert2.min.css';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = Url + '/api/v1';

interface Company {
    id: number;
    channelId: string;
    name: string;
    logoUrl?: string | null;
    stationCount: number;
    defaultLangCode?: string | null;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        Employees: number;
        Messages: number;
        Recordings: number;
        Package: number;
    };
}

const CompaniesManagement: React.FC = () => {
    const [form] = Form.useForm();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const { data: session } = useSession();
    const router = useRouter();

    // Pagination state
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLangCode, setSelectedLangCode] = useState<string | undefined>(undefined);

    // Debounce search
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch companies when filters, pagination, or search changes
    useEffect(() => {
        if (session?.user?.backendTokens?.at) {
            fetchCompanies();
        }
    }, [
        pagination.current,
        pagination.pageSize,
        debouncedSearchTerm,
        selectedLangCode,
        session?.user?.backendTokens?.at
    ]);

    const fetchCompanies = async () => {
        setTableLoading(true);
        try {
            const skip = (pagination.current - 1) * pagination.pageSize;
            const take = pagination.pageSize;

            // Build query parameters
            const params = new URLSearchParams({
                take: take.toString(),
                skip: skip.toString(),
            });

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            if (selectedLangCode) {
                params.append('langCode', selectedLangCode);
            }

            const response = await fetch(
                `${API_URL}/company/detailed?${params.toString()}`, // Added query params
                {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setCompanies(data.companies || []); // Changed to data.companies
                setPagination(prev => ({
                    ...prev,
                    total: data.totalCount || 0
                }));
            } else {
                message.error('Failed to fetch companies');
            }
        } catch (error) {
            message.error('Error fetching companies');
            console.error(error);
        } finally {
            setTableLoading(false);
        }
    };

    const handleCreateCompany = () => {
        setModalMode('create');
        setEditingCompany(null);
        form.resetFields();
        setFileList([]);
        setIsModalOpen(true);
    };

    const handleEditCompany = (company: Company) => {
        setModalMode('edit');
        setEditingCompany(company);
        form.setFieldsValue({
            name: company.name,
            stationCount: company.stationCount,
            defaultLangCode: company.defaultLangCode || 'en',
        });

        // Set file list if logo exists
        if (company.logoUrl) {
            setFileList([
                {
                    uid: '-1',
                    name: 'logo.png',
                    status: 'done',
                    url: company.logoUrl,
                }
            ]);
        } else {
            setFileList([]);
        }

        setIsModalOpen(true);
    };

    const handleViewCompany = (company: Company) => {
        router.push(`/dashboard/companies/${company.id}`);
    };

    const handleDeleteCompany = async (companyId: number) => {
        try {
            const response = await fetch(`${API_URL}/company/${companyId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                },
            });

            if (response.ok) {
                message.success('Company and all associated users deleted successfully');
                fetchCompanies();
            } else {
                const error = await response.json();
                message.error(error.message || 'Failed to delete company');
            }
        } catch (error) {
            message.error('Error deleting company');
            console.error(error);
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Prepare JSON payload instead of FormData
            const payload = {
                name: values.name,
                stationCount: values.stationCount,
                defaultLangCode: values.defaultLangCode || 'en',
                logoUrl: fileList.length > 0 && fileList[0].url ? fileList[0].url : null, // Handle logo URL
            };

            if (modalMode === 'create') {
                const response = await fetch(`${API_URL}/company`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    message.success('Company created successfully');
                    setIsModalOpen(false);
                    form.resetFields();
                    setFileList([]);
                    fetchCompanies();
                } else {
                    const error = await response.json();
                    message.error(error.message || 'Failed to create company');
                }
            } else {
                const response = await fetch(`${API_URL}/company/${editingCompany?.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    message.success('Company updated successfully');
                    setIsModalOpen(false);
                    form.resetFields();
                    setFileList([]);
                    fetchCompanies();
                } else {
                    const error = await response.json();
                    message.error(error.message || 'Failed to update company');
                }
            }
        } catch (error: any) {
            if (error.errorFields) {
                return;
            }
            message.error(`Error ${modalMode === 'create' ? 'creating' : 'updating'} company`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
        setEditingCompany(null);
        setFileList([]);
    };

    const handleTableChange = (newPagination: any) => {
        setPagination({
            current: newPagination.current,
            pageSize: newPagination.pageSize,
            total: pagination.total,
        });
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleLangCodeFilter = (value: string | undefined) => {
        setSelectedLangCode(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedLangCode(undefined);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const columns: ColumnsType<Company> = [
        {
            title: 'S.No',
            key: 'index',
            width: 80,
            render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
        },
        {
            title: 'Company Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <Text strong>{name}</Text>,
        },
        {
            title: 'Channel ID',
            dataIndex: 'channelId',
            key: 'channelId',
            render: (channelId) => (
                <Text code copyable style={{ fontSize: '12px' }}>
                    {channelId}
                </Text>
            ),
        },
        {
            title: 'Stations',
            dataIndex: 'stationCount',
            key: 'stationCount',
            width: 100,
            align: 'center',
            render: (count) => (
                <Tag color="blue" style={{ fontSize: '14px' }}>
                    {count}
                </Tag>
            ),
        },
        {
            title: 'Default Language',
            dataIndex: 'defaultLangCode',
            key: 'defaultLangCode',
            width: 150,
            align: 'center',
            render: (langCode) => {
                const langNames: { [key: string]: string } = {
                    'en': 'English',
                    'es': 'Spanish',
                    'fr': 'French',
                };
                return (
                    <Tag color="green">
                        {langNames[langCode || 'en'] || langCode || 'en'}
                    </Tag>
                );
            },
        },
        {
            title: 'Employees',
            key: 'employees',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Tag color="purple">
                    {record._count?.Employees || 0}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 160,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="default"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => handleViewCompany(record)}
                    >
                    </Button>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEditCompany(record)}
                        className="primaryButton"
                    >
                    </Button>
                    <Popconfirm
                        title="Delete Company"
                        placement="topRight"
                        description={
                            <div>
                                <p>Are you sure you want to delete this company?</p>
                                <p style={{ color: 'red', marginTop: 8 }}>
                                    This will delete all {record._count?.Employees || 0} employees and associated data!
                                </p>
                            </div>
                        }
                        onConfirm={() => handleDeleteCompany(record.id)}
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const hasActiveFilters = searchTerm || selectedLangCode;

    return (
        <div className="mx-auto mt-2 p-6 bg-white shadow-lg rounded-lg">
            <Card className="p-2 mb-6" bordered={false}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={2} style={{ marginBottom: 8, color: '#374151' }}>
                                <BankOutlined style={{ marginRight: 12 }} />
                                Company Management
                            </Title>
                            <Text type="secondary">
                                Manage all companies in the system
                            </Text>
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={handleCreateCompany}
                            className="primaryButton"
                        >
                            Create New Company
                        </Button>
                    </div>

                    <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

                    {/* Filters Section */}
                    <Card
                        size="small"
                        style={{ backgroundColor: '#f9fafb' }}
                        title={
                            <Space>
                                <FilterOutlined />
                                <span>Filters & Search</span>
                            </Space>
                        }
                        extra={
                            hasActiveFilters && (
                                <Button
                                    type="link"
                                    icon={<ClearOutlined />}
                                    onClick={handleClearFilters}
                                    danger
                                >
                                    Clear All
                                </Button>
                            )
                        }
                    >
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={24} md={16} lg={16}>
                                <Search
                                    placeholder="Search by company name or channel ID"
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                    size="large"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onSearch={handleSearch}
                                    loading={tableLoading}
                                />
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={8}>
                                <Select
                                    placeholder="Filter by Language"
                                    allowClear
                                    size="large"
                                    style={{ width: '100%' }}
                                    value={selectedLangCode}
                                    onChange={handleLangCodeFilter}
                                >
                                    <Option value="en">English</Option>
                                    <Option value="es">Spanish</Option>
                                    <Option value="fr">French</Option>
                                </Select>
                            </Col>
                        </Row>

                        {hasActiveFilters && (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary">Active Filters: </Text>
                                {searchTerm && <Tag closable onClose={() => setSearchTerm('')}>Search: {searchTerm}</Tag>}
                                {selectedLangCode && (
                                    <Tag closable onClose={() => setSelectedLangCode(undefined)}>
                                        Language: {selectedLangCode === 'en' ? 'English' : selectedLangCode === 'es' ? 'Spanish' : 'French'}
                                    </Tag>
                                )}
                            </div>
                        )}
                    </Card>

                    <Table
                        columns={columns}
                        dataSource={companies}
                        loading={tableLoading}
                        rowKey="id"
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} companies`,
                            pageSizeOptions: ['10', '20', '50', '100'],
                        }}
                        onChange={handleTableChange}
                        scroll={{ x: 1200 }}
                    />
                </Space>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={
                    <Space>
                        <BankOutlined />
                        {modalMode === 'create' ? 'Create New Company' : 'Edit Company'}
                    </Space>
                }
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={loading}
                width={700}
                okText={modalMode === 'create' ? 'Create' : 'Update'}
                className="companyModal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    autoComplete="off"
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Company Name"
                                name="name"
                                rules={[
                                    { required: true, message: 'Please input company name!' },
                                    { min: 2, message: 'Company name must be at least 2 characters!' }
                                ]}
                            >
                                <Input
                                    prefix={<BankOutlined style={{ color: '#9ca3af' }} />}
                                    placeholder="Enter company name"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Station Count"
                                name="stationCount"
                                rules={[
                                    { required: true, message: 'Please input station count!' },
                                    { type: 'number', min: 1, message: 'Must be at least 1!' }
                                ]}
                            >
                                <InputNumber
                                    placeholder="Enter station count"
                                    style={{ width: '100%' }}
                                    size="large"
                                    min={1}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Default Language"
                                name="defaultLangCode"
                                initialValue="en"
                                rules={[{ required: true, message: 'Please select default language!' }]}
                            >
                                <Select
                                    placeholder="Select default language"
                                    size="large"
                                >
                                    <Option value="en">English</Option>
                                    <Option value="es">Spanish</Option>
                                    <Option value="fr">French</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default CompaniesManagement;