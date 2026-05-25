/* eslint-disable */
const { Collection, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AutoMod = require('../models/autoModSchema');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        // Fetch settings from cache or DB (with simple cache logic)
        let settings = client.autoModSettings.get(guildId);
        if (!settings || Date.now() - settings.timestamp > 60000) {
            settings = await AutoMod.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );
            settings = { ...settings.toObject(), timestamp: Date.now() };
            client.autoModSettings.set(guildId, settings);
        }

        // Exempt administrators and users with Manage Messages permission
        // EXCEPT if they are in the ignoredUsers list (Watchlist)
        const isIgnored = settings.ignoredUsers?.includes(userId);
        const isMod = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                      message.member.permissions.has(PermissionFlagsBits.ManageMessages);
        
        if (!isIgnored && isMod) {
            return; // Mods bypass everything unless ignored
        }

        // --- Anti-Link Logic ---
        if (settings.antiLink?.enabled) {
            const linkMode = settings.antiLink.filterMode || 'whitelist';
            let enforceLink = false;

            if (linkMode === 'whitelist') {
                if (!settings.antiLink.whitelistedChannels?.includes(channelId)) {
                    enforceLink = true; // Enforce everywhere EXCEPT whitelisted channels
                }
            } else { // blacklist
                if (settings.antiLink.blacklistedChannels?.includes(channelId)) {
                    enforceLink = true; // ONLY enforce in blacklisted channels
                }
            }

            if (enforceLink) {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                if (urlRegex.test(message.content)) {
                    await message.delete().catch(() => {});
                    const warnMsg = await message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('🚫 Links Not Allowed')
                            .setDescription(`<@${userId}>, you are not allowed to post links in this channel.`)
                        ]
                    });
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                    // Send log to configured channel
                    if (settings.logChannelId && (settings.logFeatures?.antiLink !== false)) {
                        const logChannel = message.guild.channels.cache.get(settings.logChannelId) || 
                                           await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
                        if (logChannel) {
                            const contentSnippet = message.content.length > 200 
                                ? message.content.substring(0, 197) + '...' 
                                : message.content;

                            const logEmbed = new EmbedBuilder()
                                .setColor(0xE74C3C) // Red
                                .setTitle('🛡️ AutoMod: Link Blocked')
                                .addFields(
                                    { name: '👤 User', value: `${message.author} (${message.author.tag})`, inline: true },
                                    { name: '💬 Channel', value: `${message.channel}`, inline: true },
                                    { name: '⚙️ Action Taken', value: '`Deleted & Warned`', inline: true },
                                    { name: '📄 Message Snippet', value: contentSnippet ? `\`\`\`\n${contentSnippet}\n\`\`\`` : '*No content*' }
                                )
                                .setFooter({ text: `User ID: ${message.author.id}` })
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                        }
                    }

                    return; // Stop processing further
                }
            }
        }

        // --- Anti-Spam Logic ---
        if (!settings.antiSpamEnabled) return;

        const spamMode = settings.antiSpamFilterMode || 'whitelist';
        let enforceSpam = false;

        if (spamMode === 'whitelist') {
            if (!settings.antiSpamWhitelistedChannels?.includes(channelId)) {
                enforceSpam = true; // Enforce everywhere EXCEPT whitelisted channels
            }
        } else { // blacklist
            if (settings.antiSpamBlacklistedChannels?.includes(channelId)) {
                enforceSpam = true; // ONLY enforce in blacklisted channels
            }
        }

        if (!enforceSpam) return;

        const trackerKey = `${userId}-${guildId}`;

        // --- Repetition Detection ---
        if (settings.repetitionEnabled) {
            const content = message.content.trim().toLowerCase();
            if (content.length > 0) {
                const repData = client.repetitionTracker.get(trackerKey) || { content: '', count: 0, lastTimestamp: 0 };
                
                if (repData.content === content && (Date.now() - repData.lastTimestamp) < 30000) {
                    repData.count++;
                } else {
                    repData.content = content;
                    repData.count = 1;
                }
                repData.lastTimestamp = Date.now();
                client.repetitionTracker.set(trackerKey, repData);

                if (repData.count >= settings.repetitionThreshold) {
                    await handleSpam(message, client, trackerKey, 'Repetitive Spam', settings);
                    return;
                }
            }
        }

        // --- Fast Spam Tracking ---
        if (settings.fastSpam.enabled) {
            if (!client.spamTracker.has(trackerKey)) {
                client.spamTracker.set(trackerKey, []);
            }
            const fastTimestamps = client.spamTracker.get(trackerKey);
            fastTimestamps.push(Date.now());
            if (fastTimestamps.length > settings.fastSpam.threshold) fastTimestamps.shift();

            if (fastTimestamps.length === settings.fastSpam.threshold && (Date.now() - fastTimestamps[0]) < settings.fastSpam.window) {
                await handleSpam(message, client, trackerKey, 'Fast Spam', settings);
                return; // Stop processing further for this message if caught
            }
        }

        // --- Slow Spam Tracking ---
        if (settings.slowSpam.enabled) {
            const slowTrackerKey = `slow-${trackerKey}`;
            if (!client.spamTracker.has(slowTrackerKey)) {
                client.spamTracker.set(slowTrackerKey, []);
            }
            const slowTimestamps = client.spamTracker.get(slowTrackerKey);
            slowTimestamps.push(Date.now());
            if (slowTimestamps.length > settings.slowSpam.threshold) slowTimestamps.shift();

            if (slowTimestamps.length === settings.slowSpam.threshold && (Date.now() - slowTimestamps[0]) < settings.slowSpam.window) {
                await handleSpam(message, client, trackerKey, 'Slow Spam', settings);
            }
        }
    },
};

async function handleSpam(message, client, trackerKey, type, settings) {
    const userId = message.author.id;
    try {
        // Retroactive Deletion (Bulk Delete)
        if (settings.deleteMessages && message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            // Delete the current message
            await message.delete().catch(() => {});

            // Fetch and delete recent messages from the same user (Retroactive)
            const messages = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
            if (messages) {
                const toDelete = messages.filter(m => 
                    m.author.id === userId && 
                    (Date.now() - m.createdTimestamp) < 15000 // Last 15 seconds
                );
                if (toDelete.size > 0) {
                    await message.channel.bulkDelete(toDelete).catch(() => {});
                }
            }
        }

        // Increment violations
        const violations = (client.spamViolations.get(trackerKey) || 0) + 1;
        client.spamViolations.set(trackerKey, violations);

        // Warn user
        if (settings.warnUser) {
            const warnEmbed = new EmbedBuilder()
                .setColor(violations === 1 ? 0xFFFF00 : 0xFF0000)
                .setTitle(`⚠️ ${type} Detected`)
                .setDescription(`<@${userId}>, please slow down! You are sending messages too quickly.`)
                .setFooter({ text: 'Spamming is not allowed in this server.' });
            
            const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
            setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        }

        // Timeout user
        if (settings.timeoutUser && violations >= 2) {
            const timeoutMs = settings.timeoutDuration * (violations - 1);
            if (message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers) && message.member.manageable) {
                await message.member.timeout(timeoutMs, `${type}ming`).catch(console.error);
                
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔇 User Timed Out')
                    .setDescription(`<@${userId}> has been timed out for persistent **${type}ming**.`)
                    .setFooter({ text: 'Auto-Moderation' });
                
                const timeoutMsg = await message.channel.send({ embeds: [timeoutEmbed] });
                setTimeout(() => timeoutMsg.delete().catch(() => {}), 10000);
            }
        }

        // Send log to configured channel
        if (settings.logChannelId && (settings.logFeatures?.antiSpam !== false)) {
            const logChannel = message.guild.channels.cache.get(settings.logChannelId) || 
                               await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (logChannel) {
                let actions = [];
                if (settings.deleteMessages) actions.push('Deleted Message(s)');
                if (settings.warnUser) actions.push('Warned User');
                if (settings.timeoutUser && violations >= 2 && message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers) && message.member.manageable) {
                    const timeoutMs = settings.timeoutDuration * (violations - 1);
                    actions.push(`Timed out (${Math.round(timeoutMs / 60000)}m)`);
                }
                if (actions.length === 0) actions.push('None');

                const contentSnippet = message.content.length > 200 
                    ? message.content.substring(0, 197) + '...' 
                    : message.content;

                const logEmbed = new EmbedBuilder()
                    .setColor(0xE67E22) // Amber
                    .setTitle('🛡️ AutoMod: Spam Detected')
                    .addFields(
                        { name: '👤 User', value: `${message.author} (${message.author.tag})`, inline: true },
                        { name: '💬 Channel', value: `${message.channel}`, inline: true },
                        { name: '🚨 Violation Type', value: `\`${type}\``, inline: true },
                        { name: '📊 Violations Count', value: `\`${violations}\``, inline: true },
                        { name: '⚙️ Action Taken', value: `\`${actions.join(', ')}\``, inline: true },
                        { name: '📄 Message Snippet', value: contentSnippet ? `\`\`\`\n${contentSnippet}\n\`\`\`` : '*No content*' }
                    )
                    .setFooter({ text: `User ID: ${message.author.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }

        console.log(`[AutoMod] ${type} by ${message.author.tag} in ${message.guild.name}. Violations: ${violations}`);

        // Partial violation reset
        setTimeout(() => {
            const val = client.spamViolations.get(trackerKey);
            if (val > 0) client.spamViolations.set(trackerKey, val - 1);
        }, 60000);

    } catch (error) {
        console.error(`[AutoMod] Error handling ${type}:`, error);
    }
}
