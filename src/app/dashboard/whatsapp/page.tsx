"use client";
import { useState, useEffect } from "react";
import {
    Table, Tag, Card, Input, message, Button, Space, Select, Modal,
    Tabs, Upload, Steps, Form, Progress, Badge, Tooltip,
    Row, Col, Avatar, Popconfirm, DatePicker, Alert, Empty
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
    AppstoreOutlined, CalendarOutlined, ThunderboltOutlined,
    LinkOutlined, PhoneOutlined, CopyOutlined,
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
const COPY_CODE_MAX_LENGTH = 15;

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

interface ContactListContact {
    id?: number;
    name: string;
    phone: string;
    email?: string | null;
    variables?: Record<string, string>;
}

interface ContactImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

interface Template {
    id: number;
    name: string;
    category: "utility" | "marketing" | "authentication" | "service";
    type: "text" | "image" | "video" | "carousel";
    status: "pending" | "approved" | "rejected";
    metaSubmissionStatus: "submitted" | "saved_locally_only" | "failed";
    metaSubmissionError?: string;
    content: string;
    variables?: string[];
    mediaUrl?: string;
    carouselItems?: CarouselTemplateItem[] | null;
    buttons?: TemplateButtonConfig[] | null;
    createdAt: string;
}

interface CarouselTemplateItem {
    mediaUrl?: string;
    text: string;
}

interface CarouselDraftItem {
    id: string;
    text: string;
    file: File | null;
}

interface TemplateButtonConfig {
    type: "phone_number" | "url" | "copy_code";
    urlType?: "static" | "dynamic";
    text?: string;
    phoneNumber?: string;
    url?: string;
    urlSuffix?: string;
    offerCode?: string;
}

interface TemplateButtonDraft extends TemplateButtonConfig {
    id: string;
}

interface TemplateFormState {
    name: string;
    category: "utility" | "marketing" | "authentication" | "service";
    type: "text" | "image" | "video" | "carousel";
    content: string;
    mediaFile: File | null;
    carouselItems: CarouselDraftItem[];
    buttons: TemplateButtonDraft[];
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
    completedAt?: string;
    stats: {
        total: number;
        sent: number;
        delivered: number;
        failed: number;
    };
    createdAt: string;
    updatedAt?: string;
}

interface CampaignMessage {
    id: number;
    phone: string;
    status: "pending" | "sent" | "delivered" | "failed";
    errorMessage?: string | null;
    sentAt?: string | null;
    deliveredAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

interface CampaignDetails extends Campaign {
    messages?: CampaignMessage[];
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
        delivered: { color: "success", icon: <CheckCircleOutlined />, label: "Delivered" },
        sent: { color: "processing", icon: <SendOutlined />, label: "Sent" },
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

const MetaSubmissionTag = ({ status }: { status: Template["metaSubmissionStatus"] }) => {
    const map: Record<Template["metaSubmissionStatus"], { color: string; label: string }> = {
        submitted: { color: "success", label: "Submitted to Meta" },
        saved_locally_only: { color: "default", label: "Saved Locally Only" },
        failed: { color: "error", label: "Meta Submission Failed" },
    };

    const config = map[status];
    return <Tag color={config.color}>{config.label}</Tag>;
};

const createCarouselDraftItem = (): CarouselDraftItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    file: null,
});

const createTemplateButtonDraft = (): TemplateButtonDraft => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "url",
    urlType: "static",
    text: "",
    url: "",
    urlSuffix: "",
    phoneNumber: "",
    offerCode: "",
});

const createEmptyTemplateState = (): TemplateFormState => ({
    name: "",
    category: "marketing",
    type: "text",
    content: "",
    mediaFile: null,
    carouselItems: [createCarouselDraftItem()],
    buttons: [],
});

const getCopyCodeValidationError = (value?: string): string | null => {
    const normalized = value?.trim() || "";
    if (!normalized) return "Copy offer code is required";
    if (normalized.length > COPY_CODE_MAX_LENGTH) {
        return `Copy offer code must be ${COPY_CODE_MAX_LENGTH} characters or fewer`;
    }
    if (/\{\{\w+\}\}/.test(normalized)) {
        return "Copy offer code must be a fixed value. Template variables are not allowed here";
    }
    return null;
};

const getUploadFileList = (file: File | null): UploadFile[] => (
    file ? [{ uid: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, status: "done" }] : []
);

const createEmptyContactRow = (): ContactListContact => ({
    name: "",
    phone: "",
    email: "",
});

const MediaPreviewCard = ({
    type,
    src,
    label,
}: {
    type: "image" | "video";
    src?: string;
    label?: string;
}) => {
    if (src) {
        return (
            <div className="rounded-lg mb-2 overflow-hidden" style={{ background: "#d0c8c0", height: 120 }}>
                {type === "image" ? (
                    <img
                        src={src}
                        alt={label || "Template media"}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <video
                        src={src}
                        className="w-full h-full object-cover"
                        controls
                        muted
                        playsInline
                    />
                )}
            </div>
        );
    }

    return (
        <div
            className="rounded-lg mb-2 overflow-hidden"
            style={{ background: "#d0c8c0", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
            <div className="text-center px-4">
                {type === "image" ? (
                    <PictureOutlined style={{ fontSize: 36, color: "#999" }} />
                ) : (
                    <VideoCameraOutlined style={{ fontSize: 36, color: "#999" }} />
                )}
                <div className="text-xs text-gray-500 mt-2">
                    {label || (type === "image" ? "Image upload preview" : "Video upload preview")}
                </div>
            </div>
        </div>
    );
};

const getButtonActionValue = (button: Pick<TemplateButtonConfig, "type" | "urlType">): "phone_number" | "url_static" | "url_dynamic" | "copy_code" => {
    if (button.type === "phone_number") return "phone_number";
    if (button.type === "copy_code") return "copy_code";
    return button.urlType === "dynamic" ? "url_dynamic" : "url_static";
};

const getPreviewButtonLabel = (button: TemplateButtonConfig): string => {
    if (button.type === "copy_code") return "Copy code";
    return button.text?.trim() || (
        button.type === "phone_number"
            ? "Call now"
            : button.urlType === "dynamic"
                ? "Visit personalized link"
                : "Visit website"
    );
};

const getPreviewButtonIcon = (button: TemplateButtonConfig) => {
    if (button.type === "phone_number") return <PhoneOutlined />;
    if (button.type === "copy_code") return <CopyOutlined />;
    return <LinkOutlined />;
};

const WhatsAppPreview = ({
    content,
    type,
    mediaSrc,
    mediaLabel,
    carouselItems,
    buttons,
}: {
    content: string;
    type: string;
    mediaSrc?: string;
    mediaLabel?: string;
    carouselItems?: Array<{ text: string; mediaUrl?: string }>;
    buttons?: TemplateButtonConfig[];
}) => (
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
                    <MediaPreviewCard type="image" src={mediaSrc} label={mediaLabel} />
                )}
                {type === "video" && (
                    <MediaPreviewCard type="video" src={mediaSrc} label={mediaLabel} />
                )}
                {type === "carousel" && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {(carouselItems?.length ? carouselItems : [{ text: "" }, { text: "" }]).slice(0, 4).map((item, index) => (
                            <div
                                key={`${item.text}-${index}`}
                                className="rounded-lg overflow-hidden text-xs"
                                style={{ background: "#d0c8c0", minHeight: 96 }}
                            >
                                {item.mediaUrl ? (
                                    <img
                                        src={item.mediaUrl}
                                        alt={item.text || `Card ${index + 1}`}
                                        className="h-14 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-14 text-gray-500">
                                        <AppstoreOutlined style={{ fontSize: 20 }} />
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-600 p-2 text-center" style={{ wordBreak: "break-word" }}>
                                    {item.text || `Card ${index + 1}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="rounded-lg rounded-tl-none p-3 text-sm shadow-sm max-w-full" style={{ background: "#fff", color: "#333" }}>
                    <p className="m-0 leading-relaxed" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {content || (type === "carousel" ? "Carousel card previews will appear here..." : "Your message preview will appear here...")}
                    </p>
                    <div className="flex justify-end mt-1">
                        <span className="text-gray-400" style={{ fontSize: 10 }}>{dayjs().format("HH:mm")} ✓✓</span>
                    </div>
                </div>
                {buttons?.length ? (
                    <div className="mt-2 space-y-2">
                        {buttons.map((button, index) => (
                            <div
                                key={`${button.type}-${button.text || button.offerCode || index}`}
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 shadow-sm"
                            >
                                {getPreviewButtonIcon(button)}
                                <span>{getPreviewButtonLabel(button)}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
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

const getDeliveryFailureReason = (errorMessage?: string | null) => (
    errorMessage?.trim() || "WhatsApp did not return a specific failure reason for this recipient."
);

const getFailedCampaignMessages = (campaign?: CampaignDetails | null) => (
    (campaign?.messages || []).filter((item) => item.status === "failed")
);

const summarizeFailureReasons = (messages: CampaignMessage[]) => {
    const counts = messages.reduce<Record<string, number>>((acc, item) => {
        const reason = getDeliveryFailureReason(item.errorMessage);
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
};

const truncateReason = (reason: string, limit = 72) => (
    reason.length > limit ? `${reason.slice(0, limit).trimEnd()}...` : reason
);

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

    const metaConnected = metaConnection.connected || (metaConnection.hasAccessToken && Boolean(metaConnection.phoneNumberId));
    const hasPendingSubmittedTemplates = templates.some(
        (template) => template.metaSubmissionStatus === "submitted" && template.status === "pending",
    );

    const [contactSearch, setContactSearch] = useState("");
    const [templateSearch, setTemplateSearch] = useState("");
    const [templateStatusFilter, setTemplateStatusFilter] = useState<string | undefined>();
    const [templateTypeFilter, setTemplateTypeFilter] = useState<string | undefined>();

    const [loading, setLoading] = useState(false);

    const [contactModal, setContactModal] = useState(false);
    const [contactSource, setContactSource] = useState<"csv" | "form" | null>(null);
    const [contactForm, setContactForm] = useState({ name: "", tags: "", formId: "" });
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [contactEditModal, setContactEditModal] = useState(false);
    const [editingContactListId, setEditingContactListId] = useState<number | null>(null);
    const [contactEditLoading, setContactEditLoading] = useState(false);
    const [contactEditRows, setContactEditRows] = useState<ContactListContact[]>([]);

    const [templateModal, setTemplateModal] = useState(false);
    const [templatePreviewModal, setTemplatePreviewModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [newTemplate, setNewTemplate] = useState<TemplateFormState>(createEmptyTemplateState());
    const [templateMediaPreviewUrl, setTemplateMediaPreviewUrl] = useState<string>();
    const [carouselMediaPreviewUrls, setCarouselMediaPreviewUrls] = useState<Record<string, string>>({});

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
    const [campaignReportModal, setCampaignReportModal] = useState(false);
    const [campaignReportLoading, setCampaignReportLoading] = useState(false);
    const [selectedCampaignReport, setSelectedCampaignReport] = useState<CampaignDetails | null>(null);
    const [campaignReportCache, setCampaignReportCache] = useState<Record<number, CampaignDetails>>({});
    const hasCopyCodeButton = newTemplate.buttons.some((button) => button.type === "copy_code");

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

    const loadContactListContacts = async (contactListId: number, limit = 500) => {
        return apiRequest<{ items: ContactListContact[] }>(`/whatsapp/contacts/${contactListId}/contacts?page=1&limit=${limit}`);
    };

    const loadTemplates = async () => {
        const response = await apiRequest<{ items: Template[] }>("/whatsapp/templates?page=1&limit=200");
        setTemplates(response.items || []);
    };

    const loadCampaigns = async () => {
        const response = await apiRequest<{ items: Campaign[] }>("/whatsapp/campaigns?page=1&limit=200");
        setCampaigns(response.items || []);
    };

    const loadCampaignReport = async (campaignId: number) => {
        const response = await apiRequest<CampaignDetails>(`/whatsapp/campaigns/${campaignId}`);
        setCampaignReportCache((prev) => ({ ...prev, [campaignId]: response }));
        return response;
    };

    const loadStats = async () => {
        const response = await apiRequest<CampaignStats>("/whatsapp/campaigns/stats");
        setStats(response);
    };

    const loadMetaSettings = async () => {
        const response = await apiRequest<MetaConnectionStatus>("/whatsapp/settings");
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
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (!token || !hasPendingSubmittedTemplates) return;

        const interval = window.setInterval(() => {
            loadTemplates().catch((error) => {
                console.error("Template status polling failed:", error);
            });
        }, 30000);

        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, hasPendingSubmittedTemplates]);

    useEffect(() => {
        if (!newTemplate.mediaFile) {
            setTemplateMediaPreviewUrl(undefined);
            return;
        }

        const previewUrl = URL.createObjectURL(newTemplate.mediaFile);
        setTemplateMediaPreviewUrl(previewUrl);

        return () => {
            URL.revokeObjectURL(previewUrl);
        };
    }, [newTemplate.mediaFile]);

    useEffect(() => {
        const nextPreviewUrls = Object.fromEntries(
            newTemplate.carouselItems
                .filter((item) => item.file)
                .map((item) => [item.id, URL.createObjectURL(item.file as File)]),
        ) as Record<string, string>;

        setCarouselMediaPreviewUrls(nextPreviewUrls);

        return () => {
            Object.values(nextPreviewUrls).forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [newTemplate.carouselItems]);

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

    const openEditContactList = async (record: ContactList) => {
        try {
            setContactEditLoading(true);
            setEditingContactListId(record.id);
            setContactForm({
                name: record.name,
                tags: (record.tags || []).join(", "),
                formId: "",
            });

            const response = await loadContactListContacts(record.id, Math.max(record.count || 0, 200));
            setContactEditRows(response.items?.length ? response.items : [createEmptyContactRow()]);
            setContactEditModal(true);
        } catch (error) {
            message.error(parseErrorMessage(error));
        } finally {
            setContactEditLoading(false);
        }
    };

    const updateContactEditRow = (index: number, patch: Partial<ContactListContact>) => {
        setContactEditRows((prev) => prev.map((row, rowIndex) => (
            rowIndex === index ? { ...row, ...patch } : row
        )));
    };

    const addContactEditRow = () => {
        setContactEditRows((prev) => [...prev, createEmptyContactRow()]);
    };

    const removeContactEditRow = (index: number) => {
        setContactEditRows((prev) => (
            prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)
        ));
    };

    const closeContactEditModal = () => {
        setContactEditModal(false);
        setEditingContactListId(null);
        setContactEditRows([]);
        setContactForm({ name: "", tags: "", formId: "" });
    };

    const saveEditedContactList = async () => {
        if (!editingContactListId) return;

        try {
            setContactEditLoading(true);
            const name = contactForm.name.trim();
            if (!name) {
                message.error("List name is required");
                return;
            }

            const contacts = contactEditRows
                .map((row) => ({
                    name: row.name.trim(),
                    phone: row.phone.trim(),
                    email: row.email?.trim() || undefined,
                }))
                .filter((row) => row.name || row.phone || row.email);

            if (!contacts.length) {
                message.error("At least one contact is required");
                return;
            }

            if (contacts.some((row) => !row.phone)) {
                message.error("Each contact needs a phone number");
                return;
            }

            const tags = contactForm.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);

            await apiRequest(`/whatsapp/contacts/${editingContactListId}`, {
                method: "PUT",
                body: JSON.stringify({
                    name,
                    tags,
                    contacts,
                }),
            });

            message.success("Contact list updated");
            closeContactEditModal();
            await loadContactLists();
        } catch (error) {
            message.error(parseErrorMessage(error));
        } finally {
            setContactEditLoading(false);
        }
    };

    const createTemplate = async () => {
        try {
            if (!newTemplate.name.trim()) {
                message.error("Template name is required");
                return;
            }

            if (newTemplate.type !== "carousel" && !newTemplate.content.trim()) {
                message.error("Template content is required");
                return;
            }

            if ((newTemplate.type === "image" || newTemplate.type === "video") && !newTemplate.mediaFile) {
                message.error(`Please upload a ${newTemplate.type} file`);
                return;
            }

            if (newTemplate.type === "carousel") {
                const invalidCard = newTemplate.carouselItems.find((item) => !item.text.trim() || !item.file);
                if (invalidCard) {
                    message.error("Each carousel card needs both text and a file");
                    return;
                }
            }

            if (newTemplate.buttons.length > 3) {
                message.error("You can add up to 3 call-to-action buttons");
                return;
            }

            const phoneButtons = newTemplate.buttons.filter((button) => button.type === "phone_number");
            const urlButtons = newTemplate.buttons.filter((button) => button.type === "url");
            const copyCodeButtons = newTemplate.buttons.filter((button) => button.type === "copy_code");

            if (phoneButtons.length > 1) {
                message.error("Only one phone number CTA button is allowed");
                return;
            }

            if (urlButtons.length > 2) {
                message.error("Only two website CTA buttons are allowed");
                return;
            }

            if (copyCodeButtons.length > 1) {
                message.error("Only one copy code CTA button is allowed");
                return;
            }

            if (copyCodeButtons.length > 0 && newTemplate.category !== "marketing") {
                message.error("Copy offer code CTA buttons are only supported for marketing templates");
                return;
            }

            if (newTemplate.type === "carousel" && newTemplate.buttons.length > 0) {
                message.error("CTA buttons are currently available for text, image, and video templates only");
                return;
            }

            const invalidCopyCodeButton = copyCodeButtons.find((button) => getCopyCodeValidationError(button.offerCode));
            if (invalidCopyCodeButton) {
                message.error(getCopyCodeValidationError(invalidCopyCodeButton.offerCode) || "Copy offer code is invalid");
                return;
            }

            const invalidButton = newTemplate.buttons.find((button) => {
                if (button.type === "phone_number") {
                    return !button.text?.trim() || !button.phoneNumber?.trim();
                }

                if (button.type === "copy_code") {
                    return false;
                }

                return !button.text?.trim()
                    || !button.url?.trim()
                    || (button.urlType === "dynamic" && !button.urlSuffix?.trim());
            });

            if (invalidButton) {
                message.error("Please complete all CTA button fields before submitting");
                return;
            }

            const formData = new FormData();
            formData.append("name", newTemplate.name.trim());
            formData.append("category", newTemplate.category);
            formData.append("type", newTemplate.type);
            formData.append("content", newTemplate.content.trim());

            if (newTemplate.buttons.length > 0) {
                formData.append(
                    "buttons",
                    JSON.stringify(
                        newTemplate.buttons.map((button) => {
                            if (button.type === "phone_number") {
                                return {
                                    type: "phone_number",
                                    text: button.text?.trim(),
                                    phoneNumber: button.phoneNumber?.trim(),
                                };
                            }

                            if (button.type === "copy_code") {
                                return {
                                    type: "copy_code",
                                    offerCode: button.offerCode?.trim(),
                                };
                            }

                            return {
                                type: "url",
                                urlType: button.urlType,
                                text: button.text?.trim(),
                                url: button.url?.trim(),
                                urlSuffix: button.urlType === "dynamic" ? button.urlSuffix?.trim() : undefined,
                            };
                        }),
                    ),
                );
            }

            if (newTemplate.type === "image" || newTemplate.type === "video") {
                if (newTemplate.mediaFile) {
                    formData.append("files", newTemplate.mediaFile);
                }
            }

            if (newTemplate.type === "carousel") {
                formData.append(
                    "carouselItems",
                    JSON.stringify(
                        newTemplate.carouselItems.map((item) => ({
                            text: item.text.trim(),
                        })),
                    ),
                );

                newTemplate.carouselItems.forEach((item) => {
                    if (item.file) {
                        formData.append("files", item.file);
                    }
                });
            }

            const createdTemplate = await apiRequest<Template>("/whatsapp/templates", {
                method: "POST",
                body: formData,
            });

            if (createdTemplate.metaSubmissionStatus === "submitted") {
                message.success("Template was created and submitted to Meta for approval");
            } else if (createdTemplate.metaSubmissionError) {
                message.warning(createdTemplate.metaSubmissionError);
            } else {
                message.warning("Template was saved locally only. Meta submission did not complete.");
            }
            setTemplateModal(false);
            setNewTemplate(createEmptyTemplateState());
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

    const closeCampaignReport = () => {
        setCampaignReportModal(false);
        setSelectedCampaignReport(null);
        setCampaignReportLoading(false);
    };

    const openCampaignReport = async (campaign: Campaign) => {
        const cachedReport = campaignReportCache[campaign.id];

        setCampaignReportModal(true);
        setSelectedCampaignReport(cachedReport || null);
        setCampaignReportLoading(true);

        try {
            const report = await loadCampaignReport(campaign.id);
            setSelectedCampaignReport(report);
        } catch (error) {
            message.error(parseErrorMessage(error));
            if (!cachedReport) {
                setCampaignReportModal(false);
            }
        } finally {
            setCampaignReportLoading(false);
        }
    };

    const getCampaignFailureTooltip = (campaign: Campaign) => {
        const cachedReport = campaignReportCache[campaign.id];
        const topReasons = summarizeFailureReasons(getFailedCampaignMessages(cachedReport));

        if (!topReasons.length) {
            return campaign.stats.failed > 0
                ? "View exact failure reasons"
                : "No failed deliveries";
        }

        return (
            <div className="max-w-xs">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Top failure reasons
                </div>
                <div className="space-y-1">
                    {topReasons.map((item) => (
                        <div key={item.reason} className="text-xs text-gray-700">
                            {item.count}x {truncateReason(item.reason, 56)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const updateTemplateType = (type: TemplateFormState["type"]) => {
        setNewTemplate((prev) => ({
            ...prev,
            type,
            content: type === "carousel" ? prev.content : prev.content,
            mediaFile: type === "image" || type === "video" ? prev.mediaFile : null,
            carouselItems: type === "carousel" ? (prev.carouselItems.length ? prev.carouselItems : [createCarouselDraftItem()]) : prev.carouselItems,
            buttons: type === "carousel" ? [] : prev.buttons,
        }));
    };

    const updateCarouselItem = (id: string, patch: Partial<CarouselDraftItem>) => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.map((item) => item.id === id ? { ...item, ...patch } : item),
        }));
    };

    const addCarouselItem = () => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: [...prev.carouselItems, createCarouselDraftItem()],
        }));
    };

    const removeCarouselItem = (id: string) => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.length === 1
                ? prev.carouselItems
                : prev.carouselItems.filter((item) => item.id !== id),
        }));
    };

    const updateTemplateButton = (id: string, patch: Partial<TemplateButtonDraft>) => {
        setNewTemplate((prev) => ({
            ...prev,
            buttons: prev.buttons.map((button) => button.id === id ? { ...button, ...patch } : button),
        }));
    };

    const updateTemplateCategory = (category: TemplateFormState["category"]) => {
        if (hasCopyCodeButton && category !== "marketing") {
            message.warning("Copy offer code CTA buttons must stay under the Marketing category");
            return;
        }

        setNewTemplate((prev) => ({ ...prev, category }));
    };

    const updateTemplateButtonAction = (id: string, action: "phone_number" | "url_static" | "url_dynamic" | "copy_code") => {
        if (action === "copy_code" && newTemplate.category !== "marketing") {
            message.info("Switched this template to Marketing because Copy offer code buttons are approved there more reliably");
        }

        setNewTemplate((prev) => ({
            ...prev,
            category: action === "copy_code" ? "marketing" : prev.category,
            buttons: prev.buttons.map((button) => {
                if (button.id !== id) return button;

                if (action === "phone_number") {
                    return {
                        ...button,
                        type: "phone_number",
                        urlType: undefined,
                        url: "",
                        urlSuffix: "",
                        offerCode: "",
                    };
                }

                if (action === "copy_code") {
                    return {
                        ...button,
                        type: "copy_code",
                        text: "",
                        phoneNumber: "",
                        urlType: undefined,
                        url: "",
                        urlSuffix: "",
                    };
                }

                return {
                    ...button,
                    type: "url",
                    urlType: action === "url_dynamic" ? "dynamic" : "static",
                    phoneNumber: "",
                    offerCode: "",
                };
            }),
        }));
    };

    const addTemplateButton = () => {
        setNewTemplate((prev) => {
            if (prev.buttons.length >= 3) {
                message.warning("A maximum of 3 CTA buttons is allowed");
                return prev;
            }

            return {
                ...prev,
                buttons: [...prev.buttons, createTemplateButtonDraft()],
            };
        });
    };

    const removeTemplateButton = (id: string) => {
        setNewTemplate((prev) => ({
            ...prev,
            buttons: prev.buttons.filter((button) => button.id !== id),
        }));
    };

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.content.toLowerCase().includes(templateSearch.toLowerCase());
        const matchesStatus = !templateStatusFilter || t.status === templateStatusFilter;
        const matchesType = !templateTypeFilter || t.type === templateTypeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });
    const liveCarouselPreviewItems = newTemplate.carouselItems.map((item) => ({
        text: item.text,
        mediaUrl: carouselMediaPreviewUrls[item.id],
    }));
    const liveButtonPreviewItems: TemplateButtonConfig[] = newTemplate.buttons.map(({ id, ...button }) => button);

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
                    <Tooltip title="Edit Contacts">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditContactList(record)} />
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
                        {record.metaSubmissionStatus !== "submitted" && record.metaSubmissionError ? (
                            <div className="text-xs text-amber-700 max-w-sm mt-1" style={{ whiteSpace: "normal" }}>
                                {record.metaSubmissionError}
                            </div>
                        ) : null}
                    </div>
                </div>
            ),
        },
        {
            title: "Type", dataIndex: "type", key: "type",
            render: (type: string) => <Tag color="blue" className="capitalize">{type}</Tag>,
        },
        {
            title: "Category", dataIndex: "category", key: "category",
            render: (category: string) => <Tag color="geekblue" className="capitalize">{category}</Tag>,
        },
        {
            title: "Meta Submission", dataIndex: "metaSubmissionStatus", key: "metaSubmissionStatus",
            render: (_: string, record: Template) => (
                <div>
                    <MetaSubmissionTag status={record.metaSubmissionStatus} />
                    {record.metaSubmissionError ? (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs" style={{ whiteSpace: "normal" }}>
                            {record.metaSubmissionError}
                        </div>
                    ) : null}
                </div>
            ),
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
                    {record.metaSubmissionStatus === "submitted" && record.status === "pending" && (
                        <Tooltip title="Refresh Status">
                            <Button size="small" icon={<ReloadOutlined />} onClick={() => { void loadTemplates(); }} />
                        </Tooltip>
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
                    <Tooltip title={getCampaignFailureTooltip(record)}>
                        <Tag
                            color={record.stats.failed > 0 ? "error" : "default"}
                            className={record.stats.failed > 0 ? "cursor-pointer select-none" : ""}
                            onClick={record.stats.failed > 0 ? () => { void openCampaignReport(record); } : undefined}
                        >
                            <CloseCircleOutlined /> {record.stats.failed}
                            {record.stats.failed > 0 ? <EyeOutlined className="ml-1" /> : null}
                        </Tag>
                    </Tooltip>
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
                    <Tooltip title="View delivery report">
                        <Button size="small" icon={<BarChartOutlined />} onClick={() => { void openCampaignReport(record); }} />
                    </Tooltip>
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

    const failedMessages = getFailedCampaignMessages(selectedCampaignReport);
    const failureSummary = summarizeFailureReasons(failedMessages);
    const failureColumns = [
        {
            title: "Recipient",
            dataIndex: "phone",
            key: "phone",
            render: (phone: string) => (
                <div>
                    <div className="font-medium text-gray-800">{phone}</div>
                    <div className="text-xs text-gray-500">WhatsApp recipient</div>
                </div>
            ),
        },
        {
            title: "Failure Reason",
            dataIndex: "errorMessage",
            key: "errorMessage",
            render: (value: string | null | undefined) => {
                const reason = getDeliveryFailureReason(value);

                return (
                    <Tooltip title={<div className="max-w-md whitespace-pre-wrap">{reason}</div>}>
                        <div
                            className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                            style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {reason}
                        </div>
                    </Tooltip>
                );
            },
        },
        {
            title: "Last Updated",
            key: "updatedAt",
            render: (_: any, record: CampaignMessage) => (
                <div className="text-xs text-gray-600">
                    {dayjs(record.updatedAt || record.createdAt).format("MMM DD, YYYY HH:mm")}
                </div>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: CampaignMessage["status"]) => <StatusTag status={status} />,
        },
    ];

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
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            setNewTemplate(createEmptyTemplateState());
                                            setTemplateModal(true);
                                        }}
                                    >
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
                title={<span><EditOutlined className="mr-2 text-blue-500" />Edit Contact List</span>}
                open={contactEditModal}
                onCancel={closeContactEditModal}
                onOk={() => { void saveEditedContactList(); }}
                confirmLoading={contactEditLoading}
                okText="Save Changes"
                width={900}
            >
                <div className="space-y-4 py-2">
                    <Form layout="vertical">
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="List Name" required>
                                    <Input
                                        placeholder="E.g. VIP Guests March"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Tags (comma separated)">
                                    <Input
                                        placeholder="vip, hotel"
                                        value={contactForm.tags}
                                        onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-gray-800">Contacts</div>
                            <div className="text-xs text-gray-500">Update the name, phone, and email for each contact in this list.</div>
                        </div>
                        <Button type="dashed" icon={<PlusOutlined />} onClick={addContactEditRow}>
                            Add Contact
                        </Button>
                    </div>

                    <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 p-4 space-y-3">
                        {contactEditRows.map((row, index) => (
                            <div key={`${row.id || "new"}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-sm font-medium text-gray-700">Contact {index + 1}</div>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={contactEditRows.length === 1}
                                        onClick={() => removeContactEditRow(index)}
                                    />
                                </div>
                                <Row gutter={12}>
                                    <Col xs={24} md={8}>
                                        <Input
                                            placeholder="Name"
                                            value={row.name}
                                            onChange={(e) => updateContactEditRow(index, { name: e.target.value })}
                                        />
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Input
                                            placeholder="Phone"
                                            value={row.phone}
                                            onChange={(e) => updateContactEditRow(index, { phone: e.target.value })}
                                        />
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Input
                                            placeholder="Email"
                                            value={row.email || ""}
                                            onChange={(e) => updateContactEditRow(index, { email: e.target.value })}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal
                title={<span><FileTextOutlined className="mr-2 text-purple-500" />Create Template</span>}
                open={templateModal}
                onCancel={() => {
                    setTemplateModal(false);
                    setNewTemplate(createEmptyTemplateState());
                }}
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
                                        value={newTemplate.category}
                                        onChange={updateTemplateCategory}
                                    >
                                        <Option value="utility">Utility</Option>
                                        <Option value="marketing">Marketing</Option>
                                        <Option value="authentication">Authentication</Option>
                                        <Option value="service">Service</Option>
                                    </Select>
                                </Form.Item>
                                {hasCopyCodeButton ? (
                                    <Alert
                                        showIcon
                                        type="info"
                                        message={`Copy offer code templates are safest as Marketing. Use a fixed code up to ${COPY_CODE_MAX_LENGTH} characters; WhatsApp controls the button label.`}
                                    />
                                ) : null}
                                <Form.Item label="Media Type">
                                    <Select
                                        value={newTemplate.type}
                                        onChange={updateTemplateType}
                                    >
                                        <Option value="text"><FileTextOutlined className="mr-2" />Text</Option>
                                        <Option value="image"><PictureOutlined className="mr-2" />Image</Option>
                                        <Option value="video"><VideoCameraOutlined className="mr-2" />Video</Option>
                                        <Option value="carousel"><AppstoreOutlined className="mr-2" />Carousel</Option>
                                    </Select>
                                </Form.Item>
                                {(newTemplate.type === "image" || newTemplate.type === "video") && (
                                    <Form.Item label={`Upload ${newTemplate.type === "image" ? "Image" : "Video"}`} required>
                                        <Upload
                                            accept={newTemplate.type === "image" ? "image/*" : "video/*"}
                                            beforeUpload={(file) => {
                                                setNewTemplate((prev) => ({ ...prev, mediaFile: file as File }));
                                                return false;
                                            }}
                                            onRemove={() => {
                                                setNewTemplate((prev) => ({ ...prev, mediaFile: null }));
                                            }}
                                            maxCount={1}
                                            fileList={getUploadFileList(newTemplate.mediaFile)}
                                        >
                                            <Button icon={<UploadOutlined />}>Choose File</Button>
                                        </Upload>
                                    </Form.Item>
                                )}
                                {newTemplate.type !== "carousel" && (
                                    <Form.Item label="Message Content" required>
                                        <TextArea
                                            rows={5}
                                            placeholder={"Hi {{name}}, welcome to {{hotel}}!"}
                                            value={newTemplate.content}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                        />
                                    </Form.Item>
                                )}
                                {newTemplate.type === "carousel" && (
                                    <>
                                        <Form.Item label="Intro Text">
                                            <TextArea
                                                rows={3}
                                                placeholder="Optional text above the carousel"
                                                value={newTemplate.content}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                            />
                                        </Form.Item>
                                        <div className="space-y-3">
                                            {newTemplate.carouselItems.map((item, index) => (
                                                <Card key={item.id} size="small" title={`Card ${index + 1}`}>
                                                    <div className="space-y-3">
                                                        <Upload
                                                            accept="image/*"
                                                            beforeUpload={(file) => {
                                                                updateCarouselItem(item.id, { file: file as File });
                                                                return false;
                                                            }}
                                                            onRemove={() => {
                                                                updateCarouselItem(item.id, { file: null });
                                                            }}
                                                            maxCount={1}
                                                            fileList={getUploadFileList(item.file)}
                                                        >
                                                            <Button icon={<UploadOutlined />}>Upload Card Image</Button>
                                                        </Upload>
                                                        <TextArea
                                                            rows={3}
                                                            placeholder="Card text"
                                                            value={item.text}
                                                            onChange={(e) => updateCarouselItem(item.id, { text: e.target.value })}
                                                        />
                                                        <div className="flex justify-end">
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                disabled={newTemplate.carouselItems.length === 1}
                                                                onClick={() => removeCarouselItem(item.id)}
                                                            >
                                                                Remove Card
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            <Button type="dashed" block icon={<PlusOutlined />} onClick={addCarouselItem}>
                                                Add Carousel Card
                                            </Button>
                                        </div>
                                    </>
                                )}
                                {newTemplate.type !== "carousel" && (
                                    <Form.Item label="Call To Action Buttons">
                                        <div className="space-y-3">
                                            {newTemplate.buttons.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                                                    Add up to 3 CTA buttons. Supported types: Phone Number, Static URL, Dynamic URL, and Copy Code.
                                                </div>
                                            ) : null}
                                            {newTemplate.buttons.map((button, index) => (
                                                <Card key={button.id} size="small" title={`CTA Button ${index + 1}`}>
                                                    <div className="space-y-3">
                                                        <Select
                                                            value={getButtonActionValue(button)}
                                                            onChange={(value) => updateTemplateButtonAction(button.id, value)}
                                                            className="w-full"
                                                        >
                                                            <Option value="phone_number">Call phone number</Option>
                                                            <Option value="url_static">Visit website (static)</Option>
                                                            <Option value="url_dynamic">Visit website (dynamic)</Option>
                                                            <Option value="copy_code">Copy offer code</Option>
                                                        </Select>

                                                        {button.type === "phone_number" && (
                                                            <Row gutter={12}>
                                                                <Col span={12}>
                                                                    <Input
                                                                        placeholder="Button label"
                                                                        value={button.text}
                                                                        onChange={(e) => updateTemplateButton(button.id, { text: e.target.value })}
                                                                    />
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Input
                                                                        placeholder="Phone number"
                                                                        value={button.phoneNumber}
                                                                        onChange={(e) => updateTemplateButton(button.id, { phoneNumber: e.target.value })}
                                                                    />
                                                                </Col>
                                                            </Row>
                                                        )}

                                                        {button.type === "url" && (
                                                            <>
                                                                <Input
                                                                    placeholder="Button label"
                                                                    value={button.text}
                                                                    onChange={(e) => updateTemplateButton(button.id, { text: e.target.value })}
                                                                />
                                                                <Input
                                                                    placeholder="https://example.com/path"
                                                                    value={button.url}
                                                                    onChange={(e) => updateTemplateButton(button.id, { url: e.target.value })}
                                                                />
                                                                {button.urlType === "dynamic" ? (
                                                                    <Input
                                                                        placeholder="{{booking_id}} or offer/{{promo_code}}"
                                                                        value={button.urlSuffix}
                                                                        onChange={(e) => updateTemplateButton(button.id, { urlSuffix: e.target.value })}
                                                                    />
                                                                ) : null}
                                                            </>
                                                        )}

                                                        {button.type === "copy_code" && (
                                                            <Input
                                                                placeholder={`Fixed offer code, e.g. SUMMER20 (${COPY_CODE_MAX_LENGTH} max)`}
                                                                value={button.offerCode}
                                                                onChange={(e) => updateTemplateButton(button.id, { offerCode: e.target.value })}
                                                                maxLength={COPY_CODE_MAX_LENGTH}
                                                                showCount
                                                            />
                                                        )}

                                                        <div className="flex justify-end">
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                onClick={() => removeTemplateButton(button.id)}
                                                            >
                                                                Remove Button
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            <Button
                                                type="dashed"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={addTemplateButton}
                                                disabled={newTemplate.buttons.length >= 3}
                                            >
                                                Add CTA Button
                                            </Button>
                                        </div>
                                    </Form.Item>
                                )}
                                {newTemplate.type === "carousel" && (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="CTA buttons are currently available for text, image, and video templates."
                                    />
                                )}
                            </Form>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    onClick={() => {
                                        setTemplateModal(false);
                                        setNewTemplate(createEmptyTemplateState());
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="primary" onClick={createTemplate}>Submit for Approval</Button>
                            </div>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2"><EyeOutlined />Live Preview</div>
                        <WhatsAppPreview
                            content={newTemplate.content}
                            type={newTemplate.type}
                            mediaSrc={templateMediaPreviewUrl}
                            mediaLabel={newTemplate.mediaFile?.name}
                            carouselItems={liveCarouselPreviewItems}
                            buttons={liveButtonPreviewItems}
                        />
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
                            <Tag color="geekblue" className="capitalize">{selectedTemplate.category}</Tag>
                            <Tag className="capitalize">{selectedTemplate.type}</Tag>
                        </div>
                        <div className="mb-3 text-center">
                            <MetaSubmissionTag status={selectedTemplate.metaSubmissionStatus} />
                            <div className="text-xs text-gray-500 mt-2">
                                {selectedTemplate.metaSubmissionStatus === "submitted"
                                    ? "This template was submitted to WhatsApp Meta for approval."
                                    : selectedTemplate.metaSubmissionError || "This template is currently saved in your app only and has not been submitted to Meta."}
                            </div>
                        </div>
                        <WhatsAppPreview
                            content={selectedTemplate.content}
                            type={selectedTemplate.type}
                            mediaSrc={selectedTemplate.mediaUrl}
                            mediaLabel={selectedTemplate.mediaUrl ? "Uploaded media attached" : undefined}
                            carouselItems={selectedTemplate.carouselItems ?? undefined}
                            buttons={selectedTemplate.buttons ?? undefined}
                        />
                        {selectedTemplate.carouselItems && selectedTemplate.carouselItems.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {selectedTemplate.carouselItems.map((item, index) => (
                                    <Card key={`${item.mediaUrl}-${index}`} size="small" title={`Card ${index + 1}`}>
                                        {item.mediaUrl ? (
                                            <img
                                                src={item.mediaUrl}
                                                alt={item.text || `Card ${index + 1}`}
                                                className="mb-2 h-28 w-full rounded-lg object-cover"
                                            />
                                        ) : null}
                                        <div className="text-sm text-gray-700">{item.text || "No text"}</div>
                                    </Card>
                                ))}
                            </div>
                        )}
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
                        {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                            <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1">CTA Buttons:</div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTemplate.buttons.map((button, index) => (
                                        <Tag key={`${button.type}-${index}`} color="blue">
                                            {button.type === "phone_number"
                                                ? `Phone: ${button.text || "Call"}`
                                                : button.type === "copy_code"
                                                    ? `Copy Code: ${button.offerCode || "Configured"}`
                                                    : `${button.urlType === "dynamic" ? "Dynamic URL" : "Static URL"}: ${button.text || "Visit"}`}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            <Modal
                title={<span><BarChartOutlined className="mr-2 text-orange-500" />Delivery Report</span>}
                open={campaignReportModal}
                onCancel={closeCampaignReport}
                width={940}
                footer={[
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        loading={campaignReportLoading}
                        onClick={() => {
                            if (selectedCampaignReport) {
                                void openCampaignReport(selectedCampaignReport);
                            }
                        }}
                    >
                        Refresh
                    </Button>,
                    <Button key="close" type="primary" onClick={closeCampaignReport}>
                        Close
                    </Button>,
                ]}
            >
                {campaignReportLoading && !selectedCampaignReport ? (
                    <div className="py-10 text-center text-sm text-gray-500">Loading delivery details...</div>
                ) : selectedCampaignReport ? (
                    <div className="space-y-4">
                        <div
                            className="rounded-3xl border p-5"
                            style={{
                                background: "linear-gradient(135deg, #fff7e6 0%, #fff1f0 100%)",
                                borderColor: "#ffd8bf",
                            }}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-gray-800">{selectedCampaignReport.name}</div>
                                    <div className="text-sm text-gray-500">
                                        {selectedCampaignReport.templateName} · {selectedCampaignReport.contactListName}
                                    </div>
                                </div>
                                <StatusTag status={selectedCampaignReport.status} />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                {[
                                    { label: "Sent", value: selectedCampaignReport.stats.sent, color: "#1677ff", bg: "#e6f4ff" },
                                    { label: "Delivered", value: selectedCampaignReport.stats.delivered, color: "#389e0d", bg: "#f6ffed" },
                                    { label: "Failed", value: selectedCampaignReport.stats.failed, color: "#cf1322", bg: "#fff1f0" },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl px-4 py-3"
                                        style={{ background: item.bg }}
                                    >
                                        <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
                                        <div className="mt-1 text-2xl font-semibold" style={{ color: item.color }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {failedMessages.length > 0 ? (
                                <div className="mt-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Failure Summary
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {failureSummary.map((item) => (
                                            <Tooltip key={item.reason} title={<div className="max-w-md whitespace-pre-wrap">{item.reason}</div>}>
                                                <Tag color="volcano" className="rounded-full px-3 py-1">
                                                    {item.count}x {truncateReason(item.reason, 54)}
                                                </Tag>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Alert
                                    className="mt-4"
                                    type="success"
                                    showIcon
                                    message="No failed deliveries in this campaign"
                                    description="If a message fails later, the exact Meta or WhatsApp reason will show up here."
                                />
                            )}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-700">Failed recipients</div>
                                <div className="text-xs text-gray-500">
                                    Showing {failedMessages.length} failed contact{failedMessages.length === 1 ? "" : "s"}
                                </div>
                            </div>
                            <Table
                                rowKey="id"
                                columns={failureColumns}
                                dataSource={failedMessages}
                                loading={campaignReportLoading}
                                pagination={{ pageSize: 6, hideOnSinglePage: true }}
                                locale={{
                                    emptyText: (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="No failed recipients for this campaign"
                                        />
                                    ),
                                }}
                                scroll={{ x: 720 }}
                            />
                        </div>
                    </div>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Campaign details are not available right now"
                    />
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
