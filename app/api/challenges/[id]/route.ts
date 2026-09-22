import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const challenge = await prisma.challenge.findUnique({ where: { id }, include: { creator: true, acceptedBy: true, decision: true } });

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    return NextResponse.json({ challenge: { ...challenge, status: challenge.status.toLowerCase(), isPrivate: true } });
}

export async function PATCH(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before accepting a challenge." }, { status: 401 });
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge || challenge.status !== "OPEN" || challenge.creatorId === user.id) return NextResponse.json({ error: "Challenge is no longer available." }, { status: 409 });
    let acceptedChallenge: Awaited<ReturnType<typeof prisma.challenge.update>> | null;
    try {
        acceptedChallenge = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        const [creator, accepter] = await Promise.all([
            transaction.user.findUnique({ where: { id: challenge.creatorId } }),
            transaction.user.findUnique({ where: { id: user.id } }),
        ]);
        if (!creator || !accepter || creator.walletBalance < challenge.stakeAmount || accepter.walletBalance < challenge.stakeAmount) throw new Error("INSUFFICIENT_STAKE");
        await transaction.user.update({ where: { id: creator.id }, data: { walletBalance: { decrement: challenge.stakeAmount } } });
        await transaction.user.update({ where: { id: accepter.id }, data: { walletBalance: { decrement: challenge.stakeAmount } } });
        const updated = await transaction.challenge.update({ where: { id }, data: { status: "ACCEPTED", acceptedById: user.id }, include: { creator: true, acceptedBy: true } });
        await transaction.matchDecision.create({ data: { challengeId: id } });
        await transaction.ledgerEntry.createMany({ data: [
            { challengeId: id, userId: creator.id, amount: -challenge.stakeAmount, type: "STAKE_LOCK" },
            { challengeId: id, userId: accepter.id, amount: -challenge.stakeAmount, type: "STAKE_LOCK" },
        ] });
        return updated;
        });
    } catch (acceptError) {
        if (acceptError instanceof Error && acceptError.message === "INSUFFICIENT_STAKE") return NextResponse.json({ error: "Both players need enough wallet balance for this stake." }, { status: 402 });
        throw acceptError;
    }

    return NextResponse.json({ challenge: { ...acceptedChallenge, status: "accepted", isPrivate: true } });
}