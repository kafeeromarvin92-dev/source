"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Match = { id: string; status: string; verified: boolean; createdAt: string; creator: { id: string; username: string; teamName?: string }; acceptedBy?: { id: string; username: string; teamName?: string } | null; decision?: { winnerId?: string | null } | null };

export default function MatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [error, setError] = useState("");

    async function loadMatches() {
        const response = await fetch("/api/challenges?mine=true");
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not load your matches.");
            return;
        }
        setMatches(data.challenges);
    }

    useEffect(() => {
        void fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            setCurrentUserId(data.user.id);
        });
        void fetch("/api/challenges?mine=true").then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Could not load your matches.");
                return;
            }
            setMatches(data.challenges);
        });
    }, []);

    async function cancelChallenge(matchId: string) {
        const response = await fetch(`/api/challenges/${matchId}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not cancel this challenge.");
            return;
        }
        await loadMatches();
    }

    return (
        <div className="px-4 pt-4 space-y-5">
            <h1 className="text-2xl font-extrabold">My Matches</h1>
            <p className="text-slate-400">Accepted challenges and result verification live here.</p>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            {!error && matches.length === 0 && <p className="text-sm text-slate-400">No matches yet. Accept an open challenge from the lobby.</p>}
            <div className="space-y-3">
                {matches.map((match) => {
                    const opponent = match.creator.id === currentUserId ? match.acceptedBy?.username || "Opponent pending" : match.creator.username;
                    const status = match.status.toUpperCase();
                    const creatorName = match.creator.teamName || match.creator.username;
                    const acceptedByName = match.acceptedBy?.teamName || match.acceptedBy?.username || "Opponent";
                    const summary = match.decision?.winnerId ? `Winner: ${match.decision.winnerId === match.creator.id ? creatorName : acceptedByName}` : "Result pending verification";
                    return <article key={match.id} className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div><p className="font-bold">vs {opponent}</p><p className="text-xs text-slate-400 mt-1">Free DLS match</p></div>
                            <span className="text-xs uppercase tracking-wide text-gold">{status}</span>
                        </div>
                        <div className="bg-navy-700 rounded-xl px-3 py-3"><p className="text-xs text-slate-400">Result summary</p><p className="font-bold mt-1">{summary}</p></div>
                        {status === "OPEN" && match.creator.id === currentUserId && <button onClick={() => { void cancelChallenge(match.id); }} className="w-full border border-red-400/40 text-red-200 font-semibold py-2 rounded-xl">Cancel open challenge</button>}
                        <Link href={`/match/${match.id}`} className="block text-center border border-navy-600 text-slate-200 font-semibold py-2 rounded-xl">Open private challenge</Link>
                    </article>;
                })}
            </div>
        </div>
    );
}
