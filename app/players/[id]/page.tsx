"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TeamLogo from "../../components/TeamLogo";
import CountryFlag from "../../components/CountryFlag";

type PlayerProfile = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    email: string | null;
    bio?: string | null;
    gameTags?: string;
    country?: string | null;
    totalWins: number;
    totalMatches: number;
    winRate: number;
};

export default function PlayerProfilePage() {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        void fetch(`/api/players/${id}`).then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok) setError(data?.error || "Could not load this profile.");
            else setProfile(data.profile);
        }).catch(() => {
            if (mounted) setError("Could not reach this profile. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [id]);

    return (
        <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 sm:px-6">
            <Link href="/friends" className="inline-flex text-sm font-bold text-slate-400 transition hover:text-gold">← Back to friends</Link>
            {loading && <><div className="skeleton h-64 rounded-3xl" /><div className="skeleton h-24 rounded-2xl" /></>}
            {!loading && error && <div role="alert" className="rounded-2xl border border-white/10 bg-surface p-5"><p className="font-black">This profile is private</p><p className="mt-2 text-sm text-slate-400">{error}</p></div>}
            {profile && <>
                <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-6 text-center sm:p-8">
                    <TeamLogo avatar={profile.avatar} alt={`${profile.teamName || profile.username} team logo`} size={112} className="mx-auto" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gold">DLS player</p>
                    <h1 className="mt-1 text-3xl font-black">{profile.username}</h1>
                    <p className="mt-1 font-bold text-slate-200">{profile.teamName}</p>
                    {profile.country && <p className="mt-2 text-sm text-slate-400"><CountryFlag country={profile.country} /> {profile.country}</p>}
                </header>
                <section aria-label="Verified player statistics" className="grid grid-cols-3 gap-3">
                    {[{ label: "Verified wins", value: profile.totalWins, color: "text-gold" }, { label: "Matches", value: profile.totalMatches, color: "text-white" }, { label: "Win rate", value: `${profile.winRate}%`, color: "text-neon" }].map((stat) => <article key={stat.label} className="card-lift rounded-2xl border border-white/10 bg-surface p-4 text-center"><p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{stat.label}</p></article>)}
                </section>
                <section className="rounded-2xl border border-white/10 bg-surface p-5">
                    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black uppercase tracking-wider">Player card</h2><TeamLogo avatar={profile.avatar} alt={`${profile.teamName} team logo`} size={44} /></div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{profile.bio || "This player has not added a bio yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{(profile.gameTags || "DLS").split(",").filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold">{tag.trim()}</span>)}</div>
                </section>
            </>}
        </div>
    );
}
