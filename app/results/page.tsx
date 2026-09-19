"use client";

import { useEffect, useState } from "react";

type Result = {
    id: string;
    createdAt: string;
    creator: { id: string; username: string; teamName: string; avatar: string };
    acceptedBy: { id: string; username: string; teamName: string; avatar: string } | null;
    decision: { winnerId: string | null; creatorScore: number | null; acceptedByScore: number | null; confidence: number | null; decidedAt: string | null };
};

export default function ResultsPage() {
    const [results, setResults] = useState<Result[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/results").then(async (response) => {
            const data = await response.json();
            if (!response.ok) setError(data.error || "Could not load results.");
            else setResults(data.results);
        }).catch(() => setError("Could not load results."));
    }, []);

    return <div className="px-4 pt-4 space-y-5">
        <div><h1 className="text-2xl font-extrabold">Public Results</h1><p className="text-slate-400 mt-2">Verified results from completed matches.</p></div>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        {!error && results.length === 0 && <p className="text-sm text-slate-400">No verified results yet.</p>}
        <div className="space-y-3">{results.map((result) => {
            const creatorWon = result.decision.winnerId === result.creator.id;
            const creatorName = result.creator.teamName || result.creator.username;
            const opponentName = result.acceptedBy?.teamName || result.acceptedBy?.username || "Opponent";
            const hasScore = Number.isInteger(result.decision.creatorScore) && Number.isInteger(result.decision.acceptedByScore);
            return <article key={result.id} className="bg-navy-800 border border-navy-700 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400"><span>Verified match</span><span>{result.decision.confidence != null ? `${result.decision.confidence}% AI confidence` : "Admin verified"}</span></div>
                <div className="text-center py-4"><p className="text-lg font-bold">{hasScore ? `${creatorName} ${result.decision.creatorScore} - ${opponentName} ${result.decision.acceptedByScore}` : `${creatorName} vs ${opponentName}`}</p><p className="text-sm text-green-300 mt-2">Winner: {creatorWon ? creatorName : opponentName}</p></div>
            </article>;
        })}</div>
    </div>;
}