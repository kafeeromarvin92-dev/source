"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import ScreenshotViewer from "../../components/ScreenshotViewer";
import TeamLogo from "../../components/TeamLogo";
import CountryFlag from "../../components/CountryFlag";
import { Challenge, MatchRoom } from "../../types";
import { calculateMatchEconomy, isEntryStake } from "../../lib/coin-rules";

const reactions = ["Nice game", "Almost", "Fair play", "Next time, better"];
const reasons = ["Wrong score", "Fake screenshot", "Wrong match", "Other"];
const RESPONSE_WINDOW_MS = 10 * 60 * 1000;

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function statusStyle(status: string) {
    if (status === "settled") return "border-neon/20 bg-neon/10 text-neon";
    if (status === "disputed") return "border-danger/25 bg-danger/10 text-red-200";
    if (status === "review") return "border-blue-300/20 bg-blue-300/10 text-blue-200";
    if (status === "accepted") return "border-gold/20 bg-gold/10 text-gold";
    return "border-white/10 bg-white/5 text-slate-400";
}

export default function MatchPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [room, setRoom] = useState<MatchRoom | null>(null);
    const [userId, setUserId] = useState("");
    const [coinBalance, setCoinBalance] = useState(0);
    const [winnerId, setWinnerId] = useState("");
    const [reason, setReason] = useState(reasons[0]);
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(0);

    const loadRoom = useCallback(async () => {
        const response = await fetch(`/api/challenges/${id}/room`);
        const data = await response.json().catch(() => null);
        if (response.ok && data?.room) {
            setRoom(data.room);
            setChallenge(data.room.challenge);
        }
    }, [id]);

    useEffect(() => {
        let mounted = true;
        void Promise.all([fetch("/api/auth/me"), fetch(`/api/challenges/${id}`)]).then(async ([meResponse, matchResponse]) => {
            const [meData, matchData] = await Promise.all([
                meResponse.json().catch(() => null),
                matchResponse.json().catch(() => null),
            ]);
            if (!mounted) return;
            if (!matchResponse.ok) {
                setError(matchData?.error || "This challenge is unavailable.");
                return;
            }
            setUserId(meData?.user?.id || "");
            setCoinBalance(typeof meData?.user?.coinBalance === "number" ? meData.user.coinBalance : 0);
            setChallenge(matchData.challenge);
            setWinnerId(matchData.challenge.creator.id);
            if (matchData.challenge.status !== "open") await loadRoom();
        }).catch(() => {
            if (mounted) setError("Could not reach this match. Check your connection and try again.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [id, loadRoom]);

    useEffect(() => {
        if (!room) return;
        const timer = window.setInterval(() => { void loadRoom(); }, 5000);
        return () => window.clearInterval(timer);
    }, [loadRoom, room]);

    useEffect(() => {
        const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(timer);
        };
    }, []);

    async function accept() {
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/challenges/${id}`, { method: "PATCH" });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || "Challenge is no longer available.");
                return;
            }
            setChallenge(data.challenge);
            await loadRoom();
        } catch {
            setError("Could not reach Noble Gamers. The challenge was not accepted.");
        } finally {
            setBusy(false);
        }
    }

    function readImage(event: ChangeEvent<HTMLInputElement>, action: "submission" | "dispute") {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setError("Choose a PNG, JPEG, or WebP screenshot up to 5 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => setError("Could not read that screenshot. Choose it again.");
        reader.onload = () => { void send(action, String(reader.result)); };
        reader.readAsDataURL(file);
    }

    async function send(action: string, image?: string, code?: string, reaction?: string) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            const response = await fetch(`/api/challenges/${id}/room`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, image, code, reaction, winnerId, reason: `${reason}${note.trim() ? `: ${note.trim()}` : ""}` }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || "Could not update this match.");
                return;
            }
            if (data?.room) {
                setRoom(data.room);
                setChallenge(data.room.challenge);
            }
            const nextMessage = action === "confirm"
                ? "Result confirmed. The verified record is updated."
                : action === "dispute"
                    ? "Dispute sent to admin review. No result is awarded until it is reviewed."
                    : action === "code"
                        ? "Your DLS code was saved for this match."
                        : "Screenshot submitted. Your opponent can confirm it or dispute it with their own evidence.";
            setMessage(nextMessage);
            setNote("");
        } catch {
            setError("Could not reach Noble Gamers. Your match update was not saved.");
        } finally {
            setBusy(false);
        }
    }

    async function cancelChallenge() {
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/challenges/${id}`, { method: "DELETE" });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                setError(data?.error || "Could not cancel this challenge.");
                return;
            }
            router.push("/matches");
        } catch {
            setError("Could not reach Noble Gamers. The challenge was not cancelled.");
        } finally {
            setBusy(false);
        }
    }

    const submissions = useMemo(() => Object.entries(room?.submissions || {}), [room?.submissions]);
    const status = room?.challenge.status || challenge?.status || "open";
    const isCreator = challenge?.creator.id === userId;
    const submittedByMe = Boolean(room?.submissions?.[userId]);
    const onlyOpponentSubmission = submissions.length === 1 && !submittedByMe;
    const firstSubmission = submissions[0]?.[1];
    const responseWindowEndsAt = firstSubmission ? new Date(new Date(firstSubmission.submittedAt).getTime() + RESPONSE_WINDOW_MS) : null;
    const responseWindowRemaining = responseWindowEndsAt ? Math.max(0, responseWindowEndsAt.getTime() - now) : 0;
    const entryEconomy = challenge && isEntryStake(challenge.entryStake) ? calculateMatchEconomy(challenge.entryStake) : null;
    const decisionWinner = room?.decision?.winnerId === challenge?.creator.id
        ? challenge?.creator
        : room?.decision?.winnerId && room.decision.winnerId === challenge?.acceptedBy?.id
            ? challenge.acceptedBy
            : null;

    if (loading) {
        return <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6 sm:px-6"><div className="skeleton h-64 rounded-3xl" /><div className="skeleton h-48 rounded-2xl" /></div>;
    }

    if (!challenge) {
        return <div className="mx-auto max-w-xl px-4 pt-8"><p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error || "Challenge unavailable."}</p><Link href="/matches" className="mt-4 inline-flex text-sm font-bold text-gold">← Back to matches</Link></div>;
    }

    const creator = challenge.creator;
    const opponent = challenge.acceptedBy;

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-3"><Link href="/matches" className="text-sm font-bold text-slate-400 transition hover:text-gold">← Matches</Link>{status === "open" && isCreator && <button type="button" disabled={busy} onClick={() => { void cancelChallenge(); }} className="text-sm font-bold text-red-200 disabled:opacity-50">{busy ? "Cancelling…" : "Cancel challenge"}</button>}</div>

            <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">DLS challenge</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Match room</h1></div>
                    <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${statusStyle(status)}`}>{status}</span>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                    <div className="flex min-w-0 flex-col items-center text-center"><TeamLogo avatar={creator.avatar} alt={`${creator.teamName || creator.username} logo`} size={76} /><p className="mt-2 w-full truncate text-sm font-black"><CountryFlag country={creator.country} className="mr-1" />{creator.teamName || creator.username}</p><p className="w-full truncate text-xs text-slate-400">@{creator.username}</p></div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">VS</span>
                    <div className="flex min-w-0 flex-col items-center text-center">{opponent ? <TeamLogo avatar={opponent.avatar} alt={`${opponent.teamName || opponent.username} logo`} size={76} /> : <TeamLogo size={76} alt="Opponent logo placeholder" />}<p className="mt-2 w-full truncate text-sm font-black"><CountryFlag country={opponent?.country} className="mr-1" />{opponent?.teamName || "Opponent pending"}</p><p className="w-full truncate text-xs text-slate-400">{opponent ? `@${opponent.username}` : "Waiting for a player"}</p></div>
                </div>
                <p className="mt-4 text-center text-sm font-black text-gold">{challenge.entryStake} points each · winner receives {entryEconomy?.winnerPayout ?? "—"} · house fee {entryEconomy?.houseFee ?? "—"}</p>
                <p className="mt-2 text-center text-xs leading-5 text-slate-400">Play your match, share DLS codes privately in this room, then upload a clear full-time screenshot. Submission order does not determine the result.</p>
            </header>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
            {message && <p role="status" aria-live="polite" className="rounded-xl border border-neon/30 bg-neon/10 p-3 text-sm text-green-200">{message}</p>}

            {status === "open" && !isCreator && !userId && <div className="rounded-2xl border border-gold/20 bg-surface p-4"><p className="text-sm font-bold">Sign in to accept this challenge.</p><Link href="/login" className="mt-3 inline-flex rounded-xl bg-gold px-4 py-2.5 text-xs font-black text-navy-950">Sign in</Link></div>}
            {status === "open" && !isCreator && userId && <div className="space-y-2"><p className="text-center text-xs text-slate-400">Your wallet: <span className="font-black text-gold">{coinBalance} points</span></p><button type="button" disabled={busy || coinBalance < challenge.entryStake} onClick={() => { void accept(); }} className="w-full rounded-xl bg-gold py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Joining…" : `Accept · pay ${challenge.entryStake} points`}</button>{coinBalance < challenge.entryStake && <p className="text-center text-xs text-red-200">You need more points for this entry. Ask an admin about a grant.</p>}</div>}
            {status === "open" && isCreator && <div className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-slate-300">Your challenge is open. Share the link with an opponent; you can cancel it while no one has accepted.</div>}

            {status !== "open" && !userId && (
                <div className="rounded-2xl border border-gold/20 bg-surface p-4"><p className="text-sm font-bold">Sign in with a match participant account to view the private room.</p><Link href="/login" className="mt-3 inline-flex rounded-xl bg-gold px-4 py-2.5 text-xs font-black text-navy-950">Sign in</Link></div>
            )}

            {status !== "open" && Boolean(userId) && (
                <>
                    {status === "accepted" && <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-surface p-4 text-center sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Shared match code</p>
                        <p className="mt-2 font-mono text-3xl font-black tracking-[0.28em] text-white" aria-label={challenge.matchCode ? `Shared match code ${challenge.matchCode}` : "Shared match code is being assigned"}>{challenge.matchCode || "Assigning…"}</p>
                        <p className="mt-2 text-xs text-slate-400">This one code belongs to the challenge; both players use the same code.</p>
                    </section>}
                    <section className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Optional game details</p><h2 className="mt-1 text-lg font-black">DLS player codes</h2><p className="mt-1 text-xs leading-5 text-slate-400">The shared match code above is automatic. Only add your personal DLS player code here if you need to share it with your opponent.</p></div><span className="text-xl" aria-hidden="true">🔒</span></div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[creator, opponent].filter((player): player is NonNullable<typeof player> => Boolean(player)).map((player) => (
                                <form key={player.id} onSubmit={(event) => { event.preventDefault(); const code = new FormData(event.currentTarget).get("code"); if (typeof code === "string" && code.trim()) void send("code", undefined, code.trim()); }} className="rounded-xl border border-white/5 bg-navy-950/50 p-3">
                                    <label className="block text-xs font-bold">{player.id === userId ? "Your DLS code" : `${player.teamName || player.username}’s code`}<input name="code" defaultValue={room?.playerCodes?.[player.id] || ""} maxLength={32} placeholder="Enter your game code" disabled={player.id !== userId || !userId || busy} className="mt-2 w-full rounded-lg border border-white/5 bg-navy-900 px-3 py-2.5 text-sm outline-none focus:border-gold/40 disabled:opacity-60" /></label>
                                    {player.id === userId && <button disabled={busy || !userId} className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black text-gold disabled:opacity-50">{busy ? "Saving…" : "Save code"}</button>}
                                </form>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">{reactions.map((reaction) => <button key={reaction} type="button" disabled={busy || !userId} onClick={() => { void send("reaction", undefined, undefined, reaction); }} className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-300 transition hover:border-gold/30 hover:text-gold disabled:opacity-50">{reaction}</button>)}</div>
                    </section>

                    {status !== "settled" && status !== "cancelled" && (
                        <section className="space-y-4 rounded-2xl border border-gold/20 bg-surface p-4 sm:p-5">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Result evidence</p><h2 className="mt-1 text-lg font-black">Submit the final score</h2><p className="mt-1 text-sm leading-5 text-slate-400">Upload the full DLS result screen in landscape. Don’t crop the screenshot; it helps both players and admins verify the match.</p></div>
                            <label className="block text-sm font-bold">Winner shown on your screenshot
                                <select value={winnerId} onChange={(event) => setWinnerId(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-white/5 bg-navy-900 px-3 py-3 outline-none focus:border-gold/40">
                                    <option value={creator.id}>{creator.teamName || creator.username}</option>
                                    {opponent && <option value={opponent.id}>{opponent.teamName || opponent.username}</option>}
                                </select>
                            </label>

                            {onlyOpponentSubmission && (
                                <div className="rounded-xl border border-blue-300/20 bg-blue-300/5 p-4">
                                    <p className="text-sm font-black text-blue-100">Your opponent submitted a result</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-400">{responseWindowRemaining > 0 ? `You have ${formatRemaining(responseWindowRemaining)} to confirm the result or dispute it with your own screenshot and an explanation.` : "The 10-minute response window has ended; an admin may review the evidence now."} No one wins automatically.</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" disabled={busy} onClick={() => { void send("confirm"); }} className="flex-1 rounded-xl bg-neon px-4 py-3 text-xs font-black text-navy-950 disabled:opacity-50">Confirm result</button>
                                        <label className="flex-1 cursor-pointer rounded-xl border border-danger/40 px-4 py-3 text-center text-xs font-black text-red-200">Dispute with screenshot<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => readImage(event, "dispute")} className="sr-only" /></label>
                                    </div>
                                    <label className="mt-3 block text-xs font-bold text-slate-300">Reason
                                        <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-white/5 bg-navy-900 px-3 py-2.5 text-sm">
                                            {reasons.map((item) => <option key={item}>{item}</option>)}
                                        </select>
                                    </label>
                                    <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Add a note for the admin (optional)" className="mt-3 min-h-20 w-full rounded-lg border border-white/5 bg-navy-900 px-3 py-2.5 text-sm outline-none focus:border-gold/40" />
                                </div>
                            )}

                            {(!onlyOpponentSubmission || submittedByMe) && (
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold/30 bg-gold/5 px-4 py-5 text-center transition hover:bg-gold/10">
                                    <span className="text-2xl" aria-hidden="true">▧</span>
                                    <span className="mt-2 text-sm font-black text-gold">{submittedByMe ? "Replace your screenshot" : "Upload result screenshot"}</span>
                                    <span className="mt-1 text-xs text-slate-400">JPG, PNG or WebP · up to 5 MB · keep the full 16:9 result screen</span>
                                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !userId} onChange={(event) => readImage(event, "submission")} className="sr-only" />
                                </label>
                            )}

                            {submissions.length === 1 && submittedByMe && <p className="rounded-xl border border-white/5 bg-navy-950/50 p-3 text-sm text-slate-300">{responseWindowRemaining > 0 ? `Your screenshot is saved. Your opponent has ${formatRemaining(responseWindowRemaining)} to confirm or dispute it.` : "Your screenshot is saved. The 10-minute response window has ended; an admin may review the evidence now."} There is no automatic winner.</p>}
                            {status === "disputed" && <p className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-red-100">This result is with an admin for review. The verified record will not change until the admin settles it.</p>}
                        </section>
                    )}

                    {submissions.length > 0 && (
                        <section className="space-y-3 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Evidence</p><h2 className="mt-1 text-lg font-black">Submitted screenshots</h2></div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                {submissions.map(([playerId, submission]) => {
                                    const player = playerId === creator.id ? creator : opponent;
                                    return <div key={playerId} className="space-y-2 rounded-xl border border-white/5 bg-navy-950/40 p-3"><div className="flex items-center gap-2"><TeamLogo avatar={player?.avatar} alt={`${submission.playerName} team logo`} size={36} /><div><p className="text-xs font-black">{player?.teamName || submission.playerName}</p><p className="text-[10px] text-slate-500">@{submission.playerName} · {new Date(submission.submittedAt).toLocaleString()}</p></div></div><ScreenshotViewer src={submission.image} alt={`${submission.playerName} result screenshot`} /></div>;
                                })}
                            </div>
                        </section>
                    )}

                    {status === "settled" && (
                        <div className="rounded-2xl border border-neon/25 bg-neon/10 p-5 text-center">
                            <span className="text-3xl" aria-hidden="true">✓</span>
                            <h2 className="mt-2 text-lg font-black text-neon">Verified result</h2>
                            <p className="mt-1 text-sm text-slate-200">{decisionWinner ? `${decisionWinner.teamName || decisionWinner.username} won the match.` : room?.decision?.winnerId === null ? "The match was ruled a draw and both entry stakes were refunded." : "This match result is settled."}</p>
                            <Link href="/results" className="mt-4 inline-flex rounded-xl border border-neon/25 px-4 py-2.5 text-xs font-black text-neon">View results</Link>
                        </div>
                    )}
                    {status === "cancelled" && <div className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-slate-400">This challenge was cancelled.</div>}
                </>
            )}
        </div>
    );
}
