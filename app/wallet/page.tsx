"use client";

import { useEffect, useState } from "react";

export default function WalletPage() {
    const [coins, setCoins] = useState<number | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/wallet").then(async (response) => {
            const data = await response.json();
            if (!response.ok) setError(data.error || "Could not load Noble Coins.");
            else setCoins(data.nobleCoins);
        }).catch(() => setError("Could not load Noble Coins."));
    }, []);

    return (
        <div className="px-4 pt-4 space-y-6">
            <h1 className="text-2xl font-extrabold">Noble Coins</h1>
            <div className="bg-navy-800 border border-gold/30 rounded-2xl p-6">
                <p className="text-sm text-slate-400">Your balance</p>
                <p className="text-4xl font-extrabold mt-1">
                    {coins === null ? "—" : coins.toLocaleString()}
                    <span className="text-lg text-gold ml-2">coins</span>
                </p>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-2">
                <h2 className="font-bold">How coins work</h2>
                <p className="text-sm text-slate-300">New players start with 1,000 free Noble Coins. Each challenge costs 100 coins to enter.</p>
                <p className="text-sm text-slate-300">For a completed two-player match, the winner receives 70% of the pool, the runner-up gets 20%, and 10% stays in the house.</p>
                <p className="text-xs text-slate-400">Coins are virtual and cannot be deposited or withdrawn.</p>
            </div>
        </div>
    );
}
