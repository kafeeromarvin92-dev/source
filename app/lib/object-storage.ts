import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/;

function storageRoot() {
    const configured = process.env.OBJECT_STORAGE_DIR || ".data/objects";
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function remoteStorageConfigured() {
    return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_REGION);
}

function getRemoteStorage() {
    if (!remoteStorageConfigured()) return null;
    return {
        client: new S3Client({ forcePathStyle: true }),
        bucket: process.env.NEON_OBJECT_STORAGE_BUCKET || "media",
    };
}

export function parseImageDataUrl(value: string) {
    const match = value.match(DATA_URL);
    if (!match) return null;
    return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

export async function storeImageDataUrl(folder: "avatars" | "evidence", dataUrl: string, objectId: string = randomUUID()) {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) throw new Error("Unsupported image data.");
    const extension = parsed.contentType === "image/jpeg" ? "jpg" : parsed.contentType.replace("image/", "");
    const key = `${folder}/${objectId}.${extension}`;
    const remote = getRemoteStorage();
    if (remote) {
        await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: parsed.bytes, ContentType: parsed.contentType, CacheControl: "public, max-age=3600" }));
        return { key, contentType: parsed.contentType };
    }
    if (process.env.NODE_ENV === "production") throw new Error("Persistent object storage is not configured.");
    const target = path.join(storageRoot(), key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, parsed.bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
        await writeFile(target, parsed.bytes);
    });
    return { key, contentType: parsed.contentType };
}

export async function readStoredObject(key: string) {
    if (!/^(avatars|evidence)\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp)$/.test(key)) return null;
    const remote = getRemoteStorage();
    if (remote) {
        try {
            const response = await remote.client.send(new GetObjectCommand({ Bucket: remote.bucket, Key: key }));
            return response.Body ? Buffer.from(await response.Body.transformToByteArray()) : null;
        } catch {
            return null;
        }
    }
    if (process.env.NODE_ENV === "production") return null;
    try {
        return await readFile(path.join(storageRoot(), key));
    } catch {
        return null;
    }
}

export function imageContentType(key: string) {
    return key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
}

export function avatarUrl(userId: string, avatar: string | null | undefined) {
    if (!avatar || avatar.startsWith("data:image/") || avatar.startsWith("avatars/")) return avatar ? `/api/media/avatar/${userId}` : "";
    return avatar;
}

export function evidenceUrl(submissionId: string) {
    return `/api/media/evidence/${submissionId}`;
}
