const Vote = require('../models/voteSchema');

/**
 * Calculates the active voting XP multiplier and remaining boost time for a user.
 * 
 * Rules:
 * - First 20 minutes (0 - 20 mins): 3× XP
 * - Next 3 hours 40 minutes (20 mins - 4 hours): 2× XP
 * - Beyond 4 hours: 1× XP (Expired)
 * 
 * @param {string} userId 
 * @returns {Promise<{ active: boolean, multiplier: number, phase: '3x'|'2x'|null, remainingMs: number, phaseExpiryEpoch: number|null, lastVotedAt: Date|null }>}
 */
async function getVoteXpStatus(userId) {
    try {
        const voteData = await Vote.findOne({ userId }).lean();
        if (!voteData || !voteData.lastVotedAt) {
            return {
                active: false,
                multiplier: 1,
                phase: null,
                remainingMs: 0,
                phaseExpiryEpoch: null,
                lastVotedAt: null
            };
        }

        const now = Date.now();
        const lastVotedTime = new Date(voteData.lastVotedAt).getTime();
        const elapsedMs = now - lastVotedTime;

        const THREE_X_DURATION = 20 * 60 * 1000; // 20 minutes
        const TWO_X_TOTAL_DURATION = 4 * 60 * 60 * 1000; // 4 hours total (20m 3x + 3h 40m 2x)

        if (elapsedMs < THREE_X_DURATION) {
            const remainingMs = THREE_X_DURATION - elapsedMs;
            const phaseExpiryEpoch = Math.floor((lastVotedTime + THREE_X_DURATION) / 1000);
            return {
                active: true,
                multiplier: 3,
                phase: '3x',
                remainingMs,
                phaseExpiryEpoch,
                lastVotedAt: voteData.lastVotedAt
            };
        } else if (elapsedMs < TWO_X_TOTAL_DURATION) {
            const remainingMs = TWO_X_TOTAL_DURATION - elapsedMs;
            const phaseExpiryEpoch = Math.floor((lastVotedTime + TWO_X_TOTAL_DURATION) / 1000);
            return {
                active: true,
                multiplier: 2,
                phase: '2x',
                remainingMs,
                phaseExpiryEpoch,
                lastVotedAt: voteData.lastVotedAt
            };
        } else {
            return {
                active: false,
                multiplier: 1,
                phase: null,
                remainingMs: 0,
                phaseExpiryEpoch: null,
                lastVotedAt: voteData.lastVotedAt
            };
        }
    } catch (err) {
        console.error('Error fetching vote XP status:', err);
        return {
            active: false,
            multiplier: 1,
            phase: null,
            remainingMs: 0,
            phaseExpiryEpoch: null,
            lastVotedAt: null
        };
    }
}

module.exports = {
    getVoteXpStatus
};
