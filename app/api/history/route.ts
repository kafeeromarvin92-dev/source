import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { avatarUrl, evidenceUrl } from "../../lib/object-storage";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view history." }, { status: 401 });
    const matches = await prisma.challenge.findMany({
        where: { OR: [{ creatorId: user.id }, { acceptedById: user.id }] },
        include: {
            creator: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
            decision: true,
            submissions: { select: { id: true, playerId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    return NextResponse.json({ matches: matches.map((match) => ({
        ...match,
        creator: { ...match.creator, avatar: avatarUrl(match.creator.id, match.creator.avatar) },
        acceptedBy: match.acceptedBy ? { ...match.acceptedBy, avatar: avatarUrl(match.acceptedBy.id, match.acceptedBy.avatar) } : null,
        submissions: match.submissions.map((submission) => ({ ...submission, image: evidenceUrl(submission.id) })),
    })) });
}
