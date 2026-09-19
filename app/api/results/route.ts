import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
    const results = await prisma.challenge.findMany({
        where: { status: "SETTLED", decision: { isNot: null } },
        include: {
            creator: { select: { id: true, username: true, teamName: true, avatar: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true } },
            decision: { select: { winnerId: true, creatorScore: true, acceptedByScore: true, confidence: true, reasoning: true, decidedAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return NextResponse.json({ results });
}