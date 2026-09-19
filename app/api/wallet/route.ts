import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

const providers = new Set(["MTN", "AIRTEL"]);

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
        return NextResponse.json({ error: "Use a valid amount, Ugandan mobile number, and MTN or Airtel provider." }, { status: 400 });
    }
    if (body?.action === "withdraw" && amount > user.walletBalance) return NextResponse.json({ error: "Your wallet balance is too low for this withdrawal." }, { status: 400 });
    if (body?.action !== "deposit" && body?.action !== "withdraw") return NextResponse.json({ error: "Choose deposit or withdraw." }, { status: 400 });
    const transaction = await prisma.walletTransaction.create({ data: { userId: user.id, type: body.action.toUpperCase(), amount, phoneNumber, provider } });
    return NextResponse.json({ transaction, message: "Request recorded. Complete the mobile-money prompt, then an operator must confirm it." }, { status: 201 });
}