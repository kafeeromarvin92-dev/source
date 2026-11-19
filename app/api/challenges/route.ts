import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { avatarUrl } from "../../lib/object-storage";

const userSelect = { id: true, username: true, teamName: true, avatar: true } as const;

export async function GET(request: Request) {
    const user = await getCurrentUser();
    const requestUrl = new URL(request.url);
    const mine = requestUrl.searchParams.get("mine") === "true";
    if (mine && !user) return NextResponse.json({ error: "Log in to view your matches." }, { status: 401 });
    const challenges = await prisma.challenge.findMany({
        where: mine ? { OR: [{ creatorId: user!.id }, { acceptedById: user!.id }] } : { status: "OPEN" },
        include: { creator: { select: userSelect }, acceptedBy: { select: userSelect }, decision: true },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ challenges: challenges.map((challenge) => ({ ...challenge, creator: { ...challenge.creator, avatar: avatarUrl(challenge.creator.id, challenge.creator.avatar) }, acceptedBy: challenge.acceptedBy ? { ...challenge.acceptedBy, avatar: avatarUrl(challenge.acceptedBy.id, challenge.acceptedBy.avatar) } : null, status: challenge.status.toLowerCase(), isPrivate: true })) });
}

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before creating a challenge." }, { status: 401 });
    try {
        const challenge = await prisma.$transaction(async (transaction) => {
        const active = await transaction.challenge.findFirst({ where: { status: { in: ["OPEN", "ACCEPTED", "REVIEW", "DISPUTED"] }, OR: [{ creatorId: user.id }, { acceptedById: user.id }] }, select: { id: true } });
        if (active) throw new Error("PLAYER_BUSY");
        const createdChallenge = await transaction.challenge.create({
            data: { creatorId: user.id },
            include: { creator: { select: userSelect } },
        });
        return createdChallenge;
        });
        return NextResponse.json({ challenge: { ...challenge, creator: { ...challenge.creator, avatar: avatarUrl(challenge.creator.id, challenge.creator.avatar) }, status: "open", isPrivate: true } }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === "PLAYER_BUSY") return NextResponse.json({ error: "You already have an active match. Open it from Matches before starting another.", code: "PLAYER_BUSY" }, { status: 409 });
        throw error;
    }
}
