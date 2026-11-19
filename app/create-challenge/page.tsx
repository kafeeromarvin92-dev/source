"use client";
import { useState } from "react";
import Link from "next/link";

export default function CreateChallengePage() {
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);

    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    async function createChallenge() {
        setCreating(true);
        setError("");

        try {
            const response = await fetch("/api/challenges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not create challenge.");
            setShareUrl(`${window.location.origin}/match/${data.challenge.id}`);
            setCopied(false);
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Could not create challenge.");
        } finally {
            setCreating(false);
        }
    }

    async function copyInvite() {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
    }

    async function shareInvite() {
        const text = `Join my free DLS challenge on Noble Gamers: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="px-4 pt-4 space-y-6">
            <Link href="/" className="text-gold text-sm"> Back</Link>
            <h1 className="text-2xl font-extrabold">Create Challenge</h1>
            <p className="text-sm text-slate-300">Free to play. Share the challenge, play DLS, then submit a final-score screenshot.</p>
            <div className="bg-navy-800 rounded-xl p-4">
                <p className="text-sm font-bold">No entry fees, payments, or prizes</p>
                <p className="text-xs text-slate-400 mt-1">Competition is tracked through verified match results and the leaderboard.</p>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            {!shareUrl ? <button onClick={createChallenge} disabled={creating} className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg disabled:opacity-60">
                {creating ? "Creating..." : "Create Challenge"}
            </button> : <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 space-y-3">
                <div>
                    <p className="text-gold font-bold">Challenge ready to share</p>
                    <p className="text-xs text-slate-400 mt-1 break-all">{shareUrl}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={copyInvite} className="flex-1 bg-navy-700 text-white font-bold py-3 rounded-xl">{copied ? "Copied" : "Copy link"}</button>
                    <button onClick={shareInvite} className="flex-1 bg-green-500 text-navy-950 font-bold py-3 rounded-xl">Share on WhatsApp</button>
                </div>
            </div>}
        </div>
    );
}
