const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure welcome and leave announcements.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current welcome and leave configuration.'))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable welcome and leave announcements.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set the channel where announcements are posted.')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('joinmessage')
                .setDescription('Set welcome message (use {user.mention}, {user.name}, {server.name}, {server.memberCount}).')
                .addStringOption(opt => opt.setName('message').setDescription('Message text').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('leavemessage')
                .setDescription('Set leave message (use {user.name}, {server.name}, {server.memberCount}).')
                .addStringOption(opt => opt.setName('message').setDescription('Message text').setRequired(true))),

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
                    .setColor(0x3498db)
                    .setTitle('👋 Welcome & Leave Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.welcome.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.welcome.channelId ? `<#${settings.welcome.channelId}>` : 'None set'}\n\n` +
                        `📥 **Join Message:**\n> ${settings.welcome.joinMessage || 'None'}\n\n` +
                        `📤 **Leave Message:**\n> ${settings.welcome.leaveMessage || 'None'}`
                    );
                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.welcome.enabled = enabled;
                await settings.save();
                return interaction.reply(`` + (enabled ? '🟢' : '🔴') + ` Welcome and leave announcements have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channel = interaction.options.getChannel('channel');
                settings.welcome.channelId = channel.id;
                await settings.save();
                return interaction.reply(`✅ Welcome channel has been set to ${channel}.`);
            }

            if (sub === 'joinmessage') {
                const msg = interaction.options.getString('message');
                settings.welcome.joinMessage = msg;
                await settings.save();
                return interaction.reply(`✅ Join message has been updated:\n> ${msg}`);
            }

            if (sub === 'leavemessage') {
                const msg = interaction.options.getString('message');
                settings.welcome.leaveMessage = msg;
                await settings.save();
                return interaction.reply(`✅ Leave message has been updated:\n> ${msg}`);
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update welcome settings.', ephemeral: true });
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
                    .setColor(0x3498db)
                    .setTitle('👋 Welcome & Leave Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.welcome.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.welcome.channelId ? `<#${settings.welcome.channelId}>` : 'None set'}\n\n` +
                        `📥 **Join Message:**\n> ${settings.welcome.joinMessage || 'None'}\n\n` +
                        `📤 **Leave Message:**\n> ${settings.welcome.leaveMessage || 'None'}\n\n` +
                        `*Use prefix command: \`-welcome toggle <on/off>\`, \`-welcome channel <#channel>\`, \`-welcome joinmessage <text>\`, or \`-welcome leavemessage <text>\`*`
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
                        return message.reply('❌ Specify `on` or `off`. Example: `-welcome toggle on`');
                    }
                }
                settings.welcome.enabled = enabled;
                await settings.save();
                return message.reply(`` + (enabled ? '🟢' : '🔴') + ` Welcome and leave announcements have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channelMention = args[1];
                if (!channelMention) {
                    return message.reply('❌ Please mention a channel. Example: `-welcome channel #welcome`');
                }
                const channelId = channelMention.replace(/[<#&>]/g, '');
                const targetChannel = message.guild.channels.cache.get(channelId);
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return message.reply('❌ Please mention a valid text channel.');
                }
                settings.welcome.channelId = targetChannel.id;
                await settings.save();
                return message.reply(`✅ Welcome channel has been set to ${targetChannel}.`);
            }

            if (sub === 'joinmessage') {
                const msg = args.slice(1).join(' ');
                if (!msg) {
                    return message.reply('❌ Please provide a join message.');
                }
                settings.welcome.joinMessage = msg;
                await settings.save();
                return message.reply(`✅ Join message has been updated:\n> ${msg}`);
            }

            if (sub === 'leavemessage') {
                const msg = args.slice(1).join(' ');
                if (!msg) {
                    return message.reply('❌ Please provide a leave message.');
                }
                settings.welcome.leaveMessage = msg;
                await settings.save();
                return message.reply(`✅ Leave message has been updated:\n> ${msg}`);
            }

            return message.reply('❌ Unknown welcome subcommand. Use: `view`, `toggle`, `channel`, `joinmessage`, or `leavemessage`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update welcome settings.');
        }
    }
};
