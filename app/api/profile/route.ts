import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/server-auth";
import { prisma } from "../../lib/prisma";
import { avatarUrl, parseImageDataUrl, storeImageDataUrl } from "../../lib/object-storage";
import { isSupportedCountry } from "../../lib/countries";

export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log in to edit your profile." }, { status: 401 });
    const body = await request.json().catch(() => null) as { username?: string; teamName?: string; avatar?: string; bio?: string; gameTags?: string; country?: string } | null;
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : user.username;
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : user.teamName;
    const avatar = typeof body?.avatar === "string" ? body.avatar : user.avatar;
    const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 160) : user.bio;
    const gameTags = typeof body?.gameTags === "string" ? body.gameTags.split(",").map((tag) => tag.trim().toUpperCase()).filter(Boolean).slice(0, 5).join(",") || "DLS" : user.gameTags;
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return NextResponse.json({ error: "Username must be 3–20 characters using letters, numbers, or underscores." }, { status: 400 });
    const genericTeamNames = new Set(["team", "test", "unknown", "n/a", "na", "none", "abc"]);
    if (teamName.length < 3 || teamName.length > 50 || genericTeamNames.has(teamName.toLowerCase())) return NextResponse.json({ error: "Enter the real in-game team name." }, { status: 400 });
    const countryValue = body?.country;
    const country = countryValue === "" ? null : countryValue === undefined ? user.country : isSupportedCountry(countryValue) ? countryValue : null;
    if (countryValue !== undefined && countryValue !== "" && country === null) return NextResponse.json({ error: "Choose a supported country or leave it blank." }, { status: 400 });
    const avatarData = avatar.startsWith("data:image/") ? parseImageDataUrl(avatar) : null;
    if (avatar.startsWith("data:image/") && (!avatarData || avatarData.bytes.length > 1_000_000)) return NextResponse.json({ error: "Team logo must be a PNG, JPEG, or WebP under 1 MB." }, { status: 400 });
    if (avatar !== user.avatar && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar)) return NextResponse.json({ error: "Upload a PNG, JPEG, or WebP team logo." }, { status: 400 });
    const duplicate = await prisma.user.findFirst({ where: { username, id: { not: user.id } } });
    if (duplicate) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    const storedAvatar = avatarData ? (await storeImageDataUrl("avatars", avatarData ? avatar : "", user.id)).key : avatar;
    const updated = await prisma.user.update({ where: { id: user.id }, data: { username, teamName, avatar: storedAvatar, bio, gameTags, country } });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id }, select: { balance: true } });
    return NextResponse.json({ user: { id: updated.id, username: updated.username, teamName: updated.teamName, email: updated.email, avatar: avatarUrl(updated.id, updated.avatar), isAdmin: updated.isAdmin, bio: updated.bio, gameTags: updated.gameTags, country: updated.country, coinBalance: wallet.balance } });
}
