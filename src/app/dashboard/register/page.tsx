"use client";
import React, { useState, useEffect } from "react";
import {
    Form,
    Input,
    Button,
    Card,
    message,
    Typography,
    Space,
    Table,
    Modal,
    Select,
    Popconfirm,
    Tag,
    Row,
    Col
} from 'antd';
import {
    MailOutlined,
    LockOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ClearOutlined,
    FilterOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import "../../../styles/base.css";
import 'sweetalert2/dist/sweetalert2.min.css';
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || Url + '/api/v1';

interface User {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    companyId?: number;
    companyName?: string;
    Roles: string[];
}

interface Company {
    id: number;
    name: string;
}

const RegisterUsers: React.FC = () => {
    const [form] = Form.useForm();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const { data: session } = useSession();

    // Pagination state
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
    const [selectedCompany, setSelectedCompany] = useState<number | undefined>(undefined);

    // Debounce search
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const abortControllerRef = React.useRef<AbortController | null>(null);

    // Fetch users when filters, pagination, or search changes
    useEffect(() => {
        if (session?.user?.backendTokens?.at) {
            fetchUsers();
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [
        pagination.current,
        pagination.pageSize,
        debouncedSearchTerm,
        selectedRole,
        selectedCompany,
        session?.user?.backendTokens?.at
    ]);

    // Fetch companies on mount
    useEffect(() => {
        if (session?.user?.backendTokens?.at) {
            fetchCompanies();
        }
    }, [session?.user?.backendTokens?.at]);

    const fetchUsers = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

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

            if (selectedRole) {
                params.append('role', selectedRole);
            }

            if (selectedCompany) {
                params.append('companyId', selectedCompany.toString());
            }

            const response = await fetch(
                `${API_URL}/superAdmin/users?${params.toString()}`,
                {
                    signal: abortController.signal,
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
                setPagination(prev => ({
                    ...prev,
                    total: data.totalCount || 0
                }));
            } else {
                message.error('Failed to fetch users');
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                return;
            }
            message.error('Error fetching users');
            console.error(error);
        } finally {
            if (abortControllerRef.current === abortController) {
                setTableLoading(false);
            }
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await fetch(`${API_URL}/superAdmin/companies`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCompanies(data);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const handleCreateUser = () => {
        setModalMode('create');
        setEditingUser(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setModalMode('edit');
        setEditingUser(user);
        form.setFieldsValue({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            companyId: user.companyId,
            Roles: user.Roles?.[0],
        });
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            const response = await fetch(`${API_URL}/superAdmin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                },
            });

            if (response.ok) {
                message.success('User deleted successfully');
                fetchUsers();
            } else {
                const error = await response.json();
                message.error(error.message || 'Failed to delete user');
            }
        } catch (error) {
            message.error('Error deleting user');
            console.error(error);
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const userData: any = {
                email: values.email,
                firstName: values.firstName,
                lastName: values.lastName,
                Roles: values.Roles,
                companyId: values.companyId ? parseInt(values.companyId) : undefined,
            };

            if (modalMode === 'create') {
                userData.password = values.password;

                const response = await fetch(`${API_URL}/superAdmin/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`,
                    },
                    credentials: 'include',
                    body: JSON.stringify(userData),
                });

                if (response.ok) {
                    message.success('User created successfully');
                    setIsModalOpen(false);
                    form.resetFields();
                    fetchUsers();
                } else {
                    const error = await response.json();
                    message.error(error.message || 'Failed to create user');
                }
            } else {
                delete userData.password;

                const response = await fetch(`${API_URL}/superAdmin/users/${editingUser?.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`,
                    },
                    credentials: 'include',
                    body: JSON.stringify(userData),
                });

                if (response.ok) {
                    message.success('User updated successfully');
                    setIsModalOpen(false);
                    form.resetFields();
                    fetchUsers();
                } else {
                    const error = await response.json();
                    message.error(error.message || 'Failed to update user');
                }
            }
        } catch (error: any) {
            if (error.errorFields) {
                return;
            }
            message.error(`Error ${modalMode === 'create' ? 'creating' : 'updating'} user`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
        setEditingUser(null);
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

    const handleRoleFilter = (value: string | undefined) => {
        setSelectedRole(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleCompanyFilter = (value: number | undefined) => {
        setSelectedCompany(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedRole(undefined);
        setSelectedCompany(undefined);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const columns: ColumnsType<User> = [
        {
            title: 'S.No',
            key: 'index',
            width: 80,
            render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email) => <Text strong>{email}</Text>,
        },
        {
            title: 'Name',
            key: 'name',
            render: (_, record) => {
                const fullName = [record.firstName, record.lastName]
                    .filter(Boolean)
                    .join(' ');
                return fullName || <Tag color="default">No Name</Tag>;
            },
        },
        {
            title: 'Company',
            dataIndex: 'companyName',
            key: 'companyName',
            render: (companyName) => companyName || <Tag color="default">No Company</Tag>,
        },
        {
            title: 'Role',
            dataIndex: 'Roles',
            key: 'Roles',
            render: (roles: string[]) => (
                <>
                    {roles?.map((role) => {
                        let color = 'blue';
                        if (role === 'Admin') color = 'red';
                        if (role === 'SAdmin') color = 'purple';
                        if (role === 'Staff') color = 'green';
                        return (
                            <Tag color={color} key={role}>
                                {role === 'Staff' ? 'CLIENT' : role.toUpperCase()}
                            </Tag>
                        );
                    })}
                </>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEditUser(record)}
                        className="primaryButton"
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete User"
                        description="Are you sure you want to delete this user?"
                        onConfirm={() => handleDeleteUser(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const hasActiveFilters = searchTerm || selectedRole || selectedCompany;

    return (
        <div className="p-6 bg-gray-50 w-full min-h-full">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Title level={2} className="!mb-1" style={{ color: '#374151' }}>
                        User Management
                    </Title>
                    <Text className="text-gray-500">Manage all users in the system</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleCreateUser}
                    className="primaryButton"
                >
                    Create New User
                </Button>
            </div>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                <Card
                    size="small"
                    bordered={false}
                    className="shadow-sm"
                    style={{ backgroundColor: '#ffffff' }}
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
                            <Col xs={24} sm={24} md={12} lg={10}>
                                <Search
                                    placeholder="Search by email, first name, or last name"
                                    allowClear
                                    enterButton={<SearchOutlined />}
                                    size="large"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onSearch={handleSearch}
                                    loading={tableLoading}
                                />
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={7}>
                                <Select
                                    placeholder="Filter by Role"
                                    allowClear
                                    size="large"
                                    style={{ width: '100%' }}
                                    value={selectedRole}
                                    onChange={handleRoleFilter}
                                >
                                    <Option value="SAdmin">Super Admin</Option>
                                    <Option value="Admin">Admin</Option>
                                    <Option value="Staff">Staff</Option>
                                    <Option value="User">User</Option>
                                </Select>
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={7}>
                                <Select
                                    placeholder="Filter by Company"
                                    allowClear
                                    size="large"
                                    style={{ width: '100%' }}
                                    value={selectedCompany}
                                    onChange={handleCompanyFilter}
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {companies.map((company) => (
                                        <Option key={company.id} value={company.id}>
                                            {company.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>

                        {hasActiveFilters && (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary">Active Filters: </Text>
                                {searchTerm && <Tag closable onClose={() => setSearchTerm('')}>Search: {searchTerm}</Tag>}
                                {selectedRole && <Tag closable onClose={() => setSelectedRole(undefined)}>Role: {selectedRole}</Tag>}
                                {selectedCompany && (
                                    <Tag closable onClose={() => setSelectedCompany(undefined)}>
                                        Company: {companies.find(c => c.id === selectedCompany)?.name}
                                    </Tag>
                                )}
                            </div>
                        )}
                    </Card>

                <Card bordered={false} className="shadow-sm">
                    <Table
                        columns={columns}
                        dataSource={users}
                        loading={tableLoading}
                        rowKey="id"
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} users`,
                            pageSizeOptions: ['10', '20', '50', '100'],
                        }}
                        onChange={handleTableChange}
                        scroll={{ x: 800 }}
                    />
                </Card>
            </Space>

            <Modal
                title={modalMode === 'create' ? 'Create New User' : 'Edit User'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={loading}
                width={600}
                okText={modalMode === 'create' ? 'Create' : 'Update'}
            >
                <Form
                    form={form}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label="Email Address"
                        name="email"
                        rules={[
                            { required: true, message: 'Please input email!' },
                            { type: 'email', message: 'Please enter a valid email!' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="user@example.com"
                            disabled={modalMode === 'edit'}
                        />
                    </Form.Item>

                    <Form.Item
                        label="First Name"
                        name="firstName"
                        rules={[{ required: false }]}
                    >
                        <Input
                            placeholder="Enter first name"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Last Name"
                        name="lastName"
                        rules={[{ required: false }]}
                    >
                        <Input
                            placeholder="Enter last name"
                        />
                    </Form.Item>

                    {modalMode === 'create' && (
                        <>
                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[
                                    { required: true, message: 'Please input password!' },
                                    { min: 6, message: 'Password must be at least 6 characters!' }
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                                    placeholder="Enter password"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Confirm Password"
                                name="confirmPassword"
                                dependencies={['password']}
                                rules={[
                                    { required: true, message: 'Please confirm password!' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Passwords do not match!'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                                    placeholder="Confirm password"
                                />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        label="Company"
                        name="companyId"
                        rules={[{ required: false }]}
                    >
                        <Select
                            placeholder="Select a company"
                            allowClear
                        >
                            {companies.map((company) => (
                                <Option key={company.id} value={company.id}>
                                    {company.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Role"
                        name="Roles"
                        rules={[{ required: true, message: 'Please select a role!' }]}
                    >
                        <Select
                            placeholder="Select role"
                            options={[
                                { label: 'Admin', value: 'Admin' },
                                { label: 'Client', value: 'Staff' },
                                { label: 'User', value: 'User' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RegisterUsers;