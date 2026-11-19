import { prisma } from "./prisma";

export async function settleChallenge(challengeId: string, winnerId: string, adminId: string) {
    return prisma.$transaction(async (transaction) => {
        const challenge = await transaction.challenge.findUnique({ where: { id: challengeId }, include: { decision: true, creator: true, acceptedBy: true } });
        if (!challenge || !challenge.acceptedBy || challenge.status === "SETTLED" || challenge.status === "CANCELLED") return null;
        if (winnerId !== challenge.creatorId && winnerId !== challenge.acceptedById) return null;
        const settlement = await transaction.challenge.updateMany({ where: { id: challengeId, status: { in: ["ACCEPTED", "REVIEW", "DISPUTED"] } }, data: { status: "SETTLED", verified: true } });
        if (settlement.count !== 1) return null;
        await transaction.matchDecision.update({ where: { challengeId }, data: { status: "SETTLED", winnerId, decidedById: adminId, decidedAt: new Date() } });
        await transaction.notification.createMany({ data: [
            { userId: challenge.creatorId, title: "Match result decided", message: "An admin has reviewed your match and recorded the final result.", kind: "RESULT" },
            { userId: challenge.acceptedById, title: "Match result decided", message: "An admin has reviewed your match and recorded the final result.", kind: "RESULT" },
        ] });
        return transaction.challenge.findUnique({ where: { id: challengeId } });
    });
}
