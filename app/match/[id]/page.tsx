"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Challenge, MatchRoom } from "../../types";

export default function MatchInvitePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState("");
    const [room, setRoom] = useState<MatchRoom | null>(null);
    const [message, setMessage] = useState("");
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const challengeCode = params.id?.slice(-6).toUpperCase() || "INVITE";

    async function loadRoom() {
        const response = await fetch(`/api/challenges/${params.id}/room`);
        if (!response.ok) return;
        const data = await response.json();
        setRoom(data.room);
    }

    useEffect(() => {
        fetch(`/api/challenges/${params.id}`)
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setChallenge(data.challenge);
                if (data.challenge.status === "accepted") {
                    setAccepted(true);
                    await loadRoom();
                }
            })
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Challenge unavailable."));
    }, [params.id]);

    useEffect(() => {
        if (!accepted) return;
        const interval = window.setInterval(loadRoom, 2500);
        return () => window.clearInterval(interval);
    }, [accepted, params.id]);

    async function accept() {
        const response = await fetch(`/api/challenges/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || "Challenge is no longer available.");
            return;
        }
        setChallenge(data.challenge);
        setAccepted(true);
        router.push("/matches");
    }

    async function sendRoomAction(action: string, value: string) {
        if (!value.trim()) return;
        const response = await fetch(`/api/challenges/${params.id}/room`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...(action === "message" ? { text: value } : { code: value }) }),
        });
        const data = await response.json();
        if (response.ok) setRoom(data.room);
    }

    async function submitEvidence(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setSubmitting(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const response = await fetch(`/api/challenges/${params.id}/room`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "submission", image: reader.result }),
            });
            const data = await response.json();
            if (response.ok) setRoom(data.room);
            setSubmitting(false);
        };
        reader.readAsDataURL(file);
    }

    const stake = challenge?.stakeAmount || 0;

    return (
        <div className="px-4 pt-6 space-y-6">
            <Link href="/" className="text-gold text-sm">Back to lobby</Link>
            <div className="text-center pt-5">
                <div className="text-6xl mb-4">⚽</div>
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Private challenge</p>
                <h1 className="text-3xl font-extrabold mt-2">You have been challenged</h1>
                <p className="text-slate-400 mt-2">A friend wants to settle this on the pitch.</p>
            </div>
            <div className="bg-navy-800 border border-gold/30 rounded-2xl p-5 text-center">
                <p className="text-sm text-slate-400">Entry stake</p>
                <p className="text-4xl font-extrabold text-gold mt-1">{stake.toLocaleString()} <span className="text-lg">UGX</span></p>
                <div className="grid grid-cols-2 gap-3 mt-5 text-left">
                    <div className="bg-navy-700 rounded-xl p-3"><p className="text-xs text-slate-400">Winner receives</p><p className="font-bold text-green-400 mt-1">{(stake * 1.9).toLocaleString()} UGX</p></div>
                    <div className="bg-navy-700 rounded-xl p-3"><p className="text-xs text-slate-400">Challenge code</p><p className="font-bold mt-1">{challengeCode}</p></div>
                </div>
            </div>
            {error ? <div className="bg-red-400/10 border border-red-400/30 rounded-2xl p-4 text-center text-red-200">{error}</div> : !accepted ? <button onClick={accept} disabled={!challenge} className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg disabled:opacity-60">Accept challenge</button> : <section className="space-y-4">
                <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4"><p className="text-green-400 font-bold">Match room open</p><p className="text-sm text-slate-300 mt-1">Chat, exchange your in-game codes, then submit the final screenshot for review.</p></div>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3">
                    <h2 className="font-bold">Match chat</h2>
                    <div className="max-h-48 overflow-y-auto space-y-2">{room?.messages.map((item) => <p key={item.id} className="text-sm"><span className="text-gold font-semibold">{item.senderName}: </span>{item.text}</p>)}</div>
                    <div className="flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message your opponent" className="min-w-0 flex-1 bg-navy-700 rounded-xl px-3 py-2" /><button onClick={() => { void sendRoomAction("message", message); setMessage(""); }} className="bg-gold text-navy-950 font-bold px-4 rounded-xl">Send</button></div>
                </div>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3">
                    <h2 className="font-bold">Exchange game codes</h2>
                    <p className="text-xs text-slate-400">Share the code your opponent needs to find you in the game.</p>
                    <div className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter your DLS code" className="min-w-0 flex-1 bg-navy-700 rounded-xl px-3 py-2" /><button onClick={() => { void sendRoomAction("code", code); setCode(""); }} className="bg-gold text-navy-950 font-bold px-4 rounded-xl">Share</button></div>
                    <div className="space-y-1">{Object.entries(room?.playerCodes || {}).map(([playerId, playerCode]) => <p key={playerId} className="text-sm text-green-300">Code received: {playerCode}</p>)}</div>
                </div>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3"><h2 className="font-bold">Submit match result</h2><p className="text-xs text-slate-400">After the match, upload the final score screenshot. Both submissions go to review.</p><label className="block text-center bg-gold text-navy-950 font-bold py-3 rounded-xl cursor-pointer">{submitting ? "Uploading..." : "Upload result screenshot"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={submitEvidence} /></label>{Object.values(room?.submissions || {}).map((submission) => <div key={submission.submittedAt} className="flex items-center gap-3 text-sm text-green-300"><img src={submission.image} alt={`${submission.playerName} result`} className="w-12 h-12 rounded-lg object-cover" />{submission.playerName} submitted evidence</div>)}</div>
            </section>}
            <p className="text-center text-xs text-slate-500">Only accept challenges from people you know.</p>
        </div>
    );
}
