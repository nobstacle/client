"use client";
import { useState, useEffect } from "react";
import {
    Table, Tag, Card, Input, message, Button, Space, Select, Modal,
    Tabs, Upload, Steps, Form, Progress, Badge, Tooltip,
    Row, Col, Avatar, Popconfirm, DatePicker
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
    SearchOutlined, PlusOutlined, SendOutlined, UploadOutlined,
    FileTextOutlined, UserOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ClockCircleOutlined, EyeOutlined, EditOutlined,
    DeleteOutlined, TeamOutlined,
    BarChartOutlined,
    ReloadOutlined,
    CloudUploadOutlined, FormOutlined, VideoCameraOutlined, PictureOutlined,
    AppstoreOutlined, CalendarOutlined, ThunderboltOutlined
} from "@ant-design/icons";
import { MdWhatsapp } from "react-icons/md";
import { FaFileDownload } from "react-icons/fa";
import dayjs, { Dayjs } from "dayjs";
import { useSession } from "next-auth/react";

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Step } = Steps;
const { Dragger } = Upload;

const API_URL = (() => {
    const raw = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
    if (!raw) return undefined;
    const trimmed = raw.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
})();

interface ContactList {
    id: number;
    name: string;
    count: number;
    source: "csv" | "form";
    createdAt: string;
    tags?: string[];
}

interface ContactImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

interface Template {
    id: number;
    name: string;
    type: "text" | "image" | "video" | "carousel";
    status: "pending" | "approved" | "rejected";
    content: string;
    variables?: string[];
    mediaUrl?: string;
    createdAt: string;
}

interface Campaign {
    id: number;
    name: string;
    templateId: number;
    templateName: string;
    contactListId: number;
    contactListName: string;
    status: "draft" | "scheduled" | "sending" | "completed" | "failed";
    scheduledAt?: string;
    sentAt?: string;
    stats: {
        total: number;
        sent: number;
        delivered: number;
        failed: number;
    };
    createdAt: string;
}

interface CampaignStats {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: string;
}

interface MetaConnectionStatus {
    connected: boolean;
    appId?: string;
    businessAccountId?: string;
    phoneNumberId?: string;
    hasAccessToken: boolean;
    webhookVerifyToken?: string;
}

const defaultCampaignStats: CampaignStats = {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    deliveryRate: "0%",
};

const StatusTag = ({ status }: { status: string }) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        approved: { color: "success", icon: <CheckCircleOutlined />, label: "Approved" },
        pending: { color: "warning", icon: <ClockCircleOutlined />, label: "Pending" },
        rejected: { color: "error", icon: <CloseCircleOutlined />, label: "Rejected" },
        completed: { color: "success", icon: <CheckCircleOutlined />, label: "Completed" },
        sending: { color: "processing", icon: <SendOutlined />, label: "Sending" },
        scheduled: { color: "default", icon: <CalendarOutlined />, label: "Scheduled" },
        draft: { color: "default", icon: <EditOutlined />, label: "Draft" },
        failed: { color: "error", icon: <CloseCircleOutlined />, label: "Failed" },
    };
    const cfg = map[status] || { color: "default", icon: null, label: status };
    return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
};

const TemplateTypeIcon = ({ type }: { type: string }) => {
    const icons: Record<string, React.ReactNode> = {
        text: <FileTextOutlined className="text-blue-500" />,
        image: <PictureOutlined className="text-green-500" />,
        video: <VideoCameraOutlined className="text-purple-500" />,
        carousel: <AppstoreOutlined className="text-orange-500" />,
    };
    return <span>{icons[type] || <FileTextOutlined />}</span>;
};

const WhatsAppPreview = ({ content, type }: { content: string; type: string }) => (
    <div className="flex justify-center py-4">
        <div
            className="relative rounded-3xl shadow-2xl overflow-hidden"
            style={{ width: 280, background: "#1a1a2e", border: "8px solid #2d2d44" }}
        >
            <div className="flex justify-between items-center px-4 py-1 text-white text-xs" style={{ background: "#128C7E" }}>
                <span className="font-semibold">9:41</span>
                <div className="flex gap-1 items-center"><span>●●●</span></div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2" style={{ background: "#128C7E" }}>
                <Avatar size={36} style={{ background: "#075E54" }} icon={<MdWhatsapp />} />
                <div>
                    <div className="text-white text-sm font-semibold">Your Hotel</div>
                    <div className="text-green-100 text-xs">Business Account</div>
                </div>
            </div>
            <div className="p-3 min-h-40" style={{ background: "#ECE5DD" }}>
                {type === "image" && (
                    <div className="rounded-lg mb-2 overflow-hidden" style={{ background: "#d0c8c0", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PictureOutlined style={{ fontSize: 36, color: "#999" }} />
                    </div>
                )}
                {type === "video" && (
                    <div className="rounded-lg mb-2 overflow-hidden" style={{ background: "#d0c8c0", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <VideoCameraOutlined style={{ fontSize: 36, color: "#999" }} />
                    </div>
                )}
                <div className="rounded-lg rounded-tl-none p-3 text-sm shadow-sm max-w-full" style={{ background: "#fff", color: "#333" }}>
                    <p className="m-0 leading-relaxed" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {content || "Your message preview will appear here..."}
                    </p>
                    <div className="flex justify-end mt-1">
                        <span className="text-gray-400" style={{ fontSize: 10 }}>{dayjs().format("HH:mm")} ✓✓</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#F0F0F0" }}>
                <div className="flex-1 rounded-full bg-white px-3 py-1 text-gray-400 text-xs">Type a message</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#128C7E" }}>
                    <SendOutlined style={{ color: "white", fontSize: 12 }} />
                </div>
            </div>
        </div>
    </div>
);

const parseErrorMessage = (error: any) => {
    if (error instanceof Error) return error.message;
    return "Something went wrong";
};

export default function WhatsAppPage() {
    const { data: session } = useSession();
    const token = session?.user?.backendTokens?.at;

    const [activeTab, setActiveTab] = useState("contacts");
    const [contactLists, setContactLists] = useState<ContactList[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<CampaignStats>(defaultCampaignStats);
    const [metaConnection, setMetaConnection] = useState<MetaConnectionStatus>({
        connected: false,
        hasAccessToken: false,
    });

    console.info("!111111111111111111111111111111111111111111111", metaConnection);

    const metaConnected = metaConnection.connected || (metaConnection.hasAccessToken && Boolean(metaConnection.phoneNumberId));

    const [contactSearch, setContactSearch] = useState("");
    const [templateSearch, setTemplateSearch] = useState("");
    const [templateStatusFilter, setTemplateStatusFilter] = useState<string | undefined>();
    const [templateTypeFilter, setTemplateTypeFilter] = useState<string | undefined>();

    const [loading, setLoading] = useState(false);

    const [contactModal, setContactModal] = useState(false);
    const [contactSource, setContactSource] = useState<"csv" | "form" | null>(null);
    const [contactForm, setContactForm] = useState({ name: "", tags: "", formId: "" });
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [templateModal, setTemplateModal] = useState(false);
    const [templatePreviewModal, setTemplatePreviewModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [newTemplate, setNewTemplate] = useState({ name: "", type: "text", content: "", mediaUrl: "" });

    const [campaignModal, setCampaignModal] = useState(false);
    const [campaignStep, setCampaignStep] = useState(0);
    const [campaignForm, setCampaignForm] = useState<{
        name?: string;
        contactListId?: number;
        contactListName?: string;
        templateId?: number;
        templateName?: string;
        sendType?: "now" | "schedule";
        scheduledAt?: Dayjs;
    }>({ sendType: "now" });

    const apiRequest = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
        if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_BACKEND_URL) is not configured");
        if (!token) throw new Error("Authentication token missing");

        const isFormData = options.body instanceof FormData;

        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                ...(options.headers || {}),
            },
        });

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json") ? await response.json() : await response.text();

        if (!response.ok) {
            const serverMessage = typeof payload === "object"
                ? Array.isArray(payload?.message)
                    ? payload.message.join(", ")
                    : payload?.message
                : payload;
            throw new Error(serverMessage || `Request failed (${response.status})`);
        }

        return payload as T;
    };

    const loadContactLists = async () => {
        const response = await apiRequest<{ items: ContactList[] }>("/whatsapp/contacts?page=1&limit=200");
        setContactLists(response.items || []);
    };

    const loadTemplates = async () => {
        const response = await apiRequest<{ items: Template[] }>("/whatsapp/templates?page=1&limit=200");
        setTemplates(response.items || []);
    };

    const loadCampaigns = async () => {
        const response = await apiRequest<{ items: Campaign[] }>("/whatsapp/campaigns?page=1&limit=200");
        setCampaigns(response.items || []);
    };

    const loadStats = async () => {
        const response = await apiRequest<CampaignStats>("/whatsapp/campaigns/stats");
        setStats(response);
    };

    const loadMetaSettings = async () => {
        const response = await apiRequest<MetaConnectionStatus>("/whatsapp/settings");
        console.info("responseresponseresponseresponse", response);
        setMetaConnection(response);
    };

    const loadAll = async () => {
        if (!token) return;
        setLoading(true);
        try {
            await loadMetaSettings();
            await Promise.all([loadContactLists(), loadTemplates(), loadCampaigns(), loadStats()]);
        } catch (error) {
            message.error(parseErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [token]);

    console.info("32432423423", csvFile);

    const createContactList = async () => {
        try {
            if (!contactForm.name.trim()) {
                message.error("List name is required");
                return;
            }

            const tags = contactForm.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);

            if (contactSource === "csv") {

                if (!csvFile) {
                    message.error("Please select a contact file");
                    return;
                }

                const created = await apiRequest<ContactList>("/whatsapp/contacts", {
                    method: "POST",
                    body: JSON.stringify({
                        name: contactForm.name.trim(),
                        source: "csv",
                        tags,
                    }),
                });

                const formData = new FormData();
                formData.append("file", csvFile);

                const result = await apiRequest<ContactImportResult>(`/whatsapp/contacts/${created.id}/import-csv`, {
                    method: "POST",
                    body: formData,
                });

                message.success(`Contact list created. Imported ${result.imported} contact${result.imported === 1 ? "" : "s"}.`);

                if (result.errors.length || result.skipped) {
                    Modal.info({
                        title: "Import completed with notes",
                        width: 560,
                        content: (
                            <div className="space-y-2">
                                <p className="mb-0">
                                    Imported {result.imported}, skipped {result.skipped}, issues {result.errors.length}.
                                </p>
                                {result.errors.length ? (
                                    <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                                        {result.errors.slice(0, 10).map((item, index) => (
                                            <div key={`${item}-${index}`}>{item}</div>
                                        ))}
                                        {result.errors.length > 10 && (
                                            <div className="mt-2 text-gray-500">
                                                {result.errors.length - 10} more issue(s) not shown.
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ),
                    });
                }
            }

            if (contactSource === "form") {
                if (!contactForm.formId.trim()) {
                    message.error("Form ID is required for form import");
                    return;
                }

                await apiRequest<ContactList>("/whatsapp/contacts", {
                    method: "POST",
                    body: JSON.stringify({
                        name: contactForm.name.trim(),
                        source: "form",
                        formId: contactForm.formId.trim(),
                        tags,
                    }),
                });

                message.success("Contact list exported from form");
            }

            setContactModal(false);
            setContactSource(null);
            setContactForm({ name: "", tags: "", formId: "" });
            setCsvFile(null);
            await loadContactLists();
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const deleteContactList = async (id: number) => {
        try {
            await apiRequest(`/whatsapp/contacts/${id}`, { method: "DELETE" });
            message.success("Contact list deleted");
            await loadContactLists();
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const createTemplate = async () => {
        try {
            if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
                message.error("Template name and content are required");
                return;
            }

            await apiRequest<Template>("/whatsapp/templates", {
                method: "POST",
                body: JSON.stringify({
                    name: newTemplate.name.trim(),
                    type: newTemplate.type,
                    content: newTemplate.content,
                    mediaUrl: newTemplate.mediaUrl.trim() || undefined,
                }),
            });

            message.success("Template submitted for approval");
            setTemplateModal(false);
            setNewTemplate({ name: "", type: "text", content: "", mediaUrl: "" });
            await loadTemplates();
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const deleteTemplate = async (id: number) => {
        try {
            await apiRequest(`/whatsapp/templates/${id}`, { method: "DELETE" });
            message.success("Template deleted");
            await loadTemplates();
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const approveTemplate = async (id: number) => {
        try {
            await apiRequest(`/whatsapp/templates/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: "approved" }),
            });
            message.success("Template marked as approved");
            await loadTemplates();
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const launchCampaign = async () => {
        try {
            if (!metaConnected) {
                message.error("WhatsApp Meta is not assigned for this company. Ask your Super Admin to assign it.");
                return;
            }

            if (!campaignForm.contactListId || !campaignForm.templateId) {
                message.error("Please select a contact list and template");
                return;
            }

            const payload: Record<string, string | number> = {
                name: (campaignForm.name || "New Campaign").trim(),
                templateId: campaignForm.templateId,
                contactListId: campaignForm.contactListId,
            };

            if (campaignForm.sendType === "schedule") {
                if (!campaignForm.scheduledAt) {
                    message.error("Please choose scheduled date/time");
                    return;
                }
                payload.scheduledAt = campaignForm.scheduledAt.toISOString();
            }

            await apiRequest<Campaign>("/whatsapp/campaigns", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            message.success("Campaign created successfully");
            setCampaignModal(false);
            setCampaignStep(0);
            setCampaignForm({ sendType: "now" });
            await Promise.all([loadCampaigns(), loadStats()]);
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const deleteCampaign = async (id: number) => {
        try {
            await apiRequest(`/whatsapp/campaigns/${id}`, { method: "DELETE" });
            message.success("Campaign deleted");
            await Promise.all([loadCampaigns(), loadStats()]);
        } catch (error) {
            message.error(parseErrorMessage(error));
        }
    };

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.content.toLowerCase().includes(templateSearch.toLowerCase());
        const matchesStatus = !templateStatusFilter || t.status === templateStatusFilter;
        const matchesType = !templateTypeFilter || t.type === templateTypeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const filteredContactLists = contactLists.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()));

    const contactColumns = [
        {
            title: "List Name", dataIndex: "name", key: "name",
            render: (name: string, record: ContactList) => (
                <div className="flex items-center gap-2">
                    <Avatar size={32} style={{ background: "#1890ff" }} icon={<TeamOutlined />} />
                    <div>
                        <div className="font-medium text-gray-800">{name}</div>
                        <div className="text-xs text-gray-500">{record.tags?.join(", ") || "-"}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Contacts", dataIndex: "count", key: "count",
            render: (count: number) => <Badge count={count} style={{ backgroundColor: "#1890ff" }} overflowCount={99999} />,
        },
        {
            title: "Source", dataIndex: "source", key: "source",
            render: (src: string) => (
                <Tag icon={src === "csv" ? <UploadOutlined /> : <FormOutlined />} color={src === "csv" ? "blue" : "green"}>
                    {src === "csv" ? "CSV Upload" : "Form Export"}
                </Tag>
            ),
        },
        {
            title: "Created", dataIndex: "createdAt", key: "createdAt",
            render: (d: string) => <span className="text-sm text-gray-600">{dayjs(d).format("MMM DD, YYYY")}</span>,
        },
        {
            title: "Actions", key: "actions",
            render: (_: any, record: ContactList) => (
                <Space>
                    <Tooltip title="Download CSV">
                        <Button size="small" icon={<FaFileDownload />} disabled />
                    </Tooltip>
                    <Popconfirm title="Delete this list?" onConfirm={() => deleteContactList(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const templateColumns = [
        {
            title: "Template", dataIndex: "name", key: "name",
            render: (name: string, record: Template) => (
                <div className="flex items-center gap-2">
                    <TemplateTypeIcon type={record.type} />
                    <div>
                        <div className="font-medium text-gray-800">{name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">{record.content.slice(0, 60)}...</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Type", dataIndex: "type", key: "type",
            render: (type: string) => <Tag color="blue" className="capitalize">{type}</Tag>,
        },
        { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <StatusTag status={s} /> },
        {
            title: "Variables", dataIndex: "variables", key: "variables",
            render: (vars: string[]) => vars?.map(v => <Tag key={v} color="purple">{"{{" + v + "}}"}</Tag>),
        },
        {
            title: "Created", dataIndex: "createdAt", key: "createdAt",
            render: (d: string) => <span className="text-sm text-gray-600">{dayjs(d).format("MMM DD, YYYY")}</span>,
        },
        {
            title: "Actions", key: "actions",
            render: (_: any, record: Template) => (
                <Space>
                    <Tooltip title="Preview">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedTemplate(record); setTemplatePreviewModal(true); }} />
                    </Tooltip>
                    {record.status !== "approved" && (
                        <Popconfirm title="Mark template as approved?" onConfirm={() => approveTemplate(record.id)}>
                            <Tooltip title="Mark Approved">
                                <Button size="small" type="primary" icon={<CheckCircleOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                    <Button size="small" icon={<EditOutlined />} disabled />
                    <Popconfirm title="Delete template?" onConfirm={() => deleteTemplate(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const campaignColumns = [
        {
            title: "Campaign", dataIndex: "name", key: "name",
            render: (name: string, record: Campaign) => (
                <div>
                    <div className="font-semibold text-gray-800">{name}</div>
                    <div className="text-xs text-gray-500">{record.templateName} · {record.contactListName}</div>
                </div>
            ),
        },
        { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <StatusTag status={s} /> },
        {
            title: "Progress", key: "progress",
            render: (_: any, record: Campaign) => {
                const pct = record.stats.total > 0 ? Math.round((record.stats.delivered / record.stats.total) * 100) : 0;
                return (
                    <div style={{ minWidth: 120 }}>
                        <Progress percent={pct} size="small" status={record.status === "failed" ? "exception" : record.status === "completed" ? "success" : "active"} />
                        <div className="text-xs text-gray-500">{record.stats.delivered}/{record.stats.total} delivered</div>
                    </div>
                );
            },
        },
        {
            title: "Stats", key: "stats",
            render: (_: any, record: Campaign) => (
                <Space size={4}>
                    <Tooltip title="Sent"><Tag color="blue"><SendOutlined /> {record.stats.sent}</Tag></Tooltip>
                    <Tooltip title="Delivered"><Tag color="green"><CheckCircleOutlined /> {record.stats.delivered}</Tag></Tooltip>
                    <Tooltip title="Failed"><Tag color="red"><CloseCircleOutlined /> {record.stats.failed}</Tag></Tooltip>
                </Space>
            ),
        },
        {
            title: "Date", key: "date",
            render: (_: any, record: Campaign) => (
                <div className="text-xs">
                    {record.scheduledAt
                        ? <><CalendarOutlined className="mr-1" />{dayjs(record.scheduledAt).format("MMM DD, YYYY HH:mm")}</>
                        : record.sentAt
                            ? <><CheckCircleOutlined className="mr-1 text-green-500" />{dayjs(record.sentAt).format("MMM DD, YYYY HH:mm")}</>
                            : <span className="text-gray-400">Not set</span>}
                </div>
            ),
        },
        {
            title: "Actions", key: "actions",
            render: (_: any, record: Campaign) => (
                <Space>
                    <Tooltip title="View report"><Button size="small" icon={<BarChartOutlined />} disabled /></Tooltip>
                    <Popconfirm title="Delete campaign?" onConfirm={() => deleteCampaign(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const CampaignSteps = () => (
        <div>
            <Steps current={campaignStep} size="small" className="mb-6">
                <Step title="Contact List" icon={<TeamOutlined />} />
                <Step title="Template" icon={<FileTextOutlined />} />
                <Step title="Schedule" icon={<CalendarOutlined />} />
                <Step title="Review" icon={<CheckCircleOutlined />} />
            </Steps>

            {campaignStep === 0 && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Select a Contact List</div>
                    <Select
                        className="w-full"
                        placeholder="Choose contact list..."
                        value={campaignForm.contactListId}
                        onChange={(v: number) => setCampaignForm({
                            ...campaignForm,
                            contactListId: v,
                            contactListName: contactLists.find(c => c.id === v)?.name,
                        })}
                    >
                        {contactLists.map(c => (
                            <Option key={c.id} value={c.id}>
                                <TeamOutlined className="mr-2 text-blue-500" />{c.name} <span className="text-gray-400 text-xs ml-2">({c.count} contacts)</span>
                            </Option>
                        ))}
                    </Select>
                </div>
            )}

            {campaignStep === 1 && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Select an Approved Template</div>
                    <div className="space-y-3">
                        {templates.filter(t => t.status === "approved").map(t => (
                            <div
                                key={t.id}
                                onClick={() => setCampaignForm({ ...campaignForm, templateId: t.id, templateName: t.name })}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${campaignForm.templateId === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                            >
                                <div className="flex items-center gap-2">
                                    <TemplateTypeIcon type={t.type} />
                                    <div>
                                        <div className="font-medium text-sm">{t.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{t.content.slice(0, 50)}...</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {campaignStep === 2 && (
                <div className="space-y-4">
                    <Form layout="vertical">
                        <Form.Item label="Campaign Name">
                            <Input
                                placeholder="E.g. Spring Promo"
                                value={campaignForm.name}
                                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Send">
                            <Select
                                value={campaignForm.sendType || "now"}
                                onChange={(v: "now" | "schedule") => setCampaignForm({ ...campaignForm, sendType: v })}
                            >
                                <Option value="now"><ThunderboltOutlined className="mr-2 text-yellow-500" />Send Immediately</Option>
                                <Option value="schedule"><CalendarOutlined className="mr-2 text-blue-500" />Schedule for Later</Option>
                            </Select>
                        </Form.Item>
                        {campaignForm.sendType === "schedule" && (
                            <Form.Item label="Scheduled At" required>
                                <DatePicker
                                    showTime
                                    className="w-full"
                                    value={campaignForm.scheduledAt}
                                    onChange={(value) => setCampaignForm({ ...campaignForm, scheduledAt: value || undefined })}
                                />
                            </Form.Item>
                        )}
                    </Form>
                </div>
            )}

            {campaignStep === 3 && (
                <div className="space-y-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Campaign Summary</div>
                    <div className="space-y-2">
                        {[
                            { label: "Campaign Name", value: campaignForm.name || "Unnamed Campaign" },
                            { label: "Contact List", value: campaignForm.contactListName || "-" },
                            { label: "Template", value: campaignForm.templateName || "-" },
                            { label: "Send Type", value: campaignForm.sendType === "schedule" ? "Scheduled" : "Immediately" },
                            { label: "Scheduled At", value: campaignForm.scheduledAt ? campaignForm.scheduledAt.format("MMM DD, YYYY HH:mm") : "-" },
                            { label: "Total Recipients", value: contactLists.find(c => c.id === campaignForm.contactListId)?.count || 0 },
                        ].map(item => (
                            <div key={item.label} className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 text-sm">{item.label}</span>
                                <span className="text-gray-800 text-sm font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between mt-6">
                <Button disabled={campaignStep === 0} onClick={() => setCampaignStep(s => s - 1)}>Back</Button>
                {campaignStep < 3
                    ? <Button type="primary" onClick={() => setCampaignStep(s => s + 1)}>Next</Button>
                    : <Button type="primary" icon={<SendOutlined />} onClick={launchCampaign}>Launch Campaign</Button>
                }
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6" style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #f5f5f5 100%)" }}>
            <div className="mx-auto space-y-6" style={{ maxWidth: 1400 }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg" style={{ background: "#25D366" }}>
                            <MdWhatsapp className="text-white text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 m-0">WhatsApp Messaging</h1>
                            <p className="text-gray-500 text-sm m-0">Manage contacts, templates & campaigns</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge dot status={metaConnected ? "success" : "warning"}>
                            <Tag color={metaConnected ? "green" : "orange"} className="px-3 py-1 text-sm">
                                {metaConnected ? "Meta Connected" : "Meta Not Connected"}
                            </Tag>
                        </Badge>
                        {!metaConnected && <Tag color="geekblue">Ask Super Admin to assign</Tag>}
                        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading} />
                    </div>
                </div>

                <Row gutter={[16, 16]}>
                    {[
                        { title: "Total Contacts", value: contactLists.reduce((a, c) => a + c.count, 0), prefix: <UserOutlined />, color: "#1890ff", bg: "#e6f7ff" },
                        { title: "Messages Sent", value: stats.totalSent, prefix: <SendOutlined />, color: "#52c41a", bg: "#f6ffed" },
                        { title: "Delivered", value: stats.totalDelivered, prefix: <CheckCircleOutlined />, color: "#13c2c2", bg: "#e6fffb" },
                        { title: "Active Campaigns", value: stats.activeCampaigns, prefix: <ThunderboltOutlined />, color: "#fa8c16", bg: "#fff7e6" },
                    ].map(stat => (
                        <Col xs={12} sm={12} md={6} key={stat.title}>
                            <Card bodyStyle={{ padding: "16px 20px" }} className="shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl text-lg" style={{ background: stat.bg, color: stat.color }}>
                                        {stat.prefix}
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold" style={{ color: stat?.color }}>{stat?.value && stat?.value.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{stat?.title}</div>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        tabBarStyle={{ padding: "0 24px", marginBottom: 0 }}
                        tabBarExtraContent={
                            <div className="pr-4 py-2">
                                {activeTab === "contacts" && (
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setContactModal(true)} style={{ background: "#25D366", borderColor: "#25D366" }}>
                                        New Contact List
                                    </Button>
                                )}
                                {activeTab === "templates" && (
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setTemplateModal(true)}>
                                        New Template
                                    </Button>
                                )}
                                {activeTab === "campaigns" && (
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        disabled={!metaConnected}
                                        onClick={() => { setCampaignModal(true); setCampaignStep(0); setCampaignForm({ sendType: "now" }); }}
                                    >
                                        New Campaign
                                    </Button>
                                )}
                            </div>
                        }
                    >
                        <TabPane tab={<span><TeamOutlined />Contact Lists <Badge count={contactLists.length} style={{ marginLeft: 6, backgroundColor: "#1890ff" }} /></span>} key="contacts">
                            <div className="p-6">
                                <div className="flex gap-3 mb-4">
                                    <Input
                                        placeholder="Search contact lists..."
                                        prefix={<SearchOutlined className="text-gray-400" />}
                                        value={contactSearch}
                                        onChange={e => setContactSearch(e.target.value)}
                                        style={{ maxWidth: 300 }}
                                    />
                                </div>
                                <Table
                                    rowKey="id"
                                    columns={contactColumns}
                                    dataSource={filteredContactLists}
                                    pagination={false}
                                    size="small"
                                    bordered={false}
                                    loading={loading}
                                />
                            </div>
                        </TabPane>

                        <TabPane tab={<span><FileTextOutlined />Templates <Badge count={templates.length} style={{ marginLeft: 6, backgroundColor: "#722ed1" }} /></span>} key="templates">
                            <div className="p-6">
                                <div className="flex gap-3 mb-4">
                                    <Input
                                        placeholder="Search templates..."
                                        prefix={<SearchOutlined className="text-gray-400" />}
                                        style={{ maxWidth: 300 }}
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                    />
                                    <Select placeholder="Filter by status" allowClear style={{ width: 150 }} value={templateStatusFilter} onChange={setTemplateStatusFilter}>
                                        <Option value="approved">Approved</Option>
                                        <Option value="pending">Pending</Option>
                                        <Option value="rejected">Rejected</Option>
                                    </Select>
                                    <Select placeholder="Filter by type" allowClear style={{ width: 150 }} value={templateTypeFilter} onChange={setTemplateTypeFilter}>
                                        <Option value="text">Text</Option>
                                        <Option value="image">Image</Option>
                                        <Option value="video">Video</Option>
                                        <Option value="carousel">Carousel</Option>
                                    </Select>
                                </div>
                                <Table
                                    rowKey="id"
                                    columns={templateColumns}
                                    dataSource={filteredTemplates}
                                    pagination={false}
                                    size="small"
                                    bordered={false}
                                    loading={loading}
                                />
                            </div>
                        </TabPane>

                        <TabPane tab={<span><SendOutlined />Campaigns <Badge count={campaigns.length} style={{ marginLeft: 6, backgroundColor: "#fa8c16" }} /></span>} key="campaigns">
                            <div className="p-6">
                                <Table
                                    rowKey="id"
                                    columns={campaignColumns}
                                    dataSource={campaigns}
                                    pagination={false}
                                    size="small"
                                    bordered={false}
                                    scroll={{ x: 900 }}
                                    loading={loading}
                                />
                            </div>
                        </TabPane>
                    </Tabs>
                </Card>
            </div>

            <Modal
                title={<span><TeamOutlined className="mr-2 text-blue-500" />Create Contact List</span>}
                open={contactModal}
                onCancel={() => { setContactModal(false); setContactSource(null); }}
                footer={null}
                width={500}
            >
                {!contactSource ? (
                    <div className="space-y-3 py-4">
                        <p className="text-gray-500 text-sm mb-4">How would you like to import contacts?</p>
                        <button
                            onClick={() => setContactSource("csv")}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left cursor-pointer bg-white"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <CloudUploadOutlined className="text-blue-500 text-xl" />
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800">Upload File</div>
                                <div className="text-xs text-gray-500">Import contacts from text, CSV, Excel, or Word</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setContactSource("form")}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left cursor-pointer bg-white"
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <FormOutlined className="text-green-500 text-xl" />
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800">Export from Forms</div>
                                <div className="text-xs text-gray-500">Use existing form submission data</div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <Form layout="vertical">
                            <Form.Item label="List Name" required>
                                <Input placeholder="E.g. VIP Guests March" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                            </Form.Item>
                            <Form.Item label="Tags (comma separated)">
                                <Input placeholder="vip, hotel" value={contactForm.tags} onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })} />
                            </Form.Item>
                            {contactSource === "csv" && (
                                <Form.Item label="Upload File">
                                    <Dragger
                                        accept=".csv,.txt,.tsv,.xlsx,.docx"
                                        className="rounded-xl"
                                        fileList={csvFile ? [{ uid: '-1', name: csvFile.name, status: 'done' } as UploadFile] : []}
                                        beforeUpload={(file) => {
                                            setCsvFile(file);
                                            return false;
                                        }}
                                        onRemove={() => {
                                            setCsvFile(null);
                                            return true;
                                        }}
                                    >
                                        <p className="text-4xl mb-2">📂</p>
                                        <p className="font-medium">Click or drag a contact file here</p>
                                        <p className="text-gray-400 text-xs">Supports .csv, .txt, .tsv, .xlsx, .docx · Max 10MB</p>
                                        <p className="text-gray-400 text-xs">Headers should include name, phone, email. Comma, pipe, tab, and semicolon separated text files are supported.</p>
                                    </Dragger>
                                </Form.Item>
                            )}
                            {contactSource === "form" && (
                                <Form.Item label="Form ID" required>
                                    <Input placeholder="Enter JotForm/Form ID" value={contactForm.formId} onChange={(e) => setContactForm({ ...contactForm, formId: e.target.value })} />
                                </Form.Item>
                            )}
                        </Form>
                        <div className="flex gap-2 justify-end">
                            <Button onClick={() => setContactSource(null)}>Back</Button>
                            <Button type="primary" icon={contactSource === "csv" ? <UploadOutlined /> : <FormOutlined />} onClick={createContactList}>
                                {contactSource === "csv" ? "Import Contacts" : "Export from Form"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title={<span><FileTextOutlined className="mr-2 text-purple-500" />Create Template</span>}
                open={templateModal}
                onCancel={() => setTemplateModal(false)}
                width={800}
                footer={null}
            >
                <Row gutter={24}>
                    <Col span={12}>
                        <div className="space-y-4">
                            <Form layout="vertical">
                                <Form.Item label="Template Name" required>
                                    <Input
                                        placeholder="E.g. Welcome Message"
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    />
                                </Form.Item>
                                <Form.Item label="Template Type">
                                    <Select
                                        value={newTemplate.type}
                                        onChange={(v) => setNewTemplate({ ...newTemplate, type: v })}
                                    >
                                        <Option value="text"><FileTextOutlined className="mr-2" />Text</Option>
                                        <Option value="image"><PictureOutlined className="mr-2" />Image</Option>
                                        <Option value="video"><VideoCameraOutlined className="mr-2" />Video</Option>
                                        <Option value="carousel"><AppstoreOutlined className="mr-2" />Carousel</Option>
                                    </Select>
                                </Form.Item>
                                {(newTemplate.type === "image" || newTemplate.type === "video") && (
                                    <Form.Item label="Media URL">
                                        <Input
                                            placeholder="https://..."
                                            value={newTemplate.mediaUrl}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, mediaUrl: e.target.value })}
                                        />
                                    </Form.Item>
                                )}
                                <Form.Item label="Message Content" required>
                                    <TextArea
                                        rows={5}
                                        placeholder={"Hi {{name}}, welcome to {{hotel}}!"}
                                        value={newTemplate.content}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                    />
                                </Form.Item>
                            </Form>
                            <div className="flex gap-2 justify-end">
                                <Button onClick={() => setTemplateModal(false)}>Cancel</Button>
                                <Button type="primary" onClick={createTemplate}>Submit for Approval</Button>
                            </div>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2"><EyeOutlined />Live Preview</div>
                        <WhatsAppPreview content={newTemplate.content} type={newTemplate.type} />
                    </Col>
                </Row>
            </Modal>

            <Modal
                title={<span><EyeOutlined className="mr-2" />{selectedTemplate?.name}</span>}
                open={templatePreviewModal}
                onCancel={() => setTemplatePreviewModal(false)}
                footer={null}
                width={380}
            >
                {selectedTemplate && (
                    <>
                        <div className="flex gap-2 mb-3 justify-center">
                            <StatusTag status={selectedTemplate.status} />
                            <Tag className="capitalize">{selectedTemplate.type}</Tag>
                        </div>
                        <WhatsAppPreview content={selectedTemplate.content} type={selectedTemplate.type} />
                        {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                            <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1">Dynamic Variables:</div>
                                <div className="flex flex-wrap gap-1">
                                    {selectedTemplate.variables.map(v => (
                                        <Tag key={v} color="purple">{"{{" + v + "}}"}</Tag>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            <Modal
                title={<span><SendOutlined className="mr-2 text-blue-500" />Create Campaign</span>}
                open={campaignModal}
                onCancel={() => { setCampaignModal(false); setCampaignStep(0); setCampaignForm({ sendType: "now" }); }}
                footer={null}
                width={560}
            >
                <CampaignSteps />
            </Modal>
        </div>
    );
}
