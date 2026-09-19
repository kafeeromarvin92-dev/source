import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, teamName: user.teamName, email: user.email, avatar: user.avatar, walletBalance: user.walletBalance } });
}