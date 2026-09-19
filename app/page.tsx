"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredUser } from "./lib/auth";
import { defaultUser } from "./lib/default-user";
import { Challenge, User } from "./types";

export default function LobbyPage() {
  const [user, setUser] = useState<User>(() => getStoredUser() ?? defaultUser);
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
    <div className="px-4 pt-4 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">
            Noble <span className="text-gold">Gamers</span>
          </h1>
          <p className="text-xs text-slate-400">DLS Competitive</p>
        </div>
        <Link
          href="/wallet"
          className="bg-navy-800 borde border-navy-700 rounded-xl px-3 py-2"
        >
          <span className="text-gold font-bold">
            {user.walletBalance.toLocaleString()}
          </span>
            <span className="text-xs text-slate-400 ml-1">UGX</span>
        </Link>
      </header>
      <Link
        href="/create-challenge"
        className="block w-full bg-gold text-navy-950 font-bold text-center py-3 rounded-xl"
      >
        + Create Challenge
      </Link>
      {user.totalMatches === 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4">
          <p className="text-gold font-bold">Welcome to Noble Gamers, {user.username}</p>
          <p className="text-sm text-slate-300 mt-1">Your account is ready. Join your first challenge to start your record.</p>
        </div>
      )}
      <section>
        <h2 className="font-bold text-lg mb-3">Open Challenges</h2>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <div className="space-y-3">
          {openChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-navy-800 border border-navy-700 rounded-2xl p-4 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-navy-700 flex items-center justify-center text-xl">
                  {challenge.creator.avatar?.startsWith("data:image/") ? <img src={challenge.creator.avatar} alt={`${challenge.creator.teamName || challenge.creator.username} logo`} className="w-11 h-11 rounded-full object-cover" /> : challenge.creator.avatar}
                </div>
                <div>
                  <p className="font-semibold">{challenge.creator.username}</p>
                  <p className="text-xs text-slate-400">Open now</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gold">
                  {challenge.stakeAmount.toLocaleString()} UGX
                </p>
                <Link
                  href={`/match/${challenge.id}`}
                  className="text-xs bg-gold/20 text-gold px-3 py-1 rounded-lg mt-1 inline-block"
                >
                  Accept
                </Link>
              </div>
            </div>
          ))}
          {!error && openChallenges.length === 0 && <p className="text-sm text-slate-400">No open challenges yet. Create one and invite a friend.</p>}
        </div>
      </section>
    </div>
  );
}