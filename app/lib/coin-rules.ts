export const ENTRY_STAKES = [100, 200, 500] as const;
export const STARTER_BALANCE = 1000;

export type EntryStake = typeof ENTRY_STAKES[number];

export function isEntryStake(value: unknown): value is EntryStake {
    return typeof value === "number" && ENTRY_STAKES.some((stake) => stake === value);
}

export function calculateMatchEconomy(entryStake: EntryStake) {
    const totalPot = entryStake * 2;
    const winnerPayout = Math.floor(totalPot * 0.9);
    return {
        totalPot,
        winnerPayout,
        houseFee: totalPot - winnerPayout,
    };
}
