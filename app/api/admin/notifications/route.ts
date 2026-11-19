import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const body = await request.json().catch(() => null) as { title?: string; message?: string; userId?: string } | null;
    const title = body?.title?.trim() || ""; const message = body?.message?.trim() || "";
    if (title.length < 3 || title.length > 80 || message.length < 3 || message.length > 500) return NextResponse.json({ error: "Title and message lengths are invalid." }, { status: 400 });
    const notification = await prisma.notification.create({ data: { title, message, userId: body?.userId || null, kind: "ADMIN" } });
    return NextResponse.json({ notification }, { status: 201 });
}
