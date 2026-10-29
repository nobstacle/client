"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Drawer,
    Empty,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Progress,
    Segmented,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import {
    ApartmentOutlined,
    AppstoreOutlined,
    BulbOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CodeOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    FireOutlined,
    HistoryOutlined,
    LayoutOutlined,
    PlusOutlined,
    ReloadOutlined,
    RocketOutlined,
    SaveOutlined,
    SearchOutlined,
    SettingOutlined,
    SwapOutlined,
    SyncOutlined,
    TeamOutlined,
    ThunderboltOutlined,
    ToolOutlined,
    UserAddOutlined,
    UsergroupAddOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import {
    AiAnalysisResult,
    buildExcelExportPayload,
    buildOrToolsPayloadAndScript,
    calculateCapacity,
    computeSpareList,
    computeStats,
    createDefaultRosterConfig,
    DAY_NAMES,
    dayNameForIso,
    diagnoseUnderstaffedInterval,
    expandRequestsByDay,
    getCellViolations,
    getPartialAbsenceWindowTag,
    parseStarts,
    requestsOverlap,
    RosterConfig,
    runAiAnalysis,
    slotToTimeStr,
    SolvedRosterState,
    solveRoster,
    TeamAbsence,
    TeamMember,
    TeamRequest,
    addDaysIso,
    applyOrToolsAssignmentsToSolveResult,
} from "../../../utils/rosterSolver";

const { Title, Text } = Typography;
const { Option } = Select;

const API_URL = (() => {
    const raw = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
    if (!raw) return undefined;
    const trimmed = raw.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
})();

interface AccountRosterMeta {
    companyId: number;
    companyName: string;
    stationCount: number;
    accountUsersCount: number;
    activeHandoversCount: number;
    upcomingRemindersCount: number;
    allCompanyUsers?: Array<{
        id: number;
        userId?: number;
        name: string;
        email?: string;
        role?: string;
        sk?: boolean;
        ld?: boolean;
    }>;
}

interface SavedRosterRecord {
    id: number;
    name: string;
    solverEngine: string;
    startDate: string;
    weeks: number;
    metrics: Record<string, any>;
    payload: {
        c: RosterConfig;
        E: any[];
        cov: number[];
        cs: number[];
        cl: number[];
        bk: number[];
        need: number[];
        pk: boolean[];
        ml: boolean[];
        bl: number;
        RQ: number;
        W: number;
        D: number;
        QN: number;
        N: number;
        strict: boolean;
        reqH: number;
        availH: number;
        solverEngine?: "heuristic" | "ortools-cpsat" | "ai-fix";
        orToolsMeta?: SolvedRosterState["orToolsMeta"];
    };
    createdAt: string;
}

const HOUR_BLOCKS = [
    { label: "Night (00:00 – 06:00)", start: 0, end: 6, badgeColor: "purple" },
    { label: "Morning (06:00 – 12:00)", start: 6, end: 12, badgeColor: "blue" },
    { label: "Afternoon (12:00 – 18:00)", start: 12, end: 18, badgeColor: "cyan" },
    { label: "Evening (18:00 – 24:00)", start: 18, end: 24, badgeColor: "geekblue" },
];

export default function RosterPage() {
    const { data: session } = useSession();
    const token = (session as any)?.user?.backendTokens?.at;

    // ── Layout & Navigation State ────────────────────────────────────────────
    const [activeMainTab, setActiveMainTab] = useState<string>("rules");
    const [teamSectionTab, setTeamSectionTab] = useState<string>("members");
    const [scheduleSubTab, setScheduleSubTab] = useState<string>("weekly");
    const [selectedWeekTab, setSelectedWeekTab] = useState<string>("all");
    const [viewAllSections, setViewAllSections] = useState<boolean>(false);
    const [showAllKpis, setShowAllKpis] = useState<boolean>(false);
    const [memberSearch, setMemberSearch] = useState<string>("");

    // ── Account & Workspace Loading State ────────────────────────────────────
    const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
    const [syncingAccount, setSyncingAccount] = useState<boolean>(false);
    const [accountMeta, setAccountMeta] = useState<AccountRosterMeta | null>(null);

    // ── 1. Workspace State (Config, Team, Requests, Absences) ────────────────
    const [config, setConfig] = useState<RosterConfig>(() => createDefaultRosterConfig(1, 1));
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [requests, setRequests] = useState<TeamRequest[]>([]);
    const [absences, setAbsences] = useState<TeamAbsence[]>([]);
    const [nextMemberId, setNextMemberId] = useState<number>(1000);

    // Bulk hourly min/max inputs
    const [bulkMinH, setBulkMinH] = useState<number>(1);
    const [bulkMaxH, setBulkMaxH] = useState<number>(5);
    const [activeHourBlock, setActiveHourBlock] = useState<string>("all");

    // New member input
    const [newMemberName, setNewMemberName] = useState<string>("");
    const [newMemberSkilled, setNewMemberSkilled] = useState<boolean>(false);
    const [newMemberLeader, setNewMemberLeader] = useState<boolean>(false);
    const [newMemberTeam, setNewMemberTeam] = useState<string>("Reception");
    const [newMemberRoleTitle, setNewMemberRoleTitle] = useState<string>("");
    const [newMemberEmail, setNewMemberEmail] = useState<string>("");
    const [newMemberActive, setNewMemberActive] = useState<boolean>(true);

    // Teams & Departments Management
    const [availableTeams, setAvailableTeams] = useState<string[]>([
        "Reception",
        "Operator",
        "Concierge",
    ]);
    const [selectedTeam, setSelectedTeam] = useState<string>("all");
    const [memberFilterTeam, setMemberFilterTeam] = useState<string>("all");
    const [importUsersModalVisible, setImportUsersModalVisible] = useState<boolean>(false);
    const [importTargetTeam, setImportTargetTeam] = useState<string>("Reception");
    const [selectedUserIdsToImport, setSelectedUserIdsToImport] = useState<number[]>([]);
    const [manageTeamsModalVisible, setManageTeamsModalVisible] = useState<boolean>(false);
    const [newTeamNameInput, setNewTeamNameInput] = useState<string>("");

    // New request form state
    const [reqMemberId, setReqMemberId] = useState<number | undefined>(undefined);
    const [reqFromDate, setReqFromDate] = useState<string>("");
    const [reqToDate, setReqToDate] = useState<string>("");
    const [reqTypeSlot, setReqTypeSlot] = useState<number>(-1);
    const [reqGranted, setReqGranted] = useState<boolean>(false);

    // New absence form state
    const [absMemberId, setAbsMemberId] = useState<number | undefined>(undefined);
    const [absReason, setAbsReason] = useState<string>("Annual Leave");
    const [absFromDate, setAbsFromDate] = useState<string>("");
    const [absToDate, setAbsToDate] = useState<string>("");
    const [absFromTime, setAbsFromTime] = useState<string>("");
    const [absToTime, setAbsToTime] = useState<string>("");

    // ── 2. Solver, AI Analysis, OR-Tools & Roster Display State ──────────────
    const [solving, setSolving] = useState<boolean>(false);
    const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);
    const [solvingOrTools, setSolvingOrTools] = useState<boolean>(false);
    const [exportingExcel, setExportingExcel] = useState<boolean>(false);
    const [solverStatusText, setSolverStatusText] = useState<string>(
        "Synced with your account. Configure constraints and click 'Solve Roster' or 'OR-Tools (CP-SAT)'.",
    );

    const [solvedState, setSolvedState] = useState<SolvedRosterState | null>(null);
    const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

    // Interactive Click-to-Edit Shift Modal State
    const [editingCell, setEditingCell] = useState<{
        memberIndex: number;
        dayIndex: number;
        memberName: string;
        dateIso: string;
        isOff: boolean;
        startSlot: number;
        hours: number;
    } | null>(null);

    // OR-Tools settings & script
    const [orToolsTimeLimit, setOrToolsTimeLimit] = useState<number>(15);
    const [orToolsWarmStart, setOrToolsWarmStart] = useState<boolean>(true);
    const [pythonScript, setPythonScript] = useState<string>("");

    // ── 3. Saved Roster Records / History Drawer ─────────────────────────────
    const [recordsDrawerOpen, setRecordsDrawerOpen] = useState<boolean>(false);
    const [savedRecords, setSavedRecords] = useState<SavedRosterRecord[]>([]);
    const [saveRecordModalOpen, setSaveRecordModalOpen] = useState<boolean>(false);
    const [recordTitleInput, setRecordTitleInput] = useState<string>("");
    const [savingRecord, setSavingRecord] = useState<boolean>(false);

    const rosterViewRef = useRef<HTMLDivElement | null>(null);
    const hydratedFromBackendRef = useRef<boolean>(false);

    // ── Helper for Backend API calls ─────────────────────────────────────────
    const apiFetch = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
        if (!API_URL || !token) {
            throw new Error("Authentication session not ready");
        }
        const res = await fetch(`${API_URL}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(init.headers || {}),
            },
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody?.message || `Request failed (${res.status})`);
        }
        return res.json();
    };

    // Optimistic cache load on mount so reopening the page renders immediately (0ms)
    useEffect(() => {
        try {
            const cached = localStorage.getItem("nobstacle_roster_cache_v2");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.workspace) {
                    applyWorkspaceResponse(parsed.workspace, parsed.account);
                    if (Array.isArray(parsed.savedRecords)) {
                        setSavedRecords(parsed.savedRecords);
                    }
                    hydratedFromBackendRef.current = true;
                    setLoadingWorkspace(false);
                }
            }
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyWorkspaceResponse = (workspace: any, account?: AccountRosterMeta) => {
        if (account) {
            setAccountMeta(account);
        }
        if (workspace) {
            const stationCount = account?.stationCount || 1;
            const teamList: TeamMember[] = Array.isArray(workspace.team) ? workspace.team : [];
            const baseCfg = createDefaultRosterConfig(stationCount, teamList.length || 1);
            const mergedConfig: RosterConfig = {
                ...baseCfg,
                ...(workspace.config || {}),
            };
            setConfig(mergedConfig);
            setTeam(teamList);
            setRequests(Array.isArray(workspace.requests) ? workspace.requests : []);
            setAbsences(Array.isArray(workspace.absences) ? workspace.absences : []);

            const discoveredTeams = Array.from(
                new Set(
                    teamList
                        .map((m) => m.teamName)
                        .filter(Boolean) as string[],
                ),
            );
            if (discoveredTeams.length > 0) {
                setAvailableTeams((prev) => Array.from(new Set([...prev, ...discoveredTeams])));
            }

            const maxId = teamList.reduce((m: number, item: TeamMember) => Math.max(m, Number(item.id) || 0), 100);
            setNextMemberId(maxId + 1);
            setBulkMinH(mergedConfig.minH?.[0] ?? 1);
            setBulkMaxH(mergedConfig.maxH?.[0] ?? Math.max(1, teamList.length));

            if (teamList.length > 0) {
                setReqMemberId((prev) => prev ?? teamList[0].id);
                setAbsMemberId((prev) => prev ?? teamList[0].id);
            }
            setReqFromDate((prev) => prev || mergedConfig.ws);
            setReqToDate((prev) => prev || mergedConfig.ws);
            setAbsFromDate((prev) => prev || mergedConfig.ws);
            setAbsToDate((prev) => prev || mergedConfig.ws);

            try {
                localStorage.setItem("nobstacle_roster_cache_v2", JSON.stringify({
                    workspace,
                    account,
                }));
            } catch {
                // ignore
            }
        }
    };

    // ── Load Real Account Data & Workspace from Backend ──────────────────────
    useEffect(() => {
        if (!token || !API_URL) return;
        let cancelled = false;

        void (async () => {
            if (!hydratedFromBackendRef.current) {
                setLoadingWorkspace(true);
            }
            try {
                const [wsRes, recRes] = await Promise.all([
                    apiFetch<{ workspace: any; account?: AccountRosterMeta }>("/roster/workspace"),
                    apiFetch<{ items: SavedRosterRecord[] }>("/roster/records"),
                ]);
                if (cancelled) return;
                applyWorkspaceResponse(wsRes.workspace, wsRes.account);
                if (Array.isArray(recRes.items)) {
                    setSavedRecords(recRes.items);
                }
                hydratedFromBackendRef.current = true;
            } catch (err: any) {
                if (!cancelled) {
                    message.error(err?.message || "Failed to load account roster data");
                }
            } finally {
                if (!cancelled) {
                    setLoadingWorkspace(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Auto-save workspace changes to PostgreSQL backend
    useEffect(() => {
        if (!hydratedFromBackendRef.current || !token || !API_URL) return;
        const snapshot = { config, team, requests, absences };
        const timer = setTimeout(() => {
            void apiFetch("/roster/workspace", {
                method: "PUT",
                body: JSON.stringify(snapshot),
            }).catch(() => {});
        }, 900);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, team, requests, absences, token]);

    const handleSyncWithAccountUsers = async () => {
        if (!token || !API_URL) return;
        setSyncingAccount(true);
        try {
            const res = await apiFetch<{ workspace: any; account?: AccountRosterMeta }>(
                "/roster/sync-account",
                { method: "POST", body: JSON.stringify({}) },
            );
            applyWorkspaceResponse(res.workspace, res.account);
            message.success(
                `Synced ${res.account?.accountUsersCount ?? res.workspace?.team?.length ?? 0} user(s) from ${
                    res.account?.companyName || "your company account"
                }.`,
            );
        } catch (err: any) {
            message.error(err?.message || "Failed to sync with company account users");
        } finally {
            setSyncingAccount(false);
        }
    };

    // ── Live Calculations (Capacity & Start Slots) ───────────────────────────
    const parsedStartSlots = useMemo(() => parseStarts(config.starts), [config.starts]);

    // Active team members filtered by selected roster scope (team) and active status
    const activeTeam = useMemo(() => {
        return team.filter((m) => {
            const isActive = m.activeInRoster !== false;
            const matchesTeam =
                selectedTeam === "all" ||
                (m.teamName || "Reception").toLowerCase() === selectedTeam.toLowerCase();
            return isActive && matchesTeam;
        });
    }, [team, selectedTeam]);

    const capacityCalc = useMemo(
        () => calculateCapacity(config, activeTeam, absences),
        [config, activeTeam, absences],
    );
    const spareSuggestions = useMemo(
        () => (solvedState ? computeSpareList(solvedState) : []),
        [solvedState],
    );

    const memberNameById = useMemo(() => {
        const map = new Map<number, string>();
        team.forEach((m) => map.set(m.id, m.name));
        return map;
    }, [team]);

    const filteredTeam = useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        return team
            .map((m, idx) => ({ member: m, idx }))
            .filter(({ member }) => {
                const matchesSearch =
                    !q ||
                    member.name.toLowerCase().includes(q) ||
                    (member.email && member.email.toLowerCase().includes(q)) ||
                    (member.role && member.role.toLowerCase().includes(q)) ||
                    (member.teamName && member.teamName.toLowerCase().includes(q)) ||
                    (member.roleTitle && member.roleTitle.toLowerCase().includes(q));

                const matchesTeamFilter =
                    memberFilterTeam === "all" ||
                    (member.teamName || "Reception").toLowerCase() === memberFilterTeam.toLowerCase();

                return matchesSearch && matchesTeamFilter;
            });
    }, [team, memberSearch, memberFilterTeam]);

    // ── Handlers for Section 1 (Company Requirements & Hourly Min/Max) ───────
    const updateConfigField = <K extends keyof RosterConfig>(key: K, value: RosterConfig[K]) => {
        setConfig((prev) => ({
            ...prev,
            [key]: key === "weeks" ? Math.max(1, Math.min(8, Number(value) || 1)) : value,
        }));
    };

    const updateHourMin = (hour: number, val: number) => {
        const cleanMin = Math.max(0, Math.floor(Number(val) || 0));
        setConfig((prev) => {
            const minH = [...prev.minH];
            const maxH = [...prev.maxH];
            minH[hour] = cleanMin;
            if (maxH[hour] < cleanMin) maxH[hour] = cleanMin;
            return { ...prev, minH, maxH };
        });
    };

    const updateHourMax = (hour: number, val: number) => {
        const cleanMax = Math.max(0, Math.floor(Number(val) || 0));
        setConfig((prev) => {
            const minH = [...prev.minH];
            const maxH = [...prev.maxH];
            maxH[hour] = cleanMax;
            if (maxH[hour] < minH[hour]) minH[hour] = cleanMax;
            return { ...prev, minH, maxH };
        });
    };

    const handleApplyBulkMinMax = () => {
        const minVal = Math.max(0, Math.floor(Number(bulkMinH) || 0));
        const maxVal = Math.max(minVal, Math.floor(Number(bulkMaxH) || 0));
        setConfig((prev) => ({
            ...prev,
            minH: Array(24).fill(minVal),
            maxH: Array(24).fill(maxVal),
        }));
        message.success(`Applied min ${minVal} / max ${maxVal} across all 24 hours.`);
    };

    const handleResetDefaults = () => {
        const def = createDefaultRosterConfig(accountMeta?.stationCount || 1, team.length || 1);
        setConfig(def);
        setBulkMinH(def.minH[0] ?? 1);
        setBulkMaxH(def.maxH[0] ?? Math.max(1, team.length));
        message.info("Reset rules to dynamic defaults for your company.");
    };

    // ── Handlers for Section 2 (Team Members & Teams) ────────────────────────
    const handleAddMember = () => {
        const nameToUse = newMemberName.trim();
        if (!nameToUse) {
            message.warning("Please enter a team member name.");
            return;
        }
        const assignedTeam = newMemberTeam.trim() || "Reception";
        const newMember: TeamMember = {
            id: nextMemberId,
            name: nameToUse,
            teamName: assignedTeam,
            roleTitle: newMemberRoleTitle.trim() || undefined,
            email: newMemberEmail.trim() || undefined,
            sk: newMemberSkilled,
            ld: newMemberLeader,
            role: "Staff",
            activeInRoster: newMemberActive,
        };
        setTeam((prev) => [...prev, newMember]);
        if (!availableTeams.includes(assignedTeam)) {
            setAvailableTeams((prev) => [...prev, assignedTeam]);
        }
        setNextMemberId((prev) => prev + 1);
        setNewMemberName("");
        setNewMemberRoleTitle("");
        setNewMemberEmail("");
        setNewMemberSkilled(false);
        setNewMemberLeader(false);
        setNewMemberActive(true);
        if (!reqMemberId) setReqMemberId(newMember.id);
        if (!absMemberId) setAbsMemberId(newMember.id);
        message.success(`Added ${nameToUse} to ${assignedTeam} team`);
    };

    const handleCreateNewTeam = () => {
        const clean = newTeamNameInput.trim();
        if (!clean) {
            message.warning("Please enter a team name.");
            return;
        }
        if (availableTeams.some((t) => t.toLowerCase() === clean.toLowerCase())) {
            message.warning("This team name already exists.");
            return;
        }
        setAvailableTeams((prev) => [...prev, clean]);
        setNewTeamNameInput("");
        setNewMemberTeam(clean);
        message.success(`Created team "${clean}"`);
    };

    const handleDeleteTeam = (teamNameToDelete: string) => {
        const assignedCount = team.filter((m) => (m.teamName || "Reception") === teamNameToDelete).length;
        if (assignedCount > 0) {
            message.warning(`Cannot delete "${teamNameToDelete}": ${assignedCount} member(s) are assigned to it. Reassign them first.`);
            return;
        }
        setAvailableTeams((prev) => prev.filter((t) => t !== teamNameToDelete));
        if (selectedTeam === teamNameToDelete) setSelectedTeam("all");
        if (memberFilterTeam === teamNameToDelete) setMemberFilterTeam("all");
        message.success(`Removed team "${teamNameToDelete}"`);
    };

    const handleImportCompanyUsers = () => {
        if (!accountMeta?.allCompanyUsers || selectedUserIdsToImport.length === 0) {
            message.warning("Please select at least one company user to import.");
            return;
        }
        const usersToImport = accountMeta.allCompanyUsers.filter((u) =>
            selectedUserIdsToImport.includes(u.id),
        );
        let curId = nextMemberId;
        const newMembers: TeamMember[] = [];

        usersToImport.forEach((u) => {
            const alreadyExists = team.some((m) => m.userId === u.id || m.id === u.id);
            if (!alreadyExists) {
                newMembers.push({
                    id: curId++,
                    userId: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role || "Staff",
                    roleTitle: u.role || "Staff",
                    teamName: importTargetTeam || "Reception",
                    activeInRoster: true,
                    sk: u.sk ?? true,
                    ld: u.ld ?? false,
                });
            }
        });

        if (newMembers.length === 0) {
            message.info("All selected users are already in the roster team.");
        } else {
            setTeam((prev) => [...prev, ...newMembers]);
            setNextMemberId(curId);
            message.success(`Imported ${newMembers.length} users into "${importTargetTeam}" team.`);
        }
        setSelectedUserIdsToImport([]);
        setImportUsersModalVisible(false);
    };

    // ── Handlers for Section 3 (Team Member Requests) ────────────────────────
    const handleAddRequest = () => {
        const mId = reqMemberId ?? team[0]?.id;
        const from = reqFromDate || config.ws;
        const to = reqToDate || from;
        if (!mId || !from) {
            message.warning("Please choose a team member and a From date.");
            return;
        }
        if (to < from) {
            message.warning("The To date must not be before the From date.");
            return;
        }
        const candidate: TeamRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            m: mId,
            from,
            to,
            t: reqTypeSlot,
            g: reqGranted,
        };
        if (
            candidate.g &&
            requests.some((r) => r.g && requestsOverlap(r, candidate) && r.t !== candidate.t)
        ) {
            message.error("This member already has a different granted request overlapping these dates.");
            return;
        }
        setRequests((prev) =>
            [...prev, candidate].sort((a, b) => (a.from < b.from ? -1 : 1)),
        );
        message.success("Team member request added.");
    };

    const handleToggleRequestGranted = (index: number, checked: boolean) => {
        const target = requests[index];
        if (!target) return;
        if (
            checked &&
            requests.some((x, j) => j !== index && x.g && requestsOverlap(x, target) && x.t !== target.t)
        ) {
            message.error("This member already has a different granted request overlapping these dates.");
            return;
        }
        setRequests((prev) => prev.map((r, i) => (i === index ? { ...r, g: checked } : r)));
    };

    // ── Handlers for Section 4 (Absences) ────────────────────────────────────
    const handleAddAbsence = () => {
        const mId = absMemberId ?? team[0]?.id;
        const from = absFromDate || config.ws;
        const to = absToDate || from;
        if (!mId || !from || !to || to < from) {
            message.warning("Please choose a team member and a valid date range.");
            return;
        }
        const newAbs: TeamAbsence = {
            id: `abs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            m: mId,
            r: absReason,
            from,
            to,
            t1: absFromTime,
            t2: absFromTime ? absToTime : "",
        };
        setAbsences((prev) => [...prev, newAbs]);
        message.success("Absence added.");
    };

    // ── Handlers for Manual Shift Override (Click-to-Edit Cell) ──────────────
    const handleSaveManualShiftEdit = () => {
        if (!editingCell || !solvedState) return;
        const { memberIndex, dayIndex, isOff, startSlot, hours } = editingCell;

        const clonedE = solvedState.E.map((emp, idx) => {
            if (idx !== memberIndex) return emp;
            const nextH = [...emp.h];
            const nextS = [...emp.s];
            const nextBo = [...emp.bo];
            if (isOff || hours <= 0) {
                nextH[dayIndex] = 0;
            } else {
                nextH[dayIndex] = hours;
                nextS[dayIndex] = startSlot;
                nextBo[dayIndex] = Math.floor((4 * hours) / 2);
            }
            return {
                ...emp,
                h: nextH,
                s: nextS,
                bo: nextBo,
            };
        });

        const QN = solvedState.QN;
        const cov = new Int32Array(QN);
        const cs = new Int32Array(QN);
        const cl = new Int32Array(QN);
        const bk = new Int32Array(QN);

        clonedE.forEach((e) => {
            for (let g = 0; g < solvedState.D; g++) {
                const hh = e.h[g];
                if (!hh) continue;
                const tot = 4 * hh + solvedState.bl;
                for (let k = 0; k < tot; k++) {
                    const q = (g * 96 + e.s[g] + k) % QN;
                    if (e.pa[q]) continue;
                    if (k >= e.bo[g] && k < e.bo[g] + solvedState.bl) {
                        bk[q]++;
                        continue;
                    }
                    cov[q]++;
                    if (e.m.sk) cs[q]++;
                    if (e.m.ld) cl[q]++;
                }
            }
        });

        const recomputed = computeStats({
            ...solvedState,
            E: clonedE,
            cov,
            cs,
            cl,
            bk,
        });
        setSolvedState(recomputed);
        setEditingCell(null);
        message.success("Shift updated and KPIs recalculated.");
    };

    // ── Handlers for Section 5 & 6 (Solvers, AI Analysis, OR-Tools, Export) ──
    const handleRunHeuristicSolver = () => {
        if (!activeTeam.length) {
            message.warning(
                selectedTeam === "all"
                    ? "No active team members found. Add a member or sync company users first."
                    : `No active members found in "${selectedTeam}" team. Assign members to this team first.`,
            );
            return;
        }
        if (!config.ws) {
            message.warning("Set the roster start date.");
            return;
        }
        setSolving(true);
        setSolverStatusText(
            `Solving roster for ${selectedTeam === "all" ? "All Teams" : selectedTeam + " Team"} (${activeTeam.length} members)...`,
        );
        setAiResult(null);

        setTimeout(() => {
            try {
                const expandedReqs = expandRequestsByDay(requests);
                const result = solveRoster(config, activeTeam, absences, expandedReqs, 150000);
                setSolvedState(result);
                const { pythonScript: script } = buildOrToolsPayloadAndScript(
                    config,
                    activeTeam,
                    absences,
                    requests,
                    result,
                );
                setPythonScript(script);
                setActiveMainTab("schedule");
                setSolverStatusText(
                    `Roster generated for ${selectedTeam === "all" ? "All Teams" : selectedTeam + " Team"} — Coverage Score: ${Math.round(result.met.score * 1000) / 10}%, Hard Violations: ${Math.round(result.met.hard * 100) / 100}.`,
                );
                message.success(`Roster generated for ${selectedTeam === "all" ? "All Teams" : selectedTeam + " Team"}! Switched to Schedule view.`);
            } catch (err: any) {
                message.error(err?.message || "Solver failed");
            } finally {
                setSolving(false);
            }
        }, 40);
    };

    const handleRunAiAnalysis = () => {
        if (!solvedState) {
            message.warning("Run the constraint solver first.");
            return;
        }
        setAnalyzingAi(true);
        setSolverStatusText("AI analysis running... simulating candidate fixes with the solver...");

        setTimeout(() => {
            try {
                const analysis = runAiAnalysis(solvedState, activeTeam, absences, requests);
                setAiResult(analysis);
                setActiveMainTab("optimizer");
                setSolverStatusText(
                    "AI analysis complete. Review the scenario comparison or click 'Apply Best Fix & Re-solve'.",
                );
                message.success("AI What-If analysis complete!");
            } catch (err: any) {
                message.error(err?.message || "AI analysis failed");
            } finally {
                setAnalyzingAi(false);
            }
        }, 50);
    };

    const handleApplyBestAiFix = () => {
        if (!aiResult?.recommended) return;
        const best = aiResult.recommended;
        const updatedConfig: RosterConfig = {
            ...config,
            minH: best.p.minH ? config.minH.map((v) => Math.max(0, v + best.p.minH!)) : [...config.minH],
            maxH: best.p.maxS ? config.maxH.map((v) => v + best.p.maxS!) : [...config.maxH],
        };
        const updatedTeam = [...team];
        let nextId = nextMemberId;
        for (let k = 0; k < (best.p.x || 0); k++) {
            updatedTeam.push({
                id: nextId++,
                name: `Additional Staff ${k + 1}`,
                sk: false,
                ld: false,
                role: "Staff",
                teamName: selectedTeam === "all" ? "Reception" : selectedTeam,
                activeInRoster: true,
            });
        }

        setConfig(updatedConfig);
        setTeam(updatedTeam);
        setNextMemberId(nextId);
        setSolving(true);
        setSolverStatusText(
            best.l.startsWith("Base")
                ? "Baseline is already optimal — re-running solver..."
                : `Applying "${best.l}" and re-solving...`,
        );

        setTimeout(() => {
            try {
                const targetMembers = updatedTeam.filter(
                    (m) => m.activeInRoster !== false && (selectedTeam === "all" || m.teamName === selectedTeam),
                );
                const result = solveRoster(
                    updatedConfig,
                    targetMembers,
                    absences,
                    expandRequestsByDay(requests),
                    150000,
                );
                result.solverEngine = "ai-fix";
                setSolvedState(result);
                setAiResult(null);
                setActiveMainTab("schedule");
                setSolverStatusText(
                    result.met.hard
                        ? "Re-solved after applying fix, but some hard violations remain."
                        : "Re-solved: all company constraints satisfied!",
                );
                message.success(`Applied "${best.l}" and re-solved roster!`);
            } finally {
                setSolving(false);
            }
        }, 40);
    };

    const handleGenerateOrToolsScript = () => {
        const { pythonScript: script } = buildOrToolsPayloadAndScript(
            config,
            activeTeam,
            absences,
            requests,
            solvedState,
        );
        setPythonScript(script);
        message.success("Generated Google OR-Tools (CP-SAT) Python script.");
    };

    const handleRunLiveOrToolsSolver = async () => {
        if (!activeTeam.length) {
            message.warning(
                selectedTeam === "all"
                    ? "Add team members or sync with your company account first."
                    : `No active members found in "${selectedTeam}" team.`,
            );
            return;
        }
        setSolvingOrTools(true);
        setSolverStatusText(
            `Running Google OR-Tools (CP-SAT) solver for ${selectedTeam === "all" ? "All Teams" : selectedTeam + " Team"} (time limit: ${orToolsTimeLimit}s, 8 workers)...`,
        );

        try {
            const baseSolved =
                solvedState && solvedState.W === config.weeks && solvedState.E.length === activeTeam.length
                    ? solvedState
                    : solveRoster(config, activeTeam, absences, expandRequestsByDay(requests), 40000);

            const { modelData, pythonScript: script } = buildOrToolsPayloadAndScript(
                config,
                activeTeam,
                absences,
                requests,
                orToolsWarmStart ? baseSolved : null,
            );
            setPythonScript(script);

            const response = await apiFetch<{
                status: string;
                feasible: boolean;
                objectiveValue?: number;
                bestObjectiveBound?: number;
                slackViolations?: number;
                solveTimeMs?: number;
                assignments: Array<{
                    memberIndex: number;
                    dayIndex: number;
                    startSlot: number;
                    durationQuarters: number;
                    hours: number;
                }>;
            }>("/roster/solve-ortools", {
                method: "POST",
                body: JSON.stringify({
                    modelData,
                    timeLimitSeconds: orToolsTimeLimit,
                    useHint: orToolsWarmStart,
                }),
            });

            if (!response.feasible || !response.assignments?.length) {
                message.warning(
                    `OR-Tools returned status: ${response.status}. Keeping heuristic solution.`,
                );
                setSolverStatusText(
                    `Google OR-Tools finished with status ${response.status} (${response.solveTimeMs || 0}ms).`,
                );
                return;
            }

            const updatedState = applyOrToolsAssignmentsToSolveResult(baseSolved, response.assignments, {
                status: response.status,
                objectiveValue: response.objectiveValue,
                bestObjectiveBound: response.bestObjectiveBound,
                slackViolations: response.slackViolations,
                solveTimeMs: response.solveTimeMs,
            });

            setSolvedState(updatedState);
            setActiveMainTab("schedule");
            setSolverStatusText(
                `Google OR-Tools (CP-SAT) solved [${response.status}] in ${response.solveTimeMs}ms — Coverage Score: ${Math.round(updatedState.met.score * 1000) / 10}%, Hard Violations: ${Math.round(updatedState.met.hard * 100) / 100}.`,
            );
            message.success(`Google OR-Tools (${response.status}) schedule applied!`);
        } catch (err: any) {
            message.error(err?.message || "Failed to execute Google OR-Tools solver on backend");
        } finally {
            setSolvingOrTools(false);
        }
    };

    const handleSaveRosterRecord = async () => {
        if (!solvedState || !token || !API_URL) return;
        setSavingRecord(true);
        const defaultName = `${accountMeta?.companyName || "Company"} Roster ${config.ws} (${config.weeks}w · ${
            solvedState.solverEngine === "ortools-cpsat" ? "OR-Tools CP-SAT" : "Constraint Solver"
        })`;
        const nameToSave = recordTitleInput.trim() || defaultName;

        const serializablePayload = {
            ...solvedState,
            cov: Array.from(solvedState.cov),
            cs: Array.from(solvedState.cs),
            cl: Array.from(solvedState.cl),
            bk: Array.from(solvedState.bk),
        };

        try {
            const saved = await apiFetch<SavedRosterRecord>("/roster/records", {
                method: "POST",
                body: JSON.stringify({
                    name: nameToSave,
                    solverEngine: solvedState.solverEngine || "heuristic",
                    startDate: config.ws,
                    weeks: config.weeks,
                    metrics: solvedState.met,
                    payload: serializablePayload,
                }),
            });
            setSavedRecords((prev) => [saved, ...prev]);
            message.success(`Saved roster record "${nameToSave}"!`);
            setSaveRecordModalOpen(false);
            setRecordTitleInput("");
        } catch (err: any) {
            message.error(err?.message || "Failed to save roster record");
        } finally {
            setSavingRecord(false);
        }
    };

    const handleLoadSavedRecord = (rec: SavedRosterRecord) => {
        if (!rec?.payload) return;
        const p = rec.payload;
        setConfig(p.c);
        if (Array.isArray(p.E)) {
            setTeam(p.E.map((e: any) => e.m));
        }
        const restored = computeStats({
            ...p,
            cov: Int32Array.from(p.cov || []),
            cs: Int32Array.from(p.cs || []),
            cl: Int32Array.from(p.cl || []),
            bk: Int32Array.from(p.bk || []),
        });
        setSolvedState(restored);
        setActiveMainTab("schedule");
        setRecordsDrawerOpen(false);
        message.success(`Loaded saved roster "${rec.name}"`);
    };

    const handleDeleteSavedRecord = async (id: number) => {
        if (!token || !API_URL) return;
        await apiFetch(`/roster/records/${id}`, { method: "DELETE" });
        setSavedRecords((prev) => prev.filter((r) => r.id !== id));
        message.success("Deleted roster record.");
    };

    const handleExportExcel = async () => {
        if (!solvedState) return;
        setExportingExcel(true);
        try {
            const excelPayload = buildExcelExportPayload(solvedState);
            if (token && API_URL) {
                const res = await fetch(`${API_URL}/roster/export-excel`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(excelPayload),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `roster-${config.ws}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    message.success(`Exported roster-${config.ws}.xlsx`);
                    return;
                }
            }
            const csvLines = excelPayload.weekSheets.flatMap((wk) => [
                `--- ${wk.name} ---`,
                ...wk.rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
                "",
            ]);
            const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `roster-${config.ws}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            message.success(`Exported roster-${config.ws}.csv`);
        } catch (err: any) {
            message.error(err?.message || "Failed to export roster");
        } finally {
            setExportingExcel(false);
        }
    };

    // ── Precomputed On-Site Staff Names & Understaffed Intervals for Roster View ─
    const rosterCoverageDetails = useMemo(() => {
        if (!solvedState) return null;
        const S = solvedState;
        const onSiteNames: string[][] = Array.from({ length: S.QN }, () => []);
        S.E.forEach((e) => {
            for (let g = 0; g < S.D; g++) {
                const hh = e.h[g];
                if (!hh) continue;
                for (let k = 0; k < 4 * hh + S.bl; k++) {
                    const q = (g * 96 + e.s[g] + k) % S.QN;
                    if (e.pa[q] || (k >= e.bo[g] && k < e.bo[g] + S.bl)) continue;
                    onSiteNames[q].push(e.m.name);
                }
            }
        });

        const intervals: Array<{ s: number; e: number; q: number; n: number; reasons: string[] }> = [];
        let cur: { s: number; e: number; q: number; n: number } | null = null;
        for (let k = 0; k < S.QN; k++) {
            const nd = S.need[k % 96];
            const q = S.cov[k];
            if (q < nd) {
                if (cur && cur.e === k && cur.q === q && cur.n === nd) {
                    cur.e = k + 1;
                } else {
                    cur = { s: k, e: k + 1, q, n: nd };
                    intervals.push({ ...cur, reasons: [] });
                }
            }
        }
        return {
            onSiteNames,
            intervals: intervals.map((iv, idx) => ({
                ...iv,
                reasons: idx < 12 ? diagnoseUnderstaffedInterval(S, iv) : [],
            })),
        };
    }, [solvedState]);

    // ── Section Renderers (Modular & Spacious) ───────────────────────────────

    const renderCompanyRulesSection = () => {
        const peakStart = config.pkW?.[0]?.a || "";
        const peakEnd = config.pkW?.[0]?.b || "";
        const offPeakStart = config.opW?.[0]?.a || "";
        const offPeakEnd = config.opW?.[0]?.b || "";

        return (
            <div className="space-y-6 pb-8">
                {/* Sub-card 1A: Shift, Hours & Rest Rules */}
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <SettingOutlined className="text-lg" />
                                </div>
                                <div>
                                    <div className="text-base font-semibold text-slate-800">
                                        {accountMeta?.companyName
                                            ? `${accountMeta.companyName} — Shift & Working Hour Rules`
                                            : "Company Shift & Working Hour Rules"}
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                        Dynamic company rules saved to your account workspace (Stations: {accountMeta?.stationCount ?? 1})
                                    </div>
                                </div>
                            </div>
                            <Space size="middle" wrap>
                                <Tag color="green" className="m-0 rounded-full px-3 py-0.5 text-xs">
                                    Synced with Account DB
                                </Tag>
                                <Button icon={<ReloadOutlined />} onClick={handleResetDefaults}>
                                    Reset to Account Defaults
                                </Button>
                            </Space>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Group 1: Horizon & Weekly Target */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <CalendarOutlined className="text-blue-600" />
                                <span>Schedule Horizon & Target</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Roster Start Date (Monday)
                                    </label>
                                    <Input
                                        size="large"
                                        type="date"
                                        value={config.ws}
                                        onChange={(e) => updateConfigField("ws", e.target.value)}
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                            Roster Length (Weeks)
                                        </label>
                                        <InputNumber
                                            size="large"
                                            min={1}
                                            max={8}
                                            value={config.weeks}
                                            onChange={(v) => updateConfigField("weeks", Number(v) || 1)}
                                            className="w-full rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                            Target Hours / Week
                                        </label>
                                        <InputNumber
                                            size="large"
                                            min={1}
                                            max={168}
                                            value={config.T}
                                            onChange={(v) => updateConfigField("T", Number(v) || 40)}
                                            className="w-full rounded-lg"
                                            addonAfter="h"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 pt-1">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Unpaid Break
                                        </label>
                                        <InputNumber
                                            size="middle"
                                            min={0}
                                            max={120}
                                            step={15}
                                            value={config.brk || 0}
                                            onChange={(v) => updateConfigField("brk", Number(v) || 0)}
                                            className="w-full"
                                            addonAfter="m"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Peak Start
                                        </label>
                                        <Input
                                            size="middle"
                                            type="time"
                                            value={peakStart}
                                            onChange={(e) => {
                                                const a = e.target.value;
                                                const b = peakEnd || "14:00";
                                                updateConfigField("pkW", a ? [{ a, b }] : []);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Peak End
                                        </label>
                                        <Input
                                            size="middle"
                                            type="time"
                                            value={peakEnd}
                                            onChange={(e) => {
                                                const b = e.target.value;
                                                const a = peakStart || "11:00";
                                                updateConfigField("pkW", b ? [{ a, b }] : []);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group 2: Daily Hours & Off Days */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <ClockCircleOutlined className="text-indigo-600" />
                                <span>Daily Duty & Weekly Off-Day Limits</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Min Hours / Day
                                    </label>
                                    <InputNumber
                                        size="large"
                                        min={1}
                                        max={24}
                                        step={0.5}
                                        value={config.minD}
                                        onChange={(v) => updateConfigField("minD", Number(v) || 4)}
                                        className="w-full rounded-lg"
                                        addonAfter="h"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Max Hours / Day
                                    </label>
                                    <InputNumber
                                        size="large"
                                        min={1}
                                        max={24}
                                        step={0.5}
                                        value={config.maxD}
                                        onChange={(v) => updateConfigField("maxD", Number(v) || 10)}
                                        className="w-full rounded-lg"
                                        addonAfter="h"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Min Off Days / Week
                                    </label>
                                    <InputNumber
                                        size="large"
                                        min={0}
                                        max={7}
                                        value={config.minOff}
                                        onChange={(v) => updateConfigField("minOff", Number(v) ?? 1)}
                                        className="w-full rounded-lg"
                                        addonAfter="d"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Max Off Days / Week
                                    </label>
                                    <InputNumber
                                        size="large"
                                        min={0}
                                        max={7}
                                        value={config.maxOff}
                                        onChange={(v) => updateConfigField("maxOff", Number(v) ?? 2)}
                                        className="w-full rounded-lg"
                                        addonAfter="d"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Group 3: Rest, Start Times & Skill Spread */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <SwapOutlined className="text-teal-600" />
                                <span>Shift Starts, Rest & Skill Rules</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Allowed Duty Start Times (comma-separated HH:MM)
                                    </label>
                                    <Input
                                        size="large"
                                        value={config.starts}
                                        onChange={(e) => updateConfigField("starts", e.target.value)}
                                        placeholder="06:00, 14:00, 22:00"
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Min Rest
                                        </label>
                                        <InputNumber
                                            size="middle"
                                            min={0}
                                            max={48}
                                            value={config.rest}
                                            onChange={(v) => updateConfigField("rest", Number(v) ?? 12)}
                                            className="w-full"
                                            addonAfter="h"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            24/7 Skilled
                                        </label>
                                        <Select
                                            size="middle"
                                            value={config.spSk}
                                            onChange={(v) => updateConfigField("spSk", v)}
                                            className="w-full"
                                        >
                                            <Option value="No">No</Option>
                                            <Option value="Yes">Yes</Option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            24/7 Leaders
                                        </label>
                                        <Select
                                            size="middle"
                                            value={config.spLd}
                                            onChange={(v) => updateConfigField("spLd", v)}
                                            className="w-full"
                                        >
                                            <Option value="No">No</Option>
                                            <Option value="Yes">Yes</Option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Same Start/Wk
                                        </label>
                                        <Select
                                            size="middle"
                                            value={config.cons}
                                            onChange={(v) => updateConfigField("cons", v)}
                                            className="w-full"
                                        >
                                            <Option value="Yes">Yes</Option>
                                            <Option value="No">No</Option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Off-Peak Start (opt)
                                        </label>
                                        <Input
                                            size="middle"
                                            type="time"
                                            value={offPeakStart}
                                            onChange={(e) => {
                                                const a = e.target.value;
                                                const b = offPeakEnd || "08:00";
                                                updateConfigField("opW", a ? [{ a, b }] : []);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Off-Peak End (opt)
                                        </label>
                                        <Input
                                            size="middle"
                                            type="time"
                                            value={offPeakEnd}
                                            onChange={(e) => {
                                                const b = e.target.value;
                                                const a = offPeakStart || "04:00";
                                                updateConfigField("opW", b ? [{ a, b }] : []);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Sub-card 1B: 24-Hour Staffing Requirements */}
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-col justify-between gap-4 py-1 lg:flex-row lg:items-center">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    Hourly On-Site Staffing Targets (00:00 – 24:00)
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Define the minimum required and maximum allowed staff on site for each hour of the day
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                                <span className="text-xs font-medium text-slate-600">Quick Bulk Set:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Min</span>
                                    <InputNumber
                                        size="small"
                                        min={0}
                                        value={bulkMinH}
                                        onChange={(v) => setBulkMinH(Number(v) || 0)}
                                        style={{ width: 64 }}
                                    />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Max</span>
                                    <InputNumber
                                        size="small"
                                        min={0}
                                        value={bulkMaxH}
                                        onChange={(v) => setBulkMaxH(Number(v) || 0)}
                                        style={{ width: 64 }}
                                    />
                                </div>
                                <Button
                                    size="small"
                                    type="primary"
                                    onClick={handleApplyBulkMinMax}
                                    style={{ background: "#2f5bea" }}
                                >
                                    Apply to All 24h
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Segmented
                            value={activeHourBlock}
                            onChange={(v) => setActiveHourBlock(String(v))}
                            options={[
                                { label: "All 24 Hours", value: "all" },
                                { label: "Night (00–06)", value: "0" },
                                { label: "Morning (06–12)", value: "1" },
                                { label: "Afternoon (12–18)", value: "2" },
                                { label: "Evening (18–24)", value: "3" },
                            ]}
                        />
                        <div className="text-xs text-slate-500">
                            Daily Minimum Staffing Sum:{" "}
                            <strong className="text-slate-800">
                                {config.minH.reduce((a, b) => a + b, 0)} person-hours / day
                            </strong>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {HOUR_BLOCKS.map((block, bIdx) => {
                            if (activeHourBlock !== "all" && activeHourBlock !== String(bIdx)) return null;
                            return (
                                <div
                                    key={block.label}
                                    className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <Tag
                                            color={block.badgeColor}
                                            className="rounded-md px-2.5 py-0.5 text-xs font-semibold"
                                        >
                                            {block.label}
                                        </Tag>
                                        <span className="text-xs text-slate-400">
                                            Subtotal:{" "}
                                            {config.minH
                                                .slice(block.start, block.end)
                                                .reduce((a, b) => a + b, 0)}{" "}
                                            min hrs
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                                        {Array.from({ length: block.end - block.start }, (_, idx) => {
                                            const h = block.start + idx;
                                            const minVal = config.minH[h] ?? 1;
                                            const maxVal = config.maxH[h] ?? Math.max(1, team.length);
                                            return (
                                                <div
                                                    key={h}
                                                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:border-blue-300"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {String(h).padStart(2, "0")}:00 –{" "}
                                                            {String((h + 1) % 24).padStart(2, "0")}:00
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="mb-1 block text-[11px] font-medium text-slate-500">
                                                                Min
                                                            </span>
                                                            <InputNumber
                                                                size="middle"
                                                                min={0}
                                                                value={minVal}
                                                                onChange={(v) =>
                                                                    updateHourMin(h, Number(v) || 0)
                                                                }
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="mb-1 block text-[11px] font-medium text-slate-500">
                                                                Max
                                                            </span>
                                                            <InputNumber
                                                                size="middle"
                                                                min={0}
                                                                value={maxVal}
                                                                onChange={(v) =>
                                                                    updateHourMax(h, Number(v) || 0)
                                                                }
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Sub-card 1C: Live Capacity & Feasibility Check */}
                <Card
                    className="mb-8 rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    Live Capacity & Feasibility Check
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Compares minimum required work hours against available team work hours (after full-day absences)
                                </div>
                            </div>
                            <Tag
                                color={capacityCalc.totalBalance >= 0 ? "success" : "error"}
                                className="m-0 rounded-full px-3.5 py-1 text-sm font-semibold"
                            >
                                Net Balance:{" "}
                                {capacityCalc.totalBalance >= 0
                                    ? `+${capacityCalc.totalBalance}h Surplus`
                                    : `${capacityCalc.totalBalance}h Shortfall`}
                            </Tag>
                        </div>
                    }
                >
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <th className="px-4 py-3 font-semibold">Period</th>
                                    <th className="px-4 py-3 font-semibold">Min Required Hours</th>
                                    <th className="px-4 py-3 font-semibold">Available Team Hours</th>
                                    <th className="px-4 py-3 font-semibold">Net Balance</th>
                                    <th className="px-4 py-3 font-semibold">Utilization</th>
                                </tr>
                            </thead>
                            <tbody>
                                {capacityCalc.rows.map((r) => (
                                    <tr key={r.week} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-800">Week {r.week}</td>
                                        <td className="px-4 py-3 text-slate-700">{r.requiredHours}h</td>
                                        <td className="px-4 py-3 text-slate-700">{r.availableHours}h</td>
                                        <td className="px-4 py-3 font-semibold">
                                            <span
                                                className={
                                                    r.balance >= 0 ? "text-emerald-600" : "text-red-600"
                                                }
                                            >
                                                {r.balance >= 0 ? `+${r.balance}h` : `${r.balance}h`}
                                            </span>
                                        </td>
                                        <td className="w-56 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Progress
                                                    percent={Math.min(100, r.utilizationPct)}
                                                    size="small"
                                                    status={r.utilizationPct > 100 ? "exception" : "active"}
                                                    strokeColor={
                                                        r.utilizationPct > 95
                                                            ? "#dc2626"
                                                            : r.utilizationPct > 85
                                                              ? "#d97706"
                                                              : "#10b981"
                                                    }
                                                    showInfo={false}
                                                    className="m-0 flex-1"
                                                />
                                                <span
                                                    className={`text-xs font-semibold ${
                                                        r.availableHours >= r.requiredHours
                                                            ? "text-slate-700"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    {r.utilizationPct}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {capacityCalc.messages.map((m, i) => (
                            <Alert
                                key={i}
                                type={m.type === "bad" ? "error" : m.type === "ok" ? "success" : "info"}
                                showIcon
                                message={<span className="text-xs sm:text-sm">{m.text}</span>}
                                className="rounded-xl"
                            />
                        ))}
                    </div>
                </Card>
            </div>
        );
    };

    const renderTeamAndAvailabilitySection = () => (
        <div className="space-y-6 pb-8">
            {/* Segmented Switcher for Team vs Teams/Departments vs Requests vs Absences */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
                <Segmented
                    size="large"
                    value={teamSectionTab}
                    onChange={(v) => setTeamSectionTab(String(v))}
                    options={[
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-0.5">
                                    <TeamOutlined />
                                    <span>Team Members</span>
                                    <Badge count={team.length} color="#2f5bea" showZero />
                                </div>
                            ),
                            value: "members",
                        },
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-0.5">
                                    <ApartmentOutlined />
                                    <span>Teams & Departments</span>
                                    <Badge count={availableTeams.length} color="#7c3aed" showZero />
                                </div>
                            ),
                            value: "teams",
                        },
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-0.5">
                                    <CalendarOutlined />
                                    <span>Shift & Off Requests</span>
                                    <Badge count={requests.length} color="#6366f1" showZero />
                                </div>
                            ),
                            value: "requests",
                        },
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-0.5">
                                    <ClockCircleOutlined />
                                    <span>Absences & Leave</span>
                                    <Badge count={absences.length} color="#0d9488" showZero />
                                </div>
                            ),
                            value: "absences",
                        },
                    ]}
                />

                <Space wrap>
                    <Button
                        icon={<UsergroupAddOutlined />}
                        onClick={() => setImportUsersModalVisible(true)}
                    >
                        Import Users from Company ({accountMeta?.allCompanyUsers?.length || accountMeta?.accountUsersCount || 0})
                    </Button>
                    <Button
                        icon={<SyncOutlined spin={syncingAccount} />}
                        loading={syncingAccount}
                        onClick={handleSyncWithAccountUsers}
                    >
                        Sync Account
                    </Button>
                </Space>
            </div>

            {/* Sub-view A: Team Members */}
            {(teamSectionTab === "members" || viewAllSections) && (
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    {accountMeta?.companyName
                                        ? `${accountMeta.companyName} Team (${team.length} Members)`
                                        : `Team Roster (${team.length} Members)`}
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Create team members, assign teams (e.g. Reception, Operator, Concierge), and toggle Active status.
                                </div>
                            </div>
                            <Input
                                prefix={<SearchOutlined className="text-slate-400" />}
                                placeholder="Search by name, email, team, or role..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                allowClear
                                className="w-full sm:w-72"
                            />
                        </div>
                    }
                >
                    {/* Filter by Team Tags Bar */}
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                            Filter by Team:
                        </span>
                        <Tag.CheckableTag
                            checked={memberFilterTeam === "all"}
                            onChange={() => setMemberFilterTeam("all")}
                            className="rounded-full px-3 py-0.5 text-xs font-medium cursor-pointer"
                        >
                            All Teams ({team.length})
                        </Tag.CheckableTag>
                        {availableTeams.map((tName) => {
                            const count = team.filter((m) => (m.teamName || "Reception") === tName).length;
                            return (
                                <Tag.CheckableTag
                                    key={tName}
                                    checked={memberFilterTeam === tName}
                                    onChange={() => setMemberFilterTeam(tName)}
                                    className="rounded-full px-3 py-0.5 text-xs font-medium cursor-pointer"
                                >
                                    {tName} ({count})
                                </Tag.CheckableTag>
                            );
                        })}
                        <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => setManageTeamsModalVisible(true)}
                            className="rounded-full text-xs ml-auto"
                        >
                            Manage Teams
                        </Button>
                    </div>

                    {/* Rich Add Member Bar */}
                    <div className="mb-6 flex flex-col gap-3.5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Input
                                size="large"
                                placeholder="Staff member full name..."
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                onPressEnter={() => handleAddMember()}
                                className="flex-1 rounded-xl"
                            />
                            <Select
                                size="large"
                                value={newMemberTeam}
                                onChange={(val) => setNewMemberTeam(val)}
                                className="w-full sm:w-52"
                                placeholder="Assign Team"
                            >
                                {availableTeams.map((t) => (
                                    <Option key={t} value={t}>
                                        {t} Team
                                    </Option>
                                ))}
                            </Select>
                            <Input
                                size="large"
                                placeholder="Role / Title (e.g. Receptionist)"
                                value={newMemberRoleTitle}
                                onChange={(e) => setNewMemberRoleTitle(e.target.value)}
                                className="w-full sm:w-56 rounded-xl"
                            />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100/70 pt-2">
                            <div className="flex flex-wrap items-center gap-5">
                                <Checkbox
                                    checked={newMemberSkilled}
                                    onChange={(e) => setNewMemberSkilled(e.target.checked)}
                                >
                                    <span className="text-sm font-medium text-slate-700">Skilled</span>
                                </Checkbox>
                                <Checkbox
                                    checked={newMemberLeader}
                                    onChange={(e) => setNewMemberLeader(e.target.checked)}
                                >
                                    <span className="text-sm font-medium text-slate-700">Team Leader</span>
                                </Checkbox>
                                <Checkbox
                                    checked={newMemberActive}
                                    onChange={(e) => setNewMemberActive(e.target.checked)}
                                >
                                    <span className="text-sm font-medium text-slate-700">Active in Roster</span>
                                </Checkbox>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                icon={<UserAddOutlined />}
                                onClick={() => handleAddMember()}
                                className="rounded-xl px-6"
                                style={{ background: "#2f5bea" }}
                            >
                                Create Team Member
                            </Button>
                        </div>
                    </div>

                    {filteredTeam.length === 0 ? (
                        <Empty description="No team members match the current filter. Add a member above or import company users." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredTeam.map(({ member: m, idx }) => (
                                <div
                                    key={m.id}
                                    className={`flex flex-col justify-between gap-3 rounded-xl border p-4 shadow-2xs transition ${
                                        m.activeInRoster === false
                                            ? "border-slate-200 bg-slate-50/70 opacity-70"
                                            : "border-slate-200 bg-white hover:border-blue-300"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                                    m.activeInRoster === false
                                                        ? "bg-slate-200 text-slate-600"
                                                        : "bg-blue-50 text-blue-700"
                                                }`}
                                            >
                                                #{idx + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <Input
                                                    value={m.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTeam((prev) =>
                                                            prev.map((item, i) =>
                                                                i === idx ? { ...item, name: val } : item,
                                                            ),
                                                        );
                                                    }}
                                                    className="font-semibold"
                                                />
                                                <div className="mt-1 flex items-center gap-2 truncate text-xs text-slate-500">
                                                    {m.roleTitle && <span className="font-medium text-slate-600">{m.roleTitle}</span>}
                                                    {m.email && <span className="truncate">{m.email}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <Popconfirm
                                            title="Remove from roster?"
                                            description="This member will be removed from the roster team. Any user account in the company is unaffected."
                                            onConfirm={() =>
                                                setTeam((prev) => prev.filter((_, i) => i !== idx))
                                            }
                                            okText="Remove"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                title="Remove from roster"
                                            />
                                        </Popconfirm>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                        {/* Team Assignment Select */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-slate-500">Team:</span>
                                            <Select
                                                size="small"
                                                value={m.teamName || "Reception"}
                                                onChange={(val) => {
                                                    setTeam((prev) =>
                                                        prev.map((item, i) =>
                                                            i === idx ? { ...item, teamName: val } : item,
                                                        ),
                                                    );
                                                }}
                                                style={{ width: 125 }}
                                                className="text-xs"
                                            >
                                                {availableTeams.map((t) => (
                                                    <Option key={t} value={t}>
                                                        {t}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>

                                        {/* Active in Roster Switch */}
                                        <div className="flex items-center gap-2">
                                            <Tooltip
                                                title={
                                                    m.activeInRoster !== false
                                                        ? "Active in roster (included in solver)"
                                                        : "Excluded from roster (not scheduled)"
                                                }
                                            >
                                                <Switch
                                                    size="small"
                                                    checked={m.activeInRoster !== false}
                                                    onChange={(checked) => {
                                                        setTeam((prev) =>
                                                            prev.map((item, i) =>
                                                                i === idx
                                                                    ? { ...item, activeInRoster: checked }
                                                                    : item,
                                                            ),
                                                        );
                                                    }}
                                                    checkedChildren="Active"
                                                    unCheckedChildren="Off"
                                                />
                                            </Tooltip>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-2">
                                        <div className="flex items-center gap-1.5">
                                            {m.userId ? (
                                                <Tag color="geekblue" className="m-0 rounded text-[11px]">
                                                    Account {m.role || "User"}
                                                </Tag>
                                            ) : (
                                                <Tag className="m-0 rounded text-[11px]">Roster Staff</Tag>
                                            )}
                                            {m.activeInRoster === false && (
                                                <Tag color="default" className="m-0 rounded text-[11px]">
                                                    Excluded
                                                </Tag>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Tooltip title="Toggle Skilled status">
                                                <Tag
                                                    color={m.sk ? "blue" : "default"}
                                                    className="m-0 cursor-pointer select-none rounded-lg px-2.5 py-0.5 text-xs font-medium"
                                                    onClick={() =>
                                                        setTeam((prev) =>
                                                            prev.map((item, i) =>
                                                                i === idx ? { ...item, sk: !item.sk } : item,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    {m.sk ? "✓ Skilled" : "Skilled"}
                                                </Tag>
                                            </Tooltip>
                                            <Tooltip title="Toggle Leader status">
                                                <Tag
                                                    color={m.ld ? "purple" : "default"}
                                                    className="m-0 cursor-pointer select-none rounded-lg px-2.5 py-0.5 text-xs font-medium"
                                                    onClick={() =>
                                                        setTeam((prev) =>
                                                            prev.map((item, i) =>
                                                                i === idx ? { ...item, ld: !item.ld } : item,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    {m.ld ? "✓ Leader" : "Leader"}
                                                </Tag>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Sub-view B: Teams & Departments */}
            {(teamSectionTab === "teams" || viewAllSections) && (
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    Teams & Departments ({availableTeams.length})
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Organize staff members into dedicated teams (e.g. Reception, Operator, Concierge) to generate rosters per team.
                                </div>
                            </div>
                        </div>
                    }
                >
                    {/* Add Team Bar */}
                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 sm:flex-row sm:items-center">
                        <Input
                            size="large"
                            placeholder="New team name (e.g. Housekeeping, Security, Bar)..."
                            value={newTeamNameInput}
                            onChange={(e) => setNewTeamNameInput(e.target.value)}
                            onPressEnter={handleCreateNewTeam}
                            className="flex-1 rounded-xl"
                        />
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={handleCreateNewTeam}
                            className="rounded-xl px-6"
                            style={{ background: "#7c3aed" }}
                        >
                            Add New Team
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {availableTeams.map((tName) => {
                            const teamMembers = team.filter((m) => (m.teamName || "Reception") === tName);
                            const activeCount = teamMembers.filter((m) => m.activeInRoster !== false).length;
                            return (
                                <div
                                    key={tName}
                                    className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-xs transition ${
                                        selectedTeam === tName
                                            ? "border-blue-400 bg-blue-50/30 ring-2 ring-blue-200"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                                    <ApartmentOutlined className="text-lg" />
                                                </div>
                                                <div>
                                                    <div className="text-base font-bold text-slate-900">
                                                        {tName} Team
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {teamMembers.length} members ({activeCount} active in roster)
                                                    </div>
                                                </div>
                                            </div>
                                            {teamMembers.length === 0 && (
                                                <Popconfirm
                                                    title={`Delete ${tName} team?`}
                                                    onConfirm={() => handleDeleteTeam(tName)}
                                                    okText="Delete"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-1.5">
                                            <div className="text-xs font-semibold text-slate-600">Assigned Members:</div>
                                            {teamMembers.length === 0 ? (
                                                <div className="text-xs text-slate-400 italic">No members assigned yet.</div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                                    {teamMembers.map((m) => (
                                                        <Tag
                                                            key={m.id}
                                                            color={m.activeInRoster !== false ? "blue" : "default"}
                                                            className="m-0 text-xs rounded-md"
                                                        >
                                                            {m.name}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-3">
                                        <Button
                                            type={selectedTeam === tName ? "primary" : "default"}
                                            block
                                            icon={<ThunderboltOutlined />}
                                            onClick={() => {
                                                setSelectedTeam(tName);
                                                setActiveMainTab("rules");
                                                message.success(`Set active roster scope to ${tName} Team (${activeCount} active members)`);
                                            }}
                                            style={selectedTeam === tName ? { background: "#2f5bea" } : {}}
                                        >
                                            {selectedTeam === tName ? "✓ Currently Active Roster Scope" : `Make Roster for ${tName} Team`}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Sub-view B: Team Member Requests */}
            {(teamSectionTab === "requests" || viewAllSections) && (
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    Shift & Off-Day Requests ({requests.length})
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Requests are soft preferences by default. Toggle &quot;Granted (Hard Rule)&quot; to strictly lock them into the schedule.
                                </div>
                            </div>
                        </div>
                    }
                >
                    <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 lg:grid-cols-6">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                Team Member
                            </label>
                            <Select
                                size="large"
                                value={reqMemberId ?? team[0]?.id}
                                onChange={(v) => setReqMemberId(v)}
                                className="w-full"
                            >
                                {team.map((m) => (
                                    <Option key={m.id} value={m.id}>
                                        {m.name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                From Date
                            </label>
                            <Input
                                size="large"
                                type="date"
                                value={reqFromDate}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setReqFromDate(v);
                                    if (!reqToDate || reqToDate < v) setReqToDate(v);
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                To Date
                            </label>
                            <Input
                                size="large"
                                type="date"
                                value={reqToDate}
                                onChange={(e) => setReqToDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                Requested Shift / Off
                            </label>
                            <Select
                                size="large"
                                value={reqTypeSlot}
                                onChange={(v) => setReqTypeSlot(v)}
                                className="w-full"
                            >
                                <Option value={-1}>Off Day</Option>
                                {parsedStartSlots.map((slot) => (
                                    <Option key={slot} value={slot}>
                                        Duty Start {slotToTimeStr(slot)}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="flex items-end pb-2">
                            <Checkbox
                                checked={reqGranted}
                                onChange={(e) => setReqGranted(e.target.checked)}
                            >
                                <span className="text-sm font-medium text-slate-700">
                                    Granted (Hard Rule)
                                </span>
                            </Checkbox>
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="primary"
                                size="large"
                                icon={<PlusOutlined />}
                                onClick={handleAddRequest}
                                className="w-full rounded-xl"
                                style={{ background: "#2f5bea" }}
                            >
                                Add Request
                            </Button>
                        </div>
                    </div>

                    {requests.length === 0 ? (
                        <Empty description="No shift or off-day requests added." />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Team Member</th>
                                        <th className="px-4 py-3 font-semibold">From Date</th>
                                        <th className="px-4 py-3 font-semibold">To Date</th>
                                        <th className="px-4 py-3 font-semibold">Request Type</th>
                                        <th className="px-4 py-3 text-center font-semibold">Enforcement</th>
                                        <th className="px-4 py-3 text-right font-semibold">Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((r, i) => {
                                        const isValidStart = r.t < 0 || parsedStartSlots.includes(r.t);
                                        return (
                                            <tr key={r.id || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                <td className="px-4 py-3 font-semibold text-slate-800">
                                                    {memberNameById.get(r.m) || `#${r.m}`}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {r.from}{" "}
                                                    <Tag className="ml-1 rounded text-xs">{dayNameForIso(r.from)}</Tag>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {r.to}{" "}
                                                    <Tag className="ml-1 rounded text-xs">{dayNameForIso(r.to)}</Tag>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.t < 0 ? (
                                                        <Tag color="orange" className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                                                            Requested Off Day
                                                        </Tag>
                                                    ) : (
                                                        <div>
                                                            <Tag color="blue" className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                                                                Duty Start {slotToTimeStr(r.t)}
                                                            </Tag>
                                                            {!isValidStart && (
                                                                <span className="ml-2 text-xs text-red-600">
                                                                    (Not in company start times)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Switch
                                                        checked={r.g}
                                                        onChange={(checked) => handleToggleRequestGranted(i, checked)}
                                                        checkedChildren="Granted (Hard)"
                                                        unCheckedChildren="Soft"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={() =>
                                                            setRequests((prev) => prev.filter((_, idx) => idx !== i))
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Sub-view C: Absences & Leave */}
            {(teamSectionTab === "absences" || viewAllSections) && (
                <Card
                    className="rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <div>
                                <div className="text-base font-semibold text-slate-800">
                                    Absences, Leave & Training ({absences.length})
                                </div>
                                <div className="text-xs font-normal text-slate-500">
                                    Full-day absences automatically pro-rate weekly target hours. Partial-day windows keep the employee rostered but exclude them from on-site coverage during the window.
                                </div>
                            </div>
                        </div>
                    }
                >
                    <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 lg:grid-cols-7">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                Team Member
                            </label>
                            <Select
                                size="large"
                                value={absMemberId ?? team[0]?.id}
                                onChange={(v) => setAbsMemberId(v)}
                                className="w-full"
                            >
                                {team.map((m) => (
                                    <Option key={m.id} value={m.id}>
                                        {m.name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                Reason
                            </label>
                            <Select
                                size="large"
                                value={absReason}
                                onChange={(v) => setAbsReason(v)}
                                className="w-full"
                            >
                                <Option value="Annual Leave">Annual Leave</Option>
                                <Option value="Sick Leave">Sick Leave</Option>
                                <Option value="Training">Training</Option>
                                <Option value="Public Holiday">Public Holiday</Option>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                From Date
                            </label>
                            <Input
                                size="large"
                                type="date"
                                value={absFromDate}
                                onChange={(e) => {
                                    setAbsFromDate(e.target.value);
                                    if (!absToDate || absToDate < e.target.value) {
                                        setAbsToDate(e.target.value);
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                To Date
                            </label>
                            <Input
                                size="large"
                                type="date"
                                value={absToDate}
                                onChange={(e) => setAbsToDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                Start Time (Optional)
                            </label>
                            <Input
                                size="large"
                                type="time"
                                value={absFromTime}
                                onChange={(e) => setAbsFromTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                End Time (Optional)
                            </label>
                            <Input
                                size="large"
                                type="time"
                                value={absToTime}
                                onChange={(e) => setAbsToTime(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="primary"
                                size="large"
                                icon={<PlusOutlined />}
                                onClick={handleAddAbsence}
                                className="w-full rounded-xl"
                                style={{ background: "#2f5bea" }}
                            >
                                Add Absence
                            </Button>
                        </div>
                    </div>

                    {absences.length === 0 ? (
                        <Empty description="No absences or training windows recorded." />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Team Member</th>
                                        <th className="px-4 py-3 font-semibold">Reason</th>
                                        <th className="px-4 py-3 font-semibold">From Date</th>
                                        <th className="px-4 py-3 font-semibold">To Date</th>
                                        <th className="px-4 py-3 font-semibold">Coverage Impact</th>
                                        <th className="px-4 py-3 text-right font-semibold">Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {absences.map((a, i) => (
                                        <tr key={a.id || i} className="border-t border-slate-100 hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-semibold text-slate-800">
                                                {memberNameById.get(a.m) || `#${a.m}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Tag color="purple" className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                                                    {a.r}
                                                </Tag>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{a.from}</td>
                                            <td className="px-4 py-3 text-slate-700">{a.to}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {a.t1 ? (
                                                    <Tag color="cyan" className="rounded-md text-xs">
                                                        Partial Window: {a.t1} – {a.t2 || "24:00"} (Away from site)
                                                    </Tag>
                                                ) : (
                                                    <Tag color="default" className="rounded-md text-xs">
                                                        Full Day Off (Pro-rates weekly target hours)
                                                    </Tag>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() =>
                                                        setAbsences((prev) => prev.filter((_, idx) => idx !== i))
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );

    const renderScheduleAndResultsSection = () => {
        if (!solvedState) {
            return (
                <Card className="mb-8 rounded-2xl border-slate-200/90 py-12 text-center shadow-sm">
                    <Empty
                        description={
                            <div className="space-y-2">
                                <div className="text-base font-semibold text-slate-700">
                                    No Roster Generated Yet
                                </div>
                                <div className="text-xs text-slate-500">
                                    Click &quot;Solve Roster&quot; for fast browser optimization or &quot;OR-Tools (CP-SAT)&quot; for exact server-side mathematical programming.
                                </div>
                            </div>
                        }
                    >
                        <Space size="middle" className="mt-2">
                            <Button
                                type="primary"
                                size="large"
                                icon={<ThunderboltOutlined />}
                                loading={solving}
                                onClick={handleRunHeuristicSolver}
                                style={{ background: "#2f5bea" }}
                            >
                                Solve Roster Now
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                icon={<RocketOutlined />}
                                loading={solvingOrTools}
                                onClick={handleRunLiveOrToolsSolver}
                                style={{ background: "#0f766e", borderColor: "#0f766e" }}
                            >
                                Solve with Google OR-Tools (CP-SAT)
                            </Button>
                        </Space>
                    </Empty>
                </Card>
            );
        }

        const primaryKpis = [
            {
                title: "Coverage Score",
                value: `${Math.round(solvedState.met.score * 1000) / 10}%`,
                subtitle: solvedState.met.strict ? "Strict hourly minimums ON" : "Best-effort mode",
                ok: solvedState.met.score >= 0.999,
            },
            {
                title: "Hard Rule Violations",
                value: Math.round(solvedState.met.hard * 100) / 100,
                subtitle: `Understaffed: ${Math.round(solvedState.met.under * 10) / 10}h · Rest: ${solvedState.met.rV}`,
                ok: solvedState.met.hard === 0,
            },
            {
                title: "Granted Requests Met",
                value: `${solvedState.met.gM} / ${solvedState.met.gT}`,
                subtitle: "Hard-locked employee requests",
                ok: solvedState.met.gM === solvedState.met.gT,
            },
            {
                title: "Soft Requests Met",
                value: `${solvedState.met.oM + solvedState.met.sM} / ${solvedState.met.oT + solvedState.met.sT}`,
                subtitle: `Off: ${solvedState.met.oM}/${solvedState.met.oT} · Starts: ${solvedState.met.sM}/${solvedState.met.sT}`,
                ok: true,
            },
        ];

        const detailedKpis = [
            { label: "Understaffed person-hrs", value: Math.round(solvedState.met.under * 100) / 100, bad: solvedState.met.under > 0 },
            { label: "Over-max person-hrs", value: Math.round(solvedState.met.over * 100) / 100, bad: solvedState.met.over > 0 },
            { label: "Hours w/o Skilled", value: Math.round(solvedState.met.skU * 100) / 100, bad: solvedState.met.skU > 0 },
            { label: "Hours w/o Leader", value: Math.round(solvedState.met.ldU * 100) / 100, bad: solvedState.met.ldU > 0 },
            { label: "Rest violations", value: solvedState.met.rV, bad: solvedState.met.rV > 0 },
            { label: "Infeasible member hrs", value: solvedState.met.flags, bad: solvedState.met.flags > 0 },
            { label: "Off-day limit violations", value: solvedState.met.offBad, bad: solvedState.met.offBad > 0 },
            { label: "Same start all week", value: `${solvedState.met.sameS}/${solvedState.met.ew}`, bad: false },
            { label: "Double offs back-to-back", value: `${solvedState.met.b2b}/${solvedState.met.b2T}`, bad: false },
            { label: "Off-peak surplus hrs", value: Math.round(solvedState.met.opO * 100) / 100, bad: false },
            { label: "Max hourly staff swing", value: solvedState.met.sw, bad: false },
        ];

        const weeksToRender =
            selectedWeekTab === "all"
                ? Array.from({ length: solvedState.W }, (_, w) => w)
                : [Number(selectedWeekTab)];

        return (
            <div className="space-y-6 pb-8" ref={rosterViewRef}>
                {/* Executive KPI Summary Strip */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {primaryKpis.map((kpi, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl border p-5 shadow-xs ${
                                kpi.ok
                                    ? "border-emerald-200/80 bg-white"
                                    : "border-red-200 bg-red-50/30"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {kpi.title}
                                </span>
                                {kpi.ok ? (
                                    <CheckCircleOutlined className="text-lg text-emerald-500" />
                                ) : (
                                    <WarningOutlined className="text-lg text-red-500" />
                                )}
                            </div>
                            <div
                                className={`mt-2 text-2xl font-bold ${
                                    kpi.ok ? "text-slate-900" : "text-red-600"
                                }`}
                            >
                                {kpi.value}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{kpi.subtitle}</div>
                        </div>
                    ))}
                </div>

                {/* Expandable Detailed 11 Solver Metrics */}
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">Solver Status:</span>
                            <span>{solverStatusText}</span>
                        </div>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => setShowAllKpis((s) => !s)}
                        >
                            {showAllKpis ? "Hide Detailed Metrics" : "Show All 15 Detailed Metrics"}
                        </Button>
                    </div>

                    {showAllKpis && (
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {detailedKpis.map((k, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3"
                                >
                                    <div className="text-xs text-slate-500">{k.label}</div>
                                    <div
                                        className={`mt-1 text-base font-bold ${
                                            k.bad ? "text-red-600" : "text-emerald-600"
                                        }`}
                                    >
                                        {k.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sub-navigation Bar for Weekly Schedule vs 24h Heatmap vs Diagnostics */}
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center">
                    <Segmented
                        size="large"
                        value={scheduleSubTab}
                        onChange={(v) => setScheduleSubTab(String(v))}
                        options={[
                            {
                                label: (
                                    <div className="flex items-center gap-2 px-2 py-0.5">
                                        <CalendarOutlined />
                                        <span>Weekly Shift Schedule</span>
                                    </div>
                                ),
                                value: "weekly",
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-2 px-2 py-0.5">
                                        <FireOutlined />
                                        <span>24-Hour Coverage Heatmap</span>
                                    </div>
                                ),
                                value: "heatmap",
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-2 px-2 py-0.5">
                                        <BulbOutlined />
                                        <span>Spare Capacity & Diagnostics</span>
                                        {rosterCoverageDetails && rosterCoverageDetails.intervals.length > 0 && (
                                            <Badge count={rosterCoverageDetails.intervals.length} color="#dc2626" />
                                        )}
                                    </div>
                                ),
                                value: "diagnostics",
                            },
                        ]}
                    />

                    <Space wrap>
                        <Button
                            icon={<BulbOutlined />}
                            loading={analyzingAi}
                            onClick={handleRunAiAnalysis}
                        >
                            AI What-If Analysis
                        </Button>
                        <Button
                            icon={<SaveOutlined />}
                            onClick={() => setSaveRecordModalOpen(true)}
                        >
                            Save Record
                        </Button>
                        <Button
                            type="primary"
                            icon={<FileExcelOutlined />}
                            loading={exportingExcel}
                            onClick={handleExportExcel}
                            style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        >
                            Export Excel (.xlsx)
                        </Button>
                    </Space>
                </div>

                {/* View 1: Interactive Weekly Roster Schedule */}
                {(scheduleSubTab === "weekly" || viewAllSections) && (
                    <Card
                        className="rounded-2xl border-slate-200/90 shadow-sm"
                        bodyStyle={{ padding: "24px" }}
                        title={
                            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold text-slate-800">
                                        Weekly Shift Schedule
                                    </span>
                                    <Tag color="blue" className="m-0 rounded-full text-xs">
                                        Click any shift cell to edit manually
                                    </Tag>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {solvedState.W > 1 && (
                                        <Segmented
                                            size="small"
                                            value={selectedWeekTab}
                                            onChange={(v) => setSelectedWeekTab(String(v))}
                                            options={[
                                                { label: "All Weeks", value: "all" },
                                                ...Array.from({ length: solvedState.W }, (_, w) => ({
                                                    label: `Week ${w + 1}`,
                                                    value: String(w),
                                                })),
                                            ]}
                                        />
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs font-normal">
                                        <Tag color="red" className="m-0">Hard Violation</Tag>
                                        <Tag color="gold" className="m-0">Unmet Soft Request</Tag>
                                        <Tag color="blue" className="m-0">+1 Overnight</Tag>
                                    </div>
                                </div>
                            </div>
                        }
                    >
                        <div className="space-y-8">
                            {weeksToRender.map((w) => (
                                <div key={w} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="m-0 text-base font-bold text-slate-800">
                                            Week {w + 1} — Starting {addDaysIso(solvedState.c.ws, w * 7)}
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                                        <table className="w-full border-collapse text-left text-xs sm:text-sm">
                                            <thead className="bg-slate-100/90 text-slate-700">
                                                <tr>
                                                    <th className="sticky left-0 z-10 min-w-[160px] bg-slate-100 px-4 py-3 font-semibold">
                                                        Team Member
                                                    </th>
                                                    {DAY_NAMES.map((d, i) => (
                                                        <th key={d} className="min-w-[130px] px-3.5 py-3 font-semibold">
                                                            <div>{d}</div>
                                                            <div className="text-[11px] font-normal text-slate-500">
                                                                {addDaysIso(solvedState.c.ws, w * 7 + i).slice(5)}
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="px-4 py-3 text-center font-semibold">Weekly Hrs</th>
                                                    <th className="px-4 py-3 text-center font-semibold">Off Days</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {solvedState.E.map((e, mIdx) => {
                                                    let tot = 0;
                                                    let off = 0;
                                                    const cells = DAY_NAMES.map((_, d) => {
                                                        const g = w * 7 + d;
                                                        const x = e.h[g];
                                                        tot += x;
                                                        if (!x) off++;

                                                        const dateIso = addDaysIso(solvedState.c.ws, g);
                                                        const openEditor = () => {
                                                            if (e.abs[g]) return;
                                                            setEditingCell({
                                                                memberIndex: mIdx,
                                                                dayIndex: g,
                                                                memberName: e.m.name,
                                                                dateIso,
                                                                isOff: x === 0,
                                                                startSlot: e.s[g] || parsedStartSlots[0] || 24,
                                                                hours: x || solvedState.c.minD || 8,
                                                            });
                                                        };

                                                        if (e.abs[g]) {
                                                            return (
                                                                <td
                                                                    key={d}
                                                                    className="border-t border-slate-100 bg-purple-50/30 px-3.5 py-3"
                                                                >
                                                                    <Tag color="purple" className="m-0 rounded-md px-2 py-0.5 text-xs font-medium">
                                                                        ABSENT
                                                                    </Tag>
                                                                </td>
                                                            );
                                                        }
                                                        if (!x) {
                                                            return (
                                                                <td
                                                                    key={d}
                                                                    onClick={openEditor}
                                                                    className="cursor-pointer border-t border-slate-100 px-3.5 py-3 transition hover:bg-blue-50/40"
                                                                >
                                                                    <Tag className="m-0 rounded-md px-2 py-0.5 text-xs font-medium text-slate-600">
                                                                        OFF{e.gOff[g] ? " · Granted" : ""}
                                                                    </Tag>
                                                                    {e.rst[g] >= 0 && (
                                                                        <div className="mt-1 text-[11px] text-amber-600">
                                                                            ● wanted {slotToTimeStr(e.rst[g])}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        }

                                                        const v = getCellViolations(solvedState, e, g);
                                                        const awayTag = getPartialAbsenceWindowTag(e, g);
                                                        const endSlot = e.s[g] + 4 * x + solvedState.bl;
                                                        const cellBg = v.H.length
                                                            ? "bg-red-50/90 ring-1 ring-inset ring-red-400"
                                                            : v.So.length
                                                              ? "bg-amber-50/70"
                                                              : "hover:bg-blue-50/40";

                                                        return (
                                                            <td
                                                                key={d}
                                                                onClick={openEditor}
                                                                className={`cursor-pointer border-t border-slate-100 px-3.5 py-3 align-top transition ${cellBg}`}
                                                            >
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="font-semibold text-slate-900">
                                                                        {slotToTimeStr(e.s[g])}–{slotToTimeStr(endSlot)}
                                                                        {endSlot >= 96 && (
                                                                            <sup className="ml-0.5 font-bold text-red-600">
                                                                                +1
                                                                            </sup>
                                                                        )}
                                                                    </span>
                                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                                                                        {x}h
                                                                    </span>
                                                                </div>
                                                                {awayTag && (
                                                                    <Tag className="mt-1 text-[10px]">{awayTag}</Tag>
                                                                )}
                                                                {e.gSt[g] >= 0 && (
                                                                    <Tag color="green" className="mt-1 text-[10px]">
                                                                        Granted Start
                                                                    </Tag>
                                                                )}
                                                                {v.H.map((z, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="mt-1 text-[11px] font-semibold text-red-600"
                                                                    >
                                                                        ⚠ {z}
                                                                    </div>
                                                                ))}
                                                                {v.So.map((z, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="mt-1 text-[11px] text-amber-700"
                                                                    >
                                                                        ● {z}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        );
                                                    });

                                                    const fo = [0, 1, 2, 3, 4, 5, 6].filter(
                                                        (d) => e.abs[w * 7 + d] || e.gOff[w * 7 + d],
                                                    ).length;
                                                    const hrsOk = Math.abs(tot - e.Tw[w]) < 1e-6;
                                                    const offOk =
                                                        off >= solvedState.c.minOff &&
                                                        off <= Math.max(solvedState.c.maxOff, fo);

                                                    return (
                                                        <tr key={e.m.id} className="hover:bg-slate-50/60">
                                                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-4 py-3 font-semibold text-slate-800">
                                                                <div>{e.m.name}</div>
                                                                <div className="mt-0.5 flex flex-wrap gap-1">
                                                                    {e.m.sk && (
                                                                        <Tag color="blue" className="m-0 px-1.5 py-0 text-[10px]">
                                                                            Skilled
                                                                        </Tag>
                                                                    )}
                                                                    {e.m.ld && (
                                                                        <Tag color="purple" className="m-0 px-1.5 py-0 text-[10px]">
                                                                            Leader
                                                                        </Tag>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {cells}
                                                            <td
                                                                className={`border-t border-slate-100 px-4 py-3 text-center font-bold ${
                                                                    hrsOk ? "text-emerald-700" : "text-red-600"
                                                                }`}
                                                            >
                                                                {tot} / {e.Tw[w]}h
                                                            </td>
                                                            <td
                                                                className={`border-t border-slate-100 px-4 py-3 text-center font-bold ${
                                                                    offOk ? "text-slate-800" : "text-red-600"
                                                                }`}
                                                            >
                                                                {off}d
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* View 2: 24-Hour Coverage Heatmap */}
                {(scheduleSubTab === "heatmap" || viewAllSections) && (
                    <Card
                        className="mb-8 rounded-2xl border-slate-200/90 shadow-sm"
                        bodyStyle={{ padding: "24px" }}
                        title={
                            <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                                <div>
                                    <div className="text-base font-semibold text-slate-800">
                                        24-Hour Staff On-Site Coverage Heatmap
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                        Hover over any hour cell to inspect 15-minute quarter-hour counts and exact staff names on site
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <Tag color="red" className="m-0">Red = Below Min / Above Max / Missing Role</Tag>
                                    <Tag color="blue" className="m-0">Blue = Compliant Coverage</Tag>
                                </div>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full border-collapse text-center text-xs sm:text-sm">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="min-w-[120px] px-4 py-3 text-left font-semibold">Day / Date</th>
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <th key={h} className="px-2 py-3 font-semibold">
                                                {String(h).padStart(2, "0")}:00
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: solvedState.D }, (_, g) => (
                                        <tr key={g} className="border-t border-slate-100">
                                            <th className="whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left font-semibold text-slate-700">
                                                {DAY_NAMES[g % 7]} {addDaysIso(solvedState.c.ws, g).slice(5)}
                                            </th>
                                            {Array.from({ length: 24 }, (_, x) => {
                                                let v = 99;
                                                let mx = 0;
                                                let bad = false;
                                                const qs: string[] = [];
                                                for (let j = 0; j < 4; j++) {
                                                    const k = g * 96 + x * 4 + j;
                                                    const q = solvedState.cov[k];
                                                    v = Math.min(v, q);
                                                    mx = Math.max(mx, q);
                                                    const names =
                                                        rosterCoverageDetails?.onSiteNames[k]?.join(", ") || "none";
                                                    qs.push(
                                                        `${slotToTimeStr(x * 4 + j)}: ${q} on site (min ${
                                                            solvedState.need[x * 4 + j]
                                                        }) [${names}]`,
                                                    );
                                                    if (
                                                        q < solvedState.need[x * 4 + j] ||
                                                        q > solvedState.c.maxH[x] ||
                                                        (solvedState.c.spSk === "Yes" && solvedState.cs[k] < 1) ||
                                                        (solvedState.c.spLd === "Yes" && solvedState.cl[k] < 1)
                                                    ) {
                                                        bad = true;
                                                    }
                                                }
                                                const alpha = Math.min(0.85, v * 0.13);
                                                return (
                                                    <Tooltip key={x} title={qs.join(" | ")}>
                                                        <td
                                                            className="cursor-help px-2 py-2.5 font-semibold transition hover:opacity-80"
                                                            style={{
                                                                backgroundColor: bad
                                                                    ? "#dc2626"
                                                                    : `rgba(47, 91, 234, ${alpha})`,
                                                                color: bad || alpha > 0.45 ? "#fff" : "#1e293b",
                                                            }}
                                                        >
                                                            {v === mx ? v : `${v}-${mx}`}
                                                        </td>
                                                    </Tooltip>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                                        <td className="px-4 py-2 text-left">Required Min / Max</td>
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <td key={h} className="px-1 py-2">
                                                {solvedState.c.minH[h]}–{solvedState.c.maxH[h]}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* View 3: Spare Capacity & Understaffed Root-Cause Diagnostics */}
                {(scheduleSubTab === "diagnostics" || viewAllSections) && (
                    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Spare Capacity Card */}
                        <Card
                            className="rounded-2xl border-slate-200/90 shadow-sm"
                            bodyStyle={{ padding: "24px" }}
                            title={
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <div className="text-base font-semibold text-slate-800">
                                            Spare Capacity Suggestions
                                        </div>
                                        <div className="text-xs font-normal text-slate-500">
                                            Identifies shifts that can be safely removed without dropping below hourly minimums
                                        </div>
                                    </div>
                                    <Tag color="blue" className="m-0 rounded-full px-3 py-0.5">
                                        Spare: {Math.round((solvedState.availH - solvedState.reqH) * 100) / 100}h
                                    </Tag>
                                </div>
                            }
                        >
                            {solvedState.availH - solvedState.reqH <= 0 ? (
                                <Empty description="No spare hours available (required hours equal or exceed available hours)." />
                            ) : spareSuggestions.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-4 py-2.5 font-semibold">Date</th>
                                                <th className="px-4 py-2.5 font-semibold">Members Who Could Be Off</th>
                                                <th className="px-4 py-2.5 font-semibold">Hours Freed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(
                                                spareSuggestions.reduce<Record<number, typeof spareSuggestions>>(
                                                    (acc, item) => {
                                                        (acc[item.g] = acc[item.g] || []).push(item);
                                                        return acc;
                                                    },
                                                    {},
                                                ),
                                            ).map(([gStr, items]) => {
                                                const g = Number(gStr);
                                                return (
                                                    <tr key={g} className="border-t border-slate-100">
                                                        <td className="px-4 py-2.5 font-medium text-slate-800">
                                                            {DAY_NAMES[g % 7]} {addDaysIso(config.ws, g)}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {items.map((x, idx) => (
                                                                <div key={idx} className="mb-1">
                                                                    <span className="font-medium">{x.name}</span> ({x.hrs}h)
                                                                    {x.req && (
                                                                        <Tag color="green" className="ml-1.5 text-[10px]">
                                                                            Requested Off
                                                                        </Tag>
                                                                    )}
                                                                    {x.over && (
                                                                        <Tag color="orange" className="ml-1.5 text-[10px]">
                                                                            Above Max Off Days
                                                                        </Tag>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-bold text-emerald-700">
                                                            {items.reduce((a, x) => a + x.hrs, 0)}h
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Spare hours are spread thinly across the week; removing any full shift would leave at least one hour below its minimum."
                                />
                            )}
                        </Card>

                        {/* Root-Cause Diagnostics Card */}
                        <Card
                            className="rounded-2xl border-slate-200/90 shadow-sm"
                            bodyStyle={{ padding: "24px" }}
                            title={
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <div className="text-base font-semibold text-slate-800">
                                            Understaffed Root-Cause Diagnostics
                                        </div>
                                        <div className="text-xs font-normal text-slate-500">
                                            Explains why each understaffed interval could not be covered by off-duty members
                                        </div>
                                    </div>
                                    <Tag
                                        color={
                                            rosterCoverageDetails && rosterCoverageDetails.intervals.length > 0
                                                ? "error"
                                                : "success"
                                        }
                                        className="m-0 rounded-full px-3 py-0.5"
                                    >
                                        {rosterCoverageDetails?.intervals.length || 0} Intervals
                                    </Tag>
                                </div>
                            }
                        >
                            {!rosterCoverageDetails || rosterCoverageDetails.intervals.length === 0 ? (
                                <Alert
                                    type="success"
                                    showIcon
                                    message="100% of hourly minimum staffing targets are satisfied! Zero understaffed intervals."
                                    className="rounded-xl"
                                />
                            ) : (
                                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                    {rosterCoverageDetails.intervals.slice(0, 15).map((iv, idx) => {
                                        const g = Math.floor(iv.s / 96);
                                        return (
                                            <div
                                                key={idx}
                                                className="rounded-xl border border-red-200 bg-red-50/40 p-3.5 text-xs sm:text-sm"
                                            >
                                                <div className="flex items-center justify-between font-semibold text-red-700">
                                                    <span>
                                                        {DAY_NAMES[g % 7]} {addDaysIso(solvedState.c.ws, g)} ·{" "}
                                                        {slotToTimeStr(iv.s)}–{slotToTimeStr(iv.e)}
                                                    </span>
                                                    <Tag color="red" className="m-0">
                                                        {iv.q} on site / {iv.n} required
                                                    </Tag>
                                                </div>
                                                {iv.reasons.length > 0 && (
                                                    <div className="mt-1.5 text-xs text-slate-600">
                                                        <strong>Blocking constraints:</strong> {iv.reasons.join("; ")}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        );
    };

    const renderOptimizerAndOrToolsSection = () => (
        <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-12">
            {/* Left Column: Google OR-Tools (CP-SAT) Studio */}
            <div className="lg:col-span-7">
                <Card
                    className="h-full rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <RocketOutlined className="text-lg" />
                                </div>
                                <div>
                                    <div className="text-base font-semibold text-slate-800">
                                        Google OR-Tools (CP-SAT) Optimization Engine
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                        Exact Integer Linear Programming solver (`ortools.sat.python.cp_model`)
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                >
                    <div className="mb-5 rounded-2xl border border-teal-200/70 bg-teal-50/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                        Server Time Limit (seconds)
                                    </label>
                                    <InputNumber
                                        size="middle"
                                        min={3}
                                        max={120}
                                        value={orToolsTimeLimit}
                                        onChange={(v) => setOrToolsTimeLimit(Number(v) || 15)}
                                        addonAfter="sec"
                                        style={{ width: 120 }}
                                    />
                                </div>
                                <div className="pt-4">
                                    <Checkbox
                                        checked={orToolsWarmStart}
                                        onChange={(e) => setOrToolsWarmStart(e.target.checked)}
                                    >
                                        <span className="text-sm font-medium text-slate-700">
                                            Warm-start with heuristic hint
                                        </span>
                                    </Checkbox>
                                </div>
                            </div>

                            <Button
                                type="primary"
                                size="large"
                                icon={<RocketOutlined />}
                                loading={solvingOrTools}
                                onClick={handleRunLiveOrToolsSolver}
                                className="rounded-xl"
                                style={{ background: "#0f766e", borderColor: "#0f766e" }}
                            >
                                Solve Live on Server (CP-SAT)
                            </Button>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2.5">
                        <Button icon={<CodeOutlined />} onClick={handleGenerateOrToolsScript}>
                            Generate Standalone Python Script
                        </Button>
                        <Button
                            icon={<CopyOutlined />}
                            disabled={!pythonScript}
                            onClick={() => {
                                navigator.clipboard.writeText(pythonScript);
                                message.success("OR-Tools Python script copied to clipboard!");
                            }}
                        >
                            Copy Script
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            disabled={!pythonScript}
                            onClick={() => {
                                const blob = new Blob([pythonScript], { type: "text/x-python" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `roster_ortools_${config.ws}.py`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            Download .py
                        </Button>
                    </div>

                    {pythonScript ? (
                        <textarea
                            readOnly
                            value={pythonScript}
                            rows={14}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300"
                        />
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                            Click &quot;Solve Live on Server (CP-SAT)&quot; or &quot;Generate Standalone Python Script&quot; to inspect the complete CP-SAT mathematical formulation.
                        </div>
                    )}
                </Card>
            </div>

            {/* Right Column: AI What-If Scenario Simulator */}
            <div className="lg:col-span-5">
                <Card
                    className="h-full rounded-2xl border-slate-200/90 shadow-sm"
                    bodyStyle={{ padding: "24px" }}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                    <BulbOutlined className="text-lg" />
                                </div>
                                <div>
                                    <div className="text-base font-semibold text-slate-800">
                                        AI What-If Scenario Simulator
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                        Tests candidate rule & headcount adjustments against the solver
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="primary"
                                icon={<BulbOutlined />}
                                loading={analyzingAi}
                                disabled={!solvedState}
                                onClick={handleRunAiAnalysis}
                                style={{ background: "#2f5bea" }}
                            >
                                Run AI Simulator
                            </Button>
                        </div>
                    }
                >
                    {!aiResult ? (
                        <Empty
                            description={
                                <span className="text-xs text-slate-500">
                                    {solvedState
                                        ? "Click 'Run AI Simulator' above to benchmark candidate fixes and see how to eliminate violations."
                                        : "Solve a roster first, then run the AI What-If Simulator."}
                                </span>
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            <ul className="list-disc space-y-1.5 pl-5 text-xs sm:text-sm">
                                {aiResult.findings.map((f, i) => (
                                    <li
                                        key={i}
                                        className={
                                            f.type === "bad"
                                                ? "text-red-700"
                                                : f.type === "ok"
                                                  ? "text-emerald-700"
                                                  : "text-slate-700"
                                        }
                                        dangerouslySetInnerHTML={{ __html: f.html }}
                                    />
                                ))}
                            </ul>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-3 py-2.5 font-semibold">Scenario</th>
                                            <th className="px-3 py-2.5 font-semibold">Hard Viol.</th>
                                            <th className="px-3 py-2.5 font-semibold">Unmet Req.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aiResult.candidates.map((c, idx) => (
                                            <tr
                                                key={c.l}
                                                className={`border-t border-slate-100 ${
                                                    idx === 0 ? "bg-emerald-50/60 font-semibold" : ""
                                                }`}
                                            >
                                                <td className="px-3 py-2.5">
                                                    {idx === 0 ? "★ " : ""}
                                                    {c.l}
                                                </td>
                                                <td
                                                    className={`px-3 py-2.5 font-bold ${
                                                        c.S.met.hard > 0 ? "text-red-600" : "text-emerald-600"
                                                    }`}
                                                >
                                                    {Math.round(c.S.met.hard * 100) / 100}
                                                </td>
                                                <td className="px-3 py-2.5">{c.S.met.unmet}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 sm:flex-row sm:items-center">
                                <div className="text-xs sm:text-sm">
                                    {aiResult.recommended.l.startsWith("Base") ? (
                                        <span className="font-medium text-emerald-700">
                                            Baseline is already optimal.
                                        </span>
                                    ) : (
                                        <span>
                                            Best Fix: <strong>{aiResult.recommended.l}</strong>
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="primary"
                                    icon={<ToolOutlined />}
                                    onClick={handleApplyBestAiFix}
                                    style={{ background: "#2f5bea" }}
                                >
                                    Apply Best Fix & Re-solve
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );

    if (loadingWorkspace && !hydratedFromBackendRef.current) {
        return (
            <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-3 bg-slate-50/80 p-8">
                <Spin size="large" />
                <Text className="text-sm text-slate-500">
                    Syncing Roster with your company account...
                </Text>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 bg-slate-50/80 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
            <div className="mx-auto space-y-6" style={{ maxWidth: 1480 }}>
                {/* ── Top Hero Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:flex-row lg:items-center lg:p-6">
                    <div className="flex items-start gap-4 sm:items-center">
                        <div
                            className="flex shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                            style={{
                                width: 52,
                                height: 52,
                                background: "linear-gradient(135deg, #2f5bea 0%, #1e3a8a 100%)",
                            }}
                        >
                            <CalendarOutlined className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <Title level={3} className="!m-0 !text-slate-900">
                                    {accountMeta?.companyName
                                        ? `${accountMeta.companyName} — Team Roster`
                                        : "Team Roster & Constraint Solver"}
                                </Title>
                                <Tag color="blue" className="rounded-full px-3 py-0.5 font-medium">
                                    15-Min Grid · CP-SAT
                                </Tag>
                                {accountMeta && (
                                    <Tag color="geekblue" className="rounded-full px-3 py-0.5 font-medium">
                                        {accountMeta.stationCount} Station{accountMeta.stationCount === 1 ? "" : "s"} ·{" "}
                                        {accountMeta.accountUsersCount} Account User{accountMeta.accountUsersCount === 1 ? "" : "s"}
                                    </Tag>
                                )}
                                {solvedState?.solverEngine === "ortools-cpsat" && (
                                    <Tag color="purple" className="rounded-full px-3 py-0.5 font-semibold">
                                        OR-Tools ({solvedState.orToolsMeta?.status})
                                    </Tag>
                                )}
                            </div>
                            <Text className="mt-1 block text-xs text-slate-500 sm:text-sm">
                                Live-synced with your company account users and dynamic rules.
                            </Text>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Tooltip title="Switch between clean step-by-step tabs or full single-page scroll view">
                            <Button
                                icon={viewAllSections ? <AppstoreOutlined /> : <LayoutOutlined />}
                                onClick={() => setViewAllSections((v) => !v)}
                            >
                                {viewAllSections ? "Tabbed View" : "Full Page View"}
                            </Button>
                        </Tooltip>
                        <Badge count={savedRecords.length} showZero={false} color="#2f5bea">
                            <Button
                                icon={<HistoryOutlined />}
                                onClick={() => setRecordsDrawerOpen(true)}
                            >
                                Saved Records
                            </Button>
                        </Badge>
                        <Button
                            type="primary"
                            size="large"
                            icon={<ThunderboltOutlined />}
                            loading={solving}
                            onClick={handleRunHeuristicSolver}
                            className="rounded-xl font-medium"
                            style={{ background: "#2f5bea" }}
                        >
                            Solve Roster
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            icon={<RocketOutlined />}
                            loading={solvingOrTools}
                            onClick={handleRunLiveOrToolsSolver}
                            className="rounded-xl font-medium"
                            style={{ background: "#0f766e", borderColor: "#0f766e" }}
                        >
                            OR-Tools (CP-SAT)
                        </Button>
                    </div>
                </div>

                {/* ── Team Selection & Department Scope Bar ──────────────────────── */}
                <div className="flex flex-col gap-3.5 rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/40 p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <ApartmentOutlined className="text-xl" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-sm font-bold text-slate-800">
                                    Roster Scope / Department:
                                </span>
                                <Select
                                    value={selectedTeam}
                                    onChange={(val) => {
                                        setSelectedTeam(val);
                                        setSolvedState(null);
                                    }}
                                    style={{ minWidth: 230 }}
                                    size="middle"
                                    className="font-semibold"
                                >
                                    <Option value="all">
                                        All Teams ({team.filter((m) => m.activeInRoster !== false).length} Active Members)
                                    </Option>
                                    {availableTeams.map((tName) => {
                                        const count = team.filter((m) => m.activeInRoster !== false && (m.teamName || "Reception") === tName).length;
                                        return (
                                            <Option key={tName} value={tName}>
                                                {tName} Team ({count} Members)
                                            </Option>
                                        );
                                    })}
                                </Select>
                                {selectedTeam !== "all" && (
                                    <Tag color="blue" className="rounded-full px-3 py-0.5 text-xs font-semibold">
                                        Generating exclusively for {selectedTeam} Team
                                    </Tag>
                                )}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                                {selectedTeam === "all"
                                    ? `Solving and generating roster for all ${activeTeam.length} active members across all teams.`
                                    : `Solving and generating roster only for the ${activeTeam.length} active members assigned to ${selectedTeam} Team.`}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            icon={<UsergroupAddOutlined />}
                            onClick={() => setImportUsersModalVisible(true)}
                        >
                            Import Company Users
                        </Button>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => setManageTeamsModalVisible(true)}
                        >
                            Manage Teams ({availableTeams.length})
                        </Button>
                    </div>
                </div>

                {/* ── 4 At-a-Glance Live Summary Cards ────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                        onClick={() => {
                            setViewAllSections(false);
                            setActiveMainTab("rules");
                        }}
                        className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-300"
                    >
                        <div className="text-xs font-medium text-slate-500">Roster Horizon</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                            {config.weeks} Week{config.weeks > 1 ? "s" : ""} · Starts {config.ws}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {config.T}h/wk target · {config.rest}h min rest
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setViewAllSections(false);
                            setActiveMainTab("team");
                        }}
                        className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-300"
                    >
                        <div className="text-xs font-medium text-slate-500">
                            {selectedTeam === "all" ? "All Active Members" : `${selectedTeam} Team Members`}
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                            {activeTeam.length} Member{activeTeam.length === 1 ? "" : "s"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {activeTeam.filter((m) => m.sk).length} Skilled · {activeTeam.filter((m) => m.ld).length} Leaders ·{" "}
                            {requests.length} Requests
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setViewAllSections(false);
                            setActiveMainTab("rules");
                        }}
                        className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-300"
                    >
                        <div className="text-xs font-medium text-slate-500">Live Capacity Balance</div>
                        <div
                            className={`mt-1 text-lg font-bold ${
                                capacityCalc.totalBalance >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                        >
                            {capacityCalc.totalBalance >= 0
                                ? `+${capacityCalc.totalBalance}h Surplus`
                                : `${capacityCalc.totalBalance}h Shortfall`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {capacityCalc.totalRequired}h required / {capacityCalc.totalAvailable}h available (
                            {capacityCalc.totalUtilizationPct}%)
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setViewAllSections(false);
                            setActiveMainTab("schedule");
                        }}
                        className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-300"
                    >
                        <div className="text-xs font-medium text-slate-500">Active Schedule Status</div>
                        {solvedState ? (
                            <>
                                <div
                                    className={`mt-1 text-lg font-bold ${
                                        solvedState.met.hard === 0 ? "text-emerald-600" : "text-amber-600"
                                    }`}
                                >
                                    {Math.round(solvedState.met.score * 1000) / 10}% Coverage
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Hard Violations: {Math.round(solvedState.met.hard * 100) / 100} · Unmet Soft:{" "}
                                    {solvedState.met.unmet}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mt-1 text-lg font-bold text-slate-400">Not Solved Yet</div>
                                <div className="mt-1 text-xs text-blue-600">
                                    Click &quot;Solve Roster&quot; to generate →
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Main Step-by-Step Navigation Tabs (when in Tabbed View) ──────── */}
                {!viewAllSections ? (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 pt-2 shadow-2xs">
                            <Tabs
                                activeKey={activeMainTab}
                                onChange={setActiveMainTab}
                                size="large"
                                items={[
                                    {
                                        key: "rules",
                                        label: (
                                            <span className="flex items-center gap-2 px-1 py-1 font-medium">
                                                <SettingOutlined />
                                                1. Company Rules & Staffing
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "team",
                                        label: (
                                            <span className="flex items-center gap-2 px-1 py-1 font-medium">
                                                <TeamOutlined />
                                                2. Team, Requests & Leave
                                                <Badge count={team.length} color="#2f5bea" showZero />
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "schedule",
                                        label: (
                                            <span className="flex items-center gap-2 px-1 py-1 font-medium">
                                                <CalendarOutlined />
                                                3. Generated Roster & Heatmap
                                                {solvedState && (
                                                    <Tag
                                                        color={solvedState.met.hard === 0 ? "success" : "warning"}
                                                        className="m-0 rounded-full text-xs"
                                                    >
                                                        {Math.round(solvedState.met.score * 1000) / 10}%
                                                    </Tag>
                                                )}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "optimizer",
                                        label: (
                                            <span className="flex items-center gap-2 px-1 py-1 font-medium">
                                                <RocketOutlined />
                                                4. AI Optimizer & OR-Tools (CP-SAT)
                                            </span>
                                        ),
                                    },
                                ]}
                            />
                        </div>

                        {activeMainTab === "rules" && renderCompanyRulesSection()}
                        {activeMainTab === "team" && renderTeamAndAvailabilitySection()}
                        {activeMainTab === "schedule" && renderScheduleAndResultsSection()}
                        {activeMainTab === "optimizer" && renderOptimizerAndOrToolsSection()}
                    </div>
                ) : (
                    /* Full Page View (All sections stacked with generous spacing) */
                    <div className="space-y-8">
                        {renderCompanyRulesSection()}
                        {renderTeamAndAvailabilitySection()}
                        {renderScheduleAndResultsSection()}
                        {renderOptimizerAndOrToolsSection()}
                    </div>
                )}

                {/* Explicit bottom breathing spacer inside scroll area */}
                <div className="h-16 w-full shrink-0" />
            </div>

            {/* ── Interactive Click-to-Edit Shift Cell Modal ───────────────────── */}
            <Modal
                title={
                    editingCell
                        ? `Edit Shift — ${editingCell.memberName} (${dayNameForIso(editingCell.dateIso)} ${editingCell.dateIso})`
                        : "Edit Shift"
                }
                open={Boolean(editingCell)}
                onCancel={() => setEditingCell(null)}
                onOk={handleSaveManualShiftEdit}
                okText="Apply Shift Change"
            >
                {editingCell && (
                    <div className="space-y-4 py-3">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <span className="font-medium text-slate-700">Day Status</span>
                            <Segmented
                                value={editingCell.isOff ? "off" : "work"}
                                onChange={(v) =>
                                    setEditingCell((prev) =>
                                        prev ? { ...prev, isOff: v === "off" } : null,
                                    )
                                }
                                options={[
                                    { label: "Working Shift", value: "work" },
                                    { label: "Day Off (OFF)", value: "off" },
                                ]}
                            />
                        </div>

                        {!editingCell.isOff && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Shift Start Time
                                    </label>
                                    <Select
                                        size="large"
                                        value={editingCell.startSlot}
                                        onChange={(v) =>
                                            setEditingCell((prev) =>
                                                prev ? { ...prev, startSlot: v } : null,
                                            )
                                        }
                                        className="w-full"
                                    >
                                        {parsedStartSlots.map((slot) => (
                                            <Option key={slot} value={slot}>
                                                {slotToTimeStr(slot)}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Paid Work Hours
                                    </label>
                                    <InputNumber
                                        size="large"
                                        min={config.minD}
                                        max={config.maxD}
                                        step={0.5}
                                        value={editingCell.hours}
                                        onChange={(v) =>
                                            setEditingCell((prev) =>
                                                prev ? { ...prev, hours: Number(v) || 8 } : null,
                                            )
                                        }
                                        addonAfter="hrs"
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ── Save Roster Record Modal ──────────────────────────────────────── */}
            <Modal
                title="Save Roster Record & Calculations"
                open={saveRecordModalOpen}
                onCancel={() => setSaveRecordModalOpen(false)}
                onOk={handleSaveRosterRecord}
                confirmLoading={savingRecord}
                okText="Save Roster Record"
            >
                <div className="space-y-3 py-2">
                    <Text className="text-xs text-slate-500">
                        Save a permanent snapshot of this solved roster, its KPIs, and hourly coverage calculations to your company account database.
                    </Text>
                    <Input
                        size="large"
                        placeholder={`${accountMeta?.companyName || "Company"} Roster ${config.ws} (${config.weeks}w)`}
                        value={recordTitleInput}
                        onChange={(e) => setRecordTitleInput(e.target.value)}
                    />
                </div>
            </Modal>

            {/* ── Saved Roster Records History Drawer ───────────────────────────── */}
            <Drawer
                title="Saved Roster Records & Historical Calculations"
                open={recordsDrawerOpen}
                onClose={() => setRecordsDrawerOpen(false)}
                width={520}
            >
                {savedRecords.length === 0 ? (
                    <Empty description="No saved roster records yet. Solve a roster and click 'Save Record'." />
                ) : (
                    <div className="space-y-3">
                        {savedRecords.map((rec) => (
                            <Card key={rec.id} size="small" className="rounded-xl border-slate-200 shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-slate-800">{rec.name}</div>
                                        <div className="mt-0.5 text-xs text-slate-500">
                                            Starts: {rec.startDate} · {rec.weeks} week(s) · Saved{" "}
                                            {new Date(rec.createdAt).toLocaleString()}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            <Tag
                                                color={
                                                    rec.solverEngine === "ortools-cpsat" ? "purple" : "blue"
                                                }
                                            >
                                                {rec.solverEngine === "ortools-cpsat"
                                                    ? "Google OR-Tools (CP-SAT)"
                                                    : "Constraint Solver"}
                                            </Tag>
                                            <Tag color="green">
                                                Coverage:{" "}
                                                {Math.round(((rec.metrics?.score ?? 1) as number) * 1000) / 10}%
                                            </Tag>
                                            <Tag color={rec.metrics?.hard ? "red" : "success"}>
                                                Hard Violations: {Math.round((rec.metrics?.hard || 0) * 100) / 100}
                                            </Tag>
                                        </div>
                                    </div>
                                    <Space direction="vertical" size="small">
                                        <Button
                                            size="small"
                                            type="primary"
                                            onClick={() => handleLoadSavedRecord(rec)}
                                            style={{ background: "#2f5bea" }}
                                        >
                                            Load
                                        </Button>
                                        <Popconfirm
                                            title="Delete this roster record?"
                                            onConfirm={() => handleDeleteSavedRecord(rec.id)}
                                        >
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Drawer>

            {/* ── Modal: Import Users from Company Account ──────────────────── */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                        <UsergroupAddOutlined className="text-blue-600 text-lg" />
                        <span>Import Users from Company Account</span>
                    </div>
                }
                open={importUsersModalVisible}
                onCancel={() => {
                    setImportUsersModalVisible(false);
                    setSelectedUserIdsToImport([]);
                }}
                onOk={handleImportCompanyUsers}
                okText={`Import ${selectedUserIdsToImport.length > 0 ? selectedUserIdsToImport.length : ""} Selected User(s)`}
                okButtonProps={{
                    disabled: selectedUserIdsToImport.length === 0,
                    style: { background: "#2f5bea" },
                }}
                width={680}
            >
                <div className="space-y-4 py-2">
                    <Alert
                        type="info"
                        showIcon
                        message="Select specific company users to add to your roster, and pick which team to assign them to. Users not selected will NOT appear in the roster."
                    />

                    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between border border-slate-200">
                        <span className="text-sm font-semibold text-slate-700">Assign Selected Users To Team:</span>
                        <Select
                            value={importTargetTeam}
                            onChange={(val) => setImportTargetTeam(val)}
                            style={{ minWidth: 200 }}
                        >
                            {availableTeams.map((t) => (
                                <Option key={t} value={t}>
                                    {t} Team
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <Table
                        size="small"
                        rowKey="id"
                        pagination={{ pageSize: 6, size: "small" }}
                        rowSelection={{
                            selectedRowKeys: selectedUserIdsToImport,
                            onChange: (keys) => setSelectedUserIdsToImport(keys as number[]),
                        }}
                        dataSource={(accountMeta?.allCompanyUsers || []).map((u) => {
                            const isAlreadyInTeam = team.some((m) => m.userId === u.id || m.id === u.id);
                            return { ...u, isAlreadyInTeam };
                        })}
                        columns={[
                            {
                                title: "User Name",
                                dataIndex: "name",
                                render: (text, record: any) => (
                                    <div className="font-medium text-slate-800">
                                        {text}
                                        {record.isAlreadyInTeam && (
                                            <Tag color="default" className="ml-2 text-[10px]">
                                                Already In Roster
                                            </Tag>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                title: "Email",
                                dataIndex: "email",
                                render: (email) => <span className="text-xs text-slate-500">{email || "—"}</span>,
                            },
                            {
                                title: "Company Role",
                                dataIndex: "role",
                                render: (role) => (
                                    <Tag color={role === "Admin" ? "purple" : "geekblue"} className="text-xs">
                                        {role || "User"}
                                    </Tag>
                                ),
                            },
                        ]}
                    />
                </div>
            </Modal>

            {/* ── Modal: Manage Teams / Departments ────────────────────────── */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                        <ApartmentOutlined className="text-purple-600 text-lg" />
                        <span>Manage Teams & Departments</span>
                    </div>
                }
                open={manageTeamsModalVisible}
                onCancel={() => {
                    setManageTeamsModalVisible(false);
                    setNewTeamNameInput("");
                }}
                footer={[
                    <Button key="close" type="primary" onClick={() => setManageTeamsModalVisible(false)} style={{ background: "#2f5bea" }}>
                        Done
                    </Button>,
                ]}
                width={560}
            >
                <div className="space-y-4 py-2">
                    <p className="text-xs text-slate-500 m-0">
                        Define departments or teams for your staff (e.g. Reception, Operator, Concierge, Housekeeping, Bar, Security). You can solve rosters for each team independently.
                    </p>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="New team name (e.g. Concierge, Operator)..."
                            value={newTeamNameInput}
                            onChange={(e) => setNewTeamNameInput(e.target.value)}
                            onPressEnter={handleCreateNewTeam}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateNewTeam}
                            style={{ background: "#7c3aed" }}
                        >
                            Add Team
                        </Button>
                    </div>

                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {availableTeams.map((tName) => {
                            const count = team.filter((m) => (m.teamName || "Reception") === tName).length;
                            return (
                                <div key={tName} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-2.5">
                                        <ApartmentOutlined className="text-purple-600" />
                                        <span className="font-semibold text-slate-800">{tName} Team</span>
                                        <Tag color="blue" className="rounded-full text-xs">
                                            {count} member{count === 1 ? "" : "s"}
                                        </Tag>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setSelectedTeam(tName);
                                                setManageTeamsModalVisible(false);
                                                message.success(`Active roster scope switched to ${tName} Team`);
                                            }}
                                        >
                                            Select Scope
                                        </Button>
                                        {count === 0 && (
                                            <Popconfirm
                                                title={`Delete ${tName} team?`}
                                                onConfirm={() => handleDeleteTeam(tName)}
                                                okText="Delete"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button size="small" danger icon={<DeleteOutlined />} />
                                            </Popconfirm>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
