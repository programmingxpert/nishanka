const ReactionRole = require('../models/reactionRoleSchema');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bots
        if (user.bot) return;

        // If the reaction is partial, fetch it
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.error('[ReactionRoles] Failed to fetch partial reaction:', err);
                return;
            }
        }

        // If the message is partial, fetch it
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (err) {
                console.error('[ReactionRoles] Failed to fetch partial message:', err);
                return;
            }
        }

        const guild = reaction.message.guild;
        if (!guild) return;

        // --- Reaction Log ---
        try {
            const emojiKey = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
            const { trackAdd } = require('../utils/reactionTracker');
            const { isSpam, count } = trackAdd(user.id, reaction.message.id, emojiKey);

            if (isSpam && count === 6) { // Log when the spam threshold is crossed
                const { sendDiscordLog } = require('../utils/serverLogger');
                const { EmbedBuilder } = require('discord.js');
                const reactionEmbed = new EmbedBuilder()
                    .setColor(0xf59e0b) // Orange/Warning
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`⚠️ Reaction Spam Alert`)
                    .setDescription(`**User:** <@${user.id}> (\`${user.id}\`)\n**Message:** [Jump to Message](${reaction.message.url})\n**Channel:** <#${reaction.message.channel.id}> (\`${reaction.message.channel.id}\`)\n**Reaction:** ${reaction.emoji.toString()}\n\n**Violation:** Adding/removing reactions too rapidly (**${count}** actions in 5 seconds).`)
                    .setTimestamp();
                await sendDiscordLog(guild, 'reaction', { embeds: [reactionEmbed] });
            }
        } catch (err) {
            console.error('Error in reaction add logging:', err);
        }

        // --- Starboard Check ---
        try {
            const GuildSettings = require('../models/guildSettingsSchema');
            const settings = await GuildSettings.findOne({ guildId: guild.id }).lean();
            if (settings?.starboard?.enabled && settings.starboard.channelId) {
                const isTargetEmoji = (settings.starboard.emoji === reaction.emoji.name) || 
                                      (reaction.emoji.id && settings.starboard.emoji.includes(reaction.emoji.id));
                
                const isStarboardChannel = reaction.message.channel.id === settings.starboard.channelId;

                if (isTargetEmoji && !isStarboardChannel) {
                    const StarboardMessage = require('../models/starboardMessageSchema');
                    const { EmbedBuilder } = require('discord.js');

                    // Fetch reaction users to count (exclude bots and author self-star)
                    const users = await reaction.users.fetch();
                    let starCount = 0;
                    users.forEach(u => {
                        if (!u.bot && u.id !== reaction.message.author.id) {
                            starCount++;
                        }
                    });

                    // Build starboard embed
                    const embed = new EmbedBuilder()
                        .setColor(0xF1C40F)
                        .setAuthor({
                            name: reaction.message.author.username,
                            iconURL: reaction.message.author.displayAvatarURL({ dynamic: true })
                        })
                        .setDescription(reaction.message.content || '')
                        .setTimestamp(reaction.message.createdAt)
                        .addFields({
                            name: 'Original Message',
                            value: `[Jump to Message](${reaction.message.url})`,
                            inline: false
                        });

                    const firstAttachment = reaction.message.attachments.first();
                    if (firstAttachment && firstAttachment.contentType?.startsWith('image/')) {
                        embed.setImage(firstAttachment.url);
                    }

                    const starboardChannel = guild.channels.cache.get(settings.starboard.channelId);
                    if (starboardChannel) {
                        let starboardRecord = await StarboardMessage.findOne({ messageId: reaction.message.id });
                        if (starboardRecord) {
                            try {
                                const starMessage = await starboardChannel.messages.fetch(starboardRecord.starboardMessageId);
                                if (starMessage) {
                                    await starMessage.edit({
                                        content: `${settings.starboard.emoji || '⭐'} **${starCount}** | <#${reaction.message.channel.id}>`,
                                        embeds: [embed]
                                    });
                                    starboardRecord.stars = starCount;
                                    await starboardRecord.save();
                                }
                            } catch (err) {
                                console.error('[Starboard] Failed to update existing starboard message:', err);
                            }
                        } else {
                            if (starCount >= (settings.starboard.threshold || 3)) {
                                try {
                                    const sentMsg = await starboardChannel.send({
                                        content: `${settings.starboard.emoji || '⭐'} **${starCount}** | <#${reaction.message.channel.id}>`,
                                        embeds: [embed]
                                    });
                                    await StarboardMessage.create({
                                        guildId: guild.id,
                                        channelId: reaction.message.channel.id,
                                        messageId: reaction.message.id,
                                        starboardMessageId: sentMsg.id,
                                        stars: starCount
                                    });
                                } catch (err) {
                                    console.error('[Starboard] Failed to send new starboard message:', err);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Starboard] Error checking messageReactionAdd:', err);
        }

        // Normalize the emoji representation: use ID for custom, name for unicode
        const emojiKey = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;

        try {
            // Find mapping in our database
            const mapping = await ReactionRole.findOne({
                guildId: guild.id,
                messageId: reaction.message.id,
                emoji: emojiKey
            }).lean();

            if (!mapping) return;

            // Fetch member
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            // Fetch role
            const role = guild.roles.cache.get(mapping.roleId);
            if (!role) return;

            // Custom name color level check & exclusivity for Utkala Sangathan
            if (guild.id === '1159902452649316432') {
                const COLOR_ROLES = [
                    '1159929637963567154', // Red
                    '1159929778321760336', // Lime
                    '1159929875994521610', // Green
                    '1159930034417578106', // Pink
                    '1159930132300058714', // Purple
                    '1159930391751311360', // Blue
                    '1159930460579823728', // Sky Blue
                    '1159930661264699502', // Yellow
                    '1159930725001330741', // Black
                    '1159931011048681511'  // Orange
                ];

                if (COLOR_ROLES.includes(role.id)) {
                    // Fetch user level from DB
                    const MemberStats = require('../models/MemberStats');
                    const stats = await MemberStats.findOne({ guildId: guild.id, userId: user.id });
                    const level = stats ? (stats.level || 0) : 0;

                    if (level < 15) {
                        // User is below Level 15! Remove their reaction and send a temporary warning message
                        await reaction.users.remove(user.id).catch(() => {});
                        const tempMsg = await reaction.message.channel.send(
                            `❌ <@${user.id}>, you must be **Level 15** or higher to unlock name colors! (Your current level: **${level}**)`
                        ).catch(() => null);
                        
                        if (tempMsg) {
                            setTimeout(() => tempMsg.delete().catch(() => {}), 8000);
                        }
                        return;
                    }

                    // User is Level 15+. Remove all other color roles they currently have
                    const currentColors = member.roles.cache.filter(r => COLOR_ROLES.includes(r.id) && r.id !== role.id);
                    if (currentColors.size > 0) {
                        await member.roles.remove(currentColors, 'Swapping custom name colors.');
                    }
                }
            }

            // Check if the bot can assign this role
            const botMember = guild.members.me;
            if (!botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
                return;
            }

            // Assign the role
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                
                // Log the event
                const { logServerEvent } = require('../utils/serverLogger');
                await logServerEvent(
                    guild.id,
                    'ROLE_ADD',
                    `Assigned role @${role.name} to ${user.username} via reaction role`,
                    botMember.user,
                    user,
                    { roleId: role.id, roleName: role.name, messageId: reaction.message.id }
                );
            }
        } catch (err) {
            console.error('[ReactionRoles] Error handling messageReactionAdd:', err);
        }
    }
};
