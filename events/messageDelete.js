const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

function hasMedia(message) {
    if (message.attachments && message.attachments.size > 0) {
        for (const [_, attachment] of message.attachments) {
            const type = attachment.contentType || '';
            if (type.startsWith('image/') || type.startsWith('video/')) {
                return true;
            }
            const name = (attachment.name || '').toLowerCase();
            if (/\.(png|jpe?g|gif|webp|mp4|webm|mov|avi|wmv)$/i.test(name)) {
                return true;
            }
        }
    }
    if (message.content) {
        const content = message.content.toLowerCase();
        if (/\.(png|jpe?g|gif|webp|mp4|webm|mov)(\?|$)/i.test(content) || 
            content.includes('tenor.com') || 
            content.includes('giphy.com')) {
            return true;
        }
    }
    return false;
}

module.exports = {
    name: 'messageDelete',

    async execute(message, client) {
        // Ignore bots and direct messages
        if (!message.guild || message.author?.bot) return;

        // Skip partial messages where data isn't loaded (can't snipe uncached messages)
        if (message.partial) return;

        // Fetch guild settings
        let settings = null;
        try {
            settings = await GuildSettings.findOne({ guildId: message.guild.id }).lean();
        } catch (err) {
            console.error('Error fetching settings in messageDelete:', err);
        }

        // Store the deleted message info keyed by channel ID (only if snipe is enabled)
        if (settings?.bot?.snipeEnabled !== false) {
            if (!client.snipes) {
                client.snipes = new Map();
            }
            client.snipes.set(message.channel.id, {
                content: message.content || '',
                author: message.author,
                timestamp: message.createdAt || new Date(),
                attachment: message.attachments.first()?.url || null
            });
        }

        // ─── Logging System ───
        try {
            if (settings?.logging?.messageDelete !== false) {
                const { logServerEvent, sendDiscordLog } = require('../utils/serverLogger');
                await logServerEvent(
                    message.guild.id,
                    'MESSAGE_DELETE',
                    `Message deleted in #${message.channel.name}`,
                    message.author,
                    null,
                    {
                        channelId: message.channel.id,
                        channelName: message.channel.name,
                        content: message.content || '',
                        attachmentUrl: message.attachments.first()?.url || null
                    }
                );

                const deleteEmbed = new EmbedBuilder()
                    .setColor(0xef4444) // Coral red
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`🗑️ Message Deleted`)
                    .setDescription(`**Author:** <@${message.author.id}> (\`${message.author.id}\`)\n**Channel:** <#${message.channel.id}> (\`${message.channel.id}\`)`)
                    .setTimestamp();

                if (message.content) {
                    const contentCapped = message.content.length > 1000
                        ? message.content.substring(0, 997) + '...'
                        : message.content;
                    deleteEmbed.addFields({ name: 'Content', value: contentCapped });
                } else {
                    deleteEmbed.addFields({ name: 'Content', value: '*None (possibly embed or system message)*' });
                }

                const attachment = message.attachments.first();
                if (attachment) {
                    deleteEmbed.addFields({ name: 'Attachment', value: `[${attachment.name || 'File'}](${attachment.url})` });
                    if (attachment.contentType?.startsWith('image/')) {
                        deleteEmbed.setImage(attachment.url);
                    }
                }

                // Classify destination
                const logType = hasMedia(message) ? 'media' : 'text';

                // Avoid loops: sendDiscordLog will check avoidChannelId
                await sendDiscordLog(message.guild, logType, { embeds: [deleteEmbed] }, message.channel.id);
            }
        } catch (err) {
            console.error('Error in messageDelete logging handler:', err);
        }
    }
};
