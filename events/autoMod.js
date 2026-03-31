/* eslint-disable */
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Censor = require('../models/censorSchema');
const axios = require('axios');

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

        const content = message.content.toLowerCase();
        let isBad = false;
        let matchedWord = '';

        // 1. Check custom blocked words (Local)
        for (const word of settings.blockedWords) {
            if (content.includes(word.toLowerCase())) {
                isBad = true;
                matchedWord = word;
                break;
            }
        }

        // 2. Check API (PurgoMalum) if not already marked bad
        if (!isBad) {
            try {
                const response = await axios.get(`https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(message.content)}`);
                if (response.data === true) {
                    isBad = true;
                    matchedWord = 'Profanity (API Detected)';
                }
            } catch (err) {
                console.error('[AutoMod] PurgoMalum API Error:', err.message);
            }
        }

        // 3. Whitelist check (Double-check)
        // If a word is whitelisted, we should not treat it as bad unless it matches a specific blockedWord.
        // Actually, let's keep it simple: Whitelisted words override API detection but not custom BlockedWords.
        if (isBad && matchedWord === 'Profanity (API Detected)') {
            for (const word of settings.whitelistedWords) {
                if (content.includes(word.toLowerCase())) {
                    isBad = false;
                    break;
                }
            }
        }

        if (isBad) {
            try {
                // Delete the original message
                await message.delete().catch(() => {});

                // Send a warning embed
                const warnEmbed = new EmbedBuilder()
                    .setColor(0xFF4500)
                    .setTitle('👮 AutoMod Action')
                    .setDescription(`<@${message.author.id}>, your message was removed because it contained forbidden language.`)
                    .setFooter({ text: 'Server Moderation' });

                const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                // Log to configured channel
                if (settings.logChannelId) {
                    const logChannel = message.guild.channels.cache.get(settings.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(0xE67E22)
                            .setTitle('🛡️ Filter Violation')
                            .addFields(
                                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Matched', value: `\`${matchedWord}\``, inline: true },
                                { name: 'Content', value: message.content }
                            )
                            .setTimestamp();
                        
                        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }
            } catch (error) {
                console.error('[AutoMod] Error processing violation:', error);
            }
        }
    }
};
