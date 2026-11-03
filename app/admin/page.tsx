"use client";

import { useEffect, useState } from "react";

type Review = {
    id: string;
    creator: { id: string; username: string; teamName: string };
    acceptedBy: { id: string; username: string; teamName: string } | null;
    submissions: { id: string; playerId: string; image: string; player: { username: string; teamName: string } }[];
};

export default function AdminPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/reviews").then(async (reviewResponse) => {
            const reviewData = await reviewResponse.json();
            if (!reviewResponse.ok) {
                setError(reviewData.error || "Could not load admin requests.");
                setLoading(false);
                return;
            }
            setReviews(reviewData.reviews);
            setLoading(false);
        });
    }, []);

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
                <p className="text-slate-400 mt-2">Review match screenshots and verify results.</p>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            {loading && <p className="text-sm text-slate-400">Loading requests...</p>}
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
