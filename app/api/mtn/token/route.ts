import { NextResponse } from "next/server";
import { getMtnAccessToken, MtnMomoError } from "../../../lib/mtn-momo";

export async function POST() {
    try {
        const accessToken = await getMtnAccessToken();
        return NextResponse.json({ access_token: accessToken });
    } catch (error) {
        const status = error instanceof MtnMomoError ? error.status : 500;
        return NextResponse.json({ error: error instanceof Error ? error.message : "MTN token request failed." }, { status });
    }
}