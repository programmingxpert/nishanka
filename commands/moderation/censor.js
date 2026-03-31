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
                        .setDescription('The word(s) to censor. Separate with commas for multiple.')
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
                        .setDescription('The word(s) to remove. Separate with commas for multiple.')
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
                        .setDescription('The word(s) to manage. Separate with commas for multiple.')
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

        await interaction.deferReply();

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

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            settings.enabled = !settings.enabled;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.editReply({ content: `✅ Censor system has been **${settings.enabled ? 'Enabled' : 'Disabled'}**.` });
        }

        if (subcommand === 'add') {
            const tier = interaction.options.getString('tier');
            const wordsInput = interaction.options.getString('word');
            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';

            const added = [];
            const skipped = [];

            for (const word of words) {
                if (settings[listName].includes(word)) {
                    skipped.push(word);
                } else {
                    settings[listName].push(word);
                    added.push(word);
                }
            }

            await settings.save();
            interaction.client.censorCache.delete(guildId);
            
            let response = `✅ Successfully added **${added.length}** word(s) to the **${tier}** list.`;
            if (skipped.length > 0) response += `\n⚠️ Skipped (already exist): ${skipped.join(', ')}`;
            return interaction.editReply({ content: response });
        }

        if (subcommand === 'remove') {
            const tier = interaction.options.getString('tier');
            const wordsInput = interaction.options.getString('word');
            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';

            const removed = [];
            const notFound = [];

            for (const word of words) {
                if (settings[listName].includes(word)) {
                    settings[listName] = settings[listName].filter(w => w !== word);
                    removed.push(word);
                } else {
                    notFound.push(word);
                }
            }

            await settings.save();
            interaction.client.censorCache.delete(guildId);
            
            let response = `✅ Successfully removed **${removed.length}** word(s) from the **${tier}** list.`;
            if (notFound.length > 0) response += `\n⚠️ Not found: ${notFound.join(', ')}`;
            return interaction.editReply({ content: response });
        }

        if (subcommand === 'whitelist') {
            const action = interaction.options.getString('action');
            const wordsInput = interaction.options.getString('word');
            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

            if (action === 'add') {
                for (const word of words) {
                    if (!settings.whitelistedWords.includes(word)) settings.whitelistedWords.push(word);
                }
            } else {
                for (const word of words) {
                    settings.whitelistedWords = settings.whitelistedWords.filter(w => w !== word);
                }
            }

            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.editReply({ content: `✅ Whitelist updated for **${words.length}** word(s).` });
        }

        if (subcommand === 'setstaff') {
            const role = interaction.options.getRole('role');
            settings.staffRoleId = role.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.editReply({ content: `✅ Staff Team role set to <@&${role.id}>.` });
        }

        if (subcommand === 'setagechannel') {
            const channel = interaction.options.getChannel('channel');
            settings.ageRestrictedChannelId = channel.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.editReply({ content: `✅ Permitted Age-Restricted channel set to <#${channel.id}>.` });
        }

        if (subcommand === 'setlog') {
            const channel = interaction.options.getChannel('channel');
            settings.logChannelId = channel.id;
            await settings.save();
            interaction.client.censorCache.delete(guildId);
            return interaction.editReply({ content: `✅ Mod Log channel set to <#${channel.id}>.` });
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
            const wordsInput = args.slice(2).join(' ');
            if (!tier || !['hardcore', 'restricted'].includes(tier) || !wordsInput) {
                return message.reply('⚠️ Usage: `-censor add <hardcore|restricted> <word, word2, ...>`');
            }
            
            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';
            const added = [];

            for (const word of words) {
                if (!settings[listName].includes(word)) {
                    settings[listName].push(word);
                    added.push(word);
                }
            }

            await settings.save();
            message.client.censorCache.delete(guildId);
            return message.reply(`✅ Added **${added.length}** word(s) to the **${tier}** list.`);
        }

        if (subcommand === 'remove') {
            const tier = args[1]?.toLowerCase();
            const wordsInput = args.slice(2).join(' ');
            if (!tier || !['hardcore', 'restricted'].includes(tier) || !wordsInput) {
                return message.reply('⚠️ Usage: `-censor remove <hardcore|restricted> <word, word2, ...>`');
            }
            
            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            const listName = tier === 'hardcore' ? 'hardcoreWords' : 'restrictedWords';
            const removed = [];

            for (const word of words) {
                if (settings[listName].includes(word)) {
                    settings[listName] = settings[listName].filter(w => w !== word);
                    removed.push(word);
                }
            }

            await settings.save();
            message.client.censorCache.delete(guildId);
            return message.reply(`✅ Removed **${removed.length}** word(s) from the **${tier}** list.`);
        }

        if (subcommand === 'whitelist') {
            const action = args[1]?.toLowerCase(); // add or remove
            const wordsInput = args.slice(2).join(' ');
            if (!action || !['add', 'remove'].includes(action) || !wordsInput) {
                return message.reply('⚠️ Usage: `-censor whitelist <add|remove> <word, word2, ...>`');
            }

            const words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            
            if (action === 'add') {
                for (const word of words) {
                    if (!settings.whitelistedWords.includes(word)) settings.whitelistedWords.push(word);
                }
            } else {
                for (const word of words) {
                    settings.whitelistedWords = settings.whitelistedWords.filter(w => w !== word);
                }
            }

            await settings.save();
            message.client.censorCache.delete(guildId);
            return message.reply(`✅ Whitelist updated for **${words.length}** word(s).`);
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
