import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { avatarUrl } from "../../../lib/object-storage";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const [matches, wins, recentMatches, wallet] = await Promise.all([
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, OR: [{ creatorId: user.id }, { acceptedById: user.id }] } }),
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, decision: { is: { winnerId: user.id } } } }),
        prisma.challenge.findMany({
            where: { status: "SETTLED", verified: true, OR: [{ creatorId: user.id }, { acceptedById: user.id }] },
            select: { decision: { select: { winnerId: true, decidedAt: true } } },
        }),
        prisma.wallet.upsert({
            where: { userId: user.id },
            update: {},
            create: { accountKey: `player:${user.id}`, userId: user.id, balance: 1000 },
            select: { balance: true },
        }),
    ]);
    const orderedMatches = recentMatches.sort((left, right) => (right.decision?.decidedAt?.getTime() ?? 0) - (left.decision?.decidedAt?.getTime() ?? 0));
    let currentStreak = 0;
    for (const match of orderedMatches) {
        if (match.decision?.winnerId !== user.id) break;
        currentStreak += 1;
    }
    return NextResponse.json({ user: {
        id: user.id,
        username: user.username,
        teamName: user.teamName,
        email: user.email,
        avatar: avatarUrl(user.id, user.avatar),
        isAdmin: user.isAdmin,
        bio: user.bio,
        gameTags: user.gameTags,
        country: user.country,
        totalWins: wins,
        totalMatches: matches,
        winRate: matches ? Number(((wins / matches) * 100).toFixed(1)) : 0,
        currentStreak,
        coinBalance: wallet.balance,
    } });
}
