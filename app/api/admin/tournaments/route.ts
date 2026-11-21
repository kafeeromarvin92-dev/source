import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import {
    getTournamentRoundCount,
    getTournamentRoundLabel,
    isPrizeSplit,
    isTournamentEntryFee,
    isTournamentSize,
} from "../../../lib/tournament-utils";

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const tournaments = await prisma.tournament.findMany({
        include: { _count: { select: { entries: true } } },
        orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ tournaments: tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        size: tournament.size,
        entryFee: tournament.entryFee,
        pot: tournament.entryFee * tournament.size,
        startAt: tournament.startAt,
        status: tournament.status,
        playersJoined: tournament._count.entries,
    })) });
}

export async function POST(request: Request) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const body = await request.json().catch(() => null) as {
        name?: unknown;
        size?: unknown;
        entryFee?: unknown;
        prizeSplit?: unknown;
        bestOf?: unknown;
        startAt?: unknown;
        format?: unknown;
    } | null;
    if (!body) return NextResponse.json({ error: "Tournament details are required." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const size = body.size;
    const entryFee = body.entryFee;
    const prizeSplit = body.prizeSplit;
    const bestOf = body.bestOf;
    const startAt = typeof body.startAt === "string" ? new Date(body.startAt) : null;
    if (
        name.length < 3 || name.length > 60
        || !isTournamentSize(size)
        || !isTournamentEntryFee(entryFee)
        || !isPrizeSplit(prizeSplit)
        || (bestOf !== 1 && bestOf !== 3)
        || !startAt || Number.isNaN(startAt.getTime())
        || startAt.getTime() < Date.now() - 60_000
        || (body.format !== undefined && body.format !== "SINGLE_ELIMINATION")
    ) {
        return NextResponse.json({ error: "Enter a 3–60 character name, valid size, fee, prize split totaling 100%, best-of 1 or 3, and a current or future start time." }, { status: 400 });
    }

    const roundCount = getTournamentRoundCount(size);
    const tournament = await prisma.$transaction(async (transaction) => {
        const created = await transaction.tournament.create({
            data: {
                name,
                size,
                entryFee,
                prizeSplit,
                startAt,
                bestOf,
                format: "SINGLE_ELIMINATION",
                status: "OPEN",
                createdByAdminId: admin.id,
            },
        });
        const matches = [];
        for (let round = 1; round <= roundCount; round += 1) {
            const count = size / 2 ** round;
            const roundLabel = getTournamentRoundLabel(round, roundCount);
            for (let position = 1; position <= count; position += 1) {
                matches.push({
                    tournamentId: created.id,
                    round,
                    roundLabel,
                    position,
                    scheduledAt: round === 1 ? startAt : null,
                });
            }
        }
        await transaction.tournamentMatch.createMany({ data: matches });
        return created;
    });

    return NextResponse.json({ tournament: {
        id: tournament.id,
        name: tournament.name,
        size: tournament.size,
        entryFee: tournament.entryFee,
        pot: tournament.entryFee * tournament.size,
        startAt: tournament.startAt,
        status: tournament.status,
    } }, { status: 201 });
}
