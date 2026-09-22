import { NextResponse } from "next/server";
import { runAiReview, settleChallenge } from "../../../../lib/adjudication";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const review = await prisma.matchDecision.findUnique({ where: { challengeId: id }, include: { winner: true } });
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    return NextResponse.json({ review });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: string; winnerId?: string } | null;
    if (body?.action === "analyze") {
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