"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import TeamLogo from "../components/TeamLogo";
import TeamLogoPicker from "../components/TeamLogoPicker";
import CountrySelect from "../components/CountrySelect";

const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-neon/60 focus:ring-2 focus:ring-neon/10";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", teamName: "", email: "", password: "", country: "", bio: "", gameTags: "DLS" });
    const [avatar, setAvatar] = useState("");
    const [notice, setNotice] = useState({ kind: "", text: "" });
    const [submitting, setSubmitting] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setNotice({ kind: "", text: "" });
        let created = false;
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: form.username, teamName: form.teamName, email: form.email, password: form.password }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setNotice({ kind: "error", text: data?.error || "Could not create your account." });
                return;
            }
            created = true;
            setAccountCreated(true);

            const profileResponse = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(avatar ? { avatar } : {}),
                    country: form.country,
                    bio: form.bio,
                    gameTags: form.gameTags,
                }),
            });
            const profileData = await profileResponse.json().catch(() => null);
            if (!profileResponse.ok) {
                setNotice({ kind: "info", text: `Your account was created, but player details could not be saved: ${profileData?.error || "try again from your profile."}` });
                return;
            }
            router.replace("/");
        } catch {
            if (created) {
                setNotice({ kind: "info", text: "Your account was created, but the profile setup could not finish. You can complete it from your profile." });
                setAccountCreated(true);
            } else {
                setNotice({ kind: "error", text: "Could not reach Noble Gamers. Check your connection and try again." });
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:px-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-gold">← Back to the pitch</Link>
            <header className="mt-7 rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-900 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
                <div className="flex items-center gap-4">
                    <TeamLogo size={64} alt="Noble Gamers logo" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Join the squad</p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight">Make it official.</h1>
                    </div>
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Create your player profile, add your club identity, and get ready to challenge real opponents.</p>
            </header>

            <form onSubmit={register} className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-surface p-4 shadow-xl shadow-black/10 sm:p-6">
                <TeamLogoPicker value={avatar} onChange={setAvatar} disabled={submitting || accountCreated} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold">Username
                        <input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="GoalHunter_92" className={fieldClass} />
                        <span className="mt-1 block text-xs font-medium text-slate-500">3–20 letters, numbers, or underscores.</span>
                    </label>
                    <label className="block text-sm font-bold">Team name
                        <input required minLength={3} maxLength={50} value={form.teamName} onChange={(event) => setForm({ ...form, teamName: event.target.value })} placeholder="Your in-game team" className={fieldClass} />
                    </label>
                </div>
                <label className="block text-sm font-bold">Email
                    <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" className={fieldClass} />
                </label>
                <label className="block text-sm font-bold">Country
                    <CountrySelect value={form.country} onChange={(country) => setForm({ ...form, country })} className={fieldClass} />
                </label>
                <label className="block text-sm font-bold">Bio <span className="font-medium text-slate-500">({form.bio.length}/160)</span>
                    <textarea maxLength={160} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Tell your next rival a little about you." className={`${fieldClass} min-h-24 resize-y`} />
                </label>
                <label className="block text-sm font-bold">Game tags
                    <input maxLength={80} value={form.gameTags} onChange={(event) => setForm({ ...form, gameTags: event.target.value })} placeholder="DLS" className={fieldClass} />
                    <span className="mt-1 block text-xs font-medium text-slate-500">Separate tags with commas. DLS is currently supported.</span>
                </label>
                <label className="block text-sm font-bold">Password
                    <span className="relative mt-2 block">
                        <input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={`${fieldClass} mt-0 pr-16`} />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-3 my-auto text-xs font-black text-gold">{showPassword ? "Hide" : "Show"}</button>
                    </span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">Use at least 8 characters.</span>
                </label>

                {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : "border-gold/30 bg-gold/10 text-gold-light"}`}>{notice.text}</p>}
                {accountCreated ? (
                    <Link href="/profile" className="block w-full rounded-xl bg-gold py-3.5 text-center text-sm font-black text-navy-950 transition hover:bg-gold-light">Continue to your profile</Link>
                ) : (
                    <button type="submit" disabled={submitting} className="w-full rounded-xl bg-gold py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 transition hover:bg-gold-light disabled:cursor-wait disabled:opacity-60">
                        {submitting ? "Creating your player profile…" : "Create account"}
                    </button>
                )}
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">Already in the squad? <Link href="/login" className="font-black text-gold hover:text-gold-light">Log in</Link></p>
        </div>
    );
}
