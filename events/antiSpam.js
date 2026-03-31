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
        let settings = settingsCache.get(guildId);
        if (!settings || Date.now() - settings.timestamp > 60000) {
            settings = await AntiSpam.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );
            settings = { ...settings.toObject(), timestamp: Date.now() };
            settingsCache.set(guildId, settings);
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
        // Delete message
        if (settings.deleteMessages && message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await message.delete().catch(() => {});
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

        // Partial violation reset
        setTimeout(() => {
            const val = client.spamViolations.get(trackerKey);
            if (val > 0) client.spamViolations.set(trackerKey, val - 1);
        }, 60000);

    } catch (error) {
        console.error(`[AntiSpam] Error handling ${type}:`, error);
    }
}
