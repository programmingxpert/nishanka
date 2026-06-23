/* eslint-disable */
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Configure the Starboard system for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current starboard settings.'))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable the Starboard.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set the designated starboard channel.')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The starboard text channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('threshold')
                .setDescription('Set the minimum stars required for a message to be starboarded.')
                .addIntegerOption(opt =>
                    opt.setName('count')
                        .setDescription('Number of reactions (minimum 1)')
                        .setMinValue(1)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('emoji')
                .setDescription('Set the reaction emoji for the starboard (standard unicode or custom ID).')
                .addStringOption(opt => opt.setName('emoji').setDescription('Reaction emoji (e.g. ⭐)').setRequired(true))),

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

            if (!settings.starboard) {
                settings.starboard = { enabled: false, channelId: null, emoji: '⭐', threshold: 3 };
            }

            if (sub === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F) // Gold
                    .setTitle('⭐ Starboard Configuration')
                    .setDescription(
                        `⚙️ **Status:** ${settings.starboard.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.starboard.channelId ? `<#${settings.starboard.channelId}>` : 'None'}\n` +
                        `✨ **Reaction Emoji:** ${settings.starboard.emoji || '⭐'}\n` +
                        `🎯 **Star Threshold:** \`${settings.starboard.threshold || 3} reactions\``
                    )
                    .setFooter({ text: 'Nishanka Starboard System' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.starboard.enabled = enabled;
                await settings.save();
                return interaction.reply(`⭐ Starboard has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channel = interaction.options.getChannel('channel');
                settings.starboard.channelId = channel.id;
                await settings.save();
                return interaction.reply(`⭐ Starboard channel has been set to ${channel}.`);
            }

            if (sub === 'threshold') {
                const count = interaction.options.getInteger('count');
                settings.starboard.threshold = count;
                await settings.save();
                return interaction.reply(`⭐ Starboard threshold has been set to **${count}** reactions.`);
            }

            if (sub === 'emoji') {
                const emoji = interaction.options.getString('emoji').trim();
                settings.starboard.emoji = emoji;
                await settings.save();
                return interaction.reply(`⭐ Starboard emoji has been set to: ${emoji}`);
            }

        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update starboard settings.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!await checkCommandPermission(message, 'bot')) {
            return message.reply('❌ You do not have permission to run this command.').catch(() => {});
        }

        const guildId = message.guild.id;
        const sub = args[0]?.toLowerCase();

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.starboard) {
                settings.starboard = { enabled: false, channelId: null, emoji: '⭐', threshold: 3 };
            }

            if (!sub || sub === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('⭐ Starboard Configuration')
                    .setDescription(
                        `⚙️ **Status:** ${settings.starboard.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.starboard.channelId ? `<#${settings.starboard.channelId}>` : 'None'}\n` +
                        `✨ **Reaction Emoji:** ${settings.starboard.emoji || '⭐'}\n` +
                        `🎯 **Star Threshold:** \`${settings.starboard.threshold || 3} reactions\`\n\n` +
                        `*Use prefix command: \`-starboard toggle <on/off>\`, \`-starboard channel <#channel>\`, \`-starboard threshold <number>\`, or \`-starboard emoji <emoji>\`*`
                    )
                    .setFooter({ text: 'Nishanka Starboard System' })
                    .setTimestamp();

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
                        return message.reply('❌ Please specify `on` or `off`! Example: `-starboard toggle on`');
                    }
                }
                settings.starboard.enabled = enabled;
                await settings.save();
                return message.reply(`⭐ Starboard has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channelArg = args[1];
                if (!channelArg) {
                    return message.reply('❌ Please specify a text channel! Example: `-starboard channel #starboard`');
                }
                const channelId = channelArg.replace(/[<#&>]/g, '');
                const targetChannel = message.guild.channels.cache.get(channelId);
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return message.reply('❌ Please mention a valid text channel!');
                }
                settings.starboard.channelId = targetChannel.id;
                await settings.save();
                return message.reply(`⭐ Starboard channel has been set to ${targetChannel}.`);
            }

            if (sub === 'threshold' || sub === 'limit') {
                const countArg = args[1];
                const count = parseInt(countArg);
                if (isNaN(count) || count < 1) {
                    return message.reply('❌ Please specify a valid threshold count (minimum 1)!');
                }
                settings.starboard.threshold = count;
                await settings.save();
                return message.reply(`⭐ Starboard threshold has been set to **${count}** reactions.`);
            }

            if (sub === 'emoji') {
                const emoji = args[1]?.trim();
                if (!emoji) {
                    return message.reply('❌ Please specify a reaction emoji!');
                }
                settings.starboard.emoji = emoji;
                await settings.save();
                return message.reply(`⭐ Starboard emoji has been set to: ${emoji}`);
            }

        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update starboard settings.');
        }
    }
};
