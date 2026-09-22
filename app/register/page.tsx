"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [teamName, setTeamName] = useState("");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState("");
    const [logoName, setLogoName] = useState("");
    const [logoSource, setLogoSource] = useState("");
    const [error, setError] = useState("");

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (password.length < 8) {
            setError("Use at least 8 characters for your password.");
            return;
        }

        if (!avatar) {
            setError("Upload a team logo screenshot before creating your account.");
            return;
        }

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, teamName, email, password, avatar }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Could not create account.");
            return;
        }
        router.push("/");
    }

    function cropLogo() {
        const image = new Image();
        image.onload = () => {
            const size = Math.min(image.naturalWidth, image.naturalHeight);
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
            setAvatar(canvas.toDataURL("image/jpeg", 0.9));
        };
        image.src = logoSource;
    }

    return (
        <div className="px-4 pt-6 pb-8">
            <Link href="/" className="text-gold text-sm">Back to lobby</Link>
            <div className="mt-8 mb-7">
                <p className="text-gold text-sm font-bold uppercase tracking-wider">New player</p>
                <h1 className="text-3xl font-extrabold mt-2">Create your account</h1>
                <p className="text-slate-400 mt-2">Build your record, challenge real players, and compete for the top spot.</p>
            </div>
            <form onSubmit={register} className="space-y-4">
                <label className="block text-sm font-semibold">Username<input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. GoalHunter" className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500" /></label>
                <label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500" /></label>
                <label className="block text-sm font-semibold">Team name<input required minLength={2} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Kampala Kings" className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500" /></label>
                <label className="block text-sm font-semibold">Password<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500" /></label>
                <div>
                    <p className="text-sm font-semibold mb-2">Team logo screenshot</p>
                    <label className="block bg-navy-800 border border-dashed border-navy-600 rounded-xl p-4 cursor-pointer">
                        <span className="text-sm text-slate-300">{logoName || "Upload your team logo image"}</span>
                        <input required type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setLogoName(file.name);
                            const reader = new FileReader();
                            reader.onload = () => {
                                setLogoSource(String(reader.result));
                                setAvatar(String(reader.result));
                            };
                            reader.readAsDataURL(file);
                        }} />
                    </label>
                    {avatar && <div className="mt-3 flex items-end gap-3"><img src={avatar} alt="Team logo preview" className="w-20 h-20 rounded-xl object-cover border border-gold/40" />{logoSource && <button type="button" onClick={cropLogo} className="border border-gold text-gold font-semibold px-3 py-2 rounded-xl">Crop square</button>}</div>}
                </div>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg">Create account</button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">Already have an account? <Link href="/login" className="text-gold font-semibold">Log in</Link></p>
        </div>
    );
}
