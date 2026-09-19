"use client";
import { useState } from "react";
import Link from "next/link";

export default function CreateChallengePage() {
    const [stake, setStake] = useState(1000);
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
                body: JSON.stringify({
                    stakeAmount: stake,
                }),
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
        if (navigator.share) {
            await navigator.share({
                title: "Noble Gamers challenge",
                text: `Join my ${stake.toLocaleString()} UGX DLS challenge`,
                url: shareUrl,
            });
        } else {
            await copyInvite();
        }
    }

    return (
        <div className="px-4 pt-4 space-y-6">
            <Link href="/" className="text-gold text-sm"> Back</Link>
            <h1 className="text-2xl font-extrabold">Create Challenge</h1>
            <div>
                <p className="mb-2 text-sm text-slate-400">Stake Amount (UGX)</p>
                <div className="grid grid-cols-3 gap-2">
                    {[500, 1000, 2000, 5000].map((amount) => (
                        <button
                            key={amount}
                            onClick={() => setStake(amount)}
                            className={`py-3 rounded-xl font-bold ${stake === amount ? "bg-gold text-navy-950"
                                : "bg-navy-800 border border-navy-700"}`}
                        >
                            {amount}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-navy-800 rounded-xl p-4">
                <p className="text-sm ">Winner receives approximately:</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{(stake * 1.9).toLocaleString()}UGX</p>
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
                    <button onClick={copyInvite} className="flex-1 bg-gold text-navy-950 font-bold py-3 rounded-xl">{copied ? "Copied" : "Copy link"}</button>
                    <button onClick={shareInvite} className="flex-1 bg-navy-700 text-white font-bold py-3 rounded-xl">Share</button>
                </div>
            </div>}
        </div>
    );
}