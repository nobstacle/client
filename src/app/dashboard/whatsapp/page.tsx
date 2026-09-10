"use client";
import React, {  useState, useEffect  } from "react";
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
    LinkOutlined, PhoneOutlined, CopyOutlined, MailOutlined,
    DownOutlined, UpOutlined,
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
const CAROUSEL_MIN_CARDS = 2;
const CAROUSEL_MAX_CARDS = 10;
const CAROUSEL_MAX_BUTTONS = 2;
const TEMPLATE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const TEMPLATE_VIDEO_MAX_BYTES = 16 * 1024 * 1024;
const CAMPAIGN_POLL_INTERVAL_MS = 4000;
const RECENT_DRAFT_CAMPAIGN_MS = 5 * 60 * 1000;

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
    externalId?: string | null;
    language?: string;
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
    buttons?: TemplateButtonConfig[] | null;
}

interface CarouselDraftItem {
    id: string;
    text: string;
    file: File | null;
    mediaUrl?: string;
    buttons: TemplateButtonDraft[];
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
    contactListIds?: number[];
    contactListNames?: string[];
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

const createCarouselDraftItem = (buttonBlueprints?: TemplateButtonDraft[]): CarouselDraftItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    file: null,
    buttons: (buttonBlueprints?.length ? buttonBlueprints : [createTemplateButtonDraft()]).map((button) => ({
        ...createTemplateButtonDraft(),
        type: button.type === "copy_code" ? "url" : button.type,
        urlType: button.urlType || "static",
    })),
});

const createEmptyTemplateState = (): TemplateFormState => ({
    name: "",
    category: "marketing",
    type: "text",
    content: "",
    mediaFile: null,
    carouselItems: [createCarouselDraftItem(), createCarouselDraftItem()],
    buttons: [],
});

const serializeTemplateButton = (button: TemplateButtonDraft) => {
    if (button.type === "phone_number") {
        return {
            type: "phone_number" as const,
            text: button.text?.trim(),
            phoneNumber: button.phoneNumber?.trim(),
        };
    }

    if (button.type === "copy_code") {
        return {
            type: "copy_code" as const,
            offerCode: button.offerCode?.trim(),
        };
    }

    return {
        type: "url" as const,
        urlType: button.urlType,
        text: button.text?.trim(),
        url: button.url?.trim(),
        urlSuffix: button.urlType === "dynamic" ? button.urlSuffix?.trim() : undefined,
    };
};

const getCarouselButtonSignature = (buttons: Array<Pick<TemplateButtonConfig, "type" | "urlType">>): string => (
    buttons.map((button) => (
        button.type === "url" ? `url:${button.urlType || "static"}` : button.type
    )).join("|")
);

const extractTemplateVariableTokens = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return matches
        .map((match) => match.replace(/\{\{|\}\}/g, ""))
        .filter((token, index, list) => list.indexOf(token) === index);
};

const extractRawTemplatePlaceholders = (content: string): string[] => {
    const matches = String(content || "").match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map((match) => match.slice(2, -2));
};

const canonicalizeTemplateVariableToken = (value: string): string | null => {
    const token = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    if (!token || /^\d+$/.test(token) || token.length > 30 || !/^[a-z][a-z0-9_]*$/.test(token)) {
        return null;
    }

    return token;
};

const normalizeTemplateVariableToken = (value: string): string => (
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
);

const TEMPLATE_VARIABLE_SUGGESTIONS = [
    { token: "name", label: "Contact name" },
    { token: "firstname", label: "First name" },
    { token: "lastname", label: "Last name" },
    { token: "email", label: "Email" },
    { token: "phone", label: "Phone" },
] as const;

const SUPPORTED_TEMPLATE_VARIABLE_TOKENS = new Set([
    "name",
    "fullname",
    "full_name",
    "guestname",
    "guest_name",
    "customername",
    "customer_name",
    "firstname",
    "first_name",
    "givenname",
    "given_name",
    "lastname",
    "last_name",
    "surname",
    "familyname",
    "family_name",
    "email",
    "emailaddress",
    "email_address",
    "mail",
    "phone",
    "phonenumber",
    "phone_number",
    "mobile",
    "mobile_number",
    "mobilenumber",
    "whatsapp",
    "whatsappnumber",
    "whatsapp_number",
]);

const getTemplateVariableHelpText = (token: string): string => {
    const normalized = normalizeTemplateVariableToken(token);

    if (["name", "fullname", "guestname", "customername"].includes(normalized)) {
        return "Filled from the contact's saved name when the campaign sends.";
    }

    if (["firstname", "givenname"].includes(normalized)) {
        return "Filled from the first word of the contact name when the campaign sends.";
    }

    if (["lastname", "surname", "familyname"].includes(normalized)) {
        return "Filled from the remaining part of the contact name after the first word.";
    }

    if (["email", "emailaddress", "mail"].includes(normalized)) {
        return "Filled from the contact email when the campaign sends.";
    }

    if (["phone", "phonenumber", "mobile", "whatsapp", "whatsappnumber"].includes(normalized)) {
        return "Filled from the contact phone/WhatsApp number when the campaign sends.";
    }

    return `Filled from a matching imported custom field. Use lowercase with underscores, e.g. {{booking_id}}.`;
};

const isSupportedTemplateVariable = (token: string): boolean => {
    const canonical = canonicalizeTemplateVariableToken(token);
    if (!canonical) return false;

    return SUPPORTED_TEMPLATE_VARIABLE_TOKENS.has(canonical)
        || SUPPORTED_TEMPLATE_VARIABLE_TOKENS.has(normalizeTemplateVariableToken(canonical))
        || /^[a-z][a-z0-9_]*$/.test(canonical);
};

const getTemplateVariableValidationError = (
    content: string,
    extraTexts: string[] = [],
    options?: { allowBodyVariables?: boolean; staticOnlyLabel?: string },
): string | null => {
    const allowBodyVariables = options?.allowBodyVariables !== false;
    const texts = [content, ...extraTexts];
    const rawPlaceholders = texts.flatMap((value) => extractRawTemplatePlaceholders(value));

    for (const raw of rawPlaceholders) {
        const canonical = canonicalizeTemplateVariableToken(raw);
        if (!canonical) {
            return `Invalid parameter "{{${String(raw).trim()}}}". Use {{name}}, {{firstname}}, {{lastname}}, {{email}}, or {{phone}}. Custom fields must look like {{booking_id}}.`;
        }
        if (!isSupportedTemplateVariable(canonical)) {
            return `Unsupported parameter {{${canonical}}}. Only contact fields WhatsApp can fill are allowed.`;
        }
    }

    if (!allowBodyVariables && rawPlaceholders.length) {
        return options?.staticOnlyLabel || "This field cannot include template variables.";
    }

    if (!allowBodyVariables) {
        return null;
    }

    if (/\{\{\w+\}\}\{\{\w+\}\}/.test(content)) {
        return "Variables cannot sit next to each other. Add text or a space between them.";
    }

    if (extractTemplateVariableTokens(content).length && !content.replace(/\{\{\w+\}\}/g, "").trim()) {
        return "Message text cannot be only variables. Add surrounding text so Meta can approve the template.";
    }

    if (extractTemplateVariableTokens(content).length) {
        let hasLeadingVar = false;
        let hasTrailingVar = false;
        try {
            hasLeadingVar = new RegExp('^[^\\p{L}\\p{N}]*\\{\\{', 'u').test(content);
            hasTrailingVar = new RegExp('\\}\\}[^\\p{L}\\p{N}]*$', 'u').test(content);
        } catch {
            hasLeadingVar = /^[^a-zA-Z0-9]*\{\{/.test(content);
            hasTrailingVar = /\}\}[^a-zA-Z0-9]*$/.test(content);
        }

        if (hasLeadingVar) {
            return "Variables cannot be at the start of the message text. Meta requires static text (like 'Hi {{name}}') before the first variable.";
        }
        if (hasTrailingVar) {
            return "Variables cannot be at the end of the message text. Meta requires static text after the last variable (for example, 'Choose the best promo for you, {{name}}! Book now to save.').";
        }
    }

    return null;
};

const getTemplateMediaAccept = (type: "image" | "video" | "carousel"): string => (
    type === "video" ? "video/mp4,.mp4" : "image/jpeg,image/png,.jpg,.jpeg,.png"
);

const getTemplateMediaHelpText = (type: "image" | "video" | "carousel"): string => {
    if (type === "video") return "MP4 only, max 16MB. WhatsApp rejects other video formats.";
    if (type === "carousel") return "JPG or PNG, max 5MB per card.";
    return "JPG or PNG only, max 5MB. WhatsApp rejects GIF, WebP, and other formats.";
};

const getTemplateMediaValidationError = (file: File, type: "image" | "video" | "carousel"): string | null => {
    const mime = String(file.type || "").toLowerCase();
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isJpeg = mime === "image/jpeg" || mime === "image/jpg" || ["jpg", "jpeg"].includes(extension);
    const isPng = mime === "image/png" || extension === "png";
    const isMp4 = mime === "video/mp4" || extension === "mp4";

    if (type === "video") {
        if (!isMp4) return "Video templates must use an MP4 file";
        if (file.size > TEMPLATE_VIDEO_MAX_BYTES) return "Video templates must be 16MB or smaller";
        return null;
    }

    if (!isJpeg && !isPng) {
        return type === "carousel"
            ? "Carousel cards must use a JPG or PNG file"
            : "Image templates must use a JPG or PNG file";
    }

    if (file.size > TEMPLATE_IMAGE_MAX_BYTES) {
        return type === "carousel"
            ? "Carousel images must be 5MB or smaller"
            : "Image templates must be 5MB or smaller";
    }

    return null;
};

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

const RESERVED_CONTACT_FIELD_KEYS = ["name", "phone", "email"] as const;

const normalizeContactFieldKey = (value: string): string => (
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
);

const getContactVariableKeys = (rows: ContactListContact[]): string[] => {
    const keys: string[] = [];

    rows.forEach((row) => {
        Object.keys(row.variables || {}).forEach((key) => {
            const normalizedKey = normalizeContactFieldKey(key);

            if (!normalizedKey || RESERVED_CONTACT_FIELD_KEYS.includes(normalizedKey as typeof RESERVED_CONTACT_FIELD_KEYS[number])) {
                return;
            }

            if (!keys.some((existingKey) => normalizeContactFieldKey(existingKey) === normalizedKey)) {
                keys.push(key);
            }
        });
    });

    return keys;
};

const prepareContactRowsForEdit = (rows: ContactListContact[], variableKeys: string[]): ContactListContact[] => (
    rows.map((row) => {
        const variables = variableKeys.reduce<Record<string, string>>((acc, key) => {
            acc[key] = String(row.variables?.[key] ?? "");
            return acc;
        }, {});

        return {
            ...row,
            name: normalizeEditableContactName(row.name),
            email: row.email || "",
            variables: Object.keys(variables).length ? variables : undefined,
        };
    })
);

const createEmptyContactRow = (variableKeys: string[] = []): ContactListContact => ({
    name: "",
    phone: "",
    email: "",
    variables: variableKeys.length
        ? variableKeys.reduce<Record<string, string>>((acc, key) => {
            acc[key] = "";
            return acc;
        }, {})
        : undefined,
});

const formatContactFieldLabel = (value: string): string => {
    const normalized = String(value || "").trim().replace(/[_-]+/g, " ");
    if (!normalized) return "Custom Field";

    return normalized
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const getFilledCustomFieldCount = (row: ContactListContact): number => (
    Object.values(row.variables || {}).filter((value) => String(value || "").trim()).length
);

const getContactPreviewText = (row: ContactListContact): string => {
    const parts = [row.phone, row.email]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

    return parts.join("  •  ") || "No primary details yet";
};

const sanitizeDownloadFilename = (value: string): string => (
    String(value || "contact-list")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "contact-list"
);

const getDownloadFilename = (contentDisposition: string | null, fallback: string): string => {
    if (!contentDisposition) return fallback;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        return decodeURIComponent(utfMatch[1]);
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || fallback;
};

const normalizeEditableContactName = (value?: string | null): string => {
    const normalized = String(value || "").trim();
    return normalized.toLowerCase() === "unknown" ? "" : normalized;
};

const matchesContactListSearch = (list: ContactList, rawSearch: string): boolean => {
    const normalizedSearch = rawSearch.trim().toLowerCase();
    if (!normalizedSearch) return true;

    if (list.name.toLowerCase().includes(normalizedSearch)) {
        return true;
    }

    return (list.tags || []).some((tag) => tag.toLowerCase().includes(normalizedSearch));
};

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
            <div className="rounded-lg mb-2 overflow-hidden" style={{ background: "#d0c8c0", height: type === "video" ? 168 : 120 }}>
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
            style={{ background: "#d0c8c0", height: type === "video" ? 168 : 120, display: "flex", alignItems: "center", justifyContent: "center" }}
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
    carouselItems?: Array<{ text: string; mediaUrl?: string; buttons?: TemplateButtonConfig[] | null }>;
    buttons?: TemplateButtonConfig[];
}) => (
    <div className="flex justify-center py-2">
        <div
            className="relative rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 290, maxHeight: 560, background: "#1a1a2e", border: "8px solid #2d2d44" }}
        >
            <div className="flex justify-between items-center px-4 py-1 text-white text-xs" style={{ background: "#128C7E" }}>
                <span className="font-semibold">9:41</span>
                <div className="flex gap-1 items-center"><span>●●●</span></div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2" style={{ background: "#128C7E" }}>
                <Avatar size={34} style={{ background: "#075E54" }} icon={<MdWhatsapp />} />
                <div className="min-w-0 flex-1">
                    <div className="text-white text-xs font-semibold truncate">Nobstacle Business</div>
                    <div className="text-green-100 text-[10px]">Official Business Account</div>
                </div>
            </div>
            <div className="p-2.5 flex-1 overflow-y-auto" style={{ background: "#ECE5DD", maxHeight: 440 }}>
                {type === "image" && (
                    <MediaPreviewCard type="image" src={mediaSrc} label={mediaLabel} />
                )}
                {type === "video" && (
                    <MediaPreviewCard type="video" src={mediaSrc} label={mediaLabel} />
                )}
                <div className="rounded-lg rounded-tl-none p-2.5 text-xs shadow-sm max-w-full" style={{ background: "#fff", color: "#333" }}>
                    <p className="m-0 leading-relaxed" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {content || (type === "carousel" ? "Carousel card previews will appear below..." : "Your message preview will appear here...")}
                    </p>
                    <div className="flex justify-end mt-1">
                        <span className="text-gray-400" style={{ fontSize: 9 }}>{dayjs().format("HH:mm")} ✓✓</span>
                    </div>
                </div>
                {type === "carousel" && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin" style={{ scrollSnapType: "x mandatory" }}>
                        {(carouselItems?.length ? carouselItems : [{ text: "Card 1" }, { text: "Card 2" }]).map((item, index) => (
                            <div
                                key={`${item.text}-${index}`}
                                className="flex flex-col flex-shrink-0 w-36 rounded-lg overflow-hidden shadow-xs border border-gray-200 bg-white"
                                style={{ scrollSnapAlign: "start" }}
                            >
                                {item.mediaUrl ? (
                                    <img
                                        src={item.mediaUrl}
                                        alt={item.text || `Card ${index + 1}`}
                                        className="h-20 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-20 bg-gray-100 text-gray-400">
                                        <AppstoreOutlined style={{ fontSize: 20 }} />
                                    </div>
                                )}
                                <div className="p-1.5 flex-1 flex flex-col justify-between">
                                    <div className="text-[11px] text-gray-800 font-medium line-clamp-2 leading-tight" style={{ wordBreak: "break-word" }}>
                                        {item.text || `Card ${index + 1}`}
                                    </div>
                                    {item.buttons && item.buttons.length > 0 ? (
                                        <div className="mt-1.5 pt-1 border-t border-gray-100 space-y-0.5">
                                            {item.buttons.map((btn, bIdx) => (
                                                <div key={bIdx} className="text-[10px] font-semibold text-[#00a884] flex items-center justify-center gap-1 py-0.5">
                                                    {getPreviewButtonIcon(btn)}
                                                    <span className="truncate">{getPreviewButtonLabel(btn)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {buttons?.length ? (
                    <div className="mt-2 space-y-1.5">
                        {buttons.map((button, index) => (
                            <div
                                key={`${button.type}-${button.text || button.offerCode || index}`}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-600 shadow-xs"
                            >
                                {getPreviewButtonIcon(button)}
                                <span className="truncate">{getPreviewButtonLabel(button)}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#F0F0F0" }}>
                <div className="flex-1 rounded-full bg-white px-3 py-1 text-gray-400 text-[11px]">Type a message</div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#128C7E" }}>
                    <SendOutlined style={{ color: "white", fontSize: 11 }} />
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

    const metaConnected = metaConnection.connected;
    const hasPendingSubmittedTemplates = templates.some(
        (template) => template.metaSubmissionStatus === "submitted" && template.status === "pending",
    );
    const hasActiveCampaigns = campaigns.some((campaign) => {
        if (campaign.status === "sending" || campaign.status === "scheduled") return true;

        if (
            campaign.status === "completed"
            && campaign.stats.sent > (campaign.stats.delivered + campaign.stats.failed)
        ) {
            const updatedAt = Date.parse(campaign.updatedAt || campaign.completedAt || campaign.createdAt);
            return Number.isFinite(updatedAt) && Date.now() - updatedAt < RECENT_DRAFT_CAMPAIGN_MS;
        }

        if (campaign.status !== "draft") return false;
        const createdAt = Date.parse(campaign.createdAt);
        return Number.isFinite(createdAt) && Date.now() - createdAt < RECENT_DRAFT_CAMPAIGN_MS;
    });

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
    const [contactEditVariableKeys, setContactEditVariableKeys] = useState<string[]>([]);
    const [expandedContactEditCards, setExpandedContactEditCards] = useState<number[]>([]);
    const [contactDownloadLoadingId, setContactDownloadLoadingId] = useState<number | null>(null);

    const [templateModal, setTemplateModal] = useState(false);
    const [templatePreviewModal, setTemplatePreviewModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [newTemplate, setNewTemplate] = useState<TemplateFormState>(createEmptyTemplateState());
    const [templateMediaPreviewUrl, setTemplateMediaPreviewUrl] = useState<string>();
    const [carouselMediaPreviewUrls, setCarouselMediaPreviewUrls] = useState<Record<string, string>>({});

    const [campaignModal, setCampaignModal] = useState(false);
    const [campaignStep, setCampaignStep] = useState(0);
    const [campaignForm, setCampaignForm] = useState<{
        name?: string;
        contactListIds?: number[];
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
    const extractedTemplateVariables = extractTemplateVariableTokens(newTemplate.content);
    const invalidTemplatePlaceholders = extractRawTemplatePlaceholders(newTemplate.content)
        .filter((raw, index, items) => items.indexOf(raw) === index && !canonicalizeTemplateVariableToken(raw));
    const dynamicUrlSuffixes = [
        ...newTemplate.buttons
            .filter((button) => button.type === "url" && button.urlType === "dynamic")
            .map((button) => button.urlSuffix || ""),
        ...newTemplate.carouselItems.flatMap((item) => (
            (item.buttons || [])
                .filter((button) => button.type === "url" && button.urlType === "dynamic")
                .map((button) => button.urlSuffix || "")
        )),
    ];
    const selectedCampaignContactLists = contactLists.filter((list) => (
        (campaignForm.contactListIds || []).includes(list.id)
    ));
    const selectedCampaignContactListNames = selectedCampaignContactLists.map((list) => list.name);
    const selectedCampaignRecipientCount = selectedCampaignContactLists.reduce((total, list) => total + list.count, 0);

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
        if (!token || !hasActiveCampaigns) return;

        const interval = window.setInterval(() => {
            Promise.all([loadCampaigns(), loadStats()]).catch((error) => {
                console.error("Campaign status polling failed:", error);
            });
        }, CAMPAIGN_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, hasActiveCampaigns]);

    useEffect(() => {
        if (!token || !campaignReportModal || !selectedCampaignReport) return;

        const shouldPollReport = ["draft", "sending", "scheduled"].includes(selectedCampaignReport.status)
            || (selectedCampaignReport.stats.delivered + selectedCampaignReport.stats.failed < selectedCampaignReport.stats.sent);

        if (!shouldPollReport) return;

        const campaignId = selectedCampaignReport.id;
        const interval = window.setInterval(() => {
            Promise.all([
                loadCampaignReport(campaignId),
                loadCampaigns(),
                loadStats(),
            ])
                .then(([report]) => {
                    setSelectedCampaignReport(report);
                })
                .catch((error) => {
                    console.error("Campaign report polling failed:", error);
                });
        }, CAMPAIGN_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, campaignReportModal, selectedCampaignReport?.id, selectedCampaignReport?.status, selectedCampaignReport?.stats.sent, selectedCampaignReport?.stats.delivered, selectedCampaignReport?.stats.failed]);

    useEffect(() => {
        if (!newTemplate.mediaFile) {
            setTemplateMediaPreviewUrl(editingTemplate?.mediaUrl || undefined);
            return;
        }

        const previewUrl = URL.createObjectURL(newTemplate.mediaFile);
        setTemplateMediaPreviewUrl(previewUrl);

        return () => {
            URL.revokeObjectURL(previewUrl);
        };
    }, [newTemplate.mediaFile, editingTemplate?.mediaUrl]);

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

    const downloadContactList = async (record: ContactList) => {
        try {
            if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_BACKEND_URL) is not configured");
            if (!token) throw new Error("Authentication token missing");

            setContactDownloadLoadingId(record.id);

            const response = await fetch(`${API_URL}/whatsapp/contacts/${record.id}/export`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type") || "";
                const payload = contentType.includes("application/json") ? await response.json() : await response.text();
                const serverMessage = typeof payload === "object"
                    ? Array.isArray(payload?.message)
                        ? payload.message.join(", ")
                        : payload?.message
                    : payload;
                throw new Error(serverMessage || `Request failed (${response.status})`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const fallbackFilename = `${sanitizeDownloadFilename(record.name)}-contacts.csv`;

            link.href = downloadUrl;
            link.download = getDownloadFilename(response.headers.get("content-disposition"), fallbackFilename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            message.error(parseErrorMessage(error));
        } finally {
            setContactDownloadLoadingId(null);
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
            const baseRows = response.items?.length ? response.items : [];
            const variableKeys = getContactVariableKeys(baseRows);

            setContactEditVariableKeys(variableKeys);
            setContactEditRows(
                baseRows.length
                    ? prepareContactRowsForEdit(baseRows, variableKeys)
                    : [createEmptyContactRow(variableKeys)],
            );
            setExpandedContactEditCards(
                baseRows.length ? [0] : [0],
            );
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

    const updateContactEditVariable = (index: number, key: string, value: string) => {
        setContactEditRows((prev) => prev.map((row, rowIndex) => (
            rowIndex === index
                ? {
                    ...row,
                    variables: {
                        ...(row.variables || {}),
                        [key]: value,
                    },
                }
                : row
        )));
    };

    const addContactEditRow = () => {
        setContactEditRows((prev) => {
            const nextRows = [...prev, createEmptyContactRow(contactEditVariableKeys)];
            setExpandedContactEditCards((expanded) => (
                expanded.includes(nextRows.length - 1) ? expanded : [...expanded, nextRows.length - 1]
            ));
            return nextRows;
        });
    };

    const removeContactEditRow = (index: number) => {
        setContactEditRows((prev) => (
            prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)
        ));
        setExpandedContactEditCards((prev) => prev
            .filter((item) => item !== index)
            .map((item) => (item > index ? item - 1 : item)));
    };

    const toggleContactEditCard = (index: number) => {
        setExpandedContactEditCards((prev) => (
            prev.includes(index)
                ? prev.filter((item) => item !== index)
                : [...prev, index]
        ));
    };

    const closeContactEditModal = () => {
        setContactEditModal(false);
        setEditingContactListId(null);
        setContactEditRows([]);
        setContactEditVariableKeys([]);
        setExpandedContactEditCards([]);
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
                .map((row) => {
                    const variables = contactEditVariableKeys.reduce<Record<string, string>>((acc, key) => {
                        const value = String(row.variables?.[key] ?? "").trim();
                        if (value) {
                            acc[key] = value;
                        }
                        return acc;
                    }, {});

                    return {
                        name: row.name.trim(),
                        phone: row.phone.trim(),
                        email: row.email?.trim() || undefined,
                        variables: Object.keys(variables).length ? variables : undefined,
                    };
                })
                .filter((row) => row.name || row.phone || row.email || Object.keys(row.variables || {}).length);

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

    const isTemplateEditable = (template: Template): boolean => {
        if (template.metaSubmissionStatus === "submitted" && template.status === "pending") {
            return false;
        }
        return true;
    };

    const closeTemplateModal = () => {
        setTemplateModal(false);
        setEditingTemplate(null);
        setNewTemplate(createEmptyTemplateState());
        setTemplateMediaPreviewUrl(undefined);
        setCarouselMediaPreviewUrls({});
    };

    const openEditTemplate = (record: Template) => {
        setEditingTemplate(record);

        const buttonDrafts: TemplateButtonDraft[] = (record.buttons || []).map((btn) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: btn.type,
            urlType: btn.urlType || "static",
            text: btn.text || "",
            url: btn.url || "",
            urlSuffix: btn.urlSuffix || "",
            phoneNumber: btn.phoneNumber || "",
            offerCode: btn.offerCode || "",
        }));

        const initialCarouselMediaUrls: Record<string, string> = {};
        const carouselDraftItems: CarouselDraftItem[] = record.type === "carousel" && record.carouselItems?.length
            ? record.carouselItems.map((item) => {
                const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                if (item.mediaUrl) {
                    initialCarouselMediaUrls[id] = item.mediaUrl;
                }
                return {
                    id,
                    text: item.text || "",
                    file: null,
                    mediaUrl: item.mediaUrl,
                    buttons: (item.buttons || []).map((btn) => ({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        type: btn.type,
                        urlType: btn.urlType || "static",
                        text: btn.text || "",
                        url: btn.url || "",
                        urlSuffix: btn.urlSuffix || "",
                        phoneNumber: btn.phoneNumber || "",
                        offerCode: btn.offerCode || "",
                    })),
                };
            })
            : [createCarouselDraftItem(), createCarouselDraftItem()];

        setCarouselMediaPreviewUrls(initialCarouselMediaUrls);
        setNewTemplate({
            name: record.name,
            category: record.category,
            type: record.type,
            content: record.content || "",
            mediaFile: null,
            carouselItems: carouselDraftItems,
            buttons: buttonDrafts,
        });

        setTemplateMediaPreviewUrl(record.mediaUrl || undefined);
        setTemplateModal(true);
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

            if (newTemplate.category === "authentication" && extractTemplateVariableTokens(newTemplate.content).length) {
                message.error("Authentication templates cannot include variables like {{name}}. Use Utility or Marketing instead.");
                return;
            }

            const bodyVariableError = getTemplateVariableValidationError(
                newTemplate.content,
                dynamicUrlSuffixes,
                { allowBodyVariables: newTemplate.category !== "authentication" },
            );
            if (bodyVariableError) {
                message.error(bodyVariableError);
                return;
            }

            if (newTemplate.type === "carousel") {
                const cardWithVariables = newTemplate.carouselItems.find((item) => extractRawTemplatePlaceholders(item.text).length);
                if (cardWithVariables) {
                    message.error("Carousel card text must be static. Put variables like {{name}} in the intro text only.");
                    return;
                }

                if (newTemplate.carouselItems.length < CAROUSEL_MIN_CARDS) {
                    message.error(`Carousel templates need at least ${CAROUSEL_MIN_CARDS} cards`);
                    return;
                }

                if (newTemplate.carouselItems.length > CAROUSEL_MAX_CARDS) {
                    message.error(`Carousel templates can have at most ${CAROUSEL_MAX_CARDS} cards`);
                    return;
                }
            }

            if ((newTemplate.type === "image" || newTemplate.type === "video") && !newTemplate.mediaFile && !editingTemplate?.mediaUrl) {
                message.error(`Please upload a ${newTemplate.type} file`);
                return;
            }

            if (newTemplate.mediaFile && (newTemplate.type === "image" || newTemplate.type === "video")) {
                const mediaError = getTemplateMediaValidationError(newTemplate.mediaFile, newTemplate.type);
                if (mediaError) {
                    message.error(mediaError);
                    return;
                }
            }

            if (newTemplate.type === "carousel") {
                const invalidCard = newTemplate.carouselItems.find((item) => !item.text.trim() || (!item.file && !item.mediaUrl));
                if (invalidCard) {
                    message.error("Each carousel card needs both text and a file/image");
                    return;
                }

                const invalidMediaCard = newTemplate.carouselItems.find((item) => (
                    item.file ? getTemplateMediaValidationError(item.file, "carousel") : null
                ));
                if (invalidMediaCard?.file) {
                    message.error(getTemplateMediaValidationError(invalidMediaCard.file, "carousel"));
                    return;
                }

                const cardMissingButtons = newTemplate.carouselItems.find((item) => !(item.buttons || []).length);
                if (cardMissingButtons) {
                    message.error("Each carousel card needs at least one button. Meta rejects cards without buttons.");
                    return;
                }

                const cardWithTooManyButtons = newTemplate.carouselItems.find((item) => (item.buttons || []).length > CAROUSEL_MAX_BUTTONS);
                if (cardWithTooManyButtons) {
                    message.error(`Each carousel card can have at most ${CAROUSEL_MAX_BUTTONS} buttons`);
                    return;
                }

                const cardWithCopyCode = newTemplate.carouselItems.find((item) => (
                    (item.buttons || []).some((button) => button.type === "copy_code")
                ));
                if (cardWithCopyCode) {
                    message.error("Carousel cards cannot use copy code buttons. Use a website or phone button.");
                    return;
                }

                const expectedButtonSignature = getCarouselButtonSignature(newTemplate.carouselItems[0].buttons || []);
                const mismatchedCard = newTemplate.carouselItems.find((item) => (
                    getCarouselButtonSignature(item.buttons || []) !== expectedButtonSignature
                ));
                if (mismatchedCard) {
                    message.error("Every carousel card must use the same button types in the same order");
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
                message.error("Add buttons on each carousel card instead of template-level CTA buttons");
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

            if (newTemplate.type === "carousel") {
                const invalidCarouselButton = newTemplate.carouselItems
                    .flatMap((item) => item.buttons || [])
                    .find((button) => {
                        if (button.type === "phone_number") {
                            return !button.text?.trim() || !button.phoneNumber?.trim();
                        }

                        return !button.text?.trim()
                            || !button.url?.trim()
                            || (button.urlType === "dynamic" && !button.urlSuffix?.trim());
                    });

                if (invalidCarouselButton) {
                    message.error("Please complete all carousel card button fields before submitting");
                    return;
                }
            }

            const formData = new FormData();
            if (!editingTemplate) {
                formData.append("name", newTemplate.name.trim());
                formData.append("type", newTemplate.type);
            }
            formData.append("category", newTemplate.category);
            formData.append("content", newTemplate.content.trim());

            if (newTemplate.buttons.length > 0) {
                formData.append(
                    "buttons",
                    JSON.stringify(
                        newTemplate.buttons.map(serializeTemplateButton),
                    ),
                );
            }

            if (newTemplate.type === "image" || newTemplate.type === "video") {
                if (newTemplate.mediaFile) {
                    formData.append("files", newTemplate.mediaFile);
                }
            }

            if (newTemplate.type === "carousel") {
                let fileIdx = 0;
                formData.append(
                    "carouselItems",
                    JSON.stringify(
                        newTemplate.carouselItems.map((item) => {
                            const hasNewFile = Boolean(item.file);
                            return {
                                mediaUrl: item.mediaUrl,
                                fileIndex: hasNewFile ? fileIdx++ : undefined,
                                text: item.text.trim(),
                                buttons: (item.buttons || []).map(serializeTemplateButton),
                            };
                        }),
                    ),
                );

                newTemplate.carouselItems.forEach((item) => {
                    if (item.file) {
                        formData.append("files", item.file);
                    }
                });
            }

            const savedTemplate = editingTemplate
                ? await apiRequest<Template>(`/whatsapp/templates/${editingTemplate.id}`, {
                    method: "PUT",
                    body: formData,
                })
                : await apiRequest<Template>("/whatsapp/templates", {
                    method: "POST",
                    body: formData,
                });

            if (savedTemplate.metaSubmissionStatus === "submitted") {
                message.success(
                    editingTemplate
                        ? "Template was updated and resubmitted to Meta for approval"
                        : "Template was created and submitted to Meta for approval"
                );
            } else if (savedTemplate.metaSubmissionError) {
                message.warning(savedTemplate.metaSubmissionError);
            } else {
                message.warning(
                    editingTemplate
                        ? "Template was updated locally only. Meta update did not complete."
                        : "Template was saved locally only. Meta submission did not complete."
                );
            }
            closeTemplateModal();
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

            if (!(campaignForm.contactListIds || []).length || !campaignForm.templateId) {
                message.error("Please select at least one contact list and a template");
                return;
            }

            const payload: Record<string, string | number | number[]> = {
                name: (campaignForm.name || "New Campaign").trim(),
                templateId: campaignForm.templateId,
                contactListIds: campaignForm.contactListIds || [],
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
            void loadStats();
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
        setNewTemplate((prev) => {
            const nextCarouselItems = prev.carouselItems.map((item) => ({
                ...item,
                buttons: item.buttons?.length ? item.buttons : [createTemplateButtonDraft()],
            }));

            while (nextCarouselItems.length < CAROUSEL_MIN_CARDS) {
                nextCarouselItems.push(createCarouselDraftItem(nextCarouselItems[0]?.buttons));
            }

            return {
                ...prev,
                type,
                mediaFile: null,
                carouselItems: type === "carousel" ? nextCarouselItems : prev.carouselItems,
                buttons: type === "carousel" ? [] : prev.buttons,
            };
        });
    };

    const updateCarouselItem = (id: string, patch: Partial<CarouselDraftItem>) => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.map((item) => item.id === id ? { ...item, ...patch } : item),
        }));
    };

    const addCarouselItem = () => {
        setNewTemplate((prev) => {
            if (prev.carouselItems.length >= CAROUSEL_MAX_CARDS) {
                message.warning(`A maximum of ${CAROUSEL_MAX_CARDS} carousel cards is allowed`);
                return prev;
            }

            return {
                ...prev,
                carouselItems: [...prev.carouselItems, createCarouselDraftItem(prev.carouselItems[0]?.buttons)],
            };
        });
    };

    const removeCarouselItem = (id: string) => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.length <= CAROUSEL_MIN_CARDS
                ? prev.carouselItems
                : prev.carouselItems.filter((item) => item.id !== id),
        }));
    };

    const updateCarouselCardButton = (cardId: string, buttonId: string, patch: Partial<TemplateButtonDraft>) => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.map((item) => (
                item.id === cardId
                    ? {
                        ...item,
                        buttons: (item.buttons || []).map((button) => button.id === buttonId ? { ...button, ...patch } : button),
                    }
                    : item
            )),
        }));
    };

    const updateCarouselButtonActionAtIndex = (buttonIndex: number, action: "phone_number" | "url_static" | "url_dynamic") => {
        setNewTemplate((prev) => ({
            ...prev,
            carouselItems: prev.carouselItems.map((item) => ({
                ...item,
                buttons: (item.buttons || []).map((button, index) => {
                    if (index !== buttonIndex) return button;

                    if (action === "phone_number") {
                        return { ...button, type: "phone_number", urlType: undefined, url: "", urlSuffix: "" };
                    }

                    return {
                        ...button,
                        type: "url",
                        urlType: action === "url_dynamic" ? "dynamic" : "static",
                        phoneNumber: "",
                        urlSuffix: action === "url_dynamic" ? button.urlSuffix : "",
                    };
                }),
            })),
        }));
    };

    const addCarouselButtonsToAllCards = () => {
        setNewTemplate((prev) => {
            if (prev.carouselItems.some((item) => (item.buttons || []).length >= CAROUSEL_MAX_BUTTONS)) {
                message.warning(`Each carousel card can have at most ${CAROUSEL_MAX_BUTTONS} buttons`);
                return prev;
            }

            return {
                ...prev,
                carouselItems: prev.carouselItems.map((item) => ({
                    ...item,
                    buttons: [...(item.buttons || []), createTemplateButtonDraft()],
                })),
            };
        });
    };

    const removeCarouselButtonAtIndex = (buttonIndex: number) => {
        setNewTemplate((prev) => {
            if (prev.carouselItems.some((item) => (item.buttons || []).length <= 1)) {
                message.warning("Each carousel card needs at least one button");
                return prev;
            }

            return {
                ...prev,
                carouselItems: prev.carouselItems.map((item) => ({
                    ...item,
                    buttons: (item.buttons || []).filter((_button, index) => index !== buttonIndex),
                })),
            };
        });
    };

    const updateTemplateButton = (id: string, patch: Partial<TemplateButtonDraft>) => {
        setNewTemplate((prev) => ({
            ...prev,
            buttons: prev.buttons.map((button) => button.id === id ? { ...button, ...patch } : button),
        }));
    };

    const insertTemplateVariable = (token: string) => {
        if (newTemplate.category === "authentication") {
            message.warning("Authentication templates cannot include contact variables");
            return;
        }

        setNewTemplate((prev) => {
            const nextToken = `{{${token}}}`;
            const needsLeadingSpace = Boolean(prev.content) && !/[\s\n]$/.test(prev.content);

            return {
                ...prev,
                content: `${prev.content}${needsLeadingSpace ? " " : ""}${nextToken}`,
            };
        });
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
        mediaUrl: carouselMediaPreviewUrls[item.id] || item.mediaUrl,
        buttons: item.buttons?.map(({ id, ...button }) => button),
    }));
    const liveButtonPreviewItems: TemplateButtonConfig[] = newTemplate.buttons.map(({ id, ...button }) => button);

    const filteredContactLists = contactLists.filter((contactList) => matchesContactListSearch(contactList, contactSearch));

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
                        <Button
                            size="small"
                            icon={<FaFileDownload />}
                            loading={contactDownloadLoadingId === record.id}
                            onClick={() => { void downloadContactList(record); }}
                        />
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
                    <Tooltip title={isTemplateEditable(record) ? "Edit Template" : "Templates currently in review by Meta cannot be edited"}>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={!isTemplateEditable(record)}
                            onClick={() => openEditTemplate(record)}
                        />
                    </Tooltip>
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
                    <div className="text-xs text-gray-500">
                        {record.templateName} · {(record.contactListNames?.join(", ") || record.contactListName)}
                    </div>
                </div>
            ),
        },
        { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <StatusTag status={s} /> },
        {
            title: "Progress", key: "progress",
            render: (_: any, record: Campaign) => {
                const total = record.stats.total;
                const inFlight = record.status === "sending" || record.status === "draft";
                const numerator = inFlight ? record.stats.sent : record.stats.delivered;
                const pct = total > 0
                    ? Math.round((numerator / total) * 100)
                    : (record.status === "sending" ? 5 : 0);
                return (
                    <div style={{ minWidth: 120 }}>
                        <Progress
                            percent={pct}
                            size="small"
                            status={record.status === "failed" ? "exception" : record.status === "completed" ? "success" : "active"}
                        />
                        <div className="text-xs text-gray-500">
                            {inFlight
                                ? `${record.stats.sent}/${total || 0} sent`
                                : `${record.stats.delivered}/${total || 0} delivered`}
                        </div>
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

    const renderCampaignSteps = () => (
        <div>
            <Steps current={campaignStep} size="small" className="mb-6">
                <Step title="Contact Lists" icon={<TeamOutlined />} />
                <Step title="Template" icon={<FileTextOutlined />} />
                <Step title="Schedule" icon={<CalendarOutlined />} />
                <Step title="Review" icon={<CheckCircleOutlined />} />
            </Steps>

            {campaignStep === 0 && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Select One or More Contact Lists</div>
                    <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="Choose contact lists..."
                        value={campaignForm.contactListIds || []}
                        onChange={(values: number[]) => setCampaignForm((prev) => ({
                            ...prev,
                            contactListIds: values,
                        }))}
                        optionFilterProp="label"
                    >
                        {contactLists.map(c => (
                            <Option key={c.id} value={c.id} label={c.name}>
                                <TeamOutlined className="mr-2 text-blue-500" />{c.name} <span className="text-gray-400 text-xs ml-2">({c.count} contacts)</span>
                            </Option>
                        ))}
                    </Select>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        {selectedCampaignContactLists.length
                            ? `${selectedCampaignContactLists.length} list${selectedCampaignContactLists.length === 1 ? "" : "s"} selected · ${selectedCampaignRecipientCount} total contacts`
                            : "No contact lists selected yet."}
                    </div>
                </div>
            )}

            {campaignStep === 1 && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Select an Approved Template</div>
                    <div className="space-y-3">
                        {templates.filter(t => t.status === "approved").map(t => (
                            <div
                                key={t.id}
                                onClick={() => setCampaignForm((prev) => ({ ...prev, templateId: t.id, templateName: t.name }))}
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
                                onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </Form.Item>
                        <Form.Item label="Send">
                            <Select
                                value={campaignForm.sendType || "now"}
                                onChange={(v: "now" | "schedule") => setCampaignForm((prev) => ({ ...prev, sendType: v }))}
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
                                    onChange={(value) => setCampaignForm((prev) => ({ ...prev, scheduledAt: value || undefined }))}
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
                            { label: "Contact Lists", value: selectedCampaignContactListNames.join(", ") || "-" },
                            { label: "Template", value: campaignForm.templateName || "-" },
                            { label: "Send Type", value: campaignForm.sendType === "schedule" ? "Scheduled" : "Immediately" },
                            { label: "Scheduled At", value: campaignForm.scheduledAt ? campaignForm.scheduledAt.format("MMM DD, YYYY HH:mm") : "-" },
                            { label: "Total Recipients", value: selectedCampaignRecipientCount },
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
                                        <div className="text-xl font-bold" style={{ color: stat?.color }}>{(stat?.value ?? 0).toLocaleString()}</div>
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
                                        style={{ backgroundColor: '#3b5998' }}
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            setEditingTemplate(null);
                                            setNewTemplate(createEmptyTemplateState());
                                            setTemplateMediaPreviewUrl(undefined);
                                            setCarouselMediaPreviewUrls({});
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
                                        style={{ backgroundColor: '#3b5998' }}
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
                            type="button"
                            disabled
                            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 text-left bg-gray-50 opacity-60 cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <FormOutlined className="text-green-500 text-xl" />
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800">Export from Forms</div>
                                <div className="text-xs text-gray-500">Disabled here for now. Export directly from the Forms page.</div>
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
                width={1040}
            >
                <div className="space-y-4 py-2">
                    <div
                        className="rounded-2xl border border-blue-100 p-4 sm:p-5"
                        style={{ background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f5f9ff 100%)" }}
                    >
                        <Form layout="vertical">
                            <Row gutter={[16, 8]} align="middle">
                                <Col xs={24} lg={11}>
                                    <Form.Item label="List Name" required className="mb-3">
                                        <Input
                                            size="large"
                                            placeholder="E.g. VIP Guests March"
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} lg={13}>
                                    <Form.Item label="Tags (comma separated)" className="mb-3">
                                        <Input
                                            size="large"
                                            placeholder="vip, hotel"
                                            value={contactForm.tags}
                                            onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Contacts</div>
                                <div className="mt-1 text-2xl font-semibold text-gray-900">{contactEditRows.length}</div>
                                <div className="text-xs text-gray-500">Rows in this list</div>
                            </div>
                            <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Custom Fields</div>
                                <div className="mt-1 text-2xl font-semibold text-gray-900">{contactEditVariableKeys.length}</div>
                                <div className="text-xs text-gray-500">Imported columns preserved</div>
                            </div>
                            <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Editing Mode</div>
                                <div className="mt-1 text-sm font-semibold text-gray-900">Structured contact editor</div>
                                <div className="text-xs text-gray-500">Default details plus all detected custom fields</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-base font-semibold text-gray-900">Contacts</div>
                            <div className="text-sm text-gray-500">Each contact now has a cleaner card layout. Expand cards to update all fields.</div>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={addContactEditRow} style={{ background: "#1677ff" }}>
                            Add Contact
                        </Button>
                    </div>

                    {contactEditVariableKeys.length ? (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                            <div className="mb-2 text-sm font-semibold text-gray-800">Detected Custom Fields</div>
                            <div className="mb-3 text-xs text-gray-500">These imported columns are preserved for every contact and shown inside each card.</div>
                            <div className="flex flex-wrap gap-2">
                                {contactEditVariableKeys.slice(0, 10).map((key) => (
                                    <Tag key={key} color="blue" className="rounded-full px-2 py-1">
                                        {formatContactFieldLabel(key)}
                                    </Tag>
                                ))}
                                {contactEditVariableKeys.length > 10 ? (
                                    <Tag color="default" className="rounded-full px-2 py-1">
                                        +{contactEditVariableKeys.length - 10} more
                                    </Tag>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <div className="max-h-[500px] overflow-auto rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
                        <div className="space-y-4">
                            {contactEditRows.map((row, index) => {
                                const isExpanded = expandedContactEditCards.includes(index);
                                const filledCustomFieldCount = getFilledCustomFieldCount(row);
                                const title = row.name?.trim() || `Contact ${index + 1}`;

                                return (
                                    <div
                                        key={`${row.id || "new"}-${index}`}
                                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-sm"
                                                        style={{ background: "linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)" }}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="text-base font-semibold text-gray-900">{title}</div>
                                                        <div className="mt-1 text-sm text-gray-500">{getContactPreviewText(row)}</div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <Tag color="blue" className="rounded-full px-2 py-1">Basic Fields</Tag>
                                                            {contactEditVariableKeys.length ? (
                                                                <Tag color={filledCustomFieldCount ? "cyan" : "default"} className="rounded-full px-2 py-1">
                                                                    {filledCustomFieldCount}/{contactEditVariableKeys.length} custom fields filled
                                                                </Tag>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-start">
                                                    <Button
                                                        size="small"
                                                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                                                        onClick={() => toggleContactEditCard(index)}
                                                    >
                                                        {isExpanded ? "Collapse" : "Expand"}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        disabled={contactEditRows.length === 1}
                                                        onClick={() => removeContactEditRow(index)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded ? (
                                            <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
                                                <div>
                                                    <div className="mb-3 text-sm font-semibold text-gray-800">Primary Details</div>
                                                    <Row gutter={[14, 14]}>
                                                        <Col xs={24} md={8}>
                                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                <UserOutlined />
                                                                Name
                                                            </div>
                                                            <Input
                                                                size="large"
                                                                placeholder="Contact name"
                                                                value={row.name}
                                                                onChange={(e) => updateContactEditRow(index, { name: e.target.value })}
                                                            />
                                                        </Col>
                                                        <Col xs={24} md={8}>
                                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                <PhoneOutlined />
                                                                Phone
                                                            </div>
                                                            <Input
                                                                size="large"
                                                                placeholder="WhatsApp phone number"
                                                                value={row.phone}
                                                                onChange={(e) => updateContactEditRow(index, { phone: e.target.value })}
                                                            />
                                                        </Col>
                                                        <Col xs={24} md={8}>
                                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                <MailOutlined />
                                                                Email
                                                            </div>
                                                            <Input
                                                                size="large"
                                                                placeholder="Email address"
                                                                value={row.email || ""}
                                                                onChange={(e) => updateContactEditRow(index, { email: e.target.value })}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>

                                                {contactEditVariableKeys.length ? (
                                                    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                                                        <div className="mb-1 text-sm font-semibold text-gray-800">Custom Fields</div>
                                                        <div className="mb-4 text-xs text-gray-500">Imported values stay attached to this contact and can be edited here.</div>
                                                        <Row gutter={[14, 14]}>
                                                            {contactEditVariableKeys.map((key) => (
                                                                <Col xs={24} md={12} xl={8} key={key}>
                                                                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                        {formatContactFieldLabel(key)}
                                                                    </div>
                                                                    <Input
                                                                        size="large"
                                                                        placeholder={formatContactFieldLabel(key)}
                                                                        value={row.variables?.[key] || ""}
                                                                        onChange={(e) => updateContactEditVariable(index, key, e.target.value)}
                                                                    />
                                                                </Col>
                                                            ))}
                                                        </Row>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                title={<span><FileTextOutlined className="mr-2 text-purple-500" />{editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create Template"}</span>}
                open={templateModal}
                onCancel={closeTemplateModal}
                width="min(1120px, calc(100vw - 24px))"
                footer={null}
            >
                <Row gutter={[24, 24]} align="top">
                    <Col xs={24} lg={14}>
                        <div
                            className="space-y-4 pr-1 lg:pr-3"
                            style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
                        >
                            <Form layout="vertical">
                                <Form.Item
                                    label="Template Name"
                                    required
                                    extra={editingTemplate ? "Template name cannot be modified after creation" : undefined}
                                >
                                    <Input
                                        placeholder="E.g. Welcome Message"
                                        value={newTemplate.name}
                                        disabled={Boolean(editingTemplate)}
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
                                {newTemplate.category === "authentication" ? (
                                    <Alert
                                        showIcon
                                        type="warning"
                                        message="Authentication templates cannot include variables like {{name}}. Use Utility or Marketing if you need contact fields."
                                    />
                                ) : null}
                                <Form.Item
                                    label="Media Type"
                                    extra={editingTemplate ? "Media type cannot be modified after creation" : undefined}
                                >
                                    <Select
                                        value={newTemplate.type}
                                        disabled={Boolean(editingTemplate)}
                                        onChange={updateTemplateType}
                                    >
                                        <Option value="text"><FileTextOutlined className="mr-2" />Text</Option>
                                        <Option value="image"><PictureOutlined className="mr-2" />Image</Option>
                                        <Option value="video"><VideoCameraOutlined className="mr-2" />Video</Option>
                                        <Option value="carousel"><AppstoreOutlined className="mr-2" />Carousel</Option>
                                    </Select>
                                </Form.Item>
                                {(newTemplate.type === "image" || newTemplate.type === "video") && (
                                    <Form.Item
                                        label={`Upload ${newTemplate.type === "image" ? "Image" : "Video"}`}
                                        required={!editingTemplate?.mediaUrl}
                                        extra={getTemplateMediaHelpText(newTemplate.type)}
                                    >
                                        {editingTemplate?.mediaUrl && !newTemplate.mediaFile && (
                                            <div className="mb-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                                <CheckCircleOutlined /> Current {newTemplate.type} retained (upload new file to replace)
                                            </div>
                                        )}
                                        <Upload
                                            accept={getTemplateMediaAccept(newTemplate.type)}
                                            beforeUpload={(file) => {
                                                const mediaError = getTemplateMediaValidationError(file as File, newTemplate.type as "image" | "video");
                                                if (mediaError) {
                                                    message.error(mediaError);
                                                    return false;
                                                }
                                                setNewTemplate((prev) => ({ ...prev, mediaFile: file as File }));
                                                return false;
                                            }}
                                            onRemove={() => {
                                                setNewTemplate((prev) => ({ ...prev, mediaFile: null }));
                                            }}
                                            maxCount={1}
                                            fileList={getUploadFileList(newTemplate.mediaFile)}
                                        >
                                            <Button icon={<UploadOutlined />}>
                                                {editingTemplate?.mediaUrl ? "Replace File" : "Choose File"}
                                            </Button>
                                        </Upload>
                                    </Form.Item>
                                )}
                                {newTemplate.type !== "carousel" && (
                                    <Form.Item label="Message Content" required>
                                        <div className="space-y-3">
                                            <TextArea
                                                rows={5}
                                                placeholder={"Hi {{name}}, your booking is confirmed."}
                                                value={newTemplate.content}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                            />
                                            <Alert
                                                showIcon
                                                type="info"
                                                message="Insert only supported contact parameters"
                                                description={(
                                                    <div className="space-y-3">
                                                        <div>
                                                            These values are filled from each contact when the campaign sends. Unsupported tokens are blocked so Meta does not reject the template.
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {TEMPLATE_VARIABLE_SUGGESTIONS.map((item) => (
                                                                <Button
                                                                    key={item.token}
                                                                    size="small"
                                                                    disabled={newTemplate.category === "authentication"}
                                                                    onClick={() => insertTemplateVariable(item.token)}
                                                                >
                                                                    Insert {"{{" + item.token + "}}"}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Supported: <code>{"{{name}}"}</code>, <code>{"{{firstname}}"}</code>, <code>{"{{lastname}}"}</code>, <code>{"{{email}}"}</code>, and <code>{"{{phone}}"}</code>. Custom imported fields are allowed if they look like <code>{"{{booking_id}}"}</code>.
                                                        </div>
                                                        {invalidTemplatePlaceholders.length ? (
                                                            <div className="space-y-2">
                                                                <div className="text-xs font-medium text-red-600">These parameters will be rejected</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {invalidTemplatePlaceholders.map((token) => (
                                                                        <Tag key={token} color="error">{"{{" + token + "}}"}</Tag>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        {extractedTemplateVariables.length ? (
                                                            <div className="space-y-2">
                                                                <div className="text-xs font-medium text-gray-700">Detected variables</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {extractedTemplateVariables.map((token) => (
                                                                        <Tooltip key={token} title={getTemplateVariableHelpText(token)}>
                                                                            <Tag color={canonicalizeTemplateVariableToken(token) ? "purple" : "error"}>{"{{" + token + "}}"}</Tag>
                                                                        </Tooltip>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </Form.Item>
                                )}
                                {newTemplate.type === "carousel" && (
                                    <>
                                        <Form.Item label="Intro Text">
                                            <div className="space-y-3">
                                                <TextArea
                                                    rows={3}
                                                    placeholder="Optional text above the carousel"
                                                    value={newTemplate.content}
                                                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                                />
                                                <Alert
                                                    showIcon
                                                    type="info"
                                                    message="Variable tips"
                                                    description={(
                                                        <div className="space-y-2">
                                                            <div>
                                                                Carousel intro text supports the same contact variables, such as <code>{"{{name}}"}</code>. Card text must stay static.
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {TEMPLATE_VARIABLE_SUGGESTIONS.map((item) => (
                                                                    <Button
                                                                        key={item.token}
                                                                        size="small"
                                                                        disabled={newTemplate.category === "authentication"}
                                                                        onClick={() => insertTemplateVariable(item.token)}
                                                                    >
                                                                        Insert {"{{" + item.token + "}}"}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        </Form.Item>
                                        <div className="space-y-3">
                                            {newTemplate.carouselItems.map((item, index) => (
                                                <Card key={item.id} size="small" title={`Card ${index + 1}`}>
                                                    <div className="space-y-3">
                                                        {item.mediaUrl && !item.file && (
                                                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                                                <CheckCircleOutlined /> Current image retained (upload new file to replace)
                                                            </div>
                                                        )}
                                                        <Upload
                                                            accept={getTemplateMediaAccept("carousel")}
                                                            beforeUpload={(file) => {
                                                                const mediaError = getTemplateMediaValidationError(file as File, "carousel");
                                                                if (mediaError) {
                                                                    message.error(mediaError);
                                                                    return false;
                                                                }
                                                                updateCarouselItem(item.id, { file: file as File });
                                                                return false;
                                                            }}
                                                            onRemove={() => {
                                                                updateCarouselItem(item.id, { file: null });
                                                            }}
                                                            maxCount={1}
                                                            fileList={getUploadFileList(item.file)}
                                                        >
                                                            <Button icon={<UploadOutlined />}>
                                                                {item.mediaUrl ? "Replace Card Image" : "Upload Card Image"}
                                                            </Button>
                                                        </Upload>
                                                        <TextArea
                                                            rows={3}
                                                            placeholder="Card text"
                                                            value={item.text}
                                                            onChange={(e) => updateCarouselItem(item.id, { text: e.target.value })}
                                                        />
                                                        <div className="space-y-2">
                                                            <div className="text-xs font-medium text-gray-600">Card buttons</div>
                                                            {(item.buttons || []).map((button, buttonIndex) => (
                                                                <div key={button.id} className="space-y-2 rounded-xl border border-gray-200 p-3">
                                                                    <Select
                                                                        value={getButtonActionValue(button)}
                                                                        onChange={(value) => updateCarouselButtonActionAtIndex(buttonIndex, value as "phone_number" | "url_static" | "url_dynamic")}
                                                                        className="w-full"
                                                                    >
                                                                        <Option value="phone_number">Call phone number</Option>
                                                                        <Option value="url_static">Visit website (static)</Option>
                                                                        <Option value="url_dynamic">Visit website (dynamic)</Option>
                                                                    </Select>
                                                                    {button.type === "phone_number" && (
                                                                        <Row gutter={12}>
                                                                            <Col span={12}>
                                                                                <Input
                                                                                    placeholder="Button label"
                                                                                    value={button.text}
                                                                                    onChange={(e) => updateCarouselCardButton(item.id, button.id, { text: e.target.value })}
                                                                                />
                                                                            </Col>
                                                                            <Col span={12}>
                                                                                <Input
                                                                                    placeholder="Phone number"
                                                                                    value={button.phoneNumber}
                                                                                    onChange={(e) => updateCarouselCardButton(item.id, button.id, { phoneNumber: e.target.value })}
                                                                                />
                                                                            </Col>
                                                                        </Row>
                                                                    )}
                                                                    {button.type === "url" && (
                                                                        <>
                                                                            <Input
                                                                                placeholder="Button label"
                                                                                value={button.text}
                                                                                onChange={(e) => updateCarouselCardButton(item.id, button.id, { text: e.target.value })}
                                                                            />
                                                                            <Input
                                                                                placeholder="https://example.com/path"
                                                                                value={button.url}
                                                                                onChange={(e) => updateCarouselCardButton(item.id, button.id, { url: e.target.value })}
                                                                            />
                                                                            {button.urlType === "dynamic" ? (
                                                                                <Input
                                                                                    placeholder="{{booking_id}} or offer/{{promo_code}}"
                                                                                    value={button.urlSuffix}
                                                                                    onChange={(e) => updateCarouselCardButton(item.id, button.id, { urlSuffix: e.target.value })}
                                                                                />
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            danger
                                                                            size="small"
                                                                            icon={<DeleteOutlined />}
                                                                            onClick={() => removeCarouselButtonAtIndex(buttonIndex)}
                                                                        >
                                                                            Remove from all cards
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                disabled={newTemplate.carouselItems.length <= CAROUSEL_MIN_CARDS}
                                                                onClick={() => removeCarouselItem(item.id)}
                                                            >
                                                                Remove Card
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            <Button
                                                type="dashed"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={addCarouselButtonsToAllCards}
                                                disabled={newTemplate.carouselItems.some((item) => (item.buttons || []).length >= CAROUSEL_MAX_BUTTONS)}
                                            >
                                                Add Button To All Cards
                                            </Button>
                                            <Button
                                                type="dashed"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={addCarouselItem}
                                                disabled={newTemplate.carouselItems.length >= CAROUSEL_MAX_CARDS}
                                            >
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
                                        message="Each carousel card needs 1-2 buttons (website or phone). All cards must use the same button types in the same order."
                                    />
                                )}
                            </Form>
                            <div className="sticky bottom-0 bg-white pt-2">
                                <div className="flex gap-2 justify-end">
                                    <Button onClick={closeTemplateModal}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="primary"
                                        style={{ backgroundColor: '#3b5998' }}
                                        onClick={createTemplate}
                                    >
                                        {editingTemplate ? "Save & Resubmit to Meta" : "Submit for Approval"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} lg={10}>
                        <div className="lg:sticky lg:top-0">
                            <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2"><EyeOutlined />Live Preview</div>
                            <WhatsAppPreview
                                content={newTemplate.content}
                                type={newTemplate.type}
                                mediaSrc={templateMediaPreviewUrl}
                                mediaLabel={newTemplate.mediaFile?.name}
                                carouselItems={liveCarouselPreviewItems}
                                buttons={liveButtonPreviewItems}
                            />
                        </div>
                    </Col>
                </Row>
            </Modal>

            <Modal
                title={
                    <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#128C7E] flex items-center justify-center text-lg">
                                <MdWhatsapp />
                            </div>
                            <div>
                                <span className="font-bold text-gray-900 text-base">{selectedTemplate?.name}</span>
                                <span className="ml-2 text-xs text-gray-400 font-mono">ID: #{selectedTemplate?.id}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {selectedTemplate && <StatusTag status={selectedTemplate.status} />}
                            {selectedTemplate && <Tag color="geekblue" className="capitalize m-0">{selectedTemplate.category}</Tag>}
                            {selectedTemplate && <Tag className="capitalize m-0">{selectedTemplate.type}</Tag>}
                            {selectedTemplate?.language && (
                                <Tag className="m-0 uppercase font-mono text-[11px]">{selectedTemplate.language}</Tag>
                            )}
                        </div>
                    </div>
                }
                open={templatePreviewModal}
                onCancel={() => setTemplatePreviewModal(false)}
                width="min(1080px, calc(100vw - 32px))"
                centered
                footer={
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                            {selectedTemplate?.createdAt ? `Created ${dayjs(selectedTemplate.createdAt).format("MMM D, YYYY [at] HH:mm")}` : ""}
                        </div>
                        <Space>
                            <Button onClick={() => setTemplatePreviewModal(false)}>Close</Button>
                            {selectedTemplate && (
                                <Tooltip title={isTemplateEditable(selectedTemplate) ? "Edit and modify this template" : "Templates currently in review by Meta cannot be modified"}>
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined />}
                                        disabled={!isTemplateEditable(selectedTemplate)}
                                        onClick={() => {
                                            const tmpl = selectedTemplate;
                                            setTemplatePreviewModal(false);
                                            openEditTemplate(tmpl);
                                        }}
                                    >
                                        Edit Template
                                    </Button>
                                </Tooltip>
                            )}
                        </Space>
                    </div>
                }
            >
                {selectedTemplate && (
                    <div className="py-1">
                        <Row gutter={[24, 24]} className="items-start">
                            {/* Left Column: Details, Status, Message Body, Variables, Cards */}
                            <Col xs={24} lg={14}>
                                <div className="space-y-4">
                                    {/* Meta Submission Status Banner */}
                                    {selectedTemplate.metaSubmissionStatus === "submitted" ? (
                                        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-start gap-3">
                                            <CloudUploadOutlined className="text-blue-600 text-lg mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-blue-900 text-sm">Submitted to WhatsApp Meta for Approval</span>
                                                    <MetaSubmissionTag status={selectedTemplate.metaSubmissionStatus} />
                                                </div>
                                                <div className="mt-1 text-xs text-blue-800 leading-relaxed">
                                                    {selectedTemplate.externalId ? (
                                                        <span>Meta Template ID: <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-semibold">{selectedTemplate.externalId}</code>. </span>
                                                    ) : null}
                                                    Meta review is currently pending. Status updates automatically upon approval.
                                                </div>
                                            </div>
                                        </div>
                                    ) : selectedTemplate.metaSubmissionStatus === "failed" ? (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 flex items-start gap-3">
                                            <CloseCircleOutlined className="text-rose-600 text-lg mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-rose-900 text-sm">Meta Submission Failed / Rejected</span>
                                                    <MetaSubmissionTag status={selectedTemplate.metaSubmissionStatus} />
                                                </div>
                                                <div className="mt-1 text-xs text-rose-800 leading-relaxed font-mono bg-white/70 p-2 rounded-lg border border-rose-100">
                                                    {selectedTemplate.metaSubmissionError || "Meta rejected the template configuration."}
                                                </div>
                                                <div className="mt-2 text-xs text-rose-700 font-medium">
                                                    Click &ldquo;Edit Template&rdquo; below to correct parameters and resubmit to Meta.
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-3">
                                            <ClockCircleOutlined className="text-amber-600 text-base mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-amber-900 text-xs">Saved Locally Only</span>
                                                    <MetaSubmissionTag status={selectedTemplate.metaSubmissionStatus} />
                                                </div>
                                                <div className="mt-0.5 text-xs text-amber-700">
                                                    This template has not been sent to Meta yet. Edit and submit to activate for messaging.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Message Body Content Card */}
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <FileTextOutlined className="text-gray-400" />
                                                Message Content
                                            </span>
                                            {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                                                <span className="text-[11px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                                                    {selectedTemplate.variables.length} Dynamic {selectedTemplate.variables.length === 1 ? "Variable" : "Variables"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="rounded-lg bg-gray-50/80 border border-gray-100 p-3.5 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                                            {selectedTemplate.content ? (
                                                selectedTemplate.content.split(/(\{\{[a-zA-Z0-9_]+\}\})/g).map((part, i) =>
                                                    /^\{\{[a-zA-Z0-9_]+\}\}$/.test(part) ? (
                                                        <span
                                                            key={i}
                                                            className="inline-block mx-0.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-xs font-semibold border border-purple-200"
                                                        >
                                                            {part}
                                                        </span>
                                                    ) : (
                                                        part
                                                    )
                                                )
                                            ) : (
                                                <span className="text-gray-400 italic">No text content</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dynamic Variables Pill Box */}
                                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Dynamic Parameters ({selectedTemplate.variables.length})
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedTemplate.variables.map((v) => (
                                                    <Tag key={v} color="purple" className="font-mono text-xs px-2.5 py-1 rounded-md m-0">
                                                        {"{{" + v + "}}"}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Template-level CTA Buttons */}
                                    {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Template Action Buttons ({selectedTemplate.buttons.length})
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTemplate.buttons.map((button, index) => (
                                                    <div
                                                        key={`${button.type}-${index}`}
                                                        className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs text-blue-700 font-medium"
                                                    >
                                                        {getPreviewButtonIcon(button)}
                                                        <span className="font-semibold">{button.text || (button.type === "copy_code" ? "Copy Code" : "Action")}</span>
                                                        {button.type === "phone_number" && button.phoneNumber && (
                                                            <span className="text-gray-500 text-[11px] font-mono">({button.phoneNumber})</span>
                                                        )}
                                                        {button.type === "url" && button.url && (
                                                            <span className="text-gray-500 text-[11px] font-mono truncate max-w-[140px]">({button.url})</span>
                                                        )}
                                                        {button.type === "copy_code" && button.offerCode && (
                                                            <span className="text-purple-600 text-[11px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-purple-200">
                                                                {button.offerCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Carousel Cards 2-Column Grid */}
                                    {selectedTemplate.type === "carousel" && selectedTemplate.carouselItems && selectedTemplate.carouselItems.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    Carousel Cards ({selectedTemplate.carouselItems.length})
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    Swipeable in WhatsApp
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {selectedTemplate.carouselItems.map((item, index) => (
                                                    <div
                                                        key={`${item.mediaUrl}-${index}`}
                                                        className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden shadow-xs flex flex-col hover:border-blue-300 transition-colors"
                                                    >
                                                        <div className="relative h-28 w-full bg-gray-200 overflow-hidden">
                                                            {item.mediaUrl ? (
                                                                <img
                                                                    src={item.mediaUrl}
                                                                    alt={item.text || `Card ${index + 1}`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                                    <AppstoreOutlined style={{ fontSize: 24 }} />
                                                                </div>
                                                            )}
                                                            <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                                                                Card {index + 1}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 flex-1 flex flex-col justify-between">
                                                            <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-3">
                                                                {item.text || <span className="text-gray-400 italic">No card text</span>}
                                                            </div>
                                                            {item.buttons && item.buttons.length > 0 && (
                                                                <div className="mt-2.5 pt-2 border-t border-gray-200 space-y-1">
                                                                    {item.buttons.map((button, buttonIndex) => (
                                                                        <div
                                                                            key={`${button.type}-${buttonIndex}`}
                                                                            className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-white rounded-md px-2 py-1 border border-gray-200 font-medium truncate"
                                                                        >
                                                                            {getPreviewButtonIcon(button)}
                                                                            <span className="font-semibold truncate">{button.text || "Action"}</span>
                                                                            <span className="text-gray-400 text-[10px] ml-auto truncate max-w-[100px]">
                                                                                {button.type === "phone_number" ? button.phoneNumber : button.url}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Col>

                            {/* Right Column: Sticky WhatsApp Mobile Phone Mockup */}
                            <Col xs={24} lg={10}>
                                <div className="lg:sticky lg:top-2 flex flex-col items-center">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <EyeOutlined className="text-green-600" />
                                        Interactive Phone Preview
                                    </div>
                                    <WhatsAppPreview
                                        content={selectedTemplate.content}
                                        type={selectedTemplate.type}
                                        mediaSrc={selectedTemplate.mediaUrl}
                                        mediaLabel={selectedTemplate.mediaUrl ? "Uploaded media attached" : undefined}
                                        carouselItems={selectedTemplate.carouselItems ?? undefined}
                                        buttons={selectedTemplate.buttons ?? undefined}
                                    />
                                    <div className="text-[11px] text-gray-400 mt-1 text-center">
                                        {selectedTemplate.type === "carousel"
                                            ? "Swipe horizontally across cards to preview"
                                            : "Realistic WhatsApp message render"}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
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
                                void loadCampaigns();
                                void loadStats();
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
                                        {selectedCampaignReport.templateName} · {(selectedCampaignReport.contactListNames?.join(", ") || selectedCampaignReport.contactListName)}
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
                {renderCampaignSteps()}
            </Modal>
        </div>
    );
}
