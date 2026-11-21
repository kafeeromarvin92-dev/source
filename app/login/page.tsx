"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TeamLogo from "../components/TeamLogo";
import { getStoredUser } from "../lib/auth";
import { User } from "../types";

const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-neon/60 focus:ring-2 focus:ring-neon/10";

export default function LoginPage() {
    const router = useRouter();
    const redirectTimer = useRef<number | null>(null);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [returningUser, setReturningUser] = useState<User | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setReturningUser(getStoredUser()), 0);
        return () => {
            window.clearTimeout(timer);
            if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
        };
    }, []);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        setSuccess("");
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || "Username, email, or password is incorrect.");
                return;
            }
            setSuccess("You’re signed in. Welcome back!");
            redirectTimer.current = window.setTimeout(() => router.replace("/"), 650);
        } catch {
            setError("Could not reach Noble Gamers. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-xl px-4 pb-8 pt-6 sm:px-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-gold">← Back to the pitch</Link>
            <header className="mt-7 rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-900 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
                <TeamLogo size={68} alt="Noble Gamers logo" />
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-gold">Your next match awaits</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Back to the pitch.</h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">Sign in to challenge friends, build your record, and climb the verified ranks.</p>
                {returningUser && (
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                        <TeamLogo avatar={returningUser.avatar} alt={`${returningUser.teamName || returningUser.username} logo`} size={44} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black">{returningUser.username}</p>
                            <p className="truncate text-xs text-slate-400">{returningUser.teamName || "Returning player"}</p>
                        </div>
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-neon">Welcome back</span>
                    </div>
                )}
            </header>

            <form onSubmit={login} className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-surface p-4 shadow-xl shadow-black/10 sm:p-6">
                <label className="block text-sm font-bold">Username or email
                    <input required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="nobleguy or you@example.com" className={fieldClass} />
                </label>
                <label className="block text-sm font-bold">Password
                    <span className="relative mt-2 block">
                        <input required autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass} mt-0 pr-16`} />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-3 my-auto text-xs font-black text-gold">{showPassword ? "Hide" : "Show"}</button>
                    </span>
                </label>
                <div className="text-right">
                    <button type="button" onClick={() => setHelpOpen((value) => !value)} aria-expanded={helpOpen} className="text-xs font-bold text-gold transition hover:text-gold-light">Forgot password?</button>
                </div>
                {helpOpen && <p className="rounded-xl border border-white/10 bg-navy-900 p-3 text-sm text-slate-300">Password reset is not available in the app yet. Contact a Noble Gamers administrator to recover your account.</p>}
                {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
                {success && <p role="status" aria-live="polite" className="rounded-xl border border-neon/30 bg-neon/10 p-3 text-sm font-semibold text-green-200">{success}</p>}
                <button type="submit" disabled={submitting || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 transition hover:bg-gold-light disabled:cursor-wait disabled:opacity-60">
                    {submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-navy-950/30 border-t-navy-950" />}
                    {success ? "Welcome back" : submitting ? "Signing you in…" : "Log in and play"}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">New player? <Link href="/register" className="font-black text-gold hover:text-gold-light">Create an account</Link></p>
        </div>
    );
}
