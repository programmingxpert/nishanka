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
        const isMod = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                      message.member.permissions.has(PermissionFlagsBits.ManageMessages);

        // --- Anti-Link Logic ---
        if (settings.antiLink?.enabled) {
            const isLinkIgnored = settings.antiLink.ignoredUsers?.includes(userId) || settings.ignoredUsers?.includes(userId);
            if (isLinkIgnored || !isMod) {
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
                    const urls = message.content.match(urlRegex);
                    if (urls && urls.length > 0) {
                        let hasUnauthorizedLink = false;
                        for (const urlStr of urls) {
                            if (!isUrlAllowed(urlStr, settings.antiLink)) {
                                hasUnauthorizedLink = true;
                                break;
                            }
                        }
                        if (hasUnauthorizedLink) {
                            await handleViolation(message, client, `${userId}-${guildId}`, 'Link Violation', 'antiLink', settings);
                            return; // Stop processing further
                        }
                    }
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

        // Ignore antispam checks if a minigame is actively running in the channel
        const activeMinigames = client.activeMinigames || (global.client && global.client.activeMinigames);
        if (activeMinigames && activeMinigames.has(message.channel.id)) {
            return;
        }

        const trackerKey = `${userId}-${guildId}`;

        // --- Repetition Detection ---
        if (settings.repetitionEnabled === true) {
            const isRepetitionIgnored = settings.ignoredUsers?.includes(userId);
            if (isRepetitionIgnored || !isMod) {
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

                    if (repData.count >= settings.repetitionThreshold) {
                        client.repetitionTracker.delete(trackerKey); // Reset repetition tracker
                        await handleViolation(message, client, trackerKey, 'Repetitive Spam', 'repetition', settings);
                        return;
                    }
                }
            }
        }

        // --- Fast Spam Tracking ---
        if (settings.fastSpam?.enabled) {
            const isFastIgnored = settings.fastSpam.ignoredUsers?.includes(userId) || settings.ignoredUsers?.includes(userId);
            if (isFastIgnored || !isMod) {
                if (!client.spamTracker.has(trackerKey)) {
                    client.spamTracker.set(trackerKey, []);
                }
                const fastTimestamps = client.spamTracker.get(trackerKey);
                fastTimestamps.push(Date.now());
                if (fastTimestamps.length > settings.fastSpam.threshold) fastTimestamps.shift();

                if (fastTimestamps.length === settings.fastSpam.threshold && (Date.now() - fastTimestamps[0]) < settings.fastSpam.window) {
                    client.spamTracker.delete(trackerKey); // Reset fast spam timestamps sliding window
                    await handleViolation(message, client, trackerKey, 'Fast Spam', 'fastSpam', settings);
                    return; // Stop processing further for this message if caught
                }
            }
        }

        // --- Slow Spam Tracking ---
        if (settings.slowSpam?.enabled) {
            const isSlowIgnored = settings.slowSpam.ignoredUsers?.includes(userId) || settings.ignoredUsers?.includes(userId);
            if (isSlowIgnored || !isMod) {
                const slowTrackerKey = `slow-${trackerKey}`;
                if (!client.spamTracker.has(slowTrackerKey)) {
                    client.spamTracker.set(slowTrackerKey, []);
                }
                const slowTimestamps = client.spamTracker.get(slowTrackerKey);
                slowTimestamps.push(Date.now());
                if (slowTimestamps.length > settings.slowSpam.threshold) slowTimestamps.shift();

                if (slowTimestamps.length === settings.slowSpam.threshold && (Date.now() - slowTimestamps[0]) < settings.slowSpam.window) {
                    client.spamTracker.delete(slowTrackerKey); // Reset slow spam timestamps sliding window
                    await handleViolation(message, client, trackerKey, 'Slow Spam', 'slowSpam', settings);
                }
            }
        }
    },
};

function isUrlAllowed(urlStr, antiLinkConfig) {
    if (!antiLinkConfig) return false;
    try {
        let parsedUrl = new URL(urlStr);
        const hostname = parsedUrl.hostname.toLowerCase();
        const pathname = parsedUrl.pathname.toLowerCase();

        // 1. Check whitelisted websites
        if (antiLinkConfig.whitelistedWebsites && Array.isArray(antiLinkConfig.whitelistedWebsites)) {
            for (const site of antiLinkConfig.whitelistedWebsites) {
                const cleanSite = site.trim().toLowerCase();
                if (!cleanSite) continue;
                // Match domain exactly, or match subdomains
                if (hostname === cleanSite || hostname.endsWith('.' + cleanSite)) {
                    return true;
                }
            }
        }

        // 2. Check allowed formats (images, gifs, videos)
        const allowedFormats = antiLinkConfig.allowedFormats || {};
        if (allowedFormats.images || allowedFormats.gifs || allowedFormats.videos) {
            // Get file extension from pathname
            const extMatch = pathname.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
            if (extMatch) {
                const ext = extMatch[1].toLowerCase();
                const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'heic'];
                const gifExts = ['gif'];
                const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'];

                if (allowedFormats.images && imageExts.includes(ext)) return true;
                if (allowedFormats.gifs && gifExts.includes(ext)) return true;
                if (allowedFormats.videos && videoExts.includes(ext)) return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

async function handleViolation(message, client, trackerKey, type, moduleKey, settings) {
    const userId = message.author.id;
    
    // Extract module-specific config
    let moduleConfig = {};
    if (moduleKey === 'fastSpam') {
        moduleConfig = settings.fastSpam || {};
    } else if (moduleKey === 'slowSpam') {
        moduleConfig = settings.slowSpam || {};
    } else if (moduleKey === 'antiLink') {
        moduleConfig = settings.antiLink || {};
    }
    
    // Fallback to global setting if undefined
    const warnUser = moduleConfig.warnUser !== undefined ? moduleConfig.warnUser : settings.warnUser;
    const deleteMessages = moduleConfig.deleteMessages !== undefined ? moduleConfig.deleteMessages : settings.deleteMessages;
    const timeoutUser = moduleConfig.timeoutUser !== undefined ? moduleConfig.timeoutUser : settings.timeoutUser;
    const timeoutDuration = moduleConfig.timeoutDuration !== undefined ? moduleConfig.timeoutDuration : settings.timeoutDuration;

    try {
        // Warning cooldown: avoid spamming warn/timeout embeds within 10 seconds for the same user
        client.lastSpamWarn = client.lastSpamWarn || new Map();
        const lastWarnTime = client.lastSpamWarn.get(trackerKey) || 0;
        if (Date.now() - lastWarnTime < 10000) {
            if (deleteMessages && message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                await message.delete().catch(() => {});
            }
            return;
        }
        client.lastSpamWarn.set(trackerKey, Date.now());

        // Retroactive Deletion / Deletion
        if (deleteMessages && message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            // Delete the current message
            await message.delete().catch(() => {});

            // Retroactive delete for spam modules only
            if (moduleKey !== 'antiLink') {
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
        }

        // Increment violations (using trackerKey + moduleKey to isolate them)
        const violationKey = `${trackerKey}-${moduleKey}`;
        const violations = (client.spamViolations.get(violationKey) || 0) + 1;
        client.spamViolations.set(violationKey, violations);

        // Warn user
        if (warnUser) {
            const warnEmbed = new EmbedBuilder()
                .setColor(violations === 1 ? 0xFFFF00 : 0xFF0000)
                .setTitle(`⚠️ ${type} Detected`)
                .setDescription(
                    moduleKey === 'antiLink'
                        ? `<@${userId}>, you are not allowed to post links in this channel.`
                        : `<@${userId}>, please slow down! You are sending messages too quickly.`
                )
                .setFooter({ text: moduleKey === 'antiLink' ? 'Links are restricted in this server.' : 'Spamming is not allowed in this server.' });
            
            const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
            setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        }

        // Timeout user
        if (timeoutUser && violations >= 2) {
            const timeoutMs = timeoutDuration * (violations - 1);
            if (message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers) && message.member.manageable) {
                await message.member.timeout(timeoutMs, `${type} violation`).catch(console.error);
                
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔇 User Timed Out')
                    .setDescription(`<@${userId}> has been timed out for persistent **${type}** violations.`)
                    .setFooter({ text: 'Auto-Moderation' });
                
                const timeoutMsg = await message.channel.send({ embeds: [timeoutEmbed] });
                setTimeout(() => timeoutMsg.delete().catch(() => {}), 10000);
            }
        }

        // Send log to configured channel
        const shouldLog = settings.logChannelId && (
            (moduleKey === 'antiLink' && settings.logFeatures?.antiLink !== false) ||
            (moduleKey !== 'antiLink' && settings.logFeatures?.antiSpam !== false)
        );

        if (shouldLog) {
            const logChannel = message.guild.channels.cache.get(settings.logChannelId) || 
                               await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (logChannel) {
                let actions = [];
                if (deleteMessages) actions.push('Deleted Message(s)');
                if (warnUser) actions.push('Warned User');
                if (timeoutUser && violations >= 2 && message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers) && message.member.manageable) {
                    const timeoutMs = timeoutDuration * (violations - 1);
                    actions.push(`Timed out (${Math.round(timeoutMs / 60000)}m)`);
                }
                if (actions.length === 0) actions.push('None');

                const contentSnippet = message.content.length > 200 
                    ? message.content.substring(0, 197) + '...' 
                    : message.content;

                const logEmbed = new EmbedBuilder()
                    .setColor(moduleKey === 'antiLink' ? 0xE74C3C : 0xE67E22) // Red for link, Amber for spam
                    .setTitle(moduleKey === 'antiLink' ? '🛡️ AutoMod: Link Blocked' : '🛡️ AutoMod: Spam Detected')
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
            const val = client.spamViolations.get(violationKey);
            if (val > 0) client.spamViolations.set(violationKey, val - 1);
        }, 60000);

    } catch (error) {
        console.error(`[AutoMod] Error handling ${type}:`, error);
    }
}
