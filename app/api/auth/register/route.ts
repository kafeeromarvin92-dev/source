import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json({ error: "Create an account with Google sign-in to verify your Gmail address." }, { status: 410 });
}