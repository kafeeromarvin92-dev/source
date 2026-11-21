import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl, evidenceUrl } from "../../../lib/object-storage";

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const reviews = await prisma.challenge.findMany({
        where: { status: { in: ["REVIEW", "DISPUTED", "SETTLED"] } },
        include: {
            creator: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
            submissions: { include: { player: { select: { id: true, username: true, teamName: true, avatar: true, country: true } } }, orderBy: { createdAt: "asc" } },
            objections: { include: { player: { select: { id: true, username: true, teamName: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
            decision: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json({ reviews: reviews.map((review) => ({
        ...review,
        creator: { ...review.creator, avatar: avatarUrl(review.creator.id, review.creator.avatar) },
        acceptedBy: review.acceptedBy ? { ...review.acceptedBy, avatar: avatarUrl(review.acceptedBy.id, review.acceptedBy.avatar) } : null,
        submissions: review.submissions.map((submission) => ({ ...submission, image: evidenceUrl(submission.id), player: { ...submission.player, avatar: avatarUrl(submission.player.id, submission.player.avatar) } })),
        objections: review.objections.map((objection) => ({ ...objection, player: { ...objection.player, avatar: avatarUrl(objection.player.id, objection.player.avatar) } })),
    })) });
}
