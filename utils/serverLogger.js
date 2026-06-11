const ServerLog = require('../models/serverLogSchema');
const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

// Helper to check if an action is a moderation action
const MOD_ACTIONS = [
    'BAN', 'FORCE_BAN', 'SOFT_BAN', 'UNBAN', 'KICK', 'TIMEOUT', 
    'REMOVE_TIMEOUT', 'WARN', 'WARN_CLEAR', 'WARN_REMOVE', 
    'PURGE', 'ROLE_ADD', 'ROLE_REMOVE', 'TEMP_ROLE_ADD', 'TEMP_ROLE_REMOVE',
    'LOCK', 'UNLOCK'
];

/**
 * Resolves the target Discord log channel ID based on settings and fallback rules.
 */
function getLogChannelId(settings, guildId, logType) {
    const isSupportServer = guildId === '1254400737807700019';
    if (!settings?.logging?.enabled && !isSupportServer) {
        return null;
    }

    // Support server default channel IDs (Server ID: 1254400737807700019)
    const SUPPORT_SERVER_DEFAULTS = {
        text: '1514722518718480476',
        media: '1514722619281117204',
        reaction: '1514723039604904076',
        antispam: '1514724086545256598',
        mod: '1514722703016202380'
    };

    let targetChannelId = null;

    if (logType === 'text') {
        targetChannelId = settings?.logging?.msgLogChannelId;
    } else if (logType === 'media') {
        targetChannelId = settings?.logging?.mediaLogChannelId;
    } else if (logType === 'reaction') {
        targetChannelId = settings?.logging?.reactionLogChannelId;
    } else if (logType === 'antispam') {
        targetChannelId = settings?.logging?.antispamLogChannelId;
    } else if (logType === 'mod') {
        targetChannelId = settings?.logging?.modLogChannelId;
    }

    if (targetChannelId) {
        return targetChannelId;
    }

    // Fallbacks
    if (isSupportServer) {
        return SUPPORT_SERVER_DEFAULTS[logType] || settings?.logging?.channelId || null;
    }

    return settings?.logging?.channelId || null;
}

/**
 * Sends a message/embed payload to the resolved Discord channel for the given log type.
 */
async function sendDiscordLog(guild, logType, payload, avoidChannelId = null) {
    try {
        const settings = await GuildSettings.findOne({ guildId: guild.id }).lean();
        const targetChannelId = getLogChannelId(settings, guild.id, logType);

        if (!targetChannelId) return;
        if (avoidChannelId && targetChannelId === avoidChannelId) return;

        const logChannel = guild.channels.cache.get(targetChannelId);
        if (logChannel) {
            await logChannel.send(payload);
        }
    } catch (err) {
        console.error(`[ServerLogger] Failed to send Discord log (type: ${logType}):`, err);
    }
}

/**
 * Logs a server event to the database, and routes to the Mod Log Discord channel if applicable.
 */
async function logServerEvent(guildId, action, details, executor = null, target = null, extra = null) {
    try {
        // Save to DB
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

        // Check if we can route this mod log to Discord
        if (global.client && MOD_ACTIONS.includes(action)) {
            const guild = global.client.guilds.cache.get(guildId);
            if (guild) {
                const embed = new EmbedBuilder()
                    .setTimestamp()
                    .setAuthor({ 
                        name: executor?.tag || executor?.username || 'System', 
                        iconURL: executor?.displayAvatarURL ? executor.displayAvatarURL({ dynamic: true }) : null 
                    });

                let actionName = action.replace(/_/g, ' ');
                actionName = actionName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

                let color = 0x3b82f6; // Blue (Default)
                if (action.includes('BAN') || action === 'KICK') color = 0xef4444; // Red
                else if (action.includes('TIMEOUT') || action.includes('WARN')) color = 0xf59e0b; // Orange
                else if (action.includes('ROLE') || action.includes('LOCK')) color = 0x8b5cf6; // Purple
                else if (action === 'UNBAN') color = 0x10b981; // Green

                embed.setColor(color);
                embed.setTitle(`🛡️ Mod Action: ${actionName}`);

                let desc = `**Moderator:** <@${executor?.id || '0'}> (\`${executor?.id || 'System'}\`)\n`;
                if (target) {
                    if (action === 'PURGE' || action === 'LOCK' || action === 'UNLOCK') {
                        desc += `**Channel:** <#${target.id}> (\`${target.id}\`)\n`;
                    } else {
                        desc += `**Target:** <@${target.id}> (\`${target.id}\`)\n`;
                    }
                }
                desc += `**Details:** ${details}`;

                embed.setDescription(desc);

                if (extra && Object.keys(extra).length > 0) {
                    if (extra.duration) {
                        embed.addFields({ name: 'Duration', value: `${extra.duration}`, inline: true });
                    }
                    if (extra.roleName) {
                        embed.addFields({ name: 'Role', value: `${extra.roleName}`, inline: true });
                    }
                    if (extra.count) {
                        embed.addFields({ name: 'Purged Messages Count', value: `${extra.count}`, inline: true });
                    }
                }

                await sendDiscordLog(guild, 'mod', { embeds: [embed] });
            }
        }
    } catch (err) {
        console.error('[ServerLogger] Failed to save/process server log entry:', err);
    }
}

module.exports = {
    logServerEvent,
    sendDiscordLog,
    getLogChannelId
};
