const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageUpdate',

    async execute(oldMessage, newMessage, client) {
        // Ignore bots and direct messages
        if (!oldMessage.guild || oldMessage.author?.bot) return;

        // Skip partial messages where data isn't loaded
        if (oldMessage.partial || newMessage.partial) return;

        // Ignore if content did not change (e.g. embeds added, pin changes)
        if (oldMessage.content === newMessage.content) return;

        // ─── Logging System ───
        try {
            const settings = await GuildSettings.findOne({ guildId: oldMessage.guild.id }).lean();
            
            if (settings?.logging?.messageUpdate !== false) {
                const { logServerEvent } = require('../utils/serverLogger');
                await logServerEvent(
                    oldMessage.guild.id,
                    'MESSAGE_UPDATE',
                    `Message edited in #${oldMessage.channel.name}`,
                    oldMessage.author,
                    null,
                    {
                        channelId: oldMessage.channel.id,
                        channelName: oldMessage.channel.name,
                        oldContent: oldMessage.content || '',
                        newContent: newMessage.content || ''
                    }
                );
            }

            if (settings?.logging?.enabled && settings.logging?.channelId && settings.logging?.messageUpdate !== false) {
                // Avoid logging in the log channel itself to prevent loops
                if (oldMessage.channel.id === settings.logging.channelId) return;

                const logChannel = oldMessage.guild.channels.cache.get(settings.logging.channelId);
                if (logChannel) {
                    const editEmbed = new EmbedBuilder()
                        .setColor(0x3b82f6) // Soft premium blue
                        .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL({ dynamic: true }) })
                        .setTitle(`✏️ Message Edited`)
                        .setDescription(`**Author:** <@${oldMessage.author.id}> (\`${oldMessage.author.id}\`)\n**Channel:** <#${oldMessage.channel.id}> (\`${oldMessage.channel.id}\`)`)
                        .setTimestamp();

                    const oldCapped = oldMessage.content
                        ? (oldMessage.content.length > 1000 ? oldMessage.content.substring(0, 997) + '...' : oldMessage.content)
                        : '*None*';
                    const newCapped = newMessage.content
                        ? (newMessage.content.length > 1000 ? newMessage.content.substring(0, 997) + '...' : newMessage.content)
                        : '*None*';

                    editEmbed.addFields(
                        { name: 'Before', value: oldCapped },
                        { name: 'After', value: newCapped }
                    );

                    logChannel.send({ embeds: [editEmbed] }).catch(err => {
                        console.error(`[Logging] Failed to send message edit to ${logChannel.name}:`, err.message);
                    });
                }
            }
        } catch (err) {
            console.error('Error in messageUpdate logging handler:', err);
        }
    }
};
