import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const viewer = await getCurrentUser();
    if (!viewer) return NextResponse.json({ error: "Log in to view player profiles." }, { status: 401 });
    const { id } = await context.params;
    const isSelf = viewer.id === id;
    const friendship = isSelf ? null : await prisma.friendRequest.findFirst({
        where: {
            status: "ACCEPTED",
            OR: [
                { requesterId: viewer.id, recipientId: id },
                { requesterId: id, recipientId: viewer.id },
            ],
        },
    });
    if (!isSelf && !friendship) return NextResponse.json({ error: "Full profiles are visible to accepted friends only." }, { status: 403 });

    const player = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, teamName: true, avatar: true, email: true, bio: true, gameTags: true, country: true },
    });
    if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

    const [matches, wins] = await Promise.all([
        prisma.challenge.count({
            where: { status: "SETTLED", verified: true, OR: [{ creatorId: id }, { acceptedById: id }] },
        }),
        prisma.challenge.count({
            where: { status: "SETTLED", verified: true, decision: { is: { winnerId: id } } },
        }),
    ]);

    return NextResponse.json({
        profile: {
            id: player.id,
            username: player.username,
            teamName: player.teamName,
            avatar: avatarUrl(player.id, player.avatar),
            email: isSelf || friendship ? player.email : null,
            bio: player.bio,
            gameTags: player.gameTags,
            country: player.country,
            totalWins: wins,
            totalMatches: matches,
            winRate: matches ? Number(((wins / matches) * 100).toFixed(1)) : 0,
        },
    });
}
