import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

type PlayerStats = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    wins: number;
    losses: number;
    goalDifference: number;
    winStreak: number;
    streakOpen: boolean;
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
        for (const [index, player] of players.entries()) {
            let playerStats = stats.get(player.id);
            if (!playerStats) {
                playerStats = {
                    ...player,
                    wins: 0,
                    losses: 0,
                    goalDifference: 0,
                    winStreak: 0,
                    streakOpen: true,
                };
                stats.set(player.id, playerStats);
            }

            const playerScore = index === 0 ? decision.creatorScore : decision.acceptedByScore;
            const opponentScore = index === 0 ? decision.acceptedByScore : decision.creatorScore;
            if (playerScore !== null && opponentScore !== null) playerStats.goalDifference += playerScore - opponentScore;

            if (decision.winnerId === player.id) {
                playerStats.wins += 1;
                if (playerStats.streakOpen) playerStats.winStreak += 1;
            } else {
                playerStats.losses += 1;
                playerStats.streakOpen = false;
            }
        }
    }

    const rankedPlayers = [...stats.values()]
        .sort((left, right) => right.wins - left.wins || right.goalDifference - left.goalDifference || left.username.localeCompare(right.username))
        .map((player, index) => ({
            id: player.id,
            username: player.username,
            teamName: player.teamName,
            avatar: player.avatar,
            wins: player.wins,
            losses: player.losses,
            goalDifference: player.goalDifference,
            winStreak: player.winStreak,
            rank: index + 1,
        }));

    const currentUserPosition = currentUser
        ? rankedPlayers.find((player) => player.id === currentUser.id)?.rank ?? null
        : null;

    return NextResponse.json({ leaderboard: rankedPlayers.slice(0, 20), myPosition: currentUserPosition });
}
