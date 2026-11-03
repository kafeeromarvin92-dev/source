import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

type Registration = { username: string; teamName: string };

function googleRedirect(request: Request, mode: "login" | "register", registration?: Registration) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        const destination = mode === "register" ? "/register" : "/login";
        return NextResponse.redirect(new URL(`${destination}?error=google_unavailable`, request.url));
    }

    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 600,
    };
    response.cookies.set("noble-google-state", state, cookieOptions);
    response.cookies.set("noble-google-verifier", verifier, cookieOptions);
    response.cookies.set("noble-google-mode", mode, cookieOptions);
    if (registration) {
        response.cookies.set("noble-google-registration", Buffer.from(JSON.stringify(registration)).toString("base64url"), cookieOptions);
    }
    return response;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "register" ? "register" : "login";
    if (mode === "register") {
        const username = url.searchParams.get("username")?.trim() || "";
        const teamName = url.searchParams.get("teamName")?.trim() || "";
        if (username.length < 3 || teamName.length < 2) {
            return NextResponse.redirect(new URL("/register?error=profile", request.url));
        }
        return googleRedirect(request, mode, { username, teamName });
    }
    return googleRedirect(request, mode);
}
