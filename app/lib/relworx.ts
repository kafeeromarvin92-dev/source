export async function requestRelworxPayment(input: { reference: string; phoneNumber: string; amount: number; description: string }): Promise<never> {
    void input;
    // TODO: MoMo Phase 2 - restore the Relworx request when mobile-money payments return.
    throw new Error("RELWORX_DISABLED");
}
