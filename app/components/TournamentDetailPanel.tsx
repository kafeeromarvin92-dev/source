"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import TournamentBracket, { TournamentMatchView, TournamentPlayerView } from "./TournamentBracket";
import { isPrizeSplit, calculateTournamentPrizes } from "../lib/tournament-utils";

type TournamentEntryView = {
    id: string;
    seed: number;
    status: string;
    user: TournamentPlayerView;
};

type TournamentView = {
    id: string;
    name: string;
    game: string;
    size: number;
    entryFee: number;
    pot: number;
    prizeSplit: unknown;
    startAt: string;
    status: string;
    format: string;
    bestOf: number;
    playersJoined: number;
    viewerId: string | null;
    entries: TournamentEntryView[];
    matches: TournamentMatchView[];
};

function countdown(startAt: string, now: number) {
    const seconds = Math.max(0, Math.floor((new Date(startAt).getTime() - now) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return `${days ? `${days}d ` : ""}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
}

export default function TournamentDetailPanel({ tournamentId, admin = false }: { tournamentId: string; admin?: boolean }) {
    const [tournament, setTournament] = useState<TournamentView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState({ kind: "", text: "" });
    const [now, setNow] = useState(0);
    const [selectedResult, setSelectedResult] = useState<{ match: TournamentMatchView; winner: TournamentPlayerView } | null>(null);
    const [scoreA, setScoreA] = useState("");
    const [scoreB, setScoreB] = useState("");
    const [forfeit, setForfeit] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadTournament = useCallback(async () => {
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}`);
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not load this tournament.");
            setTournament(data.tournament as TournamentView);
            setError("");
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load this tournament.");
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => { void loadTournament(); }, 0);
        const refreshTimer = window.setInterval(() => { void loadTournament(); }, 15000);
        const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(refreshTimer);
            window.clearInterval(clockTimer);
        };
    }, [loadTournament]);

    async function startTournament() {
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch(`/api/admin/tournaments/${tournamentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not start the tournament.");
            setNotice({ kind: "success", text: "Tournament is live. The first round is ready." });
            await loadTournament();
        } catch (startError) {
            setNotice({ kind: "error", text: startError instanceof Error ? startError.message : "Could not start the tournament." });
        }
    }

    function chooseWinner(match: TournamentMatchView, winner: TournamentPlayerView) {
        setSelectedResult({ match, winner });
        setScoreA("");
        setScoreB("");
        setForfeit(false);
        setNotice({ kind: "", text: "" });
    }

    async function submitResult(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedResult) return;
        setSaving(true);
        setNotice({ kind: "", text: "" });
        try {
            const body: { winnerId: string; scoreA?: number; scoreB?: number; forfeit: boolean } = {
                winnerId: selectedResult.winner.id,
                forfeit,
            };
            if (scoreA !== "" || scoreB !== "") {
                if (scoreA === "" || scoreB === "") throw new Error("Enter both scores or leave both blank.");
                body.scoreA = Number(scoreA);
                body.scoreB = Number(scoreB);
            }
            const response = await fetch(`/api/admin/tournaments/${tournamentId}/matches/${selectedResult.match.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not settle this match.");
            setSelectedResult(null);
            setNotice({ kind: "success", text: data.result.tournamentFinished ? "Champion crowned and tournament prizes paid." : `${selectedResult.winner.teamName} advanced to the next round.` });
            await loadTournament();
        } catch (resultError) {
            setNotice({ kind: "error", text: resultError instanceof Error ? resultError.message : "Could not settle this match." });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="mx-auto max-w-6xl space-y-4 px-4 pt-6"><div className="skeleton h-44 rounded-3xl" /><div className="skeleton h-80 rounded-3xl" /></div>;
    if (error || !tournament) {
        return <div className="mx-auto max-w-3xl px-4 pt-8"><p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error || "Tournament not found."}</p><Link href={admin ? "/admin/tournaments" : "/tournaments"} className="mt-4 inline-flex text-sm font-bold text-gold">← Back to tournaments</Link></div>;
    }

    const myEntry = tournament.entries.find((entry) => entry.user.id === tournament.viewerId) ?? null;
    const myMatches = myEntry ? tournament.matches.filter((match) => match.playerA?.id === myEntry.user.id || match.playerB?.id === myEntry.user.id) : [];
    const myMatch = myMatches.find((match) => ["READY", "PLAYING", "AWAITING_SCREENSHOT", "DISPUTED"].includes(match.status)) ?? myMatches[myMatches.length - 1] ?? null;
    const prizes = isPrizeSplit(tournament.prizeSplit) ? calculateTournamentPrizes(tournament.pot, tournament.prizeSplit) : null;
    const canStart = tournament.status === "OPEN" && tournament.playersJoined === tournament.size && new Date(tournament.startAt).getTime() <= now;

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
            <header className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-8">
                <div className="absolute -right-4 -top-8 text-8xl opacity-[0.08]" aria-hidden="true">🏆</div>
                <Link href={admin ? "/admin/tournaments" : "/tournaments"} className="text-xs font-bold text-slate-400 hover:text-gold">← Tournaments</Link>
                <div className="relative mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-neon">
                            {tournament.status === "LIVE" && <span className="live-dot h-1.5 w-1.5 rounded-full bg-neon" />}{tournament.status}
                        </div>
                        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{tournament.name}</h1>
                        <p className="mt-2 text-sm text-slate-400">DLS · Best of {tournament.bestOf} · {tournament.size}-player single elimination</p>
                        {myEntry && <p className="mt-3 inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-black text-gold">You’re in · Seed #{myEntry.seed}</p>}
                    </div>
                    <div className="grid min-w-[13rem] grid-cols-2 gap-2 text-center">
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live pot</p><p className="mt-1 text-lg font-black text-gold">{tournament.pot.toLocaleString()} coins</p></div>
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Players</p><p className="mt-1 text-lg font-black">{tournament.playersJoined}/{tournament.size}</p></div>
                        <div className="col-span-2 rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{tournament.status === "OPEN" ? "Starts in" : "Scheduled start"}</p><p className="mt-1 font-mono text-lg font-black text-neon">{now ? countdown(tournament.startAt, now) : "—"}</p></div>
                    </div>
                </div>
                {prizes && <p className="relative mt-4 text-sm font-bold text-slate-300">Winner {prizes.winner.toLocaleString()} · Runner-up {prizes.runnerUp.toLocaleString()} · Semi-finalists {prizes.semiEach.toLocaleString()} each</p>}
                {admin && tournament.status === "OPEN" && (
                    <div className="relative mt-5 flex flex-wrap items-center gap-3">
                        <button type="button" disabled={!canStart} onClick={() => { void startTournament(); }} className="rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 disabled:cursor-not-allowed disabled:opacity-40">Start tournament</button>
                        {!canStart && <span className="text-xs text-slate-400">{tournament.playersJoined !== tournament.size ? "Fill every bracket slot to start." : "The scheduled start time has not arrived."}</span>}
                    </div>
                )}
            </header>

            {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : "border-neon/30 bg-neon/10 text-green-200"}`}>{notice.text}</p>}
            {tournament.entries.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-surface p-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Players joined</h2>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {tournament.entries.map((entry) => <div key={entry.id} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${entry.user.id === tournament.viewerId ? "border-gold/40 bg-gold/10" : "border-white/5 bg-navy-950/50"}`}><TeamLogo avatar={entry.user.avatar} alt={`${entry.user.teamName} logo`} size={32} /><span className="max-w-36 truncate text-xs font-bold">{entry.user.teamName}</span><span className="text-[10px] font-black text-gold">#{entry.seed}</span></div>)}
                    </div>
                </section>
            )}

            {myMatch && !admin && (
                <section className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold">Your highlighted match</p>
                    <p className="mt-2 text-sm font-bold">{myMatch.playerA?.teamName || "TBD"} vs {myMatch.playerB?.teamName || "TBD"}</p>
                    <p className="mt-1 text-xs text-slate-400">Match code <span className="font-mono font-black tracking-widest text-gold">{myMatch.challengeCode || "Assigned when opponent is ready"}</span></p>
                </section>
            )}

            {tournament.matches.length > 0
                ? <TournamentBracket matches={tournament.matches} viewerId={tournament.viewerId} admin={admin} onChooseWinner={chooseWinner} onOpenMatch={(match) => setNotice({ kind: "success", text: `Match code ${match.challengeCode || "not assigned yet"} · ${match.playerA?.teamName === myEntry?.user.teamName ? match.playerB?.teamName || "opponent TBD" : match.playerA?.teamName || "opponent TBD"} is your opponent.` })} />
                : <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-6 text-center text-sm text-slate-400">The bracket is being prepared.</div>}

            {selectedResult && (
                <div role="presentation" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelectedResult(null); }}>
                    <form role="dialog" aria-modal="true" aria-labelledby="tournament-settle-title" onSubmit={(event) => { void submitResult(event); }} className="w-full max-w-md space-y-4 rounded-3xl border border-gold/25 bg-navy-800 p-5 shadow-2xl">
                        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Tournament result</p><h2 id="tournament-settle-title" className="mt-1 text-xl font-black">Settle match {selectedResult.match.position}?</h2></div>
                        <div className="flex items-center gap-3 rounded-2xl bg-navy-950/70 p-3"><TeamLogo avatar={selectedResult.winner.avatar} alt={`${selectedResult.winner.teamName} logo`} size={44} /><div><p className="text-xs text-slate-400">Winner to record</p><p className="font-black">{selectedResult.winner.teamName}</p><p className="text-xs text-slate-500">@{selectedResult.winner.username}</p></div></div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="text-xs font-bold text-slate-300">Team A score<input type="number" min={0} max={99} value={scoreA} onChange={(event) => setScoreA(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-3 text-sm" /></label>
                            <label className="text-xs font-bold text-slate-300">Team B score<input type="number" min={0} max={99} value={scoreB} onChange={(event) => setScoreB(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-3 text-sm" /></label>
                        </div>
                        <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-navy-950/60 p-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={forfeit} onChange={(event) => setForfeit(event.target.checked)} className="accent-gold" /> Record this result as a forfeit</label>
                        <p className="text-xs leading-5 text-slate-400">This advances the selected winner and records the result in tournament history. Regular challenge reviews and disputes are unchanged.</p>
                        <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => setSelectedResult(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 disabled:opacity-60">{saving ? "Saving…" : "Confirm result"}</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}
