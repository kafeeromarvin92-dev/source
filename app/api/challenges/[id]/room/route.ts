import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { runAiReview } from "../../../../lib/adjudication";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const room = await prisma.challenge.findUnique({ where: { id }, include: { creator: true, acceptedBy: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } }, codes: true, submissions: { include: { player: true } }, decision: true, objections: true } });
    if (!room || room.status === "OPEN") return NextResponse.json({ error: "Match room is not ready." }, { status: 404 });
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

    const updated = await prisma.challenge.findUnique({ where: { id }, include: { creator: true, acceptedBy: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } }, codes: true, submissions: { include: { player: true } }, decision: true, objections: true } });
    return NextResponse.json({ room: updated ? formatRoom(updated) : null });
}

function formatRoom(room: any) {
    return {
        challenge: { ...room, status: room.status.toLowerCase(), isPrivate: true },
        messages: room.messages.map((message: any) => ({ id: message.id, senderId: message.senderId, senderName: message.sender.username, text: message.text, createdAt: message.createdAt })),
        playerCodes: Object.fromEntries(room.codes.map((code: any) => [code.playerId, code.code])),
        submissions: Object.fromEntries(room.submissions.map((submission: any) => [submission.playerId, { playerName: submission.player.username, image: submission.image, submittedAt: submission.createdAt }])),
        decision: room.decision,
        objections: room.objections,
    };
}