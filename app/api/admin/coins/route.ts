import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";
import { avatarUrl } from "../../../lib/object-storage";

export async function GET(request: Request) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    const [house, users] = await Promise.all([
        prisma.wallet.findUniqueOrThrow({ where: { accountKey: "house:treasury" }, select: { balance: true } }),
        search.length >= 2 ? prisma.user.findMany({
            where: { OR: [
                { username: { contains: search, mode: "insensitive" } },
                { teamName: { contains: search, mode: "insensitive" } },
            ] },
            select: { id: true, username: true, teamName: true, avatar: true, wallet: { select: { balance: true } } },
            orderBy: { username: "asc" },
            take: 20,
        }) : Promise.resolve([]),
    ]);

    return NextResponse.json({
        houseBalance: house.balance,
        users: users.map((user) => ({
            id: user.id,
            username: user.username,
            teamName: user.teamName,
            avatar: avatarUrl(user.id, user.avatar),
            balance: user.wallet?.balance ?? 0,
        })),
    });
}

export async function POST(request: Request) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const body = await request.json().catch(() => null) as { userId?: string; amount?: number; reason?: string } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!body?.userId || !Number.isInteger(body.amount) || !body.amount || body.amount < 1 || body.amount > 100_000 || reason.length < 5 || reason.length > 200) {
        return NextResponse.json({ error: "Choose a player, enter 1–100,000 points, and provide a 5–200 character reason." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, username: true } });
    if (!target) return NextResponse.json({ error: "Player not found." }, { status: 404 });

    const wallet = await prisma.$transaction(async (transaction) => {
        const account = await transaction.wallet.findUniqueOrThrow({ where: { userId: target.id } });
        const updated = await transaction.wallet.update({ where: { id: account.id }, data: { balance: { increment: body.amount! } } });
        await transaction.coinTransaction.create({ data: {
            walletId: account.id,
            createdById: admin.id,
            type: "ADMIN_GRANT",
            amount: body.amount!,
            referenceKey: `admin-grant:${randomUUID()}`,
            note: reason,
        } });
        return updated;
    });

    return NextResponse.json({ userId: target.id, username: target.username, balance: wallet.balance, granted: body.amount });
}
