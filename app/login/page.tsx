"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Email or password is incorrect.");
            return;
        }
        router.push("/");
    }

    return (
        <div className="px-4 pt-6 pb-8">
            <Link href="/" className="text-gold text-sm">Back to lobby</Link>
            <div className="mt-8 mb-7">
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Welcome back</p>
                <h1 className="text-3xl font-extrabold mt-2">Log in to compete</h1>
                <p className="text-slate-400 mt-2">Open your challenges, chat with opponents, and submit results.</p>
            </div>
            <form onSubmit={login} className="space-y-4">
                <label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white" /></label>
                <label className="block text-sm font-semibold">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white" /></label>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg">Log in</button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">New player? <Link href="/register" className="text-gold font-semibold">Create an account</Link></p>
        </div>
    );
}