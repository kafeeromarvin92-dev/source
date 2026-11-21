import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    const admin = await getCurrentUser();
    if (!admin || !canAdmin(admin)) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    if (body?.action !== "start") return NextResponse.json({ error: "Unsupported tournament action." }, { status: 400 });

    try {
        const result = await prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "Tournament" WHERE "id" = ${id} FOR UPDATE`;
            const tournament = await transaction.tournament.findUnique({
                where: { id },
                include: { _count: { select: { entries: true } } },
            });
            if (!tournament) throw new Error("NOT_FOUND");
            if (tournament.status !== "OPEN") throw new Error("NOT_OPEN");
            if (tournament._count.entries !== tournament.size) throw new Error("NOT_FULL");
            if (tournament.startAt.getTime() > Date.now()) throw new Error("NOT_STARTED");

            await transaction.tournament.update({ where: { id }, data: { status: "LIVE" } });
            return { id: tournament.id, name: tournament.name, status: "LIVE" };
        });
        return NextResponse.json({ tournament: result });
    } catch (error) {
        if (error instanceof Error) {
            const errors: Record<string, { message: string; status: number }> = {
                NOT_FOUND: { message: "Tournament not found.", status: 404 },
                NOT_OPEN: { message: "Tournament is not open.", status: 409 },
                NOT_FULL: { message: "All tournament places must be filled before it starts.", status: 409 },
                NOT_STARTED: { message: "The scheduled start time has not arrived yet.", status: 409 },
            };
            const known = errors[error.message];
            if (known) return NextResponse.json({ error: known.message }, { status: known.status });
        }
        throw error;
    }
}

export async function POST(request: Request, context: RouteContext) {
    return PATCH(request, context);
}
