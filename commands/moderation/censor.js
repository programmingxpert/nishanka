/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Censor = require('../../models/censorSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('censor')
        .setDescription('Manage the tiered word filter and censorship system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current tiered censor settings.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle the censor system on or off.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a word to a specific filter tier.')
                .addStringOption(option =>
                    option.setName('tier')
                        .setDescription('Select the target tier.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hardcore (Strictly Forbidden)', value: 'hardcore' },
                            { name: 'Restricted (16+/18+ Only)', value: 'restricted' }
                        ))
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to censor.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a word from a specific filter tier.')
                .addStringOption(option =>
                    option.setName('tier')
                        .setDescription('Select the target tier.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hardcore', value: 'hardcore' },
                            { name: 'Restricted', value: 'restricted' }
                        ))
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
                .setName('setstaff')
                .setDescription('Set the staff team role for hardcore pings.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The staff role to ping.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setagechannel')
                .setDescription('Set the permitted 16+/18+ channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel where restricted words are allowed.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlog')
                .setDescription('Set the channel for hardcore filter violation logs.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The mod channel to log violations.')
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
                .setTitle('🛡️ Tiered Word Filter Dashboard')
                .setColor(0x27AE60)
                .addFields(
                    { name: 'Status', value: settings.enabled ? '✅ Global Filter ON' : '❌ Global Filter OFF', inline: true },
                    { name: 'Staff Role', value: settings.staffRoleId ? `<@&${settings.staffRoleId}>` : 'None', inline: true },
                    { name: 'Restricted Channel (16+)', value: settings.ageRestrictedChannelId ? `<#${settings.ageRestrictedChannelId}>` : 'Not Set', inline: true },
                    { name: 'Mod/Log Channel', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'None', inline: true },
                    { name: '🛑 Hardcore Words', value: settings.hardcoreWords.length > 0 ? settings.hardcoreWords.join(', ') : 'None' },
                    { name: '🔞 Restricted Words', value: settings.restrictedWords.length > 0 ? settings.restrictedWords.join(', ') : 'None' },
                    { name: '⚪ Whitelisted', value: settings.whitelistedWords.length > 0 ? settings.whitelistedWords.join(', ') : 'None' }
                )
                .setFooter({ text: 'Hardcore = Global Block | Restricted = Allowed in specific channel' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            settings.enabled = !settings.enabled;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Censor system has been **${settings.enabled ? 'Enabled' : 'Disabled'}**.` });
        }

        if (subcommand === 'add') {
            const tier = interaction.options.getString('tier');
            const word = interaction.options.getString('word').toLowerCase().trim();
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';

            if (settings[listName].includes(word)) {
                return interaction.reply({ content: `⚠️ "${word}" is already in the **${tier}** list.`, ephemeral: true });
            }

            settings[listName].push(word);
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Added **${word}** to the **${tier}** blocklist.` });
        }

        if (subcommand === 'remove') {
            const tier = interaction.options.getString('tier');
            const word = interaction.options.getString('word').toLowerCase().trim();
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';

            if (!settings[listName].includes(word)) {
                return interaction.reply({ content: `⚠️ "${word}" is not in the **${tier}** list.`, ephemeral: true });
            }

            settings[listName] = settings[listName].filter(w => w !== word);
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Removed **${word}** from the **${tier}** blocklist.` });
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
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ **${word}** ${action === 'add' ? 'Added to' : 'Removed from'} the whitelist.` });
        }

        if (subcommand === 'setstaff') {
            const role = interaction.options.getRole('role');
            settings.staffRoleId = role.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Staff Team role set to <@&${role.id}>.` });
        }

        if (subcommand === 'setagechannel') {
            const channel = interaction.options.getChannel('channel');
            settings.ageRestrictedChannelId = channel.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Permitted Age-Restricted channel set to <#${channel.id}>.` });
        }

        if (subcommand === 'setlog') {
            const channel = interaction.options.getChannel('channel');
            settings.logChannelId = channel.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.reply({ content: `✅ Mod Log channel set to <#${channel.id}>.` });
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
                .setTitle('🛡️ Tiered Word Filter Dashboard')
                .setColor(0x27AE60)
                .addFields(
                    { name: 'Status', value: settings.enabled ? '✅ Global Filter ON' : '❌ Global Filter OFF', inline: true },
                    { name: 'Staff Role', value: settings.staffRoleId ? `<@&${settings.staffRoleId}>` : 'None', inline: true },
                    { name: 'Age Channel', value: settings.ageRestrictedChannelId ? `<#${settings.ageRestrictedChannelId}>` : 'None', inline: true },
                    { name: 'Mod Logs', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'None', inline: true },
                    { name: '🛑 Hardcore Words', value: settings.hardcoreWords.length > 0 ? settings.hardcoreWords.join(', ') : 'None' },
                    { name: '🔞 Restricted Words', value: settings.restrictedWords.length > 0 ? settings.restrictedWords.join(', ') : 'None' }
                )
                .setFooter({ text: 'Use Slash commands for full configuration.' });

            return message.channel.send({ embeds: [embed] });
        }

        if (subcommand === 'add') {
            const tier = args[1]?.toLowerCase();
            const word = args[2]?.toLowerCase();
            if (!tier || !['hardcore', 'restricted'].includes(tier) || !word) {
                return message.reply('⚠️ Usage: `-censor add <hardcore|restricted> <word>`');
            }
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';
            if (settings[listName].includes(word)) return message.reply(`⚠️ Word already in **${tier}** list.`);
            settings[listName].push(word);
            await settings.save();
            message.client.censorCache.delete(guildId);
            return message.reply(`✅ Added **${word}** to **${tier}** list.`);
        }

        if (subcommand === 'toggle') {
            settings.enabled = !settings.enabled;
            await settings.save();
            message.client.censorCache.delete(guildId);
            return message.reply(`✅ Filter is now **${settings.enabled ? 'ON' : 'OFF'}**.`);
        }

        return message.reply('❓ Unknown command. Use slash commands for full tiered setup.');
    }
};
