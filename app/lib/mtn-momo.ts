const defaultBaseUrl = "https://dev-appx.developers.mtn.com";

type MtnResponse = Record<string, unknown>;

export class MtnMomoError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "MtnMomoError";
    }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function getConfig() {
    const consumerKey = process.env.MTN_CONSUMER_KEY;
    const consumerSecret = process.env.MTN_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) throw new Error("MTN_PAYMENTS_NOT_CONFIGURED");
    return {
        consumerKey,
        consumerSecret,
        baseUrl: (process.env.MTN_PAYMENTS_BASE_URL || defaultBaseUrl).replace(/\/$/, ""),
    };
}

export async function getMtnAccessToken() {
    const config = getConfig();
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return { ...config, token: cachedToken.value };

    const response = await fetch(`${config.baseUrl}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: config.consumerKey, client_secret: config.consumerSecret }),
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
    return [data.message, data.error, data.detail, data.error_description].find((value): value is string => typeof value === "string" && value.length > 0) || "MTN rejected the payment request.";
}

export async function requestMtnPayment(input: { reference: string; phoneNumber: string; amount: number; description: string }) {
    const config = await getMtnAccessToken();
    const providerReference = crypto.randomUUID();
    const response = await fetch(`${config.baseUrl}/api/payments/v1/requesttopay`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.token}`,
            "X-Reference-Id": providerReference,
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
    const config = await getMtnAccessToken();
    const response = await fetch(`${config.baseUrl}/api/payments/v1/requesttopay/${encodeURIComponent(reference)}`, {
        headers: {
            Authorization: `Bearer ${config.token}`,
        },
        cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as MtnResponse;
    if (!response.ok) throw new MtnMomoError(response.status, getErrorMessage(data));
    return { status: typeof data.status === "string" ? data.status.toUpperCase() : "PENDING", data };
}