import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { runAiReview } from "../../../../lib/adjudication";

type RouteContext = { params: Promise<{ id: string }> };
const publicUserSelect = { id: true, username: true, teamName: true, avatar: true } as const;
const roomInclude = {
    creator: { select: publicUserSelect },
    acceptedBy: { select: publicUserSelect },
    messages: { include: { sender: { select: { id: true, username: true } } }, orderBy: { createdAt: "asc" } },
    codes: true,
    submissions: { include: { player: { select: publicUserSelect } } },
    decision: true,
    objections: true,
} as const;
const allowedReactions = new Set(["Nice game", "Almost", "Fair play", "Next time, better"]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view this match room." }, { status: 401 });
    const room = await prisma.challenge.findUnique({ where: { id }, include: roomInclude });
    if (!room || room.status === "OPEN") return NextResponse.json({ error: "Match room is not ready." }, { status: 404 });
    if (room.creatorId !== user.id && room.acceptedById !== user.id) return NextResponse.json({ error: "Only players in this match can view its room." }, { status: 403 });
    return NextResponse.json({ room: formatRoom(room) });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to use the match room." }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string; text?: string; reaction?: string; code?: string; image?: string; reason?: string } | null;
    const room = await prisma.challenge.findUnique({ where: { id } });
    if (!room || (room.creatorId !== user.id && room.acceptedById !== user.id)) return NextResponse.json({ error: "You are not a player in this match." }, { status: 403 });
    if (room.status === "SETTLED" || room.status === "CANCELLED") return NextResponse.json({ error: "This match is already closed." }, { status: 409 });

    if (body?.action === "reaction" && body.reaction && allowedReactions.has(body.reaction)) {
        await prisma.matchMessage.create({ data: { challengeId: id, senderId: user.id, text: body.reaction } });
    }
    else if (body?.action === "code" && body.code?.trim()) await prisma.playerCode.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { code: body.code.trim(), createdAt: new Date() }, create: { challengeId: id, playerId: user.id, code: body.code.trim() } });
    else if (body?.action === "submission" && body.image) {
        const imageMatch = body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
        if (!imageMatch || !allowedImageTypes.has(imageMatch[1]) || imageMatch[2].length > 6_990_508) {
            return NextResponse.json({ error: "Upload a PNG, JPEG, or WebP screenshot under 5 MB." }, { status: 400 });
        }
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
        challenge: { ...room, status: room.status.toLowerCase(), isPrivate: true },
        messages: room.messages.filter((message) => allowedReactions.has(message.text)).map((message) => ({ id: message.id, senderId: message.senderId, senderName: message.sender.username, text: message.text, createdAt: message.createdAt })),
        playerCodes: Object.fromEntries(room.codes.map((code) => [code.playerId, code.code])),
        submissions: Object.fromEntries(room.submissions.map((submission) => [submission.playerId, { playerName: submission.player.username, image: submission.image, submittedAt: submission.createdAt }])) ,
        decision: room.decision,
        objections: room.objections,
    };
}