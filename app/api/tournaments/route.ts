import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    const tournaments = await prisma.tournament.findMany({
        where: { status: { in: ["OPEN", "LIVE", "FINISHED"] } },
        include: {
            _count: { select: { entries: true } },
            entries: user ? { where: { userId: user.id }, select: { id: true, seed: true } } : false,
        },
        orderBy: [{ status: "asc" }, { startAt: "asc" }],
    });
    return NextResponse.json({ tournaments: tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        size: tournament.size,
        entryFee: tournament.entryFee,
        pot: tournament.entryFee * tournament.size,
        prizeSplit: tournament.prizeSplit,
        startAt: tournament.startAt,
        status: tournament.status,
        playersJoined: tournament._count.entries,
        myEntry: user && tournament.entries.length > 0 ? tournament.entries[0] : null,
    })) });
}
