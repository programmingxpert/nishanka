/* eslint-disable */
const { Collection } = require('discord.js');
const GuildSettings = require('../models/guildSettingsSchema');
const config = require('../config.json');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        if (!message.guild) return;

        // Record ticket message transcripts
        try {
            const Ticket = require('../models/ticketSchema');
            const openTicket = await Ticket.findOne({ channelId: message.channel.id, status: 'open' });
            if (openTicket) {
                openTicket.transcript.push({
                    senderId: message.author.id,
                    senderTag: message.author.tag,
                    senderAvatar: message.author.displayAvatarURL({ extension: 'png', size: 128 }),
                    content: message.content || (message.embeds.length > 0 ? '[Embed Content]' : ''),
                    timestamp: new Date()
                });
                await openTicket.save().catch(err => console.error('Failed to save ticket transcript:', err));
            }
        } catch (e) {
            console.error('Error saving ticket transcript:', e);
        }

        if (message.author.bot) return;

        // Save to channel history for AI context
        try {
            const { saveToHistory } = require('../utils/nishankaAI');
            saveToHistory(message.channel.id, message.author.username, message.content);
        } catch (e) {
            console.error('Error saving message to AI history:', e);
        }

        let settings = null;
        try {
            settings = await GuildSettings.findOne({ guildId: message.guild.id });
            
            const MemberStats = require('../models/MemberStats');
            let stats = await MemberStats.findOne({ guildId: message.guild.id, userId: message.author.id });
            if (!stats) {
                stats = new MemberStats({ guildId: message.guild.id, userId: message.author.id });
            }
            
            stats.messagesCount += 1;

            // Check if leveling is enabled
            const isLevelingEnabled = settings?.leveling?.enabled ?? true;
            if (isLevelingEnabled) {
                const now = Date.now();
                const xpCooldown = 60000; // 1 minute
                const lastXpTime = stats.lastXpEarnedAt ? new Date(stats.lastXpEarnedAt).getTime() : 0;
                
                if (now - lastXpTime >= xpCooldown) {
                    const xpGained = Math.floor(Math.random() * 11) + 15; // 15 to 25 XP
                    const oldXp = stats.xp || 0;
                    const newXp = oldXp + xpGained;
                    
                    stats.xp = newXp;
                    stats.lastXpEarnedAt = new Date();
                    
                    const oldLevel = stats.level || 0;
                    const newLevel = Math.floor(Math.sqrt(newXp / 100));
                    
                    if (newLevel > oldLevel) {
                        stats.level = newLevel;
                        
                        // Level up! Grant rewards and announce
                        const Bauble = require('../models/baubleSchema');
                        const multiplier = settings?.leveling?.baublesMultiplier ?? 100;
                        const reward = newLevel * multiplier;
                        
                        await Bauble.findOneAndUpdate(
                            { userId: message.author.id },
                            { $inc: { baubles: reward } },
                            { upsert: true }
                        );
                        
                        // Role Rewards
                        const roleRewards = settings?.leveling?.roleRewards || [];
                        const roleReward = roleRewards.find(r => r.level === newLevel);
                        let roleGranted = null;
                        if (roleReward) {
                            try {
                                const member = await message.guild.members.fetch(message.author.id);
                                if (member) {
                                    await member.roles.add(roleReward.roleId);
                                    roleGranted = roleReward.roleId;
                                }
                            } catch (e) {
                                console.error('Failed to grant role reward upon level up:', e.message);
                            }
                        }
                        
                        // Announcement
                        const announce = settings?.leveling?.announceLevelUps ?? true;
                        if (announce) {
                            const { EmbedBuilder } = require('discord.js');
                            const embed = new EmbedBuilder()
                                .setColor(0x7c6cf0)
                                .setTitle('🆙 LEVEL UP!')
                                .setDescription(`🎉 **${message.author.username}** has reached **Level ${newLevel}**!\n🎁 Reward: **${reward}** Glimmering Baubles! 🪙` + (roleGranted ? `\n🛡️ Role Unlocked: <@&${roleGranted}>` : ''))
                                .setTimestamp()
                                .setFooter({ text: 'Keep chatting to earn more XP! ✨' });
                            
                            const announceChannelId = settings?.leveling?.levelUpChannelId;
                            let channel = message.channel;
                            if (announceChannelId) {
                                const targetChan = message.guild.channels.cache.get(announceChannelId);
                                if (targetChan) channel = targetChan;
                            }
                            channel.send({ content: `<@${message.author.id}>`, embeds: [embed] }).catch(() => {});
                        }
                    }
                }
            }

            await stats.save();
        } catch (e) {
            console.error('Failed to process messageCreate stats/leveling:', e);
        }

        // --- Triggers Logic ---
        if (!client.triggerCache) client.triggerCache = new Map();
        if (!client.triggerCache.has(message.guild.id)) {
            try {
                const Trigger = require('../models/triggerSchema');
                const triggers = await Trigger.find({ guildId: message.guild.id }).lean();
                client.triggerCache.set(message.guild.id, triggers);
            } catch (err) {
                console.error('Failed to fetch triggers:', err);
            }
        }
        
        const guildTriggers = client.triggerCache.get(message.guild.id);
        if (guildTriggers && guildTriggers.length > 0) {
            const contentLower = message.content.toLowerCase();
            for (const t of guildTriggers) {
                let isMatch = false;
                if (t.matchType === 'exact' && contentLower === t.triggerWord) isMatch = true;
                else if (t.matchType === 'includes' && contentLower.includes(t.triggerWord)) isMatch = true;
                else if (t.matchType === 'startsWith' && contentLower.startsWith(t.triggerWord)) isMatch = true;

                if (isMatch) {
                    const payload = {};
                    if (t.response.text) payload.content = t.response.text;
                    
                    const e = t.response.embed;
                    if (e && (e.title || e.description || e.author || e.footer)) {
                        const { EmbedBuilder } = require('discord.js');
                        const embed = new EmbedBuilder();
                        if (e.title) embed.setTitle(e.title);
                        if (e.description) embed.setDescription(e.description);
                        if (e.color) embed.setColor(e.color);
                        if (e.author) embed.setAuthor({ name: e.author });
                        if (e.footer) embed.setFooter({ text: e.footer });
                        payload.embeds = [embed];
                    }

                    if (payload.content || payload.embeds) {
                        message.reply(payload).catch(() => {});
                    }
                    break; // Trigger only the first match to prevent spam
                }
            }
        }

        const prefix = settings?.bot?.prefix || process.env.PREFIX || '-';

        // --- AI Chat Logic ---
        if (!message.content.startsWith(prefix)) {
            const chatTriggerRegex = /\b(nishanka|nish)\b/i;
            if (chatTriggerRegex.test(message.content)) {
                const { consumeAPU } = require('../utils/aiManager');
                const apuCheck = await consumeAPU(message.author.id, 1);

                if (!apuCheck.success) {
                    const nextReset = new Date();
                    nextReset.setUTCHours(24, 0, 0, 0);
                    const resetUnix = Math.floor(nextReset.getTime() / 1000);

                    return message.reply(`❌ I'm literally out of battery to answer your silly questions today. My APUs reset <t:${resetUnix}:R> (00:00 UTC), or you could stop being poor and buy premium for a cheap price at https://nishanka.zeyuki.app/premium 🙄`).catch(() => {});
                }

                const { generateResponse } = require('../utils/nishankaAI');
                const query = message.content.replace(/\b(nishanka|nish)\b/gi, '').replace(/\s+/g, ' ').trim();
                
                await message.channel.sendTyping().catch(() => {});
                
                const reply = generateResponse(message, query);
                
                // Slight delay to feel like a real person typing
                setTimeout(async () => {
                    await message.reply(reply).catch(() => {});
                }, Math.floor(Math.random() * 800) + 600);
                return;
            }
        }

        if (!message.content.startsWith(prefix)) return;

        const args        = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName)
            ?? client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command) return;

        // ─── Global Ban & Soft-Ban Guards ──────────────────────────────────────────
        const UserRestriction = require('../models/UserRestriction');
        const userRestriction = await UserRestriction.findOne({ userId: message.author.id });
        if (userRestriction) {
            if (userRestriction.isBanned) {
                return message.reply(`❌ **Global Ban:** You have been globally banned from using Nishanka.\nReason: *${userRestriction.banReason || 'Violation of terms'}*`).catch(() => {});
            }
            if (userRestriction.isSoftBanned && userRestriction.lockoutExpiresAt && Date.now() < new Date(userRestriction.lockoutExpiresAt).getTime()) {
                const cmdName = command.data?.name || command.name;
                const isEconomyOrGame = command.category === 'economy' || command.category === 'minigames' || command.category === 'casino';
                if (isEconomyOrGame) {
                    const expiryUnix = Math.floor(new Date(userRestriction.lockoutExpiresAt).getTime() / 1000);
                    return message.reply(`⚠️ **Access Suspended:** Your access to economy and games has been temporarily locked due to automated anti-exploit detection. You can play again <t:${expiryUnix}:R>.`);
                }
            } else if (userRestriction.isSoftBanned) {
                userRestriction.isSoftBanned = false;
                userRestriction.lockoutExpiresAt = null;
                await userRestriction.save();
            }
        }

        // ─── Maintenance Mode Guard ────────────────────────────────────────────────
        const SystemConfig = require('../models/SystemConfig');
        const sysConfig = await SystemConfig.findOne();
        if (sysConfig && sysConfig.maintenanceMode) {
            const isDev = message.author.id === config.devId;
            if (!isDev) {
                const etaStr = sysConfig.maintenanceETA ? `\n⏳ **Estimated Uptime:** ${sysConfig.maintenanceETA}` : '';
                return message.reply(`🛠️ **Maintenance Mode:** Nishanka is currently undergoing scheduled maintenance. Please check back later.\n> *${sysConfig.maintenanceMessage}*${etaStr}`).catch(() => {});
            }
        }

        let announcementText = '';
        if (sysConfig && sysConfig.announcementActive && sysConfig.announcement) {
            announcementText = sysConfig.announcement;
        }

        const isDevOnly = command.category === 'developer' || command.devOnly === true;
        if (isDevOnly && message.author.id !== config.devId) {
            return message.reply('❌ This command is restricted to the bot developer only.').catch(() => {});
        }

        // Admin-category commands require ManageGuild or Administrator
        if (command.category === 'admin') {
            const member = message.member;
            const hasAdminPerms = member?.permissions?.has('Administrator') || member?.permissions?.has('ManageGuild');
            if (!hasAdminPerms && message.author.id !== config.devId) {
                return message.reply('❌ You need the **Administrator** or **Manage Server** permission to use this command.').catch(() => {});
            }
        }

        if (command.slashOnly) {
            return message.reply(`❌ The \`${commandName}\` command is only available as a slash command (use \`/${command.data?.name || commandName}\`).`).catch(() => {});
        }

        if (typeof command.executePrefix !== 'function') {
            return;
        }

        const cmdName = command.data?.name || command.name;
        if (client.disabledCommands && client.disabledCommands.has(cmdName)) {
            return message.reply('❌ This command is currently disabled by the developer.').catch(() => {});
        }

        // --- Cooldown logic ---
        const { cooldowns } = client;
        if (!cooldowns.has(cmdName)) {
            cooldowns.set(cmdName, new Collection());
        }

        const { isGuildPremium, isUserPremium, getRandomPromoTip, getRandomDashboardTip } = require('../utils/premiumPromo');
        const isGuildPrem = await isGuildPremium(message.guild.id);
        const isPrem = isGuildPrem || isUserPremium(message.author.id);

        const now        = Date.now();
        const timestamps = cooldowns.get(cmdName);
        let cooldownMs = (command.cooldown ?? 3) * 1000;

        if (command.isAI) {
            cooldownMs = (isPrem ? (command.premiumCooldown ?? 5) : (command.cooldown ?? 60)) * 1000;
        }

        if (cmdName === 'work' || cmdName === 'scavenge') {
            const Bauble = require('../models/baubleSchema');
            const baubleData = await Bauble.findOne({ userId: message.author.id }).lean();
            if (baubleData && baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                cooldownMs /= 2;
            }
        }

        if (timestamps.has(message.author.id)) {
            const expiry = timestamps.get(message.author.id) + cooldownMs;
            if (now < expiry) {
                const timestampId = Math.floor(expiry / 1000);
                let contentText = `⏳ Please wait, you can use \`${prefix}${commandName}\` again <t:${timestampId}:R>.`;
                if (!isPrem) {
                    contentText += `\n💡 *Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to reduce/remove cooldowns!*`;
                }
                return message.reply(contentText);
            }
        }

        const lastExecutionTime = timestamps.get(message.author.id);

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownMs);

        if (lastExecutionTime) {
            const { trackCommandTiming } = require('../utils/antiExploit');
            trackCommandTiming(message.author.id, cmdName, cooldownMs, lastExecutionTime, client).catch(() => {});
        }

        // Wrap reply to clear cooldown on error response
        const originalMessageReply = message.reply;
        const originalChannelSend = message.channel.send;

        const injectPromo = (options) => {
            if (message.promoInjected) return options;
            message.promoInjected = true;

            const rand = Math.random();
            let promoText = '';

            if (isGuildPrem) {
                if (rand < 0.015) {
                    promoText = getRandomDashboardTip();
                }
            } else {
                if (rand < 0.01) {
                    promoText = getRandomPromoTip();
                } else if (rand < 0.025) {
                    promoText = getRandomDashboardTip();
                }
            }
            
            const announcePrefix = announcementText ? `📢 **Announcement:** ${announcementText}\n\n` : '';

            if (typeof options === 'string') {
                if (options.startsWith('❌') || options.startsWith('⚠️')) return options;
                return announcePrefix + options + (promoText ? `\n\n*${promoText}*` : '');
            } else if (options && typeof options === 'object') {
                let content = options.content || '';
                if (content.startsWith('❌') || content.startsWith('⚠️')) return options;
                
                if (options.embeds && options.embeds.length > 0) {
                    if (announcePrefix) {
                        options.content = announcePrefix + content;
                    }
                    const embed = options.embeds[0];
                    if (promoText) {
                        if (embed && typeof embed.setFooter === 'function') {
                            try {
                                const currentFooter = embed.data?.footer?.text;
                                if (!currentFooter || !currentFooter.includes(promoText)) {
                                    const footerText = currentFooter ? `${currentFooter} | ${promoText}` : promoText;
                                    embed.setFooter({ text: footerText, iconURL: embed.data?.footer?.icon_url });
                                }
                            } catch (e) {}
                        } else if (embed && typeof embed === 'object') {
                            const currentFooter = embed.footer?.text;
                            if (!currentFooter || !currentFooter.includes(promoText)) {
                                embed.footer = {
                                    text: currentFooter ? `${currentFooter} | ${promoText}` : promoText,
                                    icon_url: embed.footer?.icon_url
                                };
                            }
                        }
                    }
                } else {
                    if (announcePrefix || promoText) {
                        options.content = announcePrefix + content + (promoText ? `\n\n*${promoText}*` : '');
                    }
                }
            }
            return options;
        };

        const checkAndClearCooldown = (options) => {
            let content = '';
            let embedDesc = '';
            if (typeof options === 'string') {
                content = options;
            } else if (options) {
                content = options.content || '';
                if (options.embeds && options.embeds.length > 0) {
                    const embed = options.embeds[0];
                    embedDesc = embed.description || (typeof embed.data === 'object' ? embed.data.description : '') || '';
                }
            }
            if (
                content.startsWith('❌') || content.startsWith('⚠️') ||
                embedDesc.startsWith('❌') || embedDesc.startsWith('⚠️')
            ) {
                timestamps.delete(message.author.id);
            }
        };

        message.reply = async function (options, ...args) {
            checkAndClearCooldown(options);
            options = injectPromo(options);
            return originalMessageReply.apply(this, [options, ...args]);
        };

        message.channel.send = async function (options, ...args) {
            options = injectPromo(options);
            return originalChannelSend.apply(this, [options, ...args]);
        };

        // --- Prioritize text mentions over reply mentions ---
        if (message.reference && message.reference.messageId) {
            const repliedUser = message.mentions.repliedUser;
            if (repliedUser) {
                const hasOtherMention = message.mentions.users.some(u => u.id !== repliedUser.id);
                if (hasOtherMention) {
                    // Re-order users collection to move repliedUser to the end
                    const usersMap = new Map(message.mentions.users);
                    message.mentions.users.clear();
                    for (const [id, user] of usersMap) {
                        if (id !== repliedUser.id) {
                            message.mentions.users.set(id, user);
                        }
                    }
                    message.mentions.users.set(repliedUser.id, repliedUser);

                    // Re-order members collection if applicable
                    if (message.mentions.members && message.mentions.members.size > 0) {
                        const membersMap = new Map(message.mentions.members);
                        const repliedMember = membersMap.get(repliedUser.id);
                        if (repliedMember) {
                            message.mentions.members.clear();
                            for (const [id, member] of membersMap) {
                                if (id !== repliedUser.id) {
                                    message.mentions.members.set(id, member);
                                }
                            }
                            message.mentions.members.set(repliedUser.id, repliedMember);
                        }
                    }
                }
            }
        }

        // --- Execute command ---
        try {
            await command.executePrefix(message, args);
            const { checkAndPromptPreReleaseBadge } = require('../utils/preReleaseBadge');
            await checkAndPromptPreReleaseBadge(client, message.author, message);
        } catch (error) {
            timestamps.delete(message.author.id); // Clear cooldown on command error
            console.error(`[messageCreate] Error in prefix command "${commandName}":`, error);
            message.reply('❌ An error occurred while executing that command.').catch(() => {});
        }
    },
};
