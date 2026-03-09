/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('clearmusic')
        .setDescription('Clears the entire music queue.'),

    async execute(interaction) {
        await this.clearQueue(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.clearQueue(message, message.client, message.guild.id, false);
    },

    async clearQueue(interactionOrMessage, client, guildId, isSlash) {
        const player = client.activePlayers.get(guildId);

        if (!player || !player.queue || player.queue.size === 0) {
            const replyContent = '❌ The queue is already empty!';
            if (isSlash) {
                return interactionOrMessage.reply({ content: replyContent, ephemeral: true });
            } else {
                return interactionOrMessage.reply(replyContent);
            }
        }

        const queueSize = player.queue.size;

        player.queue.clear();

        const embed = new EmbedBuilder()
            .setColor('#FF7A00')
            .setTitle('🧹 Queue Cleared')
            .setDescription(`Cleared **${queueSize}** tracks from the queue.`);

        if (isSlash) {
            await interactionOrMessage.reply({ embeds: [embed] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    }
};