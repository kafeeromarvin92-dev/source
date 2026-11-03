import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to manage friend requests." }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: string } | null;
    const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
    if (!friendRequest || (friendRequest.requesterId !== user.id && friendRequest.recipientId !== user.id)) {
        return NextResponse.json({ error: "Friend request not found." }, { status: 404 });
    }

    if (body?.action === "accept" && friendRequest.recipientId === user.id && friendRequest.status === "PENDING") {
        const accepted = await prisma.friendRequest.update({ where: { id }, data: { status: "ACCEPTED" } });
        return NextResponse.json({ request: accepted });
    }
    if ((body?.action === "decline" && friendRequest.recipientId === user.id) || (body?.action === "remove" && friendRequest.status === "ACCEPTED")) {
        await prisma.friendRequest.delete({ where: { id } });
        return NextResponse.json({ message: body.action === "decline" ? "Friend request declined." : "Friend removed." });
    }

    return NextResponse.json({ error: "That friend action is not allowed." }, { status: 403 });
}
