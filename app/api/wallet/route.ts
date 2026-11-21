import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view your wallet." }, { status: 401 });
    const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: user.id },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    return NextResponse.json({
        wallet: {
            balance: wallet.balance,
            transactions: wallet.transactions.map(({ id, type, amount, note, createdAt }) => ({ id, type, amount, note, createdAt })),
        },
    });
}
