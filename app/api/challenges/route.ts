import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { CHALLENGE_ENTRY_FEE } from "../../lib/economy";

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
    return NextResponse.json({ challenges: challenges.map((challenge: Prisma.ChallengeGetPayload<{ include: { creator: { select: typeof userSelect }; acceptedBy: { select: typeof userSelect }; decision: true } }>) => ({ ...challenge, stakeAmount: CHALLENGE_ENTRY_FEE, status: challenge.status.toLowerCase(), isPrivate: true, creator: challenge.creator, acceptedBy: challenge.acceptedBy })) });
}

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before creating a challenge." }, { status: 401 });
    const challenge = await prisma.$transaction(async (transaction) => {
        const deduction = await transaction.user.updateMany({
            where: { id: user.id, nobleCoins: { gte: CHALLENGE_ENTRY_FEE } },
            data: { nobleCoins: { decrement: CHALLENGE_ENTRY_FEE } },
        });
        if (deduction.count !== 1) throw new Error("INSUFFICIENT_COINS");
        const createdChallenge = await transaction.challenge.create({
            data: { stakeAmount: CHALLENGE_ENTRY_FEE, entryFeeCoins: CHALLENGE_ENTRY_FEE, creatorId: user.id },
            include: { creator: { select: userSelect } },
        });
        await transaction.ledgerEntry.create({ data: { challengeId: createdChallenge.id, userId: user.id, amount: -CHALLENGE_ENTRY_FEE, type: "COIN_ENTRY" } });
        return createdChallenge;
    }).catch((createError: unknown) => {
        if (createError instanceof Error && createError.message === "INSUFFICIENT_COINS") return null;
        throw createError;
    });
    if (!challenge) return NextResponse.json({ error: `You need at least ${CHALLENGE_ENTRY_FEE} Noble Coins to create a challenge.` }, { status: 402 });

    return NextResponse.json({ challenge: { ...challenge, status: "open", isPrivate: true } }, { status: 201 });
}