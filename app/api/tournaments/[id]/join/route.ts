import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { getBracketSeedOrder } from "../../../../lib/tournament-utils";

type RouteContext = { params: Promise<{ id: string }> };
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createChallengeCode() {
    return Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function POST(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to join a tournament." }, { status: 401 });
    const { id } = await context.params;

    try {
        const entry = await prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "Tournament" WHERE "id" = ${id} FOR UPDATE`;
            const tournament = await transaction.tournament.findUnique({ where: { id } });
            if (!tournament) throw new Error("NOT_FOUND");
            if (tournament.status !== "OPEN") throw new Error("NOT_OPEN");

            const entriesCount = await transaction.tournamentEntry.count({ where: { tournamentId: id } });
            if (entriesCount >= tournament.size) throw new Error("FULL");
            if (await transaction.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId: user.id } } })) {
                throw new Error("ALREADY_JOINED");
            }

            if (tournament.entryFee > 0) {
                const debit = await transaction.wallet.updateMany({
                    where: { userId: user.id, balance: { gte: tournament.entryFee } },
                    data: { balance: { decrement: tournament.entryFee } },
                });
                if (debit.count !== 1) throw new Error("INSUFFICIENT_COINS");
                const wallet = await transaction.wallet.findUniqueOrThrow({ where: { userId: user.id } });
                await transaction.coinTransaction.create({
                    data: {
                        walletId: wallet.id,
                        tournamentId: id,
                        type: "TOURNAMENT_ENTRY",
                        amount: -tournament.entryFee,
                        referenceKey: `tournament:${id}:entry:${user.id}`,
                        note: `Entry fee for ${tournament.name}`,
                    },
                });
            }

            const seed = entriesCount + 1;
            const created = await transaction.tournamentEntry.create({
                data: {
                    tournamentId: id,
                    userId: user.id,
                    teamName: user.teamName,
                    teamLogo: user.avatar,
                    seed,
                },
            });
            const seedIndex = getBracketSeedOrder(tournament.size).indexOf(seed);
            const position = Math.floor(seedIndex / 2) + 1;
            const slot = seedIndex % 2 === 0 ? "playerAId" : "playerBId";
            const match = await transaction.tournamentMatch.findUniqueOrThrow({
                where: { tournamentId_round_position: { tournamentId: id, round: 1, position } },
            });
            const opponentId = slot === "playerAId" ? match.playerBId : match.playerAId;
            let challengeCode: string | null = null;
            if (opponentId) {
                for (let attempt = 0; attempt < 5; attempt += 1) {
                    const candidate = createChallengeCode();
                    if (!(await transaction.tournamentMatch.findUnique({ where: { challengeCode: candidate }, select: { id: true } }))) {
                        challengeCode = candidate;
                        break;
                    }
                }
                if (!challengeCode) throw new Error("CODE_GENERATION_FAILED");
            }
            await transaction.tournamentMatch.update({
                where: { id: match.id },
                data: {
                    [slot]: user.id,
                    status: opponentId ? "READY" : "WAITING",
                    ...(challengeCode ? { challengeCode } : {}),
                },
            });
            return created;
        });

        return NextResponse.json({ entry: { id: entry.id, seed: entry.seed, status: entry.status } }, { status: 201 });
    } catch (error) {
        if (error instanceof Error) {
            const errors: Record<string, { message: string; status: number }> = {
                NOT_FOUND: { message: "Tournament not found.", status: 404 },
                NOT_OPEN: { message: "This tournament is no longer accepting entries.", status: 409 },
                FULL: { message: "All tournament places have been filled.", status: 409 },
                ALREADY_JOINED: { message: "You already joined this tournament.", status: 409 },
                INSUFFICIENT_COINS: { message: "Your wallet does not have enough coins for this entry fee.", status: 409 },
                CODE_GENERATION_FAILED: { message: "Could not safely generate a match code. Please retry.", status: 503 },
            };
            const known = errors[error.message];
            if (known) return NextResponse.json({ error: known.message }, { status: known.status });
        }
        throw error;
    }
}
