import { NextResponse } from "next/server";
import { canAdmin, getCurrentUser } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";
import { imageContentType, parseImageDataUrl, readStoredObject } from "../../../../lib/object-storage";

type RouteContext = { params: Promise<{ kind: string; id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const { kind, id } = await context.params;
    if (kind === "avatar") {
        const user = await prisma.user.findUnique({ where: { id }, select: { avatar: true } });
        if (!user?.avatar) return new NextResponse(null, { status: 404 });
        const legacy = parseImageDataUrl(user.avatar);
        if (legacy) return new NextResponse(legacy.bytes, { headers: { "Content-Type": legacy.contentType, "Cache-Control": "public, max-age=3600" } });
        const bytes = await readStoredObject(user.avatar);
        if (!bytes) return new NextResponse(null, { status: 404 });
        return new NextResponse(bytes, { headers: { "Content-Type": imageContentType(user.avatar), "Cache-Control": "public, max-age=3600" } });
    }
    if (kind !== "evidence") return new NextResponse(null, { status: 404 });
    const viewer = await getCurrentUser();
    if (!viewer) return NextResponse.json({ error: "Log in to view match evidence." }, { status: 401 });
    const submission = await prisma.submission.findUnique({ where: { id }, include: { challenge: true } });
    if (!submission) return new NextResponse(null, { status: 404 });
    const allowed = canAdmin(viewer) || submission.playerId === viewer.id || submission.challenge.creatorId === viewer.id || submission.challenge.acceptedById === viewer.id;
    if (!allowed) return NextResponse.json({ error: "Only match participants and admins can view evidence." }, { status: 403 });
    const legacy = parseImageDataUrl(submission.image);
    if (legacy) return new NextResponse(legacy.bytes, { headers: { "Content-Type": legacy.contentType, "Cache-Control": "private, max-age=300" } });
    const bytes = await readStoredObject(submission.image);
    if (!bytes) return new NextResponse(null, { status: 404 });
    return new NextResponse(bytes, { headers: { "Content-Type": imageContentType(submission.image), "Cache-Control": "private, max-age=300" } });
}
