"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, PlusOutlined, PoweroffOutlined, ReloadOutlined } from "@ant-design/icons";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;
const { Option } = Select;

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || Url + "/api/v1";

interface CompanyOption {
    id: number;
    name: string;
}

interface WhatsappMetaAssignmentRow {
    companyId: number;
    companyName: string;
    connected: boolean;
    appId?: string;
    businessAccountId?: string;
    phoneNumberId?: string;
    hasAccessToken: boolean;
    webhookVerifyToken?: string;
}

interface AssignWhatsappMetaFormValues {
    companyId: number;
    appId?: string;
    appSecret?: string;
    businessAccountId?: string;
    phoneNumberId: string;
    accessToken: string;
    webhookVerifyToken?: string;
}

export default function WhatsappMetaAccountsPage() {
    const { data: session } = useSession();
    const token = session?.user?.backendTokens?.at;

    const [form] = Form.useForm<AssignWhatsappMetaFormValues>();
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [rows, setRows] = useState<WhatsappMetaAssignmentRow[]>([]);
    const [tableLoading, setTableLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingRow, setEditingRow] = useState<WhatsappMetaAssignmentRow | null>(null);
    const [saving, setSaving] = useState(false);

    const assignedCompanyIds = useMemo(() => new Set(rows.map((r) => r.companyId)), [rows]);

    const fetchCompanies = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/superAdmin/companies`, {
                method: "GET",
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                message.error("Failed to load companies");
                return;
            }
            const data = await res.json();
            setCompanies(
                (Array.isArray(data) ? data : []).map((c: any) => ({ id: c.id, name: c.name }))
            );
        } catch (err) {
            console.error(err);
            message.error("Error loading companies");
        }
    };

    const fetchAssignments = async () => {
        if (!token) return;
        setTableLoading(true);
        try {
            const res = await fetch(`${API_URL}/superAdmin/whatsapp-meta-accounts`, {
                method: "GET",
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                message.error("Failed to load assigned WhatsApp Meta accounts");
                return;
            }
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            message.error("Error loading assigned WhatsApp Meta accounts");
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchCompanies();
        fetchAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const openCreate = () => {
        setModalMode("create");
        setEditingRow(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (row: WhatsappMetaAssignmentRow) => {
        setModalMode("edit");
        setEditingRow(row);
        form.setFieldsValue({
            companyId: row.companyId,
            appId: row.appId,
            businessAccountId: row.businessAccountId,
            phoneNumberId: row.phoneNumberId,
            webhookVerifyToken: row.webhookVerifyToken,
            appSecret: "",
            accessToken: "",
        } as any);
        setModalOpen(true);
    };

    const handleAssign = async () => {
        if (!token) return;
        const values = await form.validateFields();
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/superAdmin/whatsapp-meta-accounts`, {
                method: "POST",
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                message.error(error?.message || "Failed to assign WhatsApp Meta account");
                return;
            }

            message.success("WhatsApp Meta account assigned successfully");
            setModalOpen(false);
            form.resetFields();
            fetchAssignments();
        } catch (err) {
            console.error(err);
            message.error("Error assigning WhatsApp Meta account");
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async (companyId: number) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/superAdmin/whatsapp-meta-accounts/${companyId}`, {
                method: "DELETE",
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                message.error(error?.message || "Failed to disconnect WhatsApp Meta account");
                return;
            }
            message.success("WhatsApp Meta account disconnected");
            fetchAssignments();
        } catch (err) {
            console.error(err);
            message.error("Error disconnecting WhatsApp Meta account");
        }
    };

    const columns: ColumnsType<WhatsappMetaAssignmentRow> = useMemo(
        () => [
            {
                title: "Company",
                dataIndex: "companyName",
                key: "companyName",
            },
            {
                title: "Status",
                key: "connected",
                render: (_, r) => (r.connected ? <Tag color="green">Connected</Tag> : <Tag>Not connected</Tag>),
            },
            {
                title: "WABA ID",
                dataIndex: "businessAccountId",
                key: "businessAccountId",
                render: (v) => v || <Text type="secondary">—</Text>,
            },
            {
                title: "Phone Number ID",
                dataIndex: "phoneNumberId",
                key: "phoneNumberId",
                render: (v) => v || <Text type="secondary">—</Text>,
            },
            {
                title: "App ID",
                dataIndex: "appId",
                key: "appId",
                render: (v) => v || <Text type="secondary">—</Text>,
            },
            {
                title: "Access Token",
                dataIndex: "hasAccessToken",
                key: "hasAccessToken",
                render: (v: boolean) => (v ? <Tag color="blue">Set</Tag> : <Tag>Missing</Tag>),
            },
            {
                title: "Webhook Token",
                dataIndex: "webhookVerifyToken",
                key: "webhookVerifyToken",
                render: (v) => (v ? <Tag color="blue">Set</Tag> : <Tag>Missing</Tag>),
            },
            {
                title: "Actions",
                key: "actions",
                render: (_, r) => (
                    <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                            Edit
                        </Button>
                        <Popconfirm
                            title="Disconnect WhatsApp Meta from this company?"
                            okText="Disconnect"
                            cancelText="Cancel"
                            onConfirm={() => handleDisconnect(r.companyId)}
                        >
                            <Button danger size="small" icon={<PoweroffOutlined />}>
                                Disconnect
                            </Button>
                        </Popconfirm>
                    </Space>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rows, companies, token]
    );

    const companyOptions =
        modalMode === "create"
            ? companies.filter((c) => !assignedCompanyIds.has(c.id))
            : companies;

    return (
        <Card>
            <div className="flex items-center justify-between">
                <div>
                    <Title level={4} style={{ marginBottom: 0 }}>
                        WhatsApp Meta Accounts
                    </Title>
                    <Text type="secondary">Assign Meta WhatsApp credentials to companies.</Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchAssignments}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Add New
                    </Button>
                </Space>
            </div>

            <div style={{ marginTop: 16 }}>
                <Table
                    rowKey={(r) => String(r.companyId)}
                    loading={tableLoading}
                    columns={columns}
                    dataSource={rows}
                    className="superAdminTable"
                    pagination={{ pageSize: 10 }}
                />
            </div>

            <Modal
                title={modalMode === "create" ? "Assign WhatsApp Meta Account" : "Update WhatsApp Meta Account"}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleAssign}
                okText={modalMode === "create" ? "Assign" : "Update"}
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={form} layout="vertical" preserve={false}>
                    <Form.Item
                        label="Company"
                        name="companyId"
                        rules={[{ required: true, message: "Please select a company" }]}
                    >
                        <Select
                            placeholder="Select company"
                            showSearch
                            optionFilterProp="children"
                            disabled={modalMode === "edit"}
                            filterOption={(input, option) =>
                                String(option?.children ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        >
                            {companyOptions.map((c) => (
                                <Option key={c.id} value={c.id}>
                                    {c.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Meta App ID (optional)" name="appId">
                        <Input placeholder="e.g. 1234567890" />
                    </Form.Item>

                    <Form.Item label="Meta App Secret (optional)" name="appSecret">
                        <Input.Password placeholder="Enter app secret" />
                    </Form.Item>

                    <Form.Item label="WhatsApp Business Account ID (optional)" name="businessAccountId">
                        <Input placeholder="WABA ID" />
                    </Form.Item>

                    <Form.Item
                        label="Phone Number ID"
                        name="phoneNumberId"
                        rules={[{ required: true, message: "Phone Number ID is required" }]}
                    >
                        <Input placeholder="Phone Number ID" />
                    </Form.Item>

                    <Form.Item
                        label="Access Token"
                        name="accessToken"
                        rules={[{ required: true, message: "Access token is required" }]}
                    >
                        <Input.Password placeholder="Enter permanent access token" />
                    </Form.Item>

                    <Form.Item label="Webhook Verify Token (optional)" name="webhookVerifyToken">
                        <Input placeholder="Webhook verify token" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
