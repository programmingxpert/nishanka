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

            // 1. View settings
            if (!firstArg || firstArg === 'view') {
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('👋 Welcome & Leave Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.welcome.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Channel:** ${settings.welcome.channelId ? `<#${settings.welcome.channelId}>` : 'None set'}\n\n` +
                        `📥 **Join Message:**\n> ${settings.welcome.joinMessage || 'None'}\n\n` +
                        `📤 **Leave Message:**\n> ${settings.welcome.leaveMessage || 'None'}\n\n` +
                        `*Examples:* \`-welcome #welcome\`, \`-welcome toggle on/off\`, \`-welcome joinmessage Welcome {user.mention}!\``
                    );
                return message.reply({ embeds: [embed] });
            }

            // 2. Direct state toggling: -welcome on / -welcome off / -welcome enable / -welcome disable
            if (['on', 'off', 'enable', 'disable', 'true', 'false'].includes(firstArg)) {
                const enabled = ['on', 'enable', 'true'].includes(firstArg);
                settings.welcome.enabled = enabled;
                await settings.save();
                return message.reply(`${enabled ? '🟢' : '🔴'} Welcome & leave announcements have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 3. Toggle command: -welcome toggle [on/off]
            if (firstArg === 'toggle') {
                const secondArg = args[1]?.toLowerCase();
                let enabled;
                if (['on', 'enable', 'true', 'yes'].includes(secondArg)) enabled = true;
                else if (['off', 'disable', 'false', 'no'].includes(secondArg)) enabled = false;
                else if (!secondArg) enabled = !settings.welcome.enabled; // Flip state
                else {
                    const targetChannel = resolveChannel(args[1]);
                    if (targetChannel) {
                        settings.welcome.channelId = targetChannel.id;
                        settings.welcome.enabled = true;
                        await settings.save();
                        return message.reply(`🟢 Welcome announcements **enabled** and channel set to ${targetChannel}.`);
                    }
                    return message.reply('❌ Specify `on` or `off`. Example: `-welcome toggle on`');
                }
                settings.welcome.enabled = enabled;
                await settings.save();
                return message.reply(`${enabled ? '🟢' : '🔴'} Welcome & leave announcements have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            // 4. Channel command: -welcome channel <#channel/ID/Name>
            if (firstArg === 'channel') {
                const targetChannel = resolveChannel(args[1]) || message.mentions.channels.first();
                if (!targetChannel) {
                    return message.reply('❌ Please mention a valid text channel. Example: `-welcome channel #welcome`');
                }
                settings.welcome.channelId = targetChannel.id;
                settings.welcome.enabled = true; // Auto-enable!
                await settings.save();
                return message.reply(`✅ Welcome channel set to ${targetChannel} and status **enabled**.`);
            }

            // 5. Join Message: -welcome joinmessage <text> or -welcome join <text>
            if (['joinmessage', 'joinmsg', 'join'].includes(firstArg)) {
                const msg = args.slice(1).join(' ');
                if (!msg) {
                    return message.reply('❌ Please provide a join message. Example: `-welcome join Welcome {user.mention} to {server.name}!`');
                }
                settings.welcome.joinMessage = msg;
                await settings.save();
                return message.reply(`✅ Join message updated:\n> ${msg}`);
            }

            // 6. Leave Message: -welcome leavemessage <text> or -welcome leave <text>
            if (['leavemessage', 'leavemsg', 'leave'].includes(firstArg)) {
                const msg = args.slice(1).join(' ');
                if (!msg) {
                    return message.reply('❌ Please provide a leave message. Example: `-welcome leave {user.name} left {server.name}.`');
                }
                settings.welcome.leaveMessage = msg;
                await settings.save();
                return message.reply(`✅ Leave message updated:\n> ${msg}`);
            }

            // 7. Direct Channel Mention or Name fallback: -welcome #welcome
            const directChannel = resolveChannel(firstArg) || message.mentions.channels.first();
            if (directChannel) {
                settings.welcome.channelId = directChannel.id;
                settings.welcome.enabled = true;
                await settings.save();
                return message.reply(`✅ Welcome channel set to ${directChannel} and status **enabled**.`);
            }

            return message.reply('❌ Unknown subcommand. Usage: `-welcome <#channel>`, `-welcome toggle <on/off>`, or `-welcome joinmessage <text>`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update welcome settings.');
        }
    }
};
