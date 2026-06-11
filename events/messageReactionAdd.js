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
