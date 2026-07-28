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

        const guild = message.guild;
        const guildId = guild.id;
        const firstArg = args[0]?.toLowerCase();

        const resolveChannel = (input) => {
            if (!input) return null;
            const cleanId = input.replace(/[<#&>]/g, '');
            let ch = guild.channels.cache.get(cleanId);
            if (ch && ch.type === ChannelType.GuildText) return ch;
            return guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name.toLowerCase() === input.toLowerCase());
        };

        try {
            let settings = await GuildSettings.findOne({ guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId });
            }

            if (!settings.starboard) {
                settings.starboard = { enabled: false, channelId: null, emoji: '⭐', threshold: 3 };
            }

            // 1. View settings
            if (!firstArg || firstArg === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('⭐ Starboard Configuration')
                    .setDescription(
                        `⚙️ **Status:** ${settings.starboard.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.starboard.channelId ? `<#${settings.starboard.channelId}>` : 'None'}\n` +
                        `✨ **Reaction Emoji:** ${settings.starboard.emoji || '⭐'}\n` +
                        `🎯 **Star Threshold:** \`${settings.starboard.threshold || 3} reactions\`\n\n` +
                        `*Examples:* \`-starboard #starboard\`, \`-starboard toggle on/off\`, \`-starboard threshold 3\``
                    )
                    .setFooter({ text: 'Nishanka Starboard System' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // 2. Direct state toggling: -starboard on / -starboard off / -starboard enable / -starboard disable
            if (['on', 'off', 'enable', 'disable', 'true', 'false'].includes(firstArg)) {
                const enabled = ['on', 'enable', 'true'].includes(firstArg);
                settings.starboard.enabled = enabled;
                await settings.save();
                return message.reply(`⭐ Starboard has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 3. Toggle command: -starboard toggle [on/off]
            if (firstArg === 'toggle') {
                const secondArg = args[1]?.toLowerCase();
                let enabled;
                if (['on', 'enable', 'true', 'yes'].includes(secondArg)) enabled = true;
                else if (['off', 'disable', 'false', 'no'].includes(secondArg)) enabled = false;
                else if (!secondArg) enabled = !settings.starboard.enabled; // Flip state
                else {
                    const targetChannel = resolveChannel(args[1]);
                    if (targetChannel) {
                        settings.starboard.channelId = targetChannel.id;
                        settings.starboard.enabled = true;
                        await settings.save();
                        return message.reply(`⭐ Starboard **enabled** and channel set to ${targetChannel}.`);
                    }
                    return message.reply('❌ Specify `on` or `off`. Example: `-starboard toggle on`');
                }
                settings.starboard.enabled = enabled;
                await settings.save();
                return message.reply(`⭐ Starboard has been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 4. Channel command: -starboard channel <#channel/ID/Name>
            if (firstArg === 'channel') {
                const targetChannel = resolveChannel(args[1]) || message.mentions.channels.first();
                if (!targetChannel) {
                    return message.reply('❌ Please mention a valid text channel. Example: `-starboard channel #starboard`');
                }
                settings.starboard.channelId = targetChannel.id;
                settings.starboard.enabled = true; // Auto-enable!
                await settings.save();
                return message.reply(`⭐ Starboard channel set to ${targetChannel} and status **enabled**.`);
            }

            // 5. Threshold / limit: -starboard threshold <number>
            if (firstArg === 'threshold' || firstArg === 'limit') {
                const count = parseInt(args[1]);
                if (isNaN(count) || count < 1) {
                    return message.reply('❌ Please specify a valid threshold count (minimum 1)!');
                }
                settings.starboard.threshold = count;
                await settings.save();
                return message.reply(`⭐ Starboard threshold set to **${count}** reactions.`);
            }

            // 6. Emoji: -starboard emoji <emoji>
            if (firstArg === 'emoji') {
                const emoji = args[1]?.trim();
                if (!emoji) {
                    return message.reply('❌ Please specify a reaction emoji!');
                }
                settings.starboard.emoji = emoji;
                await settings.save();
                return message.reply(`⭐ Starboard emoji set to: ${emoji}`);
            }

            // 7. Direct Channel Mention or Name fallback: -starboard #starboard
            const directChannel = resolveChannel(firstArg) || message.mentions.channels.first();
            if (directChannel) {
                settings.starboard.channelId = directChannel.id;
                settings.starboard.enabled = true;
                await settings.save();
                return message.reply(`⭐ Starboard channel set to ${directChannel} and status **enabled**.`);
            }

            // 8. Direct Number Threshold fallback: -starboard 5
            const directNumber = parseInt(firstArg);
            if (!isNaN(directNumber) && directNumber >= 1) {
                settings.starboard.threshold = directNumber;
                await settings.save();
                return message.reply(`⭐ Starboard threshold set to **${directNumber}** reactions.`);
            }

            return message.reply('❌ Unknown subcommand. Usage: `-starboard <#channel>`, `-starboard toggle <on/off>`, or `-starboard threshold <number>`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update starboard settings.');
        }
    }
};
