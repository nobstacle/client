// Roster Constraint Solver Engine, Calculations, AI What-If Analyzer & Google OR-Tools (CP-SAT) Builder

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface RosterConfig {
    weeks: number;
    T: number; // Total working hours / week (per employee)
    minD: number; // Minimum working hours / day
    maxD: number; // Maximum working hours / day
    minOff: number; // Minimum off days / week
    maxOff: number; // Maximum off days / week
    rest: number; // Minimum rest hours between duties
    starts: string; // Comma-separated HH:MM start times
    spSk: "Yes" | "No"; // Spread Skilled
    spLd: "Yes" | "No"; // Spread Leaders
    cons: "Yes" | "No"; // Prefer same shift start all week
    ws: string; // Roster start Monday (YYYY-MM-DD)
    minH: number[]; // 24 hourly minimums
    maxH: number[]; // 24 hourly maximums
    pkW: Array<{ a: string; b: string }>;
    opW: Array<{ a: string; b: string }>;
    brk: number;
}

export interface TeamMember {
    id: number;
    userId?: number;
    name: string;
    email?: string;
    role?: string;
    sk: boolean; // Skilled
    ld: boolean; // Leader
    roleTitle?: string;
}

export interface TeamRequest {
    id?: string;
    m: number; // member id
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    t: number; // -1 for Off, or quarter-slot [0..95] for duty start
    g: boolean; // Granted (hard constraint)
}

export interface TeamAbsence {
    id?: string;
    m: number; // member id
    r: "Annual Leave" | "Sick Leave" | "Training" | "Public Holiday" | string;
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    t1: string; // optional HH:MM start
    t2: string; // optional HH:MM end
}

export interface ExpandedRequestDay {
    m: number;
    date: string;
    t: number;
    g: boolean;
}

export interface EmployeeScheduleState {
    m: TeamMember;
    abs: boolean[];
    pa: boolean[];
    roff: boolean[];
    rst: number[];
    gOff: boolean[];
    gSt: number[];
    gStO: number[];
    h: number[]; // hours worked on day g
    s: number[]; // start quarter-slot on day g
    bo: number[]; // break offset
    Tw: number[]; // achievable target hours for week w
    Tw0: number[]; // pro-rata target hours for week w
    flag: boolean;
    T: number;
}

export interface RosterMetrics {
    offBad: number;
    gT: number;
    gM: number;
    under: number;
    pkU: number;
    over: number;
    skU: number;
    ldU: number;
    opO: number;
    sw: number;
    rV: number;
    mT: number;
    mO: number;
    mx: number;
    oT: number;
    oM: number;
    sT: number;
    sM: number;
    sameS: number;
    ew: number;
    b2b: number;
    b2T: number;
    flags: number;
    hard: number;
    unmet: number;
    un: Array<{ n: string; bad: string[] }>;
    strict: boolean;
    ratio: number;
    score: number;
}

export interface SolvedRosterState {
    c: RosterConfig;
    E: EmployeeScheduleState[];
    cov: Int32Array | number[];
    cs: Int32Array | number[];
    cl: Int32Array | number[];
    bk: Int32Array | number[];
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
    met: RosterMetrics;
    solverEngine?: "heuristic" | "ortools-cpsat" | "ai-fix";
    orToolsMeta?: {
        status: string;
        objectiveValue?: number;
        bestObjectiveBound?: number;
        slackViolations?: number;
        solveTimeMs?: number;
    };
}

export interface CapacityWeekRow {
    week: number;
    requiredHours: number;
    availableHours: number;
    balance: number;
    utilizationPct: number;
}

export interface CapacityCalculationResult {
    rows: CapacityWeekRow[];
    totalRequired: number;
    totalAvailable: number;
    totalBalance: number;
    totalUtilizationPct: number;
    shortfallHours: number;
    extraMembersNeeded: number;
    roughMinTeamSize: number;
    feasibleDaysPerWeek: number[];
    strictEnforced: boolean;
    maxBelowMinCount: number;
    exceedsMaxStaffCeiling: boolean;
    maxStaffCeilingHours: number;
    messages: Array<{ type: "ok" | "bad" | "info"; text: string }>;
}

export interface SpareSuggestion {
    i: number;
    g: number;
    pri: number;
    name: string;
    hrs: number;
    req: boolean;
    over: boolean;
}

export interface AiCandidateScenario {
    l: string;
    p: { x?: number; minH?: number; maxS?: number };
    rel?: number;
    S: SolvedRosterState;
}

export interface AiAnalysisResult {
    findings: Array<{ type: "ok" | "bad" | "info"; html: string }>;
    candidates: AiCandidateScenario[];
    recommended: AiCandidateScenario;
    hardResolved: number;
    requestsResolved: number;
}

export function getNextMondayIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
}

export function createDefaultRosterConfig(stationCount = 1, teamCount = 1): RosterConfig {
    const effStations = Math.max(1, Number(stationCount) || 1);
    const effTeam = Math.max(1, Number(teamCount) || 1);
    const minStaff = Math.max(1, Math.min(effStations, Math.max(1, Math.floor(effTeam / 3))));
    const maxStaff = Math.max(minStaff, effTeam);
    return {
        weeks: 1,
        T: 40,
        minD: 8,
        maxD: 10,
        minOff: 1,
        maxOff: 2,
        rest: 12,
        starts: "06:00,14:00,22:00",
        spSk: "No",
        spLd: "No",
        cons: "Yes",
        ws: getNextMondayIso(),
        minH: Array(24).fill(minStaff),
        maxH: Array(24).fill(maxStaff),
        pkW: [],
        opW: [],
        brk: 0,
    };
}

export const parseTimeHours = (t: string): number => {
    const [a, b] = String(t || "0:0").split(":").map(Number);
    return (a || 0) + (b || 0) / 60;
};

export const addDaysIso = (baseIso: string, days: number): string => {
    const x = new Date(baseIso + "T00:00:00Z");
    if (isNaN(x.getTime())) return baseIso;
    x.setUTCDate(x.getUTCDate() + days);
    return x.toISOString().slice(0, 10);
};

export const dayIndexFromStart = (ws: string, dateIso: string): number => {
    return Math.round((Date.parse(dateIso) - Date.parse(ws)) / 864e5);
};

export const dayNameForIso = (dateIso: string): string => {
    const d = new Date(dateIso + "T00:00:00Z");
    if (isNaN(d.getTime())) return "";
    return DAY_NAMES[(d.getUTCDay() + 6) % 7];
};

export const parseStarts = (startsStr: string): number[] => {
    return Array.from(
        new Set(
            String(startsStr || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((x) => Math.round(parseTimeHours(x) * 4) % 96)
                .filter((x) => !isNaN(x) && x >= 0 && x < 96),
        ),
    ).sort((a, b) => a - b);
};

export const slotToTimeStr = (q: number): string => {
    const norm = ((Math.floor(q) % 96) + 96) % 96;
    return (
        String(Math.floor(norm / 4) % 24).padStart(2, "0") +
        ":" +
        String((norm % 4) * 15).padStart(2, "0")
    );
};

export const requestsOverlap = (a: TeamRequest, b: TeamRequest): boolean => {
    return a.m === b.m && a.from <= b.to && b.from <= a.to;
};

export const expandRequestsByDay = (requests: TeamRequest[]): ExpandedRequestDay[] => {
    const out: ExpandedRequestDay[] = [];
    requests.forEach((r) => {
        const n = Math.min(120, Math.max(0, dayIndexFromStart(r.from, r.to)));
        for (let i = 0; i <= n; i++) {
            out.push({ m: r.m, date: addDaysIso(r.from, i), t: r.t, g: r.g });
        }
    });
    return out;
};

export function qSet(a?: string, b?: string): boolean[] {
    if (!a || !b) return Array(96).fill(false);
    const s = Math.round(parseTimeHours(a) * 4);
    const e = Math.round(parseTimeHours(b) * 4);
    return Array.from({ length: 96 }, (_, q) => (s <= e ? q >= s && q < e : q >= s || q < e));
}

export function winSet(L?: Array<{ a: string; b: string }>): boolean[] {
    const r = Array(96).fill(false);
    (L || []).forEach((x) =>
        qSet(x.a, x.b).forEach((v, q) => {
            if (v) r[q] = true;
        }),
    );
    return r;
}

export function needV(c: RosterConfig, pk: boolean[]): number[] {
    return pk.map((_, q) => c.minH[Math.floor(q / 4)] ?? 0);
}

export function absDays(c: RosterConfig, ab: TeamAbsence[], id: number, D: number): boolean[] {
    return Array.from({ length: D }, (_, g) => {
        const dt = addDaysIso(c.ws, g);
        return ab.some((a) => !a.t1 && a.m === id && a.from <= dt && dt <= a.to);
    });
}

export function paArr(c: RosterConfig, ab: TeamAbsence[], id: number, D: number): boolean[] {
    const r = Array(96 * D).fill(false);
    ab.forEach((a) => {
        if (a.m !== id || !a.t1) return;
        const s1 = Math.round(parseTimeHours(a.t1) * 4);
        const e1 = a.t2 && parseTimeHours(a.t2) > parseTimeHours(a.t1) ? Math.round(parseTimeHours(a.t2) * 4) : 96;
        for (let d = 0; d < D; d++) {
            const dt = addDaysIso(c.ws, d);
            if (dt >= a.from && dt <= a.to) {
                for (let q = s1; q < e1; q++) r[d * 96 + q] = true;
            }
        }
    });
    return r;
}

export function calculateCapacity(
    c: RosterConfig,
    team: TeamMember[],
    absences: TeamAbsence[],
): CapacityCalculationResult {
    const W = Math.max(1, Math.min(8, Math.floor(c.weeks) || 1));
    const req = c.minH.reduce((a, b) => a + b, 0) * 7;
    const ok = Boolean(c.ws && !isNaN(Date.parse(c.ws)));
    const rows: CapacityWeekRow[] = [];
    let tr = 0;
    let ta = 0;

    for (let w = 0; w < W; w++) {
        let av = 0;
        team.forEach((m) => {
            let na = 0;
            if (ok) {
                na = absDays(c, absences, m.id, 7 * W)
                    .slice(w * 7, w * 7 + 7)
                    .filter(Boolean).length;
            }
            av += Math.round((c.T * (7 - na)) / 7);
        });
        tr += req;
        ta += av;
        rows.push({
            week: w + 1,
            requiredHours: req,
            availableHours: av,
            balance: av - req,
            utilizationPct: av ? Math.round((req / av) * 100) : 0,
        });
    }

    const hi = c.maxH.filter((v, h) => v < c.minH[h]).length;
    const mxT = c.maxH.reduce((a, b) => a + b, 0) * 7;
    const short = tr - ta;
    const perW = Math.max(1, c.T);
    const messages: Array<{ type: "ok" | "bad" | "info"; text: string }> = [];

    if (short > 0) {
        messages.push({
            type: "bad",
            text: `Shortfall of ${short}h across ${W} week(s): about ${Math.ceil(short / W / perW)} more team member(s) needed.`,
        });
    } else {
        messages.push({
            type: "ok",
            text: `Enough hours available (${-short}h spare across ${W} week${W > 1 ? "s" : ""}).`,
        });
    }

    messages.push({
        type: "info",
        text: `Rough minimum team size for these hourly minimums: ${Math.ceil(req / perW)} (you have ${team.length}). Rest rules and day-off limits can require a few more.`,
    });

    const T = c.T;
    const mn = Math.ceil(c.minD * 4 - 1e-9) / 4;
    const mx = Math.floor(c.maxD * 4 + 1e-9) / 4;
    const fe: number[] = [];
    for (let n = Math.max(1, 7 - c.maxOff); n <= 7 - c.minOff; n++) {
        if (n * mn <= T && T <= n * mx) fe.push(n);
    }
    if (fe.length) {
        messages.push({
            type: "info",
            text: `Weekly ${T}h fits ${fe.join(" or ")} working days of ${mn}–${mx}h.`,
        });
    } else {
        messages.push({
            type: "bad",
            text: `Weekly ${T}h cannot be split into days of ${mn}–${mx}h with ${c.minOff}–${c.maxOff} off day(s) per week: weekly hours will be reduced to the nearest achievable total (never above ${T}h).`,
        });
    }

    const pr = ta ? tr / ta : 0;
    const strictEnforced = pr <= 0.95;
    messages.push({
        type: strictEnforced ? "ok" : "info",
        text: `Required is ${Math.round(pr * 100)}% of available: hourly minimums are ${strictEnforced ? "enforced strictly (≤ 95%)" : "best effort (above 95%)"}.`,
    });

    if (hi) {
        messages.push({
            type: "bad",
            text: `${hi} hour(s) have a maximum below the minimum (the minimum is used).`,
        });
    }

    if (ta > mxT * W) {
        messages.push({
            type: "bad",
            text: `Available hours (${ta}h) exceed what the maximum staff limit can absorb (${mxT * W}h).`,
        });
    }

    return {
        rows,
        totalRequired: tr,
        totalAvailable: ta,
        totalBalance: ta - tr,
        totalUtilizationPct: ta ? Math.round((tr / ta) * 100) : 0,
        shortfallHours: Math.max(0, short),
        extraMembersNeeded: short > 0 ? Math.ceil(short / W / perW) : 0,
        roughMinTeamSize: Math.ceil(req / perW),
        feasibleDaysPerWeek: fe,
        strictEnforced,
        maxBelowMinCount: hi,
        exceedsMaxStaffCeiling: ta > mxT * W,
        maxStaffCeilingHours: mxT * W,
        messages,
    };
}

export function suppl(c: RosterConfig, team: TeamMember[], absences: TeamAbsence[]): number {
    let t = 0;
    team.forEach((m) => {
        const a = absDays(c, absences, m.id, 7 * c.weeks);
        for (let w = 0; w < c.weeks; w++) {
            t += Math.round((c.T * (7 - a.slice(w * 7, w * 7 + 7).filter(Boolean).length)) / 7);
        }
    });
    return t / c.weeks;
}

export function tgtProf(
    c: RosterConfig,
    pk: boolean[],
    need: number[],
    supply: number,
    op: boolean[],
    mxA?: number[],
): number[] {
    const maxArr = mxA || Array(96).fill(99);
    const sm = need.reduce((a, b) => a + b, 0) * 7;
    if (supply <= sm) return need.slice();
    const f = (L: number) =>
        need.reduce((a, n, h) => a + (op[h] ? n : Math.min(maxArr[h], Math.max(n, L))), 0) * 7;
    let lo = 0;
    let hi = Math.max(...maxArr);
    for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < supply) lo = mid;
        else hi = mid;
    }
    let tg = need.map((n, h) => (op[h] ? n : Math.min(maxArr[h], Math.max(n, lo))));
    const rest = supply - tg.reduce((a, b) => a + b, 0) * 7;
    const oh = op.filter(Boolean).length;
    if (rest > 0 && oh) {
        tg = tg.map((v, h) => (op[h] ? Math.min(maxArr[h], v + rest / 7 / oh) : v));
    }
    return tg;
}

const R = (n: number) => Math.floor(Math.random() * n);
const shuf = <T,>(a: T[]): T[] =>
    a
        .map((x) => [Math.random(), x] as [number, T])
        .sort((p, q) => p[0] - q[0])
        .map((x) => x[1]);

function devc(a: number[]): number {
    const m: Record<number, number> = {};
    a.forEach((v) => (m[v] = (m[v] || 0) + 1));
    const w = Object.values(m);
    return w.length ? a.length - Math.max(...w) : 0;
}

export function computeStats(S: Omit<SolvedRosterState, "met">): SolvedRosterState {
    const { c, E, cov, cs, cl, bk, need, pk, bl, RQ, W, D, QN } = S;
    let under = 0,
        pkU = 0,
        over = 0,
        skU = 0,
        ldU = 0,
        opO = 0,
        sw = 0,
        inR = 0;
    const op = winSet(c.opW);

    for (let k = 0; k < QN; k++) {
        const nd = need[k % 96];
        const v = cov[k];
        if (c.spSk === "Yes" && cs[k] < 1) skU += 0.25;
        if (c.spLd === "Yes" && cl[k] < 1) ldU += 0.25;
        const u = 0.25 * Math.max(0, nd - v);
        under += u;
        if (pk[k % 96]) pkU += u;
        over += 0.25 * Math.max(0, v - c.maxH[(k % 96) >> 2]);
        if (v >= nd && v <= c.maxH[(k % 96) >> 2]) inR++;
        if (op[k % 96]) opO += 0.25 * Math.max(0, v - nd);
        sw = Math.max(sw, Math.abs(v - cov[(k + QN - 1) % QN]));
    }

    let offBad = 0,
        gT = 0,
        gM = 0,
        rV = 0,
        mT = 0,
        mO = 0,
        oT = 0,
        oM = 0,
        sT = 0,
        sM = 0,
        sameS = 0,
        ew = 0,
        b2b = 0,
        b2T = 0,
        flags = 0;
    const un: Array<{ n: string; bad: string[] }> = [];

    E.forEach((e) => {
        const bad: string[] = [];
        let fl = false;
        for (let g = 0; g < D; g++) {
            if ((e.h[g] && e.h[g] < c.minD) || e.h[g] > c.maxD) fl = true;
            if (g < D - 1 && e.h[g] && e.h[g + 1] && 96 + e.s[g + 1] - (e.s[g] + 4 * e.h[g] + bl) < RQ) {
                rV++;
            }
            if (e.h[g]) {
                mT++;
                mO++;
            }
            if (e.gOff[g]) {
                gT++;
                if (!e.h[g]) gM++;
            }
            if (e.gStO[g] >= 0) {
                gT++;
                if (e.h[g] && e.s[g] === e.gStO[g]) gM++;
            }
            if (e.roff[g]) {
                oT++;
                if (!e.h[g]) oM++;
                else bad.push("off " + addDaysIso(c.ws, g).slice(5));
            }
            if (e.rst[g] >= 0 && !e.abs[g]) {
                sT++;
                if (e.h[g] && e.s[g] === e.rst[g]) sM++;
                else bad.push("start " + slotToTimeStr(e.rst[g]) + " on " + addDaysIso(c.ws, g).slice(5));
            }
        }

        for (let w = 0; w < W; w++) {
            let tot = 0;
            const of: number[] = [];
            const st = new Set<number>();
            for (let d = 0; d < 7; d++) {
                const g = w * 7 + d;
                tot += e.h[g];
                if (e.h[g]) st.add(e.s[g]);
                else of.push(d);
            }
            let fo = 0;
            for (let d = 0; d < 7; d++) {
                const g = w * 7 + d;
                if (e.abs[g] || e.gOff[g]) fo++;
            }
            if (of.length < c.minOff || of.length > Math.max(c.maxOff, fo)) offBad++;
            if (Math.abs(tot - e.Tw[w]) > 1e-6 || e.Tw[w] < e.Tw0[w] || of.length < c.minOff) fl = true;
            if (st.size) {
                ew++;
                if (st.size === 1) sameS++;
            }
            if (of.length === 2) {
                b2T++;
                if (of[1] - of[0] === 1) b2b++;
            }
        }
        if (fl) flags++;
        if (bad.length) un.push({ n: e.m.name, bad });
    });

    let mx = 0;
    for (let k = 0; k < QN; k++) mx = Math.max(mx, bk[k]);

    const met: RosterMetrics = {
        offBad,
        gT,
        gM,
        under,
        pkU,
        over,
        skU,
        ldU,
        opO,
        sw,
        rV,
        mT,
        mO,
        mx,
        oT,
        oM,
        sT,
        sM,
        sameS,
        ew,
        b2b,
        b2T,
        flags,
        hard: under + over + flags + skU + ldU + (mT - mO) + rV + (gT - gM) + offBad,
        unmet: oT - oM + (sT - sM),
        un,
        strict: S.strict,
        ratio: S.availH ? S.reqH / S.availH : 0,
        score: QN ? inR / QN : 1,
    };

    return { ...S, met };
}

export function solveRoster(
    rawCfg: RosterConfig,
    team: TeamMember[],
    ab: TeamAbsence[],
    rq0: ExpandedRequestDay[],
    baseIters = 150000,
): SolvedRosterState {
    const c: RosterConfig = {
        ...rawCfg,
        weeks: Math.max(1, Math.min(8, Math.floor(rawCfg.weeks) || 1)),
        minH: rawCfg.minH.slice(0, 24),
        maxH: rawCfg.maxH.slice(0, 24).map((v, h) => Math.max(v, rawCfg.minH[h] ?? 0)),
    };

    const W = c.weeks;
    const D = 7 * W;
    const QN = 96 * D;
    const N = team.length;
    const pk = winSet(c.pkW);
    const need = needV(c, pk);
    const cov = new Int32Array(QN);
    const cs = new Int32Array(QN);
    const cl = new Int32Array(QN);
    const bk = new Int32Array(QN);

    const ST = parseStarts(c.starts);
    if (!ST.length) ST.push(24);

    const mnD = Math.ceil(c.minD * 4 - 1e-9) / 4;
    const mxD = Math.floor(c.maxD * 4 + 1e-9) / 4;
    const ml = Array(96).fill(false);
    const bl = 0;
    const RQ = Math.round(c.rest * 4);

    const pickBo = (hh: number) => 4 + R(Math.max(1, 4 * hh - 7));
    const gapBadAt = (h: number[], s: number[], g: number) =>
        g > 0 && g < D && h[g - 1] > 0 && h[g] > 0 && 96 + s[g] - (s[g - 1] + 4 * h[g - 1] + bl) < RQ;

    const E: EmployeeScheduleState[] = team.map((m, ix) => {
        const abs = absDays(c, ab, m.id, D);
        const pa = paArr(c, ab, m.id, D);
        const roff = Array(D).fill(false);
        const rst = Array(D).fill(-1);
        const gOff = Array(D).fill(false);
        const gStO = Array(D).fill(-1);

        rq0.forEach((r) => {
            if (r.m !== m.id) return;
            const g = dayIndexFromStart(c.ws, r.date);
            if (g < 0 || g >= D) return;
            if (r.t < 0) {
                roff[g] = true;
                if (r.g) gOff[g] = true;
            } else {
                rst[g] = r.t;
                if (r.g) gStO[g] = r.t;
            }
        });

        const gSt = gStO.map((x, g) => (x >= 0 && !abs[g] && !gOff[g] && ST.includes(x) ? x : -1));
        const h = Array(D).fill(0);
        const s = Array(D).fill(0);
        const bo = Array(D).fill(0);
        const Tw: number[] = [];
        const Tw0: number[] = [];
        let flag = false;
        const fr = rst.find((x) => x >= 0);
        const base0 = fr !== undefined ? fr : ST[ix % ST.length];

        for (let w = 0; w < W; w++) {
            const days = [0, 1, 2, 3, 4, 5, 6].map((d) => w * 7 + d);
            const na = days.filter((g) => abs[g]).length;
            const gc = days.filter((g) => gOff[g] && !abs[g]).length;
            const av = 7 - na - gc;
            let T = Math.round(((c.T * (7 - na)) / 7) * 4) / 4;
            const T0 = T;
            let lw = days.filter((g) => gSt[g] >= 0);
            const nmax = Math.min(av, 7 - c.minOff);
            const ns: number[] = [];
            for (let n = Math.max(1, lw.length, 7 - Math.max(c.maxOff, na + gc)); n <= nmax; n++) {
                if (n * mnD <= T && T <= n * mxD) ns.push(n);
            }
            const rc = days.filter((g) => roff[g] && !abs[g]).length;
            let n = 0;
            let upN = 0;
            if (!ns.length) {
                for (let n2 = Math.max(1, lw.length, 7 - Math.max(c.maxOff, na + gc)); n2 <= nmax; n2++) {
                    if (n2 * mnD <= Math.min(c.T, n2 * mxD) + 1e-9) {
                        upN = n2;
                        break;
                    }
                }
            }
            if (ns.length) {
                const want = Math.max(c.minOff, Math.min(c.maxOff, na + rc));
                n = shuf(ns).sort((a, b) => Math.abs(7 - a - want) - Math.abs(7 - b - want))[0];
            } else if (upN > 0) {
                n = upN;
                T = Math.max(T, n * mnD);
            } else if (T < mnD || nmax < 1) {
                n = 0;
                T = 0;
            } else {
                n = Math.max(1, Math.min(nmax, Math.floor(T / mnD + 1e-9)));
                T = Math.min(T, n * mxD);
            }
            if (n < lw.length) {
                lw.forEach((g) => (gSt[g] = -1));
                lw = [];
            }
            Tw.push(T);
            Tw0.push(T0);
            if (T < T0) flag = true;

            const free = days.filter((g) => !abs[g] && !gOff[g]);
            const ex = free.length - n;
            const offC = free.filter((g) => !lw.includes(g));
            let off = shuf(offC.filter((g) => roff[g]))
                .concat(
                    shuf(offC.filter((g) => !roff[g] && rst[g] < 0)),
                    shuf(offC.filter((g) => !roff[g] && rst[g] >= 0)),
                )
                .slice(0, ex);

            if (ex === 2 && rc === 0) {
                const pr = offC.filter(
                    (g) => offC.includes(g + 1) && g % 7 < 6 && rst[g] < 0 && rst[g + 1] < 0,
                );
                if (pr.length) {
                    const g0 = pr[R(pr.length)];
                    off = [g0, g0 + 1];
                }
            }

            const work = free.filter((g) => !off.includes(g));
            if (!work.length) {
                flag = true;
                continue;
            }

            const Tq = Math.round(T * 4);
            const base = Math.floor(Tq / work.length);
            const rem = Tq - base * work.length;
            shuf(work).forEach((g, k) => {
                h[g] = Math.min(mxD, (base + (k < rem ? 1 : 0)) / 4);
                s[g] = base0;
                bo[g] = pickBo(h[g]);
            });
            work.forEach((g) => {
                if (gSt[g] >= 0) {
                    s[g] = gSt[g];
                    bo[g] = pickBo(h[g]);
                } else if (rst[g] >= 0 && rst[g] !== base0) {
                    const old = s[g];
                    s[g] = rst[g];
                    if (gapBadAt(h, s, g) || gapBadAt(h, s, g + 1)) s[g] = old;
                    else bo[g] = pickBo(h[g]);
                }
            });
            if (Math.abs(work.reduce((a, g) => a + h[g], 0) - T) > 1e-9) flag = true;
        }

        return {
            m,
            abs,
            pa,
            roff,
            rst,
            gOff,
            gSt,
            gStO,
            h,
            s,
            bo,
            Tw,
            Tw0,
            flag,
            T: Tw.reduce((a, b) => a + b, 0),
        };
    });

    const mxq = Array.from({ length: 96 }, (_, q) => c.maxH[q >> 2]);
    const tg = tgtProf(c, pk, need, (E.reduce((a, e) => a + e.T, 0) / W) * 4, winSet(c.opW), mxq);

    const add = (i: number, g: number, sg: number) => {
        const e = E[i];
        const hh = e.h[g];
        if (!hh) return;
        const sp = 4 * hh + bl;
        const bs = e.bo[g];
        for (let k = 0; k < sp; k++) {
            const q = (g * 96 + e.s[g] + k) % QN;
            if (e.pa[q]) continue;
            if (k >= bs && k < bs + bl) {
                bk[q] += sg;
                continue;
            }
            cov[q] += sg;
            if (e.m.sk) cs[q] += sg;
            if (e.m.ld) cl[q] += sg;
        }
    };

    const reqH = (need.reduce((a, b) => a + b, 0) / 4) * 7 * W;
    const availH = E.reduce((a, e) => a + e.T, 0);
    const strict = reqH <= 0.95 * availH;
    const WU = strict ? 1500 : 100;

    const slotC = (k: number) => {
        const v = cov[k];
        const nd = need[k % 96];
        let x =
            WU * (Math.max(0, nd - v) + Math.max(0, v - c.maxH[(k % 96) >> 2])) +
            0.6 * (v - tg[k % 96]) ** 2 +
            0.4 * (v - cov[(k + QN - 1) % QN]) ** 2 +
            0.4 * bk[k] * bk[k];
        if (c.spSk === "Yes" && cs[k] < 1) x += 100;
        if (c.spLd === "Yes" && cl[k] < 1) x += 100;
        return x / 4;
    };

    const part = (L: number[]) => {
        let x = 0;
        for (let j = 0; j < L.length; j++) x += slotC(L[j]);
        return x;
    };

    const rqc = (i: number) => {
        const e = E[i];
        let x = 0;
        for (let g = 0; g < D; g++) {
            if (e.roff[g] && e.h[g]) x += 10;
            if (e.rst[g] >= 0 && !e.abs[g] && !(e.h[g] && e.s[g] === e.rst[g])) x += 4;
            if (!e.h[g]) continue;
            if (g < D - 1 && e.h[g + 1] && 96 + e.s[g + 1] - (e.s[g] + 4 * e.h[g] + bl) < RQ) x += 80;
        }
        for (let w = 0; w < W; w++) {
            const sw: number[] = [];
            const hw: number[] = [];
            const of: number[] = [];
            for (let d = 0; d < 7; d++) {
                const g = w * 7 + d;
                if (e.h[g]) {
                    sw.push(e.s[g]);
                    hw.push(e.h[g]);
                } else of.push(d);
            }
            if (c.cons === "Yes") x += 8 * devc(sw) + 2 * devc(hw);
            if (of.length === 2 && of[1] - of[0] !== 1) {
                const g0 = w * 7 + of[0];
                const g1 = w * 7 + of[1];
                if (!((e.roff[g0] || e.abs[g0]) && (e.roff[g1] || e.abs[g1]))) x += 6;
            }
        }
        return x;
    };

    const mark = new Int32Array(QN);
    let stamp = 0;
    const winL = (days: number[]) => {
        stamp++;
        const L: number[] = [];
        for (const d of days) {
            for (let k = 0; k < 146; k++) {
                const q = (d * 96 + k) % QN;
                if (mark[q] !== stamp) {
                    mark[q] = stamp;
                    L.push(q);
                }
            }
        }
        return L;
    };

    const snap = (e: EmployeeScheduleState, dl: number[]) =>
        dl.map((g) => [g, e.h[g], e.s[g], e.bo[g]] as [number, number, number, number]);
    const rest = (e: EmployeeScheduleState, sn: Array<[number, number, number, number]>) =>
        sn.forEach(([g, hVal, sVal, bVal]) => {
            e.h[g] = hVal;
            e.s[g] = sVal;
            e.bo[g] = bVal;
        });

    const rcnt = (i: number) => {
        const e = E[i];
        let n = 0;
        for (let g = 0; g < D; g++) {
            if (g > 0 && e.h[g] && e.h[g - 1] && 96 + e.s[g] - (e.s[g - 1] + 4 * e.h[g - 1] + bl) < RQ) n++;
            if (e.gOff[g] && e.h[g]) n++;
            if (e.gSt[g] >= 0 && !(e.h[g] && e.s[g] === e.gSt[g])) n++;
        }
        return n;
    };

    for (let i = 0; i < N; i++) for (let g = 0; g < D; g++) add(i, g, 1);

    const anneal = (its: number, T0: number) => {
        for (let it = 0; it < its && N; it++) {
            const Tt = T0 * Math.pow(0.01, it / its);
            if (N > 1 && Math.random() < 0.4) {
                const p = R(N);
                const q = R(N);
                if (p === q) continue;
                const ep = E[p];
                const eq = E[q];
                const kd = Math.random();
                let a = 0,
                    b = 0,
                    d1: number[] = [],
                    d2: number[] = [],
                    sp0 = 0,
                    sq0 = 0;
                if (kd < 0.35) {
                    const w = R(W);
                    a = w * 7 + R(7);
                    b = w * 7 + R(7);
                    if (
                        a === b ||
                        !ep.h[a] ||
                        ep.h[b] ||
                        ep.abs[b] ||
                        !eq.h[b] ||
                        eq.h[a] ||
                        eq.abs[a]
                    )
                        continue;
                    d1 = [a, b];
                    d2 = [a, b];
                } else if (kd < 0.5) {
                    a = R(D);
                    b = R(D);
                    if (!ep.h[a] || !eq.h[b] || ep.s[a] === eq.s[b]) continue;
                    d1 = [a];
                    d2 = [b];
                } else {
                    const w = R(W);
                    d1 = [];
                    d2 = [];
                    for (let d = 0; d < 7; d++) {
                        const g = w * 7 + d;
                        if (ep.h[g]) d1.push(g);
                        if (eq.h[g]) d2.push(g);
                    }
                    if (!d1.length || !d2.length) continue;
                    sp0 = ep.s[d1[0]];
                    sq0 = eq.s[d2[0]];
                    if (sp0 === sq0) continue;
                }
                const sp = snap(ep, d1);
                const sq = snap(eq, d2);
                const bef = rqc(p) + rqc(q);
                const rb = rcnt(p) + rcnt(q);
                const L = winL([...d1, ...d2]);
                const cb = part(L);
                d1.forEach((g) => add(p, g, -1));
                d2.forEach((g) => add(q, g, -1));
                if (kd < 0.35) {
                    ep.h[b] = ep.h[a];
                    ep.s[b] = ep.s[a];
                    ep.bo[b] = ep.bo[a];
                    ep.h[a] = 0;
                    eq.h[a] = eq.h[b];
                    eq.s[a] = eq.s[b];
                    eq.bo[a] = eq.bo[b];
                    eq.h[b] = 0;
                } else if (kd < 0.5) {
                    const t0 = ep.s[a];
                    ep.s[a] = eq.s[b];
                    eq.s[b] = t0;
                    ep.bo[a] = pickBo(ep.h[a]);
                    eq.bo[b] = pickBo(eq.h[b]);
                } else {
                    d1.forEach((g) => {
                        ep.s[g] = sq0;
                        ep.bo[g] = pickBo(ep.h[g]);
                    });
                    d2.forEach((g) => {
                        eq.s[g] = sp0;
                        eq.bo[g] = pickBo(eq.h[g]);
                    });
                }
                d1.forEach((g) => add(p, g, 1));
                d2.forEach((g) => add(q, g, 1));
                const dl = part(L) - cb + rqc(p) + rqc(q) - bef;
                if (rcnt(p) + rcnt(q) > rb || !(dl < 0 || Math.random() < Math.exp(-dl / Tt))) {
                    d1.forEach((g) => add(p, g, -1));
                    d2.forEach((g) => add(q, g, -1));
                    rest(ep, sp);
                    rest(eq, sq);
                    d1.forEach((g) => add(p, g, 1));
                    d2.forEach((g) => add(q, g, 1));
                }
                continue;
            }

            const i = R(N);
            const e = E[i];
            const wk: number[] = [];
            for (let g = 0; g < D; g++) if (e.h[g] > 0) wk.push(g);
            if (!wk.length) continue;
            const v = Math.random();
            let days: number[] = [];
            let ns0 = -1;
            let nh: number[] | null = null;
            let wst = 0;
            let stp = 1;

            if (v < 0.3) {
                days = [wk[R(wk.length)]];
            } else if (v < 0.45) {
                const w = (wk[R(wk.length)] / 7) | 0;
                days = wk.filter((g) => ((g / 7) | 0) === w);
                ns0 = ST[R(ST.length)];
            } else if (v < 0.62) {
                stp = [0.25, 0.25, 0.5, 1][R(4)];
                const a = wk[R(wk.length)];
                const b = wk[R(wk.length)];
                if (
                    a === b ||
                    ((a / 7) | 0) !== ((b / 7) | 0) ||
                    e.h[a] - stp < mnD - 1e-9 ||
                    e.h[b] + stp > mxD + 1e-9
                )
                    continue;
                days = [a, b];
            } else if (v < 0.74) {
                const w = (wk[R(wk.length)] / 7) | 0;
                const all = [0, 1, 2, 3, 4, 5, 6].map((d) => w * 7 + d);
                const wd = all.filter((x) => e.h[x]);
                const of = all.filter((x) => !e.h[x] && !e.abs[x]);
                const na = all.filter((x) => e.abs[x] || e.gOff[x]).length;
                nh = all.map((x) => e.h[x]);
                if (Math.random() < 0.5) {
                    if (wd.length < 2 || 7 - (wd.length - 1) > Math.max(c.maxOff, na)) continue;
                    const g = wd[R(wd.length)];
                    if (e.rst[g] >= 0) continue;
                    let H = Math.round(nh[g - w * 7] * 4);
                    nh[g - w * 7] = 0;
                    const oth = wd.filter((x) => x !== g);
                    let guard = 0;
                    while (H > 0 && guard++ < 1500) {
                        const x = oth[R(oth.length)];
                        if (nh[x - w * 7] + 0.25 <= mxD + 1e-9) {
                            nh[x - w * 7] += 0.25;
                            H--;
                        }
                    }
                    if (H > 0) continue;
                } else {
                    if (!of.length || 7 - (wd.length + 1) < c.minOff) continue;
                    const x = of[R(of.length)];
                    let H = Math.round(mnD * 4);
                    let guard = 0;
                    nh[x - w * 7] = mnD;
                    while (H > 0 && guard++ < 1500) {
                        const y = wd[R(wd.length)];
                        if (nh[y - w * 7] - 0.25 >= mnD - 1e-9) {
                            nh[y - w * 7] -= 0.25;
                            H--;
                        }
                    }
                    if (H > 0) continue;
                }
                days = all;
                wst = e.s[wd[0]];
            } else {
                const g = wk[R(wk.length)];
                const w = (g / 7) | 0;
                const of: number[] = [];
                for (let d = 0; d < 7; d++) {
                    const x = w * 7 + d;
                    if (!e.abs[x] && !e.h[x]) of.push(x);
                }
                if (!of.length) continue;
                days = [g, of[R(of.length)]];
            }

            const sn = snap(e, days);
            const bef = rqc(i);
            const rb = rcnt(i);
            const L = winL(days);
            const cb = part(L);
            days.forEach((g) => add(i, g, -1));

            if (v < 0.3) {
                const g = days[0];
                if (Math.random() < 0.4) {
                    const nb = wk[R(wk.length)];
                    e.s[g] = Math.random() < 0.7 ? e.s[nb] : ST[R(ST.length)];
                }
                e.bo[g] = pickBo(e.h[g]);
            } else if (v < 0.45) {
                days.forEach((g) => {
                    e.s[g] = ns0;
                    e.bo[g] = pickBo(e.h[g]);
                });
            } else if (v < 0.62) {
                const [a, b] = days;
                e.h[a] -= stp;
                e.h[b] += stp;
                e.bo[a] = pickBo(e.h[a]);
                e.bo[b] = pickBo(e.h[b]);
            } else if (v < 0.74 && nh) {
                days.forEach((x, k) => {
                    if (nh![k] !== e.h[x]) {
                        if (!e.h[x]) e.s[x] = e.rst[x] >= 0 ? e.rst[x] : wst;
                        e.h[x] = nh![k];
                        e.bo[x] = nh![k] ? pickBo(nh![k]) : 0;
                    }
                });
            } else {
                const [a, b] = days;
                e.h[b] = e.h[a];
                e.s[b] = e.s[a];
                e.bo[b] = e.bo[a];
                e.h[a] = 0;
            }

            days.forEach((g) => add(i, g, 1));
            const dl = part(L) - cb + rqc(i) - bef;
            if (rcnt(i) > rb || !(dl < 0 || Math.random() < Math.exp(-dl / Tt))) {
                days.forEach((g) => add(i, g, -1));
                rest(e, sn);
                days.forEach((g) => add(i, g, 1));
            }
        }
    };

    const tryMove = (i: number, days: number[], mut: (emp: EmployeeScheduleState) => void) => {
        const e = E[i];
        const sn = snap(e, days);
        const bef = rqc(i);
        const rb = rcnt(i);
        const L = winL(days);
        const cb = part(L);
        days.forEach((g) => add(i, g, -1));
        mut(e);
        days.forEach((g) => add(i, g, 1));
        const dl = part(L) - cb + rqc(i) - bef;
        if (dl < -1e-9 && rcnt(i) <= rb) return true;
        days.forEach((g) => add(i, g, -1));
        rest(e, sn);
        days.forEach((g) => add(i, g, 1));
        return false;
    };

    const polish = () => {
        for (let pass = 0; pass < 40 && N; pass++) {
            let imp = false;
            for (let i = 0; i < N; i++) {
                const e = E[i];
                for (let w = 0; w < W; w++) {
                    const all = [0, 1, 2, 3, 4, 5, 6].map((d) => w * 7 + d);
                    for (const stp of [1, 0.25]) {
                        for (const a of all) {
                            for (const b of all) {
                                if (
                                    a === b ||
                                    !e.h[a] ||
                                    !e.h[b] ||
                                    e.h[a] + stp > mxD + 1e-9 ||
                                    e.h[b] - stp < mnD - 1e-9
                                )
                                    continue;
                                if (
                                    tryMove(i, [a, b], (x) => {
                                        x.h[a] += stp;
                                        x.h[b] -= stp;
                                        x.bo[a] = pickBo(x.h[a]);
                                        x.bo[b] = pickBo(x.h[b]);
                                    })
                                )
                                    imp = true;
                            }
                        }
                    }
                    for (const a of all) {
                        for (const b of all) {
                            if (a === b || !e.h[a] || e.h[b] || e.abs[b]) continue;
                            if (
                                tryMove(i, [a, b], (x) => {
                                    x.h[b] = x.h[a];
                                    x.s[b] = x.s[a];
                                    x.bo[b] = x.bo[a];
                                    x.h[a] = 0;
                                })
                            )
                                imp = true;
                        }
                    }
                    for (const a of all) {
                        if (!e.h[a]) continue;
                        for (const st of ST) {
                            if (st === e.s[a]) continue;
                            if (
                                tryMove(i, [a], (x) => {
                                    x.s[a] = st;
                                    x.bo[a] = pickBo(x.h[a]);
                                })
                            )
                                imp = true;
                        }
                    }
                }
            }
            if (!imp) break;
        }
    };

    const underNow = () => {
        let u = 0;
        for (let k = 0; k < QN; k++) u += Math.max(0, need[k % 96] - cov[k]);
        return u;
    };

    const fixRest = () => {
        for (let pass = 0; pass < 6; pass++) {
            let ch = false;
            for (let i = 0; i < N; i++) {
                const e = E[i];
                if (!rcnt(i)) continue;
                for (let g = 1; g < D; g++) {
                    if (!(e.h[g] && e.h[g - 1] && 96 + e.s[g] - (e.s[g - 1] + 4 * e.h[g - 1] + bl) < RQ))
                        continue;
                    let done = false;
                    for (const t of [g, g - 1]) {
                        for (const st of ST) {
                            if (st === e.s[t]) continue;
                            const rb = rcnt(i);
                            const dd = [t];
                            const sn = snap(e, dd);
                            add(i, t, -1);
                            e.s[t] = st;
                            e.bo[t] = pickBo(e.h[t]);
                            add(i, t, 1);
                            if (rcnt(i) < rb) {
                                done = true;
                                ch = true;
                                break;
                            }
                            add(i, t, -1);
                            rest(e, sn);
                            add(i, t, 1);
                        }
                        if (done) break;
                    }
                }
            }
            if (!ch) break;
        }
    };

    const totalIters = baseIters * Math.min(c.weeks, 4);
    const tt0 = Date.now();
    anneal(totalIters, 3);
    polish();
    if (strict) {
        for (let r = 0; r < 6 && underNow() > 0 && Date.now() - tt0 < 8000; r++) {
            anneal(Math.round(totalIters / 2), 1.5);
            polish();
        }
    }
    fixRest();

    return computeStats({
        c,
        E,
        cov,
        cs,
        cl,
        bk,
        need,
        pk,
        ml,
        bl,
        RQ,
        W,
        D,
        QN,
        N,
        strict,
        reqH,
        availH,
        solverEngine: "heuristic",
    });
}

export function applyOrToolsAssignmentsToSolveResult(
    baseState: SolvedRosterState,
    assignments: Array<{
        memberIndex: number;
        dayIndex: number;
        startSlot: number;
        durationQuarters: number;
        hours: number;
    }>,
    orToolsMeta: SolvedRosterState["orToolsMeta"],
): SolvedRosterState {
    const { c, W, D, QN, N, need, pk, ml, bl, RQ, strict, reqH, availH } = baseState;
    const cov = new Int32Array(QN);
    const cs = new Int32Array(QN);
    const cl = new Int32Array(QN);
    const bk = new Int32Array(QN);

    const E: EmployeeScheduleState[] = baseState.E.map((emp) => ({
        ...emp,
        h: Array(D).fill(0),
        s: Array(D).fill(0),
        bo: Array(D).fill(0),
    }));

    for (const a of assignments) {
        const emp = E[a.memberIndex];
        if (!emp || a.dayIndex < 0 || a.dayIndex >= D) continue;
        emp.h[a.dayIndex] = a.hours;
        emp.s[a.dayIndex] = a.startSlot;
        emp.bo[a.dayIndex] = 4;

        for (let k = 0; k < a.durationQuarters; k++) {
            const q = (a.dayIndex * 96 + a.startSlot + k) % QN;
            if (emp.pa[q]) continue;
            cov[q] += 1;
            if (emp.m.sk) cs[q] += 1;
            if (emp.m.ld) cl[q] += 1;
        }
    }

    return computeStats({
        c,
        E,
        cov,
        cs,
        cl,
        bk,
        need,
        pk,
        ml,
        bl,
        RQ,
        W,
        D,
        QN,
        N,
        strict,
        reqH,
        availH,
        solverEngine: "ortools-cpsat",
        orToolsMeta,
    });
}

export function getCellViolations(S: SolvedRosterState, e: EmployeeScheduleState, g: number): {
    H: string[];
    So: string[];
} {
    const { c, bl, RQ, D } = S;
    const H: string[] = [];
    const So: string[] = [];
    if (g < D - 1 && e.h[g + 1] && 96 + e.s[g + 1] - (e.s[g] + 4 * e.h[g] + bl) < RQ) {
        H.push("under " + c.rest + "h rest before next duty");
    }
    if (g > 0 && e.h[g - 1] && 96 + e.s[g] - (e.s[g - 1] + 4 * e.h[g - 1] + bl) < RQ) {
        H.push("under " + c.rest + "h rest after previous duty");
    }
    if (e.gOff[g] && e.h[g]) H.push("granted day off not respected");
    if (e.gStO[g] >= 0 && e.s[g] !== e.gStO[g]) {
        H.push("granted start " + slotToTimeStr(e.gStO[g]) + " not respected");
    }
    if (e.roff[g]) So.push("requested off");
    if (e.rst[g] >= 0 && e.s[g] !== e.rst[g]) {
        So.push("wanted start " + slotToTimeStr(e.rst[g]));
    }
    return { H, So };
}

export function getPartialAbsenceWindowTag(e: EmployeeScheduleState, g: number): string | null {
    const a = Array.from({ length: 96 }, (_, q) => q).filter((q) => e.pa[g * 96 + q]);
    return a.length ? `away ${slotToTimeStr(a[0])}–${slotToTimeStr(a[a.length - 1] + 1)}` : null;
}

export function diagnoseUnderstaffedInterval(
    S: SolvedRosterState,
    x: { s: number; e: number; q: number; n: number },
): string[] {
    const { c, E, bl, RQ, D } = S;
    const out: string[] = [];
    const kd = Math.floor(x.s / 96);

    E.forEach((e) => {
        for (const g of [kd, kd - 1]) {
            if (g < 0 || !e.h[g]) continue;
            const ee = g * 96 + e.s[g] + 4 * e.h[g] + bl;
            if (ee > x.s || ee < x.s - 3) continue;
            const nm = e.m.name;
            if (e.h[g] >= c.maxD) {
                out.push(`${nm} ends at ${slotToTimeStr(ee)} but is at the daily maximum of ${c.maxD}h`);
                continue;
            }
            if (g < D - 1 && e.h[g + 1] && 96 + e.s[g + 1] - (e.s[g] + 4 * (e.h[g] + 1) + bl) < RQ) {
                out.push(
                    `${nm} ends at ${slotToTimeStr(ee)}; one more hour would leave under ${c.rest}h rest before the next duty`,
                );
                continue;
            }
            const w = (g / 7) | 0;
            const don: number[] = [];
            for (let d = 0; d < 7; d++) {
                const b = w * 7 + d;
                if (b !== g && e.h[b] > c.minD) don.push(b);
            }
            if (!don.length) {
                out.push(
                    `${nm} ends at ${slotToTimeStr(ee)}; no other day that week has hours to give up (all at the daily minimum of ${c.minD}h)`,
                );
                continue;
            }
            const ok = don.filter((b) => {
                const eb = b * 96 + e.s[b] + 4 * e.h[b] + bl;
                for (let q = eb - 4; q < eb; q++) {
                    if (S.cov[((q % S.QN) + S.QN) % S.QN] - 1 < S.need[((q % 96) + 96) % 96]) return false;
                }
                return true;
            });
            out.push(
                ok.length
                    ? `${nm} could work 1h more here and 1h less on ${addDaysIso(c.ws, ok[0])} without creating a gap there`
                    : `${nm} ends at ${slotToTimeStr(ee)}; every day that could give an hour back would then fall below the minimum`,
            );
        }
    });

    return out.length
        ? out
        : ["Nobody finishes just before this gap; it comes from a late start or an absence."];
}

export function computeSpareList(S: SolvedRosterState): SpareSuggestion[] {
    const { c, E, cov, cs, cl, need, D, QN, bl } = S;
    const cv = Array.from(cov);
    const csA = Array.from(cs);
    const clA = Array.from(cl);
    const cands: Array<{ i: number; g: number; pri: number }> = [];

    E.forEach((e, i) => {
        for (let g = 0; g < D; g++) {
            if (e.h[g] && e.gSt[g] < 0) cands.push({ i, g, pri: e.roff[g] ? 0 : 1 });
        }
    });
    cands.sort((a, b) => a.pri - b.pri || a.g - b.g || a.i - b.i);

    const used = new Set<string>();
    const out: SpareSuggestion[] = [];
    for (const x of cands) {
        const e = E[x.i];
        const w = (x.g / 7) | 0;
        const key = `${x.i}-${w}`;
        if (used.has(key)) continue;
        const qs: number[] = [];
        for (let k = 0; k < 4 * e.h[x.g] + bl; k++) {
            const q = (x.g * 96 + e.s[x.g] + k) % QN;
            if (e.pa[q] || (k >= e.bo[x.g] && k < e.bo[x.g] + bl)) continue;
            qs.push(q);
        }
        let ok = true;
        for (const q of qs) {
            if (
                cv[q] - 1 < need[q % 96] ||
                (c.spSk === "Yes" && e.m.sk && csA[q] - 1 < 1) ||
                (c.spLd === "Yes" && e.m.ld && clA[q] - 1 < 1)
            ) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;
        qs.forEach((q) => {
            cv[q]--;
            if (e.m.sk) csA[q]--;
            if (e.m.ld) clA[q]--;
        });
        used.add(key);
        let offs = 0;
        for (let d = 0; d < 7; d++) if (!e.h[w * 7 + d]) offs++;
        out.push({
            ...x,
            name: e.m.name,
            hrs: e.h[x.g],
            req: e.roff[x.g],
            over: offs + 1 > c.maxOff,
        });
    }
    return out;
}

export function runAiAnalysis(
    S: SolvedRosterState,
    team: TeamMember[],
    absences: TeamAbsence[],
    requests: TeamRequest[],
): AiAnalysisResult {
    const c = S.c;
    const mxT = c.maxH.reduce((a, b) => a + b, 0) * 7;
    const m = S.met;
    const N = team.length;
    const findings: Array<{ type: "ok" | "bad" | "info"; html: string }> = [];
    const eff = S.E.reduce((a, e) => a + e.T, 0) / c.weeks;
    const dem = (S.need.reduce((a, b) => a + b, 0) * 7) / 4;
    const rqDays = expandRequestsByDay(requests);

    findings.push({
        type: "info",
        html: `Capacity check (per week): <b>${N}</b> members supply <b>${Math.round(eff)}h</b> person-hours; minimum coverage demand is <b>${Math.round(dem)}h</b>, maximum allowed is <b>${mxT}h</b>.`,
    });

    if (eff < dem) {
        findings.push({
            type: "bad",
            html: `<b>Structural shortfall of ${Math.round(dem - eff)} person-hours/week:</b> no schedule can satisfy the minimums with this headcount.`,
        });
    }
    if (eff > mxT) {
        findings.push({
            type: "bad",
            html: `<b>Headcount too high:</b> available hours exceed the max-staff ceiling.`,
        });
    }
    if (m.pkU) {
        findings.push({
            type: "bad",
            html: `<b>${m.pkU} person-hours short during peak</b> (needs ${Math.max(...c.minH)} staff).`,
        });
    }
    if (m.under - m.pkU > 0.01) {
        findings.push({
            type: "bad",
            html: `<b>${Math.round((m.under - m.pkU) * 100) / 100} person-hours below the hourly minimum</b>.`,
        });
    }
    if (m.flags) {
        findings.push({
            type: "bad",
            html: `<b>${m.flags} member(s)</b> cannot reach their weekly hours within daily limits / off-day rules (check absences).`,
        });
    }

    const nS = team.filter((t) => t.sk).length;
    const nL = team.filter((t) => t.ld).length;
    const mn = Math.ceil(168 / c.T);
    if (c.spSk === "Yes") {
        findings.push({
            type: m.skU ? "bad" : "ok",
            html: m.skU
                ? `<b>${m.skU} hours have no Skilled member on site.</b> You have ${nS}; at least ${mn} are needed.`
                : `<b>A Skilled member is on site every hour</b> (${nS} skilled).`,
        });
    }
    if (c.spLd === "Yes") {
        findings.push({
            type: m.ldU ? "bad" : "ok",
            html: m.ldU
                ? `<b>${m.ldU} hours have no Leader on site.</b> You have ${nL}; at least ${mn} are needed.`
                : `<b>A Leader is on site every hour</b> (${nL} leaders).`,
        });
    }
    if (m.rV) {
        findings.push({
            type: "bad",
            html: `<b>${m.rV} duty pair(s) have less than ${c.rest}h rest.</b> Add start times or use fewer distinct ones.`,
        });
    }

    const byD: Record<string, number> = {};
    rqDays.filter((r) => r.t < 0).forEach((r) => (byD[r.date] = (byD[r.date] || 0) + 1));
    const hot = Object.entries(byD).filter((x) => x[1] >= Math.ceil(N / 3));
    if (hot.length) {
        findings.push({
            type: "info",
            html: `Request hot-spots: ${hot.map((x) => `<b>${x[0]}</b> (${x[1]} want off)`).join(", ")} — these dates compete with coverage.`,
        });
    }
    if (m.gT > m.gM) {
        findings.push({
            type: "bad",
            html: `<b>${m.gT - m.gM} granted request(s) could not be fulfilled</b> (they conflict with absences, weekly hours or daily limits).`,
        });
    }
    if (m.un.length) {
        findings.push({
            type: "info",
            html: `${m.unmet} soft request(s) not granted: ${m.un
                .slice(0, 8)
                .map((u) => `${u.n} (${u.bad.join(", ")})`)
                .join("; ")}${m.un.length > 8 ? " ..." : ""}`,
        });
    } else {
        findings.push({ type: "ok", html: "All soft requests granted." });
    }

    findings.push({
        type: "info",
        html: `Double offs: <b>${m.b2b}/${m.b2T}</b> member-weeks with two off days have them back-to-back.`,
    });
    findings.push({
        type: "info",
        html: `Balance: <b>${Math.round(m.opO)}</b> person-hours of surplus sit in off-peak hours; largest 15-minute staffing change is <b>${m.sw}</b>.`,
    });

    if (!m.hard && !m.unmet) {
        findings.push({ type: "ok", html: "<b>Nothing to fix — the plan is already optimal.</b>" });
    }

    const cs: Array<{ l: string; p: { x?: number; minH?: number; maxS?: number }; rel?: number }> = [
        { l: "Baseline (no change)", p: {} },
    ];
    if (m.hard) {
        cs.push(
            { l: "Add 1 team member", p: { x: 1 } },
            { l: "Add 2 team members", p: { x: 2 } },
            { l: "Lower hourly minimums by 1", p: { minH: -1 }, rel: 1 },
        );
    }
    if (m.over) cs.push({ l: "Raise max staff by 1", p: { maxS: 1 }, rel: 1 });
    if (m.unmet && !m.hard) {
        cs.push(
            { l: "Add 1 team member", p: { x: 1 } },
            { l: "Raise max staff by 1", p: { maxS: 1 }, rel: 1 },
        );
    }

    const seen: Record<string, boolean> = {};
    const out: AiCandidateScenario[] = [];
    cs.forEach((x) => {
        if (seen[x.l]) return;
        seen[x.l] = true;
        const cc: RosterConfig = {
            ...c,
            minH: x.p.minH ? c.minH.map((v) => Math.max(0, v + x.p.minH!)) : [...c.minH],
            maxH: x.p.maxS ? c.maxH.map((v) => v + x.p.maxS!) : [...c.maxH],
        };
        const tm = [...team];
        for (let k = 0; k < (x.p.x || 0); k++) {
            tm.push({ id: 9000 + k, name: `Extra ${k + 1}`, sk: false, ld: false });
        }
        out.push({
            ...x,
            S: x.l.startsWith("Base") ? S : solveRoster(cc, tm, absences, rqDays, 50000),
        });
    });

    const sc = (st: SolvedRosterState, rel?: number) =>
        st.met.hard * 1000 + st.met.unmet + (rel ? 0.5 : 0);
    out.sort((a, b) => sc(a.S, a.rel) - sc(b.S, b.rel));

    return {
        findings,
        candidates: out,
        recommended: out[0],
        hardResolved: Math.round((S.met.hard - out[0].S.met.hard) * 100) / 100,
        requestsResolved: S.met.unmet - out[0].S.met.unmet,
    };
}

function wkT(c: RosterConfig, na: number, gc: number, lw: number) {
    const mn = Math.ceil(c.minD * 4 - 1e-9) / 4;
    const mx = Math.floor(c.maxD * 4 + 1e-9) / 4;
    const T = Math.round(((c.T * (7 - na)) / 7) * 4) / 4;
    const nmax = Math.min(7 - na - gc, 7 - c.minOff);
    const allowed = Math.max(c.maxOff, na + gc);
    const nlow = Math.max(1, lw, 7 - allowed);
    for (let n = nlow; n <= nmax; n++) if (n * mn <= T && T <= n * mx) return { T, off: allowed };
    for (let n = nlow; n <= nmax; n++) {
        if (n * mn <= Math.min(c.T, n * mx) + 1e-9) return { T: Math.max(T, n * mn), off: allowed };
    }
    if (T < mn || nmax < 1) return { T: 0, off: 7 };
    const n = Math.max(1, Math.min(nmax, Math.floor(T / mn + 1e-9)));
    return { T: Math.min(T, n * mx), off: Math.max(allowed, 7 - n) };
}

export function buildOrToolsPayloadAndScript(
    c: RosterConfig,
    team: TeamMember[],
    absences: TeamAbsence[],
    requests: TeamRequest[],
    lastSolved?: SolvedRosterState | null,
): { modelData: Record<string, any>; pythonScript: string } {
    const pk = winSet(c.pkW);
    const W = c.weeks;
    const Dd = 7 * W;
    const need = needV(c, pk);
    const mxq = Array.from({ length: 96 }, (_, q) => c.maxH[q >> 2]);
    const ST = parseStarts(c.starts);
    const mn = Math.ceil(c.minD * 4 - 1e-9) / 4;
    const rqDays = expandRequestsByDay(requests);

    const hint: Array<[number, number, number, number]> = [];
    if (lastSolved && lastSolved.W === W && lastSolved.E.length === team.length) {
        lastSolved.E.forEach((e, i) => {
            for (let g = 0; g < Dd; g++) {
                if (e.h[g] > 0) hint.push([i, g, e.s[g], Math.round(e.h[g] * 4)]);
            }
        });
    }

    const modelData = {
        hint,
        c: {
            T: c.T,
            minD: c.minD,
            maxD: c.maxD,
            minOff: c.minOff,
            maxOff: c.maxOff,
            spSk: c.spSk,
            spLd: c.spLd,
            cons: c.cons,
            rest: c.rest,
            weeks: W,
        },
        starts: ST.length ? ST : [24],
        bl: 0,
        need,
        maxq: mxq,
        tg: tgtProf(c, pk, need, suppl(c, team, absences) * 4, winSet(c.opW), mxq),
        m: team.map((m) => {
            const roff = Array(Dd).fill(false);
            const rst = Array(Dd).fill(-1);
            const goff = Array(Dd).fill(false);
            const gst = Array(Dd).fill(-1);
            const abs = absDays(c, absences, m.id, Dd);
            rqDays.forEach((r) => {
                if (r.m !== m.id) return;
                const g = dayIndexFromStart(c.ws, r.date);
                if (g < 0 || g >= Dd) return;
                if (r.t < 0) {
                    roff[g] = true;
                    if (r.g) goff[g] = true;
                } else {
                    rst[g] = r.t;
                    if (r.g) gst[g] = r.t;
                }
            });
            for (let g = 0; g < Dd; g++) {
                if (gst[g] >= 0 && (abs[g] || goff[g] || !ST.includes(gst[g]))) gst[g] = -1;
            }
            const tw: number[] = [];
            const ofm: number[] = [];
            for (let w = 0; w < W; w++) {
                const dd = [0, 1, 2, 3, 4, 5, 6].map((d) => w * 7 + d);
                const na = dd.filter((g) => abs[g]).length;
                const gc = dd.filter((g) => goff[g] && !abs[g]).length;
                let lw = dd.filter((g) => gst[g] >= 0).length;
                if (lw * mn > wkT(c, na, gc, lw).T) {
                    dd.forEach((g) => (gst[g] = -1));
                    lw = 0;
                }
                const r = wkT(c, na, gc, lw);
                tw.push(r.T);
                ofm.push(r.off);
            }
            return {
                name: m.name,
                sk: m.sk,
                ld: m.ld,
                abs,
                pa: paArr(c, absences, m.id, Dd)
                    .map((v, q) => (v ? q : -1))
                    .filter((x) => x >= 0),
                roff,
                rst,
                goff,
                gst,
                tw,
                offmax: ofm,
            };
        }),
    };

    const pythonScript = `# pip install ortools   (roster starts ${c.ws}; day 0 = Monday of week 1; internal time unit = 15 minutes)
# Breaks are disabled in the app, so duties here are pure working time.
import json,math
from ortools.sat.python import cp_model
TIME_LIMIT=120   # seconds
D=json.loads('''${JSON.stringify(modelData)}''')
c=D['c'];M=D['m'];S=D['starts'];need=D['need'];maxq=D['maxq'];W=c['weeks'];ND=7*W;QN=96*ND;RQ=c['rest']*4
MNQ=math.ceil(c['minD']*4-1e-9);MXQ=math.floor(c['maxD']*4+1e-9);tg10=[round(x*10) for x in D['tg']]
m=cp_model.CpModel();Y={};cov=[[] for _ in range(QN)];sk=[[] for _ in range(QN)];ld=[[] for _ in range(QN)];pen=[]
for i,e in enumerate(M):
    pa=set(e['pa']);wd=[];SQ=[];EQ=[];us={};tot=[[] for _ in range(W)]
    for g in range(ND):
        ds=[];sql=[];eql=[]
        if not e['abs'][g] and not e['goff'][g]:
            for s in ([e['gst'][g]] if e['gst'][g]>=0 else S):
                for a in range(MNQ,MXQ+1):
                    v=m.NewBoolVar('');Y[i,g,s,a]=v;ds.append(v);tot[g//7].append(a*v);sql.append(s*v);eql.append((s+a)*v);us.setdefault((g//7,s),[]).append(v)
                    for k in range(a):
                        t=(g*96+s+k)%QN
                        if t in pa: continue
                        cov[t].append(v)
                        if e['sk']: sk[t].append(v)
                        if e['ld']: ld[t].append(v)
                    if e['roff'][g]: pen.append(10*v)
                    if e['rst'][g]>=0 and s!=e['rst'][g]: pen.append(4*v)
            if e['gst'][g]>=0: m.Add(sum(ds)==1)
            elif ds: m.Add(sum(ds)<=1)
            if e['rst'][g]>=0 and ds: pen.append(4-4*sum(ds))
        wd.append(sum(ds) if ds else 0);SQ.append(sum(sql) if sql else 0);EQ.append(sum(eql) if eql else 0)
    for g in range(ND-1): m.Add(96+SQ[g+1]-EQ[g]>=RQ-400*(2-wd[g]-wd[g+1]))   # minimum rest between duties (hard)
    if c['cons']=='Yes':
        for vs in us.values():
            u=m.NewBoolVar('');pen.append(8*u)
            for v in vs: m.AddImplication(v,u)
    for w in range(W):
        days=range(w*7,w*7+7);na=sum(e['abs'][g] for g in days)
        m.Add(sum(tot[w])==round(e['tw'][w]*4))                                  # weekly hours exactly the target (never above)
        offs=7-sum(wd[g] for g in days)
        m.Add(offs>=c['minOff']);m.Add(offs<=e['offmax'][w])   # minimum and maximum off days per week (hard)
        two=m.NewBoolVar('');m.Add(offs>=2).OnlyEnforceIf(two);m.Add(offs<=1).OnlyEnforceIf(two.Not())
        for d in range(7):
            g=w*7+d
            if e['roff'][g] or e['abs'][g]: continue
            nb=[g+x for x in (-1,1) if 0<=d+x<7]
            iso=m.NewBoolVar('');m.Add(iso>=(1-wd[g])+sum(wd[n] for n in nb)-len(nb)+two-1);pen.append(6*iso)   # prefer back-to-back double offs
Nn=[];dev=[];slack=[]
for t in range(QN):
    n=sum(cov[t]);Nn.append(n)
    u=m.NewIntVar(0,len(M),'');o=m.NewIntVar(0,len(M),'');m.Add(n+u>=need[t%96]);m.Add(n-o<=maxq[t%96]);slack+=[u,o]   # hourly min/max (slack = violation)
    dv=m.NewIntVar(0,10*len(M),'');m.Add(dv>=10*n-tg10[t%96]);m.Add(dv>=tg10[t%96]-10*n);dev.append(dv)
    if c['spSk']=='Yes': z=m.NewIntVar(0,1,'');m.Add(sum(sk[t])+z>=1);slack.append(z)
    if c['spLd']=='Yes': z=m.NewIntVar(0,1,'');m.Add(sum(ld[t])+z>=1);slack.append(z)
stp=[]
for t in range(QN):
    sp=m.NewIntVar(0,len(M),'');m.Add(sp>=Nn[t]-Nn[t-1]);m.Add(sp>=Nn[t-1]-Nn[t]);stp.append(sp)
m.Minimize(1000*sum(slack)+4*sum(pen)+sum(dev)+16*sum(stp))
HINT={tuple(x) for x in D['hint']}   # warm start: the roster the app already found (remove these 2 lines to solve from scratch)
for (i,g,s,a),v in Y.items(): m.AddHint(v,1 if (i,g,s,a) in HINT else 0)
sol=cp_model.CpSolver();sol.parameters.max_time_in_seconds=TIME_LIMIT;sol.parameters.num_workers=8
r=sol.Solve(m);print(sol.StatusName(r))
if r in (cp_model.OPTIMAL,cp_model.FEASIBLE):
    print('15-minute slots outside the hourly min/max (or skilled/leader cover):',sum(sol.Value(x) for x in slack))
    ch={(i,g):(s,a) for (i,g,s,a),v in Y.items() if sol.Value(v)}
    q2t=lambda q:f'{(q//4)%24:02d}:{(q%4)*15:02d}'
    for i,e in enumerate(M):
        row=[]
        for g in range(ND):
            if (i,g) in ch: s,a=ch[(i,g)];row.append(f'{q2t(s)}-{q2t(s+a)} {a/4:g}h')
            else: row.append('ABSENT' if e['abs'][g] else 'OFF')
        print(e['name'].ljust(10),*row,sep=' | ')
`;

    return { modelData, pythonScript };
}

export function buildExcelExportPayload(S: SolvedRosterState): {
    ws: string;
    summaryRows: any[][];
    weekSheets: Array<{ name: string; rows: any[][] }>;
    coverageRows: any[][];
    unmetRows: any[][];
} {
    const c = S.c;
    const m = S.met;
    const f = (x: number) => Math.round(x * 100) / 100;

    const xCell = (e: EmployeeScheduleState, g: number) => {
        if (e.abs[g]) return "ABSENT";
        const x = e.h[g];
        if (!x) {
            return (
                "OFF" +
                (e.gOff[g] ? " (granted)" : "") +
                (e.rst[g] >= 0 ? ` [* wanted start ${slotToTimeStr(e.rst[g])}]` : "")
            );
        }
        const v = getCellViolations(S, e, g);
        const end = e.s[g] + 4 * x + S.bl;
        const aw = getPartialAbsenceWindowTag(e, g);
        return (
            `${slotToTimeStr(e.s[g])}-${slotToTimeStr(end)}` +
            (end >= 96 ? " (+1)" : "") +
            ` (${x}h)` +
            (aw ? ` ${aw}` : "") +
            (e.gSt[g] >= 0 ? " (granted start)" : "") +
            (v.H.length ? ` [! ${v.H.join("; ")}]` : "") +
            (v.So.length ? ` [* ${v.So.join("; ")}]` : "")
        );
    };

    const summaryRows: any[][] = [
        ["Roster summary", "Value"],
        ["Roster start (Monday)", c.ws],
        ["Weeks", S.W],
        ["Team members", S.E.length],
        ["Solver Engine", S.solverEngine === "ortools-cpsat" ? "Google OR-Tools (CP-SAT)" : "Constraint Solver (Simulated Annealing + Polish)"],
        [],
        ["Result Metric", "Value"],
        ["Coverage score (15-minute slots within hourly min-max)", `${f(m.score * 100)}%`],
        ["Understaffed person-hours", f(m.under)],
        ["Over-max person-hours", f(m.over)],
        ["Hours without a Skilled member (if spread on)", f(m.skU)],
        ["Hours without a Leader (if spread on)", f(m.ldU)],
        ["Rest violations", m.rV],
        ["Members with hours problems", m.flags],
        ["Granted requests fulfilled", `${m.gM}/${m.gT}`],
        ["Off requests met", `${m.oM}/${m.oT}`],
        ["Start requests met", `${m.sM}/${m.sT}`],
        ["Member-weeks with the same start all week", `${m.sameS}/${m.ew}`],
        ["Double offs back-to-back", `${m.b2b}/${m.b2T}`],
        ["Strict hourly minimums", `${m.strict ? "ON" : "OFF"} (required hours = ${Math.round(m.ratio * 100)}% of available)`],
        [],
        ["Company requirements", "Value"],
        ["Weekly working hours (per employee)", c.T],
        ["Daily working hours (min-max)", `${c.minD} - ${c.maxD}`],
        ["Off days per week (min-max)", `${c.minOff} - ${c.maxOff}`],
        ["Minimum rest between duties (hours)", c.rest],
        ["Duty start times", parseStarts(c.starts).map(slotToTimeStr).join(", ")],
        ["Spread Skilled", c.spSk],
        ["Spread Leaders", c.spLd],
        ["Prefer same start all week", c.cons],
        [],
        ["Legend", "[! ...] = rule violation, [* ...] = unmet team request, (+1) = duty ends the next day, (granted) = granted request"],
    ];

    const weekSheets: Array<{ name: string; rows: any[][] }> = [];
    for (let w = 0; w < S.W; w++) {
        const rows: any[][] = [
            [
                "Member",
                ...DAY_NAMES.map((d, i) => `${d} ${addDaysIso(c.ws, w * 7 + i)}`),
                "Work hrs",
                "Target hrs",
                "Off days",
            ],
        ];
        S.E.forEach((e) => {
            let tot = 0;
            const r: any[] = [e.m.name];
            for (let d = 0; d < 7; d++) {
                const g = w * 7 + d;
                tot += e.h[g];
                r.push(xCell(e, g));
            }
            r.push(
                tot,
                e.Tw[w],
                [0, 1, 2, 3, 4, 5, 6].filter((d) => !e.h[w * 7 + d]).length,
            );
            rows.push(r);
        });
        weekSheets.push({ name: `Week ${w + 1}`, rows });
    }

    const coverageRows: any[][] = [
        ["Date", ...Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`)],
    ];
    for (let g = 0; g < S.D; g++) {
        const r: any[] = [`${DAY_NAMES[g % 7]} ${addDaysIso(c.ws, g)}`];
        for (let x = 0; x < 24; x++) {
            let v = 99;
            for (let j = 0; j < 4; j++) v = Math.min(v, S.cov[g * 96 + x * 4 + j]);
            r.push(v);
        }
        coverageRows.push(r);
    }
    coverageRows.push([], ["Required minimum", ...c.minH], ["Allowed maximum", ...c.maxH]);

    const unmetRows: any[][] = [["Member", "Unmet requests"]];
    m.un.forEach((u) => unmetRows.push([u.n, u.bad.join(", ")]));

    return { ws: c.ws, summaryRows, weekSheets, coverageRows, unmetRows };
}

