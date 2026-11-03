import { NextResponse } from "next/server";
import { runAiReview, settleChallenge } from "../../../../lib/adjudication";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view this match review." }, { status: 401 });
    const { id } = await context.params;
    const challenge = await prisma.challenge.findUnique({ where: { id }, select: { creatorId: true, acceptedById: true } });
    if (!challenge || (challenge.creatorId !== user.id && challenge.acceptedById !== user.id)) {
        return NextResponse.json({ error: "Only players in this match can view its review." }, { status: 403 });
    }
    const review = await prisma.matchDecision.findUnique({ where: { challengeId: id }, include: { winner: true } });
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    return NextResponse.json({
        review: {
            id: review.id,
            challengeId: review.challengeId,
            status: review.status,
            winnerId: review.winnerId,
            winner: review.winner ? {
                id: review.winner.id,
                username: review.winner.username,
                teamName: review.winner.teamName,
                avatar: review.winner.avatar,
            } : null,
            confidence: review.confidence,
            reasoning: review.reasoning,
            creatorScore: review.creatorScore,
            acceptedByScore: review.acceptedByScore,
            decidedAt: review.decidedAt,
        },
    });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: string; winnerId?: string } | null;
    if (body?.action === "analyze") {
        const user = await getCurrentUser();
        const challenge = await prisma.challenge.findUnique({ where: { id }, select: { creatorId: true, acceptedById: true } });
        if (!user || !challenge || (challenge.creatorId !== user.id && challenge.acceptedById !== user.id)) {
            return NextResponse.json({ error: "Only players in this match can request a review." }, { status: 403 });
        }
        const result = await runAiReview(id);
        return NextResponse.json({ result, message: result ? "AI review completed." : "Two readable submissions and AI configuration are required." });
    }
    if (body?.action === "admin-decide") {
        const admin = await getCurrentUser();
        if (!admin?.isAdmin || !body.winnerId) return NextResponse.json({ error: "Admin session and winner are required." }, { status: 403 });
        const result = await settleChallenge(id, body.winnerId, admin.id);
        if (!result) return NextResponse.json({ error: "Could not settle this match." }, { status: 409 });
        return NextResponse.json({ result });
    }
    return NextResponse.json({ error: "Unknown review action." }, { status: 400 });
}