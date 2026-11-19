import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl, evidenceUrl } from "../../../lib/object-storage";

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const reviews = await prisma.challenge.findMany({
        where: { status: "DISPUTED" },
        include: {
            creator: { select: { id: true, username: true, teamName: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true } },
            submissions: { include: { player: { select: { id: true, username: true, teamName: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
            decision: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ reviews: reviews.filter((review) => review.submissions.length >= 2).map((review) => ({ ...review, submissions: review.submissions.map((submission) => ({ ...submission, image: evidenceUrl(submission.id), player: { ...submission.player, avatar: avatarUrl(submission.player.id, submission.player.avatar) } })) })) });
}
