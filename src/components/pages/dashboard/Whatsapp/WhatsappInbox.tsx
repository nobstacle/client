"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
    TagOutlined,
    MessageOutlined,
    PaperClipOutlined,
    DownOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import { MdWhatsapp } from "react-icons/md";
import { FaAt } from "react-icons/fa";
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

export const getCategoryOutlookColor = (id?: number | null): OutlookColor => {
    if (!id) {
        return { name: "Default", bg: "#F3F4F6", border: "#D1D5DB", text: "#374151", bar: "#9CA3AF", swatch: "#9CA3AF" };
    }
    const index = Math.abs(id) % OUTLOOK_COLORS.length;
    return OUTLOOK_COLORS[index];
};

export interface InboxUser {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
}

export interface InboxCategory {
    id: number;
    name: string;
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

interface WhatsappInboxProps {
    token?: string;
    apiUrl?: string;
    currentUserId?: number;
    metaConnected: boolean;
    onNavigateToTemplates?: () => void;
}

export const WhatsappInbox: React.FC<WhatsappInboxProps> = ({
    token,
    apiUrl,
    currentUserId,
    metaConnected,
    onNavigateToTemplates,
}) => {
    // ── States ──────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [counts, setCounts] = useState({ all: 0, mine: 0, unassigned: 0 });
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

    const [categories, setCategories] = useState<InboxCategory[]>([]);
    const [teamUsers, setTeamUsers] = useState<InboxUser[]>([]);

    // New Chat & Sync States
    const [newChatModalOpen, setNewChatModalOpen] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState("");
    const [newChatName, setNewChatName] = useState("");
    const [newChatCategoryId, setNewChatCategoryId] = useState<number | null>(null);
    const [newChatUserId, setNewChatUserId] = useState<number | null>(null);
    const [newChatInitialMessage, setNewChatInitialMessage] = useState("");
    const [creatingChat, setCreatingChat] = useState(false);
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

    // ── Fetch Categories & Team Users ───────────────────────────────────────
    useEffect(() => {
        if (!token || !apiUrl) return;

        // Fetch company categories
        authFetch<{ data?: any[] } | any[]>("/uploads/get-all-categories")
            .then((res: any) => {
                const rawList = Array.isArray(res) ? res : res?.data || [];
                setCategories(
                    rawList.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                    }))
                );
            })
            .catch(() => {});

        // Fetch company users
        authFetch<any>("/iam/user?take=100")
            .then((res: any) => {
                const rawUsers = Array.isArray(res) ? res : res?.data || res?.users || [];
                setTeamUsers(
                    rawUsers.map((u: any) => ({
                        id: u.id,
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: u.email,
                    }))
                );
            })
            .catch(() => {});
    }, [token, apiUrl, authFetch]);

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
                    setCounts(res.counts);
                }

                // Auto-select first conversation if none selected
                if (!activeConversationId && items.length > 0) {
                    setActiveConversationId(items[0].id);
                }
            } catch (err: any) {
                if (!silent) message.error(err?.message || "Failed to load conversations");
            } finally {
                if (!silent) setLoadingConversations(false);
            }
        },
        [token, apiUrl, scope, statusFilter, selectedCategoryId, searchQuery, activeConversationId, authFetch]
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

    // ── Send Reply ──────────────────────────────────────────────────────────
    const handleSendReply = async () => {
        if (!replyText.trim() || !activeConversationId) return;
        setSendingReply(true);

        try {
            await authFetch(`/whatsapp/inbox/conversations/${activeConversationId}/reply`, {
                method: "POST",
                body: JSON.stringify({ text: replyText.trim() }),
            });

            setReplyText("");
            await loadMessages(activeConversationId, true);
            await loadConversations(true);
            message.success("Reply sent");
        } catch (err: any) {
            message.error(err?.message || "Failed to send reply");
        } finally {
            setSendingReply(false);
        }
    };

    // ── Start New Chat ──────────────────────────────────────────────────────
    const handleStartNewChat = async () => {
        if (!newChatPhone.trim()) {
            message.error("Please enter a phone number");
            return;
        }

        setCreatingChat(true);
        try {
            const newConv: any = await authFetch("/whatsapp/inbox/conversations", {
                method: "POST",
                body: JSON.stringify({
                    contactPhone: newChatPhone.trim(),
                    contactName: newChatName.trim() || undefined,
                    categoryId: newChatCategoryId || undefined,
                    assignedUserId: newChatUserId || undefined,
                    initialMessage: newChatInitialMessage.trim() || undefined,
                }),
            });

            message.success(`Chat started with ${newConv.contactName || newConv.contactPhone}`);
            setNewChatModalOpen(false);
            setNewChatPhone("");
            setNewChatName("");
            setNewChatInitialMessage("");
            setNewChatCategoryId(null);
            setNewChatUserId(null);

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
                prev.map((c) => (c.id === activeConversationId ? { ...c, assignedUser: updated.assignedUser, assignedUserId: userId } : c))
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
                prev.map((c) => (c.id === activeConversationId ? { ...c, category: updated.category, categoryId } : c))
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
            message.success(`Conversation marked as ${newStatus}`);
        } catch (err: any) {
            message.error(err?.message || "Failed to update status");
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
    const activeOutlookColor = getCategoryOutlookColor(activeConversation?.categoryId);
    const activeAssigneeName = getUserDisplayName(activeConversation?.assignedUser);

    // ── Outlook Category Dropdown Menu ──────────────────────────────────────
    const outlookCategoryMenu = (
        <Menu className="p-1 rounded-xl shadow-lg border border-gray-100 min-w-[210px]">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Outlook Categories
            </div>
            {categories.map((cat) => {
                const color = getCategoryOutlookColor(cat.id);
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
            })}
            {activeConversation?.categoryId && (
                <>
                    <Menu.Divider />
                    <Menu.Item
                        key="clear"
                        onClick={() => handleAssignCategory(null)}
                        className="text-red-500 rounded-lg text-xs"
                    >
                        <CloseCircleOutlined className="mr-1.5" /> Clear Category
                    </Menu.Item>
                </>
            )}
        </Menu>
    );

    // ── Assignee (@ Mention) Dropdown Menu ──────────────────────────────────
    const assigneeMenu = (
        <Menu className="p-1 rounded-xl shadow-lg border border-gray-100 min-w-[210px] max-h-72 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Assign with @
            </div>
            {teamUsers.map((u) => {
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
            })}
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

                    {/* 4. Outlook Color-Coded Categories Quick Filter Chips */}
                    {categories.length > 0 && (
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
                                const color = getCategoryOutlookColor(cat.id);
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
                        </div>
                    )}
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
                                <MessageOutlined />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#111b21]">No chats yet</div>
                                <p className="text-xs text-[#8696a0] max-w-xs mx-auto m-0 mt-1 leading-relaxed">
                                    Inbound messages will automatically appear when guests text your WhatsApp number. You can also start a chat or sync existing contacts.
                                </p>
                            </div>

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
                        </div>
                    ) : (
                        conversations.map((c) => {
                            const isSelected = c.id === activeConversationId;
                            const color = getCategoryOutlookColor(c.categoryId);
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
                                        <Tag color="default" className="text-[10px] m-0 px-1.5 py-0">Resolved</Tag>
                                    ) : (
                                        <Tag color="green" className="text-[10px] m-0 px-1.5 py-0">Open</Tag>
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

                            {/* 1. Outlook-Style Categorize Dropdown */}
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

                            {/* 2. @ Assign to User Dropdown */}
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

                            {/* 3. Resolve / Re-open Button */}
                            {activeConversation.status === "open" ? (
                                <Button
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => handleToggleStatus("resolved")}
                                    className="rounded-lg text-xs"
                                >
                                    Resolve
                                </Button>
                            ) : (
                                <Button
                                    size="small"
                                    icon={<SyncOutlined />}
                                    onClick={() => handleToggleStatus("open")}
                                    className="rounded-lg text-xs"
                                >
                                    Re-open
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 2. Chat Bubble Stream (Authentic WhatsApp Desktop Chat Wallpaper & Bubbles) */}
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
                                            <p className="m-0 whitespace-pre-wrap leading-relaxed text-[#111b21]">
                                                {m.content}
                                            </p>

                                            {/* Timestamp + WhatsApp Blue Checks */}
                                            <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] mt-1">
                                                <span>{dayjs(m.createdAt).format("h:mm A")}</span>
                                                {isOutbound && (
                                                    <span className="ml-0.5">
                                                        {m.status === "read" ? (
                                                            <CheckCircleTwoTone twoToneColor="#53bdeb" className="text-xs" />
                                                        ) : m.status === "delivered" ? (
                                                            <CheckOutlined className="text-[#8696a0] text-xs font-bold" />
                                                        ) : (
                                                            <ClockCircleOutlined className="text-[#8696a0] text-xs" />
                                                        )}
                                                    </span>
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

                    {/* 4. WhatsApp Desktop Bottom Input Bar */}
                    <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2.5 z-10">
                        {/* Emoji & Paperclip Tools */}
                        <Tooltip title="Emoji">
                            <Button
                                type="text"
                                shape="circle"
                                icon={<SmileOutlined className="text-xl text-[#54656f]" />}
                            />
                        </Tooltip>
                        <Tooltip title="Attach media">
                            <Button
                                type="text"
                                shape="circle"
                                icon={<PaperClipOutlined className="text-xl text-[#54656f]" />}
                            />
                        </Tooltip>

                        {/* Input Box */}
                        <div className="flex-1 bg-white rounded-lg px-3 py-1.5 shadow-xs flex items-center">
                            <input
                                type="text"
                                placeholder={
                                    isWindowOpen
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
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<SendOutlined className="text-white text-base" />}
                            onClick={handleSendReply}
                            loading={sendingReply}
                            disabled={!replyText.trim()}
                            style={{ backgroundColor: "#00a884", borderColor: "#00a884" }}
                            className="w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-xs"
                        />
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
                MODAL: START NEW WHATSAPP CHAT
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
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Category</label>
                            <Select
                                placeholder="Choose category"
                                value={newChatCategoryId || undefined}
                                onChange={(val) => setNewChatCategoryId(val || null)}
                                allowClear
                                className="w-full"
                            >
                                {categories.map((c) => (
                                    <Select.Option key={c.id} value={c.id}>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: getCategoryOutlookColor(c.id).swatch }} />
                                            <span>{c.name}</span>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Assign to (@)</label>
                            <Select
                                placeholder="Assign to..."
                                value={newChatUserId || undefined}
                                onChange={(val) => setNewChatUserId(val || null)}
                                allowClear
                                className="w-full"
                            >
                                {teamUsers.map((u) => (
                                    <Select.Option key={u.id} value={u.id}>
                                        @{getUserDisplayName(u)}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                    </div>

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
        </div>
    );
};

export default WhatsappInbox;
