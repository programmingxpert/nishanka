const Ticket = require('../models/ticketSchema');
const GuildSettings = require('../models/guildSettingsSchema');
const config = require('../config.json');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

/**
 * Closes an open ticket, saves transcript, logs to channel, DMs user, and deletes the channel.
 * @param {object} params
 * @param {object} params.guild
 * @param {object} params.channel
 * @param {object} params.member
 * @param {object} params.user
 * @param {object} params.client
 * @param {function} params.replyFn - Function to reply/send progress messages
 */
async function closeTicket({ guild, channel, member, user, client, replyFn }) {
    const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
    if (!ticket) {
        return replyFn('❌ This channel is not an active ticket channel.');
    }

    const settings = await GuildSettings.findOne({ guildId: guild.id });
    
    // Check permissions: admin, server owner, bot developer, staff role, or ticket creator
    let hasPermission = false;
    if (member.permissions.has('Administrator') || guild.ownerId === user.id || user.id === config.devId) {
        hasPermission = true;
    } else if (settings?.tickets?.staffRoleId && member.roles.cache.has(settings.tickets.staffRoleId)) {
        hasPermission = true;
    } else if (ticket.userId === user.id) {
        hasPermission = true;
    }

    if (!hasPermission) {
        return replyFn('❌ You do not have permission to close this ticket.');
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = user.id;
    await ticket.save();

    await replyFn('🔒 **Ticket closed.** Compiling transcript and archiving...');

    // Generate transcript text
    let transcriptText = `--- TICKET #${String(ticket.ticketNumber).padStart(4, '0')} TRANSCRIPT ---\n`;
    transcriptText += `Guild: ${guild.name} (${guild.id})\n`;
    transcriptText += `User: ${ticket.userId}\n`;
    transcriptText += `Created At: ${ticket.createdAt.toISOString()}\n`;
    transcriptText += `Closed At: ${ticket.closedAt.toISOString()}\n`;
    transcriptText += `Closed By: ${ticket.closedBy}\n\n`;

    for (const msg of ticket.transcript) {
        transcriptText += `[${msg.timestamp.toISOString()}] ${msg.senderTag} (${msg.senderId}): ${msg.content}\n`;
    }

    // Log to log channel
    if (settings?.tickets?.logChannelId) {
        const logChannel = guild.channels.cache.get(settings.tickets.logChannelId);
        if (logChannel) {
            const buffer = Buffer.from(transcriptText, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `ticket-${ticket.ticketNumber}-transcript.txt` });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle(`🔒 Ticket #${String(ticket.ticketNumber).padStart(4, '0')} Closed`)
                .setDescription(`👤 **User:** <@${ticket.userId}> (${ticket.userId})\n🛠️ **Closed By:** <@${user.id}>\n⏱️ **Duration:** ${Math.round((ticket.closedAt - ticket.createdAt) / 60000)} minutes`)
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(err => console.error('Failed to send ticket log:', err));
        }
    }

    // Try sending DM to user
    try {
        const ticketCreator = await client.users.fetch(ticket.userId).catch(() => null);
        if (ticketCreator) {
            const buffer = Buffer.from(transcriptText, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `ticket-${ticket.ticketNumber}-transcript.txt` });

            await ticketCreator.send({
                content: `👋 Your ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** in **${guild.name}** has been closed. Attached is your chat transcript.`,
                files: [attachment]
            }).catch(() => {});
        }
    } catch (_) {}

    // Delay deletion by 5 seconds
    setTimeout(async () => {
        await channel.delete().catch(err => console.error('Failed to delete ticket channel:', err));
    }, 5000);
}

module.exports = {
    closeTicket
};
