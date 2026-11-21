"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import TeamLogo from "../components/TeamLogo";
import CountryFlag from "../components/CountryFlag";

type Player = { id: string; username: string; teamName?: string; avatar?: string; country?: string | null };
type Match = {
    id: string;
    status: string;
    entryStake: number;
    verified: boolean;
    createdAt: string;
    creator: Player;
    acceptedBy?: Player | null;
    decision?: { winnerId?: string | null } | null;
};

const statusClass: Record<string, string> = {
    OPEN: "bg-gold/10 text-gold",
    ACCEPTED: "bg-neon/10 text-neon",
    REVIEW: "bg-blue-400/10 text-blue-200",
    DISPUTED: "bg-danger/10 text-red-200",
    SETTLED: "bg-neon/10 text-neon",
    CANCELLED: "bg-white/5 text-slate-400",
};

export default function MatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState("");

    const loadMatches = useCallback(async () => {
        setError("");
        const response = await fetch("/api/challenges?mine=true");
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            setError(data?.error || "Could not load your matches.");
            return;
        }
        setMatches(Array.isArray(data?.challenges) ? data.challenges : []);
    }, []);

    useEffect(() => {
        let mounted = true;
        void Promise.all([fetch("/api/auth/me"), fetch("/api/challenges?mine=true")]).then(async ([meResponse, matchesResponse]) => {
            const [meData, matchesData] = await Promise.all([
                meResponse.json().catch(() => null),
                matchesResponse.json().catch(() => null),
            ]);
            if (!mounted) return;
            if (meResponse.ok && meData?.user?.id) setCurrentUserId(meData.user.id);
            if (!matchesResponse.ok) setError(matchesData?.error || "Could not load your matches.");
            else setMatches(Array.isArray(matchesData?.challenges) ? matchesData.challenges : []);
        }).catch(() => {
            if (mounted) setError("Could not reach your matches. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    async function cancelChallenge(matchId: string) {
        setCancelling(matchId);
        setError("");
        try {
            const response = await fetch(`/api/challenges/${matchId}`, { method: "DELETE" });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || "Could not cancel this challenge.");
                return;
            }
            await loadMatches();
        } catch {
            setError("Could not reach Noble Gamers. The challenge was not cancelled.");
        } finally {
            setCancelling("");
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-neon/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon">Your fixtures</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">My matches</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Accepted challenges and verified results live here. Upload order never decides who won.</p>
                <Link href="/create-challenge" className="mt-5 inline-flex rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 transition hover:bg-gold-light">Create a challenge</Link>
            </header>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
            {loading && <div className="grid gap-3 md:grid-cols-2"><div className="skeleton h-44 rounded-2xl" /><div className="skeleton h-44 rounded-2xl" /></div>}
            {!loading && !error && matches.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center"><TeamLogo size={60} alt="Noble Gamers logo" className="mx-auto" /><h2 className="mt-3 font-black">No matches yet</h2><p className="mt-1 text-sm text-slate-400">Create a challenge and invite someone you know to play.</p><Link href="/create-challenge" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">Start a match</Link></div>}

            {!loading && matches.length > 0 && <div className="grid gap-3 md:grid-cols-2">
                {matches.map((match) => {
                    const isCreator = match.creator.id === currentUserId;
                    const opponent = isCreator ? match.acceptedBy : match.creator;
                    const status = match.status.toUpperCase();
                    const winner = match.decision?.winnerId
                        ? match.decision.winnerId === match.creator.id ? match.creator : match.acceptedBy
                        : null;
                    const summary = winner ? `Verified winner: ${winner.teamName || winner.username}` : status === "DISPUTED" ? "Disputed · waiting for admin review" : "Result awaiting confirmation";
                    return (
                        <article key={match.id} className="card-lift space-y-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{match.entryStake} pts · winner gets {Math.floor(match.entryStake * 1.8)} pts</p><p className="mt-1 text-xs text-slate-400">vs {opponent?.username || "Opponent pending"}</p></div>
                                <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider ${statusClass[status] || statusClass.CANCELLED}`}>{status}</span>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-navy-950/50 p-3">
                                <TeamLogo avatar={match.creator.avatar} alt={`${match.creator.teamName || match.creator.username} logo`} size={48} />
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black"><CountryFlag country={match.creator.country} className="mr-1" />{match.creator.teamName || match.creator.username}</p><p className="truncate text-[10px] text-slate-500">@{match.creator.username}</p></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">VS</span>
                                {match.acceptedBy ? <><div className="min-w-0 flex-1 text-right"><p className="truncate text-sm font-black"><CountryFlag country={match.acceptedBy.country} className="mr-1" />{match.acceptedBy.teamName || match.acceptedBy.username}</p><p className="truncate text-[10px] text-slate-500">@{match.acceptedBy.username}</p></div><TeamLogo avatar={match.acceptedBy.avatar} alt={`${match.acceptedBy.teamName || match.acceptedBy.username} logo`} size={48} /></> : <div className="min-w-0 flex-1 text-right"><p className="text-xs font-bold text-slate-500">Waiting for player</p><p className="text-[10px] text-slate-600">Challenge is open</p></div>}
                            </div>
                            <div className="rounded-xl border border-white/5 bg-navy-950/50 px-3 py-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Result status</p><p className={`mt-1 text-sm font-bold ${status === "SETTLED" ? "text-neon" : status === "DISPUTED" ? "text-red-200" : "text-slate-200"}`}>{summary}</p></div>
                            <div className="flex gap-2">
                                {status === "OPEN" && isCreator && <button type="button" disabled={cancelling === match.id} onClick={() => { void cancelChallenge(match.id); }} className="rounded-xl border border-danger/30 px-3 py-3 text-xs font-black text-red-200 transition hover:bg-danger/10 disabled:opacity-50">{cancelling === match.id ? "Cancelling…" : "Cancel"}</button>}
                                <Link href={`/match/${match.id}`} className="flex-1 rounded-xl bg-white/5 px-3 py-3 text-center text-xs font-black text-white transition hover:bg-gold hover:text-navy-950">Open match room →</Link>
                            </div>
                        </article>
                    );
                })}
            </div>}
        </div>
    );
}
