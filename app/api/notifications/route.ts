import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view notifications." }, { status: 401 });
    const notifications = await prisma.notification.findMany({ where: { OR: [{ userId: user.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to update notifications." }, { status: 401 });
    const body = await request.json().catch(() => null) as { id?: string } | null;
    if (!body?.id || body.id.startsWith("static-")) return NextResponse.json({ ok: true });
    await prisma.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
}
