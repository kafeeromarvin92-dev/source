"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import TeamLogo from "../components/TeamLogo";

type Friend = { id: string; user: { id: string; username: string; teamName: string; avatar: string; email: string | null } };
type FriendRequest = { id: string; user: { id: string; username: string; teamName: string; avatar: string } };

export default function FriendsPage() {
    const [username, setUsername] = useState("");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [incoming, setIncoming] = useState<FriendRequest[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(true);

    const loadFriends = useCallback(async () => {
        const response = await fetch("/api/friends");
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not load friends.");
        } else {
            setFriends(data.friends);
            setIncoming(data.incoming);
            setOutgoing(data.outgoing);
        }
        setLoading(false);
    }, []);

    useEffect(() => { void Promise.resolve().then(loadFriends); }, [loadFriends]);

    async function addFriend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setNotice("");
        const response = await fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not send friend request.");
            return;
        }
        setNotice(data.message);
        setUsername("");
        await loadFriends();
    }

    async function updateRequest(id: string, action: "accept" | "decline" | "remove") {
        setError("");
        const response = await fetch(`/api/friends/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not update friend request.");
            return;
        }
        setNotice(data.message || "Friend request accepted.");
        await loadFriends();
    }

    return (
        <div className="space-y-6 px-4 pt-5">
            <header>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold">Your squad</p>
                <h1 className="mt-1 text-3xl font-black">Friends</h1>
                <p className="mt-2 text-sm text-slate-400">Accepted friends can see your private player stats and account email.</p>
            </header>

            <form onSubmit={addFriend} className="space-y-3 rounded-2xl border border-navy-700 bg-navy-800 p-4">
                <label className="block text-sm font-bold" htmlFor="friend-username">Add by username</label>
                <div className="flex gap-2">
                    <input id="friend-username" required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Player username" className="min-w-0 flex-1 rounded-xl bg-navy-700 px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-gold" />
                    <button className="rounded-xl bg-gold px-4 text-sm font-black text-navy-950">Add</button>
                </div>
            </form>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {notice && <p className="text-sm text-green-300">{notice}</p>}
            {loading && <p className="text-sm text-slate-400">Loading your squad...</p>}

            {incoming.length > 0 && <section className="space-y-3">
                <h2 className="font-bold">Friend requests <span className="text-gold">({incoming.length})</span></h2>
                {incoming.map((request) => <article key={request.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/5 p-4">
                    <div className="flex min-w-0 items-center gap-3"><TeamLogo avatar={request.user.avatar} alt={`${request.user.teamName} logo`} size={44} /><div className="min-w-0"><p className="truncate font-bold">{request.user.username}</p><p className="truncate text-xs text-slate-400">{request.user.teamName}</p></div></div>
                    <div className="flex gap-2">
                        <button onClick={() => { void updateRequest(request.id, "accept"); }} className="rounded-lg bg-green-400 px-3 py-2 text-xs font-bold text-navy-950">Accept</button>
                        <button onClick={() => { void updateRequest(request.id, "decline"); }} className="rounded-lg bg-navy-700 px-3 py-2 text-xs font-bold">Decline</button>
                    </div>
                </article>)}
            </section>}

            <section className="space-y-3">
                <h2 className="font-bold">Your friends <span className="text-slate-500">({friends.length})</span></h2>
                {!loading && friends.length === 0 && <p className="rounded-2xl border border-dashed border-navy-600 p-5 text-center text-sm text-slate-400">Your squad is empty. Search a username to send your first request.</p>}
                {friends.map((friend) => <article key={friend.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface p-4">
                    <Link href={`/players/${friend.user.id}`} className="flex min-w-0 items-center gap-3">
                        <TeamLogo avatar={friend.user.avatar} alt={`${friend.user.teamName} logo`} size={48} />
                        <span className="min-w-0"><span className="block truncate font-bold">{friend.user.teamName}</span><span className="mt-0.5 block truncate text-xs text-slate-400">[@{friend.user.username}]</span><span className="mt-1 block truncate text-xs text-gold">{friend.user.email}</span></span>
                    </Link>
                    <button onClick={() => { void updateRequest(friend.id, "remove"); }} className="shrink-0 rounded-lg border border-navy-600 px-3 py-2 text-xs text-slate-300">Remove</button>
                </article>)}
            </section>

            {outgoing.length > 0 && <section className="space-y-3">
                <h2 className="font-bold">Sent requests</h2>
                {outgoing.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm">
                    <TeamLogo avatar={request.user.avatar} alt={`${request.user.teamName} logo`} size={40} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{request.user.teamName}</span><span className="block truncate text-xs text-slate-400">[@{request.user.username}] · Waiting for them to accept</span></span>
                </div>)}
            </section>}
        </div>
    );
}
