/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'music',
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggles or sets the loop/repeat mode for the music player.')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('The loop mode (track/queue/off).')
                .setRequired(false)
                .addChoices(
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                    { name: 'Off', value: 'none' }
                )
        ),

    async execute(interaction) {
        await this.handleLoop(interaction, interaction.client, interaction.guild.id, true);
    },

    async executePrefix(message, args) {
        await this.handleLoop(message, message.client, message.guild.id, false, args);
    },

    async handleLoop(interactionOrMessage, client, guildId, isSlash, args = []) {
        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        const member = isSlash ? interactionOrMessage.member : interactionOrMessage.member;
        const channel = member?.voice?.channel;

        if (!channel) {
            const msg = '❌ You must be in a voice channel.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

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
            const msg = '❌ Not playing in this server.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }

        // Get loop mode from option or args
        let mode = null;
        if (isSlash) {
            mode = interactionOrMessage.options.getString('mode');
        } else if (args.length > 0) {
            const arg = args[0].toLowerCase();
            if (['track', 'song', 'one'].includes(arg)) mode = 'track';
            else if (['queue', 'all', 'q'].includes(arg)) mode = 'queue';
            else if (['off', 'none', 'disable'].includes(arg)) mode = 'none';
        }

        // If no mode is specified, toggle through: none -> track -> queue -> none
        if (!mode) {
            const currentLoop = player.loop || 'none';
            if (currentLoop === 'none') mode = 'track';
            else if (currentLoop === 'track') mode = 'queue';
            else mode = 'none';
        }

        try {
            player.setLoop(mode);

            let statusText = 'Off';
            let emoji = '➡️';
            if (mode === 'track') {
                statusText = 'Repeat Track';
                emoji = '🔂';
            } else if (mode === 'queue') {
                statusText = 'Repeat Queue';
                emoji = '🔁';
            }

            const embed = new EmbedBuilder()
                .setColor('#FF7A00')
                .setDescription(`${emoji} Loop mode set to: **${statusText}**`);

            return isSlash
                ? interactionOrMessage.reply({ embeds: [embed] })
                : interactionOrMessage.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting loop mode:', error);
            const msg = '❌ An error occurred while setting the loop mode.';
            return isSlash
                ? interactionOrMessage.reply({ content: msg, ephemeral: true })
                : interactionOrMessage.reply(msg);
        }
    }
};
