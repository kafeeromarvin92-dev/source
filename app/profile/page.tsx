"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStoredUser, saveStoredUser } from "../lib/auth";
import { defaultUser } from "../lib/default-user";
import { User } from "../types";
import TeamLogo from "../components/TeamLogo";
import TeamLogoPicker from "../components/TeamLogoPicker";
import CountryFlag from "../components/CountryFlag";
import CountrySelect from "../components/CountrySelect";

const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-neon/60 focus:ring-2 focus:ring-neon/10";
const links = [
    { href: "/wallet", icon: "◉", label: "Points wallet", detail: "Balance and transaction history" },
    { href: "/friends", icon: "♧", label: "Friends & requests", detail: "Manage your squad" },
    { href: "/results", icon: "✓", label: "Results", detail: "Your verified record" },
    { href: "/notifications", icon: "◉", label: "Alerts", detail: "Match and player updates" },
    { href: "/history", icon: "◷", label: "Match history", detail: "Past challenges" },
];

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User>(defaultUser);
    const [rank, setRank] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState("");
    const [teamName, setTeamName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [bio, setBio] = useState("");
    const [gameTags, setGameTags] = useState("DLS");
    const [country, setCountry] = useState("");
    const [notice, setNotice] = useState({ kind: "", text: "" });

    useEffect(() => {
        void Promise.all([fetch("/api/auth/me"), fetch("/api/leaderboard")]).then(async ([profileResponse, rankResponse]) => {
            const profileData = await profileResponse.json().catch(() => null);
            if (!profileResponse.ok || !profileData?.user) {
                router.replace("/login");
                return;
            }
            const currentUser = { ...defaultUser, ...profileData.user } as User;
            setUser(currentUser);
            setUsername(currentUser.username);
            setTeamName(currentUser.teamName || "");
            setAvatar(currentUser.avatar);
            setBio(currentUser.bio || "");
            setGameTags(currentUser.gameTags || "DLS");
            setCountry(currentUser.country || "");
            saveStoredUser(currentUser);

            if (rankResponse.ok) {
                const rankData = await rankResponse.json().catch(() => null);
                setRank(typeof rankData?.myPosition === "number" ? rankData.myPosition : null);
            }
        }).catch(() => setNotice({ kind: "error", text: "Could not load your profile. Check your connection and try again." })).finally(() => setLoading(false));
    }, [router]);

    async function saveProfile() {
        setSaving(true);
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, teamName, avatar, bio, gameTags, country }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNotice({ kind: "error", text: data?.error || "Could not save your profile." });
                return;
            }
            const updated = { ...user, ...data.user } as User;
            setUser(updated);
            setAvatar(updated.avatar);
            saveStoredUser(updated);
            setEditing(false);
            setNotice({ kind: "success", text: "Player details saved." });
        } catch {
            setNotice({ kind: "error", text: "Could not reach Noble Gamers. Your changes were not saved." });
        } finally {
            setSaving(false);
        }
    }

    async function signOut() {
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            if (!response.ok) {
                setNotice({ kind: "error", text: "Could not sign out. Try again." });
                return;
            }
            clearStoredUser();
            router.push("/login");
        } catch {
            setNotice({ kind: "error", text: "Could not reach Noble Gamers. You are still signed in." });
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 sm:px-6">
                <div className="skeleton h-64 rounded-3xl" />
                <div className="skeleton h-28 rounded-2xl" />
                <div className="skeleton h-48 rounded-2xl" />
            </div>
        );
    }

    if (!user.id) {
        return <div className="mx-auto max-w-xl px-4 pt-10 text-center"><TeamLogo size={88} /><h1 className="mt-4 text-2xl font-black">Your player profile</h1><p className="mt-2 text-sm text-slate-400">Sign in to view your team, verified results, and match history.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-gold px-5 py-3 font-black text-navy-950">Sign in</Link></div>;
    }

    const qualification = Math.min(100, Math.round(user.totalMatches / 3 * 100));

    return (
        <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 sm:px-6">
            <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-900 p-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
                <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-gold/5 blur-3xl" />
                <div className="relative mx-auto w-fit">
                    <TeamLogo avatar={user.avatar} alt={`${user.teamName || user.username} team logo`} size={116} />
                    <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-navy-800 bg-neon px-2 py-1 text-[9px] font-black uppercase tracking-wider text-navy-950">Player</span>
                </div>
                <button type="button" onClick={() => { setEditing(true); setNotice({ kind: "", text: "" }); }} className="mt-3 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-black text-gold transition hover:bg-gold/20">Edit logo &amp; details</button>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-gold">Player profile</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">{user.username}</h1>
                <p className="mt-1 text-sm font-bold text-slate-200">{user.teamName}</p>
                <p className="mt-2 text-sm text-slate-400"><CountryFlag country={user.country} /> {user.country || "Country not set"}</p>

                <div className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-black/15 p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Leaderboard status</p><p className="mt-1 font-black">{rank ? `Rank #${rank}` : user.totalMatches >= 3 ? "Ranked player" : "Unranked"}</p></div>
                        <span className="rounded-full bg-neon/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-neon">{user.totalMatches >= 3 ? "Eligible" : `${Math.min(user.totalMatches, 3)}/3 matches`}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-neon to-gold transition-all duration-700" style={{ width: `${qualification}%` }} /></div>
                    <p className="mt-2 text-[11px] text-slate-500">Three verified matches are required to appear on the leaderboard.</p>
                </div>
            </header>

            {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : notice.kind === "success" ? "border-neon/30 bg-neon/10 text-green-200" : "border-gold/30 bg-gold/10 text-gold-light"}`}>{notice.text}</p>}

            <section aria-label="Verified player statistics and wallet" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    { label: "Verified wins", value: user.totalWins, icon: "🏆", color: "text-gold" },
                    { label: "Matches", value: user.totalMatches, icon: "⚽", color: "text-slate-100" },
                    { label: "Win rate", value: `${user.winRate}%`, icon: "↗", color: "text-neon" },
                    { label: "Win streak", value: user.currentStreak || 0, icon: "✦", color: "text-orange-300" },
                    { label: "Points", value: user.coinBalance ?? 0, icon: "◉", color: "text-gold" },
                ].map((stat) => (
                    <article key={stat.label} className="card-lift rounded-2xl border border-white/10 bg-surface p-4">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</span><span aria-hidden="true">{stat.icon}</span></div>
                        <p className={`mt-3 text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-2xl border border-white/10 bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Player card</p><h2 className="mt-1 text-lg font-black">{user.teamName}</h2></div>
                    <TeamLogo avatar={user.avatar} alt={`${user.teamName} team logo`} size={52} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">{user.bio || "Add a short bio so opponents know who they are playing."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {(user.gameTags || "DLS").split(",").filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold">{tag.trim()}</span>)}
                </div>
            </section>

            {editing && (
                <section className="space-y-4 rounded-2xl border border-gold/30 bg-surface p-5">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Edit player details</p><h2 className="mt-1 text-xl font-black">Your team identity</h2></div>
                    <TeamLogoPicker value={avatar} onChange={setAvatar} disabled={saving} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold">Username<input maxLength={20} minLength={3} pattern="[A-Za-z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value)} className={fieldClass} /></label>
                        <label className="block text-sm font-bold">Team name<input maxLength={50} minLength={3} value={teamName} onChange={(event) => setTeamName(event.target.value)} className={fieldClass} /></label>
                    </div>
                    <label className="block text-sm font-bold">Country
                        <CountrySelect value={country} onChange={setCountry} className={fieldClass} placeholder="Prefer not to say" />
                    </label>
                    <label className="block text-sm font-bold">Bio <span className="font-medium text-slate-500">({bio.length}/160)</span><textarea maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Tell opponents about your play style." className={`${fieldClass} min-h-24 resize-y`} /></label>
                    <label className="block text-sm font-bold">Game tags<input maxLength={80} value={gameTags} onChange={(event) => setGameTags(event.target.value)} placeholder="DLS" className={fieldClass} /><span className="mt-1 block text-xs font-medium text-slate-500">Separate tags with commas. Up to five tags are saved.</span></label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditing(false); setUsername(user.username); setTeamName(user.teamName || ""); setAvatar(user.avatar); setBio(user.bio || ""); setGameTags(user.gameTags || "DLS"); setCountry(user.country || ""); }} disabled={saving} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300">Cancel</button>
                        <button type="button" onClick={() => { void saveProfile(); }} disabled={saving} className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
                    </div>
                </section>
            )}

            <nav aria-label="Profile links" className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
                {links.map((item) => (
                    <Link key={item.href} href={item.href} className="group flex items-center gap-3 border-b border-white/5 px-4 py-4 transition last:border-0 hover:bg-white/5 active:scale-[0.99]">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-700 text-lg text-gold" aria-hidden="true">{item.icon}</span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span>
                        <span aria-hidden="true" className="text-lg text-slate-500 transition group-hover:translate-x-1 group-hover:text-gold">›</span>
                    </Link>
                ))}
                {user.isAdmin && <Link href="/admin" className="group flex items-center gap-3 border-t border-gold/20 bg-gold/10 px-4 py-4 text-gold transition hover:bg-gold/15 active:scale-[0.99]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-lg" aria-hidden="true">♜</span><span className="min-w-0 flex-1"><span className="block text-sm font-black">Admin control room</span><span className="mt-0.5 block text-xs text-gold/70">Review results and manage players</span></span><span aria-hidden="true" className="text-lg transition group-hover:translate-x-1">›</span></Link>}
                <button type="button" onClick={() => { void signOut(); }} className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-4 text-left text-danger transition hover:bg-danger/5 active:scale-[0.99]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-lg" aria-hidden="true">↪</span><span className="text-sm font-bold">Sign out</span></button>
            </nav>
        </div>
    );
}
