export const TOURNAMENT_SIZES = [4, 8, 16, 32] as const;
export const TOURNAMENT_ENTRY_FEES = [0, 100, 500, 1000, 5000] as const;

export type PrizeSplit = {
    winner: number;
    runnerUp: number;
    semi: number;
};

export function isTournamentSize(value: unknown): value is typeof TOURNAMENT_SIZES[number] {
    return typeof value === "number" && TOURNAMENT_SIZES.some((size) => size === value);
}

export function isTournamentEntryFee(value: unknown): value is typeof TOURNAMENT_ENTRY_FEES[number] {
    return typeof value === "number" && TOURNAMENT_ENTRY_FEES.some((fee) => fee === value);
}

export function isPrizeSplit(value: unknown): value is PrizeSplit {
    if (!value || typeof value !== "object") return false;
    const split = value as Record<string, unknown>;
    return Number.isInteger(split.winner)
        && Number.isInteger(split.runnerUp)
        && Number.isInteger(split.semi)
        && (split.winner as number) >= 0
        && (split.runnerUp as number) >= 0
        && (split.semi as number) >= 0
        && (split.winner as number) + (split.runnerUp as number) + (split.semi as number) === 100;
}

export function getTournamentRoundCount(size: number) {
    return Math.log2(size);
}

export function getTournamentRoundLabel(round: number, roundCount: number) {
    const remaining = roundCount - round;
    if (remaining === 0) return "FINAL";
    if (remaining === 1) return "SEMI";
    if (remaining === 2) return "QUARTER";
    return `ROUND OF ${2 ** (remaining + 1)}`;
}

export function getBracketSeedOrder(size: number) {
    let order = [1, 2];
    while (order.length < size) {
        const nextSize = order.length * 2;
        order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
    }
    return order;
}

export function calculateTournamentPrizes(pot: number, split: PrizeSplit) {
    const winner = Math.floor(pot * split.winner / 100);
    const runnerUp = Math.floor(pot * split.runnerUp / 100);
    const semiEach = Math.floor(pot * split.semi / 200);
    return {
        winner: winner + (pot - winner - runnerUp - semiEach * 2),
        runnerUp,
        semiEach,
    };
}
