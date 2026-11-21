"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ENTRY_STAKES, calculateMatchEconomy, isEntryStake, type EntryStake } from "../lib/coin-rules";

export default function CreateChallengePage() {
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [signedIn, setSignedIn] = useState(false);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [coinBalance, setCoinBalance] = useState(0);
    const [entryStake, setEntryStake] = useState<EntryStake>(100);
    const economy = calculateMatchEconomy(entryStake);

    useEffect(() => {
        let mounted = true;
        void fetch("/api/auth/me").then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok || !data?.user) {
                const requiresSignIn = response.status === 401 || response.ok && !data?.user;
                setNeedsSignIn(requiresSignIn);
                setError(requiresSignIn ? "Sign in to create a challenge with points." : data?.error || "Could not load your wallet.");
                return;
            }
            setSignedIn(true);
            setCoinBalance(typeof data.user.coinBalance === "number" ? data.user.coinBalance : 0);
        }).catch(() => {
            if (mounted) setError("Could not load your wallet. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoadingWallet(false);
        });
        return () => { mounted = false; };
    }, []);

    async function createChallenge() {
        if (!isEntryStake(entryStake)) {
            setError("Choose a supported entry stake.");
            return;
        }
        setCreating(true);
        setError("");

        try {
            const response = await fetch("/api/challenges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entryStake }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not create challenge.");
            setShareUrl(`${window.location.origin}/match/${data.challenge.id}`);
            setCopied(false);
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Could not create challenge.");
        } finally {
            setCreating(false);
        }
    }

    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
        } catch {
            setError("Could not copy the invite link. Select and copy it manually.");
        }
    }

    function shareInvite() {
        const text = `Join my Noble Gamers DLS challenge. Entry: ${entryStake} points; winner receives ${economy.winnerPayout}: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="mx-auto max-w-xl space-y-6 px-4 pt-6 sm:px-6">
            <Link href="/" className="text-sm font-bold text-gold">← Back to Play</Link>
            <header><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Build a fixture</p><h1 className="mt-1 text-3xl font-black">Create challenge</h1><p className="mt-2 text-sm text-slate-400">Choose an entry stake. Points are charged to both players only when an opponent accepts.</p></header>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error} {needsSignIn && <Link href="/login" className="ml-1 font-black underline">Sign in</Link>}</p>}

            <section className="space-y-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold">Your wallet</span><span className="text-lg font-black text-gold">{loadingWallet ? "…" : `${coinBalance} pts`}</span></div>
                <label className="block text-sm font-bold">Entry per player
                    <select value={entryStake} onChange={(event) => {
                        const next = Number(event.target.value);
                        if (isEntryStake(next)) setEntryStake(next);
                    }} className="mt-2 w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold/40">
                        {ENTRY_STAKES.map((stake) => <option key={stake} value={stake}>{stake} points</option>)}
                    </select>
                </label>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-gold/15 bg-gold/5 p-3 text-center">
                    <div><p className="text-lg font-black">{economy.totalPot}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total pot</p></div>
                    <div><p className="text-lg font-black text-neon">{economy.winnerPayout}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Winner gets</p></div>
                    <div><p className="text-lg font-black text-gold">{economy.houseFee}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">House fee</p></div>
                </div>
                <p className="text-xs leading-5 text-slate-400">Each player stakes {entryStake}. After the result is confirmed or admin-settled, the winner receives 90% of the pot and 10% goes to the house. No real-money coin purchases are enabled.</p>
                {!loadingWallet && coinBalance < entryStake && <p className="text-xs text-red-200">Your wallet does not have enough points for this stake. Ask an admin for a grant.</p>}
            </section>

            {!shareUrl ? <button type="button" onClick={() => { void createChallenge(); }} disabled={creating || loadingWallet || !signedIn || coinBalance < entryStake} className="w-full rounded-xl bg-gold py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 disabled:cursor-not-allowed disabled:opacity-50">
                {creating ? "Creating…" : "Create challenge"}
            </button> : <div className="space-y-3 rounded-2xl border border-gold/30 bg-gold/10 p-4">
                <div><p className="font-bold text-gold">Challenge ready to share</p><p className="mt-1 break-all text-xs text-slate-400">{shareUrl}</p><p className="mt-2 text-xs text-slate-300">{entryStake} points each · {economy.winnerPayout} to the winner · {economy.houseFee} to the house.</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => { void copyInvite(); }} className="flex-1 rounded-xl bg-navy-700 py-3 font-bold text-white">{copied ? "Copied" : "Copy link"}</button><button type="button" onClick={shareInvite} className="flex-1 rounded-xl bg-green-500 py-3 font-bold text-navy-950">Share on WhatsApp</button></div>
            </div>}
        </div>
    );
}
