import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    const [matches, wins] = await Promise.all([
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, OR: [{ creatorId: user.id }, { acceptedById: user.id }] } }),
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, decision: { is: { winnerId: user.id } } } }),
    ]);
    return NextResponse.json({ user: {
        id: user.id,
        username: user.username,
        teamName: user.teamName,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        nobleCoins: user.nobleCoins,
        totalWins: wins,
        totalMatches: matches,
        winRate: matches ? Number(((wins / matches) * 100).toFixed(1)) : 0,
    } });
}