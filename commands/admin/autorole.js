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

        const guild = message.guild;
        const guildId = guild.id;
        const firstArg = args[0]?.toLowerCase();

        const resolveRole = (input) => {
            if (!input) return null;
            // 1. Try mention or ID
            const cleanId = input.replace(/[<@&>]/g, '');
            let role = guild.roles.cache.get(cleanId);
            if (role) return role;
            
            // 2. Try matching full argument join (e.g. "cool peeps")
            const fullInput = args.join(' ').toLowerCase();
            role = guild.roles.cache.find(r => r.name.toLowerCase() === fullInput);
            if (role) return role;

            // 3. Try matching input as name
            return guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
        };

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            // 1. View configuration
            if (!firstArg || firstArg === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle('🏷️ Auto-Role Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.autoRole.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `🛡️ **Assigned Role:** ${settings.autoRole.roleId ? `<@&${settings.autoRole.roleId}>` : 'None set'}\n\n` +
                        `*Examples:* \`-autorole @Role\`, \`-autorole toggle on/off\`, \`-autorole role @Role\``
                    );
                return message.reply({ embeds: [embed] });
            }

            // 2. Direct state toggling: -autorole on / -autorole off / -autorole enable / -autorole disable
            if (['on', 'off', 'enable', 'disable', 'true', 'false'].includes(firstArg)) {
                const enabled = ['on', 'enable', 'true'].includes(firstArg);
                settings.autoRole.enabled = enabled;
                await settings.save();
                return message.reply(`${enabled ? '🟢' : '🔴'} Auto-role assignment has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 3. Toggle command: -autorole toggle [on/off]
            if (firstArg === 'toggle') {
                const secondArg = args[1]?.toLowerCase();
                let enabled;
                if (['on', 'enable', 'true', 'yes'].includes(secondArg)) {
                    enabled = true;
                } else if (['off', 'disable', 'false', 'no'].includes(secondArg)) {
                    enabled = false;
                } else if (!secondArg) {
                    // Flip state if no arg specified
                    enabled = !settings.autoRole.enabled;
                } else {
                    // Check if second arg is a role (e.g. -autorole toggle @role)
                    const targetRole = resolveRole(args.slice(1).join(' '));
                    if (targetRole) {
                        settings.autoRole.roleId = targetRole.id;
                        settings.autoRole.enabled = true;
                        await settings.save();
                        return message.reply(`🟢 Auto-role has been **enabled** and set to **${targetRole.name}**.`);
                    }
                    return message.reply('❌ Specify `on` or `off`. Example: `-autorole toggle on`');
                }
                settings.autoRole.enabled = enabled;
                await settings.save();
                return message.reply(`${enabled ? '🟢' : '🔴'} Auto-role assignment has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 4. Role command: -autorole role <@role/ID/Name>
            if (firstArg === 'role') {
                const roleInput = args.slice(1).join(' ');
                const targetRole = resolveRole(roleInput) || message.mentions.roles.first();
                if (!targetRole) {
                    return message.reply('❌ Please specify a valid role. Example: `-autorole role @Member`');
                }
                settings.autoRole.roleId = targetRole.id;
                settings.autoRole.enabled = true; // Auto-enable when setting a role!
                await settings.save();
                return message.reply(`✅ Auto-role set to **${targetRole.name}** and status **enabled**.`);
            }

            // 5. Clear command: -autorole clear / -autorole reset / -autorole remove
            if (['clear', 'reset', 'remove'].includes(firstArg)) {
                settings.autoRole.roleId = null;
                settings.autoRole.enabled = false;
                await settings.save();
                return message.reply('🗑️ Auto-role configuration has been cleared and disabled.');
            }

            // 6. Direct Role Mention or Role Name fallback: -autorole @Role or -autorole RoleName
            const directRole = resolveRole(args.join(' ')) || message.mentions.roles.first();
            if (directRole) {
                settings.autoRole.roleId = directRole.id;
                settings.autoRole.enabled = true;
                await settings.save();
                return message.reply(`✅ Auto-role set to **${directRole.name}** and status **enabled**.`);
            }

            return message.reply('❌ Unknown subcommand. Usage: `-autorole <@role>`, `-autorole toggle <on/off>`, or `-autorole role <@role>`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update auto-role settings.');
        }
    }
};
