"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { calculateTournamentPrizes, isPrizeSplit } from "../lib/tournament-utils";

type TournamentCardData = {
    id: string;
    name: string;
    game: string;
    size: number;
    entryFee: number;
    pot: number;
    prizeSplit: unknown;
    startAt: string;
    status: string;
    playersJoined: number;
    myEntry: { id: string; seed: number } | null;
};

function countdown(startAt: string, now: number) {
    const seconds = Math.max(0, Math.floor((new Date(startAt).getTime() - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<TournamentCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [notice, setNotice] = useState({ kind: "", text: "" });
    const [joiningId, setJoiningId] = useState("");
    const [now, setNow] = useState(0);

    const loadTournaments = useCallback(async () => {
        try {
            const response = await fetch("/api/tournaments");
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not load tournaments.");
            setTournaments(Array.isArray(data?.tournaments) ? data.tournaments : []);
            setLoadError("");
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : "Could not load tournaments.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => { void loadTournaments(); }, 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(timer);
        };
    }, [loadTournaments]);

    async function joinTournament(tournament: TournamentCardData) {
        setJoiningId(tournament.id);
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch(`/api/tournaments/${tournament.id}/join`, { method: "POST" });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not join this tournament.");
            setNotice({ kind: "success", text: `You’re IN! Seed #${data.entry.seed}.` });
            await loadTournaments();
        } catch (error) {
            setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not join this tournament." });
        } finally {
            setJoiningId("");
        }
    }

    function inviteFriend() {
        const invite = `${window.location.origin}/register`;
        window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on Noble Gamers for DLS tournaments: ${invite}`)}`, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="mx-auto max-w-5xl space-y-5 px-3 pt-4 sm:space-y-6 sm:px-6 sm:pt-6">
            <header className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-4 sm:p-8">
                <div className="flex items-center gap-3">
                    <Image src="/noble-gamers-logo.jpg" alt="Noble Gamers" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-2xl bg-fuchsia-500 object-contain shadow-lg shadow-fuchsia-950/30" />
                    <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Noble Gamers · DLS</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Tournaments</h1></div>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Join a single-elimination bracket, play your way to the final, and win virtual coins.</p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-neon"><span className="live-dot h-2 w-2 rounded-full bg-neon" /> Brackets auto-refresh</span>
            </header>

            {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : "border-neon/30 bg-neon/10 text-green-200"}`}>{notice.text}</p>}
            {loadError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{loadError}</p>}

            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">Open spots</p><h2 className="mt-1 text-lg font-black sm:text-xl">Upcoming & live</h2></div><button type="button" onClick={() => { void loadTournaments(); }} className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/30 hover:text-gold">Refresh</button></div>
                {loading ? <div className="grid gap-3 md:grid-cols-2"><div className="skeleton h-56 rounded-2xl" /><div className="skeleton h-56 rounded-2xl" /></div> : tournaments.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {tournaments.map((tournament) => {
                            const prizes = isPrizeSplit(tournament.prizeSplit) ? calculateTournamentPrizes(tournament.pot, tournament.prizeSplit) : null;
                            const isFull = tournament.playersJoined >= tournament.size;
                            return (
                                <article key={tournament.id} className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-surface-raised to-surface p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tournament.status === "LIVE" ? "bg-neon/10 text-neon" : tournament.status === "FINISHED" ? "bg-white/5 text-slate-400" : "bg-gold/10 text-gold"}`}>{tournament.status === "LIVE" && <span className="live-dot h-1.5 w-1.5 rounded-full bg-neon" />}{tournament.status}</span><h3 className="mt-2 truncate text-xl font-black">{tournament.name}</h3><p className="mt-1 text-xs text-slate-500">{tournament.game} · {tournament.size}-player bracket</p></div>
                                        <div className="shrink-0 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-right"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Prize pot</p><p className="font-black text-gold">{tournament.pot.toLocaleString()}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-navy-950/60 p-3 text-center">
                                        <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Entry</p><p className="mt-1 text-sm font-black">{tournament.entryFee === 0 ? "Free" : `${tournament.entryFee.toLocaleString()} coins`}</p></div>
                                        <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Players</p><p className="mt-1 text-sm font-black">{tournament.playersJoined}/{tournament.size}</p></div>
                                        <div className="col-span-2 border-t border-white/5 pt-2"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Starts in</p><p className="mt-1 font-mono text-lg font-black text-neon">{now ? countdown(tournament.startAt, now) : "—"}</p></div>
                                    </div>
                                    <div aria-label={`${tournament.playersJoined} of ${tournament.size} players joined`} className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-neon transition-[width]" style={{ width: `${Math.min(100, tournament.playersJoined / tournament.size * 100)}%` }} /></div>
                                    {prizes && <p className="text-xs font-bold text-slate-300">Winner takes <span className="text-gold">{prizes.winner.toLocaleString()} coins</span></p>}
                                    {tournament.myEntry ? (
                                        <div className="flex items-center justify-between gap-2 rounded-xl border border-gold/25 bg-gold/10 p-3"><span className="text-xs font-black text-gold">You’re IN! Seed #{tournament.myEntry.seed}</span><Link href={`/tournaments/${tournament.id}`} className="rounded-lg bg-gold px-3 py-2 text-xs font-black text-navy-950">View bracket</Link></div>
                                    ) : tournament.status === "OPEN" ? (
                                        <button type="button" disabled={joiningId === tournament.id || isFull} onClick={() => { void joinTournament(tournament); }} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">{joiningId === tournament.id ? "Joining…" : isFull ? "Bracket full" : tournament.entryFee === 0 ? "Join free" : `Join · ${tournament.entryFee.toLocaleString()} coins`}</button>
                                    ) : (
                                        <Link href={`/tournaments/${tournament.id}`} className="block rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black text-slate-200 hover:border-gold/30 hover:text-gold">{tournament.status === "FINISHED" ? "View results" : "View live bracket"}</Link>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : !loadError ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center">
                        <span className="text-3xl" aria-hidden="true">🏆</span><h3 className="mt-2 font-black">No tournaments yet</h3><p className="mt-1 text-sm text-slate-400">Invite your squad and check back for the next cup.</p><button type="button" onClick={inviteFriend} className="mt-4 rounded-xl border border-neon/30 bg-neon/10 px-4 py-3 text-xs font-black text-neon hover:bg-neon/20">Invite a friend on WhatsApp</button>
                    </div>
                ) : null}
            </section>
            <p className="pb-4 text-center text-[10px] leading-5 text-slate-500">Tournament match results are recorded by admins in this first release. Automated ready checks and timeout forfeits are not enabled yet.</p>
        </div>
    );
}
