import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

async function requireAdmin() {
    const admin = await getCurrentUser();
    if (!admin?.isAdmin) return null;
    return admin;
}

export async function GET() {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const transactions = await prisma.walletTransaction.findMany({ where: { status: "PENDING" }, include: { user: { select: { id: true, username: true, email: true, walletBalance: true } } }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const body = await request.json().catch(() => null) as { transactionId?: string; action?: string; providerRef?: string } | null;
    if (!body?.transactionId || !["approve", "reject"].includes(body.action || "")) return NextResponse.json({ error: "Transaction and approve/reject action are required." }, { status: 400 });

    try {
        const transaction = await prisma.$transaction(async (database) => {
            const walletTransaction = await database.walletTransaction.findUnique({ where: { id: body.transactionId } });
            if (!walletTransaction || walletTransaction.status !== "PENDING") throw new Error("NOT_PENDING");
            const status = body.action === "approve" ? "COMPLETED" : "REJECTED";
            if (status === "COMPLETED") {
                const balanceChange = walletTransaction.type === "DEPOSIT" ? walletTransaction.amount : -walletTransaction.amount;
                const account = await database.user.findUnique({ where: { id: walletTransaction.userId } });
                if (!account || (balanceChange < 0 && account.walletBalance < walletTransaction.amount)) throw new Error("INSUFFICIENT_BALANCE");
                await database.user.update({ where: { id: walletTransaction.userId }, data: { walletBalance: { increment: balanceChange } } });
            }
            return database.walletTransaction.update({ where: { id: walletTransaction.id }, data: { status, providerRef: body.providerRef?.trim() || null } });
        });
        return NextResponse.json({ transaction });
    } catch (error) {
        if (error instanceof Error && error.message === "NOT_PENDING") return NextResponse.json({ error: "This wallet request has already been processed." }, { status: 409 });
        if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") return NextResponse.json({ error: "The user no longer has enough balance for this withdrawal." }, { status: 409 });
        throw error;
    }
}