const ServerLog = require('../models/serverLogSchema');

/**
 * Logs a server event to the database.
 * @param {string} guildId - The Discord guild ID.
 * @param {string} action - The action type (e.g. MESSAGE_DELETE).
 * @param {string} details - A brief description of the event.
 * @param {object} [executor] - The Discord user object who performed the action.
 * @param {object} [target] - The Discord user/role/channel object targeted by the action.
 * @param {object} [extra] - Additional context/metadata for the log entry.
 */
async function logServerEvent(guildId, action, details, executor = null, target = null, extra = null) {
    try {
        const logEntry = new ServerLog({
            guildId,
            action,
            details,
            executorId: executor?.id || null,
            executorTag: executor?.tag || executor?.username || null,
            targetId: target?.id || null,
            targetTag: target?.tag || target?.username || null,
            timestamp: new Date(),
            extra: extra || {}
        });
        await logEntry.save();
    } catch (err) {
        console.error('[ServerLogger] Failed to save server log entry:', err);
    }
}

module.exports = {
    logServerEvent
};
