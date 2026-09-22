import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    const [matches, wins, earnings] = await Promise.all([
        prisma.challenge.count({ where: { status: "SETTLED", OR: [{ creatorId: user.id }, { acceptedById: user.id }] } }),
        prisma.matchDecision.count({ where: { status: { in: ["SETTLED", "ADMIN_DECIDED"] }, winnerId: user.id } }),
        prisma.ledgerEntry.aggregate({ where: { userId: user.id, type: "WINNER_PAYOUT" }, _sum: { amount: true } }),
    ]);
    return NextResponse.json({ user: {
        id: user.id,
        username: user.username,
        teamName: user.teamName,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        walletBalance: user.walletBalance,
        totalWins: wins,
        totalMatches: matches,
        totalEarnings: earnings._sum.amount || 0,
        winRate: matches ? Number(((wins / matches) * 100).toFixed(1)) : 0,
    } });
}