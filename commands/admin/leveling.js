const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('leveling')
        .setDescription('Configure leveling settings.')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current leveling configuration.'))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable leveling.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable leveling?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set the level up announcement channel.')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel (leave empty to reset)').addChannelTypes(ChannelType.GuildText).setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('multiplier')
                .setDescription('Set the leveling baubles multiplier.')
                .addNumberOption(opt => opt.setName('value').setDescription('Multiplier value (e.g. 100)').setRequired(true))),

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
                    .setColor(0x2ecc71)
                    .setTitle('📈 Leveling Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.leveling.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📢 **Level Up Channel:** ${settings.leveling.levelUpChannelId ? `<#${settings.leveling.levelUpChannelId}>` : 'Announce in current channel (System Default)'}\n` +
                        `⭐ **Baubles Multiplier:** \`${settings.leveling.baublesMultiplier ?? 100}\`x`
                    );
                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.leveling.enabled = enabled;
                await settings.save();
                return interaction.reply(
                    (enabled ? '🟢' : '🔴') + ` Leveling system has been **${enabled ? 'enabled' : 'disabled'}**.`
                );
            }

            if (sub === 'channel') {
                const channel = interaction.options.getChannel('channel');
                if (channel) {
                    settings.leveling.levelUpChannelId = channel.id;
                    await settings.save();
                    return interaction.reply(`✅ Level up channel has been set to ${channel}.`);
                } else {
                    settings.leveling.levelUpChannelId = null;
                    await settings.save();
                    return interaction.reply(`✅ Level up channel has been reset. Announcements will now post where the level up occurred.`);
                }
            }

            if (sub === 'multiplier') {
                const value = interaction.options.getNumber('value');
                if (value < 0) {
                    return interaction.reply({ content: '❌ Multiplier must be a positive number.', ephemeral: true });
                }
                settings.leveling.baublesMultiplier = value;
                await settings.save();
                return interaction.reply(`✅ Leveling baubles multiplier has been set to \`${value}\`x.`);
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update leveling settings.', ephemeral: true });
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
                    .setColor(0x2ecc71)
                    .setTitle('📈 Leveling Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.leveling.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📢 **Level Up Channel:** ${settings.leveling.levelUpChannelId ? `<#${settings.leveling.levelUpChannelId}>` : 'Announce in current channel (System Default)'}\n` +
                        `⭐ **Baubles Multiplier:** \`${settings.leveling.baublesMultiplier ?? 100}\`x\n\n` +
                        `*Use prefix command: \`-leveling toggle <on/off>\`, \`-leveling channel <#channel/off>\`, or \`-leveling multiplier <number>\`*`
                    );
                return message.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const arg = args[1]?.toLowerCase();
                let enabled;
                if (arg === 'on' || arg === 'true' || arg === 'yes' || arg === 'enable') enabled = true;
                else if (arg === 'off' || arg === 'false' || arg === 'no' || arg === 'disable') enabled = false;
                else {
                    return message.reply('❌ Specify `on` or `off`. Example: `-leveling toggle on`');
                }
                settings.leveling.enabled = enabled;
                await settings.save();
                return message.reply((enabled ? '🟢' : '🔴') + ` Leveling system has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const arg = args[1]?.toLowerCase();
                if (!arg || arg === 'off' || arg === 'none' || arg === 'reset') {
                    settings.leveling.levelUpChannelId = null;
                    await settings.save();
                    return message.reply(`✅ Level up channel has been reset. Announcements will now post where the level up occurred.`);
                }
                const channelId = arg.replace(/[<#&>]/g, '');
                const targetChannel = message.guild.channels.cache.get(channelId);
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return message.reply('❌ Please mention a valid text channel.');
                }
                settings.leveling.levelUpChannelId = targetChannel.id;
                await settings.save();
                return message.reply(`✅ Level up channel has been set to ${targetChannel}.`);
            }

            if (sub === 'multiplier') {
                const arg = args[1];
                const value = parseFloat(arg);
                if (isNaN(value) || value < 0) {
                    return message.reply('❌ Please specify a valid positive number for the multiplier.');
                }
                settings.leveling.baublesMultiplier = value;
                await settings.save();
                return message.reply(`✅ Leveling baubles multiplier has been set to \`${value}\`x.`);
            }

            return message.reply('❌ Unknown leveling subcommand. Use: `view`, `toggle`, `channel`, or `multiplier`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update leveling settings.');
        }
    }
};
