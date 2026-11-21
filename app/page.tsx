"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeamLogo from "./components/TeamLogo";
import CountryFlag from "./components/CountryFlag";
import { defaultUser } from "./lib/default-user";
import { Challenge, User } from "./types";

type OnlinePlayer = { id: string; username: string; teamName: string; avatar: string; country?: string | null };

function SkeletonCard() {
    return <div className="skeleton h-24 rounded-2xl" aria-hidden="true" />;
}

export default function LobbyPage() {
    const [user, setUser] = useState<User>(defaultUser);
    const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
    const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
    const [loadingChallenges, setLoadingChallenges] = useState(true);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [challengeError, setChallengeError] = useState("");
    const [playersError, setPlayersError] = useState("");

    useEffect(() => {
        let mounted = true;
        void Promise.allSettled([
            fetch("/api/auth/me"),
            fetch("/api/challenges"),
            fetch("/api/players/online"),
        ]).then(async ([meResult, challengesResult, playersResult]) => {
            if (!mounted) return;

            if (meResult.status === "fulfilled" && meResult.value.ok) {
                const data = await meResult.value.json().catch(() => null);
                if (mounted && data?.user) setUser((current) => ({ ...current, ...data.user }));
            }

            if (challengesResult.status === "fulfilled") {
                const response = challengesResult.value;
                const data = await response.json().catch(() => null);
                if (!response.ok) setChallengeError(data?.error || "Could not load open challenges.");
                else setOpenChallenges(Array.isArray(data?.challenges) ? data.challenges : []);
            } else {
                setChallengeError("Could not reach open challenges. Check your connection and try again.");
            }
            setLoadingChallenges(false);

            if (playersResult.status === "fulfilled") {
                const response = playersResult.value;
                const data = await response.json().catch(() => null);
                if (!response.ok) setPlayersError(data?.error || "Could not load online players.");
                else setOnlinePlayers(Array.isArray(data?.players) ? data.players : []);
            } else {
                setPlayersError("Could not reach online players. Check your connection and try again.");
            }
            setLoadingPlayers(false);
        });
        return () => { mounted = false; };
    }, []);

    function inviteFriend() {
        const invite = `${window.location.origin}/register`;
        const text = `Join me on Noble Gamers and challenge me in DLS: ${invite}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }

    const canPlay = Boolean(user.id);

    return (
        <div className="mx-auto max-w-5xl space-y-7 px-4 pt-5 sm:px-6 lg:pt-8">
            <header className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-3">
                    <TeamLogo avatar={user.avatar} alt="Noble Gamers team logo" size={48} />
                    <span className="min-w-0">
                        <span className="block truncate text-base font-black tracking-tight">NOBLE <span className="text-gold">GAMERS</span></span>
                        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">DLS · Play for pride</span>
                    </span>
                </Link>
                <Link href={canPlay ? "/notifications" : "/login"} aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-surface text-lg transition hover:border-gold/30 hover:bg-surface-raised">
                    <span aria-hidden="true">◉</span>
                </Link>
            </header>

            <section className="relative overflow-hidden rounded-[2rem] border border-neon/20 bg-gradient-to-br from-emerald-500/20 via-navy-800 to-navy-950 p-5 shadow-2xl shadow-emerald-950/25 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-10 text-[140px] opacity-[0.08] float-slow sm:text-[190px]" aria-hidden="true">⚽</div>
                <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 48px, white 49px, white 50px)" }} />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-neon/20 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-neon">
                        <span className="live-dot h-2 w-2 rounded-full bg-neon" /> Live lobby
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-100">Ready to flex, {user.username.toUpperCase()}?</p>
                    <h1 className="mt-2 max-w-xl text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl">Your next win<br className="hidden sm:block" /> starts here.</h1>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50/75">Challenge a real rival, play your DLS match, and submit the final score for verification.</p>
                    <Link href={canPlay ? "/create-challenge" : "/login"} className="pulse-glow mt-5 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3.5 text-sm font-black text-navy-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-gold-light active:scale-[0.99]">
                        <span aria-hidden="true">⚡</span> Create a challenge <span aria-hidden="true">→</span>
                    </Link>
                    <div className="mt-6 grid max-w-xl grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center">
                        {[
                            { label: "Verified wins", value: user.totalWins },
                            { label: "Win rate", value: `${user.winRate}%` },
                            { label: "Matches", value: user.totalMatches },
                            { label: "Points", value: user.coinBalance ?? 0 },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-xl bg-black/10 px-2 py-3">
                                <p className="text-xl font-black">{stat.value}</p>
                                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-100/65">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {!canPlay && (
                <section className="flex flex-col gap-3 rounded-2xl border border-gold/20 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-black">Already part of the squad?</p><p className="mt-1 text-xs text-slate-400">Sign in to challenge friends and track your verified record.</p></div>
                    <div className="flex shrink-0 gap-2"><Link href="/login" className="rounded-xl bg-gold px-4 py-2.5 text-xs font-black text-navy-950">Log in</Link><Link href="/register" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold">Create account</Link></div>
                </section>
            )}

            {canPlay && user.totalWins === 0 && (
                <section className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 to-surface p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Your first win starts here</p>
                    <h2 className="mt-1 text-xl font-black">Three steps to your first verified result</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                            { number: "01", label: "Create a challenge", detail: "Invite someone you know.", href: "/create-challenge" },
                            { number: "02", label: "Play your DLS match", detail: "Share your game code in the room.", href: "/matches" },
                            { number: "03", label: "Submit the final score", detail: "Upload a clear full-time screenshot.", href: "/matches" },
                        ].map((step) => <Link key={step.number} href={step.href} className="rounded-xl border border-white/5 bg-navy-950/50 p-3 transition hover:border-gold/25"><span className="text-[10px] font-black tracking-widest text-gold">{step.number}</span><p className="mt-2 text-sm font-black">{step.label}</p><p className="mt-1 text-xs text-slate-400">{step.detail}</p></Link>)}
                    </div>
                </section>
            )}

            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">Live now</p><h2 className="mt-1 text-xl font-black">Players online</h2></div>
                    {!loadingPlayers && !playersError && <span className="rounded-full bg-neon/10 px-3 py-1 text-xs font-black text-neon">{onlinePlayers.length} online</span>}
                </div>
                {loadingPlayers ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((item) => <SkeletonCard key={item} />)}</div> : playersError ? (
                    <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{playersError}</p>
                ) : onlinePlayers.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {onlinePlayers.map((player) => (
                            <Link key={player.id} href={`/players/${player.id}`} className="card-lift min-w-36 rounded-2xl border border-neon/15 bg-surface p-4 text-center">
                                <div className="relative mx-auto w-fit"><TeamLogo avatar={player.avatar} alt={`${player.teamName} logo`} size={56} /><span className="live-dot absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-neon" /></div>
                                <p className="mt-3 truncate text-sm font-black"><CountryFlag country={player.country} className="mr-1" />{player.teamName}</p>
                                <p className="mt-0.5 truncate text-xs text-slate-400">@{player.username}</p>
                                <span className="mt-3 block rounded-lg bg-neon/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-neon">View player →</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neon/10 text-xl text-neon" aria-hidden="true">✦</span>
                            <div><h3 className="font-black">No one online right now</h3><p className="mt-1 text-sm leading-5 text-slate-400">Invite a friend to join the pitch, or create a challenge and share it with your squad.</p></div>
                        </div>
                        <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
                            <button type="button" onClick={inviteFriend} className="flex-1 rounded-xl border border-neon/30 bg-neon/10 px-4 py-3 text-xs font-black text-neon transition hover:bg-neon/20 sm:flex-none">Invite on WhatsApp</button>
                            <Link href={canPlay ? "/create-challenge" : "/register"} className="flex-1 rounded-xl bg-gold px-4 py-3 text-center text-xs font-black text-navy-950 sm:flex-none">Create challenge</Link>
                        </div>
                    </div>
                )}
            </section>

            <section className="pb-3">
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Find your rival</p><h2 className="mt-1 text-xl font-black">Open challenges</h2></div>
                    <Link href={canPlay ? "/matches" : "/login"} className="text-xs font-bold text-slate-400 transition hover:text-gold">My matches →</Link>
                </div>
                {challengeError && <p role="alert" className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{challengeError}</p>}
                {loadingChallenges ? <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div> : !challengeError && openChallenges.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-surface/70 p-6 text-center">
                        <TeamLogo size={60} alt="Noble Gamers logo" className="mx-auto" />
                        <h3 className="mt-3 font-black">No open challenges yet</h3>
                        <p className="mt-1 text-sm text-slate-400">Start one and invite a real player to your next DLS match.</p>
                        <Link href={canPlay ? "/create-challenge" : "/login"} className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">Start a match →</Link>
                    </div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {openChallenges.map((challenge) => (
                            <article key={challenge.id} className="card-lift rounded-2xl border border-white/10 bg-gradient-to-br from-surface-raised to-surface p-4">
                                <div className="flex items-center gap-3">
                                    <TeamLogo avatar={challenge.creator.avatar} alt={`${challenge.creator.teamName || challenge.creator.username} logo`} size={52} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-black"><CountryFlag country={challenge.creator.country} className="mr-1" />{challenge.creator.teamName || "DLS player"}</p>
                                        <p className="mt-0.5 truncate text-xs text-slate-400">@{challenge.creator.username}</p>
                                        <p className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neon"><span className="live-dot h-1.5 w-1.5 rounded-full bg-neon" /> Open now</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gold">{challenge.entryStake} point entry</p>
                                        <Link href={`/match/${challenge.id}`} className="mt-2 inline-flex rounded-lg bg-white/10 px-3 py-2 text-xs font-black transition hover:bg-gold hover:text-navy-950">View challenge</Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
