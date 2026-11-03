import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { createSession, hashPassword } from "../../../../lib/server-auth";
import { prisma } from "../../../../lib/prisma";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const stateCookie = "noble-google-state";
const verifierCookie = "noble-google-verifier";
const modeCookie = "noble-google-mode";
const registrationCookie = "noble-google-registration";

function fail(request: Request, mode: string, reason: string) {
    const destination = mode === "register" ? "/register" : "/login";
    return NextResponse.redirect(new URL(`${destination}?error=${encodeURIComponent(reason)}`, request.url));
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const mode = cookieStore.get(modeCookie)?.value || "login";
    const storedState = cookieStore.get(stateCookie)?.value;
    const verifier = cookieStore.get(verifierCookie)?.value;
    const clearCookie = (response: NextResponse) => {
        response.cookies.delete(stateCookie);
        response.cookies.delete(verifierCookie);
        response.cookies.delete(modeCookie);
        response.cookies.delete(registrationCookie);
        return response;
    };

    if (!code || !state || !storedState || !verifier || state !== storedState) {
        return clearCookie(fail(request, mode, "google_verification"));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        return clearCookie(fail(request, mode, "google_unavailable"));
    }

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                code_verifier: verifier,
            }),
        });
        if (!tokenResponse.ok) return clearCookie(fail(request, mode, "google_verification"));
        const tokenData = await tokenResponse.json() as { id_token?: unknown };
        if (typeof tokenData.id_token !== "string") return clearCookie(fail(request, mode, "google_verification"));

        const { payload } = await jwtVerify(tokenData.id_token, googleKeys, {
            issuer: ["https://accounts.google.com", "accounts.google.com"],
            audience: clientId,
        });
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
        const googleId = typeof payload.sub === "string" ? payload.sub : "";
        if (payload.email_verified !== true || !email.endsWith("@gmail.com") || !googleId) {
            return clearCookie(fail(request, mode, "gmail_required"));
        }

        let account = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });
        if (!account && mode !== "register") {
            return clearCookie(fail(request, mode, "account_not_found"));
        }

        if (account?.googleId && account.googleId !== googleId) {
            return clearCookie(fail(request, mode, "google_account_conflict"));
        }

        const verifiedAt = new Date();
        if (account) {
            account = await prisma.user.update({
                where: { id: account.id },
                data: { googleId, emailVerifiedAt: verifiedAt },
            });
        } else {
            let registration: { username?: unknown; teamName?: unknown } = {};
            const registrationValue = cookieStore.get(registrationCookie)?.value;
            if (registrationValue) {
                try {
                    registration = JSON.parse(Buffer.from(registrationValue, "base64url").toString("utf8")) as typeof registration;
                } catch {
                    return clearCookie(fail(request, mode, "profile_required"));
                }
            }
            const username = typeof registration.username === "string" ? registration.username.trim() : "";
            const teamName = typeof registration.teamName === "string" ? registration.teamName.trim() : "";
            if (username.length < 3 || teamName.length < 2) {
                return clearCookie(fail(request, mode, "profile_required"));
            }
            account = await prisma.user.create({
                data: {
                    username,
                    teamName,
                    email,
                    googleId,
                    emailVerifiedAt: verifiedAt,
                    passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
                    avatar: "⚽",
                },
            });
        }

        await createSession(account.id);
        return clearCookie(NextResponse.redirect(new URL("/", request.url)));
    } catch (error) {
        console.error("Google sign-in failed.", error);
        return clearCookie(fail(request, mode, "google_unavailable"));
    }
}
