import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

export async function GET() {
    const currentUser = await getCurrentUser();
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const players = await prisma.user.findMany({ where: { lastSeenAt: { gte: cutoff }, ...(currentUser ? { id: { not: currentUser.id } } : {}) }, select: { id: true, username: true, teamName: true, avatar: true, country: true, lastSeenAt: true }, orderBy: { lastSeenAt: "desc" }, take: 12 });
    return NextResponse.json({ players: players.map((player) => ({ ...player, avatar: avatarUrl(player.id, player.avatar) })) });
}
