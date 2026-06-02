const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('snipetoggle')
        .setDescription('Enable or disable the snipe feature in the server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)),

    async execute(interaction) {
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
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You need the **Administrator** permission to run this command.');
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
