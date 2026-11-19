"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", teamName: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSubmitting(true); setError("");
        try {
            const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            const data = await response.json().catch(() => null);
            if (!response.ok) { setError(data?.error || "Could not create your account."); return; }
            router.replace("/");
        } catch { setError("Could not reach Noble Gamers. Check your connection and try again."); }
        finally { setSubmitting(false); }
    }

    return <div className="px-4 pt-6 pb-8">
        <Link href="/" className="text-gold text-sm">← Back to lobby</Link>
        <div className="mt-8 mb-7 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/15 to-navy-900 p-6">
            <p className="text-gold text-sm font-bold uppercase tracking-wider">Join the squad</p>
            <h1 className="mt-2 text-3xl font-black">Make it official.</h1>
            <p className="mt-2 text-slate-300">Choose a unique username and enter the real team you use in Dream League Soccer.</p>
        </div>
        <form onSubmit={register} className="space-y-4">
            <label className="block text-sm font-semibold">Username<input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="GoalHunter_92" className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white" /></label>
            <p className="-mt-2 text-xs text-slate-500">3–20 characters: letters, numbers, and underscores.</p>
            <label className="block text-sm font-semibold">Real in-game team name<input required minLength={3} maxLength={50} value={form.teamName} onChange={(event) => setForm({ ...form, teamName: event.target.value })} placeholder="Arsenal, Barcelona, Manchester City" className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white" /><span className="mt-1 block text-xs font-normal text-slate-500">Use the actual club name shown in your DLS match. Admins will use it when checking screenshots.</span></label>
            <label className="block text-sm font-semibold">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white" /></label>
            <label className="block text-sm font-semibold">Password<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white" /></label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-gold py-3 text-lg font-bold text-navy-950 disabled:opacity-60">{submitting ? "Creating account..." : "Create account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Already in the squad? <Link href="/login" className="font-semibold text-gold">Log in</Link></p>
    </div>;
}
