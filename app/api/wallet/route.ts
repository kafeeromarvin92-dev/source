import { NextResponse } from "next/server";
import { MtnMomoError, requestMtnPayment } from "../../lib/mtn-momo";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

const providers = new Set(["MTN"]);

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view your wallet." }, { status: 401 });
    const transactions = await prisma.walletTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({ balance: user.walletBalance, transactions });
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to use your wallet." }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string; amount?: number; phoneNumber?: string; provider?: string } | null;
    const amount = Number(body?.amount);
    const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const provider = typeof body?.provider === "string" ? body.provider.trim().toUpperCase() : "";
    if (!Number.isInteger(amount) || amount < 500 || amount > 1_000_000 || !/^\+?256\d{9}$/.test(phoneNumber) || !providers.has(provider)) {
        return NextResponse.json({ error: "Use a valid amount, Ugandan MTN number, and MTN provider." }, { status: 400 });
    }
    if (body?.action === "withdraw" && amount > user.walletBalance) return NextResponse.json({ error: "Your wallet balance is too low for this withdrawal." }, { status: 400 });
    if (body?.action !== "deposit" && body?.action !== "withdraw") return NextResponse.json({ error: "Choose deposit or withdraw." }, { status: 400 });
    const transaction = await prisma.walletTransaction.create({ data: { userId: user.id, type: body.action.toUpperCase(), amount, phoneNumber, provider } });
    if (body.action === "withdraw") return NextResponse.json({ transaction, message: "Withdrawal request recorded for admin review." }, { status: 201 });

    try {
        const payment = await requestMtnPayment({ reference: transaction.id, phoneNumber, amount, description: `Noble Gamers wallet deposit for ${user.username}` });
        const updatedTransaction = await prisma.walletTransaction.update({ where: { id: transaction.id }, data: { provider: "MTN_MOMO", providerRef: payment.providerReference } });
        return NextResponse.json({ transaction: updatedTransaction, message: "Payment request sent. Approve the MTN MoMo prompt to complete your deposit." }, { status: 201 });
    } catch (paymentError) {
        const providerMessage = paymentError instanceof Error ? paymentError.message.slice(0, 200) : "MTN_MOMO_REQUEST_FAILED";
        const providerStatus = paymentError instanceof MtnMomoError ? paymentError.status : null;
        console.error("MTN MoMo payment request failed", { transactionId: transaction.id, status: providerStatus, message: providerMessage });
        await prisma.walletTransaction.update({ where: { id: transaction.id }, data: { status: "REJECTED", providerRef: providerMessage } });
        if (paymentError instanceof Error && paymentError.message === "MTN_MOMO_NOT_CONFIGURED") return NextResponse.json({ error: "MTN MoMo is not configured. Add MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, and MTN_MOMO_API_KEY." }, { status: 503 });
        return NextResponse.json({ error: `MTN rejected the request${providerStatus ? ` (HTTP ${providerStatus})` : ""}: ${providerMessage}` }, { status: 502 });
    }
}