"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Input,
    Button,
    Badge,
    Avatar,
    Tag,
    Tooltip,
    Spin,
    Dropdown,
    Menu,
    Modal,
    Select,
    message,
    Image,
    Popconfirm,
    Popover,
} from "antd";
import {
    SearchOutlined,
    SendOutlined,
    UserOutlined,
    ClockCircleOutlined,
    CheckOutlined,
    SyncOutlined,
    CheckCircleTwoTone,
    SmileOutlined,
    CheckCircleOutlined,
    UndoOutlined,
    TagOutlined,
    MessageOutlined,
    PaperClipOutlined,
    DownOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    ThunderboltOutlined,
    DeleteOutlined,
    FileTextOutlined,
    LoadingOutlined,
    SettingOutlined,
    PictureOutlined,
    VideoCameraOutlined,
    FileOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";
import { MdWhatsapp } from "react-icons/md";
import { FaAt, FaFileDownload } from "react-icons/fa";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// ── Outlook Color Category Palette ──────────────────────────────────────────
export interface OutlookColor {
    name: string;
    bg: string;
    border: string;
    text: string;
    bar: string;
    swatch: string;
}

export const OUTLOOK_COLORS: OutlookColor[] = [
    { name: "Purple", bg: "#F4EDFB", border: "#D4B8F7", text: "#5C2D91", bar: "#7C3AED", swatch: "#7C3AED" }, // SPA / Wellness
    { name: "Teal", bg: "#EDF7F6", border: "#80D5CB", text: "#00695C", bar: "#0D9488", swatch: "#0D9488" }, // Bookings
    { name: "Blue", bg: "#EBF3FC", border: "#93C5FD", text: "#1E40AF", bar: "#2563EB", swatch: "#2563EB" }, // Front Desk
    { name: "Orange", bg: "#FEF3EC", border: "#FDBA74", text: "#9A3412", bar: "#EA580C", swatch: "#EA580C" }, // VIP
    { name: "Green", bg: "#EDF8F1", border: "#86EFAC", text: "#166534", bar: "#16A34A", swatch: "#16A34A" }, // Confirmed
    { name: "Red", bg: "#FDF0F0", border: "#FCA5A5", text: "#991B1B", bar: "#DC2626", swatch: "#DC2626" }, // Urgent / Complaint
    { name: "Pink", bg: "#FDEDF7", border: "#F9A8D4", text: "#9D174D", bar: "#DB2777", swatch: "#DB2777" }, // Room Service
    { name: "Yellow", bg: "#FEF9E6", border: "#FDE047", text: "#854D0E", bar: "#CA8A04", swatch: "#CA8A04" }, // Pending
    { name: "Indigo", bg: "#EEF1FD", border: "#A5B4FC", text: "#3730A3", bar: "#4F46E5", swatch: "#4F46E5" }, // Marketing
    { name: "Emerald", bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46", bar: "#059669", swatch: "#059669" }, // Inquiries
];

export interface InboxCategory {
    id: number;
    name: string;
    color?: string | null;
}

export const getCategoryOutlookColor = (cat?: InboxCategory | null | number): OutlookColor => {
    if (!cat) {
        return { name: "Default", bg: "#F3F4F6", border: "#D1D5DB", text: "#374151", bar: "#9CA3AF", swatch: "#9CA3AF" };
    }
    if (typeof cat === "object") {
        if (cat.color) {
            const matched = OUTLOOK_COLORS.find(c => c.bar.toLowerCase() === cat.color?.toLowerCase());
            if (matched) return { ...matched, name: cat.name || matched.name };
            return {
                name: cat.name || "Category",
                bg: `${cat.color}15`,
                border: `${cat.color}40`,
                text: cat.color,
                bar: cat.color,
                swatch: cat.color,
            };
        }
        return getCategoryOutlookColor(cat.id);
    }
    const id = cat;
    const index = Math.abs(id) % OUTLOOK_COLORS.length;
    return OUTLOOK_COLORS[index];
};

export interface InboxUser {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
}

export interface ConversationMessage {
    id: number;
    conversationId: number;
    direction: "inbound" | "outbound";
    senderUserId?: number | null;
    messageType: string;
    content: string;
    mediaUrl?: string | null;
    externalId?: string | null;
    status: "sent" | "delivered" | "read" | "failed";
    createdAt: string;
}

export interface Conversation {
    id: number;
    companyId: number;
    contactPhone: string;
    contactName?: string | null;
    assignedUserId?: number | null;
    categoryId?: number | null;
    status: "open" | "resolved" | "pending";
    lastMessageAt: string;
    lastMessageText?: string | null;
    unreadCount: number;
    windowExpiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
    assignedUser?: InboxUser | null;
    category?: InboxCategory | null;
}

interface AttachmentFile {
    file: File;
    previewUrl?: string;
    mediaType: "image" | "video" | "audio" | "document";
}

export const EMOJI_CATEGORIES = [
    {
        name: "Smileys",
        icon: "😊",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹",
            "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗",
            "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
            "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄",
            "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
            "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳",
            "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "😮", "😯",
            "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭",
            "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡",
        ],
    },
    {
        name: "Gestures",
        icon: "👍",
        emojis: [
            "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘",
            "🤙", "👈", "👉", "👆", "👇", "☝️", "🫵", "👋", "🤚", "🖐️",
            "✋", "🖖", "🫱", "🫲", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
            "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦶", "👂", "👃", "🧠",
            "👀", "👁️", "👅", "👄", "💋", "🫂", "👤", "👥", "🗣️", "👣",
        ],
    },
    {
        name: "Hearts & Joy",
        icon: "❤️",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
            "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
            "💟", "🎉", "🎊", "🎈", "🎂", "🎁", "✨", "⭐", "🌟", "💫",
            "💥", "🔥", "💯", "🏆", "🥇", "🥈", "🥉", "👑", "💎", "💐",
            "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "☀️", "🌙", "⭐", "🌈",
        ],
    },
    {
        name: "Work & Tech",
        icon: "💼",
        emojis: [
            "💼", "📁", "📂", "📄", "📃", "📑", "📊", "📈", "📉", "📜",
            "📝", "📆", "📅", "📇", "📋", "📌", "📍", "📎", "🖇️", "📏",
            "🔒", "🔓", "🔑", "🗝️", "💡", "🔦", "📱", "📲", "☎️", "📞",
            "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💽", "💾", "💿", "📀", "🛎️",
            "🏨", "🏢", "🚗", "🚕", "✈️", "🚀", "🕒", "⏰", "⏱️", "🧭",
        ],
    },
    {
        name: "Food & Drinks",
        icon: "☕",
        emojis: [
            "☕", "🍵", "🧃", "🥤", "🧋", "🍾", "🍷", "🍸", "🍹", "🍺",
            "🍻", "🥂", "🥃", "🧊", "🍽️", "🍴", "🥄", "🍕", "🍔", "🍟",
            "🌭", "🍿", "🥞", "🧇", "🧀", "🥗", "🥪", "🍝", "🍜", "🍲",
            "🍣", "🍱", "🥟", "🍧", "🍨", "🍦", "🎂", "🍰", "🧁", "🍫",
        ],
    },
];

export const EMOJI_KEYWORD_MAP: Record<string, string[]> = {
    smile: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂"],
    happy: ["😀", "😃", "😄", "😁", "😆", "😊", "🥳", "🎉"],
    laugh: ["😆", "😅", "😂", "🤣"],
    love: ["😍", "🥰", "😘", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"],
    heart: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
    thumbs: ["👍", "👎"],
    ok: ["👌", "👍", "✅"],
    yes: ["👍", "✅", "🙌"],
    no: ["👎", "❌", "🚫"],
    clap: ["👏", "🙌"],
    fire: ["🔥", "💥"],
    check: ["✅", "✔️"],
    party: ["🎉", "🎊", "🥳", "🎈", "🎂"],
    star: ["⭐", "🌟", "✨"],
    coffee: ["☕", "🍵"],
    food: ["🍕", "🍔", "🍟", "🥗", "🥪", "🍣", "🍱", "🍰", "🍦"],
    hotel: ["🛎️", "🏨"],
    call: ["📞", "📱", "📲", "☎️"],
    car: ["🚗", "🚕"],
};

interface WhatsappInboxProps {
    token?: string;
    apiUrl?: string;
    currentUserId?: number;
    metaConnected: boolean;
    onNavigateToTemplates?: () => void;
    onUnresolvedCountChange?: (count: number) => void;
}

export const WhatsappInbox: React.FC<WhatsappInboxProps> = ({
    token,
    apiUrl,
    currentUserId,
    metaConnected,
    onNavigateToTemplates,
    onUnresolvedCountChange,
}) => {
    // ── States ──────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [counts, setCounts] = useState<{
        all: number;
        mine: number;
        unassigned: number;
        open: number;
        resolved: number;
    }>({ all: 0, mine: 0, unassigned: 0, open: 0, resolved: 0 });
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [windowExpiresAt, setWindowExpiresAt] = useState<string | null>(null);

    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sendingReply, setSendingReply] = useState(false);
    const [replyText, setReplyText] = useState("");

    // Scope filter: "all" | "mine" (Assigned to me) | "unassigned"
    const [scope, setScope] = useState<"all" | "mine" | "unassigned">("all");
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | undefined>("open");
    const [searchQuery, setSearchQuery] = useState("");

    // Search filters within dropdown menus
    const [categorySearchText, setCategorySearchText] = useState("");
    const [assigneeSearchText, setAssigneeSearchText] = useState("");

    // Data lists
    const [categories, setCategories] = useState<InboxCategory[]>([]);
    const [teamUsers, setTeamUsers] = useState<InboxUser[]>([]);

    // Category Management Modal
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState(OUTLOOK_COLORS[0].bar);
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

    // Reply bar media attachment & emoji picker
    const [replyAttachment, setReplyAttachment] = useState<AttachmentFile | null>(null);
    const [uploadingReplyAttachment, setUploadingReplyAttachment] = useState(false);
    const replyFileInputRef = useRef<HTMLInputElement>(null);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
    const [emojiSearch, setEmojiSearch] = useState("");

    // New Chat Modal & Attachment States
    const [newChatModalOpen, setNewChatModalOpen] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState("");
    const [newChatName, setNewChatName] = useState("");
    const [newChatCategoryId, setNewChatCategoryId] = useState<number | null>(null);
    const [newChatUserId, setNewChatUserId] = useState<number | null>(null);
    const [newChatInitialMessage, setNewChatInitialMessage] = useState("");
    const [newChatAttachment, setNewChatAttachment] = useState<AttachmentFile | null>(null);
    const [creatingChat, setCreatingChat] = useState(false);
    const newChatFileInputRef = useRef<HTMLInputElement>(null);

    // Sync & simulate states
    const [syncingContacts, setSyncingContacts] = useState(false);
    const [simulatingInbound, setSimulatingInbound] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── API Helper ──────────────────────────────────────────────────────────
    const authFetch = useCallback(
        async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
            if (!apiUrl || !token) throw new Error("API configuration or token missing");

            const hasBody = options.body !== undefined && options.body !== null;
            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
                ...(hasBody ? { "Content-Type": "application/json" } : {}),
                ...((options.headers as Record<string, string>) || {}),
            };

            const response = await fetch(`${apiUrl}${path}`, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const err = data?.message || `Request failed with status ${response.status}`;
                throw new Error(Array.isArray(err) ? err.join(", ") : err);
            }

            return response.json();
        },
        [apiUrl, token]
    );

    // ── File Upload Helper ──────────────────────────────────────────────────
    const uploadFile = async (
        file: File
    ): Promise<{ url: string; filename: string; mediaType: "image" | "video" | "audio" | "document" }> => {
        if (!apiUrl || !token) throw new Error("API or authorization token missing");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("tag", "whatsapp_inbox");
        formData.append("langCode", "en");
        formData.append("defaultLangCode", "en");

        const res = await fetch(`${apiUrl}/uploads/company-file`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || "File upload failed");
        }

        const data = await res.json();
        const url = data?.url || data?.signedUrl;
        if (!url) throw new Error("Did not receive URL from file upload");

        let mediaType: "image" | "video" | "audio" | "document" = "document";
        if (file.type.startsWith("image/")) {
            mediaType = "image";
        } else if (file.type.startsWith("video/")) {
            mediaType = "video";
        } else if (file.type.startsWith("audio/")) {
            mediaType = "audio";
        }

        return { url, filename: file.name, mediaType };
    };

    // ── Fetch WhatsApp Categories ───────────────────────────────────────────
    const loadCategories = useCallback(async () => {
        if (!token || !apiUrl) return;
        try {
            const res: any = await authFetch("/whatsapp/inbox/categories");
            const list = Array.isArray(res) ? res : res?.categories || res?.data || [];
            setCategories(list);
        } catch (err) {
            console.error("Failed to load WhatsApp categories", err);
        }
    }, [token, apiUrl, authFetch]);

    // ── Fetch Team Users ────────────────────────────────────────────────────
    const loadTeamUsers = useCallback(async () => {
        if (!token || !apiUrl) return;
        try {
            const res: any = await authFetch("/iam/user?take=100");
            const rawUsers = Array.isArray(res) ? res : res?.data || res?.users || [];
            setTeamUsers(
                rawUsers.map((u: any) => ({
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                }))
            );
        } catch (err) {
            console.error("Failed to load team users", err);
        }
    }, [token, apiUrl, authFetch]);

    useEffect(() => {
        loadCategories();
        loadTeamUsers();
    }, [loadCategories, loadTeamUsers]);

    useEffect(() => {
        if (categoryModalOpen) {
            loadCategories();
        }
    }, [categoryModalOpen, loadCategories]);

    // ── Fetch Conversations ─────────────────────────────────────────────────
    const loadConversations = useCallback(
        async (silent = false) => {
            if (!token || !apiUrl) return;
            if (!silent) setLoadingConversations(true);

            try {
                const params = new URLSearchParams();
                if (scope) params.set("scope", scope);
                if (statusFilter) params.set("status", statusFilter);
                if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));
                if (searchQuery.trim()) params.set("search", searchQuery.trim());

                const res: any = await authFetch(`/whatsapp/inbox/conversations?${params.toString()}`);
                const items: Conversation[] = res?.items || [];
                setConversations(items);
                if (res?.counts) {
                    setCounts({
                        all: res.counts.all ?? 0,
                        mine: res.counts.mine ?? 0,
                        unassigned: res.counts.unassigned ?? 0,
                        open: res.counts.open ?? 0,
                        resolved: res.counts.resolved ?? 0,
                    });
                    const unresolved = res.counts.open ?? 0;
                    onUnresolvedCountChange?.(unresolved);
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(
                            new CustomEvent("whatsapp_unresolved_count_updated", {
                                detail: { count: unresolved },
                            })
                        );
                    }
                }

                // Auto-select conversation if none selected or if previously active is no longer in view
                if (items.length > 0) {
                    if (!activeConversationId || !items.some((it) => it.id === activeConversationId)) {
                        setActiveConversationId(items[0].id);
                    }
                } else {
                    setActiveConversationId(null);
                }
            } catch (err: any) {
                if (!silent) message.error(err?.message || "Failed to load conversations");
            } finally {
                if (!silent) setLoadingConversations(false);
            }
        },
        [token, apiUrl, scope, statusFilter, selectedCategoryId, searchQuery, activeConversationId, authFetch, onUnresolvedCountChange]
    );

    useEffect(() => {
        loadConversations();
    }, [scope, statusFilter, selectedCategoryId, searchQuery, loadConversations]);

    // ── Fetch Messages for Active Conversation ──────────────────────────────
    const loadMessages = useCallback(
        async (conversationId: number, silent = false) => {
            if (!token || !apiUrl || !conversationId) return;
            if (!silent) setLoadingMessages(true);

            try {
                const res: any = await authFetch(`/whatsapp/inbox/conversations/${conversationId}/messages`);
                setMessages(res?.messages || []);
                setIsWindowOpen(Boolean(res?.isWindowOpen));
                setWindowExpiresAt(res?.windowExpiresAt || null);

                // Update unread count locally for selected conversation
                setConversations((prev) =>
                    prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
                );
            } catch (err: any) {
                if (!silent) message.error(err?.message || "Failed to load messages");
            } finally {
                if (!silent) setLoadingMessages(false);
            }
        },
        [token, apiUrl, authFetch]
    );

    useEffect(() => {
        if (activeConversationId) {
            loadMessages(activeConversationId);
        } else {
            setMessages([]);
        }
    }, [activeConversationId, loadMessages]);

    // ── Auto-scroll to bottom of chat ───────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Polling Interval (Every 5 seconds) ──────────────────────────────────
    useEffect(() => {
        if (!metaConnected || !token) return;

        pollingTimerRef.current = setInterval(() => {
            loadConversations(true);
            if (activeConversationId) {
                loadMessages(activeConversationId, true);
            }
        }, 5000);

        return () => {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        };
    }, [metaConnected, token, activeConversationId, loadConversations, loadMessages]);

    // ── Send Reply (with Media Attachment support) ──────────────────────────
    const handleSendReply = async () => {
        if ((!replyText.trim() && !replyAttachment) || !activeConversationId) return;
        setSendingReply(true);

        try {
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;
            let filename: string | undefined;

            if (replyAttachment) {
                setUploadingReplyAttachment(true);
                const uploaded = await uploadFile(replyAttachment.file);
                mediaUrl = uploaded.url;
                mediaType = uploaded.mediaType;
                filename = uploaded.filename;
            }

            await authFetch(`/whatsapp/inbox/conversations/${activeConversationId}/reply`, {
                method: "POST",
                body: JSON.stringify({
                    text: replyText.trim() || undefined,
                    mediaUrl,
                    mediaType,
                    filename,
                }),
            });

            setReplyText("");
            setReplyAttachment(null);
            if (replyFileInputRef.current) replyFileInputRef.current.value = "";
            await loadMessages(activeConversationId, true);
            await loadConversations(true);
            message.success("Message sent");
        } catch (err: any) {
            message.error(err?.message || "Failed to send reply");
        } finally {
            setSendingReply(false);
            setUploadingReplyAttachment(false);
        }
    };

    // ── Handle File Selection for Reply Bar ─────────────────────────────────
    const handleSelectReplyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let mediaType: "image" | "video" | "audio" | "document" = "document";
        let previewUrl: string | undefined;

        if (file.type.startsWith("image/")) {
            mediaType = "image";
            previewUrl = URL.createObjectURL(file);
        } else if (file.type.startsWith("video/")) {
            mediaType = "video";
        } else if (file.type.startsWith("audio/")) {
            mediaType = "audio";
        }

        setReplyAttachment({ file, previewUrl, mediaType });
    };

    // ── Start New Chat (with optional initial media attachment) ─────────────
    const handleStartNewChat = async () => {
        if (!newChatPhone.trim()) {
            message.error("Please enter a phone number");
            return;
        }

        setCreatingChat(true);
        try {
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;
            let filename: string | undefined;

            if (newChatAttachment) {
                const uploaded = await uploadFile(newChatAttachment.file);
                mediaUrl = uploaded.url;
                mediaType = uploaded.mediaType;
                filename = uploaded.filename;
            }

            const newConv: any = await authFetch("/whatsapp/inbox/conversations", {
                method: "POST",
                body: JSON.stringify({
                    contactPhone: newChatPhone.trim(),
                    contactName: newChatName.trim() || undefined,
                    categoryId: newChatCategoryId || undefined,
                    assignedUserId: newChatUserId || undefined,
                    initialMessage: newChatInitialMessage.trim() || undefined,
                    mediaUrl,
                    mediaType,
                    filename,
                }),
            });

            message.success(`Chat started with ${newConv.contactName || newConv.contactPhone}`);
            setNewChatModalOpen(false);
            setNewChatPhone("");
            setNewChatName("");
            setNewChatInitialMessage("");
            setNewChatCategoryId(null);
            setNewChatUserId(null);
            setNewChatAttachment(null);
            if (newChatFileInputRef.current) newChatFileInputRef.current.value = "";

            await loadConversations(false);
            if (newConv?.id) {
                setActiveConversationId(newConv.id);
            }
        } catch (err: any) {
            message.error(err?.message || "Failed to start chat");
        } finally {
            setCreatingChat(false);
        }
    };

    // ── Handle File Selection for New Chat Modal ────────────────────────────
    const handleSelectNewChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let mediaType: "image" | "video" | "audio" | "document" = "document";
        let previewUrl: string | undefined;

        if (file.type.startsWith("image/")) {
            mediaType = "image";
            previewUrl = URL.createObjectURL(file);
        } else if (file.type.startsWith("video/")) {
            mediaType = "video";
        } else if (file.type.startsWith("audio/")) {
            mediaType = "audio";
        }

        setNewChatAttachment({ file, previewUrl, mediaType });
    };

    // ── Create New Dedicated WhatsApp Category ──────────────────────────────
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            message.error("Please enter a category name");
            return;
        }

        setCreatingCategory(true);
        try {
            await authFetch("/whatsapp/inbox/categories", {
                method: "POST",
                body: JSON.stringify({
                    name: newCategoryName.trim(),
                    color: newCategoryColor,
                }),
            });
            message.success(`Category "${newCategoryName.trim()}" created`);
            setNewCategoryName("");
            await loadCategories();
        } catch (err: any) {
            message.error(err?.message || "Failed to create category");
        } finally {
            setCreatingCategory(false);
        }
    };

    // ── Delete Category ─────────────────────────────────────────────────────
    const handleDeleteCategory = async (id: number) => {
        setDeletingCategoryId(id);
        try {
            await authFetch(`/whatsapp/inbox/categories/${id}`, {
                method: "DELETE",
            });
            message.success("Category deleted");
            if (selectedCategoryId === id) setSelectedCategoryId(null);
            await loadCategories();
            await loadConversations(true);
        } catch (err: any) {
            message.error(err?.message || "Failed to delete category");
        } finally {
            setDeletingCategoryId(null);
        }
    };

    // ── Sync Existing Contacts Into Inbox ───────────────────────────────────
    const handleSyncContacts = async () => {
        setSyncingContacts(true);
        try {
            const res: any = await authFetch("/whatsapp/inbox/conversations/sync", {
                method: "POST",
                body: JSON.stringify({}),
            });
            message.success(`Synced ${res.syncedCount || 0} contacts into the inbox`);
            await loadConversations(false);
        } catch (err: any) {
            message.error(err?.message || "Failed to sync contacts");
        } finally {
            setSyncingContacts(false);
        }
    };

    // ── Simulate Inbound Test Message ───────────────────────────────────────
    const handleSimulateInbound = async () => {
        setSimulatingInbound(true);
        try {
            await authFetch("/whatsapp/inbox/conversations/simulate", {
                method: "POST",
                body: JSON.stringify({
                    from: "+971588784735",
                    senderName: "Gokce",
                    text: "Hi! I would like to book a SPA treatment for tomorrow at 4 PM.",
                }),
            });
            message.success("Simulated inbound message from Gokce received!");
            await loadConversations(false);
        } catch (err: any) {
            message.error(err?.message || "Failed to simulate message");
        } finally {
            setSimulatingInbound(false);
        }
    };

    // ── Assign Conversation (with @ user tag) ───────────────────────────────
    const handleAssignUser = async (userId: number | null) => {
        if (!activeConversationId) return;

        try {
            const updated: any = await authFetch(
                `/whatsapp/inbox/conversations/${activeConversationId}/assign`,
                {
                    method: "PUT",
                    body: JSON.stringify({ assignedUserId: userId }),
                }
            );

            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConversationId
                        ? { ...c, assignedUser: updated.assignedUser, assignedUserId: userId }
                        : c
                )
            );
            const assignedName = getUserDisplayName(updated.assignedUser);
            message.success(userId ? `Assigned to @${assignedName}` : "Conversation unassigned");
        } catch (err: any) {
            message.error(err?.message || "Failed to update assignment");
        }
    };

    // ── Assign Category (Outlook Color-Coded) ───────────────────────────────
    const handleAssignCategory = async (categoryId: number | null) => {
        if (!activeConversationId) return;

        try {
            const updated: any = await authFetch(
                `/whatsapp/inbox/conversations/${activeConversationId}/category`,
                {
                    method: "PUT",
                    body: JSON.stringify({ categoryId }),
                }
            );

            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConversationId
                        ? { ...c, category: updated.category, categoryId }
                        : c
                )
            );
            message.success(categoryId ? `Category set to "${updated.category?.name}"` : "Category removed");
        } catch (err: any) {
            message.error(err?.message || "Failed to update category");
        }
    };

    // ── Toggle Status (Open / Resolved) ─────────────────────────────────────
    const handleToggleStatus = async (newStatus: "open" | "resolved") => {
        if (!activeConversationId) return;

        try {
            await authFetch(`/whatsapp/inbox/conversations/${activeConversationId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });

            setConversations((prev) =>
                prev.map((c) => (c.id === activeConversationId ? { ...c, status: newStatus } : c))
            );
            message.success(
                newStatus === "resolved"
                    ? "Conversation marked as Resolved"
                    : "Conversation unresolved (moved to Open inbox)"
            );
            await loadConversations(true);
        } catch (err: any) {
            message.error(err?.message || "Failed to update status");
        }
    };

    // ── Cycle Message Delivery / Read Receipt (sent -> delivered -> read) ────
    const handleCycleMessageStatus = async (messageId: number, currentStatus: string) => {
        const nextStatusMap: Record<string, "sent" | "delivered" | "read"> = {
            pending: "sent",
            sent: "delivered",
            delivered: "read",
            read: "sent",
            failed: "sent",
        };
        const nextStatus = nextStatusMap[currentStatus] || "sent";

        // Optimistically update message in active view
        setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? { ...msg, status: nextStatus } : msg))
        );

        try {
            await authFetch(`/whatsapp/inbox/messages/${messageId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: nextStatus }),
            });
            message.info(
                nextStatus === "read"
                    ? "Receipt: Double Blue Tick (Read)"
                    : nextStatus === "delivered"
                    ? "Receipt: Double Gray Tick (Delivered)"
                    : "Receipt: Single Gray Tick (Sent)"
            );
        } catch {
            // Silently fallback if offline
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
    const activeConversation = conversations.find((c) => c.id === activeConversationId);

    const formatRemainingWindow = () => {
        if (!windowExpiresAt) return null;
        const diffMs = new Date(windowExpiresAt).getTime() - Date.now();
        if (diffMs <= 0) return "Expired";
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m left`;
    };

    const remainingWindowStr = formatRemainingWindow();

    const getUserDisplayName = (u?: InboxUser | null) => {
        if (!u) return "Unassigned";
        if (u.firstName || u.lastName) return `${u.firstName || ""} ${u.lastName || ""}`.trim();
        return u.email;
    };

    // Active conversation color & assignee
    const activeOutlookColor = getCategoryOutlookColor(activeConversation?.category || activeConversation?.categoryId);
    const activeAssigneeName = getUserDisplayName(activeConversation?.assignedUser);

    // ── Filtered Categories for Outlook Category Menu ───────────────────────
    const filteredCategories = categories.filter((c) => {
        const q = categorySearchText.toLowerCase().trim();
        if (!q) return true;
        return c.name.toLowerCase().includes(q);
    });

    const outlookCategoryMenu = (
        <Menu className="p-1 rounded-xl shadow-lg border border-gray-100 min-w-[240px]">
            <div className="p-2 border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                <Input
                    size="small"
                    placeholder="Search categories..."
                    prefix={<SearchOutlined className="text-gray-400 text-xs" />}
                    value={categorySearchText}
                    onChange={(e) => setCategorySearchText(e.target.value)}
                    allowClear
                    className="rounded-lg text-xs"
                />
            </div>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Outlook Categories</span>
                <span className="text-[10px] text-gray-400 font-normal">({filteredCategories.length})</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
                {filteredCategories.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 text-center">No categories found</div>
                ) : (
                    filteredCategories.map((cat) => {
                        const color = getCategoryOutlookColor(cat);
                        const isSelected = activeConversation?.categoryId === cat.id;
                        return (
                            <Menu.Item
                                key={cat.id}
                                onClick={() => handleAssignCategory(cat.id)}
                                className="rounded-lg my-0.5"
                            >
                                <div className="flex items-center justify-between py-0.5">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className="w-3.5 h-3.5 rounded-sm flex-shrink-0 shadow-xs"
                                            style={{ backgroundColor: color.swatch }}
                                        />
                                        <span className={`text-xs ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                                            {cat.name}
                                        </span>
                                    </div>
                                    {isSelected && <CheckOutlined className="text-xs text-green-600" />}
                                </div>
                            </Menu.Item>
                        );
                    })
                )}
            </div>
            <Menu.Divider />
            <Menu.Item
                key="manage-categories"
                onClick={() => setCategoryModalOpen(true)}
                className="text-[#00a884] font-semibold rounded-lg text-xs"
            >
                <SettingOutlined className="mr-1.5" /> Manage Categories (Settings)
            </Menu.Item>
            {activeConversation?.categoryId && (
                <Menu.Item
                    key="clear"
                    onClick={() => handleAssignCategory(null)}
                    className="text-red-500 rounded-lg text-xs"
                >
                    <CloseCircleOutlined className="mr-1.5" /> Clear Category
                </Menu.Item>
            )}
        </Menu>
    );

    // ── Filtered Assignees for Assignee Dropdown Menu ────────────────────────
    const filteredUsers = teamUsers.filter((u) => {
        const q = assigneeSearchText.toLowerCase().trim();
        if (!q) return true;
        const name = getUserDisplayName(u).toLowerCase();
        return name.includes(q) || u.email.toLowerCase().includes(q);
    });

    const assigneeMenu = (
        <Menu className="p-1 rounded-xl shadow-lg border border-gray-100 min-w-[240px]">
            <div className="p-2 border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                <Input
                    size="small"
                    placeholder="Search user..."
                    prefix={<SearchOutlined className="text-gray-400 text-xs" />}
                    value={assigneeSearchText}
                    onChange={(e) => setAssigneeSearchText(e.target.value)}
                    allowClear
                    className="rounded-lg text-xs"
                />
            </div>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Assign with @</span>
                <span className="text-[10px] text-gray-400 font-normal">({filteredUsers.length})</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 text-center">No users found</div>
                ) : (
                    filteredUsers.map((u) => {
                        const name = getUserDisplayName(u);
                        const isSelected = activeConversation?.assignedUserId === u.id;
                        return (
                            <Menu.Item
                                key={u.id}
                                onClick={() => handleAssignUser(u.id)}
                                className="rounded-lg my-0.5"
                            >
                                <div className="flex items-center justify-between py-0.5">
                                    <div className="flex items-center gap-2">
                                        <Avatar size={22} style={{ backgroundColor: "#2563EB" }} icon={<UserOutlined />} />
                                        <span className={`text-xs ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                                            @{name}
                                        </span>
                                    </div>
                                    {isSelected && <CheckOutlined className="text-xs text-blue-600" />}
                                </div>
                            </Menu.Item>
                        );
                    })
                )}
            </div>
            {activeConversation?.assignedUserId && (
                <>
                    <Menu.Divider />
                    <Menu.Item
                        key="unassign"
                        onClick={() => handleAssignUser(null)}
                        className="text-gray-500 rounded-lg text-xs"
                    >
                        <CloseCircleOutlined className="mr-1.5" /> Unassign (Set to Open)
                    </Menu.Item>
                </>
            )}
        </Menu>
    );

    // ── Emoji Picker Popover Content ─────────────────────────────────────────
    const filteredEmojis = useMemo(() => {
        if (!emojiSearch.trim()) {
            return EMOJI_CATEGORIES[activeEmojiCategory]?.emojis || [];
        }
        const term = emojiSearch.trim().toLowerCase();
        const matches: string[] = [];
        for (const [kw, list] of Object.entries(EMOJI_KEYWORD_MAP)) {
            if (kw.includes(term) || term.includes(kw)) {
                matches.push(...list);
            }
        }
        if (matches.length > 0) {
            return Array.from(new Set(matches));
        }
        return EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    }, [emojiSearch, activeEmojiCategory]);

    const emojiPickerContent = (
        <div className="w-72 sm:w-80 p-2.5 bg-white rounded-2xl shadow-xl border border-gray-100 select-none">
            {/* Search Input */}
            <div className="mb-2">
                <Input
                    size="small"
                    prefix={<SearchOutlined className="text-gray-400 text-xs" />}
                    placeholder="Search emojis (smile, heart, ok...)"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    allowClear
                    className="rounded-lg text-xs bg-gray-50 border-gray-200"
                />
            </div>

            {/* Category Navigation Tabs */}
            {!emojiSearch.trim() && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2 px-1">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                        <button
                            key={cat.name}
                            type="button"
                            onClick={() => setActiveEmojiCategory(idx)}
                            className={`p-1.5 rounded-lg text-base transition-all flex items-center justify-center ${
                                activeEmojiCategory === idx
                                    ? "bg-green-50 text-[#00a884] shadow-xs scale-110"
                                    : "hover:bg-gray-100 text-gray-500 opacity-60 hover:opacity-100"
                            }`}
                            title={cat.name}
                        >
                            <span>{cat.icon}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Grid */}
            <div className="h-52 overflow-y-auto pr-1 grid grid-cols-8 gap-1 scrollbar-thin">
                {filteredEmojis.map((emoji, i) => (
                    <button
                        key={`${emoji}-${i}`}
                        type="button"
                        onClick={() => {
                            setReplyText((prev) => prev + emoji);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer border-0 bg-transparent p-0"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>{emojiSearch.trim() ? "Search results" : EMOJI_CATEGORIES[activeEmojiCategory]?.name}</span>
                <button
                    type="button"
                    onClick={() => setEmojiPickerOpen(false)}
                    className="text-[#00a884] hover:underline font-semibold"
                >
                    Done
                </button>
            </div>
        </div>
    );

    // ── Not Connected Warning ───────────────────────────────────────────────
    if (!metaConnected) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-green-50 text-[#00a884] mx-auto flex items-center justify-center text-3xl mb-4">
                    <MdWhatsapp />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">WhatsApp Business Not Connected</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Connect your official WhatsApp Business Account using the button in the header above to start receiving customer messages and organizing your team inbox.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#f0f2f5] rounded-2xl border border-gray-200/90 shadow-md overflow-hidden flex flex-col md:flex-row h-[760px] font-sans">
            {/* ══════════════════════════════════════════════════════════════════
                LEFT PANEL: WHATSAPP DESKTOP CHAT LIST & OUTLOOK CATEGORIES
            ══════════════════════════════════════════════════════════════════ */}
            <div className="w-full md:w-[360px] lg:w-[410px] border-r border-[#e9edef] flex flex-col bg-white">
                {/* 1. Header Toolbar (WhatsApp Desktop Style) */}
                <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Avatar
                            size={40}
                            style={{ backgroundColor: "#00a884" }}
                            icon={<MdWhatsapp className="text-2xl text-white" />}
                        />
                        <div>
                            <div className="text-sm font-bold text-[#111b21] leading-tight">Shared Team Inbox</div>
                            <div className="text-[11px] text-[#667781] leading-none mt-0.5">Multi-User WhatsApp</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Manage Categories Setting Button */}
                        <Tooltip title="Manage WhatsApp Categories (Company Settings)">
                            <Button
                                type="text"
                                shape="circle"
                                icon={<SettingOutlined className="text-[#54656f]" />}
                                onClick={() => setCategoryModalOpen(true)}
                            />
                        </Tooltip>

                        {/* New Chat Button */}
                        <Tooltip title="Start a new chat with a contact">
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                                onClick={() => setNewChatModalOpen(true)}
                                className="rounded-lg text-xs font-semibold shadow-xs"
                            >
                                New Chat
                            </Button>
                        </Tooltip>

                        {/* Refresh Button */}
                        <Tooltip title="Refresh chats">
                            <Button
                                type="text"
                                shape="circle"
                                icon={<SyncOutlined className="text-[#54656f]" />}
                                onClick={() => loadConversations(false)}
                                loading={loadingConversations}
                            />
                        </Tooltip>
                    </div>
                </div>

                {/* 2. Search Bar (WhatsApp Web Style) */}
                <div className="p-2.5 bg-white border-b border-[#f0f2f5]">
                    <div className="relative flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5">
                        <SearchOutlined className="text-[#54656f] mr-2.5 text-sm" />
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-xs text-[#111b21] placeholder-[#667781]"
                        />
                    </div>
                </div>

                {/* 2.5 Status Tabs: Open (Unresolved) vs Resolved vs All */}
                <div className="px-3 pt-2 pb-1.5 bg-white border-b border-[#f0f2f5]">
                    <div className="bg-[#f0f2f5] p-1 rounded-lg flex items-center gap-1 text-xs">
                        <button
                            type="button"
                            onClick={() => setStatusFilter("open")}
                            className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 font-medium ${
                                statusFilter === "open"
                                    ? "bg-white text-[#111b21] shadow-xs font-semibold"
                                    : "text-[#54656f] hover:text-[#111b21]"
                            }`}
                        >
                            <span>Open</span>
                            {counts.open > 0 ? (
                                <span
                                    style={{ height: 18, minWidth: 18, lineHeight: "18px" }}
                                    className={`text-[10px] font-bold rounded-full inline-flex items-center justify-center text-center flex-shrink-0 ${
                                        counts.open < 10 ? "w-[18px] h-[18px] p-0" : "px-1"
                                    } ${
                                        statusFilter === "open" ? "bg-[#f5222d] text-white" : "bg-red-100 text-[#f5222d]"
                                    }`}
                                >
                                    {counts.open}
                                </span>
                            ) : (
                                <span className="text-[10px] text-[#8696a0]">0</span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("resolved")}
                            className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 font-medium ${
                                statusFilter === "resolved"
                                    ? "bg-white text-[#111b21] shadow-xs font-semibold"
                                    : "text-[#54656f] hover:text-[#111b21]"
                            }`}
                        >
                            <CheckCircleOutlined className={statusFilter === "resolved" ? "text-green-600 text-xs" : "text-gray-400 text-xs"} />
                            <span>Resolved</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                statusFilter === "resolved" ? "bg-gray-200 text-gray-800" : "text-[#8696a0]"
                            }`}>
                                {counts.resolved}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter(undefined)}
                            className={`py-1 px-2.5 rounded-md transition-all flex items-center justify-center gap-1 font-medium ${
                                statusFilter === undefined
                                    ? "bg-white text-[#111b21] shadow-xs font-semibold"
                                    : "text-[#54656f] hover:text-[#111b21]"
                            }`}
                        >
                            <span>All</span>
                            <span className="text-[10px] text-[#8696a0] font-bold">{counts.all}</span>
                        </button>
                    </div>
                </div>

                {/* 3. Filter Chips (All, Assigned to me, Unassigned) */}
                <div className="px-3 pt-2.5 pb-2 bg-white border-b border-[#f0f2f5] space-y-2">
                    <div className="flex items-center gap-1.5">
                        {/* All */}
                        <button
                            onClick={() => setScope("all")}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                scope === "all"
                                    ? "bg-[#00a884] text-white shadow-xs"
                                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
                            }`}
                        >
                            All <span className="opacity-90 font-bold ml-1">{counts.all}</span>
                        </button>

                        {/* Assigned to me */}
                        <button
                            onClick={() => setScope("mine")}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                                scope === "mine"
                                    ? "bg-[#2563EB] text-white shadow-xs"
                                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
                            }`}
                        >
                            <span>@ Assigned to me</span>
                            <span className="opacity-90 font-bold ml-0.5">{counts.mine}</span>
                        </button>

                        {/* Unassigned */}
                        <button
                            onClick={() => setScope("unassigned")}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                scope === "unassigned"
                                    ? "bg-[#EA580C] text-white shadow-xs"
                                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
                            }`}
                        >
                            Unassigned <span className="opacity-90 font-bold ml-1">{counts.unassigned}</span>
                        </button>
                    </div>

                    {/* 4. Dedicated Outlook Color-Coded Categories Quick Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                        <span className="text-[11px] font-semibold text-[#8696a0] flex-shrink-0 flex items-center gap-1 mr-0.5">
                            <TagOutlined className="text-xs" /> Categories:
                        </span>

                        {/* Clear category filter pill */}
                        {selectedCategoryId !== null && (
                            <button
                                onClick={() => setSelectedCategoryId(null)}
                                className="px-2 py-0.5 text-[11px] rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 flex-shrink-0"
                            >
                                ✕ Clear
                            </button>
                        )}

                        {/* Category pills with Outlook colors */}
                        {categories.map((cat) => {
                            const color = getCategoryOutlookColor(cat);
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                                    style={{
                                        backgroundColor: isSelected ? color.bar : color.bg,
                                        color: isSelected ? "#ffffff" : color.text,
                                        borderColor: color.border,
                                    }}
                                    className={`px-2.5 py-0.5 text-[11px] rounded-md font-medium border flex items-center gap-1.5 flex-shrink-0 transition-all ${
                                        isSelected ? "shadow-xs ring-1 ring-offset-1 ring-gray-400" : "hover:opacity-90"
                                    }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: isSelected ? "#ffffff" : color.swatch }}
                                    />
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}

                        {/* Add/Manage Categories pill */}
                        <button
                            onClick={() => setCategoryModalOpen(true)}
                            className="px-2 py-0.5 text-[11px] rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-[#00a884] hover:text-[#00a884] flex items-center gap-1 flex-shrink-0 transition-colors"
                        >
                            <PlusOutlined className="text-[10px]" /> Manage
                        </button>
                    </div>
                </div>

                {/* 5. Chat List (WhatsApp Desktop Layout + Outlook Color Bar) */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
                    {loadingConversations ? (
                        <div className="p-8 text-center">
                            <Spin />
                            <div className="text-xs text-[#667781] mt-2">Loading WhatsApp chats...</div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-6 text-center text-[#667781] space-y-3">
                            <div className="w-12 h-12 rounded-full bg-green-50 text-[#00a884] mx-auto flex items-center justify-center text-2xl shadow-xs">
                                {statusFilter === "resolved" ? <CheckCircleOutlined className="text-gray-500" /> : <MessageOutlined />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#111b21]">
                                    {statusFilter === "resolved" ? "No resolved chats" : "No chats yet"}
                                </div>
                                <p className="text-xs text-[#8696a0] max-w-xs mx-auto m-0 mt-1 leading-relaxed">
                                    {statusFilter === "resolved"
                                        ? "Conversations marked as resolved will appear here for reference. You can reopen any resolved chat at any time."
                                        : "Inbound messages will automatically appear when guests text your WhatsApp number. You can also start a chat or sync existing contacts."}
                                </p>
                            </div>

                            {statusFilter === "resolved" ? (
                                <div className="pt-2">
                                    <Button
                                        onClick={() => setStatusFilter("open")}
                                        className="rounded-xl text-xs font-medium h-9"
                                    >
                                        View Open Inbox ({counts.open})
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 pt-2 max-w-[260px] mx-auto">
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                                        onClick={() => setNewChatModalOpen(true)}
                                        className="rounded-xl shadow-xs text-xs font-semibold h-9"
                                    >
                                        Start New Chat
                                    </Button>

                                    <Button
                                        icon={<SyncOutlined spin={syncingContacts} />}
                                        onClick={handleSyncContacts}
                                        loading={syncingContacts}
                                        className="rounded-xl text-xs font-medium h-9"
                                    >
                                        Sync Existing Contacts
                                    </Button>

                                    <Button
                                        type="dashed"
                                        icon={<ThunderboltOutlined />}
                                        onClick={handleSimulateInbound}
                                        loading={simulatingInbound}
                                        className="rounded-xl text-xs text-blue-600 border-blue-200 h-9"
                                    >
                                        Test Inbound Message
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        conversations.map((c) => {
                            const isSelected = c.id === activeConversationId;
                            const color = getCategoryOutlookColor(c.category || c.categoryId);
                            const hasCategory = Boolean(c.category);

                            return (
                                <div
                                    key={c.id}
                                    onClick={() => setActiveConversationId(c.id)}
                                    style={{
                                        borderLeftColor: hasCategory ? color.bar : "transparent",
                                        borderLeftWidth: "4px",
                                    }}
                                    className={`px-3.5 py-3 cursor-pointer transition-all flex items-start gap-3 relative hover:bg-[#f5f6f6] ${
                                        isSelected ? "bg-[#f0f2f5]" : "bg-white"
                                    }`}
                                >
                                    {/* Contact Avatar */}
                                    <Avatar
                                        size={46}
                                        style={{ backgroundColor: isSelected ? "#00a884" : "#dfe5e7", color: isSelected ? "#fff" : "#54656f" }}
                                        icon={<UserOutlined />}
                                        className="flex-shrink-0 mt-0.5"
                                    />

                                    {/* Chat Details */}
                                    <div className="flex-1 min-w-0">
                                        {/* Top Row: Name + Time */}
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-semibold text-sm text-[#111b21] truncate">
                                                {c.contactName || c.contactPhone}
                                            </span>
                                            <span className={`text-[11px] flex-shrink-0 ml-1 ${c.unreadCount > 0 ? "text-[#00a884] font-bold" : "text-[#667781]"}`}>
                                                {dayjs(c.lastMessageAt).fromNow(true)}
                                            </span>
                                        </div>

                                        {/* Middle Row: Message snippet + Unread Badge */}
                                        <div className="flex items-center justify-between gap-1 mb-2">
                                            <p className="text-xs text-[#667781] truncate m-0">
                                                {c.lastMessageText || "No messages yet"}
                                            </p>
                                            {c.unreadCount > 0 && (
                                                <Badge
                                                    count={c.unreadCount}
                                                    style={{ backgroundColor: "#00a884" }}
                                                    className="flex-shrink-0"
                                                />
                                            )}
                                        </div>

                                        {/* Bottom Row: Outlook Color Tag + @ Assignee Tag */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Outlook Color-Coded Category Tag */}
                                            {c.category ? (
                                                <span
                                                    style={{
                                                        backgroundColor: color.bg,
                                                        color: color.text,
                                                        borderColor: color.border,
                                                    }}
                                                    className="text-[10px] px-2 py-0.5 rounded font-semibold border flex items-center gap-1 shadow-xs"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-xs" style={{ backgroundColor: color.swatch }} />
                                                    {c.category.name}
                                                </span>
                                            ) : null}

                                            {/* @ Assignee Tag */}
                                            {c.assignedUser ? (
                                                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70 font-semibold flex items-center gap-0.5">
                                                    <FaAt className="text-[9px] opacity-75" />
                                                    <span>{c.assignedUser.firstName || c.assignedUser.email}</span>
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 font-medium">
                                                    Unassigned
                                                </span>
                                            )}

                                            {/* Status Badge */}
                                            {c.status === "resolved" ? (
                                                <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-medium flex items-center gap-1">
                                                    <CheckCircleOutlined className="text-gray-500 text-[10px]" />
                                                    <span>Resolved</span>
                                                </span>
                                            ) : statusFilter === undefined ? (
                                                <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 font-medium flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    <span>Open</span>
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                RIGHT PANEL: AUTHENTIC WHATSAPP DESKTOP CHAT STREAM & REPLY
            ══════════════════════════════════════════════════════════════════ */}
            {activeConversation ? (
                <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                    {/* 1. Active Chat Header (WhatsApp Web Style + Organization Buttons) */}
                    <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between gap-3 z-10">
                        {/* Contact Info */}
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                                size={42}
                                style={{ backgroundColor: "#00a884" }}
                                icon={<UserOutlined />}
                                className="flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#111b21] text-sm m-0 truncate">
                                        {activeConversation.contactName || activeConversation.contactPhone}
                                    </h3>
                                    {activeConversation.status === "resolved" ? (
                                        <Tag color="default" className="text-[10px] m-0 px-1.5 py-0 border-gray-300 font-medium">
                                            ✓ Resolved
                                        </Tag>
                                    ) : (
                                        <Tag color="green" className="text-[10px] m-0 px-1.5 py-0 font-medium">
                                            ● Open
                                        </Tag>
                                    )}
                                </div>
                                <div className="text-[11px] text-[#667781] font-mono mt-0.5">
                                    {activeConversation.contactPhone}
                                </div>
                            </div>
                        </div>

                        {/* Top Action Controls: Outlook Categorize + @ Assign + Status */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {/* Meta 24h Window Badge */}
                            {remainingWindowStr && (
                                <Tooltip title="Meta 24-hour customer service window for free-form replies">
                                    <Tag
                                        icon={<ClockCircleOutlined />}
                                        color={isWindowOpen ? "processing" : "error"}
                                        className="m-0 text-[11px] px-2 py-0.5 rounded-full"
                                    >
                                        24h: {remainingWindowStr}
                                    </Tag>
                                </Tooltip>
                            )}

                            {/* 1. Outlook-Style Categorize Dropdown (Searchable) */}
                            <Dropdown overlay={outlookCategoryMenu} trigger={["click"]} placement="bottomRight">
                                <Button
                                    size="small"
                                    style={{
                                        backgroundColor: activeConversation.category ? activeOutlookColor.bg : "#ffffff",
                                        color: activeConversation.category ? activeOutlookColor.text : "#374151",
                                        borderColor: activeConversation.category ? activeOutlookColor.border : "#d1d5db",
                                    }}
                                    className="rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-xs inline-block"
                                        style={{ backgroundColor: activeConversation.category ? activeOutlookColor.swatch : "#9ca3af" }}
                                    />
                                    <span>{activeConversation.category?.name || "Categorize"}</span>
                                    <DownOutlined className="text-[10px] ml-0.5 opacity-60" />
                                </Button>
                            </Dropdown>

                            {/* 2. @ Assign to User Dropdown (Searchable) */}
                            <Dropdown overlay={assigneeMenu} trigger={["click"]} placement="bottomRight">
                                <Button
                                    size="small"
                                    style={{
                                        backgroundColor: activeConversation.assignedUser ? "#eff6ff" : "#ffffff",
                                        color: activeConversation.assignedUser ? "#1d4ed8" : "#374151",
                                        borderColor: activeConversation.assignedUser ? "#bfdbfe" : "#d1d5db",
                                    }}
                                    className="rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                                >
                                    <FaAt className="text-xs text-blue-600" />
                                    <span>{activeConversation.assignedUser ? activeAssigneeName : "Assign (@)"}</span>
                                    <DownOutlined className="text-[10px] ml-0.5 opacity-60" />
                                </Button>
                            </Dropdown>

                            {/* 3. Resolve / Unresolve (Re-open) Button */}
                            {activeConversation.status === "open" ? (
                                <Tooltip title="Mark this conversation as resolved">
                                    <Button
                                        size="small"
                                        icon={<CheckCircleOutlined className="text-green-600" />}
                                        onClick={() => handleToggleStatus("resolved")}
                                        className="rounded-lg text-xs font-medium hover:border-green-600 hover:text-green-600 shadow-xs"
                                    >
                                        Resolve
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Tooltip title="Unresolve this conversation and return it to the active Open inbox">
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<UndoOutlined />}
                                        style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                                        onClick={() => handleToggleStatus("open")}
                                        className="rounded-lg text-xs font-semibold shadow-xs"
                                    >
                                        Unresolve
                                    </Button>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Resolved Status Notification Banner */}
                    {activeConversation.status === "resolved" && (
                        <div className="bg-amber-50/95 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shadow-xs z-10">
                            <div className="flex items-center gap-2">
                                <CheckCircleOutlined className="text-amber-600 text-sm flex-shrink-0" />
                                <span>
                                    <strong>This conversation is resolved.</strong> It is archived from the active Open inbox.
                                </span>
                            </div>
                            <Button
                                size="small"
                                icon={<UndoOutlined />}
                                onClick={() => handleToggleStatus("open")}
                                className="rounded-md text-xs font-semibold text-[#00a884] border-[#00a884] hover:bg-green-50 shadow-xs"
                            >
                                Unresolve & Reopen
                            </Button>
                        </div>
                    )}

                    {/* 2. Chat Bubble Stream (WhatsApp Desktop Chat Wallpaper & Bubbles) */}
                    <div
                        className="flex-1 p-5 overflow-y-auto space-y-3"
                        style={{
                            backgroundImage: `radial-gradient(#d1d7db 1px, transparent 1px), radial-gradient(#d1d7db 1px, #efeae2 1px)`,
                            backgroundSize: `40px 40px`,
                            backgroundPosition: `0 0, 20px 20px`,
                        }}
                    >
                        {/* Centered Date Separator Pill */}
                        <div className="flex justify-center my-2">
                            <span className="bg-white/90 backdrop-blur-xs text-[#54656f] text-[11px] font-medium px-3 py-1 rounded-lg shadow-xs uppercase tracking-wide">
                                WhatsApp Conversation
                            </span>
                        </div>

                        {loadingMessages ? (
                            <div className="h-full flex items-center justify-center">
                                <Spin tip="Loading chat history..." />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center text-[#667781]">
                                <div className="bg-white/80 p-6 rounded-2xl shadow-xs">
                                    <SmileOutlined className="text-3xl mb-2 text-[#00a884]" />
                                    <div className="text-sm font-semibold">No messages in this chat yet</div>
                                    <div className="text-xs text-[#8696a0] mt-1">Send a message below to start the conversation.</div>
                                </div>
                            </div>
                        ) : (
                            messages.map((m) => {
                                const isOutbound = m.direction === "outbound";
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                                    >
                                        <div
                                            style={{
                                                backgroundColor: isOutbound ? "#d9fdd3" : "#ffffff",
                                                borderRadius: isOutbound ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                                boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                                            }}
                                            className="max-w-[75%] px-3.5 py-2 text-sm relative"
                                        >
                                            {/* Media Attachment Rendering */}
                                            {m.mediaUrl && (
                                                <div className="mb-1.5 rounded-lg overflow-hidden">
                                                    {m.messageType === "image" ? (
                                                        <Image
                                                            src={m.mediaUrl}
                                                            alt="WhatsApp Attachment"
                                                            className="max-h-64 object-cover rounded-lg"
                                                            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23cccccc'><rect width='100' height='100'/></svg>"
                                                        />
                                                    ) : m.messageType === "video" ? (
                                                        <video
                                                            src={m.mediaUrl}
                                                            controls
                                                            className="max-h-64 rounded-lg w-full bg-black"
                                                        />
                                                    ) : m.messageType === "audio" ? (
                                                        <audio src={m.mediaUrl} controls className="w-full my-1" />
                                                    ) : (
                                                        <a
                                                            href={m.mediaUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2.5 p-2.5 bg-black/5 hover:bg-black/10 rounded-lg text-[#111b21] transition-colors no-underline"
                                                        >
                                                            <FaFileDownload className="text-xl text-[#00a884] flex-shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-semibold truncate text-[#111b21]">
                                                                    {m.content || "Document"}
                                                                </div>
                                                                <div className="text-[10px] text-[#667781] uppercase font-mono">
                                                                    Click to view / download
                                                                </div>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text Content (if not redundant attachment placeholder) */}
                                            {m.content && (!m.mediaUrl || (m.content !== m.mediaUrl && !m.content.startsWith("Attachment ("))) && (
                                                <p className="m-0 whitespace-pre-wrap leading-relaxed text-[#111b21]">
                                                    {m.content}
                                                </p>
                                            )}

                                            {/* Timestamp + WhatsApp Blue Checks */}
                                            <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] mt-1">
                                                <span>{dayjs(m.createdAt).format("h:mm A")}</span>
                                                {isOutbound && (
                                                    <Tooltip
                                                        title={
                                                            m.status === "read"
                                                                ? "Read • Double Blue Tick (Click to cycle)"
                                                                : m.status === "delivered"
                                                                ? "Delivered • Double Gray Tick (Click to mark Read)"
                                                                : m.status === "sent"
                                                                ? "Sent • Single Gray Tick (Click to mark Delivered)"
                                                                : m.status === "failed"
                                                                ? "Failed to deliver"
                                                                : "Sending..."
                                                        }
                                                    >
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCycleMessageStatus(m.id, m.status);
                                                            }}
                                                            className="inline-flex items-center ml-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                                        >
                                                            {m.status === "read" ? (
                                                                <BsCheck2All className="text-[15px] text-[#53bdeb] stroke-[0.3]" />
                                                            ) : m.status === "delivered" ? (
                                                                <BsCheck2All className="text-[15px] text-[#8696a0] stroke-[0.3]" />
                                                            ) : m.status === "sent" ? (
                                                                <BsCheck2 className="text-[14px] text-[#8696a0] stroke-[0.5]" />
                                                            ) : m.status === "failed" ? (
                                                                <ExclamationCircleOutlined className="text-red-500 text-[11px]" />
                                                            ) : (
                                                                <ClockCircleOutlined className="text-[#8696a0] text-[10px]" />
                                                            )}
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 3. 24-Hour Window Expiry Notice */}
                    {!isWindowOpen && (
                        <div className="bg-[#fff9db] border-t border-b border-[#ffe066] px-4 py-2 flex items-center justify-between text-xs text-[#7c5e00] z-10">
                            <span>
                                ⚠️ <strong>Meta 24-hour service window closed.</strong> Freeform text cannot be sent until customer replies or you re-open outreach with an approved WhatsApp Template.
                            </span>
                            {onNavigateToTemplates && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={onNavigateToTemplates}
                                    className="p-0 text-[#7c5e00] font-bold underline"
                                >
                                    Choose Template
                                </Button>
                            )}
                        </div>
                    )}

                    {/* 4. WhatsApp Desktop Bottom Input Bar & Media Attachment */}
                    <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef] flex flex-col gap-2 z-10">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={replyFileInputRef}
                            style={{ display: "none" }}
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={handleSelectReplyFile}
                        />

                        {/* Selected Media Attachment Preview Pill */}
                        {replyAttachment && (
                            <div className="px-3 py-2 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {replyAttachment.mediaType === "image" && replyAttachment.previewUrl ? (
                                        <img
                                            src={replyAttachment.previewUrl}
                                            alt="Preview"
                                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                        />
                                    ) : replyAttachment.mediaType === "video" ? (
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">
                                            <VideoCameraOutlined />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
                                            <FileOutlined />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-gray-800 truncate">
                                            {replyAttachment.file.name}
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            {(replyAttachment.file.size / 1024 / 1024).toFixed(2)} MB • {replyAttachment.mediaType.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    icon={<CloseCircleOutlined className="text-gray-400 hover:text-red-500" />}
                                    onClick={() => {
                                        setReplyAttachment(null);
                                        if (replyFileInputRef.current) replyFileInputRef.current.value = "";
                                    }}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2.5">
                            {/* Emoji Tools */}
                            <Popover
                                content={emojiPickerContent}
                                trigger="click"
                                open={emojiPickerOpen}
                                onOpenChange={setEmojiPickerOpen}
                                placement="topLeft"
                                arrow={false}
                            >
                                <Tooltip title="Emoji">
                                    <Button
                                        type="text"
                                        shape="circle"
                                        icon={<SmileOutlined className={`text-xl ${emojiPickerOpen ? "text-[#00a884]" : "text-[#54656f]"}`} />}
                                        className="flex-shrink-0"
                                    />
                                </Tooltip>
                            </Popover>

                            {/* Attach Media Tool (📎) */}
                            <Tooltip title="Attach image, video or document">
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<PaperClipOutlined className="text-xl text-[#54656f]" />}
                                    onClick={() => replyFileInputRef.current?.click()}
                                    className="flex-shrink-0"
                                />
                            </Tooltip>

                            {/* Input Box */}
                            <div className="flex-1 bg-white rounded-lg px-3 py-1.5 shadow-xs flex items-center">
                                <input
                                    type="text"
                                    placeholder={
                                        replyAttachment
                                            ? `Add caption for ${replyAttachment.file.name}...`
                                            : isWindowOpen
                                            ? "Type a message (Press Enter to send)"
                                            : "24h window closed. Use an approved template."
                                    }
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply();
                                        }
                                    }}
                                    disabled={sendingReply}
                                    className="w-full bg-transparent border-none outline-none text-sm text-[#111b21] placeholder-[#667781]"
                                />
                            </div>

                            {/* WhatsApp Green Send Button */}
                            <button
                                type="button"
                                onClick={handleSendReply}
                                disabled={(!replyText.trim() && !replyAttachment) || sendingReply || uploadingReplyAttachment}
                                style={{
                                    width: 40,
                                    height: 40,
                                    minWidth: 40,
                                    minHeight: 40,
                                    maxWidth: 40,
                                    maxHeight: 40,
                                    borderRadius: "50%",
                                    backgroundColor: (!replyText.trim() && !replyAttachment) ? "#a0dfd2" : "#00a884",
                                }}
                                className="aspect-square rounded-full text-white flex items-center justify-center flex-shrink-0 shadow-xs transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-0 border-0 outline-none"
                                title="Send message"
                            >
                                {sendingReply || uploadingReplyAttachment ? (
                                    <LoadingOutlined className="text-white text-base" />
                                ) : (
                                    <SendOutlined className="text-white text-base ml-0.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty Selection Placeholder */
                <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] p-12 text-center text-[#667781]">
                    <div className="max-w-sm">
                        <div className="w-20 h-20 rounded-full bg-[#dfe5e7] mx-auto flex items-center justify-center text-4xl text-[#00a884] mb-4 shadow-xs">
                            <MdWhatsapp />
                        </div>
                        <h3 className="text-lg font-bold text-[#111b21] mb-1">WhatsApp Desktop Inbox</h3>
                        <p className="text-xs text-[#667781] leading-relaxed mb-4">
                            Organize customer conversations on the left. Assign to team members with <strong>@</strong> or categorize using <strong>Outlook color-coded tags</strong>.
                        </p>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                            onClick={() => setNewChatModalOpen(true)}
                            className="rounded-xl shadow-xs text-xs font-semibold"
                        >
                            Start New Chat
                        </Button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: START NEW WHATSAPP CHAT (SEARCHABLE CATEGORIES + USERS + MEDIA)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal
                title={<span className="font-bold text-gray-800 flex items-center gap-2"><MdWhatsapp className="text-green-500 text-xl" /> Start New WhatsApp Chat</span>}
                open={newChatModalOpen}
                onCancel={() => setNewChatModalOpen(false)}
                footer={null}
                className="rounded-2xl"
                centered
            >
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number (with country code) *</label>
                        <Input
                            placeholder="e.g. +971588784735 or +919876543210"
                            value={newChatPhone}
                            onChange={(e) => setNewChatPhone(e.target.value)}
                            className="rounded-xl"
                        />
                        <div className="text-[11px] text-gray-400 mt-1">Existing contact in your account: <strong>Gokce (+971588784735)</strong></div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact / Guest Name (Optional)</label>
                        <Input
                            placeholder="e.g. Gokce, Alex Johnson"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Searchable WhatsApp Category */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-gray-600">Category</label>
                                <button
                                    type="button"
                                    onClick={() => setCategoryModalOpen(true)}
                                    className="text-[11px] text-[#00a884] hover:underline flex items-center gap-0.5"
                                >
                                    + Add New
                                </button>
                            </div>
                            <Select
                                showSearch
                                placeholder="Search category..."
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                    String(option?.label || "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                value={newChatCategoryId || undefined}
                                onChange={(val) => setNewChatCategoryId(val || null)}
                                allowClear
                                className="w-full"
                                options={categories.map((c) => {
                                    const col = getCategoryOutlookColor(c);
                                    return {
                                        value: c.id,
                                        label: c.name,
                                        renderLabel: (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: col.swatch }} />
                                                <span>{c.name}</span>
                                            </div>
                                        ),
                                    };
                                })}
                                optionRender={(opt) => (opt.data as any).renderLabel}
                            />
                        </div>

                        {/* Searchable Assignee (@) */}
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Assign to (@)</label>
                            <Select
                                showSearch
                                placeholder="Search team member..."
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                    String(option?.label || "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                value={newChatUserId || undefined}
                                onChange={(val) => setNewChatUserId(val || null)}
                                allowClear
                                className="w-full"
                                options={teamUsers.map((u) => ({
                                    value: u.id,
                                    label: `@${getUserDisplayName(u)}`,
                                }))}
                            />
                        </div>
                    </div>

                    {/* First Message */}
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">First Message (Optional)</label>
                        <Input.TextArea
                            rows={3}
                            placeholder="Type an initial message to send to the contact..."
                            value={newChatInitialMessage}
                            onChange={(e) => setNewChatInitialMessage(e.target.value)}
                            className="rounded-xl resize-none text-sm"
                        />
                    </div>

                    {/* Media Attachment in New Chat */}
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Attach Media (Image, Video, Document)</label>
                        <input
                            type="file"
                            ref={newChatFileInputRef}
                            style={{ display: "none" }}
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={handleSelectNewChatFile}
                        />

                        {newChatAttachment ? (
                            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {newChatAttachment.mediaType === "image" && newChatAttachment.previewUrl ? (
                                        <img
                                            src={newChatAttachment.previewUrl}
                                            alt="Preview"
                                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                        />
                                    ) : newChatAttachment.mediaType === "video" ? (
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">
                                            <VideoCameraOutlined />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
                                            <FileOutlined />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-gray-800 truncate">
                                            {newChatAttachment.file.name}
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            {(newChatAttachment.file.size / 1024 / 1024).toFixed(2)} MB • {newChatAttachment.mediaType.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    icon={<CloseCircleOutlined className="text-gray-400 hover:text-red-500" />}
                                    onClick={() => {
                                        setNewChatAttachment(null);
                                        if (newChatFileInputRef.current) newChatFileInputRef.current.value = "";
                                    }}
                                />
                            </div>
                        ) : (
                            <Button
                                icon={<PaperClipOutlined />}
                                onClick={() => newChatFileInputRef.current?.click()}
                                className="rounded-xl text-xs w-full text-gray-600"
                            >
                                Choose File (Image, Video, Document)
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button onClick={() => setNewChatModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleStartNewChat}
                            loading={creatingChat}
                            style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                            className="rounded-xl shadow-xs font-semibold"
                        >
                            Start Chat
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: MANAGE WHATSAPP CATEGORIES (COMPANY SETTINGS)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal
                title={
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                        <SettingOutlined className="text-[#00a884] text-lg" />
                        Manage WhatsApp Inbox Categories
                    </span>
                }
                open={categoryModalOpen}
                onCancel={() => setCategoryModalOpen(false)}
                footer={null}
                className="rounded-2xl"
                centered
                width={520}
            >
                <div className="space-y-5 pt-2">
                    <p className="text-xs text-gray-500 m-0 leading-relaxed">
                        Create dedicated Outlook color-coded categories for your team inbox (e.g. <strong>SPA Services</strong>, <strong>Front Desk</strong>, <strong>Concierge</strong>, <strong>VIP Guests</strong>, <strong>Complaints</strong>). These are dedicated to WhatsApp and completely separate from room upsell categories.
                    </p>

                    {/* Add Category Section */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                        <div className="text-xs font-bold text-gray-700">Add New Category</div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Category Name</label>
                            <Input
                                placeholder="e.g. Concierge, Valet, VIP Guests"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="rounded-lg text-xs"
                                onPressEnter={handleCreateCategory}
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Outlook Color Theme</label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {OUTLOOK_COLORS.map((col) => {
                                    const isChosen = newCategoryColor.toLowerCase() === col.bar.toLowerCase();
                                    return (
                                        <button
                                            key={col.name}
                                            type="button"
                                            onClick={() => setNewCategoryColor(col.bar)}
                                            style={{ backgroundColor: col.bar }}
                                            title={col.name}
                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                                isChosen ? "ring-2 ring-offset-2 ring-gray-900 scale-110 shadow-xs" : "hover:opacity-85"
                                            }`}
                                        >
                                            {isChosen && <CheckOutlined className="text-white text-[11px]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateCategory}
                            loading={creatingCategory}
                            style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                            className="rounded-lg text-xs font-semibold shadow-xs"
                        >
                            Add Category
                        </Button>
                    </div>

                    {/* Existing Categories List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                            <span>Active Categories</span>
                            <span className="text-gray-400 font-normal">({categories.length})</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white">
                            {categories.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">
                                    No categories yet. Add your first category above.
                                </div>
                            ) : (
                                categories.map((cat) => {
                                    const col = getCategoryOutlookColor(cat);
                                    return (
                                        <div
                                            key={cat.id}
                                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 shadow-xs"
                                                    style={{ backgroundColor: col.swatch }}
                                                />
                                                <span className="text-xs font-semibold text-gray-800 truncate">
                                                    {cat.name}
                                                </span>
                                            </div>

                                            <Popconfirm
                                                title="Delete this category?"
                                                description="Existing conversations with this category will have it cleared."
                                                onConfirm={() => handleDeleteCategory(cat.id)}
                                                okText="Delete"
                                                cancelText="Cancel"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    loading={deletingCategoryId === cat.id}
                                                    className="rounded-lg text-xs"
                                                />
                                            </Popconfirm>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                        <Button
                            type="primary"
                            onClick={() => setCategoryModalOpen(false)}
                            style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                            className="rounded-xl shadow-xs"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WhatsappInbox;
