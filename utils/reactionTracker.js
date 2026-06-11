// Memory cache for tracking reactions
const reactionCache = new Map();

module.exports = {
    reactionCache,

    /**
     * Record a reaction add and check for spam.
     * @returns {object} { isSpam, count }
     */
    trackAdd(userId, messageId, emojiKey) {
        const now = Date.now();
        const reactionKey = `${messageId}_${emojiKey}`;

        if (!reactionCache.has(userId)) {
            reactionCache.set(userId, {
                recentActions: [],
                adds: new Map()
            });
        }

        const cache = reactionCache.get(userId);
        cache.adds.set(reactionKey, now);
        cache.recentActions.push(now);

        // Keep only recent actions (10 seconds)
        cache.recentActions = cache.recentActions.filter(t => now - t < 10000);

        // Spam threshold check (e.g. > 6 actions in 5 seconds)
        const recent5sCount = cache.recentActions.filter(t => now - t < 5000).length;
        if (recent5sCount >= 6) {
            return { isSpam: true, count: recent5sCount };
        }
        return { isSpam: false };
    },

    /**
     * Record a reaction remove and check if it was added recently (rapid toggle) or spammed.
     * @returns {object} { isSpam, spamCount, isRapid, duration }
     */
    trackRemove(userId, messageId, emojiKey) {
        const now = Date.now();
        const reactionKey = `${messageId}_${emojiKey}`;

        if (!reactionCache.has(userId)) {
            reactionCache.set(userId, {
                recentActions: [],
                adds: new Map()
            });
        }

        const cache = reactionCache.get(userId);
        cache.recentActions.push(now);

        // Keep only recent actions (10 seconds)
        cache.recentActions = cache.recentActions.filter(t => now - t < 10000);

        // Spam check
        const recent5sCount = cache.recentActions.filter(t => now - t < 5000).length;
        const isSpam = recent5sCount >= 6;

        // Check addition duration
        const addedAt = cache.adds.get(reactionKey);
        cache.adds.delete(reactionKey); // clean up

        const isRapid = addedAt ? (now - addedAt < 3000) : false;
        const duration = addedAt ? (now - addedAt) : null;

        return { isSpam, spamCount: recent5sCount, isRapid, duration };
    }
};
