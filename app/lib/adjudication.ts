import { prisma } from "./prisma";
import { calculateMatchEconomy, isEntryStake } from "./coin-rules";
import { getAdminReviewAvailability } from "./review-window";

type AdminResolution = { kind: "ADMIN"; adminId: string; winnerId: string | null };
type PlayerResolution = { kind: "PLAYER"; confirmerId: string; winnerId: string };
type Resolution = AdminResolution | PlayerResolution;

async function finalizeChallenge(challengeId: string, resolution: Resolution) {
    return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "Challenge" WHERE "id" = ${challengeId} FOR UPDATE`;
        const challenge = await transaction.challenge.findUnique({
            where: { id: challengeId },
            include: {
                decision: true,
                acceptedBy: true,
                submissions: { orderBy: { createdAt: "desc" } },
            },
        });
        if (!challenge || !challenge.acceptedBy || !challenge.acceptedById || !challenge.decision) return null;
        if (!["REVIEW", "DISPUTED"].includes(challenge.status)) return null;

        if (resolution.kind === "PLAYER") {
            const onlySubmission = challenge.submissions[0];
            if (
                challenge.status !== "REVIEW" ||
                challenge.submissions.length !== 1 ||
                onlySubmission.playerId === resolution.confirmerId ||
                ![challenge.creatorId, challenge.acceptedById].includes(resolution.winnerId)
            ) return null;
        } else {
            const availability = getAdminReviewAvailability(
                challenge.status,
                challenge.submissions.length,
                challenge.submissions[0]?.createdAt,
            );
            if (!availability.eligible || (!resolution.winnerId && challenge.submissions.length === 0)) return null;
            if (resolution.winnerId && ![challenge.creatorId, challenge.acceptedById].includes(resolution.winnerId)) return null;
        }

        const settledAt = new Date();
        const settlement = await transaction.challenge.updateMany({
            where: { id: challengeId, status: challenge.status },
            data: { status: "SETTLED", verified: true, matchCode: null },
        });
        if (settlement.count !== 1) return null;

        let payout = 0;
        let houseFee = 0;
        if (challenge.stakesCollectedAt) {
            if (resolution.winnerId) {
                if (!isEntryStake(challenge.entryStake)) throw new Error("Challenge entry stake is invalid.");
                const economy = calculateMatchEconomy(challenge.entryStake);
                payout = economy.winnerPayout;
                houseFee = economy.houseFee;
                const winnerWallet = await transaction.wallet.findUniqueOrThrow({ where: { userId: resolution.winnerId } });
                const houseWallet = await transaction.wallet.findUniqueOrThrow({ where: { accountKey: "house:treasury" } });
                await transaction.wallet.update({ where: { id: winnerWallet.id }, data: { balance: { increment: payout } } });
                await transaction.wallet.update({ where: { id: houseWallet.id }, data: { balance: { increment: houseFee } } });
                await transaction.coinTransaction.createMany({ data: [
                    { walletId: winnerWallet.id, challengeId, type: "MATCH_PAYOUT", amount: payout, referenceKey: `match:${challengeId}:payout:${resolution.winnerId}`, note: "Winner's match payout" },
                    { walletId: houseWallet.id, challengeId, type: "HOUSE_FEE", amount: houseFee, referenceKey: `match:${challengeId}:house-fee`, note: "10% house fee" },
                ] });
            } else {
                const players = [challenge.creatorId, challenge.acceptedById];
                const wallets = await transaction.wallet.findMany({ where: { userId: { in: players } } });
                if (wallets.length !== 2) throw new Error("Both match wallets are required to refund a draw.");
                await transaction.wallet.updateMany({ where: { userId: { in: players } }, data: { balance: { increment: challenge.entryStake } } });
                await transaction.coinTransaction.createMany({ data: wallets.map((wallet) => ({
                    walletId: wallet.id,
                    challengeId,
                    type: "MATCH_REFUND" as const,
                    amount: challenge.entryStake,
                    referenceKey: `match:${challengeId}:refund:${wallet.userId}`,
                    note: "Match draw or cancellation refund",
                })) });
            }
        }

        await transaction.matchDecision.update({
            where: { challengeId },
            data: {
                status: "SETTLED",
                winnerId: resolution.winnerId,
                decidedAt: settledAt,
                decidedById: resolution.kind === "ADMIN" ? resolution.adminId : null,
                confirmedById: resolution.kind === "PLAYER" ? resolution.confirmerId : null,
                confirmedAt: resolution.kind === "PLAYER" ? settledAt : null,
                reasoning: resolution.kind === "ADMIN" && !resolution.winnerId ? "Refunded as a draw or canceled match." : challenge.decision.reasoning,
            },
        });

        const resultMessage = resolution.winnerId
            ? resolution.kind === "PLAYER"
                ? "Both players confirmed the result. Your verified record and points are updated."
                : "An admin reviewed the match and recorded the final result and points."
            : "The match was ruled a draw or canceled. Both entry stakes were refunded.";
        await transaction.notification.createMany({ data: [challenge.creatorId, challenge.acceptedById].map((userId) => ({
            userId,
            title: resolution.winnerId ? "Match result settled" : "Match refunded",
            message: resultMessage,
            kind: "RESULT",
        })) });

        return { challengeId, winnerId: resolution.winnerId, payout, houseFee };
    });
}

export async function settleChallenge(challengeId: string, winnerId: string, adminId: string) {
    return finalizeChallenge(challengeId, { kind: "ADMIN", winnerId, adminId });
}

export async function refundChallenge(challengeId: string, adminId: string) {
    return finalizeChallenge(challengeId, { kind: "ADMIN", winnerId: null, adminId });
}

export async function confirmChallengeResult(challengeId: string, winnerId: string, confirmerId: string) {
    return finalizeChallenge(challengeId, { kind: "PLAYER", winnerId, confirmerId });
}
