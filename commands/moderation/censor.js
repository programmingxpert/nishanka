/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Censor = require('../../models/censorSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('censor')
        .setDescription('Manage the word filter and censorship system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current censor settings.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle the censor system on or off.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a word to the blocklist.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to censor.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a word from the blocklist.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to remove.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage the whitelisted words.')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove from whitelist.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        ))
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to manage.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlog')
                .setDescription('Set the channel for filter violation logs.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to log violations.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        let settings = await Censor.findOneAndUpdate(
            { guildId },
            { $setOnInsert: { guildId } },
            { upsert: true, new: true }
        );

        if (subcommand === 'settings') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Word Filter Settings')
                .setColor(0x27AE60)
                .addFields(
                    { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Log Channel', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'None', inline: true },
                    { name: 'Blocked Words', value: settings.blockedWords.length > 0 ? settings.blockedWords.join(', ') : 'None' },
                    { name: 'Whitelisted Words', value: settings.whitelistedWords.length > 0 ? settings.whitelistedWords.join(', ') : 'None' }
                )
                .setFooter({ text: 'Admins are exempt from the filter.' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            settings.enabled = !settings.enabled;
            await settings.save();
            if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Censor system has been **${settings.enabled ? 'Enabled' : 'Disabled'}**.` });
        }

        if (subcommand === 'add') {
            const word = interaction.options.getString('word').toLowerCase().trim();
            if (settings.blockedWords.includes(word)) {
                return interaction.reply({ content: `⚠️ "${word}" is already in the blocklist.`, ephemeral: true });
            }
            settings.blockedWords.push(word);
            await settings.save();
            if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Added **${word}** to the blocklist.` });
        }

        if (subcommand === 'remove') {
            const word = interaction.options.getString('word').toLowerCase().trim();
            if (!settings.blockedWords.includes(word)) {
                return interaction.reply({ content: `⚠️ "${word}" is not in the blocklist.`, ephemeral: true });
            }
            settings.blockedWords = settings.blockedWords.filter(w => w !== word);
            await settings.save();
            if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Removed **${word}** from the blocklist.` });
        }

        if (subcommand === 'whitelist') {
            const action = interaction.options.getString('action');
            const word = interaction.options.getString('word').toLowerCase().trim();

            if (action === 'add') {
                if (settings.whitelistedWords.includes(word)) return interaction.reply({ content: '⚠️ Word already whitelisted.', ephemeral: true });
                settings.whitelistedWords.push(word);
            } else {
                settings.whitelistedWords = settings.whitelistedWords.filter(w => w !== word);
            }

            await settings.save();
            if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ **${word}** ${action === 'add' ? 'Added to' : 'Removed from'} the whitelist.` });
        }

        if (subcommand === 'setlog') {
            const channel = interaction.options.getChannel('channel');
            settings.logChannelId = channel.id;
            await settings.save();
            if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Log channel set to <#${channel.id}>.` });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Requires Administrator permissions.');
        }

        const guildId = message.guild.id;
        let settings = await Censor.findOneAndUpdate(
            { guildId },
            { $setOnInsert: { guildId } },
            { upsert: true, new: true }
        );

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'settings' || !subcommand) {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Word Filter Settings')
                .setColor(0x27AE60)
                .addFields(
                    { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Log Channel', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'None', inline: true },
                    { name: 'Blocked Words', value: settings.blockedWords.length > 0 ? settings.blockedWords.join(', ') : 'None' },
                    { name: 'Whitelisted Words', value: settings.whitelistedWords.length > 0 ? settings.whitelistedWords.join(', ') : 'None' }
                )
                .setFooter({ text: 'Admins are exempt from the filter.' });

            return message.channel.send({ embeds: [embed] });
        }

        if (subcommand === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) return message.reply('⚠️ Usage: `-censor add <word>`');
            if (settings.blockedWords.includes(word)) return message.reply('⚠️ Word already blocked.');
            settings.blockedWords.push(word);
            await settings.save();
            if (message.client.censorCache) message.client.censorCache.delete(guildId);
            return message.reply(`✅ Blocked: **${word}**`);
        }

        if (subcommand === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) return message.reply('⚠️ Usage: `-censor remove <word>`');
            settings.blockedWords = settings.blockedWords.filter(w => w !== word);
            await settings.save();
            if (message.client.censorCache) message.client.censorCache.delete(guildId);
            return message.reply(`✅ Removed: **${word}**`);
        }

        if (subcommand === 'toggle') {
            settings.enabled = !settings.enabled;
            await settings.save();
            if (message.client.censorCache) message.client.censorCache.delete(guildId);
            return message.reply(`✅ Filter is now **${settings.enabled ? 'ON' : 'OFF'}**.`);
        }

        return message.reply('❓ Unknown command. Use `settings`, `add`, `remove`, `toggle`.');
    }
};
