/* eslint-disable */
const { Collection, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AntiSpam = require('../models/antiSpamSchema');

// Simple cache to store guild settings for 1 minute
const settingsCache = new Collection();

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

        // Fetch settings from cache or DB (with simple cache logic)
        let settings = client.antispamSettings.get(guildId);
        if (!settings || Date.now() - settings.timestamp > 60000) {
            settings = await AntiSpam.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );
            settings = { ...settings.toObject(), timestamp: Date.now() };
            client.antispamSettings.set(guildId, settings);
        }

        // Exempt administrators and users with Manage Messages permission
        // EXCEPT if they are in the ignoredUsers list (Watchlist)
        const isIgnored = settings.ignoredUsers?.includes(userId);
        if (!isIgnored) {
            if (message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return;
            }
        }

        const trackerKey = `${userId}-${guildId}`;

        // Ignore antispam checks if a minigame is actively running in the channel
        const activeMinigames = client.activeMinigames || (global.client && global.client.activeMinigames);
        if (activeMinigames && activeMinigames.has(message.channel.id)) {
            return;
        }

        // --- Repetition Detection ---
        const isRepEnabled = settings.repetitionEnabled === true;
        if (isRepEnabled) {
            const content = message.content.trim().toLowerCase();
            if (content.length > 0) {
                const repData = client.repetitionTracker.get(trackerKey) || { content: '', count: 0, firstTimestamp: 0, lastTimestamp: 0 };
                const now = Date.now();
                
                if (repData.content === content && (now - repData.lastTimestamp) < 5000) {
                    if (now - repData.firstTimestamp < 5000) {
                        repData.count++;
                    } else {
                        repData.count = 2;
                        repData.firstTimestamp = repData.lastTimestamp;
                    }
                    repData.lastTimestamp = now;
                } else {
                    repData.content = content;
                    repData.count = 1;
                    repData.firstTimestamp = now;
                    repData.lastTimestamp = now;
                }
                client.repetitionTracker.set(trackerKey, repData);

                const repThreshold = settings.repetitionThreshold || 5;
                if (repData.count >= repThreshold) {
                    client.repetitionTracker.delete(trackerKey); // Reset repetition tracker
                    await handleSpam(message, client, trackerKey, 'Repetitive Spam', settings);
                    return;
                }
            }
        }

        // --- Fast Spam Tracking ---
        const isFastEnabled = settings.fastSpam?.enabled !== false;
        if (isFastEnabled) {
            const fastThreshold = settings.fastSpam?.threshold || 6;
            const fastWindow = settings.fastSpam?.window || 2000;
            
            if (!client.spamTracker.has(trackerKey)) {
                client.spamTracker.set(trackerKey, []);
            }
            const fastTimestamps = client.spamTracker.get(trackerKey);
            fastTimestamps.push(Date.now());
            if (fastTimestamps.length > fastThreshold) fastTimestamps.shift();

            if (fastTimestamps.length === fastThreshold && (Date.now() - fastTimestamps[0]) < fastWindow) {
                client.spamTracker.delete(trackerKey); // Reset fast spam timestamps sliding window
                await handleSpam(message, client, trackerKey, 'Fast Spam', settings);
                return; // Stop processing further for this message if caught
            }
        }

        // --- Slow Spam Tracking ---
        const isSlowEnabled = settings.slowSpam?.enabled !== false;
        if (isSlowEnabled) {
            const slowThreshold = settings.slowSpam?.threshold || 15;
            const slowWindow = settings.slowSpam?.window || 10000;
            
            const slowTrackerKey = `slow-${trackerKey}`;
            if (!client.spamTracker.has(slowTrackerKey)) {
                client.spamTracker.set(slowTrackerKey, []);
            }
            const slowTimestamps = client.spamTracker.get(slowTrackerKey);
            slowTimestamps.push(Date.now());
            if (slowTimestamps.length > slowThreshold) slowTimestamps.shift();

            if (slowTimestamps.length === slowThreshold && (Date.now() - slowTimestamps[0]) < slowWindow) {
                client.spamTracker.delete(slowTrackerKey); // Reset slow spam timestamps sliding window
                await handleSpam(message, client, trackerKey, 'Slow Spam', settings);
            }
        }
    },
};

async function handleSpam(message, client, trackerKey, type, settings) {
    const userId = message.author.id;
    try {
        // Warning cooldown: avoid spamming warn/timeout embeds within 10 seconds for the same user
        client.lastSpamWarn = client.lastSpamWarn || new Map();
        const lastWarnTime = client.lastSpamWarn.get(trackerKey) || 0;
        if (Date.now() - lastWarnTime < 10000) {
            // Already warned/handled in the last 10 seconds.
            // Just delete the message silently if deleteMessages is enabled.
            if (settings.deleteMessages && message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                await message.delete().catch(() => {});
            }
            return;
        }
        client.lastSpamWarn.set(trackerKey, Date.now());

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

        console.log(`[AntiSpam] ${type} by ${message.author.tag} in ${message.guild.name}. Violations: ${violations}`);

        // ─── Logging System ───
        try {
            const { sendDiscordLog } = require('../utils/serverLogger');
            const logEmbed = new EmbedBuilder()
                .setColor(0xf97316) // Premium orange
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTitle(`🚨 Anti-Spam Triggered`)
                .setDescription(
                    `**User:** <@${userId}> (\`${userId}\`)\n` +
                    `**Channel:** <#${message.channel.id}> (\`${message.channel.id}\`)\n` +
                    `**Trigger Type:** ${type}\n` +
                    `**Violations:** ${violations}\n` +
                    `**Actions Taken:**\n` +
                    `• Deleted Messages: ${settings.deleteMessages ? '✅ Yes' : '❌ No'}\n` +
                    `• Warned User: ${settings.warnUser ? '✅ Yes' : '❌ No'}\n` +
                    `• Timed Out: ${settings.timeoutUser && violations >= 2 ? `✅ Yes (${(settings.timeoutDuration * (violations - 1)) / 1000}s)` : '❌ No'}`
                )
                .setTimestamp();
            await sendDiscordLog(message.guild, 'antispam', { embeds: [logEmbed] });
        } catch (err) {
            console.error('Error logging antispam event:', err);
        }

        // Partial violation reset
        setTimeout(() => {
            const val = client.spamViolations.get(trackerKey);
            if (val > 0) client.spamViolations.set(trackerKey, val - 1);
        }, 60000);

    } catch (error) {
        console.error(`[AntiSpam] Error handling ${type}:`, error);
    }
}
