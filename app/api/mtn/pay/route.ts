import { NextResponse } from "next/server";
import { MtnMomoError, requestMtnPayment } from "../../../lib/mtn-momo";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Log in to make a payment." }, { status: 401 });
        const body = await request.json() as { phone?: string; amount?: number; studentId?: string };
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        const amount = Number(body.amount);
        if (!Number.isInteger(amount) || amount < 500 || !/^\+?256\d{9}$/.test(phone)) {
            return NextResponse.json({ error: "Use a valid amount and Ugandan MTN number." }, { status: 400 });
        }
        const transaction = await prisma.walletTransaction.create({
            data: { userId: user.id, type: "DEPOSIT", amount, phoneNumber: phone, provider: "MTN_MOMO" },
        });
        const payment = await requestMtnPayment({
            reference: transaction.id,
            phoneNumber: phone,
            amount,
            description: "Noble school fees payment",
        });
        const updatedTransaction = await prisma.walletTransaction.update({ where: { id: transaction.id }, data: { providerRef: payment.providerReference } });
        return NextResponse.json({ success: true, referenceId: payment.providerReference, transaction: updatedTransaction, message: "Payment request sent. Check the phone to approve." }, { status: 201 });
    } catch (error) {
        const status = error instanceof MtnMomoError ? error.status : 500;
        return NextResponse.json({ error: error instanceof Error ? error.message : "MTN payment request failed." }, { status });
    }
}