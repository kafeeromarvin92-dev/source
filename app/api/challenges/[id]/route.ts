import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { CHALLENGE_ENTRY_FEE } from "../../../lib/economy";

type RouteContext = { params: Promise<{ id: string }> };
const publicUserSelect = { id: true, username: true, teamName: true, avatar: true } as const;

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const challenge = await prisma.challenge.findUnique({ where: { id }, include: { creator: { select: publicUserSelect }, acceptedBy: { select: publicUserSelect }, decision: true } });

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    return NextResponse.json({ challenge: { ...challenge, stakeAmount: CHALLENGE_ENTRY_FEE, status: challenge.status.toLowerCase(), isPrivate: true } });
}

export async function PATCH(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before accepting a challenge." }, { status: 401 });
    let acceptedChallenge: Awaited<ReturnType<typeof prisma.challenge.update>> | null;
    try {
        acceptedChallenge = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        const challenge = await transaction.challenge.findUnique({ where: { id } });
        if (!challenge || challenge.status !== "OPEN" || challenge.creatorId === user.id) throw new Error("NOT_AVAILABLE");
        if (challenge.entryFeeCoins !== 0 && challenge.entryFeeCoins !== CHALLENGE_ENTRY_FEE) throw new Error("INVALID_ENTRY_FEE");

        const creator = await transaction.user.findUnique({ where: { id: challenge.creatorId } });
        const accepter = await transaction.user.findUnique({ where: { id: user.id } });
        if (!creator || !accepter || accepter.nobleCoins < CHALLENGE_ENTRY_FEE || (challenge.entryFeeCoins === 0 && creator.nobleCoins < CHALLENGE_ENTRY_FEE)) throw new Error("INSUFFICIENT_COINS");
        if (challenge.entryFeeCoins === 0) {
            const creatorDeduction = await transaction.user.updateMany({
                where: { id: creator.id, nobleCoins: { gte: CHALLENGE_ENTRY_FEE } },
                data: { nobleCoins: { decrement: CHALLENGE_ENTRY_FEE } },
            });
            if (creatorDeduction.count !== 1) throw new Error("INSUFFICIENT_COINS");
            await transaction.ledgerEntry.create({ data: { challengeId: id, userId: creator.id, amount: -CHALLENGE_ENTRY_FEE, type: "COIN_ENTRY" } });
        }
        const accepterDeduction = await transaction.user.updateMany({
            where: { id: accepter.id, nobleCoins: { gte: CHALLENGE_ENTRY_FEE } },
            data: { nobleCoins: { decrement: CHALLENGE_ENTRY_FEE } },
        });
        if (accepterDeduction.count !== 1) throw new Error("INSUFFICIENT_COINS");
        const accepted = await transaction.challenge.updateMany({
            where: { id, status: "OPEN", acceptedById: null },
            data: { status: "ACCEPTED", acceptedById: user.id, entryFeeCoins: CHALLENGE_ENTRY_FEE, stakeAmount: CHALLENGE_ENTRY_FEE },
        });
        if (accepted.count !== 1) throw new Error("NOT_AVAILABLE");
        const updated = await transaction.challenge.findUnique({ where: { id }, include: { creator: { select: publicUserSelect }, acceptedBy: { select: publicUserSelect } } });
        if (!updated) throw new Error("NOT_AVAILABLE");
        await transaction.matchDecision.create({ data: { challengeId: id } });
        await transaction.ledgerEntry.create({ data: { challengeId: id, userId: accepter.id, amount: -CHALLENGE_ENTRY_FEE, type: "COIN_ENTRY" } });
        return updated;
        });
    } catch (acceptError) {
        if (acceptError instanceof Error && acceptError.message === "INSUFFICIENT_COINS") return NextResponse.json({ error: `Both players need ${CHALLENGE_ENTRY_FEE} Noble Coins to play.` }, { status: 402 });
        if (acceptError instanceof Error && acceptError.message === "NOT_AVAILABLE") return NextResponse.json({ error: "Challenge is no longer available." }, { status: 409 });
        if (acceptError instanceof Error && acceptError.message === "INVALID_ENTRY_FEE") return NextResponse.json({ error: "This challenge has an invalid entry fee." }, { status: 409 });
        throw acceptError;
    }

    return NextResponse.json({ challenge: { ...acceptedChallenge, status: "accepted", isPrivate: true } });
}

export async function DELETE(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in before cancelling a challenge." }, { status: 401 });

    let refundedCoins = 0;
    try {
        refundedCoins = await prisma.$transaction(async (transaction) => {
            const challenge = await transaction.challenge.findUnique({ where: { id } });
            if (!challenge || challenge.creatorId !== user.id || challenge.status !== "OPEN") throw new Error("NOT_CANCELLABLE");
            const cancelled = await transaction.challenge.updateMany({ where: { id, creatorId: user.id, status: "OPEN" }, data: { status: "CANCELLED" } });
            if (cancelled.count !== 1) throw new Error("NOT_CANCELLABLE");
            if (challenge.entryFeeCoins > 0) {
                await transaction.user.update({ where: { id: user.id }, data: { nobleCoins: { increment: challenge.entryFeeCoins } } });
                await transaction.ledgerEntry.create({ data: { challengeId: id, userId: user.id, amount: challenge.entryFeeCoins, type: "COIN_REFUND" } });
            }
            return challenge.entryFeeCoins;
        });
    } catch (cancelError) {
        if (cancelError instanceof Error && cancelError.message === "NOT_CANCELLABLE") return NextResponse.json({ error: "Only the creator can cancel an open challenge." }, { status: 409 });
        throw cancelError;
    }

    return NextResponse.json({ message: refundedCoins > 0 ? "Challenge cancelled and entry fee refunded." : "Challenge cancelled." });
}