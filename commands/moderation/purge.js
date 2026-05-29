/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Purge a specific amount of messages from this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of messages to purge (1-100) (default configured amount)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose messages should be purged (optional)')
                .setRequired(false)),

    async execute(interaction) {
        let amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ I do not have permission to manage messages.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            if (!amount) {
                const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
                amount = settings?.bot?.defaultPurgeAmount ?? 10;
            }

            let messages;
            if (targetUser) {
                const allMessages = await interaction.channel.messages.fetch({ limit: 100 });
                messages = allMessages.filter(m => m.author.id === targetUser.id).first(amount);
            } else {
                messages = amount;
            }

            const deleted = await interaction.channel.bulkDelete(messages, true);

            const embed = new EmbedBuilder()
                .setTitle('🧹 Messages Purged')
                .setColor(0x00aeef)
                .setDescription(`Successfully deleted **${deleted.size}** messages${targetUser ? ` from ${targetUser.tag}` : ''}.`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Purge error:', error);
            await interaction.editReply({ content: `❌ Failed to purge messages: ${error.message}` });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You don’t have permission to use this command.');
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ I do not have permission to manage messages.');
        }

        let amount = parseInt(args[0]);
        let targetUser = null;

        try {
            if (isNaN(amount) || amount < 1 || amount > 100) {
                // If amount is not specified or invalid, fetch default configured amount
                const settings = await GuildSettings.findOne({ guildId: message.guild.id });
                amount = settings?.bot?.defaultPurgeAmount ?? 10;

                if (args[0]) {
                    targetUser = message.mentions.users.first() 
                        || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);
                }
            } else {
                if (args[1]) {
                    targetUser = message.mentions.users.first() 
                        || (args[1] ? await message.client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null) : null);
                }
            }

            // Delete the command message first
            await message.delete().catch(() => {});

            let messagesToDelete;
            if (targetUser) {
                const allMessages = await message.channel.messages.fetch({ limit: 100 });
                messagesToDelete = allMessages.filter(m => m.author.id === targetUser.id).first(amount);
            } else {
                messagesToDelete = amount;
            }

            const deleted = await message.channel.bulkDelete(messagesToDelete, true);

            const embed = new EmbedBuilder()
                .setTitle('🧹 Messages Purged')
                .setColor(0x00aeef)
                .setDescription(`Successfully deleted **${deleted.size}** messages${targetUser ? ` from ${targetUser.tag}` : ''}.`)
                .setFooter({ text: 'This message will be deleted in 5 seconds.' })
                .setTimestamp();

            const reply = await message.channel.send({ embeds: [embed] });
            
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 5000);

        } catch (error) {
            console.error('Purge error:', error);
            const errReply = await message.channel.send(`❌ Failed to purge messages: ${error.message}`);
            setTimeout(() => errReply.delete().catch(() => {}), 5000);
        }
    }
};
