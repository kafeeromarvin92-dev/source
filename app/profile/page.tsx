"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStoredUser, saveStoredUser } from "../lib/auth";
import { defaultUser } from "../lib/default-user";
import { User } from "../types";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User>(defaultUser);
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState("");
    const [gameTags, setGameTags] = useState("DLS");
    const [country, setCountry] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => { void fetch("/api/auth/me").then(async (response) => { if (!response.ok) return; const data = await response.json(); setUser((current) => ({ ...current, ...data.user })); setBio(data.user.bio || ""); setGameTags(data.user.gameTags || "DLS"); setCountry(data.user.country || ""); }); }, []);
    async function save() { const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio, gameTags, country }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error || "Could not save profile."); return; } const updated = { ...user, ...data.user }; setUser(updated); saveStoredUser(updated); setEditing(false); setMessage("Profile saved."); }
    async function signOut() { await fetch("/api/auth/logout", { method: "POST" }); clearStoredUser(); router.push("/login"); }

    return <div className="space-y-5 px-4 pt-5">
        <header className="text-center">{user.avatar?.startsWith("/api/media/") ? <img src={user.avatar} alt="Team logo" className="mx-auto h-20 w-20 rounded-2xl object-cover" /> : <div className="text-6xl">{user.avatar || "⚽"}</div>}<h1 className="mt-2 text-2xl font-black">{user.username}</h1><p className="text-gold">{user.teamName}</p><p className="mt-1 text-sm text-slate-400">{user.country || "Country not set"}</p></header>
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-navy-800 p-3"><p className="text-xl font-bold">{user.totalWins}</p><p className="text-xs text-slate-400">Verified wins</p></div><div className="rounded-xl bg-navy-800 p-3"><p className="text-xl font-bold">{user.totalMatches}</p><p className="text-xs text-slate-400">Matches</p></div><div className="rounded-xl bg-navy-800 p-3"><p className="text-xl font-bold">{user.winRate}%</p><p className="text-xs text-slate-400">Win rate</p></div></div>
        <section className="rounded-2xl border border-navy-700 bg-navy-800 p-4"><p className="text-sm font-bold">Player card</p><p className="mt-2 text-sm text-slate-300">{user.bio || "Add a short bio so opponents know who they are playing."}</p><p className="mt-2 text-xs text-gold">Game tags: {user.gameTags || "DLS"}</p></section>
        {editing && <section className="space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-4"><label className="block text-sm font-semibold">Bio <span className="text-slate-500">({bio.length}/160)</span><textarea maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl bg-navy-800 px-3 py-3" /></label><label className="block text-sm font-semibold">Game tags<input value={gameTags} onChange={(event) => setGameTags(event.target.value)} placeholder="DLS" className="mt-2 w-full rounded-xl bg-navy-800 px-3 py-3" /><span className="mt-1 block text-xs text-slate-500">DLS is currently the supported game.</span></label><label className="block text-sm font-semibold">Country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-2 w-full rounded-xl bg-navy-800 px-3 py-3"><option value="">Prefer not to say</option><option>Uganda</option><option>Kenya</option><option>Other</option></select></label><button onClick={() => { void save(); }} className="w-full rounded-xl bg-gold py-3 font-bold text-navy-950">Save profile</button></section>}
        {message && <p className="rounded-xl bg-navy-800 p-3 text-sm text-green-300">{message}</p>}
        <section className="divide-y divide-navy-700 rounded-2xl border border-navy-700 bg-navy-800"><button onClick={() => setEditing((value) => !value)} className="w-full px-4 py-4 text-left">Edit player details <span className="float-right text-gold">{editing ? "Close" : "Edit"}</span></button><Link href="/friends" className="block px-4 py-4">Friends &amp; requests <span className="float-right text-gold">View</span></Link><Link href="/results" className="block px-4 py-4">Results <span className="float-right text-gold">View</span></Link><Link href="/notifications" className="block px-4 py-4">Alerts <span className="float-right text-gold">View</span></Link><Link href="/history" className="block px-4 py-4">Match history <span className="float-right text-gold">View</span></Link>{user.isAdmin && <Link href="/admin" className="block bg-gold/10 px-4 py-4 font-bold text-gold">Admin control room <span className="float-right">Open →</span></Link>}<button onClick={() => { void signOut(); }} className="w-full px-4 py-4 text-left text-red-300">Sign out</button></section>
    </div>;
}
