"use client";

import { useEffect, useState } from "react";

type Player = { id: string; username: string; teamName: string };
type Review = { id: string; creator: Player; acceptedBy: Player | null; submissions: { id: string; playerId: string; image: string; player: Player }[] };
type AdminUser = { id: string; username: string; email: string; isAdmin: boolean };

export default function AdminPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [notice, setNotice] = useState({ title: "", message: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [deciding, setDeciding] = useState("");

    useEffect(() => {
        Promise.all([fetch("/api/admin/reviews"), fetch("/api/admin/admins")]).then(async ([reviewResponse, adminResponse]) => {
            const reviewData = await reviewResponse.json();
            const adminData = await adminResponse.json();
            if (!reviewResponse.ok) setError(reviewData.error || "Could not load match reviews."); else setReviews(reviewData.reviews);
            if (adminResponse.ok) setAdmins(adminData.admins);
            setLoading(false);
        }).catch(() => { setError("Could not load admin tools."); setLoading(false); });
    }, []);

    async function decideReview(review: Review, winner: Player) {
        setDeciding(review.id); setError("");
        const response = await fetch(`/api/challenges/${review.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin-decide", winnerId: winner.id }) });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Could not settle this match."); else setReviews((current) => current.filter((item) => item.id !== review.id));
        setDeciding("");
    }

    async function sendNotification(event: React.FormEvent) {
        event.preventDefault();
        const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notice) });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Could not send notification."); else { setNotice({ title: "", message: "" }); setError("Notification sent to everyone."); }
    }

    async function toggleAdmin(user: AdminUser) {
        const response = await fetch("/api/admin/admins", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, isAdmin: !user.isAdmin }) });
        const data = await response.json();
        if (!response.ok) setError(data.error || "Could not update admin access."); else setAdmins((current) => current.map((item) => item.id === user.id ? data.user : item));
    }

    return <div className="px-4 pt-4 space-y-6">
        <header><p className="text-gold text-sm font-bold uppercase tracking-wider">Control room</p><h1 className="text-2xl font-extrabold mt-1">Admin tools</h1><p className="text-slate-400 mt-2">Review both final-score screenshots, then declare Team A or Team B the winner.</p></header>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Loading reviews...</p>}

        <section className="space-y-4">
            <div><h2 className="text-lg font-bold">Pending match decisions</h2><p className="text-sm text-slate-400">A match appears here after both players submit their result screenshot.</p></div>
            {!loading && reviews.length === 0 && <p className="rounded-2xl border border-dashed border-navy-600 p-5 text-center text-sm text-slate-400">No matches are waiting for review.</p>}
            {reviews.map((review) => {
                const teamA = review.creator;
                const teamB = review.acceptedBy;
                const screenshotA = review.submissions.find((submission) => submission.playerId === teamA.id);
                const screenshotB = teamB ? review.submissions.find((submission) => submission.playerId === teamB.id) : undefined;
                return <article key={review.id} className="rounded-2xl border border-gold/30 bg-navy-800 p-4 space-y-4">
                    <div><p className="text-xs font-extrabold uppercase tracking-widest text-gold">Match awaiting decision</p><p className="mt-1 font-bold">{teamA.teamName} vs {teamB?.teamName || "Team B"}</p><p className="text-xs text-slate-400">Players: {teamA.username} and {teamB?.username || "Opponent"}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-black text-gold">TEAM A</span><span className="text-xs text-slate-400">{teamA.teamName}</span></div>{screenshotA ? <img src={screenshotA.image} alt={`Team A ${teamA.teamName} result screenshot`} className="aspect-square w-full rounded-xl border border-navy-600 object-cover" /> : <div className="aspect-square rounded-xl border border-dashed border-navy-600 p-3 text-center text-xs text-slate-500">No screenshot</div>}<button disabled={!screenshotA || deciding === review.id} onClick={() => { void decideReview(review, teamA); }} className="w-full rounded-xl bg-gold px-2 py-3 text-xs font-black text-navy-950 disabled:opacity-50">{deciding === review.id ? "Saving..." : "Declare Team A winner"}</button></div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-black text-gold">TEAM B</span><span className="text-xs text-slate-400">{teamB?.teamName || "Opponent"}</span></div>{screenshotB ? <img src={screenshotB.image} alt={`Team B ${teamB?.teamName || "opponent"} result screenshot`} className="aspect-square w-full rounded-xl border border-navy-600 object-cover" /> : <div className="aspect-square rounded-xl border border-dashed border-navy-600 p-3 text-center text-xs text-slate-500">No screenshot</div>}<button disabled={!screenshotB || !teamB || deciding === review.id} onClick={() => { if (teamB) void decideReview(review, teamB); }} className="w-full rounded-xl bg-gold px-2 py-3 text-xs font-black text-navy-950 disabled:opacity-50">{deciding === review.id ? "Saving..." : "Declare Team B winner"}</button></div>
                    </div>
                </article>;
            })}
        </section>

        <section className="rounded-2xl border border-navy-700 bg-navy-800 p-4 space-y-3"><h2 className="text-lg font-bold">Send a player notification</h2><p className="text-xs text-slate-400">Broadcast a customised message to everyone.</p><form onSubmit={sendNotification} className="space-y-3"><input required maxLength={80} value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} placeholder="Notification title" className="w-full rounded-xl bg-navy-700 px-3 py-3" /><textarea required maxLength={500} value={notice.message} onChange={(event) => setNotice({ ...notice, message: event.target.value })} placeholder="Write your message..." className="min-h-24 w-full rounded-xl bg-navy-700 px-3 py-3" /><button className="w-full rounded-xl bg-gold py-3 font-bold text-navy-950">Send to everyone</button></form></section>
        <section className="rounded-2xl border border-navy-700 bg-navy-800 p-4 space-y-3"><h2 className="text-lg font-bold">Admin access</h2><p className="text-xs text-slate-400">Administrators can review disputed matches and manage other admin accounts. Use the local bootstrap command in the project README to restore the first admin.</p>{admins.map((admin) => <div key={admin.id} className="flex items-center justify-between gap-3 border-t border-navy-700 pt-3"><div><p className="font-bold">{admin.username}</p><p className="text-xs text-slate-400">{admin.email}</p></div><button onClick={() => { void toggleAdmin(admin); }} className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-200">Remove admin</button></div>)}</section>
    </div>;
}
