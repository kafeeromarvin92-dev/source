import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { validateEvidenceDataUrl } from "../../../../lib/match-rules";
import { avatarUrl, evidenceUrl, storeImageDataUrl } from "../../../../lib/object-storage";

type RouteContext = { params: Promise<{ id: string }> };
const publicUserSelect = { id: true, username: true, teamName: true, avatar: true } as const;
const roomInclude = {
    creator: { select: publicUserSelect }, acceptedBy: { select: publicUserSelect },
    messages: { include: { sender: { select: { id: true, username: true } } }, orderBy: { createdAt: "asc" } },
    codes: true, submissions: { include: { player: { select: publicUserSelect } } }, decision: true, objections: true,
} as const;
const allowedReactions = new Set(["Nice game", "Almost", "Fair play", "Next time, better"]);

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params; const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view this match room." }, { status: 401 });
    const room = await prisma.challenge.findUnique({ where: { id }, include: roomInclude });
    if (!room || room.status === "OPEN") return NextResponse.json({ error: "Match room is not ready." }, { status: 404 });
    if (room.creatorId !== user.id && room.acceptedById !== user.id) return NextResponse.json({ error: "Only players in this match can view its room." }, { status: 403 });
    return NextResponse.json({ room: formatRoom(room) });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params; const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to use the match room." }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string; text?: string; reaction?: string; code?: string; image?: string; reason?: string; winnerId?: string } | null;
    const room = await prisma.challenge.findUnique({ where: { id }, include: { submissions: true, decision: true } });
    if (!room || (room.creatorId !== user.id && room.acceptedById !== user.id)) return NextResponse.json({ error: "You are not a player in this match." }, { status: 403 });
    if (room.status === "SETTLED" || room.status === "CANCELLED") return NextResponse.json({ error: "This match is already closed." }, { status: 409 });

    if (body?.action === "reaction" && body.reaction && allowedReactions.has(body.reaction)) {
        await prisma.matchMessage.create({ data: { challengeId: id, senderId: user.id, text: body.reaction } });
    } else if (body?.action === "code" && body.code?.trim()) {
        await prisma.playerCode.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { code: body.code.trim(), createdAt: new Date() }, create: { challengeId: id, playerId: user.id, code: body.code.trim() } });
    } else if (body?.action === "submission") {
        const evidence = body.image ? validateEvidenceDataUrl(body.image) : { ok: false as const, error: "Choose a result screenshot first." };
        if (!evidence.ok) return NextResponse.json({ error: evidence.error }, { status: 400 });
        const winnerId = body.winnerId;
        if (!winnerId || ![room.creatorId, room.acceptedById].includes(winnerId)) return NextResponse.json({ error: "Choose which player won before submitting." }, { status: 400 });
        const stored = await storeImageDataUrl("evidence", body.image!, `${id}-${user.id}`);
        await prisma.$transaction(async (transaction) => {
            await transaction.submission.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { image: stored.key, createdAt: new Date() }, create: { challengeId: id, playerId: user.id, image: stored.key } });
            await transaction.matchDecision.update({ where: { challengeId: id }, data: { proposedWinnerId: winnerId } });
            await transaction.challenge.update({ where: { id }, data: { status: "REVIEW" } });
        });
        const opponentId = room.creatorId === user.id ? room.acceptedById : room.creatorId;
        if (opponentId) await prisma.notification.create({ data: { userId: opponentId, title: "Result screenshot submitted", message: "Review the result, then confirm it or dispute it with your own screenshot.", kind: "MATCH" } });
    } else if (body?.action === "confirm") {
        const submitter = room.submissions[0]?.playerId;
        if (!submitter || submitter === user.id || room.submissions.length !== 1) return NextResponse.json({ error: "Only the opponent can confirm the first submitted result." }, { status: 409 });
        const winnerId = body.winnerId || room.decision?.proposedWinnerId;
        if (!winnerId || ![room.creatorId, room.acceptedById].includes(winnerId)) return NextResponse.json({ error: "A valid winner is required." }, { status: 400 });
        await prisma.$transaction(async (transaction) => {
            await transaction.challenge.update({ where: { id }, data: { status: "SETTLED", verified: true } });
            await transaction.matchDecision.update({ where: { challengeId: id }, data: { status: "SETTLED", winnerId, confirmedById: user.id, confirmedAt: new Date(), decidedAt: new Date() } });
            await transaction.notification.createMany({ data: [room.creatorId, room.acceptedById].map((userId) => ({ userId, title: "Match result confirmed", message: "Both players confirmed the result. Your verified record is updated.", kind: "RESULT" })) });
        });
    } else if (body?.action === "dispute" || body?.action === "object") {
        const evidence = body.image ? validateEvidenceDataUrl(body.image) : { ok: false as const, error: "A dispute must include your own result screenshot." };
        if (!evidence.ok) return NextResponse.json({ error: evidence.error }, { status: 400 });
        if (!body.reason?.trim()) return NextResponse.json({ error: "Explain what is disputed." }, { status: 400 });
        const winnerId = body.winnerId;
        if (!winnerId || ![room.creatorId, room.acceptedById].includes(winnerId)) return NextResponse.json({ error: "Choose which player won in your screenshot." }, { status: 400 });
        const stored = await storeImageDataUrl("evidence", body.image!, `${id}-${user.id}`);
        await prisma.$transaction(async (transaction) => {
            await transaction.submission.upsert({ where: { challengeId_playerId: { challengeId: id, playerId: user.id } }, update: { image: stored.key, createdAt: new Date() }, create: { challengeId: id, playerId: user.id, image: stored.key } });
            await transaction.objection.create({ data: { challengeId: id, playerId: user.id, reason: body.reason!.trim().slice(0, 500) } });
            await transaction.challenge.update({ where: { id }, data: { status: "DISPUTED" } });
            await transaction.matchDecision.update({ where: { challengeId: id }, data: { status: "DISPUTED", proposedWinnerId: winnerId } });
            await transaction.notification.createMany({ data: [room.creatorId, room.acceptedById].map((userId) => ({ userId, title: "Match sent to admin review", message: "This result is disputed. An admin will review both screenshots; no win is awarded yet.", kind: "MATCH" })) });
        });
    } else return NextResponse.json({ error: "Invalid match-room action." }, { status: 400 });

    const updated = await prisma.challenge.findUnique({ where: { id }, include: roomInclude });
    return NextResponse.json({ room: updated ? formatRoom(updated) : null });
}

type MatchRoom = Prisma.ChallengeGetPayload<{ include: typeof roomInclude }>;
function formatRoom(room: MatchRoom) {
    const challenge = { ...room, creator: room.creator ? { ...room.creator, avatar: avatarUrl(room.creator.id, room.creator.avatar) } : null, acceptedBy: room.acceptedBy ? { ...room.acceptedBy, avatar: avatarUrl(room.acceptedBy.id, room.acceptedBy.avatar) } : null, status: room.status.toLowerCase(), isPrivate: true };
    return { challenge, messages: room.messages.filter((message) => allowedReactions.has(message.text)).map((message) => ({ id: message.id, senderId: message.senderId, senderName: message.sender.username, text: message.text, createdAt: message.createdAt })), playerCodes: Object.fromEntries(room.codes.map((code) => [code.playerId, code.code])), submissions: Object.fromEntries(room.submissions.map((submission) => [submission.playerId, { playerName: submission.player.username, image: evidenceUrl(submission.id), submittedAt: submission.createdAt }])), decision: room.decision, objections: room.objections };
}
