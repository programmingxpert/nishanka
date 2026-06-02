const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        try {
            const settings = await GuildSettings.findOne({ guildId: member.guild.id }).lean();
            if (!settings) return;

            // ─── 1. Goodbye Messages ───
            if (settings.welcome?.enabled && settings.welcome?.channelId && settings.welcome?.leaveMessage) {
                const welcomeChannel = member.guild.channels.cache.get(settings.welcome.channelId);
                if (welcomeChannel) {
                    const message = settings.welcome.leaveMessage
                        .replace(/{user\.name}/g, member.user.username)
                        .replace(/{user\.mention}/g, `<@${member.user.id}>`)
                        .replace(/{server\.name}/g, member.guild.name)
                        .replace(/{server\.memberCount}/g, member.guild.memberCount.toString());
                    welcomeChannel.send(message).catch(err => {
                        console.error(`[Goodbye Message] Failed to send to ${welcomeChannel.name}:`, err.message);
                    });
                }
            }

            // ─── 2. Logging System (Member Leave) ───
            if (settings.logging?.enabled && settings.logging?.channelId && settings.logging?.memberLeave !== false) {
                const logChannel = member.guild.channels.cache.get(settings.logging.channelId);
                if (logChannel) {
                    const joinedTime = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
                    const leaveEmbed = new EmbedBuilder()
                        .setColor(0xf87171) // Premium bright red/coral
                        .setAuthor({ name: 'Member Left', iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`📤 **${member.user.tag}** (<@${member.user.id}>) has left the server.`)
                        .addFields(
                            { name: 'User ID', value: `\`${member.user.id}\``, inline: true },
                            { name: 'Joined Guild', value: joinedTime, inline: true }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [leaveEmbed] }).catch(err => {
                        console.error(`[Logging] Failed to send member leave to ${logChannel.name}:`, err.message);
                    });
                }
            }

        } catch (err) {
            console.error('Error in guildMemberRemove event handler:', err);
        }
    }
};
