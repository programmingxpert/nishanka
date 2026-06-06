const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const { checkCommandPermission } = require('../../utils/permissions');

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Configure server action log tracking.')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current action logs configuration.'))
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable server action logging.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set the text channel where logs are sent.')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('event')
                .setDescription('Toggle logging of a specific action.')
                .addStringOption(opt => opt.setName('type').setDescription('Action type').setRequired(true)
                    .addChoices(
                        { name: 'Message Deletions', value: 'messageDelete' },
                        { name: 'Message Edits', value: 'messageUpdate' },
                        { name: 'Member Joins', value: 'memberJoin' },
                        { name: 'Member Leaves', value: 'memberLeave' }
                    ))
                .addBooleanOption(opt => opt.setName('active').setDescription('Active?').setRequired(true))),

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
                    .setColor(0x34495e)
                    .setTitle('📋 Server Logs Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.logging.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Log Channel:** ${settings.logging.channelId ? `<#${settings.logging.channelId}>` : 'None set'}\n\n` +
                        `**Tracked Events:**\n` +
                        `• Message Deletions: ${settings.logging.messageDelete ? '✅ Yes' : '❌ No'}\n` +
                        `• Message Edits: ${settings.logging.messageUpdate ? '✅ Yes' : '❌ No'}\n` +
                        `• Member Joins: ${settings.logging.memberJoin ? '✅ Yes' : '❌ No'}\n` +
                        `• Member Leaves: ${settings.logging.memberLeave ? '✅ Yes' : '❌ No'}`
                    );
                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.logging.enabled = enabled;
                await settings.save();
                return interaction.reply(`` + (enabled ? '🟢' : '🔴') + ` Action logs have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channel = interaction.options.getChannel('channel');
                settings.logging.channelId = channel.id;
                await settings.save();
                return interaction.reply(`✅ Action log channel has been set to ${channel}.`);
            }

            if (sub === 'event') {
                const type = interaction.options.getString('type');
                const active = interaction.options.getBoolean('active');
                settings.logging[type] = active;
                await settings.save();
                return interaction.reply(`✅ Event **${type}** logging has been **${active ? 'enabled' : 'disabled'}**.`);
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to update logs settings.', ephemeral: true });
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
                    .setColor(0x34495e)
                    .setTitle('📋 Server Logs Settings')
                    .setDescription(
                        `⚙️ **Status:** ${settings.logging.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `📺 **Log Channel:** ${settings.logging.channelId ? `<#${settings.logging.channelId}>` : 'None set'}\n\n` +
                        `**Tracked Events:**\n` +
                        `• Message Deletions (delete): ${settings.logging.messageDelete ? '✅ Yes' : '❌ No'}\n` +
                        `• Message Edits (edit): ${settings.logging.messageUpdate ? '✅ Yes' : '❌ No'}\n` +
                        `• Member Joins (join): ${settings.logging.memberJoin ? '✅ Yes' : '❌ No'}\n` +
                        `• Member Leaves (leave): ${settings.logging.memberLeave ? '✅ Yes' : '❌ No'}\n\n` +
                        `*Use prefix command: \`-logging toggle <on/off>\`, \`-logging channel <#channel>\`, or \`-logging event <delete/edit/join/leave> <on/off>\`*`
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
                        return message.reply('❌ Specify `on` or `off`. Example: `-logging toggle on`');
                    }
                }
                settings.logging.enabled = enabled;
                await settings.save();
                return message.reply(`` + (enabled ? '🟢' : '🔴') + ` Action logs have been **${enabled ? 'enabled' : 'disabled'}**.`);
            }

            if (sub === 'channel') {
                const channelMention = args[1];
                if (!channelMention) {
                    return message.reply('❌ Please mention a channel. Example: `-logging channel #logs`');
                }
                const channelId = channelMention.replace(/[<#&>]/g, '');
                const targetChannel = message.guild.channels.cache.get(channelId);
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return message.reply('❌ Please mention a valid text channel.');
                }
                settings.logging.channelId = targetChannel.id;
                await settings.save();
                return message.reply(`✅ Action log channel has been set to ${targetChannel}.`);
            }

            if (sub === 'event') {
                const typeArg = args[1]?.toLowerCase();
                const activeArg = args[2]?.toLowerCase();

                let type;
                if (typeArg === 'delete' || typeArg === 'messagedelete') type = 'messageDelete';
                else if (typeArg === 'edit' || typeArg === 'messageupdate') type = 'messageUpdate';
                else if (typeArg === 'join' || typeArg === 'memberjoin') type = 'memberJoin';
                else if (typeArg === 'leave' || typeArg === 'memberleave') type = 'memberLeave';
                else {
                    return message.reply('❌ Specify event: `delete`, `edit`, `join`, or `leave`.');
                }

                let active;
                if (activeArg === 'on' || activeArg === 'true' || activeArg === 'yes' || activeArg === 'enable') active = true;
                else if (activeArg === 'off' || activeArg === 'false' || activeArg === 'no' || activeArg === 'disable') active = false;
                else {
                    return message.reply('❌ Specify `on` or `off`. Example: `-logging event delete on`');
                }

                settings.logging[type] = active;
                await settings.save();
                return message.reply(`✅ Event **${type}** logging has been **${active ? 'enabled' : 'disabled'}**.`);
            }

            return message.reply('❌ Unknown logging subcommand. Use: `view`, `toggle`, `channel`, or `event`.');
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update logs settings.');
        }
    }
};
