import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id }, select: { balance: true } });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, teamName: user.teamName, email: user.email, avatar: avatarUrl(user.id, user.avatar), isAdmin: user.isAdmin, coinBalance: wallet.balance } });
}
