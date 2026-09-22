export interface User {
    id: string;
    username: string;
    teamName?: string;
    email?: string;
    avatar: string;
    isAdmin?: boolean;
    createdAt?: string;
    walletBalance: number;
    totalWins: number;
    totalMatches: number;
    totalEarnings: number;
    winRate: number;
}

export interface Challenge {
    id: string;
    creator: User;
    stakeAmount: number;
    status: "open" | "accepted" | "cancelled";
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
}