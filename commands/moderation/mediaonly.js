const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const MediaOnly = require('../../models/mediaOnlySchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('mediaonly')
        .setDescription('Toggle media-only mode for a channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to manage.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('status')
                .setDescription('Enable or disable media-only mode.')
                .setRequired(false)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const status = interaction.options.getBoolean('status');
        const guildId = interaction.guild.id;

        try {
            let settings = await MediaOnly.findOne({ guildId, channelId: channel.id });

            if (status === null) {
                // Toggle mode
                if (settings && settings.enabled) {
                    await MediaOnly.findOneAndUpdate({ guildId, channelId: channel.id }, { enabled: false });
                    return interaction.reply({ content: `✅ Media-only mode disabled for <#${channel.id}>.` });
                } else {
                    await MediaOnly.findOneAndUpdate(
                        { guildId, channelId: channel.id },
                        { enabled: true },
                        { upsert: true }
                    );
                    return interaction.reply({ content: `✅ Media-only mode enabled for <#${channel.id}>. Only images, videos, and links are allowed.` });
                }
            } else {
                // Set explicit status
                if (status) {
                    await MediaOnly.findOneAndUpdate(
                        { guildId, channelId: channel.id },
                        { enabled: true },
                        { upsert: true }
                    );
                    return interaction.reply({ content: `✅ Media-only mode enabled for <#${channel.id}>.` });
                } else {
                    await MediaOnly.findOneAndUpdate(
                        { guildId, channelId: channel.id },
                        { enabled: false }
                    );
                    return interaction.reply({ content: `✅ Media-only mode disabled for <#${channel.id}>.` });
                }
            }
        } catch (error) {
            console.error('Error in mediaonly command:', error);
            return interaction.reply({ content: '❌ An error occurred while updating media-only settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You require `ManageChannels` permission.');
        }

        const channel = message.mentions.channels.first() || message.channel;
        const guildId = message.guild.id;

        try {
            let settings = await MediaOnly.findOne({ guildId, channelId: channel.id });

            if (settings && settings.enabled) {
                await MediaOnly.findOneAndUpdate({ guildId, channelId: channel.id }, { enabled: false });
                return message.reply(`✅ Media-only mode disabled for <#${channel.id}>.`);
            } else {
                await MediaOnly.findOneAndUpdate(
                    { guildId, channelId: channel.id },
                    { enabled: true },
                    { upsert: true }
                );
                return message.reply(`✅ Media-only mode enabled for <#${channel.id}>. Only images, videos, and links are allowed.`);
            }
        } catch (error) {
            console.error('Error in mediaonly prefix command:', error);
            return message.reply('❌ An error occurred while updating media-only settings.');
        }
    }
};
