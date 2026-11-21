import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

const playerSelect = { id: true, username: true, teamName: true, avatar: true, country: true } as const;

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const matches = await prisma.challenge.findMany({
        where: { status: "ACCEPTED" },
        select: {
            id: true,
            createdAt: true,
            stakesCollectedAt: true,
            entryStake: true,
            matchCode: true,
            creator: { select: playerSelect },
            acceptedBy: { select: playerSelect },
        },
        orderBy: { stakesCollectedAt: "desc" },
        take: 100,
    });

    return NextResponse.json({ matches: matches.map((match) => ({
        ...match,
        creator: { ...match.creator, avatar: avatarUrl(match.creator.id, match.creator.avatar) },
        acceptedBy: match.acceptedBy ? { ...match.acceptedBy, avatar: avatarUrl(match.acceptedBy.id, match.acceptedBy.avatar) } : null,
    })) });
}
