import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const payload = await request.json().catch(() => null);
    console.log("Relworx webhook received:", payload);

    return NextResponse.json({ received: true });
}
