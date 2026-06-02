const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageDelete',

    async execute(message, client) {
        // Ignore bots and direct messages
        if (!message.guild || message.author?.bot) return;

        // Skip partial messages where data isn't loaded (can't snipe uncached messages)
        if (message.partial) return;

        // Initialize client snipes Map if not present
        if (!client.snipes) {
            client.snipes = new Map();
        }

        // Store the deleted message info keyed by channel ID
        client.snipes.set(message.channel.id, {
            content: message.content || '',
            author: message.author,
            timestamp: message.createdAt || new Date(),
            attachment: message.attachments.first()?.url || null
        });

        // ─── Logging System ───
        try {
            const settings = await GuildSettings.findOne({ guildId: message.guild.id }).lean();
            if (settings?.logging?.enabled && settings.logging?.channelId && settings.logging?.messageDelete !== false) {
                // Avoid logging in the log channel itself to prevent loops
                if (message.channel.id === settings.logging.channelId) return;

                const logChannel = message.guild.channels.cache.get(settings.logging.channelId);
                if (logChannel) {
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

                    logChannel.send({ embeds: [deleteEmbed] }).catch(err => {
                        console.error(`[Logging] Failed to send message delete to ${logChannel.name}:`, err.message);
                    });
                }
            }
        } catch (err) {
            console.error('Error in messageDelete logging handler:', err);
        }
    }
};
