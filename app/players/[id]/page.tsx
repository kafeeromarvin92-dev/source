"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type PlayerProfile = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    email: string | null;
    totalWins: number;
    totalMatches: number;
    winRate: number;
};

export default function PlayerProfilePage() {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/players/${id}`).then(async (response) => {
            const data = await response.json();
            if (!response.ok) setError(data.error || "Could not load this profile.");
            else setProfile(data.profile);
        }).catch(() => setError("Could not load this profile."));
    }, [id]);

    return (
        <div className="space-y-5 px-4 pt-5">
            <Link href="/friends" className="text-sm font-semibold text-gold">← Back to friends</Link>
            {error && <div className="rounded-2xl border border-gold/20 bg-navy-800 p-5"><p className="font-bold">This profile is private</p><p className="mt-2 text-sm text-slate-400">{error}</p></div>}
            {profile && <>
                <header className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/15 to-navy-900 p-6 text-center">
                    {profile.avatar.startsWith("data:image/") ? <img src={profile.avatar} alt={`${profile.teamName || profile.username} logo`} className="mx-auto h-20 w-20 rounded-2xl object-cover" /> : <div className="text-6xl">{profile.avatar || "⚽"}</div>}
                    <h1 className="mt-3 text-2xl font-black">{profile.username}</h1>
                    <p className="text-sm text-gold">{profile.teamName}</p>
                    {profile.email && <p className="mt-2 text-xs text-slate-400">{profile.email} · verified Gmail</p>}
                </header>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-navy-800 p-4"><p className="text-2xl font-black">{profile.totalWins}</p><p className="text-xs text-slate-400">Verified wins</p></div>
                    <div className="rounded-xl bg-navy-800 p-4"><p className="text-2xl font-black">{profile.totalMatches}</p><p className="text-xs text-slate-400">Matches</p></div>
                    <div className="rounded-xl bg-navy-800 p-4"><p className="text-2xl font-black">{profile.winRate}%</p><p className="text-xs text-slate-400">Win rate</p></div>
                </div>
            </>}
        </div>
    );
}
