"use client";

import TeamLogo from "./TeamLogo";

export type TournamentPlayerView = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
};

export type TournamentMatchView = {
    id: string;
    round: number;
    roundLabel: string;
    position: number;
    status: string;
    challengeCode: string | null;
    scoreA: number | null;
    scoreB: number | null;
    winnerId: string | null;
    scheduledAt: string | null;
    playByAt: string | null;
    playerA: TournamentPlayerView | null;
    playerB: TournamentPlayerView | null;
};

function statusStyle(status: string) {
    if (status === "DONE") return "bg-neon/10 text-neon";
    if (status === "DISPUTED") return "bg-danger/10 text-red-200";
    if (status === "FORFEIT") return "bg-gold/10 text-gold";
    if (["READY", "PLAYING", "AWAITING_SCREENSHOT"].includes(status)) return "bg-neon/10 text-neon";
    return "bg-white/5 text-slate-400";
}

function statusLabel(status: string) {
    if (status === "PLAYING" || status === "AWAITING_SCREENSHOT") return "LIVE";
    return status.replaceAll("_", " ");
}

export default function TournamentBracket({
    matches,
    viewerId,
    admin = false,
    onChooseWinner,
    onScheduleMatch,
    onOpenMatch,
}: {
    matches: TournamentMatchView[];
    viewerId: string | null;
    admin?: boolean;
    onChooseWinner?: (match: TournamentMatchView, winner: TournamentPlayerView, forfeit: boolean) => void;
    onScheduleMatch?: (match: TournamentMatchView) => void;
    onOpenMatch?: (match: TournamentMatchView) => void;
}) {
    const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b);

    return (
        <section aria-label="Tournament bracket" className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Single elimination · bracket</p>
            <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-white/5 bg-navy-950/50 p-3 sm:p-5" tabIndex={0} aria-label="Scrollable tournament rounds">
                <div className="flex min-w-0 flex-col gap-5 pb-2 sm:min-w-max sm:flex-row sm:items-stretch sm:gap-6">
                    {rounds.map((round) => {
                        const roundMatches = matches.filter((match) => match.round === round);
                        return (
                            <div key={round} className="flex min-w-0 flex-col gap-3 sm:w-80">
                                <h3 className="rounded-xl border border-gold/15 bg-gold/5 px-3 py-2 text-center text-xs font-black uppercase tracking-wider text-gold">
                                    {roundMatches[0]?.roundLabel || `Round ${round}`}
                                </h3>
                                {roundMatches.map((match) => {
                                    const isMyMatch = Boolean(viewerId && (match.playerA?.id === viewerId || match.playerB?.id === viewerId));
                                    const canSettle = admin && onChooseWinner && ["READY", "PLAYING", "AWAITING_SCREENSHOT", "DISPUTED"].includes(match.status);
                                    const canSchedule = admin && onScheduleMatch && match.playerA && match.playerB && ["WAITING", "READY"].includes(match.status) && !match.scheduledAt;
                                    return (
                                        <article
                                            key={match.id}
                                            className={`relative space-y-3 rounded-2xl border p-3 transition ${isMyMatch ? "border-gold/45 bg-gold/[0.07] shadow-lg shadow-gold/5" : "border-white/10 bg-surface"} ${viewerId && !admin && !isMyMatch ? "opacity-55" : ""}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Match {match.position}</span>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${statusStyle(match.status)}`}>
                                                    {["READY", "PLAYING", "AWAITING_SCREENSHOT"].includes(match.status) && <span className="live-dot h-1.5 w-1.5 rounded-full bg-neon" />}
                                                    {statusLabel(match.status)}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    { player: match.playerA, score: match.scoreA, side: "A" },
                                                    { player: match.playerB, score: match.scoreB, side: "B" },
                                                ].map(({ player, score, side }) => (
                                                    <div key={side} className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 ${player?.id === match.winnerId ? "bg-neon/10" : "bg-navy-950/60"}`}>
                                                        <TeamLogo avatar={player?.avatar} alt={`${player?.teamName || "Empty slot"} logo`} size={34} />
                                                        <span className={`min-w-0 flex-1 truncate text-xs font-black ${player?.id === match.winnerId ? "text-neon" : "text-slate-200"}`}>
                                                            {player ? player.teamName : "Waiting for player"}
                                                            {player && <span className="ml-1 font-medium text-slate-500">@{player.username}</span>}
                                                        </span>
                                                        <span className="text-lg font-black tabular-nums text-white">{score ?? "—"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Code</span>
                                                <span className="font-mono text-sm font-black tracking-[0.2em] text-gold">{match.challengeCode || "TBD"}</span>
                                            </div>
                                            {match.scheduledAt && <div className="space-y-1 text-[10px] text-slate-400"><p>Starts {new Date(match.scheduledAt).toLocaleString()}</p>{match.playByAt && <p>Play by {new Date(match.playByAt).toLocaleString()}</p>}</div>}
                                            {admin && match.playerA && match.playerB && !match.scheduledAt && <p className="text-[10px] font-black uppercase tracking-wider text-gold">Schedule required</p>}
                                            {canSchedule && <button type="button" onClick={() => onScheduleMatch(match)} className="w-full rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-black text-gold transition hover:bg-gold/15">Schedule match</button>}
                                            {canSettle && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { player: match.playerA, side: "A" },
                                                        { player: match.playerB, side: "B" },
                                                    ].map(({ player, side }) => player && (
                                                        <button
                                                            key={side}
                                                            type="button"
                                                            onClick={() => onChooseWinner(match, player, false)}
                                                            className="rounded-xl bg-gold px-2 py-2.5 text-[10px] font-black text-navy-950 transition hover:bg-gold-light"
                                                        >
                                                            Settle for {side}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!admin && isMyMatch && onOpenMatch && (
                                                <button type="button" onClick={() => onOpenMatch(match)} className="w-full rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-black text-gold transition hover:bg-gold/15">
                                                    Open my match
                                                </button>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="text-center text-[10px] text-slate-500">Rounds stack on phones and line up horizontally on wider screens.</p>
        </section>
    );
}
