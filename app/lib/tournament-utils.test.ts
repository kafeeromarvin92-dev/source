// Runtime validation coverage for tournament bracket and prize behavior.
import { describe, expect, it } from "vitest";
import {
    calculateTournamentPrizes,
    getBracketSeedOrder,
    getTournamentRoundLabel,
    isPrizeSplit,
} from "./tournament-utils";

describe("tournament bracket and prize rules", () => {
    it("places top seeds in opposite sides of each 8-player opening match", () => {
        expect(getBracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    });

    it("labels rounds correctly for both short and full brackets", () => {
        expect(getTournamentRoundLabel(1, 2)).toBe("SEMI");
        expect(getTournamentRoundLabel(2, 2)).toBe("FINAL");
        expect(getTournamentRoundLabel(1, 5)).toBe("ROUND OF 32");
        expect(getTournamentRoundLabel(3, 5)).toBe("QUARTER");
    });

    it("splits an 8-player 8,000-coin pot into the configured winner, runner-up, and semi prizes", () => {
        const split = { winner: 70, runnerUp: 20, semi: 10 };
        expect(isPrizeSplit(split)).toBe(true);
        expect(calculateTournamentPrizes(8000, split)).toEqual({ winner: 5600, runnerUp: 1600, semiEach: 400 });
    });

    it("assigns any integer-rounding remainder to the winner and rejects invalid percentages", () => {
        const split = { winner: 33, runnerUp: 33, semi: 34 };
        const prizes = calculateTournamentPrizes(3, split);
        expect(prizes.winner + prizes.runnerUp + prizes.semiEach * 2).toBe(3);
        expect(isPrizeSplit({ winner: 70, runnerUp: 20, semi: 9 })).toBe(false);
    });
});
