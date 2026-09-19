import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const sessionCookie = "noble-gamers-session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + sessionDurationMs) } });
    (await cookies()).set(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionDurationMs / 1000 });
}

export async function getCurrentUser() {
    const token = (await cookies()).get(sessionCookie)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
}

export async function destroySession() {
    const token = (await cookies()).get(sessionCookie)?.value;
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    (await cookies()).delete(sessionCookie);
}