import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { avatarUrl } from "../../lib/object-storage";

type PlayerStats = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    wins: number;
    losses: number;
    matches: number;
};

export async function GET() {
    const [matches, currentUser] = await Promise.all([
        prisma.challenge.findMany({
            where: { status: "SETTLED", verified: true },
            include: {
                creator: { select: { id: true, username: true, teamName: true, avatar: true } },
                acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true } },
                decision: { select: { winnerId: true, creatorScore: true, acceptedByScore: true, decidedAt: true } },
            },
        }),
        getCurrentUser(),
    ]);

    const stats = new Map<string, PlayerStats>();
    const orderedMatches = matches.sort((left, right) => {
        const leftTime = left.decision?.decidedAt?.getTime() ?? left.createdAt.getTime();
        const rightTime = right.decision?.decidedAt?.getTime() ?? right.createdAt.getTime();
        return rightTime - leftTime;
    });

    for (const match of orderedMatches) {
        const decision = match.decision;
        if (!decision?.winnerId || !match.acceptedBy) continue;

        const players = [match.creator, match.acceptedBy];
        for (const player of players) {
            let playerStats = stats.get(player.id);
            if (!playerStats) {
                playerStats = {
                    ...player,
                    wins: 0,
                    losses: 0,
                    matches: 0,
                };
                stats.set(player.id, playerStats);
            }

            playerStats.matches += 1;
            if (decision.winnerId === player.id) {
                playerStats.wins += 1;
            } else {
                playerStats.losses += 1;
            }
        }
    }

    const rankedPlayers = [...stats.values()]
        .filter((player) => player.matches >= 3)
        .sort((left, right) => right.wins - left.wins || (right.wins / right.matches) - (left.wins / left.matches) || right.matches - left.matches || left.username.localeCompare(right.username))
        .map((player, index) => ({
            id: player.id,
            username: player.username,
            teamName: player.teamName,
            avatar: avatarUrl(player.id, player.avatar),
            wins: player.wins,
            matches: player.matches,
            winRate: Number(((player.wins / player.matches) * 100).toFixed(1)),
            rank: index + 1,
        }));

    const currentUserPosition = currentUser
        ? rankedPlayers.find((player) => player.id === currentUser.id)?.rank ?? null
        : null;

    return NextResponse.json({ leaderboard: rankedPlayers.slice(0, 20), myPosition: currentUserPosition });
}
