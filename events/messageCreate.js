/* eslint-disable */
const { Collection } = require('discord.js');
const GuildSettings = require('../models/guildSettingsSchema');
const config = require('../config.json');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

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
        if (!message.content.startsWith(prefix)) return;

        const args        = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName)
            ?? client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command) return;

        if (command.category === 'admin' && message.author.id !== config.devId) {
            return message.reply('❌ This command is restricted to the bot developer only.').catch(() => {});
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

        const now        = Date.now();
        const timestamps = cooldowns.get(cmdName);
        let cooldownMs = (command.cooldown ?? 3) * 1000;

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
                return message.reply(`⏳ Please wait, you can use \`${prefix}${commandName}\` again <t:${timestampId}:R>.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownMs);

        // Wrap reply to clear cooldown on error response
        const originalMessageReply = message.reply;
        const originalChannelSend = message.channel.send;

        const { isGuildPremium, getRandomPromoTip, getRandomDashboardTip } = require('../utils/premiumPromo');
        const isPrem = await isGuildPremium(message.guild.id);

        const injectPromo = (options) => {
            const rand = Math.random();
            let promoText = '';

            if (isPrem) {
                // Premium servers only get dashboard promo tips (6% chance)
                if (rand < 0.06) {
                    promoText = getRandomDashboardTip();
                } else {
                    return options;
                }
            } else {
                // Non-premium servers get premium promo (6%) or dashboard tips (6%)
                if (rand < 0.06) {
                    promoText = getRandomPromoTip();
                } else if (rand < 0.12) {
                    promoText = getRandomDashboardTip();
                } else {
                    return options;
                }
            }
            
            if (typeof options === 'string') {
                if (options.startsWith('❌') || options.startsWith('⚠️')) return options;
                return options + `\n\n*${promoText}*`;
            } else if (options && typeof options === 'object') {
                let content = options.content || '';
                if (content.startsWith('❌') || content.startsWith('⚠️')) return options;
                
                if (options.embeds && options.embeds.length > 0) {
                    const embed = options.embeds[0];
                    if (embed && typeof embed.setFooter === 'function') {
                        try {
                            const currentFooter = embed.data?.footer?.text;
                            const footerText = currentFooter ? `${currentFooter} | ${promoText}` : promoText;
                            embed.setFooter({ text: footerText, iconURL: embed.data?.footer?.icon_url });
                        } catch (e) {}
                    } else if (embed && typeof embed === 'object') {
                        const currentFooter = embed.footer?.text;
                        embed.footer = {
                            text: currentFooter ? `${currentFooter} | ${promoText}` : promoText,
                            icon_url: embed.footer?.icon_url
                        };
                    }
                } else {
                    options.content = content + `\n\n*${promoText}*`;
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
        } catch (error) {
            timestamps.delete(message.author.id); // Clear cooldown on command error
            console.error(`[messageCreate] Error in prefix command "${commandName}":`, error);
            message.reply('❌ An error occurred while executing that command.').catch(() => {});
        }
    },
};
