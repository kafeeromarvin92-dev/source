import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { avatarUrl } from "../../../lib/object-storage";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const [matches, wins] = await Promise.all([
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, OR: [{ creatorId: user.id }, { acceptedById: user.id }] } }),
        prisma.challenge.count({ where: { status: "SETTLED", verified: true, decision: { is: { winnerId: user.id } } } }),
    ]);
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
    } });
}
