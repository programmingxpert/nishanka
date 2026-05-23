const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const MediaOnly = require('../models/mediaOnlySchema');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        // Check if the channel is media-only
        const settings = await MediaOnly.findOne({ guildId: message.guild.id, channelId: message.channel.id, enabled: true });
        if (!settings) return;

        // Check moderator exemption
        const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || message.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (isMod && !settings.applyToEveryone) return;

        const hasAttachment = message.attachments.size > 0;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasLink = urlRegex.test(message.content);

        if (hasAttachment || hasLink) {
            // Valid media message - Create a thread if enabled
            if (settings.createThread !== false) {
                try {
                    const threadName = `Discussion - ${message.author.username}`;
                    const thread = await message.startThread({
                        name: threadName.substring(0, 100),
                        autoArchiveDuration: 1440, // 24 hours
                        reason: 'Media-only auto-thread'
                    });

                    await thread.send({
                        content: `💬 **Discussion Thread**\n<@${message.author.id}>, please send all related messages and conversation here only to keep the main channel clean! 📷`
                    }).catch(() => { });
                } catch (error) {
                    console.error('[MediaOnly] Failed to create thread:', error);
                }
            }
        } else {
            // Text only message - Delete and warn
            try {
                await message.delete();

                let description = settings.customWarning || `<@${message.author.id}>, only media (images, videos, links) is allowed in this channel.\nPlease chat in the **media's thread** instead.`;
                description = description
                    .replace(/{user}/g, `<@${message.author.id}>`)
                    .replace(/{mention}/g, `<@${message.author.id}>`)
                    .replace(/{channel}/g, `<#${message.channel.id}>`);

                const warnEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('📷 Media Only Channel')
                    .setDescription(description)
                    .setFooter({ text: 'This message will self-destruct in 10 seconds.' });

                const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
                setTimeout(() => warnMsg.delete().catch(() => { }), 10000);
            } catch (error) {
                console.error('[MediaOnly] Failed to handle violation:', error);
            }
        }
    }
};
