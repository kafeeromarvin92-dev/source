import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

const userSelect = { id: true, username: true, teamName: true, avatar: true, email: true, emailVerifiedAt: true } as const;
function publicUser(user: { id: string; username: string; teamName: string; avatar: string }) {
    return { id: user.id, username: user.username, teamName: user.teamName, avatar: user.avatar };
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to manage friends." }, { status: 401 });

    const requests = await prisma.friendRequest.findMany({
        where: {
            OR: [{ requesterId: user.id }, { recipientId: user.id }],
            status: { in: ["PENDING", "ACCEPTED"] },
        },
        include: {
            requester: { select: userSelect },
            recipient: { select: userSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    const friends = requests
        .filter((request) => request.status === "ACCEPTED")
        .map((request) => {
            const friend = request.requesterId === user.id ? request.recipient : request.requester;
            return {
                id: request.id,
                user: {
                    id: friend.id,
                    username: friend.username,
                    teamName: friend.teamName,
                    avatar: friend.avatar,
                    email: friend.emailVerifiedAt ? friend.email : null,
                },
            };
        });
    const incoming = requests
        .filter((request) => request.status === "PENDING" && request.recipientId === user.id)
        .map((request) => ({ id: request.id, user: publicUser(request.requester) }));
    const outgoing = requests
        .filter((request) => request.status === "PENDING" && request.requesterId === user.id)
        .map((request) => ({ id: request.id, user: publicUser(request.recipient) }));

    return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to add a friend." }, { status: 401 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: "Verify your Gmail with Google before adding friends." }, { status: 403 });

    const body = await request.json().catch(() => null) as { username?: unknown } | null;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    if (username.length < 3) return NextResponse.json({ error: "Enter a username with at least 3 characters." }, { status: 400 });

    const matches = await prisma.user.findMany({ where: { username }, select: { id: true }, take: 2 });
    if (!matches.length) return NextResponse.json({ error: "No player found with that username." }, { status: 404 });
    if (matches.length > 1) return NextResponse.json({ error: "That username is shared by multiple players. Ask them to choose a unique username first." }, { status: 409 });
    const target = matches[0];
    if (target.id === user.id) return NextResponse.json({ error: "You cannot add yourself as a friend." }, { status: 400 });

    const existing = await prisma.friendRequest.findFirst({
        where: {
            OR: [
                { requesterId: user.id, recipientId: target.id },
                { requesterId: target.id, recipientId: user.id },
            ],
        },
    });
    if (existing?.status === "ACCEPTED") return NextResponse.json({ error: "You are already friends." }, { status: 409 });
    if (existing) {
        if (existing.recipientId === user.id) {
            const accepted = await prisma.friendRequest.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
            return NextResponse.json({ request: accepted, message: "Friend request accepted." });
        }
        return NextResponse.json({ error: "A friend request is already pending." }, { status: 409 });
    }

    const friendRequest = await prisma.friendRequest.create({ data: { requesterId: user.id, recipientId: target.id } });
    return NextResponse.json({ request: friendRequest, message: "Friend request sent." }, { status: 201 });
}
