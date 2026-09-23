import { NextResponse } from "next/server";
import { settleMtnTransaction } from "../../lib/mtn-settlement";
import { prisma } from "../../lib/prisma";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { status?: string; status2?: string; externalId?: string; referenceId?: string } | null;
    const providerStatus = body?.status || body?.status2;
    const transaction = body?.externalId
        ? await prisma.walletTransaction.findUnique({ where: { id: body.externalId } })
        : body?.referenceId
            ? await prisma.walletTransaction.findFirst({ where: { providerRef: body.referenceId } })
            : null;
    if (!providerStatus || !transaction) return NextResponse.json({ error: "A valid status and payment reference are required." }, { status: 400 });
    await settleMtnTransaction(transaction.id, providerStatus);
    return NextResponse.json({ received: true });
}