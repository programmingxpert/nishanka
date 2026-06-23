const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configure auto-role assignment for new members.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current auto-role configuration.'))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable auto-role assignment.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('role')
                .setDescription('Set the role to automatically assign.')
                .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))),

    async execute(interaction) {
        if (!await checkCommandPermission(interaction, 'bot')) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (sub === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle('🏷️ Auto-Role Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.autoRole.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `🛡️ **Assigned Role:** ${settings.autoRole.roleId ? `<@&${settings.autoRole.roleId}>` : 'None set'}`
                    );
                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.autoRole.enabled = enabled;
                await settings.save();
                return interaction.reply(`` + (enabled ? '🟢' : '🔴') + ` Auto-role assignment has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'role') {
                const role = interaction.options.getRole('role');
                settings.autoRole.roleId = role.id;
                await settings.save();
                return interaction.reply(`✅ Auto-role has been set to ${role}.`);
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update auto-role settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.');
        }

        const guildId = message.guild.id;
        const sub = args[0]?.toLowerCase();

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!sub || sub === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle('🏷️ Auto-Role Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.autoRole.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `🛡️ **Assigned Role:** ${settings.autoRole.roleId ? `<@&${settings.autoRole.roleId}>` : 'None set'}\n\n` +
                        `*Use prefix command: \`-autorole toggle <on/off>\` or \`-autorole role <@role>\`*`
                    );
                return message.reply({ embeds: [embed] });
            }

            if (sub === 'toggle' || sub === 'enable' || sub === 'disable') {
                let enabled;
                if (sub === 'enable') enabled = true;
                else if (sub === 'disable') enabled = false;
                else {
                    const arg = args[1]?.toLowerCase();
                    if (arg === 'on' || arg === 'true' || arg === 'yes' || arg === 'enable') enabled = true;
                    else if (arg === 'off' || arg === 'false' || arg === 'no' || arg === 'disable') enabled = false;
                    else {
                        return message.reply('❌ Specify `on` or `off`. Example: `-autorole toggle on`');
                    }
                }
                settings.autoRole.enabled = enabled;
                await settings.save();
                return message.reply(`` + (enabled ? '🟢' : '🔴') + ` Auto-role assignment has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'role') {
                const roleMention = args[1];
                if (!roleMention) {
                    return message.reply('❌ Please mention a role. Example: `-autorole role @Member`');
                }
                const roleId = roleMention.replace(/[<@&>]/g, '');
                const targetRole = message.guild.roles.cache.get(roleId);
                if (!targetRole) {
                    return message.reply('❌ Please mention a valid server role.');
                }
                settings.autoRole.roleId = targetRole.id;
                await settings.save();
                return message.reply(`✅ Auto-role has been set to **${targetRole.name}**.`);
            }

            return message.reply('❌ Unknown auto-role subcommand. Use: `view`, `toggle`, or `role`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update auto-role settings.');
        }
    }
};
