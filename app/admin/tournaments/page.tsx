"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminTournament = {
    id: string;
    name: string;
    size: number;
    entryFee: number;
    pot: number;
    startAt: string;
    status: string;
    playersJoined: number;
};

export default function AdminTournamentsPage() {
    const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        void fetch("/api/admin/tournaments").then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!mounted) return;
            if (!response.ok) setError(data?.error || "Could not load tournaments.");
            else setTournaments(Array.isArray(data?.tournaments) ? data.tournaments : []);
        }).catch(() => {
            if (mounted) setError("Could not reach tournament management.");
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6">
            <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-navy-800 to-navy-950 p-5 sm:p-8">
                <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Admin tools</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tournament control</h1><p className="mt-2 text-sm text-slate-400">Create brackets, start full tournaments, and record results.</p></div>
                <Link href="/admin/tournaments/new" className="rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 transition hover:bg-gold-light">Create tournament</Link>
            </header>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
            {loading ? <div className="space-y-3"><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /></div> : tournaments.length > 0 ? (
                <section className="space-y-3">
                    {tournaments.map((tournament) => <article key={tournament.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
                        <div className="min-w-0 flex-1"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tournament.status === "LIVE" ? "bg-neon/10 text-neon" : tournament.status === "FINISHED" ? "bg-white/5 text-slate-400" : "bg-gold/10 text-gold"}`}>{tournament.status}</span><h2 className="mt-2 truncate text-lg font-black">{tournament.name}</h2><p className="mt-1 text-xs text-slate-400">{tournament.playersJoined}/{tournament.size} players · {tournament.entryFee.toLocaleString()} entry · {new Date(tournament.startAt).toLocaleString()}</p></div>
                        <div className="rounded-xl border border-gold/15 bg-gold/5 px-4 py-3 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pot</p><p className="font-black text-gold">{tournament.pot.toLocaleString()} coins</p></div>
                        <Link href={`/admin/tournaments/${tournament.id}`} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-200 hover:border-gold/30 hover:text-gold">Manage bracket</Link>
                    </article>)}
                </section>
            ) : !error ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-8 text-center"><h2 className="font-black">No tournaments created</h2><p className="mt-1 text-sm text-slate-400">Build your first bracket to open registration.</p><Link href="/admin/tournaments/new" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950">Create tournament</Link></div> : null}
        </div>
    );
}
