import { prisma } from "./prisma";

type AiResult = { winnerId: string | null; confidence: number; reasoning: string; scores: Record<string, number> };
type SubmissionImage = { playerId: string; image: string };

const reviewPrompt = "Compare these football game result screenshots. Return only JSON with winnerId matching the supplied player id or null, confidence as integer 0-100, scores as an object mapping each supplied player id to their integer score, and a short reasoning. If scores are unreadable or tied, use winnerId null and confidence 0. Never invent a score you cannot read.";

function parseAiResult(text: string): AiResult | null {
    try {
        const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()) as { winnerId?: unknown; confidence?: unknown; scores?: unknown; reasoning?: unknown };
        if ((typeof parsed.winnerId !== "string" && parsed.winnerId !== null) || !Number.isInteger(parsed.confidence)) return null;
        const scores = Object.entries(parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {}).reduce<Record<string, number>>((validScores, [playerId, score]) => {
            if (typeof score === "number" && Number.isInteger(score) && score >= 0) validScores[playerId] = score;
            return validScores;
        }, {});
        return { winnerId: parsed.winnerId, confidence: Math.max(0, Math.min(100, parsed.confidence as number)), scores, reasoning: String(parsed.reasoning || "") };
    } catch {
        return null;
    }
}

function dataUrlParts(image: string) {
    const match = image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    return match ? { mimeType: match[1], data: match[2] } : null;
}

async function askVisionModel(submissions: SubmissionImage[]): Promise<AiResult | null> {
    if (!process.env.AI_API_KEY || submissions.length < 2) return null;
    if (process.env.AI_PROVIDER === "gemini") {
        const parts = submissions.flatMap((submission) => {
            const image = dataUrlParts(submission.image);
            return image ? [{ text: `Player id: ${submission.playerId}` }, { inline_data: { mime_type: image.mimeType, data: image.data } }] : [];
        });
        if (parts.length !== submissions.length * 2) return null;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL || "gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(process.env.AI_API_KEY)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: reviewPrompt }, ...parts] }], generationConfig: { responseMimeType: "application/json" } }),
        });
        if (!response.ok) return null;
        const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        return parseAiResult(data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "");
    }
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: JSON.stringify({
            model: process.env.AI_MODEL || "gpt-4.1-mini",
            input: [{ role: "user", content: [
                { type: "input_text", text: reviewPrompt },
                ...submissions.flatMap((submission) => [{ type: "input_text", text: `Player id: ${submission.playerId}` }, { type: "input_image", image_url: submission.image }]),
            ] }],
        }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { output_text?: string };
    return parseAiResult(data.output_text || "");
}

export async function runAiReview(challengeId: string) {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, include: { submissions: true, decision: true } });
    if (!challenge || challenge.submissions.length < 2 || challenge.decision?.status === "DISPUTED") return null;
    const result = await askVisionModel(challenge.submissions.map((submission: { playerId: string; image: string }) => ({ playerId: submission.playerId, image: submission.image })));
    if (!result) return null;

    const creatorScore = result.scores[challenge.creatorId];
    const acceptedById = challenge.submissions.find((submission: { playerId: string }) => submission.playerId !== challenge.creatorId)?.playerId;
    const acceptedByScore = acceptedById ? result.scores[acceptedById] : undefined;
    const decision = await prisma.matchDecision.update({ where: { challengeId }, data: { status: result.confidence >= 90 && result.winnerId ? "AI_RECOMMENDED" : "PENDING", winnerId: result.winnerId, confidence: result.confidence, reasoning: result.reasoning, creatorScore, acceptedByScore } });
    if (result.confidence >= 90 && result.winnerId) return settleChallenge(challengeId, result.winnerId, undefined);
    return decision;
}

export async function settleChallenge(challengeId: string, winnerId: string, adminId?: string) {
    return prisma.$transaction(async (transaction: Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => unknown ? T : never) => {
        const challenge = await transaction.challenge.findUnique({ where: { id: challengeId }, include: { decision: true, creator: true, acceptedBy: true } });
        if (!challenge || !challenge.acceptedBy || challenge.status === "DISPUTED" || challenge.status === "SETTLED") return null;
        if (winnerId !== challenge.creatorId && winnerId !== challenge.acceptedById) return null;
        const prizePool = challenge.stakeAmount * 2;
        const adminFee = Math.floor(prizePool * 0.1);
        const winnerAmount = prizePool - adminFee;
        await transaction.user.update({ where: { id: winnerId }, data: { walletBalance: { increment: winnerAmount } } });
        await transaction.ledgerEntry.createMany({ data: [
            { challengeId, userId: winnerId, amount: winnerAmount, type: "WINNER_PAYOUT" },
            { challengeId, userId: null, amount: adminFee, type: "ADMIN_FEE" },
        ] });
        await transaction.matchDecision.update({ where: { challengeId }, data: { status: adminId ? "ADMIN_DECIDED" : "SETTLED", winnerId, decidedById: adminId, decidedAt: new Date() } });
        return transaction.challenge.update({ where: { id: challengeId }, data: { status: "SETTLED" } });
    });
}