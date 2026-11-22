import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../../../../lib/server-auth";
import { prisma } from "../../../../../../lib/prisma";
import { calculateTournamentPrizes, getTournamentRoundCount, isPrizeSplit } from "../../../../../../lib/tournament-utils";

type RouteContext = { params: Promise<{ id: string; matchId: string }> };

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export async function PATCH(request: Request, context: RouteContext) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const { id, matchId } = await context.params;
    const body = await request.json().catch(() => null) as {
        action?: unknown;
        scheduledAt?: unknown;
        playByAt?: unknown;
    } | null;
    if (!body || body.action !== "schedule" || typeof body.scheduledAt !== "string" || typeof body.playByAt !== "string") {
        return NextResponse.json({ error: "A scheduled start and play-by time are required." }, { status: 400 });
    }
    const scheduledAt = new Date(body.scheduledAt);
    const playByAt = new Date(body.playByAt);
    if (Number.isNaN(scheduledAt.getTime()) || Number.isNaN(playByAt.getTime()) || playByAt.getTime() <= scheduledAt.getTime()) {
        return NextResponse.json({ error: "The play-by time must be later than the scheduled start." }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "Tournament" WHERE "id" = ${id} FOR UPDATE`;
            const match = await transaction.tournamentMatch.findUnique({
                where: { id: matchId },
                include: { tournament: { select: { id: true, name: true, status: true } } },
            });
            if (!match || match.tournamentId !== id) throw new Error("MATCH_NOT_FOUND");
            if (match.tournament.status !== "LIVE") throw new Error("NOT_LIVE");
            if (!match.playerAId || !match.playerBId) throw new Error("MATCH_NOT_READY");
            if (!["WAITING", "READY"].includes(match.status)) throw new Error("MATCH_NOT_SCHEDULABLE");

            await transaction.tournamentMatch.update({
                where: { id: match.id },
                data: { scheduledAt, playByAt, status: "READY" },
            });
            await transaction.notification.createMany({
                data: [match.playerAId, match.playerBId].map((userId) => ({
                    userId,
                    title: "Tournament match scheduled",
                    message: `${match.tournament.name} · ${match.roundLabel} match ${match.position} starts ${scheduledAt.toISOString()} and must be played by ${playByAt.toISOString()}.`,
                    kind: "TOURNAMENT",
                })),
            });
            return { scheduledAt, playByAt };
        });
        return NextResponse.json({ result });
    } catch (error) {
        if (error instanceof Error) {
            const errors: Record<string, { message: string; status: number }> = {
                MATCH_NOT_FOUND: { message: "Match not found.", status: 404 },
                NOT_LIVE: { message: "Tournament is not live.", status: 409 },
                MATCH_NOT_READY: { message: "Both players must be assigned before scheduling this match.", status: 409 },
                MATCH_NOT_SCHEDULABLE: { message: "This match cannot be scheduled in its current state.", status: 409 },
            };
            const known = errors[error.message];
            if (known) return NextResponse.json({ error: known.message }, { status: known.status });
        }
        throw error;
    }
}

export async function POST(request: Request, context: RouteContext) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const { id, matchId } = await context.params;
    const body = await request.json().catch(() => null) as {
        winnerId?: unknown;
        scoreA?: unknown;
        scoreB?: unknown;
        forfeit?: unknown;
    } | null;
    if (!body) return NextResponse.json({ error: "Match result is required." }, { status: 400 });
    const winnerId = body.winnerId;
    const scoreA = body.scoreA;
    const scoreB = body.scoreB;
    const scoresProvided = scoreA !== undefined || scoreB !== undefined;
    if (
        typeof winnerId !== "string"
        || (body.forfeit !== undefined && typeof body.forfeit !== "boolean")
        || (scoresProvided && (!isNonNegativeInteger(scoreA) || !isNonNegativeInteger(scoreB)))
    ) {
        return NextResponse.json({ error: "Select a match winner and provide both non-negative scores, or omit both scores." }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "Tournament" WHERE "id" = ${id} FOR UPDATE`;
            const tournament = await transaction.tournament.findUnique({ where: { id } });
            if (!tournament) throw new Error("NOT_FOUND");
            if (tournament.status !== "LIVE") throw new Error("NOT_LIVE");
            const match = await transaction.tournamentMatch.findUnique({ where: { id: matchId } });
            if (!match || match.tournamentId !== id) throw new Error("MATCH_NOT_FOUND");
            if (!["READY", "PLAYING", "AWAITING_SCREENSHOT", "DISPUTED"].includes(match.status)) throw new Error("MATCH_NOT_SETTLEABLE");
            if (![match.playerAId, match.playerBId].includes(winnerId)) throw new Error("INVALID_WINNER");

            const loserId = winnerId === match.playerAId ? match.playerBId : match.playerAId;
            if (!loserId) throw new Error("INVALID_WINNER");
            const completedAt = new Date();
            await transaction.tournamentMatch.update({
                where: { id: match.id },
                data: {
                    winnerId,
                    settledByAdminId: admin.id,
                    status: body.forfeit === true ? "FORFEIT" : "DONE",
                    scoreA: scoresProvided ? scoreA : null,
                    scoreB: scoresProvided ? scoreB : null,
                    completedAt,
                },
            });
            await transaction.tournamentEntry.updateMany({
                where: { tournamentId: id, userId: loserId, status: "JOINED" },
                data: { status: "ELIMINATED" },
            });

            const finalRound = getTournamentRoundCount(tournament.size);
            let winnerPrize = 0;
            if (match.round === finalRound) {
                await transaction.tournamentEntry.updateMany({
                    where: { tournamentId: id, userId: winnerId, status: "JOINED" },
                    data: { status: "CHAMPION" },
                });
                await transaction.tournament.update({ where: { id }, data: { status: "FINISHED" } });
                const split = tournament.prizeSplit;
                if (!isPrizeSplit(split)) throw new Error("INVALID_PRIZE_SPLIT");
                const pot = tournament.entryFee * tournament.size;
                const prizes = calculateTournamentPrizes(pot, split);
                winnerPrize = prizes.winner;
                const semifinalMatches = await transaction.tournamentMatch.findMany({
                    where: { tournamentId: id, round: finalRound - 1, winnerId: { not: null } },
                });
                const semifinalLosers = semifinalMatches
                    .map((item) => item.playerAId === item.winnerId ? item.playerBId : item.playerAId)
                    .filter((userId): userId is string => Boolean(userId));
                const awards = new Map<string, number>();
                awards.set(winnerId, prizes.winner);
                awards.set(loserId, prizes.runnerUp);
                for (const semifinalLoser of semifinalLosers) {
                    awards.set(semifinalLoser, (awards.get(semifinalLoser) ?? 0) + prizes.semiEach);
                }
                const recipients = [...awards].filter(([, amount]) => amount > 0);
                if (recipients.length > 0) {
                    const wallets = await transaction.wallet.findMany({ where: { userId: { in: recipients.map(([userId]) => userId) } } });
                    if (wallets.length !== recipients.length) throw new Error("MISSING_PRIZE_WALLET");
                    for (const [userId, amount] of recipients) {
                        const wallet = wallets.find((item) => item.userId === userId);
                        if (!wallet) throw new Error("MISSING_PRIZE_WALLET");
                        await transaction.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
                        await transaction.coinTransaction.create({
                            data: {
                                walletId: wallet.id,
                                tournamentId: id,
                                createdById: admin.id,
                                type: "TOURNAMENT_PAYOUT",
                                amount,
                                referenceKey: `tournament:${id}:payout:${userId}`,
                                note: `Prize for ${tournament.name}`,
                            },
                        });
                    }
                }
            } else {
                const nextRound = match.round + 1;
                const nextPosition = Math.ceil(match.position / 2);
                const nextMatch = await transaction.tournamentMatch.findUniqueOrThrow({
                    where: { tournamentId_round_position: { tournamentId: id, round: nextRound, position: nextPosition } },
                });
                const nextSlot = match.position % 2 === 1 ? "playerAId" : "playerBId";
                if (nextMatch[nextSlot] !== null) throw new Error("SLOT_ALREADY_FILLED");
                const nextOpponentId = nextSlot === "playerAId" ? nextMatch.playerBId : nextMatch.playerAId;
                let challengeCode: string | undefined;
                if (nextOpponentId) {
                    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                    for (let attempt = 0; attempt < 5; attempt += 1) {
                        const candidate = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
                        if (!(await transaction.tournamentMatch.findUnique({ where: { challengeCode: candidate }, select: { id: true } }))) {
                            challengeCode = candidate;
                            break;
                        }
                    }
                    if (!challengeCode) throw new Error("CODE_GENERATION_FAILED");
                }
                await transaction.tournamentMatch.update({
                    where: { id: nextMatch.id },
                    data: {
                        [nextSlot]: winnerId,
                        status: nextOpponentId ? "READY" : "WAITING",
                        scheduledAt: null,
                        playByAt: null,
                        ...(challengeCode ? { challengeCode } : {}),
                    },
                });
            }

            return {
                tournamentFinished: match.round === finalRound,
                winnerId,
                prize: winnerPrize,
            };
        });
        return NextResponse.json({ result });
    } catch (error) {
        if (error instanceof Error) {
            const errors: Record<string, { message: string; status: number }> = {
                NOT_FOUND: { message: "Tournament not found.", status: 404 },
                NOT_LIVE: { message: "Tournament is not live.", status: 409 },
                MATCH_NOT_FOUND: { message: "Match not found.", status: 404 },
                MATCH_NOT_SETTLEABLE: { message: "This match is not ready to be settled.", status: 409 },
                INVALID_WINNER: { message: "Winner must be one of the players in this match.", status: 400 },
                SLOT_ALREADY_FILLED: { message: "The next-round slot is already occupied.", status: 409 },
                INVALID_PRIZE_SPLIT: { message: "Tournament prize split is invalid. No results were saved.", status: 409 },
                MISSING_PRIZE_WALLET: { message: "A prize recipient wallet is missing. No results were saved.", status: 409 },
                CODE_GENERATION_FAILED: { message: "Could not safely generate a match code. Please retry.", status: 503 },
            };
            const known = errors[error.message];
            if (known) return NextResponse.json({ error: known.message }, { status: known.status });
        }
        throw error;
    }
}
