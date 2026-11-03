import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to view your wallet." }, { status: 401 });
    return NextResponse.json({ nobleCoins: user.nobleCoins });
}

export async function POST() {
    // TODO: MoMo Phase 2 - re-enable mobile-money requests when real payments return.
    return NextResponse.json({ error: "Mobile-money deposits and withdrawals are disabled. Noble Coins are virtual." }, { status: 410 });
}