import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/server-auth";

async function requireAdmin() {
    const admin = await getCurrentUser();
    if (!admin?.isAdmin) return null;
    return admin;
}

export async function GET() {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    return NextResponse.json({ transactions: [] });
}

export async function POST() {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    // TODO: MoMo Phase 2 - restore wallet transaction review with mobile-money payments.
    return NextResponse.json({ error: "Mobile-money wallet requests are disabled." }, { status: 410 });
}