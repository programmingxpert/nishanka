const GuildSettings = require('../models/guildSettingsSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageUpdate',

    async execute(oldMessage, newMessage, client) {
        // Ignore bots and direct messages
        if (!oldMessage.guild || oldMessage.author?.bot) return;

        // Skip partial messages where data isn't loaded
        if (oldMessage.partial || newMessage.partial) return;

        // Ignore if content did not change (e.g. embeds added, pin changes)
        if (oldMessage.content === newMessage.content) return;

        // ─── Logging System ───
        try {
            const settings = await GuildSettings.findOne({ guildId: oldMessage.guild.id }).lean();
            
            if (settings?.logging?.messageUpdate !== false) {
                const { logServerEvent, sendDiscordLog } = require('../utils/serverLogger');
                
                await logServerEvent(
                    oldMessage.guild.id,
                    'MESSAGE_UPDATE',
                    `Message edited in #${oldMessage.channel.name}`,
                    oldMessage.author,
                    null,
                    {
                        channelId: oldMessage.channel.id,
                        channelName: oldMessage.channel.name,
                        oldContent: oldMessage.content || '',
                        newContent: newMessage.content || ''
                    }
                );

                const oldMentions = oldMessage.mentions.users.filter(u => u.id !== oldMessage.author.id);
                const newMentions = newMessage.mentions.users.filter(u => u.id !== newMessage.author.id);
                const oldRoles = oldMessage.mentions.roles;
                const newRoles = newMessage.mentions.roles;

                const ghostedUsers = oldMentions.filter(u => !newMentions.has(u.id));
                const ghostedRoles = oldRoles.filter(r => !newRoles.has(r.id));
                const isGhostEveryone = oldMessage.mentions.everyone && !newMessage.mentions.everyone;
                const isGhostPing = (ghostedUsers.size > 0) || (ghostedRoles.size > 0) || isGhostEveryone;

                const editEmbed = new EmbedBuilder()
                    .setColor(isGhostPing ? 0xef4444 : 0x3b82f6) // Coral red for ghost ping, blue for normal edit
                    .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL({ dynamic: true }) })
                    .setTitle(isGhostPing ? `👻 Ghost Ping Detected (via Edit)` : `✏️ Message Edited`)
                    .setDescription(`**Author:** <@${oldMessage.author.id}> (\`${oldMessage.author.id}\`)\n**Channel:** <#${oldMessage.channel.id}> (\`${oldMessage.channel.id}\`)`)
                    .setTimestamp();

                if (isGhostPing) {
                    let pingDetails = '';
                    if (ghostedUsers.size > 0) {
                        pingDetails += `**Users:** ${ghostedUsers.map(u => `<@${u.id}>`).join(', ')}\n`;
                    }
                    if (ghostedRoles.size > 0) {
                        pingDetails += `**Roles:** ${ghostedRoles.map(r => `<@&${r.id}>`).join(', ')}\n`;
                    }
                    if (isGhostEveryone) {
                        pingDetails += `**Everyone/Here:** Yes\n`;
                    }
                    editEmbed.addFields({ name: 'Removed Pings (Ghost Ping)', value: pingDetails });
                }

                const oldCapped = oldMessage.content
                    ? (oldMessage.content.length > 1000 ? oldMessage.content.substring(0, 997) + '...' : oldMessage.content)
                    : '*None*';
                const newCapped = newMessage.content
                    ? (newMessage.content.length > 1000 ? newMessage.content.substring(0, 997) + '...' : newMessage.content)
                    : '*None*';

                editEmbed.addFields(
                    { name: 'Before', value: oldCapped },
                    { name: 'After', value: newCapped }
                );

                await sendDiscordLog(oldMessage.guild, 'text', { embeds: [editEmbed] }, oldMessage.channel.id);
            }
        } catch (err) {
            console.error('Error in messageUpdate logging handler:', err);
        }
    }
};
