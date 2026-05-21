/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('clearmusic')
        .setDescription('Clears all songs from the current queue.'),

    async execute(interaction) {
        await this.clearCommand(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.clearCommand(message, message.client, message.guild.id, false);
    },

    async clearCommand(interactionOrMessage, client, guildId, isSlash) {
        const member = isSlash ? interactionOrMessage.member : interactionOrMessage.member;
        
        const settings = await GuildSettings.findOne({ guildId });
        if (settings?.music?.djRoleId) {
            if (!member.roles.cache.has(settings.music.djRoleId)) {
                const msg = '❌ Only members with the DJ role can use this command.';
                return isSlash
                    ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                    : interactionOrMessage.reply(msg);
            }
        }

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