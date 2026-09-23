import { prisma } from "./prisma";

export async function settleMtnTransaction(transactionId: string, providerStatus: string) {
    const status = providerStatus.toUpperCase();
    if (status === "SUCCESSFUL" || status === "SUCCESS") {
        return prisma.$transaction(async (database) => {
            const pending = await database.walletTransaction.findFirst({ where: { id: transactionId, status: "PENDING" } });
            if (!pending) return database.walletTransaction.findUnique({ where: { id: transactionId } });
            await database.user.update({ where: { id: pending.userId }, data: { walletBalance: { increment: pending.amount } } });
            return database.walletTransaction.update({ where: { id: transactionId }, data: { status: "COMPLETED" } });
        });
    }
    if (["FAILED", "REJECTED", "CANCELLED"].includes(status)) {
        return prisma.walletTransaction.updateMany({ where: { id: transactionId, status: "PENDING" }, data: { status: "REJECTED" } });
    }
    return null;
}