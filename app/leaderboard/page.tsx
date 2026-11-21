"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TeamLogo from "../components/TeamLogo";
import CountryFlag from "../components/CountryFlag";

type PlayerRow = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    country?: string | null;
    wins: number;
    matches: number;
    winRate: number;
    currentStreak: number;
    coins?: number;
    rank: number;
};

type ClubRow = {
    teamName: string;
    avatar: string;
    wins: number;
    matches: number;
    winRate: number;
    rank: number;
};

type Tab = "coins" | "winners" | "streaks" | "clubs";

const tabs: { id: Tab; label: string }[] = [
    { id: "coins", label: "Top coins" },
    { id: "winners", label: "Top winners" },
    { id: "streaks", label: "Streak kings" },
    { id: "clubs", label: "Top clubs" },
];

export default function LeaderboardPage() {
    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [coinPlayers, setCoinPlayers] = useState<PlayerRow[]>([]);
    const [streakKings, setStreakKings] = useState<PlayerRow[]>([]);
    const [clubs, setClubs] = useState<ClubRow[]>([]);
    const [myPosition, setMyPosition] = useState<number | null>(null);
    const [myCoinPosition, setMyCoinPosition] = useState<number | null>(null);
    const [coinsToNext, setCoinsToNext] = useState<number | null>(null);
    const [tab, setTab] = useState<Tab>("winners");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        void fetch("/api/leaderboard").then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok) {
                setError(data?.error || "Could not load the leaderboard.");
                return;
            }
            setPlayers(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
            setCoinPlayers(Array.isArray(data?.topCoins) ? data.topCoins : []);
            setStreakKings(Array.isArray(data?.streakKings) ? data.streakKings : []);
            setClubs(Array.isArray(data?.topClubs) ? data.topClubs : []);
            setMyPosition(typeof data?.myPosition === "number" ? data.myPosition : null);
            setMyCoinPosition(typeof data?.myCoinPosition === "number" ? data.myCoinPosition : null);
            setCoinsToNext(typeof data?.coinsToNext === "number" ? data.coinsToNext : null);
        }).catch(() => {
            if (mounted) setError("Could not reach the leaderboard. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    const rows = useMemo<PlayerRow[]>(() => {
        if (tab === "coins") return coinPlayers;
        if (tab === "streaks") return streakKings;
        if (tab === "clubs") return clubs.map((club) => ({ ...club, id: club.teamName, username: "Top club", currentStreak: 0 }));
        return players;
    }, [clubs, coinPlayers, players, streakKings, tab]);
    const podium = rows.slice(0, 3);

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Verified form</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                    <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Ranks</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Rankings are built from real, verified match results. Players need three verified matches to qualify.</p></div>
                    <span className="hidden text-4xl sm:block" aria-hidden="true">🏆</span>
                </div>
            </header>

            {((tab === "coins" && myCoinPosition !== null) || (tab !== "coins" && myPosition !== null)) && <div className="sticky top-2 z-20 flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-navy-900/95 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{tab === "coins" ? "Your points rank" : "Your current rank"}</p><p className="mt-0.5 text-sm font-black text-white">You’re <span className="text-gold">#{tab === "coins" ? myCoinPosition : myPosition}</span>{tab === "coins" ? coinsToNext === null ? " · leading the board" : ` · ${coinsToNext} points from #${(myCoinPosition ?? 1) - 1}` : " on the board"}</p></div><Link href={tab === "coins" ? "/wallet" : "/profile"} className="rounded-xl bg-gold/10 px-3 py-2 text-xs font-black text-gold">{tab === "coins" ? "Your wallet →" : "View profile →"}</Link></div>}

            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Leaderboard categories">
                {tabs.map((item) => <button key={item.id} id={`rank-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls="rank-panel" onClick={() => setTab(item.id)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${tab === item.id ? "border-gold bg-gold text-navy-950" : "border-white/10 bg-surface text-slate-300 hover:border-gold/30"}`}>{item.label}</button>)}
            </div>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</p>}
            {loading && <div className="space-y-3"><div className="skeleton h-44 rounded-3xl" /><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-20 rounded-2xl" /></div>}

            {!loading && !error && rows.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center"><TeamLogo size={60} alt="Noble Gamers logo" className="mx-auto" /><h2 className="mt-3 font-black">{tab === "coins" ? "No wallets to rank yet" : "No verified results to rank yet"}</h2><p className="mt-1 text-sm text-slate-400">{tab === "coins" ? "Points balances will appear here as players join Noble Gamers." : "Once players have verified matches, the real standings will appear here."}</p><Link href={tab === "coins" ? "/wallet" : "/create-challenge"} className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">{tab === "coins" ? "View wallet" : "Create a challenge"}</Link></div>}

            {!loading && !error && rows.length > 0 && (
                <section id="rank-panel" role="tabpanel" aria-labelledby={`rank-tab-${tab}`}>
                    {podium.length > 0 && (
                        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                            {[{ player: podium[1], place: 2 }, { player: podium[0], place: 1 }, { player: podium[2], place: 3 }].filter((item) => item.player).map(({ player, place }) => {
                                if (!player) return null;
                                const podiumPosition = place;
                                const style = podiumPosition === 1 ? "min-h-48 border-gold/50 bg-gradient-to-b from-gold/15 to-surface" : podiumPosition === 2 ? "min-h-40 border-slate-300/25 bg-gradient-to-b from-slate-300/10 to-surface" : "min-h-36 border-orange-400/25 bg-gradient-to-b from-orange-500/10 to-surface";
                                return (
                                    <article key={player.id} className={`flex flex-col items-center justify-end rounded-2xl border p-3 text-center ${style}`}>
                                        <span className="text-xl" aria-label={`Rank ${podiumPosition}`}>{podiumPosition === 1 ? "👑" : podiumPosition === 2 ? "🥈" : "🥉"}</span>
                                        <TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={podiumPosition === 1 ? 64 : 52} className="mt-2" />
                                        <p className="mt-2 w-full truncate text-xs font-black sm:text-sm">{player.teamName}</p>
                                        {tab !== "clubs" && <p className="mt-0.5 w-full truncate text-[10px] text-slate-400">@{player.username}</p>}
                                        <p className="mt-2 text-sm font-black text-gold">{tab === "coins" ? `${(player.coins ?? 0).toLocaleString()} points` : tab === "streaks" ? `${player.currentStreak} win streak` : `${player.wins} wins`}</p>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between px-1"><h2 className="text-lg font-black">{tab === "streaks" ? "Current win streaks" : tab === "clubs" ? "Club standings" : "Top verified players"}</h2><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Live data</span></div>
                        {rows.map((player) => (
                            <article key={player.id} className={`card-lift rounded-2xl border p-3 sm:p-4 ${player.rank <= 3 ? "border-gold/25 bg-gradient-to-r from-gold/5 to-surface" : "border-white/10 bg-surface"}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 shrink-0 text-center text-sm font-black ${player.rank <= 3 ? "text-gold" : "text-slate-500"}`}>#{player.rank}</span>
                                    <TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={48} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black"><CountryFlag country={player.country} className="mr-1" />{player.teamName}</p>
                                        {tab !== "clubs" && <p className="mt-0.5 truncate text-xs text-slate-400">@{player.username}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-right sm:gap-6">
                                        {tab === "coins" ? <div className="col-span-2"><p className="text-sm font-black text-gold">{(player.coins ?? 0).toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Points</p></div> : <><div><p className="text-sm font-black text-gold">{player.wins}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Wins</p></div><div><p className="text-sm font-black text-neon">{tab === "streaks" ? player.currentStreak : `${player.winRate}%`}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{tab === "streaks" ? "Streak" : "Win rate"}</p></div></>}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] font-bold text-slate-500"><span>{tab === "coins" ? "Wallet balance" : `${player.matches} verified matches`}</span>{tab !== "clubs" && <Link href={tab === "coins" ? "/wallet" : `/players/${player.id}`} className="text-gold hover:text-gold-light">{tab === "coins" ? "Wallet →" : "View player →"}</Link>}</div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
