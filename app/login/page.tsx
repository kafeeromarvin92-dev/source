"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const reason = new URLSearchParams(window.location.search).get("error");
        const errors: Record<string, string> = {
            account_not_found: "No account is linked to that Gmail yet. Create one first.",
            gmail_required: "Please choose a verified @gmail.com account.",
            google_account_conflict: "That account is linked to a different Google identity. Contact support.",
            google_unavailable: "Google sign-in is unavailable. Check the OAuth configuration and try again.",
            google_verification: "Google could not verify the sign-in. Please try again.",
        };
        if (reason) setError(errors[reason] || "Google sign-in did not complete. Please try again.");
    }, []);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || (response.status >= 500
                    ? "Login is temporarily unavailable. Please try again."
                    : "Email or password is incorrect."));
                return;
            }
            router.replace("/");
        } catch {
            setError("Could not reach Noble Gamers. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="px-4 pt-6 pb-8">
            <Link href="/" className="text-gold text-sm">← Back to lobby</Link>
            <div className="mt-8 mb-7 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/15 via-navy-800 to-navy-900 p-6">
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Your next match awaits</p>
                <h1 className="text-3xl font-extrabold mt-2">Back to the pitch.</h1>
                <p className="text-slate-300 mt-2">Sign in to challenge friends, build your streak, and climb the ranks.</p>
            </div>
            <a href="/api/auth/google/start?mode=login" className="block w-full rounded-xl bg-white py-3 text-center font-bold text-slate-900 transition hover:bg-slate-100">Continue with Google</a>
            <p className="my-4 text-center text-xs font-bold uppercase tracking-widest text-slate-500">or use your verified password</p>
            <form onSubmit={login} className="space-y-4">
                <label className="block text-sm font-semibold">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500" /></label>
                <label className="block text-sm font-semibold">Password
                    <span className="mt-2 flex bg-navy-800 border border-navy-700 rounded-xl focus-within:border-gold/70">
                        <input required autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none" />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="px-4 text-xs font-semibold text-gold">{showPassword ? "Hide" : "Show"}</button>
                    </span>
                </label>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg transition hover:bg-gold-light disabled:opacity-60">{submitting ? "Signing you in..." : "Log in and play"}</button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">New player? <Link href="/register" className="text-gold font-semibold">Create an account</Link></p>
        </div>
    );
}