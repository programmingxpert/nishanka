const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('snipetoggle')
        .setDescription('Enable or disable the snipe feature in the server.')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        const enabled = interaction.options.getBoolean('enabled');
        const guildId = interaction.guild.id;

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            settings.bot.snipeEnabled = enabled;
            await settings.save();

            return interaction.reply(
                (enabled ? '🟢' : '🔴') + ` Snipe feature has been **${enabled ? 'enabled' : 'disabled'}** for this server.`
            );
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update snipe settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.');
        }

        const guildId = message.guild.id;
        const arg = args[0]?.toLowerCase();

        let enabled;
        if (arg === 'on' || arg === 'true' || arg === 'yes' || arg === 'enable') enabled = true;
        else if (arg === 'off' || arg === 'false' || arg === 'no' || arg === 'disable') enabled = false;
        else {
            return message.reply('❌ Specify `on` or `off`. Example: `-snipetoggle on`');
        }

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            settings.bot.snipeEnabled = enabled;
            await settings.save();

            return message.reply(
                (enabled ? '🟢' : '🔴') + ` Snipe feature has been **${enabled ? 'enabled' : 'disabled'}** for this server.`
            );
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update snipe settings.');
        }
    }
};
