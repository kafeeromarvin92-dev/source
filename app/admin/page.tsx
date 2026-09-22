"use client";

import { useEffect, useState } from "react";

type Transaction = {
    id: string;
    type: string;
    amount: number;
    phoneNumber: string;
    provider: string;
    createdAt: string;
    user: { username: string; email: string; walletBalance: number };
};

type Review = {
    id: string;
    creator: { id: string; username: string; teamName: string };
    acceptedBy: { id: string; username: string; teamName: string } | null;
    submissions: { id: string; playerId: string; image: string; player: { username: string; teamName: string } }[];
};

export default function AdminPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([fetch("/api/admin/wallet"), fetch("/api/admin/reviews")]).then(async ([walletResponse, reviewResponse]) => {
            const walletData = await walletResponse.json();
            const reviewData = await reviewResponse.json();
            if (!walletResponse.ok || !reviewResponse.ok) {
                setError(walletData.error || reviewData.error || "Could not load admin requests.");
                setLoading(false);
                return;
            }
            setTransactions(walletData.transactions);
            setReviews(reviewData.reviews);
            setLoading(false);
        });
    }, []);

    async function decide(transactionId: string, action: "approve" | "reject") {
        const response = await fetch("/api/admin/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, action }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not process this request.");
            return;
        }
        setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId));
    }

    async function decideReview(review: Review, winnerId: string) {
        const response = await fetch(`/api/challenges/${review.id}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "admin-decide", winnerId }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not settle this match.");
            return;
        }
        setReviews((current) => current.filter((item) => item.id !== review.id));
    }

    return (
        <div className="px-4 pt-4 space-y-5">
            <div>
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Control room</p>
                <h1 className="text-2xl font-extrabold mt-1">Admin review</h1>
                <p className="text-slate-400 mt-2">Review screenshots and approve wallet requests.</p>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            {loading && <p className="text-sm text-slate-400">Loading requests...</p>}
            {!loading && !error && transactions.length === 0 && <p className="text-sm text-slate-400">No pending wallet requests.</p>}
            <div className="space-y-3">
                {transactions.map((transaction) => (
                    <article key={transaction.id} className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-bold">{transaction.user.username}</p>
                                <p className="text-xs text-slate-400">{transaction.user.email}</p>
                            </div>
                            <p className="text-gold font-bold">{transaction.amount.toLocaleString()} UGX</p>
                        </div>
                        <p className="text-sm text-slate-300">{transaction.type} via {transaction.provider} to {transaction.phoneNumber}</p>
                        <div className="flex gap-2">
                            <button onClick={() => { void decide(transaction.id, "approve"); }} className="flex-1 bg-green-400 text-navy-950 font-bold py-2 rounded-xl">Approve</button>
                            <button onClick={() => { void decide(transaction.id, "reject"); }} className="flex-1 bg-red-400/15 text-red-200 font-bold py-2 rounded-xl">Reject</button>
                        </div>
                    </article>
                ))}
            </div>
            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-bold">Screenshot submissions</h2>
                    <p className="text-sm text-slate-400">Choose the winner after checking both final score images.</p>
                </div>
                {!loading && reviews.length === 0 && <p className="text-sm text-slate-400">No screenshot reviews waiting.</p>}
                {reviews.map((review) => (
                    <article key={review.id} className="bg-navy-800 border border-gold/30 rounded-2xl p-4 space-y-3">
                        <p className="font-bold">{review.creator.teamName || review.creator.username} vs {review.acceptedBy?.teamName || review.acceptedBy?.username || "Opponent"}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {review.submissions.map((submission) => <button key={submission.id} type="button" onClick={() => { void decideReview(review, submission.playerId); }} className="text-left space-y-2"><img src={submission.image} alt={`${submission.player.teamName || submission.player.username} submitted score`} className="w-full aspect-square object-cover rounded-xl border border-navy-600" /><span className="block text-sm text-gold">Select {submission.player.teamName || submission.player.username}</span></button>)}
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
