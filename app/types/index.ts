export interface User {
    id: string;
    username: string;
    teamName?: string;
    email?: string;
    emailVerified?: boolean;
    avatar: string;
    isAdmin?: boolean;
    createdAt?: string;
    nobleCoins: number;
    totalWins: number;
    totalMatches: number;
    winRate: number;
}

export interface Challenge {
    id: string;
    creator: User;
    stakeAmount: number;
    entryFeeCoins?: number;
    verified?: boolean;
    decision?: {
        winnerId?: string | null;
        creatorScore?: number | null;
        acceptedByScore?: number | null;
    } | null;
    status: "open" | "accepted" | "review" | "disputed" | "settled" | "cancelled";
    isPrivate: boolean;
    createdAt: string;
    acceptedBy?: User;
}

export interface MatchMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
}

export interface MatchRoom {
    challenge: Challenge;
    messages: MatchMessage[];
    playerCodes: Record<string, string>;
    submissions: Record<string, { playerName: string; image: string; submittedAt: string }>;
    decision?: {
        winnerId?: string | null;
        confidence?: number | null;
        reasoning?: string | null;
        creatorScore?: number | null;
        acceptedByScore?: number | null;
    } | null;
}