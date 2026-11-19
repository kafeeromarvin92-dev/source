import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view history." }, { status: 401 });
    const matches = await prisma.challenge.findMany({ where: { OR: [{ creatorId: user.id }, { acceptedById: user.id }] }, include: { creator: { select: { username: true, teamName: true } }, acceptedBy: { select: { username: true, teamName: true } }, decision: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ matches });
}
