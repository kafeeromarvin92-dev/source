import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { avatarUrl } from "../../lib/object-storage";

type PlayerStats = {
    id: string;
    username: string;
    teamName: string;
    avatar: string;
    country: string | null;
    wins: number;
    losses: number;
    matches: number;
    currentStreak: number;
};

export async function GET() {
    const [matches, currentUser, coinWallets] = await Promise.all([
        prisma.challenge.findMany({
            where: { status: "SETTLED", verified: true },
            include: {
                creator: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
                acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true, country: true } },
                decision: { select: { winnerId: true, creatorScore: true, acceptedByScore: true, decidedAt: true } },
            },
        }),
        getCurrentUser(),
        prisma.wallet.findMany({
            where: { userId: { not: null } },
            include: { user: { select: { id: true, username: true, teamName: true, avatar: true, country: true } } },
            orderBy: [{ balance: "desc" }, { createdAt: "asc" }],
        }),
    ]);

    const stats = new Map<string, PlayerStats>();
    const activeStreak = new Map<string, boolean>();
    const clubs = new Map<string, { teamName: string; avatar: string; wins: number; matches: number }>();
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
                    currentStreak: 0,
                };
                stats.set(player.id, playerStats);
                activeStreak.set(player.id, true);
            }

            playerStats.matches += 1;
            if (decision.winnerId === player.id) {
                playerStats.wins += 1;
                if (activeStreak.get(player.id)) playerStats.currentStreak += 1;
            } else {
                playerStats.losses += 1;
                activeStreak.set(player.id, false);
            }

            const clubName = player.teamName.trim();
            if (clubName) {
                const club = clubs.get(clubName.toLowerCase()) ?? { teamName: clubName, avatar: avatarUrl(player.id, player.avatar), wins: 0, matches: 0 };
                club.matches += 1;
                if (decision.winnerId === player.id) club.wins += 1;
                clubs.set(clubName.toLowerCase(), club);
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
            country: player.country,
            wins: player.wins,
            matches: player.matches,
            winRate: Number(((player.wins / player.matches) * 100).toFixed(1)),
            currentStreak: player.currentStreak,
            rank: index + 1,
        }));
    const streakKings = [...rankedPlayers]
        .sort((left, right) => right.currentStreak - left.currentStreak || right.wins - left.wins || left.username.localeCompare(right.username))
        .map((player, index) => ({ ...player, rank: index + 1 }));
    const topClubs = [...clubs.values()]
        .filter((club) => club.matches > 0)
        .sort((left, right) => right.wins - left.wins || (right.wins / right.matches) - (left.wins / left.matches) || right.matches - left.matches || left.teamName.localeCompare(right.teamName))
        .map((club, index) => ({ ...club, winRate: Number(((club.wins / club.matches) * 100).toFixed(1)), rank: index + 1 }));

    const currentUserPosition = currentUser
        ? rankedPlayers.find((player) => player.id === currentUser.id)?.rank ?? null
        : null;
    const rankedCoins = coinWallets.flatMap((wallet, index) => wallet.user ? [{
        id: wallet.user.id,
        username: wallet.user.username,
        teamName: wallet.user.teamName,
        avatar: avatarUrl(wallet.user.id, wallet.user.avatar),
        country: wallet.user.country,
        coins: wallet.balance,
        wins: 0,
        matches: 0,
        winRate: 0,
        currentStreak: 0,
        rank: index + 1,
    }] : []);
    const currentCoinIndex = currentUser ? coinWallets.findIndex((wallet) => wallet.userId === currentUser.id) : -1;
    const myCoinPosition = currentCoinIndex >= 0 ? currentCoinIndex + 1 : null;
    const coinsToNext = currentCoinIndex > 0
        ? Math.max(1, coinWallets[currentCoinIndex - 1].balance - coinWallets[currentCoinIndex].balance + 1)
        : null;

    return NextResponse.json({
        leaderboard: rankedPlayers.slice(0, 20),
        streakKings: streakKings.slice(0, 20),
        topClubs: topClubs.slice(0, 20),
        topCoins: rankedCoins.slice(0, 20),
        myPosition: currentUserPosition,
        myCoinPosition,
        coinsToNext,
    });
}
