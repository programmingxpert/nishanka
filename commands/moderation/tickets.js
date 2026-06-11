/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const Ticket = require('../../models/ticketSchema');
const GuildSettings = require('../../models/guildSettingsSchema');
const config = require('../../config.json');

const isStaffOrAdmin = (member, settings) => {
    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.guild.ownerId === member.id || member.id === config.devId) {
        return true;
    }
    if (settings?.tickets?.staffRoleId && member.roles.cache.has(settings.tickets.staffRoleId)) {
        return true;
    }
    return false;
};

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the support ticket system.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Deploy the ticket creation panel to a channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send the panel to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a member to this ticket channel.')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a member from this ticket channel.')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to remove')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const { guild, channel, member, user } = interaction;
        const settings = await GuildSettings.findOne({ guildId: guild.id }) || new GuildSettings({ guildId: guild.id });

        if (subcommand === 'setup') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && user.id !== config.devId) {
                return interaction.reply({ content: '❌ You need the **Manage Server** permission to set up the ticket system.', ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('channel');
            await interaction.deferReply({ ephemeral: true });

            // Ensure tickets are marked as enabled
            settings.tickets.enabled = true;

            const setupEmbed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('🎫 Support Tickets')
                .setDescription('Need help? Click the button below to open a private support ticket. Our staff will assist you as soon as possible!')
                .setTimestamp()
                .setFooter({ text: 'Nishanka Support System' });

            const createBtn = new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(createBtn);

            const panelMessage = await targetChannel.send({ embeds: [setupEmbed], components: [row] });
            
            settings.tickets.panelChannelId = targetChannel.id;
            settings.tickets.panelMessageId = panelMessage.id;
            await settings.save();

            return interaction.editReply({ content: `✅ Ticket panel successfully deployed to <#${targetChannel.id}>!` });
        }

        if (subcommand === 'close') {
            const { closeTicket } = require('../../utils/ticketEngine');
            return closeTicket({
                guild,
                channel,
                member,
                user,
                client: interaction.client,
                replyFn: async (msg) => {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply(msg).catch(() => {});
                    } else {
                        await interaction.reply(msg).catch(() => {});
                    }
                }
            });
        }

        if (subcommand === 'add' || subcommand === 'remove') {
            if (!isStaffOrAdmin(member, settings)) {
                return interaction.reply({ content: '❌ You must be staff or an administrator to manage ticket members.', ephemeral: true });
            }

            const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
            if (!ticket) {
                return interaction.reply({ content: '❌ This command can only be used inside an active ticket channel.', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('member');
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return interaction.reply({ content: '❌ Could not find that member in the server.', ephemeral: true });
            }

            await interaction.deferReply();

            if (subcommand === 'add') {
                await channel.permissionOverwrites.edit(targetMember.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    ReadMessageHistory: true
                });
                return interaction.editReply({ content: `✅ Added <@${targetMember.id}> to the ticket.` });
            } else {
                await channel.permissionOverwrites.delete(targetMember.id);
                return interaction.editReply({ content: `✅ Removed <@${targetMember.id}> from the ticket.` });
            }
        }
    },

    async executePrefix(message, args) {
        const { guild, channel, member, author: user } = message;
        if (args.length < 1) {
            return message.reply('❌ Correct usage: `-ticket <setup/close/add/remove> [args]`');
        }

        const subcommand = args[0].toLowerCase();
        const settings = await GuildSettings.findOne({ guildId: guild.id }) || new GuildSettings({ guildId: guild.id });

        if (subcommand === 'setup') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && user.id !== config.devId) {
                return message.reply('❌ You need the **Manage Server** permission to set up the ticket system.');
            }

            const targetChannel = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                return message.reply('⚠️ Please mention a valid text channel to deploy the panel (e.g. `-ticket setup #channel`).');
            }

            settings.tickets.enabled = true;

            const setupEmbed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('🎫 Support Tickets')
                .setDescription('Need help? Click the button below to open a private support ticket. Our staff will assist you as soon as possible!')
                .setTimestamp()
                .setFooter({ text: 'Nishanka Support System' });

            const createBtn = new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(createBtn);

            const panelMessage = await targetChannel.send({ embeds: [setupEmbed], components: [row] });
            
            settings.tickets.panelChannelId = targetChannel.id;
            settings.tickets.panelMessageId = panelMessage.id;
            await settings.save();

            return message.reply(`✅ Ticket panel successfully deployed to <#${targetChannel.id}>!`);
        }

        if (subcommand === 'close') {
            const { closeTicket } = require('../../utils/ticketEngine');
            return closeTicket({
                guild,
                channel,
                member,
                user,
                client: message.client,
                replyFn: async (msg) => {
                    await message.reply(msg).catch(() => {});
                }
            });
        }

        if (subcommand === 'add' || subcommand === 'remove') {
            if (!isStaffOrAdmin(member, settings)) {
                return message.reply('❌ You must be staff or an administrator to manage ticket members.');
            }

            const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
            if (!ticket) {
                return message.reply('❌ This command can only be used inside an active ticket channel.');
            }

            const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);
            if (!targetUser) {
                return message.reply('⚠️ Please mention or specify a valid member ID.');
            }

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return message.reply('❌ Could not find that member in the server.');
            }

            if (subcommand === 'add') {
                await channel.permissionOverwrites.edit(targetMember.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    ReadMessageHistory: true
                });
                return message.reply(`✅ Added <@${targetMember.id}> to the ticket.`);
            } else {
                await channel.permissionOverwrites.delete(targetMember.id);
                return message.reply(`✅ Removed <@${targetMember.id}> from the ticket.`);
            }
        }

        return message.reply('❌ Unknown subcommand. Supported subcommands: `setup`, `close`, `add`, `remove`.');
    }
};
