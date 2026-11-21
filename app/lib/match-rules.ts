export const ACTIVE_MATCH_STATUSES = ["OPEN", "ACCEPTED", "REVIEW", "DISPUTED"] as const;
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateEvidenceDataUrl(value: string) {
    const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
    if (!match || !EVIDENCE_TYPES.has(match[1])) return { ok: false as const, error: "Upload a PNG, JPEG, or WebP screenshot." };
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > EVIDENCE_MAX_BYTES) return { ok: false as const, error: "Screenshot must be 5 MB or smaller." };
    const signature = match[1] === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : match[1] === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) : bytes.subarray(0, 4).equals(Buffer.from("RIFF")) && bytes.subarray(8, 12).equals(Buffer.from("WEBP"));
    if (!signature) return { ok: false as const, error: "The screenshot file type could not be verified." };
    return { ok: true as const };
}
