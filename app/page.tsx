"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import TeamLogo from "./components/TeamLogo";
import CountryFlag from "./components/CountryFlag";
import type { Challenge, User } from "./types";

type OnlinePlayer = { id: string; username: string; teamName: string; avatar: string; country?: string | null };
type Tournament = { id: string; name: string; game: string; size: number; entryFee: number; pot: number; startAt: string; status: string; playersJoined: number };
type Notification = { id: string; title: string; message: string; kind: string; createdAt?: string };

function SkeletonCard({ className = "h-28" }: { className?: string }) {
    return <div className={`skeleton rounded-2xl ${className}`} aria-hidden="true" />;
}

export default function LobbyPage() {
    const [user, setUser] = useState<User | null>(null);
    const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
    const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        const results = await Promise.allSettled([
            fetch("/api/auth/me", { cache: "no-store" }),
            fetch("/api/challenges", { cache: "no-store" }),
            fetch("/api/tournaments", { cache: "no-store" }),
            fetch("/api/notifications", { cache: "no-store" }),
            fetch("/api/players/online", { cache: "no-store" }),
        ]);
        const [meResult, challengeResult, tournamentResult, notificationResult, playerResult] = results;
        if (meResult.status === "fulfilled") {
            const data = await meResult.value.json().catch(() => null);
            if (meResult.value.ok && data?.user) setUser(data.user as User);
            else if (meResult.value.status !== 401) setError(data?.error || "Could not load your profile.");
        } else setError("Could not reach your profile.");
        if (challengeResult.status === "fulfilled") {
            const data = await challengeResult.value.json().catch(() => null);
            if (challengeResult.value.ok) setOpenChallenges(Array.isArray(data?.challenges) ? data.challenges : []);
            else setError((current) => current || data?.error || "Could not load open challenges.");
        } else setError((current) => current || "Could not reach open challenges.");
        if (tournamentResult.status === "fulfilled") {
            const data = await tournamentResult.value.json().catch(() => null);
            if (tournamentResult.value.ok) setTournaments(Array.isArray(data?.tournaments) ? data.tournaments : []);
        }
        if (notificationResult.status === "fulfilled" && notificationResult.value.ok) {
            const data = await notificationResult.value.json().catch(() => null);
            setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        }
        if (playerResult.status === "fulfilled" && playerResult.value.ok) {
            const data = await playerResult.value.json().catch(() => null);
            setOnlinePlayers(Array.isArray(data?.players) ? data.players : []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadData(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadData]);

    function inviteFriend() {
        const invite = `${window.location.origin}/register`;
        window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on Noble Gamers and challenge me in DLS: ${invite}`)}`, "_blank", "noopener,noreferrer");
    }

    const canPlay = Boolean(user?.id);
    return (
        <div className="mx-auto max-w-5xl space-y-7 px-4 pt-5 sm:px-6 lg:pt-8">
            <header className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-3"><TeamLogo avatar={user?.avatar} alt="Noble Gamers team logo" size={48} /><span className="min-w-0"><span className="block truncate text-base font-black tracking-tight">NOBLE <span className="text-gold">GAMERS</span></span><span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">DLS · Play for pride</span></span></Link>
                <Link href={canPlay ? "/notifications" : "/login"} aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-surface text-lg transition hover:border-gold/30 hover:bg-surface-raised">◉</Link>
            </header>

            {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200"><span>{error}</span><button type="button" onClick={() => { void loadData(); }} className="shrink-0 rounded-xl border border-danger/40 px-3 py-2 text-xs font-black">Retry</button></div>}

            <section className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-gold/30 bg-navy-950 p-5 shadow-2xl shadow-black/30 sm:p-8"><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,15,26,.96),rgba(10,15,26,.58),rgba(10,15,26,.78)),url('/stadium.jpg')] bg-cover bg-center" aria-hidden="true" /><div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-black/20" aria-hidden="true" /><div className="relative flex min-h-[350px] flex-col justify-end"><div className="inline-flex w-fit items-center gap-2 rounded-full border border-neon/20 bg-black/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-neon"><span className="live-dot h-2 w-2 rounded-full bg-neon" /> Live lobby</div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-gold">{user ? `Ready to flex, ${user.username}?` : "Ready to flex?"}</p><h1 className="mt-2 max-w-xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl">Your next win<br className="hidden sm:block" /> starts here.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-slate-200/75">Challenge a real rival, play your DLS match, and submit the final score for verification.</p><Link href={canPlay ? "/create-challenge" : "/login"} className="pulse-glow mt-5 inline-flex w-fit items-center gap-2 rounded-2xl bg-gold px-5 py-3.5 text-sm font-black text-navy-950 shadow-lg transition hover:bg-gold-light">⚡ Create a challenge →</Link><div className="mt-6 grid max-w-xl grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center">{[{ label: "Verified wins", value: user?.totalWins ?? 0 }, { label: "Win rate", value: `${user?.winRate ?? 0}%` }, { label: "Matches", value: user?.totalMatches ?? 0 }, { label: "Points", value: user?.coinBalance ?? 0 }].map((stat) => <div key={stat.label} className="rounded-xl bg-black/30 px-2 py-3"><p className="text-xl font-black">{loading ? "—" : stat.value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300/70">{stat.label}</p></div>)}</div></div></section>

            {notifications.length > 0 && <section className="overflow-hidden rounded-2xl border border-gold/20 bg-surface"><div className="flex gap-6 overflow-x-auto px-4 py-3">{notifications.map((notification) => <Link key={notification.id} href="/notifications" className="min-w-[240px] border-r border-white/10 pr-6 last:border-0"><p className="text-[9px] font-black uppercase tracking-widest text-gold">{notification.kind}</p><p className="mt-1 truncate text-sm font-black">{notification.title}</p><p className="mt-1 truncate text-xs text-slate-400">{notification.message}</p></Link>)}</div></section>}

            <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">Live now</p><h2 className="mt-1 text-xl font-black">Players online</h2></div>{!loading && <span className="rounded-full bg-neon/10 px-3 py-1 text-xs font-black text-neon">{onlinePlayers.length} online</span>}</div>{loading ? <div className="grid gap-3 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div> : onlinePlayers.length > 0 ? <div className="flex gap-3 overflow-x-auto pb-2">{onlinePlayers.map((player) => <Link key={player.id} href={`/players/${player.id}`} className="card-lift min-w-36 rounded-2xl border border-neon/15 bg-surface p-4 text-center"><div className="relative mx-auto w-fit"><TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={56} /><span className="live-dot absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-neon" /></div><p className="mt-3 truncate text-sm font-black"><CountryFlag country={player.country} className="mr-1" />{player.teamName}</p><p className="truncate text-xs text-slate-400">@{player.username}</p></Link>)}</div> : <div className="rounded-2xl border border-white/10 bg-surface p-5 sm:flex sm:items-center sm:justify-between"><div><h3 className="font-black">No rivals online right now</h3><p className="mt-1 text-sm text-slate-400">Invite a friend to join the pitch.</p></div><button type="button" onClick={inviteFriend} className="mt-4 rounded-xl border border-neon/30 bg-neon/10 px-4 py-3 text-xs font-black text-neon sm:mt-0">Invite on WhatsApp</button></div>}</section>

            <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Find your rival</p><h2 className="mt-1 text-xl font-black">Open challenges</h2></div><Link href={canPlay ? "/matches" : "/login"} className="text-xs font-bold text-slate-400 hover:text-gold">My matches →</Link></div>{loading ? <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div> : openChallenges.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/70 p-6 text-center"><h3 className="font-black">No live challenges</h3><p className="mt-1 text-sm text-slate-400">Create the first one and invite a real player.</p><Link href={canPlay ? "/create-challenge" : "/login"} className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">Create the first challenge</Link></div> : <div className="grid gap-3 lg:grid-cols-2">{openChallenges.map((challenge) => <article key={challenge.id} className="card-lift rounded-2xl border border-white/10 bg-surface p-4"><div className="flex items-center gap-3"><TeamLogo avatar={challenge.creator.avatar} alt={`${challenge.creator.teamName || challenge.creator.username} logo`} size={52} /><div className="min-w-0 flex-1"><p className="truncate font-black"><CountryFlag country={challenge.creator.country} className="mr-1" />{challenge.creator.teamName || challenge.creator.username}</p><p className="truncate text-xs text-slate-400">@{challenge.creator.username}</p><p className="mt-2 text-[9px] font-black uppercase tracking-widest text-neon">● Open now</p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-wider text-gold">{challenge.entryStake} point entry</p><Link href={`/match/${challenge.id}`} className="mt-2 inline-flex rounded-lg bg-white/10 px-3 py-2 text-xs font-black hover:bg-gold hover:text-navy-950">View challenge</Link></div></div></article>)}</div>}</section>

            <section className="pb-3"><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Compete</p><h2 className="mt-1 text-xl font-black">Tournaments</h2></div>{loading ? <SkeletonCard className="h-32" /> : tournaments.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/70 p-6 text-center"><h3 className="font-black">No tournaments available</h3><p className="mt-1 text-sm text-slate-400">Check back when an organizer opens the next bracket.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{tournaments.slice(0, 4).map((tournament) => <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="card-lift rounded-2xl border border-white/10 bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-gold">{tournament.status}</p><h3 className="mt-1 font-black">{tournament.name}</h3></div><span className="rounded-full bg-neon/10 px-2 py-1 text-[9px] font-black text-neon">{tournament.playersJoined}/{tournament.size}</span></div><p className="mt-3 text-xs text-slate-400">{tournament.entryFee} points entry · {tournament.pot} points pot</p></Link>)}</div>}</section>
        </div>
    );
}
