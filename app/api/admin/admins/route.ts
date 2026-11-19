import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const users = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true, username: true, email: true, isAdmin: true }, orderBy: { username: "asc" } });
    return NextResponse.json({ admins: users });
}

export async function PATCH(request: Request) {
    const owner = await getCurrentUser();
    if (!owner || !owner.isAdmin) return NextResponse.json({ error: "Only an administrator can manage admin access." }, { status: 403 });
    const body = await request.json().catch(() => null) as { userId?: string; isAdmin?: boolean } | null;
    if (!body?.userId || typeof body.isAdmin !== "boolean") return NextResponse.json({ error: "User and admin status are required." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.id === owner.id && body.isAdmin === false) return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 403 });
    const updated = await prisma.user.update({ where: { id: target.id }, data: { isAdmin: body.isAdmin } });
    return NextResponse.json({ user: { id: updated.id, username: updated.username, email: updated.email, isAdmin: updated.isAdmin } });
}
