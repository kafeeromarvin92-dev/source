import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

const userSelect = { id: true, username: true, teamName: true, email: true, avatar: true, walletBalance: true } as const;

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
    return NextResponse.json({ challenges: challenges.map((challenge: Prisma.ChallengeGetPayload<{ include: { creator: { select: typeof userSelect }; acceptedBy: { select: typeof userSelect }; decision: true } }>) => ({ ...challenge, status: challenge.status.toLowerCase(), isPrivate: true, creator: challenge.creator, acceptedBy: challenge.acceptedBy })) });
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before creating a challenge." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const stakeAmount = Number(body?.stakeAmount);

    if (![500, 1000, 2000, 5000].includes(stakeAmount)) {
        return NextResponse.json({ error: "Choose a valid stake amount." }, { status: 400 });
    }

    const challenge = await prisma.challenge.create({ data: { stakeAmount, creatorId: user.id }, include: { creator: { select: userSelect } } });

    return NextResponse.json({ challenge: { ...challenge, status: "open", isPrivate: true } }, { status: 201 });
}