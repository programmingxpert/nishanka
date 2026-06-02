const MemberStats = require('../models/MemberStats');
const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        // ─── 1. Invite Tracking ───
        if (client.invites) {
            try {
                const newInvites = await member.guild.invites.fetch().catch(() => null);
                if (newInvites) {
                    const oldInvites = client.invites.get(member.guild.id);
                    if (oldInvites) {
                        const invite = newInvites.find(i => i.uses > (oldInvites.get(i.code) || 0));
                        if (invite && invite.inviterId) {
                            await MemberStats.findOneAndUpdate(
                                { guildId: member.guild.id, userId: invite.inviterId },
                                { $inc: { invitesCount: 1 } },
                                { upsert: true }
                            );
                        }
                        client.invites.set(member.guild.id, new Map(newInvites.map((i) => [i.code, i.uses])));
                    }
                }
            } catch (e) {
                console.error('Error tracking guildMemberAdd invite:', e);
            }
        }

        // ─── 2. Fetch Guild Settings ───
        try {
            const settings = await GuildSettings.findOne({ guildId: member.guild.id }).lean();
            if (!settings) return;

            // ─── 3. Auto-Role ───
            if (settings.autoRole?.enabled && settings.autoRole?.roleId) {
                await member.roles.add(settings.autoRole.roleId).catch(err => {
                    console.error(`[Auto-Role] Failed to assign role to ${member.user.tag}:`, err.message);
                });
            }

            // ─── 4. Welcome Messages ───
            if (settings.welcome?.enabled && settings.welcome?.channelId && settings.welcome?.joinMessage) {
                const welcomeChannel = member.guild.channels.cache.get(settings.welcome.channelId);
                if (welcomeChannel) {
                    const greeting = settings.welcome.joinMessage
                        .replace(/{user\.name}/g, member.user.username)
                        .replace(/{user\.mention}/g, `<@${member.user.id}>`)
                        .replace(/{server\.name}/g, member.guild.name)
                        .replace(/{server\.memberCount}/g, member.guild.memberCount.toString());
                    welcomeChannel.send(greeting).catch(err => {
                        console.error(`[Welcome Message] Failed to send to ${welcomeChannel.name}:`, err.message);
                    });
                }
            }

            // ─── 5. Logging System (Member Join) ───
            if (settings.logging?.enabled && settings.logging?.channelId && settings.logging?.memberJoin !== false) {
                const logChannel = member.guild.channels.cache.get(settings.logging.channelId);
                if (logChannel) {
                    const joinEmbed = new EmbedBuilder()
                        .setColor(0x4ade80) // Premium bright emerald green
                        .setAuthor({ name: 'Member Joined', iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`📥 **${member.user.tag}** (<@${member.user.id}>) has joined the server.`)
                        .addFields(
                            { name: 'User ID', value: `\`${member.user.id}\``, inline: true },
                            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [joinEmbed] }).catch(err => {
                        console.error(`[Logging] Failed to send member join to ${logChannel.name}:`, err.message);
                    });
                }
            }

        } catch (err) {
            console.error('Error in guildMemberAdd event handler:', err);
        }
    }
};
