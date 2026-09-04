/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current music queue.'),

    async execute(interaction) {
        await this.displayQueue(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.displayQueue(message, message.client, message.guild.id, false);
    },

    async displayQueue(interactionOrMessage, client, guildId, isSlash) {
        const player = client.activePlayers.get(guildId);

        const queue = player?.queue;
        const currentTrack = player?.current;
        const queueSize = queue?.size ?? queue?.length ?? 0;

        if (!player || !queue || (!currentTrack && queueSize === 0)) {
            const replyContent = '❌ The queue is empty.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            return isSlash ? (interactionOrMessage.replied ? interactionOrMessage.editReply(options) : interactionOrMessage.reply(options)) : interactionOrMessage.reply(replyContent);
        }

        const embed = new EmbedBuilder()
            .setColor('#FF7A00')
            .setTitle('🎵 Music Queue')
            .setDescription(queueSize > 0 ? `There are currently **${queueSize}** track(s) up next.` : 'No tracks are queued after the current song.');

        if (currentTrack) {
            const requester = currentTrack.info.requester?.id || currentTrack.info.requester;
            embed.addFields({
                name: 'Now Playing:',
                value: `**[${currentTrack.info.title}](${currentTrack.info.uri})**${requester ? ` - Requested by <@${requester}>` : ''}`
            });
        }

        let queueString = "";
        let i = 1;
        const maxTracksToShow = 10; // Limit to 10 tracks to avoid exceeding the character limit.

        for (const track of queue) {
            const requester = track.info.requester?.id || track.info.requester;
            const requestedBy = requester ? ` - Requested by <@${requester}>` : '';
            const trackString = `**${i}.** [${track.info.title}](${track.info.uri})${requestedBy}\n`;

            if (queueString.length + trackString.length > 1024) {  // Check if adding the next track will exceed the limit
                queueString += `...and ${queueSize - i + 1} more.`;  // Indicate remaining tracks
                break; // Stop adding tracks
            }

            queueString += trackString;
            if (i === maxTracksToShow) break; // Also limit the total number of displayed tracks
            i++;
        }

        if (queueSize > 0) {
            embed.addFields({
                name: "Up Next:",
                value: queueString || "The queue is empty."  // In case queueString is still empty
            });
        }

        const options = { embeds: [embed] };
        if (isSlash) {
            if(interactionOrMessage.replied) await interactionOrMessage.editReply(options)
            else await interactionOrMessage.reply(options);
        } else {
            await interactionOrMessage.reply(options);
        }
    }
};
