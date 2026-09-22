"use client";

import { FormEvent, useEffect, useState } from "react";

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState("500");
    const [phoneNumber, setPhoneNumber] = useState("+256");
    const [provider] = useState("MTN");
    const [action, setAction] = useState<"deposit" | "withdraw">("deposit");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        void fetch("/api/wallet").then(async (response) => {
            const data = await response.json();
            if (response.ok) setBalance(data.balance);
            else setError(data.error || "Could not load wallet.");
        });
    }, []);

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
        if (data.transaction?.id) {
            const transactionId = data.transaction.id as string;
            const poll = window.setInterval(async () => {
                const statusResponse = await fetch(`/api/wallet/status/${transactionId}`);
                if (!statusResponse.ok) return;
                const statusData = await statusResponse.json();
                if (statusData.transaction?.status === "COMPLETED") {
                    window.clearInterval(poll);
                    setBalance((current) => current + Number(statusData.transaction.amount));
                    setMessage("MTN payment received. Your wallet has been credited.");
                } else if (statusData.transaction?.status === "REJECTED") {
                    window.clearInterval(poll);
                    setError("The MTN payment was not completed.");
                }
            }, 4000);
            window.setTimeout(() => window.clearInterval(poll), 120000);
        }
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
                <label className="block text-sm">Network<select value={provider} disabled className="mt-2 w-full bg-navy-700 rounded-xl px-3 py-2"><option>MTN MoMo</option></select></label>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                {message && <p className="text-green-300 text-sm">{message}</p>}
                <button type="submit" className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl">Submit request</button>
            </form>
        </div>
    );
}