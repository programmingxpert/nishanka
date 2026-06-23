/* eslint-disable */
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('setquoteschannel')
        .setDescription('Set or clear the designated channel where all server quotes will be sent!')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The quotes channel (leave empty to disable)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.bot) {
                settings.bot = { prefix: '', nickname: '', deleteInvoke: false, unknownCommandMsg: false };
            }

            if (channel) {
                settings.bot.quotesChannelId = channel.id;
                await settings.save();
                return interaction.reply(`✅ Quotes channel has been set to ${channel}! All quote cards generated in this server will now be routed there.`);
            } else {
                settings.bot.quotesChannelId = null;
                await settings.save();
                return interaction.reply('🗑️ Quotes channel has been disabled. Quote cards will be sent in the channel where the command is used.');
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to save settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.').catch(() => {});
        }

        const guildId = message.guild.id;
        const arg = args[0];

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.bot) {
                settings.bot = { prefix: '', nickname: '', deleteInvoke: false, unknownCommandMsg: false };
            }

            if (!arg) {
                // View current setting
                const currentChannelId = settings.bot?.quotesChannelId;
                if (currentChannelId) {
                    return message.reply(`📌 The current quotes channel is set to <#${currentChannelId}>.\nUse \`-setquoteschannel none\` to disable it.`);
                } else {
                    return message.reply('📌 No quotes channel is currently set. Quote cards will be sent where the command is used.');
                }
            }

            if (arg.toLowerCase() === 'none' || arg.toLowerCase() === 'clear' || arg.toLowerCase() === 'disable') {
                settings.bot.quotesChannelId = null;
                await settings.save();
                return message.reply('🗑️ Quotes channel has been disabled. Quote cards will be sent where the command is used.');
            }

            const channelId = arg.replace(/[<#&>]/g, '');
            const targetChannel = message.guild.channels.cache.get(channelId);

            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                return message.reply('❌ Please mention a valid text channel or use `none` to disable! Example: `-setquoteschannel #quotes`');
            }

            settings.bot.quotesChannelId = targetChannel.id;
            await settings.save();
            return message.reply(`✅ Quotes channel has been set to ${targetChannel}! All quote cards generated in this server will now be routed there.`);
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update quotes channel settings.');
        }
    }
};
