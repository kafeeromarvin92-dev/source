import { randomInt } from "node:crypto";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateChallengeMatchCode() {
    return `${letters[randomInt(letters.length)]}${letters[randomInt(letters.length)]}${randomInt(10)}`;
}
