import { NextResponse } from "next/server";
import { getMtnPaymentStatus, MtnMomoError } from "../../../../lib/mtn-momo";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { settleMtnTransaction } from "../../../../lib/mtn-settlement";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to check your payment." }, { status: 401 });
    const { id } = await context.params;
    const transaction = await prisma.walletTransaction.findFirst({ where: { id, userId: user.id } });
    if (!transaction) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    if (transaction.status !== "PENDING" || !transaction.providerRef) return NextResponse.json({ transaction });

    try {
        const payment = await getMtnPaymentStatus(transaction.providerRef);
        if (payment.status === "SUCCESSFUL") {
            const completed = await settleMtnTransaction(id, payment.status);
            return NextResponse.json({ transaction: completed });
        }
        if (payment.status === "FAILED" || payment.status === "REJECTED") {
            const updated = await prisma.walletTransaction.updateMany({ where: { id, userId: user.id, status: "PENDING" }, data: { status: "REJECTED" } });
            if (updated.count > 0) return NextResponse.json({ transaction: { ...transaction, status: "REJECTED" } });
        }
        return NextResponse.json({ transaction: { ...transaction, status: payment.status === "PENDING" ? "PENDING" : payment.status } });
    } catch (error) {
        const status = error instanceof MtnMomoError ? error.status : null;
        console.error("MTN MoMo status check failed", { transactionId: id, status });
        return NextResponse.json({ error: "Could not check the MTN payment status yet." }, { status: 502 });
    }
}