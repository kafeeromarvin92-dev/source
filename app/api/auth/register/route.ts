import { NextResponse } from "next/server";
import { hashPassword, createSession } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { STARTER_BALANCE } from "../../../lib/coin-rules";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return NextResponse.json({ error: "Username must be 3–20 characters using letters, numbers, or underscores." }, { status: 400 });
    const genericTeamNames = new Set(["team", "test", "unknown", "n/a", "na", "none", "abc"]);
    if (teamName.length < 3 || teamName.length > 50 || genericTeamNames.has(teamName.toLowerCase())) return NextResponse.json({ error: "Enter the real in-game team name, such as Arsenal, Barcelona, or Manchester City." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (await prisma.user.findUnique({ where: { username } })) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    const user = await prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({ data: { username, teamName, email, passwordHash: await hashPassword(password), avatar: "⚽" } });
        const wallet = await transaction.wallet.create({ data: { accountKey: `player:${created.id}`, userId: created.id, balance: STARTER_BALANCE } });
        await transaction.coinTransaction.create({ data: {
            walletId: wallet.id,
            type: "STARTER_GRANT",
            amount: STARTER_BALANCE,
            referenceKey: `starter:registration:${created.id}`,
            note: "New player starter balance",
        } });
        return { ...created, coinBalance: wallet.balance };
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, teamName: user.teamName, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin, coinBalance: user.coinBalance } }, { status: 201 });
}
