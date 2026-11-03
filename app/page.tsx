"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultUser } from "./lib/default-user";
import { Challenge, User } from "./types";

export default function LobbyPage() {
  const [user, setUser] = useState<User>(defaultUser);
  const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setUser((current) => ({ ...current, ...data.user }));
    });
    fetch("/api/challenges")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setOpenChallenges(data.challenges);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load challenges."));
  }, []);

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center justify-between px-4 pt-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-2xl shadow-lg shadow-gold/20">⚽</span>
          <span>
            <span className="block text-lg font-black tracking-tight">NOBLE <span className="text-gold">GAMERS</span></span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">DLS • PLAY FOR PRIDE</span>
          </span>
        </Link>
        <Link href="/wallet" className="rounded-2xl border border-gold/25 bg-gold/10 px-3 py-2 text-right transition hover:bg-gold/15">
          <span className="block text-sm font-black text-gold">{user.nobleCoins.toLocaleString()} 🪙</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">coins</span>
        </Link>
      </header>

      <section className="relative mx-4 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500 via-emerald-800 to-navy-950 p-6 shadow-2xl shadow-emerald-950/40">
        <div className="pointer-events-none absolute -right-10 -top-12 text-[170px] opacity-15 rotate-12">⚽</div>
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 48px, white 49px, white 50px)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" /> The pitch is open
          </div>
          <p className="mt-5 text-sm font-semibold text-emerald-100">READY TO FLEX, {user.username.toUpperCase()}?</p>
          <h2 className="mt-1 max-w-xs text-4xl font-black leading-[0.95] tracking-tight">Your next win<br />starts here.</h2>
          <p className="mt-3 max-w-xs text-sm text-emerald-50/80">Challenge a rival. Make the scoreline do the talking.</p>
          <Link href="/create-challenge" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-black text-navy-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-gold-light">
            ⚡ Create a challenge <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
          <div><p className="text-xl font-black">{user.totalWins}</p><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">Wins</p></div>
          <div><p className="text-xl font-black">{user.winRate}%</p><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">Win rate</p></div>
          <div><p className="text-xl font-black">{user.totalMatches}</p><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">Matches</p></div>
        </div>
      </section>

      {!user.id && (
        <div className="mx-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-navy-800 p-4">
          <div><p className="font-bold">Already part of the squad?</p><p className="text-xs text-slate-400">Log in to get your coins and match history.</p></div>
          <div className="flex shrink-0 gap-2">
            <Link href="/login" className="rounded-xl bg-gold px-3 py-2 text-xs font-black text-navy-950">Log in</Link>
            <Link href="/register" className="rounded-xl border border-navy-600 px-3 py-2 text-xs font-bold">Join</Link>
          </div>
        </div>
      )}

      <section className="px-4">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold">Find your rival</p><h2 className="mt-1 text-xl font-black">Open challenges</h2></div>
          <Link href="/matches" className="text-xs font-bold text-slate-400 transition hover:text-white">My matches →</Link>
        </div>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <div className="space-y-3">
          {openChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-gradient-to-r from-navy-800 to-navy-900 p-4 transition hover:border-gold/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-gold/20 bg-navy-700 text-xl">
                  {challenge.creator.avatar?.startsWith("data:image/") ? <img src={challenge.creator.avatar} alt={`${challenge.creator.teamName || challenge.creator.username} logo`} className="h-12 w-12 rounded-2xl object-cover" /> : challenge.creator.avatar || "⚽"}
                </div>
                <div>
                  <p className="font-bold">{challenge.creator.username}</p>
                  <p className="text-xs text-slate-400">{challenge.creator.teamName || "Looking for a match"} · <span className="text-emerald-300">Open now</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gold">{challenge.stakeAmount.toLocaleString()} 🪙</p>
                <Link
                  href={`/match/${challenge.id}`}
                  className="mt-1 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs font-bold transition hover:bg-gold hover:text-navy-950"
                >
                  View match
                </Link>
              </div>
            </div>
          ))}
          {!error && openChallenges.length === 0 && <div className="rounded-2xl border border-dashed border-navy-600 bg-navy-900/60 p-5 text-center">
            <p className="text-3xl">🥅</p><p className="mt-2 font-bold">No rivals in the lobby yet</p><p className="mt-1 text-xs text-slate-400">Drop the first challenge and get the next match going.</p>
            <Link href="/create-challenge" className="mt-3 inline-block text-sm font-bold text-gold">Start a match →</Link>
          </div>}
        </div>
      </section>
    </div>
  );
}