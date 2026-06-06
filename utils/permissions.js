const GuildSettings = require('../models/guildSettingsSchema');
const config = require('../config.json');

/**
 * Checks if a member has permission to configure a specific module.
 * @param {object} context - Discord message or interaction
 * @param {string} tab - Tab name ('bot', 'triggers', 'giveaways', 'embed', 'mediaonly', 'automod', 'censor', 'music')
 * @returns {Promise<boolean>}
 */
async function checkCommandPermission(context, tab) {
    const member = context.member;
    const guild = context.guild;
    const user = context.user || context.author;

    if (!member || !guild || !user) return false;

    // Developer override
    if (user.id === config.devId) return true;

    // Guild Owner override
    if (guild.ownerId === user.id) return true;

    // Administrator override
    if (member.permissions.has('Administrator')) return true;

    // Check custom roles in database
    try {
        const guildConfig = await GuildSettings.findOne({ guildId: guild.id }).lean();
        const dbPerms = guildConfig?.dashboardPermissions || {};
        const allowedRoles = dbPerms[tab] || [];
        if (allowedRoles.length === 0) return false; // Default: owner/admin only if empty

        const userRoles = member.roles.cache.map(r => r.id);
        return allowedRoles.some(r => userRoles.includes(r));
    } catch (err) {
        console.error('[Permissions] Error checking command permission:', err);
        return false;
    }
}

module.exports = { checkCommandPermission };
