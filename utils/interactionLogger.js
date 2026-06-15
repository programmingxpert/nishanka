const { ChannelType } = require('discord.js');
const GuildSettings = require('../models/guildSettingsSchema');

const HOST_GUILD_ID = '1252250644748959904';
const LOG_CATEGORY_ID = '1516128301704548493';

// In-memory cache for channel mappings
// guildId -> { channelId, webhookUrl }
const logChannelCache = new Map();

/**
 * Ensures that a text channel and webhook exist in the host category for the given guild.
 * Recreates them automatically if deleted.
 */
async function getOrCreateLogChannel(client, guild) {
    if (!guild) return null;
    
    // Check in-memory cache first
    const cached = logChannelCache.get(guild.id);
    if (cached) {
        return cached;
    }

    // Check Database
    let settings = await GuildSettings.findOne({ guildId: guild.id });
    if (settings && settings.interactionLogWebhookUrl) {
        // Double check if the channel still exists in the host guild
        try {
            const hostGuild = client.guilds.cache.get(HOST_GUILD_ID) || await client.guilds.fetch(HOST_GUILD_ID).catch(() => null);
            if (hostGuild) {
                const chan = hostGuild.channels.cache.get(settings.interactionLogChannelId) || await hostGuild.channels.fetch(settings.interactionLogChannelId).catch(() => null);
                if (chan) {
                    const data = {
                        channelId: settings.interactionLogChannelId,
                        webhookUrl: settings.interactionLogWebhookUrl
                    };
                    logChannelCache.set(guild.id, data);
                    return data;
                }
            }
        } catch (err) {
            console.warn(`[Interaction Logger] Error checking host channel existence for guild ${guild.id}:`, err.message);
        }
    }

    // Needs creation
    try {
        const hostGuild = client.guilds.cache.get(HOST_GUILD_ID) || await client.guilds.fetch(HOST_GUILD_ID).catch(() => null);
        if (!hostGuild) {
            console.error(`[Interaction Logger] Host guild (${HOST_GUILD_ID}) not found or bot lacks access.`);
            return null;
        }

        const category = hostGuild.channels.cache.get(LOG_CATEGORY_ID) || await hostGuild.channels.fetch(LOG_CATEGORY_ID).catch(() => null);
        if (!category) {
            console.error(`[Interaction Logger] Log category (${LOG_CATEGORY_ID}) not found in host guild.`);
            return null;
        }

        // Clean channel name
        const cleanName = guild.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .substring(0, 80);
        const channelName = `logs-${cleanName || guild.id}`;

        console.log(`[Interaction Logger] Creating log channel for server: ${guild.name} (${guild.id})`);
        const newChannel = await hostGuild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: LOG_CATEGORY_ID,
            topic: `Interaction activity logs for Discord Server: ${guild.name} (${guild.id})`
        });

        console.log(`[Interaction Logger] Creating logging webhook for server: ${guild.name} (${guild.id})`);
        const webhook = await newChannel.createWebhook({
            name: 'Nishanka Interaction Logger',
            avatar: client.user.displayAvatarURL({ extension: 'png' })
        });

        // Save in DB
        if (!settings) {
            settings = new GuildSettings({ guildId: guild.id });
        }
        settings.interactionLogChannelId = newChannel.id;
        settings.interactionLogWebhookUrl = webhook.url;
        await settings.save();

        const data = {
            channelId: newChannel.id,
            webhookUrl: webhook.url
        };
        logChannelCache.set(guild.id, data);
        return data;
    } catch (err) {
        console.error(`[Interaction Logger] Failed to create channel or webhook for guild ${guild.id}:`, err);
        return null;
    }
}

/**
 * Logs a bot interaction to the designated server channel using a webhook.
 * This runs asynchronously to prevent blocking the bot's execution speed.
 */
function logInteraction(client, guild, user, type, detail, additionalFields = []) {
    if (!guild) return; // Ignores DMs

    // Fire-and-forget: run asynchronously to not affect bot performance
    (async () => {
        try {
            const logInfo = await getOrCreateLogChannel(client, guild);
            if (!logInfo || !logInfo.webhookUrl) return;

            const fields = [
                { name: '👤 User', value: `${user.tag} (\`${user.id}\`)`, inline: true },
                { name: '🏰 Server', value: `${guild.name} (\`${guild.id}\`)`, inline: true },
                { name: '⚙️ Type', value: type, inline: true }
            ];

            if (detail) {
                fields.push({ name: '📝 Details', value: detail, inline: false });
            }

            if (additionalFields && additionalFields.length > 0) {
                fields.push(...additionalFields);
            }

            const embed = {
                title: '🤖 Bot Interaction Log',
                color: type === 'SLASH_COMMAND' ? 0x7c6cf0 : type === 'PREFIX_COMMAND' ? 0x3b82f6 : 0x10b981,
                fields: fields,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(logInfo.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });

            if (response.status === 404) {
                // Webhook was deleted, clear cache to force recreation next time
                console.warn(`[Interaction Logger] Webhook for guild ${guild.id} returned 404. Invalidating cache.`);
                logChannelCache.delete(guild.id);
                
                // Clear from settings database too
                await GuildSettings.findOneAndUpdate(
                    { guildId: guild.id },
                    { interactionLogWebhookUrl: null, interactionLogChannelId: null }
                );
            }
        } catch (err) {
            console.error('[Interaction Logger] Error sending log to webhook:', err.message);
        }
    })().catch(err => console.error('[Interaction Logger] Asynchronous logging thread error:', err));
}

module.exports = {
    logInteraction,
    getOrCreateLogChannel
};
