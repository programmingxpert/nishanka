const { EmbedBuilder } = require('discord.js');
const { sendDiscordLog } = require('../utils/serverLogger');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // Determine the action
        let title = '';
        let description = '';
        let color = 0x3b82f6; // Blue default

        if (!oldChannel && newChannel) {
            // Joined voice channel
            title = '🎙️ Joined Voice Channel';
            description = `**Member:** ${member} (\`${member.user.id}\`)\n**Channel:** ${newChannel.name} (\`${newChannel.id}\`)`;
            color = 0x10b981; // Green
        } else if (oldChannel && !newChannel) {
            // Left voice channel
            title = '🔇 Left Voice Channel';
            description = `**Member:** ${member} (\`${member.user.id}\`)\n**Channel:** ${oldChannel.name} (\`${oldChannel.id}\`)`;
            color = 0xef4444; // Red
        } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
            // Switched voice channel
            title = '🔄 Switched Voice Channel';
            description = `**Member:** ${member} (\`${member.user.id}\`)\n**From:** ${oldChannel.name} (\`${oldChannel.id}\`)\n**To:** ${newChannel.name} (\`${newChannel.id}\`)`;
            color = 0xf59e0b; // Orange
        } else {
            // Other updates (mute/unmute, deafen/undeafen, etc.)
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp()
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            });

        await sendDiscordLog(guild, 'voice', { embeds: [embed] });
    }
};
