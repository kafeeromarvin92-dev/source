"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Challenge, MatchRoom } from "../../types";
import { CHALLENGE_ENTRY_FEE } from "../../lib/economy";
import FlexWinButton from "../../components/FlexWinButton";

function formatChallengeCode(id: string | undefined) {
    if (!id) return "INV1";
    const letters = id.replace(/[^a-z]/gi, "").toUpperCase().padEnd(3, "X").slice(-3);
    const number = id.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 10;
    return `${letters}${number}`;
}

export default function MatchInvitePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState("");
    const [room, setRoom] = useState<MatchRoom | null>(null);
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");
    const challengeCode = formatChallengeCode(params.id);

    const loadRoom = useCallback(async () => {
        const response = await fetch(`/api/challenges/${params.id}/room`);
        if (!response.ok) return;
        const data = await response.json();
        setRoom(data.room);
    }, [params.id]);

    useEffect(() => {
        fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            setCurrentUserId(data.user?.id || "");
        });
        fetch(`/api/challenges/${params.id}`)
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setChallenge(data.challenge);
                if (data.challenge.status !== "open") {
                    setAccepted(true);
                    await loadRoom();
                }
            })
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Challenge unavailable."));
    }, [loadRoom, params.id]);

    useEffect(() => {
        if (!accepted) return;
        const interval = window.setInterval(loadRoom, 2500);
        return () => window.clearInterval(interval);
    }, [accepted, loadRoom, params.id]);

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
            body: JSON.stringify({ action, ...(action === "reaction" ? { reaction: value } : { code: value }) }),
        });
        const data = await response.json();
        if (response.ok) setRoom(data.room);
        else setError(data.error || "Could not update the match room.");
    }

    async function shareChallengeOnWhatsApp() {
        if (!challenge) return;
        const url = `${window.location.origin}/match/${challenge.id}`;
        const text = `Join my DLS challenge on Noble Gamers: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
            else setError(data.error || "Could not submit the screenshot.");
            setSubmitting(false);
        };
        reader.readAsDataURL(file);
    }

    const decision = room?.challenge.decision ?? challenge?.decision;
    const verifiedChallenge = room?.challenge.verified ? room.challenge : challenge;
    const isVerifiedWinner = Boolean(verifiedChallenge?.verified && decision?.winnerId === currentUserId);
    const isCreator = challenge?.creator.id === currentUserId;
    const matchStatus = room?.challenge.status ?? challenge?.status;
    const canSubmitResult = matchStatus === "accepted" || matchStatus === "review" || matchStatus === "disputed";

    return (
        <div className="px-4 pt-6 space-y-6">
            <div className="flex items-center justify-between">
                <Link href="/" className="text-gold text-sm">Back to lobby</Link>
                <button onClick={() => { void shareChallengeOnWhatsApp(); }} disabled={!challenge} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-bold text-navy-950 disabled:opacity-50">Share on WhatsApp</button>
            </div>
            <div className="text-center pt-5">
                <div className="text-6xl mb-4">⚽</div>
                <p className="text-gold text-sm font-bold uppercase tracking-wider">Private challenge</p>
                <h1 className="text-3xl font-extrabold mt-2">You have been challenged</h1>
                <p className="text-slate-400 mt-2">A friend wants to settle this on the pitch.</p>
            </div>
            <div className="bg-navy-800 border border-gold/30 rounded-2xl p-5 text-center">
                <p className="text-sm text-slate-400">Entry fee</p>
                <p className="text-4xl font-extrabold text-gold mt-1">{CHALLENGE_ENTRY_FEE} <span className="text-lg">Noble Coins</span></p>
                <div className="grid grid-cols-2 gap-3 mt-5 text-left">
                    <div className="bg-navy-700 rounded-xl p-3"><p className="text-xs text-slate-400">Prize split</p><p className="font-bold text-green-400 mt-1">140 / 40 / 20 coins</p></div>
                    <div className="bg-navy-700 rounded-xl p-3"><p className="text-xs text-slate-400">Challenge code</p><p className="font-bold mt-1">{challengeCode}</p></div>
                </div>
            </div>
            {isVerifiedWinner && verifiedChallenge?.acceptedBy && decision?.creatorScore != null && decision.acceptedByScore != null && <FlexWinButton
                opponentName={verifiedChallenge.creator.id === currentUserId ? verifiedChallenge.acceptedBy.username : verifiedChallenge.creator.username}
                winnerScore={verifiedChallenge.creator.id === currentUserId ? decision.creatorScore : decision.acceptedByScore}
                opponentScore={verifiedChallenge.creator.id === currentUserId ? decision.acceptedByScore : decision.creatorScore}
            />}
            {error ? <div className="bg-red-400/10 border border-red-400/30 rounded-2xl p-4 text-center text-red-200">{error}</div> : !accepted ? isCreator ? <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 text-center text-slate-300">Waiting for an opponent to join.</div> : <button onClick={accept} disabled={!challenge} className="w-full bg-gold text-navy-950 font-bold py-3 rounded-xl text-lg disabled:opacity-60">Accept challenge</button> : <section className="space-y-4">
                {!canSubmitResult ? <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4"><p className="text-green-400 font-bold">{matchStatus === "settled" ? "Match verified and complete" : "Challenge cancelled"}</p><p className="text-sm text-slate-300 mt-1">{matchStatus === "settled" ? "The verified result is recorded." : "This challenge is closed."}</p></div> : <>
                <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4"><p className="text-green-400 font-bold">Match room open</p><p className="text-sm text-slate-300 mt-1">Chat, exchange your in-game codes, then submit the final screenshot for review.</p></div>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3">
                    <div><h2 className="font-bold">Good game reactions</h2><p className="mt-1 text-xs text-slate-400">Quick reactions only — no private messaging.</p></div>
                    <div className="flex flex-wrap gap-2">
                        {["Nice game", "Almost", "Fair play", "Next time, better"].map((reaction) => <button key={reaction} onClick={() => { void sendRoomAction("reaction", reaction); }} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold hover:text-navy-950">{reaction}</button>)}
                    </div>
                    <div className="max-h-36 space-y-2 overflow-y-auto">{room?.messages.map((item) => <p key={item.id} className="text-sm"><span className="text-slate-400">{item.senderName}: </span><span className="font-semibold text-white">{item.text}</span></p>)}</div>
                </div>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-3">
                    <h2 className="font-bold">Exchange game codes</h2>
                    <p className="text-xs text-slate-400">Enter your DLS in-game code so your opponent can find you. This is not a chat message.</p>
                    <div className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter your DLS code" className="min-w-0 flex-1 bg-navy-700 rounded-xl px-3 py-2" /><button onClick={() => { void sendRoomAction("code", code); setCode(""); }} className="bg-gold text-navy-950 font-bold px-4 rounded-xl">Share</button></div>
                    <div className="space-y-1">{Object.entries(room?.playerCodes || {}).map(([playerId, playerCode]) => <p key={playerId} className="text-sm text-green-300">Code received: {playerCode}</p>)}</div>
                </div>
                <div className="bg-navy-800 border border-gold/30 rounded-2xl p-4 space-y-3"><h2 className="font-bold">Gemini screenshot verification</h2><p className="text-xs text-slate-400">Both players must submit the actual final-score screenshot. Gemini checks the pair; if it cannot confidently read a consistent score, the match goes to admin review. A screenshot upload alone is not approval.</p><label className="block text-center bg-gold text-navy-950 font-bold py-3 rounded-xl cursor-pointer">{submitting ? "Uploading..." : "Upload your result screenshot"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={submitEvidence} /></label>{room?.submissions && Object.keys(room.submissions).length > 0 && <p className="text-xs text-slate-300">{Object.keys(room.submissions).length < 2 ? "Waiting for your opponent to submit their screenshot." : room.challenge.status === "settled" && room.challenge.verified ? "Gemini verified this result." : room.decision?.confidence != null ? `Gemini confidence: ${room.decision.confidence}%. ${room.decision.reasoning || "This result may need admin review."}` : "Both screenshots received. Verification is pending or requires admin review."}</p>}{Object.values(room?.submissions || {}).map((submission) => <div key={submission.submittedAt} className="flex items-center gap-3 text-sm text-green-300"><img src={submission.image} alt={`${submission.playerName} result`} className="w-12 h-12 rounded-lg object-cover" />{submission.playerName} submitted evidence</div>)}</div>
                </>}
            </section>}
            {isCreator && challenge?.status === "open" && <button
                onClick={async () => {
                    const response = await fetch(`/api/challenges/${params.id}`, { method: "DELETE" });
                    const data = await response.json();
                    if (!response.ok) setError(data.error || "Could not cancel this challenge.");
                    else router.push("/matches");
                }}
                className="w-full border border-red-400/40 text-red-200 font-semibold py-3 rounded-xl"
            >{challenge.entryFeeCoins ? "Cancel challenge (refund 100 coins)" : "Cancel challenge"}</button>}
            <p className="text-center text-xs text-slate-500">Only accept challenges from people you know.</p>
        </div>
    );
}
