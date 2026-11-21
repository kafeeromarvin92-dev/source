import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { avatarUrl } from "../../lib/object-storage";

export async function GET() {
    const results = await prisma.challenge.findMany({
        where: { status: "SETTLED", verified: true, decision: { isNot: null } },
        include: {
            creator: { select: { id: true, username: true, teamName: true, avatar: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true } },
            decision: { select: { winnerId: true, creatorScore: true, acceptedByScore: true, confidence: true, reasoning: true, decidedAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return NextResponse.json({ results: results.map((result) => ({ ...result, creator: result.creator ? { ...result.creator, avatar: avatarUrl(result.creator.id, result.creator.avatar) } : null, acceptedBy: result.acceptedBy ? { ...result.acceptedBy, avatar: avatarUrl(result.acceptedBy.id, result.acceptedBy.avatar) } : null })) });
}
