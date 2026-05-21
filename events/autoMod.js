/* eslint-disable */
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Censor = require('../models/censorSchema');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Exempt Administrators
        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const guildId = message.guild.id;

        // Fetch settings from cache or DB
        let settings = client.censorCache.get(guildId);
        if (!settings || Date.now() - settings.timestamp > 60000) {
            settings = await Censor.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );
            settings = { ...settings.toObject(), timestamp: Date.now() };
            client.censorCache.set(guildId, settings);
        }

        if (!settings.enabled) return;

        const channelId = message.channel.id;
        // Ignore Whitelisted Channels
        if (settings.whitelistedChannels && settings.whitelistedChannels.includes(channelId)) return;
        // If Blacklisted Channels exist, ONLY enforce on those channels
        if (settings.blacklistedChannels && settings.blacklistedChannels.length > 0) {
            if (!settings.blacklistedChannels.includes(channelId)) return;
        }
        let content = message.content.toLowerCase();
        
        // Remove whitelisted words from the content so they don't trigger substring matches
        if (settings.whitelistedWords && settings.whitelistedWords.length > 0) {
            for (const safeWord of settings.whitelistedWords) {
                // Remove all occurrences of the whitelisted word loosely
                content = content.split(safeWord.toLowerCase()).join('');
            }
        }

        let isBad = false;
        let matchedWord = '';
        let tier = ''; // hardcore or restricted

        // 1. Check Hardcore blocked words (Strictly forbidden)
        for (const word of settings.hardcoreWords) {
            if (content.includes(word.toLowerCase())) {
                isBad = true;
                matchedWord = word;
                tier = 'hardcore';
                break;
            }
        }

        // 2. Check Restricted Words (Allowed only in 16+/18+ channels)
        if (!isBad && message.channel.id !== settings.ageRestrictedChannelId) {
            for (const word of settings.restrictedWords) {
                if (content.includes(word.toLowerCase())) {
                    isBad = true;
                    matchedWord = word;
                    tier = 'restricted';
                    break;
                }
            }
        }

        // 3. No longer using external API as per request.
        // The bot now relies solely on hardcoreWords and restrictedWords.

        if (isBad) {
            try {
                // Delete message
                await message.delete().catch(() => {});

                if (tier === 'hardcore') {
                    // Send Hardcore Warning
                    const warnEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🛑 Strictly Forbidden Content')
                        .setDescription(`<@${message.author.id}>, your message was removed because it contained **strictly prohibited** language.`)
                        .setFooter({ text: 'Violation Logged' });

                    const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                    // Log to Mod Channel with STAFF PING
                    if (settings.logChannelId) {
                        const logChannel = message.guild.channels.cache.get(settings.logChannelId);
                        if (logChannel) {
                            const staffPing = settings.staffRoleId ? `<@&${settings.staffRoleId}> ` : '';
                            const logEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle('🚨 Hardcore Filter Violation')
                                .addFields(
                                    { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Matched', value: `\`${matchedWord}\``, inline: true },
                                    { name: 'Content', value: message.content }
                                )
                                .setTimestamp();
                            
                            logChannel.send({ content: staffPing, embeds: [logEmbed] }).catch(() => {});
                        }
                    }
                } else if (tier === 'restricted') {
                    // Send Age-Restricted Advice
                    const ageEmbed = new EmbedBuilder()
                        .setColor(0xFFAA00)
                        .setTitle('🔞 Age-Restricted Content')
                        .setDescription(`<@${message.author.id}>, that content is only allowed in our **16+/18+ channel**.`)
                        .addFields({ name: 'Permitted Channel', value: settings.ageRestrictedChannelId ? `<#${settings.ageRestrictedChannelId}>` : 'Not Configured' })
                        .setFooter({ text: 'Please move the conversation there.' });

                    const ageMsg = await message.channel.send({ embeds: [ageEmbed] });
                    setTimeout(() => ageMsg.delete().catch(() => {}), 10000);
                }

            } catch (error) {
                console.error('[AutoMod] Execution Error:', error);
            }
        }
    }
};
