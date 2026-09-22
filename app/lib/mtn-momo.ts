const defaultBaseUrl = "https://sandbox.momodeveloper.mtn.com";
const defaultTargetEnvironment = "sandbox";

type MtnResponse = Record<string, unknown>;

export class MtnMomoError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "MtnMomoError";
    }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function getConfig() {
    const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const apiUser = process.env.MTN_MOMO_API_USER;
    const apiKey = process.env.MTN_MOMO_API_KEY;
    if (!subscriptionKey || !apiUser || !apiKey) throw new Error("MTN_MOMO_NOT_CONFIGURED");
    return {
        subscriptionKey,
        apiUser,
        apiKey,
        baseUrl: (process.env.MTN_MOMO_BASE_URL || defaultBaseUrl).replace(/\/$/, ""),
        targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT || defaultTargetEnvironment,
    };
}

async function getAccessToken() {
    const config = getConfig();
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return { ...config, token: cachedToken.value };

    const response = await fetch(`${config.baseUrl}/collection/token/`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${config.apiUser}:${config.apiKey}`).toString("base64")}`,
            "Ocp-Apim-Subscription-Key": config.subscriptionKey,
            "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as MtnResponse;
    const token = typeof data.access_token === "string" ? data.access_token : null;
    if (!response.ok || !token) throw new MtnMomoError(response.status, "MTN access token request failed.");
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3_600;
    cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1_000 };
    return { ...config, token };
}

function getErrorMessage(data: MtnResponse) {
    return [data.message, data.error, data.detail].find((value): value is string => typeof value === "string" && value.length > 0) || "MTN rejected the payment request.";
}

export async function requestMtnPayment(input: { reference: string; phoneNumber: string; amount: number; description: string }) {
    const config = await getAccessToken();
    const providerReference = crypto.randomUUID();
    const response = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.token}`,
            "X-Reference-Id": providerReference,
            "X-Target-Environment": config.targetEnvironment,
            "Ocp-Apim-Subscription-Key": config.subscriptionKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            amount: String(input.amount),
            currency: "UGX",
            externalId: input.reference,
            payer: { partyIdType: "MSISDN", partyId: input.phoneNumber.replace(/^\+/, "") },
            payerMessage: input.description,
            payeeNote: input.description,
        }),
        cache: "no-store",
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({})) as MtnResponse;
        throw new MtnMomoError(response.status, getErrorMessage(data));
    }
    return { providerReference };
}

export async function getMtnPaymentStatus(reference: string) {
    const config = await getAccessToken();
    const response = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`, {
        headers: {
            Authorization: `Bearer ${config.token}`,
            "X-Target-Environment": config.targetEnvironment,
            "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        },
        cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as MtnResponse;
    if (!response.ok) throw new MtnMomoError(response.status, getErrorMessage(data));
    return { status: typeof data.status === "string" ? data.status.toUpperCase() : "PENDING", data };
}