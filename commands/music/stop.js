/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and clears the queue, disconnecting the bot.'),

    async execute(interaction) {
        await this.stopCommand(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.stopCommand(message, message.client, message.guild.id, false);
    },

    async stopCommand(interactionOrMessage, client, guildId, isSlash) {
        const player = client.activePlayers.get(guildId);

        if (!player) {
            const replyContent = '❌ Not playing in this server.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
        }

        try {
            // 1. Stop the player
            player.stop();

            // 2. Clear the queue (important!)
            player.queue.clear();

            // 3. Destroy the player connection (disconnects the bot)
            player.destroy();

            // 4. Remove the player from the active players map
            client.activePlayers.delete(guildId);

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription('⏹️ Stopped the music, cleared the queue, and disconnected.');

            const options = { embeds: [embed] };
            if (isSlash) await interactionOrMessage.reply(options);
            else await interactionOrMessage.reply(options);


        } catch (error) {
            console.error("Error stopping the music:", error);
            const replyContent = '❌ An error occurred while stopping the music.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            if(!isSlash) await interactionOrMessage.reply(options)
            else await interactionOrMessage.reply(options);
        }
    }
};