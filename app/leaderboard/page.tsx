"use client";

import { useEffect, useState } from "react";

type Player = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    wins: number;
    losses: number;
    goalDifference: number;
    winStreak: number;
    rank: number;
};

export default function LeaderboardPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/leaderboard").then(async (response) => {
            const data = await response.json();
            if (!response.ok) setError(data.error || "Could not load the leaderboard.");
            else setPlayers(data.leaderboard);
            setLoading(false);
        }).catch(() => {
            setError("Could not load the leaderboard.");
            setLoading(false);
        });
    }, []);

    return (
        <div className="px-4 pt-4 space-y-5">
            <div>
                <h1 className="text-2xl font-extrabold">Leaderboard</h1>
                <p className="text-sm text-slate-400 mt-1">Top players by verified wins, then goal difference.</p>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {loading && <p className="text-sm text-slate-400">Loading leaderboard...</p>}
            {!loading && !error && players.length === 0 && <p className="text-sm text-slate-400">No Gemini-verified matches yet.</p>}
            <div className="space-y-3">
                {players.map((player) => (
                    <article key={player.id} className="bg-navy-800 border border-navy-700 rounded-2xl p-4 flex items-center gap-3">
                        <span className="w-8 text-center text-gold font-extrabold">#{player.rank}</span>
                        {player.avatar.startsWith("data:image/") ? (
                            <img src={player.avatar} alt={`${player.teamName || player.username} avatar`} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            <span className="w-12 h-12 rounded-full bg-navy-700 flex items-center justify-center text-xl">{player.avatar || "⚽"}</span>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="font-bold truncate">{player.username}</p>
                            <p className="text-xs text-slate-400 truncate">{player.teamName || `Goal difference ${player.goalDifference}`}</p>
                        </div>
                        <div className="text-right text-xs">
                            <p className="text-green-300 font-bold">{player.wins}W - {player.losses}L</p>
                            <p className="text-slate-400">🔥 {player.winStreak} streak</p>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}