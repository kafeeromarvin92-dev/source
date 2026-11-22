"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TeamLogo from "../components/TeamLogo";
import TeamLogoPicker from "../components/TeamLogoPicker";
import CountryFlag from "../components/CountryFlag";
import CountrySelect from "../components/CountrySelect";
import type { User } from "../types";

type HistoryMatch = {
    id: string;
    status: string;
    entryStake: number;
    createdAt: string;
    creator: User;
    acceptedBy?: User | null;
    decision?: { winnerId?: string | null; creatorScore?: number | null; acceptedByScore?: number | null } | null;
    submissions: { id: string; playerId: string; image: string; createdAt: string }[];
};

const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-neon/60 focus:ring-2 focus:ring-neon/10";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [matches, setMatches] = useState<HistoryMatch[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState("");
    const [teamName, setTeamName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [bio, setBio] = useState("");
    const [gameTags, setGameTags] = useState("DLS");
    const [country, setCountry] = useState("");
    const [notice, setNotice] = useState("");

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError("");
        const [profileResponse, historyResponse, rankResponse] = await Promise.all([
            fetch("/api/auth/me", { cache: "no-store" }),
            fetch("/api/history", { cache: "no-store" }),
            fetch("/api/leaderboard", { cache: "no-store" }),
        ]);
        const profileData = await profileResponse.json().catch(() => null);
        const historyData = await historyResponse.json().catch(() => null);
        const rankData = await rankResponse.json().catch(() => null);
        if (!profileResponse.ok || !profileData?.user) {
            setLoading(false);
            router.replace("/login");
            return;
        }
        const currentUser = profileData.user as User;
        setUser(currentUser);
        setUsername(currentUser.username);
        setTeamName(currentUser.teamName || "");
        setAvatar(currentUser.avatar || "");
        setBio(currentUser.bio || "");
        setGameTags(currentUser.gameTags || "DLS");
        setCountry(currentUser.country || "");
        if (historyResponse.ok) setMatches(Array.isArray(historyData?.matches) ? historyData.matches : []);
        if (rankResponse.ok) setRank(typeof rankData?.myPosition === "number" ? rankData.myPosition : null);
        if (!historyResponse.ok || !rankResponse.ok) setError("Some profile data could not load.");
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadProfile(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadProfile]);

    async function saveProfile() {
        setSaving(true);
        setNotice("");
        try {
            const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, teamName, avatar, bio, gameTags, country }) });
            const data = await response.json().catch(() => null);
            if (!response.ok) { setNotice(data?.error || "Could not save profile. Please try again."); return; }
            setUser((current) => current ? { ...current, ...data.user } : current);
            setAvatar(data.user.avatar);
            setEditing(false);
            setNotice("Player details saved.");
        } catch { setNotice("Could not reach Noble Gamers. Your changes were not saved."); } finally { setSaving(false); }
    }

    if (loading) return <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 sm:px-6"><div className="skeleton h-72 rounded-3xl" /><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-52 rounded-2xl" /></div>;
    if (!user) return null;

    const qualification = Math.min(100, Math.round(user.totalMatches / 3 * 100));
    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pt-6 sm:px-6">
            <header className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 via-navy-800 to-navy-950 p-5 text-center shadow-2xl sm:p-8"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,199,0,.16),transparent_42%)]" /><div className="relative mx-auto w-fit"><TeamLogo avatar={user.avatar} alt={`${user.teamName || user.username} team logo`} size={124} /><span className="absolute -bottom-1 -right-1 rounded-full border-2 border-navy-800 bg-neon px-2 py-1 text-[9px] font-black uppercase tracking-wider text-navy-950">Live profile</span></div><button type="button" onClick={() => { setEditing(true); setNotice(""); }} className="mt-4 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-black text-gold hover:bg-gold/20">Edit logo &amp; details</button><p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-gold">Player profile</p><h1 className="mt-1 text-3xl font-black tracking-tight">{user.username}</h1><p className="mt-1 text-sm font-bold text-slate-200">{user.teamName || "Team name not set"}</p><p className="mt-2 text-sm text-slate-400"><CountryFlag country={user.country} /> {user.country || "Country not set"}</p><div className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leaderboard status</p><p className="mt-1 font-black">{rank ? `Rank #${rank}` : "Not ranked yet"}</p></div><span className="rounded-full bg-neon/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-neon">{user.totalMatches >= 3 ? "Eligible" : `${user.totalMatches}/3 matches`}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-neon to-gold transition-all duration-700" style={{ width: `${qualification}%` }} /></div></div></header>

            {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200"><span>{error}</span><button type="button" onClick={() => { void loadProfile(); }} className="rounded-lg border border-danger/40 px-3 py-2 text-xs font-black">Retry</button></div>}
            {notice && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold-light">{notice}</p>}

            <section aria-label="Verified player statistics and wallet" className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[{ label: "Verified wins", value: user.totalWins }, { label: "Matches", value: user.totalMatches }, { label: "Win rate", value: `${user.winRate}%` }, { label: "Win streak", value: user.currentStreak || 0 }, { label: "Points", value: user.coinBalance ?? 0 }].map((stat) => <article key={stat.label} className="card-lift rounded-2xl border border-gold/15 bg-surface p-4"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</span><p className="mt-3 text-2xl font-black text-gold">{stat.value}</p></article>)}</section>

            <section className="rounded-2xl border border-gold/15 bg-surface p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-gold">Player card</p><h2 className="mt-1 text-lg font-black">{user.teamName || "Team identity"}</h2></div><TeamLogo avatar={user.avatar} alt={`${user.teamName || user.username} team logo`} size={56} /></div><p className="mt-4 text-sm leading-6 text-slate-300">{user.bio || "No bio added yet."}</p><div className="mt-4 flex flex-wrap gap-2">{(user.gameTags || "").split(",").filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold">{tag.trim()}</span>)}</div></section>

            {editing && <section className="space-y-4 rounded-2xl border border-gold/30 bg-surface p-5"><div><p className="text-[10px] font-black uppercase tracking-wider text-gold">Edit player details</p><h2 className="mt-1 text-xl font-black">Your team identity</h2></div><TeamLogoPicker value={avatar} onChange={setAvatar} disabled={saving} /><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Username<input maxLength={20} minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} className={fieldClass} /></label><label className="block text-sm font-bold">Team name<input maxLength={50} minLength={3} value={teamName} onChange={(event) => setTeamName(event.target.value)} className={fieldClass} /></label></div><label className="block text-sm font-bold">Country<CountrySelect value={country} onChange={setCountry} className={fieldClass} placeholder="Prefer not to say" /></label><label className="block text-sm font-bold">Bio<textarea maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} className={`${fieldClass} min-h-24 resize-y`} /></label><label className="block text-sm font-bold">Game tags<input maxLength={80} value={gameTags} onChange={(event) => setGameTags(event.target.value)} className={fieldClass} /></label><div className="flex gap-2"><button type="button" onClick={() => setEditing(false)} disabled={saving} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Cancel</button><button type="button" onClick={() => { void saveProfile(); }} disabled={saving} className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950">{saving ? "Saving…" : "Save profile"}</button></div></section>}

            <section className="pb-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-neon">Verified record</p><h2 className="mt-1 text-xl font-black">Match history</h2></div><Link href="/matches" className="text-xs font-bold text-slate-400 hover:text-gold">Open matches →</Link></div>{matches.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-7 text-center"><h3 className="font-black">No matches yet</h3><p className="mt-1 text-sm text-slate-400">Your first win starts here.</p><Link href="/create-challenge" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-black text-navy-950">Play your first match</Link></div> : <div className="space-y-3">{matches.slice(0, 12).map((match) => { const winner = match.decision?.winnerId; const won = winner === user.id; const opponent = match.creator.id === user.id ? match.acceptedBy : match.creator; return <article key={match.id} className="rounded-2xl border border-white/10 bg-surface p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">vs {opponent?.username || "Opponent"}</p><p className="mt-1 text-xs text-slate-500">{match.status} · {match.entryStake} points</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${won ? "bg-neon/10 text-neon" : winner ? "bg-danger/10 text-red-200" : "bg-white/5 text-slate-400"}`}>{won ? "Win" : winner ? "Loss" : match.status}</span></div>{match.submissions.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto">{match.submissions.map((submission) => <Image key={submission.id} src={submission.image} alt="DLS match result screenshot" width={160} height={96} className="h-24 w-40 rounded-xl border border-white/10 object-cover" loading="lazy" unoptimized />)}</div>}</article>; })}</div>}</section>
        </div>
    );
}
