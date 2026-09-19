"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Match = { id: string; stakeAmount: number; status: string; createdAt: string; creator: { id: string; username: string; teamName?: string }; acceptedBy?: { id: string; username: string; teamName?: string } | null; decision?: { winnerId?: string | null; creatorScore?: number | null; acceptedByScore?: number | null; reasoning?: string | null } | null };

export default function MatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState<string | null>(null);

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
        void loadMatches();
    }, []);

    async function submitEvidence(matchId: string, event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(matchId);
        const reader = new FileReader();
        reader.onload = async () => {
            const response = await fetch(`/api/challenges/${matchId}/room`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submission", image: reader.result }) });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                setError(data?.error || "Could not submit the screenshot.");
            }
            setUploading(null);
            await loadMatches();
        };
        reader.readAsDataURL(file);
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
                    const hasScore = Number.isInteger(match.decision?.creatorScore) && Number.isInteger(match.decision?.acceptedByScore);
                    const creatorName = match.creator.teamName || match.creator.username;
                    const acceptedByName = match.acceptedBy?.teamName || match.acceptedBy?.username || "Opponent";
                    const summary = hasScore ? `${creatorName} ${match.decision?.creatorScore} - ${acceptedByName} ${match.decision?.acceptedByScore}` : match.decision?.winnerId ? `Winner: ${match.decision.winnerId === match.creator.id ? creatorName : acceptedByName}` : "Result pending verification";
                    return <article key={match.id} className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div><p className="font-bold">vs {opponent}</p><p className="text-xs text-slate-400 mt-1">{match.stakeAmount.toLocaleString()} UGX stake</p></div>
                            <span className="text-xs uppercase tracking-wide text-gold">{status}</span>
                        </div>
                        <div className="bg-navy-700 rounded-xl px-3 py-3"><p className="text-xs text-slate-400">Result summary</p><p className="font-bold mt-1">{summary}</p></div>
                        {status !== "OPEN" && status !== "SETTLED" && status !== "CANCELLED" && <label className="block text-center bg-gold text-navy-950 font-bold py-3 rounded-xl cursor-pointer">{uploading === match.id ? "Uploading..." : "Submit result screenshot"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void submitEvidence(match.id, event); }} /></label>}
                        <Link href={`/match/${match.id}`} className="block text-center border border-navy-600 text-slate-200 font-semibold py-2 rounded-xl">Open private challenge</Link>
                    </article>;
                })}
            </div>
        </div>
    );
}