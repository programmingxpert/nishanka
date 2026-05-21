/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the currently playing song.'),

    async execute(interaction) {
        await this.pauseCommand(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message) {
        await this.pauseCommand(message, message.client, message.guild.id, false);
    },

    async pauseCommand(interactionOrMessage, client, guildId, isSlash) {
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

        if (!player) {
            const replyContent = '❌ Not playing in this server.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
        }

        if (!player.playing) {
            const replyContent = '❌ Nothing is currently playing.';
            const options = { content: replyContent };
            if (isSlash) options.ephemeral = true;
            return isSlash ? interactionOrMessage.reply(options) : interactionOrMessage.reply(replyContent);
        }

        try {
            player.pause(true); // Pause the player.  Argument sets paused to true.

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription('⏸️ Paused the music.');

            const options = { embeds: [embed] };
             if(isSlash) await interactionOrMessage.reply(options);
             else await interactionOrMessage.reply(options)

        } catch (error) {
            console.error("Error pausing the music:", error);
            const replyContent = '❌ An error occurred while pausing the music.';
             const options = { content: replyContent };
              if (isSlash) options.ephemeral = true;
             if(isSlash) await interactionOrMessage.reply(options);
             else await interactionOrMessage.reply(options)
        }
    }
};