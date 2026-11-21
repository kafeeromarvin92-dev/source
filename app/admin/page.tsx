"use client";

import { FormEvent, useEffect, useState } from "react";
import TeamLogo from "../components/TeamLogo";
import ScreenshotViewer from "../components/ScreenshotViewer";
import CountryFlag from "../components/CountryFlag";
import { calculateMatchEconomy, isEntryStake } from "../lib/coin-rules";
import { getAdminReviewAvailability } from "../lib/review-window";

type Player = { id: string; username: string; teamName: string; avatar: string; country?: string | null };
type Review = {
    id: string;
    createdAt: string;
    status: string;
    entryStake: number;
    creator: Player;
    acceptedBy: Player | null;
    submissions: { id: string; playerId: string; image: string; player: Player; createdAt: string }[];
    objections?: { id: string; reason: string; createdAt: string; player: Player }[];
    decision?: { winnerId: string | null } | null;
};
type ActiveMatch = {
    id: string;
    createdAt: string;
    stakesCollectedAt: string | null;
    entryStake: number;
    matchCode: string | null;
    creator: Player;
    acceptedBy: Player | null;
};
type AdminUser = { id: string; username: string; teamName: string; avatar: string; email: string; isAdmin: boolean };
type CoinUser = { id: string; username: string; teamName: string; avatar: string; balance: number };
type PendingDecision = { review: Review; winner: Player | null };
type ReviewTab = "PENDING" | "AWAITING" | "DISPUTED" | "SETTLED";

const reviewTabs: { id: ReviewTab; label: string }[] = [
    { id: "PENDING", label: "Pending" },
    { id: "AWAITING", label: "Awaiting 2nd" },
    { id: "DISPUTED", label: "Disputed" },
    { id: "SETTLED", label: "Settled" },
];

function DlsPlayerHeader({ player, side }: { player: Player; side: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-navy-950/60 p-3">
            <TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={48} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black"><CountryFlag country={player.country} className="mr-1" />{player.teamName}</p>
                <p className="truncate text-xs text-slate-400"><span className="text-gold">[{side}]</span> @{player.username}</p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{side}</span>
        </div>
    );
}

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AdminPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
    const [activeMatchesError, setActiveMatchesError] = useState("");
    const [activeMatchesLoading, setActiveMatchesLoading] = useState(true);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [notice, setNotice] = useState({ kind: "", text: "" });
    const [noticeError, setNoticeError] = useState("");
    const [loading, setLoading] = useState(true);
    const [deciding, setDeciding] = useState(false);
    const [now, setNow] = useState(0);
    const [activeTab, setActiveTab] = useState<ReviewTab>("DISPUTED");
    const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
    const [noticeForm, setNoticeForm] = useState({ title: "", message: "" });
    const [sendingNotice, setSendingNotice] = useState(false);
    const [coinSearch, setCoinSearch] = useState("");
    const [coinUsers, setCoinUsers] = useState<CoinUser[]>([]);
    const [selectedCoinUser, setSelectedCoinUser] = useState<CoinUser | null>(null);
    const [grantAmount, setGrantAmount] = useState("100");
    const [grantReason, setGrantReason] = useState("");
    const [houseBalance, setHouseBalance] = useState<number | null>(null);
    const [searchingCoins, setSearchingCoins] = useState(false);
    const [grantingCoins, setGrantingCoins] = useState(false);
    const counts = {
        PENDING: reviews.filter((review) => review.status === "REVIEW" && getAdminReviewAvailability(review.status, review.submissions.length, review.submissions[0]?.createdAt, now).eligible).length,
        AWAITING: reviews.filter((review) => review.status === "REVIEW" && review.submissions.length === 1 && !getAdminReviewAvailability(review.status, review.submissions.length, review.submissions[0]?.createdAt, now).eligible).length,
        DISPUTED: reviews.filter((review) => review.status === "DISPUTED").length,
        SETTLED: reviews.filter((review) => review.status === "SETTLED").length,
    };
    const visibleReviews = reviews.filter((review) => {
        if (activeTab === "PENDING") return review.status === "REVIEW" && getAdminReviewAvailability(review.status, review.submissions.length, review.submissions[0]?.createdAt, now).eligible;
        if (activeTab === "AWAITING") return review.status === "REVIEW" && review.submissions.length === 1 && !getAdminReviewAvailability(review.status, review.submissions.length, review.submissions[0]?.createdAt, now).eligible;
        return review.status === activeTab;
    });

    useEffect(() => {
        let mounted = true;
        void Promise.all([fetch("/api/admin/reviews"), fetch("/api/admin/admins"), fetch("/api/admin/coins")]).then(async ([reviewResponse, adminResponse, coinResponse]) => {
            const [reviewData, adminData, coinData] = await Promise.all([
                reviewResponse.json().catch(() => null),
                adminResponse.json().catch(() => null),
                coinResponse.json().catch(() => null),
            ]);
            if (!mounted) return;
            if (!reviewResponse.ok) setNoticeError(reviewData?.error || "Could not load match reviews.");
            else setReviews(Array.isArray(reviewData?.reviews) ? reviewData.reviews : []);
            if (!adminResponse.ok) setNoticeError((current) => current || adminData?.error || "Could not load admin accounts.");
            else setAdmins(Array.isArray(adminData?.admins) ? adminData.admins : []);
            if (!coinResponse.ok) setNoticeError((current) => current || coinData?.error || "Could not load coin accounts.");
            else if (typeof coinData?.houseBalance === "number") setHouseBalance(coinData.houseBalance);
        }).catch(() => {
            if (mounted) setNoticeError("Could not load admin tools. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadActiveMatches = async () => {
            try {
                const response = await fetch("/api/admin/active-matches");
                const data = await response.json().catch(() => null);
                if (!mounted) return;
                if (!response.ok) {
                    setActiveMatchesError(data?.error || "Could not load active matches.");
                    return;
                }
                setActiveMatches(Array.isArray(data?.matches) ? data.matches : []);
                setActiveMatchesError("");
            } catch {
                if (mounted) setActiveMatchesError("Could not reach Noble Gamers. Active matches were not refreshed.");
            } finally {
                if (mounted) setActiveMatchesLoading(false);
            }
        };
        void loadActiveMatches();
        const timer = window.setInterval(() => { void loadActiveMatches(); }, 15000);
        return () => {
            mounted = false;
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(timer);
        };
    }, []);

    async function decideReview() {
        if (!pendingDecision) return;
        const economy = pendingDecision.winner && isEntryStake(pendingDecision.review.entryStake)
            ? calculateMatchEconomy(pendingDecision.review.entryStake)
            : null;
        if (pendingDecision.winner && !economy) {
            setNoticeError("This match has an unsupported entry stake and cannot be settled.");
            return;
        }
        setDeciding(true);
        setNoticeError("");
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch(`/api/challenges/${pendingDecision.review.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pendingDecision.winner
                    ? { action: "admin-decide", winnerId: pendingDecision.winner.id }
                    : { action: "admin-refund" }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNoticeError(data?.error || "Could not settle this match.");
                return;
            }
            setReviews((current) => current.map((item) => item.id === pendingDecision.review.id
                ? { ...item, status: "SETTLED", decision: { winnerId: pendingDecision.winner?.id || null } }
                : item));
            if (pendingDecision.winner && typeof data?.result?.houseFee === "number") {
                setHouseBalance((current) => current === null ? data.result.houseFee : current + data.result.houseFee);
            }
            setNotice({ kind: "success", text: pendingDecision.winner
                ? `${pendingDecision.winner.teamName} won ${economy?.winnerPayout} points; the house received its 10% fee.`
                : "Match refunded as a draw. Both players’ entry points were returned." });
            setPendingDecision(null);
        } catch {
            setNoticeError("Could not reach Noble Gamers. The match was not settled.");
        } finally {
            setDeciding(false);
        }
    }

    async function searchCoinPlayers(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSearchingCoins(true);
        setNoticeError("");
        try {
            const response = await fetch(`/api/admin/coins?search=${encodeURIComponent(coinSearch.trim())}`);
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNoticeError(data?.error || "Could not search players.");
                return;
            }
            setCoinUsers(Array.isArray(data?.users) ? data.users : []);
            if (typeof data?.houseBalance === "number") setHouseBalance(data.houseBalance);
        } catch {
            setNoticeError("Could not reach Noble Gamers. Player search failed.");
        } finally {
            setSearchingCoins(false);
        }
    }

    async function grantCoins(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedCoinUser) return;
        setGrantingCoins(true);
        setNoticeError("");
        try {
            const response = await fetch("/api/admin/coins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedCoinUser.id, amount: Number(grantAmount), reason: grantReason }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNoticeError(data?.error || "Could not grant points.");
                return;
            }
            setCoinUsers((current) => current.map((item) => item.id === data.userId ? { ...item, balance: data.balance } : item));
            setSelectedCoinUser((current) => {
                if (!current || current.id !== data.userId) return current;
                return { ...current, balance: data.balance };
            });
            setGrantReason("");
            setNotice({ kind: "success", text: `${data.granted} points were granted to @${data.username}.` });
        } catch {
            setNoticeError("Could not reach Noble Gamers. Points were not granted.");
        } finally {
            setGrantingCoins(false);
        }
    }

    async function sendNotification(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSendingNotice(true);
        setNoticeError("");
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch("/api/admin/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(noticeForm),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNoticeError(data?.error || "Could not send notification.");
                return;
            }
            setNoticeForm({ title: "", message: "" });
            setNotice({ kind: "success", text: "Notification sent to players." });
        } catch {
            setNoticeError("Could not reach Noble Gamers. The notification was not sent.");
        } finally {
            setSendingNotice(false);
        }
    }

    async function toggleAdmin(admin: AdminUser) {
        setNoticeError("");
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch("/api/admin/admins", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: admin.id, isAdmin: !admin.isAdmin }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNoticeError(data?.error || "Could not update admin access.");
                return;
            }
            setAdmins((current) => current.map((item) => item.id === admin.id ? data.user : item));
            setNotice({ kind: "success", text: `${admin.username}’s admin access was updated.` });
        } catch {
            setNoticeError("Could not reach Noble Gamers. Admin access was not changed.");
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6">
            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Match control</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Admin control room</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review disputed results or one-sided evidence after the 10-minute response window. Upload order never decides the winner.</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-danger/25 bg-danger/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-200"><span className="h-2 w-2 rounded-full bg-danger" /> {counts.DISPUTED} disputed {counts.DISPUTED === 1 ? "match" : "matches"}</div>
            </header>

            {noticeError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{noticeError}</p>}
            {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : "border-neon/30 bg-neon/10 text-green-200"}`}>{notice.text}</p>}

            <section className="space-y-4 rounded-2xl border border-neon/15 bg-surface p-4 sm:p-5">
                <div className="flex items-end justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">Live matches</p><h2 className="mt-1 text-xl font-black">Accepted challenges</h2></div>
                    <span className="rounded-full border border-neon/15 bg-neon/5 px-3 py-1 text-[10px] font-black text-neon">{activeMatches.length} playing</span>
                </div>
                {activeMatchesLoading ? <div className="skeleton h-28 rounded-xl" /> : activeMatchesError ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{activeMatchesError}</p> : activeMatches.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">Accepted challenges will appear here automatically.</p> : (
                    <div className="space-y-3">
                        {activeMatches.map((match) => (
                            <article key={match.id} className="rounded-xl border border-white/5 bg-navy-950/50 p-3 sm:p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                        <TeamLogo avatar={match.creator.avatar} alt={`${match.creator.teamName} logo`} size={40} />
                                        <div className="min-w-0"><p className="truncate text-sm font-black">{match.creator.teamName}</p><p className="truncate text-[10px] text-slate-400">@{match.creator.username}</p></div>
                                        <span className="px-1 text-[10px] font-black text-slate-500">VS</span>
                                        {match.acceptedBy ? <TeamLogo avatar={match.acceptedBy.avatar} alt={`${match.acceptedBy.teamName} logo`} size={40} /> : <TeamLogo size={40} alt="Opponent logo placeholder" />}
                                        <div className="min-w-0"><p className="truncate text-sm font-black">{match.acceptedBy?.teamName || "Opponent pending"}</p><p className="truncate text-[10px] text-slate-400">{match.acceptedBy ? `@${match.acceptedBy.username}` : "No accepting player"}</p></div>
                                    </div>
                                    <span className="rounded-full border border-neon/20 bg-neon/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-neon">Playing</span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                                    <p className="text-[10px] text-slate-400">{match.entryStake} points each · accepted {match.stakesCollectedAt ? new Date(match.stakesCollectedAt).toLocaleString() : new Date(match.createdAt).toLocaleString()}</p>
                                    <p className="text-xs font-bold text-gold">Shared code <span className="ml-1 font-mono text-base font-black tracking-[0.2em]">{match.matchCode || "Unavailable"}</span></p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger">Match control</p><h2 className="mt-1 text-xl font-black">Review queue</h2></div><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Live data</span></div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Match review status">
                    {reviewTabs.map((tab) => <button key={tab.id} id={`admin-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls="admin-review-panel" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition ${activeTab === tab.id ? tab.id === "DISPUTED" ? "border-danger bg-danger text-white" : "border-gold bg-gold text-navy-950" : "border-white/10 bg-surface text-slate-400 hover:border-gold/25"}`}>{tab.label} · {counts[tab.id]}</button>)}
                </div>
                {loading && <div className="space-y-3"><div className="skeleton h-64 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /></div>}
                {!loading && !noticeError && visibleReviews.length === 0 && <div id="admin-review-panel" role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`} className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center"><span className="text-3xl" aria-hidden="true">{activeTab === "SETTLED" ? "✓" : "◷"}</span><h3 className="mt-2 font-black">No {reviewTabs.find((item) => item.id === activeTab)?.label.toLowerCase()} matches</h3><p className="mt-1 text-sm text-slate-400">{activeTab === "AWAITING" ? "Players have 10 minutes to respond. After that, an admin may review the submitted evidence; no result is awarded automatically." : "This queue will show matches as their real status changes."}</p></div>}
                {visibleReviews.length > 0 && <div id="admin-review-panel" role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`} className="space-y-4">{visibleReviews.map((review) => {
                    const teamA = review.creator;
                    const teamB = review.acceptedBy;
                    const screenshotA = review.submissions.find((submission) => submission.playerId === teamA.id);
                    const screenshotB = teamB ? review.submissions.find((submission) => submission.playerId === teamB.id) : undefined;
                    const objection = review.objections?.[review.objections.length - 1];
                    const reviewAvailability = getAdminReviewAvailability(review.status, review.submissions.length, review.submissions[0]?.createdAt, now);
                    const canSettle = review.status === "DISPUTED" || (review.status === "REVIEW" && reviewAvailability.eligible);
                    const hasEvidence = review.submissions.length > 0;
                    const oneSided = review.status === "REVIEW" && review.submissions.length === 1;
                    const cardTone = review.status === "DISPUTED" ? "border-danger/20" : review.status === "SETTLED" ? "border-neon/20" : "border-gold/20";
                    return (
                        <article key={review.id} className={`card-lift space-y-4 rounded-2xl border ${cardTone} bg-surface p-4 sm:p-5`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${review.status === "DISPUTED" ? "bg-danger/10 text-red-200" : review.status === "SETTLED" ? "bg-neon/10 text-neon" : "bg-gold/10 text-gold"}`}>{review.status === "REVIEW" ? "Pending review" : review.status}</span><p className="mt-2 text-sm font-black">{teamA.teamName} <span className="text-slate-500">vs</span> {teamB?.teamName || "Opponent"}</p><p className="mt-1 text-xs text-slate-500">Created {new Date(review.createdAt).toLocaleString()}</p></div>
                                {review.status === "DISPUTED" ? <span className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-200">Disputed · compare evidence</span> : review.status === "SETTLED" ? <span className="rounded-xl border border-neon/20 bg-neon/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-neon">{review.decision?.winnerId ? `Settled · ${review.decision.winnerId === teamA.id ? teamA.teamName : teamB?.teamName || "Winner"}` : "Draw · points refunded"}</span> : oneSided && !reviewAvailability.eligible ? <span className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gold">Admin review in {formatRemaining(reviewAvailability.remainingMs)}</span> : oneSided ? <span className="rounded-xl border border-neon/20 bg-neon/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-neon">10 minutes passed · admin may review</span> : <span className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gold">{review.submissions.length} screenshots · pending review</span>}
                            </div>
                            {objection && <div className="rounded-xl border border-white/5 bg-navy-950/60 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dispute reason · @{objection.player.username}</p><p className="mt-1 text-sm text-slate-200">{objection.reason}</p></div>}
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <DlsPlayerHeader player={teamA} side="TEAM A" />
                                    {screenshotA ? <ScreenshotViewer src={screenshotA.image} alt={`${teamA.teamName} final-score screenshot`} /> : <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">No screenshot submitted</div>}
                                    {canSettle && hasEvidence && <button type="button" disabled={deciding} onClick={() => setPendingDecision({ review, winner: teamA })} className="w-full rounded-xl bg-gold px-3 py-3 text-xs font-black uppercase tracking-wider text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">Declare Team A winner</button>}
                                </div>
                                <div className="space-y-2">
                                    {teamB ? <DlsPlayerHeader player={teamB} side="TEAM B" /> : <div className="rounded-xl border border-white/5 bg-navy-950/60 p-3 text-sm text-slate-400">Opponent unavailable</div>}
                                    {screenshotB ? <ScreenshotViewer src={screenshotB.image} alt={`${teamB?.teamName || "Team B"} final-score screenshot`} /> : <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">No screenshot submitted</div>}
                                    {canSettle && hasEvidence && teamB && <button type="button" disabled={deciding} onClick={() => setPendingDecision({ review, winner: teamB })} className="w-full rounded-xl bg-gold px-3 py-3 text-xs font-black uppercase tracking-wider text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">Declare Team B winner</button>}
                                </div>
                            </div>
                            {canSettle && hasEvidence && <button type="button" disabled={deciding} onClick={() => setPendingDecision({ review, winner: null })} className="w-full rounded-xl border border-white/10 px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-200 transition hover:border-gold/30 hover:text-gold disabled:opacity-50">Refund both entries · record draw</button>}
                            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">{canSettle ? "Review submitted evidence · tap a screenshot to zoom" : "No outcome is decided by screenshot upload order."}</p>
                        </article>
                    );
                })}</div>}
            </section>

            <section className="space-y-4 rounded-2xl border border-gold/20 bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Wallet operations</p><h2 className="mt-1 text-lg font-black">Grant player points</h2><p className="mt-1 text-xs text-slate-400">Admin grants are recorded in the player’s transaction history.</p></div>
                    <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-black text-gold">House fees · {houseBalance ?? "—"} pts</span>
                </div>
                <form onSubmit={searchCoinPlayers} className="flex gap-2">
                    <input required minLength={2} maxLength={50} value={coinSearch} onChange={(event) => setCoinSearch(event.target.value)} placeholder="Search username or team" className="min-w-0 flex-1 rounded-xl border border-white/5 bg-navy-900 px-4 py-3 text-sm outline-none focus:border-gold/40" />
                    <button disabled={searchingCoins} className="rounded-xl bg-white/10 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{searchingCoins ? "Searching…" : "Search"}</button>
                </form>
                {coinUsers.length > 0 && <div className="max-h-52 space-y-2 overflow-y-auto">{coinUsers.map((player) => <button key={player.id} type="button" onClick={() => setSelectedCoinUser(player)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedCoinUser?.id === player.id ? "border-gold/40 bg-gold/10" : "border-white/5 bg-navy-950/40 hover:border-white/15"}`}><TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={40} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.teamName}</span><span className="block truncate text-xs text-slate-400">@{player.username}</span></span><span className="text-xs font-black text-gold">{player.balance} pts</span></button>)}</div>}
                {coinSearch.trim().length >= 2 && !searchingCoins && coinUsers.length === 0 && <p className="text-sm text-slate-500">No players matched that search.</p>}
                {selectedCoinUser && <form onSubmit={grantCoins} className="space-y-3 rounded-xl border border-white/5 bg-navy-950/40 p-3">
                    <p className="text-sm font-bold">Granting to {selectedCoinUser.teamName} <span className="text-slate-400">(@{selectedCoinUser.username})</span></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-bold text-slate-300">Points<input required type="number" min={1} max={100000} step={1} value={grantAmount} onChange={(event) => setGrantAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-white/5 bg-navy-900 px-3 py-2.5 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-300">Reason<input required minLength={5} maxLength={200} value={grantReason} onChange={(event) => setGrantReason(event.target.value)} placeholder="Tournament reward" className="mt-2 w-full rounded-lg border border-white/5 bg-navy-900 px-3 py-2.5 text-sm" /></label>
                    </div>
                    <button disabled={grantingCoins} className="w-full rounded-xl bg-gold py-3 text-sm font-black text-navy-950 disabled:opacity-50">{grantingCoins ? "Granting…" : "Grant points"}</button>
                </form>}
            </section>

            <section className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Player communications</p><h2 className="mt-1 text-lg font-black">Send a notification</h2><p className="mt-1 text-xs text-slate-400">Broadcast an update to registered players.</p></div>
                <form onSubmit={sendNotification} className="space-y-3">
                    <input required maxLength={80} value={noticeForm.title} onChange={(event) => setNoticeForm({ ...noticeForm, title: event.target.value })} placeholder="Notification title" className="w-full rounded-xl border border-white/5 bg-navy-900 px-4 py-3 text-sm outline-none focus:border-gold/40" />
                    <textarea required maxLength={500} value={noticeForm.message} onChange={(event) => setNoticeForm({ ...noticeForm, message: event.target.value })} placeholder="Write your message…" className="min-h-24 w-full resize-y rounded-xl border border-white/5 bg-navy-900 px-4 py-3 text-sm outline-none focus:border-gold/40" />
                    <button disabled={sendingNotice} className="w-full rounded-xl bg-gold py-3 text-sm font-black text-navy-950 transition hover:bg-gold-light disabled:opacity-50">{sendingNotice ? "Sending…" : "Send notification"}</button>
                </form>
            </section>

            <section className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Permissions</p><h2 className="mt-1 text-lg font-black">Admin access</h2><p className="mt-1 text-xs text-slate-400">Manage people who can review disputes.</p></div>
                <div className="divide-y divide-white/5">
                    {admins.map((admin) => (
                        <div key={admin.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <TeamLogo avatar={admin.avatar} alt={`${admin.teamName} logo`} size={44} />
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{admin.teamName}</p><p className="truncate text-xs text-slate-400">[@{admin.username}] · {admin.email}</p></div>
                            <button type="button" onClick={() => { void toggleAdmin(admin); }} className="rounded-xl border border-danger/25 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-200 transition hover:bg-danger/10">Remove</button>
                        </div>
                    ))}
                    {!loading && admins.length === 0 && <p className="py-3 text-sm text-slate-500">No admin accounts returned.</p>}
                </div>
                <p className="mt-4 border-t border-white/5 pt-3 text-xs text-slate-500">Use the local bootstrap command in the project README to restore the first admin.</p>
            </section>

            {pendingDecision && (
                <div role="presentation" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !deciding) setPendingDecision(null); }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="settle-title" className="w-full max-w-md rounded-3xl border border-gold/25 bg-navy-800 p-5 shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Confirm admin decision</p>
                        <h2 id="settle-title" className="mt-2 text-xl font-black">{pendingDecision.winner ? "Settle this match?" : "Refund both entries?"}</h2>
                        {pendingDecision.winner ? <div className="mt-4 flex items-center gap-3 rounded-2xl bg-navy-950/70 p-3"><TeamLogo avatar={pendingDecision.winner.avatar} alt={`${pendingDecision.winner.teamName} logo`} size={48} /><div><p className="text-xs text-slate-400">Winner to record</p><p className="font-black">{pendingDecision.winner.teamName}</p><p className="text-xs text-slate-500">@{pendingDecision.winner.username}</p></div></div> : <p className="mt-3 rounded-xl border border-white/5 bg-navy-950/70 p-3 text-sm text-slate-300">Both players’ entry stakes will be returned, and the match will be recorded as a draw/refund.</p>}
                        <p className="mt-3 text-sm leading-5 text-slate-400">This records the admin decision and updates the verified match record. Review the submitted evidence before continuing.</p>
                        <div className="mt-5 flex gap-2"><button type="button" disabled={deciding} onClick={() => setPendingDecision(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300">Cancel</button><button type="button" disabled={deciding} onClick={() => { void decideReview(); }} className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 disabled:opacity-60">{deciding ? "Settling…" : "Confirm settlement"}</button></div>
                    </section>
                </div>
            )}
        </div>
    );
}
