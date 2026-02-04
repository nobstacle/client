"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Card,
    message,
    Typography,
    Space,
    Table,
    Tag,
    Row,
    Col,
    Tabs,
    Spin,
    Button,
    Statistic,
    Image as AntImage,
    Descriptions,
    Empty
} from 'antd';
import {
    BankOutlined,
    UserOutlined,
    ShoppingOutlined,
    ArrowLeftOutlined,
    EditOutlined,
    ThunderboltOutlined,
    FolderOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from "next-auth/react";
import "../../../../styles/base.css";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = Url + '/api/v1';

interface Employee {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    Roles: string[];
    createdAt: string;
    updatedAt: string;
}

interface Package {
    id: number;
    packageCode: string;
    originalPrice: string;
    discountedPrice: string;
    active: boolean;
    packageNames: { [key: string]: string };
    totalPackagesSold: number;
    createdAt: string;
}

interface Shortcut {
    id: number;
    key: string | null;
    value: string;
    type: string;
    order: number | null;
}

interface Templates {
    id: number;
    companyId: number;
    _count: {
        Documents: number;
        Images: number;
        Maps: number;
        SlideShows: number;
        TeamDocuments: number;
        Texts: number;
        Videos: number;
        Website: number;
    };
}

interface CompanyDetails {
    id: number;
    channelId: string;
    name: string;
    logoUrl?: string | null;
    stationCount: number;
    defaultLangCode?: string | null;
    Employees: Employee[];
    Templates?: Templates;
    Package: Package[];
    Shortcuts: Shortcut[];
    _count: {
        Employees: number;
        Messages: number;
        Package: number;
        SurveyAnswer: number;
        Shortcuts: number;
        reminders: number;
        HandoverNotes: number;
        Information: number;
        Recordings?: number;
    };
}

const CompanyDetailsPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [company, setCompany] = useState<CompanyDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const companyId = params?.id as string;

    useEffect(() => {
        if (session?.user?.backendTokens?.at && companyId) {
            fetchCompanyDetails();
        }
    }, [session?.user?.backendTokens?.at, companyId]);

    const fetchCompanyDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_URL}/company/${companyId}/details`,
                {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.backendTokens?.at}`
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setCompany(data);
            } else {
                message.error('Failed to fetch company details');
                router.push('/dashboard/companies');
            }
        } catch (error) {
            message.error('Error fetching company details');
            console.error(error);
            router.push('/dashboard/companies');
        } finally {
            setLoading(false);
        }
    };

    const employeeColumns: ColumnsType<Employee> = [
        {
            title: 'S.No',
            key: 'index',
            width: 70,
            render: (_, __, index) => index + 1,
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
                                {role.toUpperCase()}
                            </Tag>
                        );
                    })}
                </>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleDateString(),
        },
    ];

    const packageColumns: ColumnsType<Package> = [
        {
            title: 'S.No',
            key: 'index',
            width: 70,
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Package Code',
            dataIndex: 'packageCode',
            key: 'packageCode',
            render: (code) => <Tag color="blue">{code}</Tag>,
        },
        {
            title: 'Package Name',
            dataIndex: 'packageNames',
            key: 'packageNames',
            render: (names: { [key: string]: string }) => (
                <Text>{names?.en || Object.values(names)[0] || 'N/A'}</Text>
            ),
        },
        {
            title: 'Original Price',
            dataIndex: 'originalPrice',
            key: 'originalPrice',
            render: (price) => <Text>${price}</Text>,
        },
        {
            title: 'Discounted Price',
            dataIndex: 'discountedPrice',
            key: 'discountedPrice',
            render: (price) => <Text strong type="success">${price}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active) => (
                <Tag color={active ? 'green' : 'red'}>
                    {active ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Total Sold',
            dataIndex: 'totalPackagesSold',
            key: 'totalPackagesSold',
            render: (sold) => <Tag color="purple">{sold || 0}</Tag>,
        },
    ];

    const shortcutColumns: ColumnsType<Shortcut> = [
        {
            title: 'S.No',
            key: 'index',
            width: 70,
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Key',
            dataIndex: 'key',
            key: 'key',
            render: (key) => key ? <Tag>{key}</Tag> : <Tag color="default">N/A</Tag>,
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: 'Order',
            dataIndex: 'order',
            key: 'order',
            render: (order) => order !== null ? order : 'N/A',
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="Loading company details..." />
            </div>
        );
    }

    if (!company) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <Empty description="Company not found" />
                <Button type="primary" onClick={() => router.push('/dashboard/companies')}>
                    Back to Companies
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-2 p-6 bg-white shadow-lg rounded-lg">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.push('/dashboard/companies')}
                        >
                            Back
                        </Button>
                        <Title level={2} style={{ margin: 0 }}>
                            <BankOutlined style={{ marginRight: 12 }} />
                            {company.name}
                        </Title>
                    </Space>
                    {/* <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/dashboard/companies/edit/${companyId}`)}
                        className="primaryButton"
                    >
                        Edit Company
                    </Button> */}
                </div>

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

                {/* Company Overview */}
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={8}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 150,
                                    height: 150,
                                    backgroundColor: '#f0f0f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    margin: '0 auto'
                                }}>
                                    <BankOutlined style={{ fontSize: 60, color: '#999' }} />
                                </div>
                            </div>

                            <Descriptions column={1} style={{ marginTop: 24 }} bordered size="small">
                                <Descriptions.Item label="Company Name">
                                    <Text strong>{company.name}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Channel ID">
                                    <Text code copyable style={{ fontSize: '12px' }}>
                                        {company.channelId}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Station Count">
                                    <Tag color="blue" style={{ fontSize: '14px' }}>
                                        {company.stationCount}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Default Language">
                                    <Tag color="green">
                                        {company.defaultLangCode === 'en' ? 'English' :
                                            company.defaultLangCode === 'es' ? 'Spanish' :
                                                company.defaultLangCode === 'fr' ? 'French' :
                                                    company.defaultLangCode || 'English'}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Col>

                    <Col xs={24} md={16}>
                        <Row gutter={[16, 16]}>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Employees"
                                        value={company._count.Employees}
                                        prefix={<UserOutlined />}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Packages"
                                        value={company._count.Package}
                                        prefix={<ShoppingOutlined />}
                                        valueStyle={{ color: '#722ed1' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Messages"
                                        value={company._count.Messages}
                                        prefix={<ThunderboltOutlined />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Survey Answers"
                                        value={company._count.SurveyAnswer}
                                        prefix={<BarChartOutlined />}
                                        valueStyle={{ color: '#faad14' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Shortcuts"
                                        value={company._count.Shortcuts}
                                        prefix={<ThunderboltOutlined />}
                                        valueStyle={{ color: '#13c2c2' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Recordings"
                                        value={company._count.Recordings || 0}
                                        prefix={<FolderOutlined />}
                                        valueStyle={{ color: '#eb2f96' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Reminders"
                                        value={company._count.reminders}
                                        valueStyle={{ color: '#fa8c16' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Handover Notes"
                                        value={company._count.HandoverNotes}
                                        valueStyle={{ color: '#2f54eb' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={8}>
                                <Card>
                                    <Statistic
                                        title="Information"
                                        value={company._count.Information}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                {company.Templates && (
                    <Card title="Template Statistics" style={{ marginTop: 16 }}>
                        <Row gutter={[8, 8]}>
                            <Col span={6}>
                                <Statistic title="Documents" value={company.Templates._count.Documents} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Images" value={company.Templates._count.Images} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Videos" value={company.Templates._count.Videos} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Maps" value={company.Templates._count.Maps} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Slideshows" value={company.Templates._count.SlideShows} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Texts" value={company.Templates._count.Texts} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Websites" value={company.Templates._count.Website} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="Team Docs" value={company.Templates._count.TeamDocuments} />
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* Tabs for detailed information */}
                <Card>
                    <Tabs defaultActiveKey="employees">
                        <TabPane
                            tab={
                                <span>
                                    <UserOutlined />
                                    Employees ({company.Employees.length})
                                </span>
                            }
                            key="employees"
                        >
                            <Table
                                columns={employeeColumns}
                                dataSource={company.Employees}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Total ${total} employees`,
                                }}
                                scroll={{ x: 800 }}
                            />
                        </TabPane>

                        <TabPane
                            tab={
                                <span>
                                    <ShoppingOutlined />
                                    Packages ({company.Package.length})
                                </span>
                            }
                            key="packages"
                        >
                            <Table
                                columns={packageColumns}
                                dataSource={company.Package}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Total ${total} packages`,
                                }}
                                scroll={{ x: 1000 }}
                            />
                        </TabPane>

                        <TabPane
                            tab={
                                <span>
                                    <ThunderboltOutlined />
                                    Shortcuts ({company.Shortcuts.length})
                                </span>
                            }
                            key="shortcuts"
                        >
                            <Table
                                columns={shortcutColumns}
                                dataSource={company.Shortcuts}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Total ${total} shortcuts`,
                                }}
                            />
                        </TabPane>
                    </Tabs>
                </Card>
            </Space>
        </div>
    );
};

export default CompanyDetailsPage;