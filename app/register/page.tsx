"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [teamName, setTeamName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const reason = new URLSearchParams(window.location.search).get("error");
        const errors: Record<string, string> = {
            profile: "Enter a username and team name before continuing.",
            profile_required: "Your username or team name is missing. Please try again.",
            gmail_required: "Please choose a verified @gmail.com account.",
            google_account_conflict: "That Gmail is linked to a different Google identity. Contact support.",
            google_unavailable: "Google sign-in is unavailable. Check the OAuth configuration and try again.",
            google_verification: "Google could not verify the sign-in. Please try again.",
        };
        if (reason) window.setTimeout(() => setError(errors[reason] || "Google sign-in did not complete. Please try again."), 0);
    }, []);

    function continueWithGoogle() {
        setError("");
        if (username.trim().length < 3 || teamName.trim().length < 2) {
            setError("Enter a username (at least 3 characters) and team name (at least 2 characters).");
            return;
        }
        setSubmitting(true);
        const query = new URLSearchParams({ mode: "register", username: username.trim(), teamName: teamName.trim() });
        window.location.href = `/api/auth/google/start?${query.toString()}`;
    }

    return (
        <div className="px-4 pt-6 pb-8">
            <Link href="/" className="text-gold text-sm">← Back to lobby</Link>
            <div className="mt-8 mb-7 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/15 to-navy-900 p-6">
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Join the squad</p>
                <h1 className="mt-2 text-3xl font-black">Make it official.</h1>
                <p className="mt-2 text-slate-300">Use Google to verify a real Gmail account. Your email stays private and is only shared with accepted friends.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); continueWithGoogle(); }} className="space-y-4">
                <label className="block text-sm font-semibold">Username
                    <input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. GoalHunter" className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white placeholder:text-slate-500" />
                </label>
                <label className="block text-sm font-semibold">Team name
                    <input required minLength={2} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Kampala Kings" className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white placeholder:text-slate-500" />
                </label>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-3 text-lg font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">{submitting ? "Opening Google..." : "Continue with Google"}</button>
                <p className="text-center text-xs text-slate-400">Only verified @gmail.com addresses can create an account.</p>
            </form>
            <p className="mt-6 text-center text-sm text-slate-400">Already in the squad? <Link href="/login" className="font-semibold text-gold">Log in</Link></p>
        </div>
    );
}
