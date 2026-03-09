/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes the currently paused song.'),

    async execute(interaction) {
        await this.resumeCommand(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.resumeCommand(message, message.client, message.guild.id, false);
    },

    async resumeCommand(interactionOrMessage, client, guildId, isSlash) {
        const player = client.activePlayers.get(guildId);

        if (!player) {
            const replyContent = '❌ Not playing in this server.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
        }

        if (!player.paused) { // Check if the player is paused
            const replyContent = '❌ The music is not paused.';
             const options = { content: replyContent };
             if (isSlash) options.ephemeral = true;
             if(isSlash) await interactionOrMessage.reply(options);
             else await interactionOrMessage.reply(options)
            return;
        }

        try {
            player.pause(false); // Resume the player by setting paused to false.

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription('▶️ Resumed the music.');
             const options = { embeds: [embed] };
             if(isSlash) await interactionOrMessage.reply(options);
             else await interactionOrMessage.reply(options)

        } catch (error) {
            console.error("Error resuming the music:", error);
            const replyContent = '❌ An error occurred while resuming the music.';
              const options = { content: replyContent };
             if (isSlash) options.ephemeral = true;
            if(isSlash) await interactionOrMessage.reply(options);
             else await interactionOrMessage.reply(options)
        }
    }
};