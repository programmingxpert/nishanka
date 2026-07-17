const ReactionRole = require('../models/reactionRoleSchema');

module.exports = {
    name: 'messageReactionRemove',
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
            const { trackRemove } = require('../utils/reactionTracker');
            const { isSpam, spamCount, isRapid, duration } = trackRemove(user.id, reaction.message.id, emojiKey);

            if (isSpam && spamCount === 6) { // Log when the spam threshold is crossed
                const { sendDiscordLog } = require('../utils/serverLogger');
                const { EmbedBuilder } = require('discord.js');
                const reactionEmbed = new EmbedBuilder()
                    .setColor(0xf59e0b) // Orange/Warning
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`⚠️ Reaction Spam Alert`)
                    .setDescription(`**User:** <@${user.id}> (\`${user.id}\`)\n**Message:** [Jump to Message](${reaction.message.url})\n**Channel:** <#${reaction.message.channel.id}> (\`${reaction.message.channel.id}\`)\n**Reaction:** ${reaction.emoji.toString()}\n\n**Violation:** Adding/removing reactions too rapidly (**${spamCount}** actions in 5 seconds).`)
                    .setTimestamp();
                await sendDiscordLog(guild, 'reaction', { embeds: [reactionEmbed] });
            } else if (isRapid && !isSpam) { // Log rapid toggle
                const { sendDiscordLog } = require('../utils/serverLogger');
                const { EmbedBuilder } = require('discord.js');
                const reactionEmbed = new EmbedBuilder()
                    .setColor(0xef4444) // Red
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`⏱️ Rapid Reaction Removed`)
                    .setDescription(`**User:** <@${user.id}> (\`${user.id}\`)\n**Message:** [Jump to Message](${reaction.message.url})\n**Channel:** <#${reaction.message.channel.id}> (\`${reaction.message.channel.id}\`)\n**Reaction:** ${reaction.emoji.toString()}\n\n**Duration:** Added and removed within **${(duration / 1000).toFixed(1)}**s (Reaction Ping/Snipe).`)
                    .setTimestamp();
                await sendDiscordLog(guild, 'reaction', { embeds: [reactionEmbed] });
            }
        } catch (err) {
            console.error('Error in reaction remove logging:', err);
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

                    let starboardRecord = await StarboardMessage.findOne({ messageId: reaction.message.id });
                    if (starboardRecord) {
                        const starboardChannel = guild.channels.cache.get(settings.starboard.channelId);
                        if (starboardChannel) {
                            // Fetch reaction users to count remaining (exclude bots and author self-star)
                            const users = await reaction.users.fetch();
                            let starCount = 0;
                            users.forEach(u => {
                                if (!u.bot && u.id !== reaction.message.author.id) {
                                    starCount++;
                                }
                            });

                            if (starCount < (settings.starboard.threshold || 3)) {
                                // Drop below threshold: delete starboard message
                                try {
                                    const starMessage = await starboardChannel.messages.fetch(starboardRecord.starboardMessageId);
                                    if (starMessage) {
                                        await starMessage.delete();
                                    }
                                } catch (err) {
                                    // message might already be deleted
                                }
                                await StarboardMessage.deleteOne({ messageId: reaction.message.id });
                            } else {
                                // Threshold met, update stars count
                                try {
                                    const starMessage = await starboardChannel.messages.fetch(starboardRecord.starboardMessageId);
                                    if (starMessage) {
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

                                        await starMessage.edit({
                                            content: `${settings.starboard.emoji || '⭐'} **${starCount}** | <#${reaction.message.channel.id}>`,
                                            embeds: [embed]
                                        });
                                        starboardRecord.stars = starCount;
                                        await starboardRecord.save();
                                    }
                                } catch (err) {
                                    console.error('[Starboard] Failed to update starboard message on reaction remove:', err);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Starboard] Error checking messageReactionRemove:', err);
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

            // Check if the bot can remove this role
            const botMember = guild.members.me;
            if (!botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
                return;
            }

            // Remove the role
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                
                // Log the event
                const { logServerEvent } = require('../utils/serverLogger');
                await logServerEvent(
                    guild.id,
                    'ROLE_REMOVE',
                    `Removed role @${role.name} from ${user.username} via reaction role`,
                    botMember.user,
                    user,
                    { roleId: role.id, roleName: role.name, messageId: reaction.message.id }
                );
            }
        } catch (err) {
            console.error('[ReactionRoles] Error handling messageReactionRemove:', err);
        }
    }
};
