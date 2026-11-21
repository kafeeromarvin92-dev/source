import { describe, expect, it } from "vitest";
import { generateChallengeMatchCode } from "./challenge-code";

describe("challenge match codes", () => {
    it("generates one shared code in the two-letter, one-digit format", () => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
            expect(generateChallengeMatchCode()).toMatch(/^[A-Z]{2}[0-9]$/);
        }
    });
});
