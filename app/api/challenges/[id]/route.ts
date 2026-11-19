import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

type RouteContext = { params: Promise<{ id: string }> };
const publicUserSelect = { id: true, username: true, teamName: true, avatar: true } as const;
const activeStatuses: ("OPEN" | "ACCEPTED" | "REVIEW" | "DISPUTED")[] = ["OPEN", "ACCEPTED", "REVIEW", "DISPUTED"];

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const challenge = await prisma.challenge.findUnique({ where: { id }, include: { creator: { select: publicUserSelect }, acceptedBy: { select: publicUserSelect }, decision: true } });
    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    return NextResponse.json({ challenge: { ...challenge, creator: { ...challenge.creator, avatar: avatarUrl(challenge.creator.id, challenge.creator.avatar) }, acceptedBy: challenge.acceptedBy ? { ...challenge.acceptedBy, avatar: avatarUrl(challenge.acceptedBy.id, challenge.acceptedBy.avatar) } : null, status: challenge.status.toLowerCase(), isPrivate: true } });
}

export async function PATCH(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before accepting a challenge." }, { status: 401 });
    try {
        const accepted = await prisma.$transaction(async (transaction) => {
            const challenge = await transaction.challenge.findUnique({ where: { id } });
            if (!challenge || challenge.status !== "OPEN" || challenge.creatorId === user.id) throw new Error("NOT_AVAILABLE");
            const active = await transaction.challenge.findFirst({ where: { status: { in: activeStatuses }, OR: [{ creatorId: user.id }, { acceptedById: user.id }], NOT: { id } }, select: { id: true } });
            if (active) throw new Error("PLAYER_BUSY");
            const updated = await transaction.challenge.updateMany({ where: { id, status: "OPEN", acceptedById: null }, data: { status: "ACCEPTED", acceptedById: user.id } });
            if (updated.count !== 1) throw new Error("NOT_AVAILABLE");
            await transaction.matchDecision.create({ data: { challengeId: id } });
            return transaction.challenge.findUnique({ where: { id }, include: { creator: { select: publicUserSelect }, acceptedBy: { select: publicUserSelect } } });
        });
        return NextResponse.json({ challenge: accepted ? { ...accepted, creator: { ...accepted.creator, avatar: avatarUrl(accepted.creator.id, accepted.creator.avatar) }, acceptedBy: accepted.acceptedBy ? { ...accepted.acceptedBy, avatar: avatarUrl(accepted.acceptedBy.id, accepted.acceptedBy.avatar) } : null, status: "accepted", isPrivate: true } : null });
    } catch (error) {
        if (error instanceof Error && error.message === "PLAYER_BUSY") return NextResponse.json({ error: "You already have an active match. Finish or cancel it before accepting another.", code: "PLAYER_BUSY" }, { status: 409 });
        if (error instanceof Error && error.message === "NOT_AVAILABLE") return NextResponse.json({ error: "Challenge is no longer available." }, { status: 409 });
        throw error;
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before cancelling a challenge." }, { status: 401 });
    const cancelled = await prisma.challenge.updateMany({ where: { id, creatorId: user.id, status: "OPEN" }, data: { status: "CANCELLED" } });
    if (cancelled.count !== 1) return NextResponse.json({ error: "Only an open challenge can be cancelled." }, { status: 409 });
    return NextResponse.json({ message: "Challenge cancelled." });
}
