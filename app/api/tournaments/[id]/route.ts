import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { avatarUrl } from "../../../lib/object-storage";
import { prisma } from "../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
const playerSelect = { id: true, username: true, teamName: true, avatar: true } as const;

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            entries: {
                include: { user: { select: playerSelect } },
                orderBy: { seed: "asc" },
            },
            matches: {
                include: {
                    playerA: { select: playerSelect },
                    playerB: { select: playerSelect },
                    winner: { select: playerSelect },
                },
                orderBy: [{ round: "asc" }, { position: "asc" }],
            },
        },
    });
    if (!tournament || (tournament.status === "DRAFT" && (!user || !canAdmin(user)))) {
        return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    }

    return NextResponse.json({
        tournament: {
            id: tournament.id,
            name: tournament.name,
            game: tournament.game,
            size: tournament.size,
            entryFee: tournament.entryFee,
            pot: tournament.entryFee * tournament.size,
            prizeSplit: tournament.prizeSplit,
            startAt: tournament.startAt,
            status: tournament.status,
            format: tournament.format,
            bestOf: tournament.bestOf,
            playersJoined: tournament.entries.length,
            viewerId: user?.id ?? null,
            entries: tournament.entries.map((entry) => ({
                id: entry.id,
                seed: entry.seed,
                status: entry.status,
                user: { ...entry.user, avatar: avatarUrl(entry.user.id, entry.teamLogo ?? entry.user.avatar) },
            })),
            matches: tournament.matches.map((match) => ({
                id: match.id,
                round: match.round,
                roundLabel: match.roundLabel,
                position: match.position,
                status: match.status,
                challengeCode: match.challengeCode,
                scoreA: match.scoreA,
                scoreB: match.scoreB,
                scheduledAt: match.scheduledAt,
                playByAt: match.playByAt,
                completedAt: match.completedAt,
                winnerId: match.winnerId,
                playerA: match.playerA ? { ...match.playerA, avatar: avatarUrl(match.playerA.id, match.playerA.avatar) } : null,
                playerB: match.playerB ? { ...match.playerB, avatar: avatarUrl(match.playerB.id, match.playerB.avatar) } : null,
                winner: match.winner ? { ...match.winner, avatar: avatarUrl(match.winner.id, match.winner.avatar) } : null,
            })),
        },
    });
}
