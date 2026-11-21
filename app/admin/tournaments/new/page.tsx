"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { calculateTournamentPrizes } from "../../../lib/tournament-utils";

const sizes = [4, 8, 16, 32];
const entryFees = [0, 100, 500, 1000, 5000];

function localDateTimeValue(date: Date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
}

export default function NewTournamentPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [size, setSize] = useState(8);
    const [entryFee, setEntryFee] = useState(1000);
    const [winnerPercent, setWinnerPercent] = useState(70);
    const [runnerUpPercent, setRunnerUpPercent] = useState(20);
    const [semiPercent, setSemiPercent] = useState(10);
    const [bestOf, setBestOf] = useState(1);
    const [startMode, setStartMode] = useState<"now" | "schedule">("now");
    const [startAt, setStartAt] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState({ kind: "", text: "" });
    const totalPercent = winnerPercent + runnerUpPercent + semiPercent;
    const prize = useMemo(() => calculateTournamentPrizes(entryFee * size, { winner: winnerPercent, runnerUp: runnerUpPercent, semi: semiPercent }), [entryFee, size, winnerPercent, runnerUpPercent, semiPercent]);

    function chooseStartMode(mode: "now" | "schedule") {
        setStartMode(mode);
        const date = new Date();
        if (mode === "schedule") date.setHours(date.getHours() + 1);
        setStartAt(mode === "now" ? "" : localDateTimeValue(date));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (totalPercent !== 100) {
            setNotice({ kind: "error", text: "Prize percentages must total exactly 100%." });
            return;
        }
        setSubmitting(true);
        setNotice({ kind: "", text: "" });
        try {
            const response = await fetch("/api/admin/tournaments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    size,
                    entryFee,
                    prizeSplit: { winner: winnerPercent, runnerUp: runnerUpPercent, semi: semiPercent },
                    bestOf,
                    startAt: startMode === "now" ? new Date().toISOString() : new Date(startAt).toISOString(),
                    format: "SINGLE_ELIMINATION",
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Could not create tournament.");
            setNotice({ kind: "success", text: "Tournament created with an empty bracket. Redirecting to management…" });
            router.push(`/admin/tournaments/${data.tournament.id}`);
        } catch (error) {
            setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not create tournament." });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-5 px-3 pt-4 sm:space-y-6 sm:px-6 sm:pt-6">
            <header className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><Image src="/noble-gamers-logo.jpg" alt="Noble Gamers" width={52} height={52} unoptimized className="h-12 w-12 shrink-0 rounded-xl bg-fuchsia-500 object-contain sm:h-14 sm:w-14" /><div className="min-w-0"><Link href="/admin/tournaments" className="text-xs font-bold text-slate-400 hover:text-gold">← Tournament control</Link><p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-gold">Admin · new event</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Create tournament</h1></div></div>
                <span className="hidden rounded-full border border-neon/20 bg-neon/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-neon sm:inline-flex">DLS · Single elimination</span>
            </header>

            {notice.text && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${notice.kind === "error" ? "border-danger/30 bg-danger/10 text-red-200" : "border-neon/30 bg-neon/10 text-green-200"}`}>{notice.text}</p>}
            <form onSubmit={(event) => { void submit(event); }} className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:gap-5">
                <section className="order-last min-w-0 space-y-5 rounded-3xl border border-white/10 bg-surface p-4 sm:p-6 lg:order-first">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300">Tournament name<input required minLength={3} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Noble Friday Cup" className="mt-2 w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-sm font-medium normal-case tracking-normal outline-none transition focus:border-gold/40" /></label>

                    <fieldset><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Bracket size</legend><div className="mt-2 grid grid-cols-4 gap-2">{sizes.map((item) => <button key={item} type="button" onClick={() => setSize(item)} className={`rounded-xl border px-3 py-3 text-sm font-black transition ${size === item ? "border-gold bg-gold text-navy-950" : "border-white/10 bg-navy-950 text-slate-300 hover:border-gold/30"}`}>{item}</button>)}</div><p className="mt-2 text-xs text-slate-400">{Math.log2(size)} wins to become champion.</p></fieldset>

                    <fieldset><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Entry fee</legend><div className="mt-2 flex flex-wrap gap-2">{entryFees.map((fee) => <button key={fee} type="button" onClick={() => setEntryFee(fee)} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${entryFee === fee ? "border-neon bg-neon text-navy-950" : "border-white/10 bg-navy-950 text-slate-300 hover:border-neon/30"}`}>{fee === 0 ? "Free" : `${fee.toLocaleString()} coins`}</button>)}</div></fieldset>

                    <fieldset className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-2"><div><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Prize split</legend><p className="mt-1 text-[10px] text-slate-500">Semifinal percentage is shared equally between both semi-finalists.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${totalPercent === 100 ? "bg-neon/10 text-neon" : "bg-danger/10 text-red-200"}`}>{totalPercent}% total</span></div><div className="grid gap-3 sm:grid-cols-3">
                        {[{ label: "Winner %", value: winnerPercent, set: setWinnerPercent }, { label: "Runner-up %", value: runnerUpPercent, set: setRunnerUpPercent }, { label: "Semis %", value: semiPercent, set: setSemiPercent }].map((item) => <label key={item.label} className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}<input type="number" min={0} max={100} step={1} value={item.value} onChange={(event) => item.set(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-3 text-sm font-black text-white" /></label>)}
                    </div></fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <fieldset><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Format</legend><p className="mt-2 rounded-xl border border-white/5 bg-navy-950 px-3 py-3 text-sm font-bold text-slate-300">Single Elimination</p></fieldset>
                        <fieldset><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Best of</legend><div className="mt-2 grid grid-cols-2 gap-2">{[1, 3].map((value) => <button key={value} type="button" onClick={() => setBestOf(value)} className={`rounded-xl border px-3 py-3 text-sm font-black ${bestOf === value ? "border-gold bg-gold text-navy-950" : "border-white/10 bg-navy-950 text-slate-300"}`}>{value} game{value > 1 ? "s" : ""}</button>)}</div></fieldset>
                    </div>

                    <fieldset><legend className="text-xs font-black uppercase tracking-wider text-slate-300">Start time</legend><div className="mt-2 flex gap-2"><button type="button" onClick={() => chooseStartMode("now")} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${startMode === "now" ? "border-neon bg-neon text-navy-950" : "border-white/10 bg-navy-950 text-slate-300"}`}>Now</button><button type="button" onClick={() => chooseStartMode("schedule")} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${startMode === "schedule" ? "border-neon bg-neon text-navy-950" : "border-white/10 bg-navy-950 text-slate-300"}`}>Schedule</button></div>{startMode === "now" ? <p className="mt-3 rounded-xl border border-white/5 bg-navy-950 px-4 py-3 text-sm text-slate-400">Starts as soon as the full bracket is ready and an admin starts it.</p> : <input required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-sm" />}</fieldset>

                    <div className="rounded-xl border border-gold/15 bg-gold/5 p-3 text-xs leading-5 text-slate-300"><span className="font-black text-gold">First release:</span> admins record tournament results directly. Automated ready checks, screenshot submission, and timeout forfeits are not enabled for tournament matches yet; regular challenge review and dispute behavior is unchanged.</div>
                    <button type="submit" disabled={submitting || totalPercent !== 100 || (startMode === "schedule" && !startAt)} className="w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-black text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating…" : "Create tournament"}</button>
                </section>

                <aside className="order-first h-fit min-w-0 space-y-4 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-surface to-navy-950 p-4 sm:sticky sm:top-5 sm:p-6 lg:order-last">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Live preview</p><h2 className="mt-1 truncate text-2xl font-black">{name.trim() || "Noble Friday Cup"}</h2><p className="mt-1 text-xs text-slate-400">{size}-player DLS · Best of {bestOf}</p></div>
                    <div className="rounded-2xl border border-white/5 bg-navy-950/70 p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prize pot · {size} × {entryFee.toLocaleString()}</p><p className="mt-1 text-3xl font-black text-gold">{(entryFee * size).toLocaleString()} <span className="text-sm">coins</span></p>
                        <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-xs"><p className="flex justify-between gap-3"><span className="text-slate-400">Winner · {winnerPercent}%</span><strong className="text-white">{prize.winner.toLocaleString()}</strong></p><p className="flex justify-between gap-3"><span className="text-slate-400">Runner-up · {runnerUpPercent}%</span><strong className="text-white">{prize.runnerUp.toLocaleString()}</strong></p><p className="flex justify-between gap-3"><span className="text-slate-400">Semis · {semiPercent}% total</span><strong className="text-white">{prize.semiEach.toLocaleString()} each</strong></p></div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-navy-950/50 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Road to champion</p><div className="mt-3 flex flex-wrap gap-2">{Array.from({ length: Math.log2(size) }, (_, index) => <span key={index} className="rounded-full border border-neon/15 bg-neon/5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-neon">{index === Math.log2(size) - 1 ? "Final" : `${Math.log2(size) - index} wins left`}</span>)}</div></div>
                    <p className="text-center text-[10px] leading-5 text-slate-500">Entry fees fund the displayed pot. Prize rounding remainder goes to the winner.</p>
                </aside>
            </form>
        </div>
    );
}
