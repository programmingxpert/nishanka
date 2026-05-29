/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('defaultpurge')
        .setDescription('Set the default number of messages deleted when /purge is run without an amount.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Default purge amount (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.bot) {
                settings.bot = {};
            }

            settings.bot.defaultPurgeAmount = amount;
            await settings.save();

            return interaction.reply(`✅ The default purge amount for this server has been set to **${amount}** messages.`);
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to save default purge settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need `Manage Server` permissions to use this command.');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('⚠️ Please provide a valid default amount between 1 and 100. Usage: `-defaultpurge <amount>`');
        }

        const guildId = message.guild.id;

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.bot) {
                settings.bot = {};
            }

            settings.bot.defaultPurgeAmount = amount;
            await settings.save();

            return message.reply(`✅ The default purge amount for this server has been set to **${amount}** messages.`);
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update default purge settings.');
        }
    }
};
