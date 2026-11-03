"use client";
import { useState } from "react";
import Link from "next/link";
import { CHALLENGE_ENTRY_FEE } from "../lib/economy";

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
        const text = `Join my ${CHALLENGE_ENTRY_FEE} coin DLS challenge on Noble Gamers: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="px-4 pt-4 space-y-6">
            <Link href="/" className="text-gold text-sm"> Back</Link>
            <h1 className="text-2xl font-extrabold">Create Challenge</h1>
            <p className="text-sm text-slate-300">Entry fee: <span className="text-gold font-bold">{CHALLENGE_ENTRY_FEE} Noble Coins</span>. The fee is deducted now and refunded if you cancel before anyone joins.</p>
            <div className="bg-navy-800 rounded-xl p-4">
                <p className="text-sm">Two-player prize split</p>
                <p className="text-green-400 font-bold mt-2">Winner: 140 coins · Runner-up: 40 coins</p>
                <p className="text-xs text-slate-400 mt-1">20 coins stay in the house (70% / 20% / 10%).</p>
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