"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearStoredUser, getStoredUser, saveStoredUser } from "../lib/auth";
import { defaultUser } from "../lib/default-user";
import { User } from "../types";

export default function ProfilePage() {
    const [user, setUser] = useState<User>(() => getStoredUser() ?? defaultUser);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(() => getStoredUser()?.username ?? defaultUser.username);
    const [signedOut, setSignedOut] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            setUser((current) => ({ ...current, ...data.user }));
            setUsername(data.user.username);
        });
    }, []);

    function saveProfile() {
        const updatedUser = { ...user, username: username.trim() || user.username };
        setUser(updatedUser);
        saveStoredUser(updatedUser);
        setIsEditing(false);
    }

    async function signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
        clearStoredUser();
        setSignedOut(true);
    }

    if (signedOut) {
        return (
            <div className="px-4 pt-10 text-center space-y-4">
                <div className="text-5xl">👋</div>
                <h1 className="text-2xl font-extrabold">See you in the lobby</h1>
                <p className="text-slate-400">Your account is signed out on this device.</p>
                <Link href="/register" className="inline-block bg-gold text-navy-950 font-bold px-5 py-3 rounded-xl">Create an account</Link>
            </div>
        );
    }

    return (
        <div className="px-4 pt-4 space-y-5">
            <div className="text-center">
                <div className="flex justify-center mb-4">{user.avatar?.startsWith("data:image/") ? <img src={user.avatar} alt={`${user.teamName || user.username} logo`} className="w-24 h-24 rounded-2xl object-cover border border-gold/40" /> : <div className="text-6xl">{user.avatar}</div>}</div>
                {isEditing ? (
                    <div className="flex gap-2 max-w-xs mx-auto">
                        <input value={username} onChange={(event) => setUsername(event.target.value)} className="min-w-0 flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-white" aria-label="Username" />
                        <button onClick={saveProfile} className="bg-gold text-navy-950 font-bold px-3 rounded-xl">Save</button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-extrabold">{user.username}</h1>
                        {user.teamName && <p className="text-gold mt-1">{user.teamName}</p>}
                        <p className="text-slate-400 mt-2">{user.email || "Sign in to view account details"}</p>
                    </>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-navy-800 rounded-xl p-3"><p className="text-xl font-bold">{user.totalWins}</p><p className="text-xs text-slate-400">Wins</p></div>
                <div className="bg-navy-800 rounded-xl p-3"><p className="text-xl font-bold">{user.totalMatches}</p><p className="text-xs text-slate-400">Matches</p></div>
                <div className="bg-navy-800 rounded-xl p-3"><p className="text-xl font-bold">{user.winRate}%</p><p className="text-xs text-slate-400">Win rate</p></div>
            </div>

            <section className="bg-navy-800 border border-navy-700 rounded-2xl divide-y divide-navy-700">
                <button onClick={() => setIsEditing(!isEditing)} className="w-full flex justify-between px-4 py-4 text-left"><span>Account details</span><span className="text-gold">Edit</span></button>
                <Link href="/wallet" className="flex justify-between px-4 py-4"><span>Wallet balance</span><span className="text-gold font-bold">{user.walletBalance.toLocaleString()} UGX</span></Link>
                <button onClick={signOut} className="w-full px-4 py-4 text-left text-red-300">Sign out</button>
            </section>
        </div>
    );
}
