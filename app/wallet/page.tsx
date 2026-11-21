"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WalletTransaction = {
    id: string;
    type: string;
    amount: number;
    note: string | null;
    createdAt: string;
};

const transactionLabels: Record<string, string> = {
    STARTER_GRANT: "Starter points",
    ADMIN_GRANT: "Admin grant",
    MATCH_STAKE: "Match entry",
    MATCH_PAYOUT: "Match payout",
    HOUSE_FEE: "House fee",
    MATCH_REFUND: "Match refund",
};

export default function WalletPage() {
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        void fetch("/api/wallet").then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok) {
                setError(data?.error || "Could not load your wallet.");
                return;
            }
            setBalance(data.wallet.balance);
            setTransactions(Array.isArray(data.wallet.transactions) ? data.wallet.transactions : []);
        }).catch(() => {
            if (mounted) setError("Could not reach your wallet. Check your connection and try again.");
        });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 sm:px-6">
            <Link href="/profile" className="text-sm font-bold text-slate-400 transition hover:text-gold">← Profile</Link>
            <header className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Virtual points</p>
                <h1 className="mt-1 text-3xl font-black">Your wallet</h1>
                <p className="mt-2 text-sm text-slate-400">Points are for Noble Gamers match entries and rewards. Real-money purchases are not available.</p>
                <p className="mt-5 text-4xl font-black text-gold">{balance === null ? "…" : balance.toLocaleString()} <span className="text-base">pts</span></p>
            </header>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error} {error.includes("Log in") && <Link href="/login" className="font-bold underline">Sign in</Link>}</p>}
            <section className="space-y-3">
                <div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Auditable activity</p><h2 className="mt-1 text-xl font-black">Recent transactions</h2></div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Latest 50</span></div>
                {transactions.length === 0 && balance !== null && !error && <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-6 text-center"><h3 className="font-black">No point activity yet</h3><p className="mt-1 text-sm text-slate-400">Starter points, admin grants, match entries, payouts, and refunds will appear here.</p></div>}
                {transactions.map((transaction) => (
                    <article key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${transaction.amount >= 0 ? "bg-neon/10 text-neon" : "bg-danger/10 text-red-200"}`} aria-hidden="true">{transaction.amount >= 0 ? "+" : "−"}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{transactionLabels[transaction.type] || "Point transaction"}</p><p className="mt-1 truncate text-xs text-slate-500">{transaction.note || "Noble Gamers wallet activity"} · {new Date(transaction.createdAt).toLocaleString()}</p></div>
                        <p className={`shrink-0 text-sm font-black ${transaction.amount >= 0 ? "text-neon" : "text-red-200"}`}>{transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}
