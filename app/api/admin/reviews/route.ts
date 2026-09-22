import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
    const admin = await getCurrentUser();
    if (!admin?.isAdmin) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });

    const reviews = await prisma.challenge.findMany({
        where: { status: { in: ["REVIEW", "DISPUTED"] } },
        include: {
            creator: { select: { id: true, username: true, teamName: true } },
            acceptedBy: { select: { id: true, username: true, teamName: true } },
            submissions: { include: { player: { select: { id: true, username: true, teamName: true } } }, orderBy: { createdAt: "asc" } },
            decision: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ reviews: reviews.filter((review) => review.submissions.length >= 2) });
}
