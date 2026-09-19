import { NextResponse } from "next/server";
import { createSession, hashPassword } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const avatar = typeof body?.avatar === "string" && body.avatar.startsWith("data:image/") ? body.avatar : "";

    if (username.length < 3 || teamName.length < 2 || !email || password.length < 8 || !avatar) {
        return NextResponse.json({ error: "Username, team name, email, 8-character password, and logo are required." }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "That email is already registered." }, { status: 409 });

    const user = await prisma.user.create({ data: { username, teamName, email, avatar, passwordHash: await hashPassword(password) } });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, teamName: user.teamName, email: user.email, avatar: user.avatar, walletBalance: user.walletBalance } }, { status: 201 });
}