export const ONE_SIDED_REVIEW_GRACE_MS = 10 * 60 * 1000;

export function getAdminReviewAvailability(
    status: string,
    submissionCount: number,
    firstSubmissionAt: string | Date | null | undefined,
    now = Date.now(),
) {
    if (status === "DISPUTED" || (status === "REVIEW" && submissionCount >= 2)) {
        return { eligible: true, availableAt: null, remainingMs: 0 };
    }

    if (status !== "REVIEW" || submissionCount !== 1 || !firstSubmissionAt) {
        return { eligible: false, availableAt: null, remainingMs: 0 };
    }

    const availableAt = new Date(firstSubmissionAt).getTime() + ONE_SIDED_REVIEW_GRACE_MS;
    const remainingMs = Math.max(0, availableAt - now);
    return { eligible: remainingMs === 0, availableAt, remainingMs };
}
