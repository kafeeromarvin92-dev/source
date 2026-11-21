"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeamLogo from "../components/TeamLogo";

type Player = { id: string; username: string; teamName: string; avatar: string };
type Result = {
    id: string;
    createdAt: string;
    creator: Player;
    acceptedBy: Player | null;
    decision: { winnerId: string | null; creatorScore: number | null; acceptedByScore: number | null; confidence: number | null; decidedAt: string | null };
};

export default function ResultsPage() {
    const [results, setResults] = useState<Result[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        void fetch("/api/results").then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok) setError(data?.error || "Could not load results.");
            else setResults(Array.isArray(data?.results) ? data.results : []);
        }).catch(() => {
            if (mounted) setError("Could not reach results. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pt-6 sm:px-6">
            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-neon/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon">Official record</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Verified results</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Results confirmed by both players or settled by an admin.</p>
            </header>
            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
            {loading && <div className="space-y-3"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div>}
            {!loading && !error && results.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center"><TeamLogo size={60} alt="Noble Gamers logo" className="mx-auto" /><h2 className="mt-3 font-black">No verified results yet</h2><p className="mt-1 text-sm text-slate-400">Completed matches will appear here after the result is confirmed.</p><Link href="/create-challenge" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">Create a challenge</Link></div>}
            {!loading && results.length > 0 && <div className="grid gap-3 md:grid-cols-2">
                {results.map((result) => {
                    const teamA = result.creator;
                    const teamB = result.acceptedBy;
                    const creatorWon = result.decision.winnerId === teamA.id;
                    const hasScore = Number.isInteger(result.decision.creatorScore) && Number.isInteger(result.decision.acceptedByScore);
                    return (
                        <article key={result.id} className="card-lift rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-neon/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-neon">Verified</span><time className="text-[10px] text-slate-500">{new Date(result.decision.decidedAt || result.createdAt).toLocaleDateString()}</time></div>
                            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <div className="flex min-w-0 flex-col items-center text-center"><TeamLogo avatar={teamA.avatar} alt={`${teamA.teamName} logo`} size={56} /><p className="mt-2 w-full truncate text-xs font-black">{teamA.teamName || teamA.username}</p></div>
                                <p className="whitespace-nowrap text-center text-lg font-black text-gold">{hasScore ? `${result.decision.creatorScore} – ${result.decision.acceptedByScore}` : "VS"}</p>
                                <div className="flex min-w-0 flex-col items-center text-center">{teamB ? <TeamLogo avatar={teamB.avatar} alt={`${teamB.teamName} logo`} size={56} /> : <TeamLogo size={56} alt="Opponent logo" />}<p className="mt-2 w-full truncate text-xs font-black">{teamB?.teamName || teamB?.username || "Opponent"}</p></div>
                            </div>
                            <p className="mt-4 rounded-xl border border-neon/10 bg-neon/5 p-3 text-center text-xs font-bold text-green-200">Winner: {creatorWon ? teamA.teamName || teamA.username : teamB?.teamName || teamB?.username || "Opponent"}</p>
                        </article>
                    );
                })}
            </div>}
        </div>
    );
}
