import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { runAiReview } from "../../../../lib/adjudication";

type RouteContext = { params: Promise<{ id: string }> };
const roomInclude = {
    creator: { select: { id: true, username: true, teamName: true, avatar: true } },
    acceptedBy: { select: { id: true, username: true, teamName: true, avatar: true } },
    messages: { include: { sender: { select: { id: true, username: true } } }, orderBy: { createdAt: "asc" as const } },
    codes: true,
    submissions: { include: { player: { select: { id: true, username: true } } } },
    decision: true,
    objections: true,
} satisfies Prisma.ChallengeInclude;

export async function GET(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view the match room." }, { status: 401 });
    const { id } = await context.params;
    const room = await prisma.challenge.findUnique({ where: { id }, include: roomInclude });
    if (!room || room.status === "OPEN") return NextResponse.json({ error: "Match room is not ready." }, { status: 404 });
    if (room.creatorId !== user.id && room.acceptedById !== user.id) return NextResponse.json({ error: "You are not a player in this match." }, { status: 403 });
    return NextResponse.json({ room: formatRoom(room) });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to use the match room." }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string; text?: string; code?: string; image?: string; reason?: string } | null;
    const room = await prisma.challenge.findUnique({ where: { id } });
    if (!room || (room.creatorId !== user.id && room.acceptedById !== user.id)) return NextResponse.json({ error: "You are not a player in this match." }, { status: 403 });
    if (room.status === "SETTLED" || room.status === "CANCELLED") return NextResponse.json({ error: "This match is already closed." }, { status: 409 });

    if (body?.action === "message" && body.text?.trim()) await prisma.matchMessage.create({ data: { challengeId: id, senderId: user.id, text: body.text.trim() } });
    else if (body?.action === "code" && body.code?.trim()) await prisma.playerCode.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { code: body.code.trim(), createdAt: new Date() }, create: { challengeId: id, playerId: user.id, code: body.code.trim() } });
    else if (body?.action === "submission" && body.image?.startsWith("data:image/")) {
        await prisma.submission.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { image: body.image, createdAt: new Date() }, create: { challengeId: id, playerId: user.id, image: body.image } });
        await prisma.challenge.update({ where: { id }, data: { status: "REVIEW" } });
        await runAiReview(id);
    } else if (body?.action === "object" && body.reason?.trim()) {
        await prisma.objection.create({ data: { challengeId: id, playerId: user.id, reason: body.reason.trim() } });
        await prisma.challenge.update({ where: { id }, data: { status: "DISPUTED", decision: { update: { status: "DISPUTED" } } } });
    } else return NextResponse.json({ error: "Invalid match-room action." }, { status: 400 });

    const updated = await prisma.challenge.findUnique({ where: { id }, include: roomInclude });
    return NextResponse.json({ room: updated ? formatRoom(updated) : null });
}

type MatchRoom = Prisma.ChallengeGetPayload<{ include: typeof roomInclude }>;

function formatRoom(room: MatchRoom) {
    return {
        challenge: {
            id: room.id,
            game: room.game,
            stakeAmount: room.stakeAmount,
            status: room.status.toLowerCase(),
            createdAt: room.createdAt,
            creatorId: room.creatorId,
            acceptedById: room.acceptedById,
            creator: room.creator,
            acceptedBy: room.acceptedBy,
            isPrivate: true,
        },
        messages: room.messages.map((message) => ({ id: message.id, senderId: message.senderId, senderName: message.sender.username, text: message.text, createdAt: message.createdAt })),
        playerCodes: Object.fromEntries(room.codes.map((code) => [code.playerId, code.code])),
        submissions: Object.fromEntries(room.submissions.map((submission) => [submission.playerId, { playerName: submission.player.username, image: submission.image, submittedAt: submission.createdAt }])) ,
        decision: room.decision,
        objections: room.objections,
    };
}