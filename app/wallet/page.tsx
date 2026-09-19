"use client";

import { FormEvent, useEffect, useState } from "react";

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState("500");
    const [phoneNumber, setPhoneNumber] = useState("+256");
    const [provider, setProvider] = useState("MTN");
    const [action, setAction] = useState<"deposit" | "withdraw">("deposit");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function loadWallet() {
        const response = await fetch("/api/wallet");
        const data = await response.json();
        if (response.ok) setBalance(data.balance);
        else setError(data.error || "Could not load wallet.");
    }

    useEffect(() => { void loadWallet(); }, []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");
        const response = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, amount: Number(amount), phoneNumber, provider }) });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not record wallet request.");
            return;
        }
        setMessage(data.message);
    }
    return (
        <div className="px-4 pt-4 space-y-6">
            <h1 className="text-2xl font-extrabold">Wallet</h1>

            <div className="bg-navy-800 border border-gold/30 rounded-2xl p-6">
                <p className="text-sm text-slate-400">Available Balance</p>
                <p className="text-4xl font-extrabold mt-1">
                    {balance.toLocaleString()}
                    <span className="text-lg text-gold ml-2">UGX</span>
                </p>
                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setAction("deposit")} className={`flex-1 font-bold py-3 rounded-xl ${action === "deposit" ? "bg-gold text-navy-950" : "bg-navy-700 text-white"}`}>Deposit</button>
                    <button type="button" onClick={() => setAction("withdraw")} className={`flex-1 font-bold py-3 rounded-xl ${action === "withdraw" ? "bg-gold text-navy-950" : "bg-navy-700 text-white"}`}>Withdraw</button>
                </div>
            </div>
            <form onSubmit={submit} className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-4">
                <h2 className="font-bold">{action === "deposit" ? "Deposit by mobile money" : "Withdraw to mobile money"}</h2>
                <label className="block text-sm">Amount (UGX)<input required min={500} max={1000000} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full bg-navy-700 rounded-xl px-3 py-2" /></label>
                <label className="block text-sm">Mobile number<input required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+2567XXXXXXXX" className="mt-2 w-full bg-navy-700 rounded-xl px-3 py-2" /></label>
                <label className="block text-sm">Network<select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-2 w-full bg-navy-700 rounded-xl px-3 py-2"><option>MTN</option><option>AIRTEL</option></select></label>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                {message && <p className="text-green-300 text-sm">{message}</p>}
                <button type="submit" className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl">Submit request</button>
            </form>
        </div>
    );
}