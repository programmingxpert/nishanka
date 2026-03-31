/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AntiSpam = require('../../models/antiSpamSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('Manage the antispam system settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current antispam settings.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle fast or slow spam detection.')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Select the spam type to toggle.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Fast Spam', value: 'fastSpam' },
                            { name: 'Slow Spam', value: 'slowSpam' },
                            { name: 'Warn User', value: 'warnUser' },
                            { name: 'Delete Messages', value: 'deleteMessages' },
                            { name: 'Timeout User', value: 'timeoutUser' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setfast')
                .setDescription('Configure fast spam threshold and window.')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Number of messages to trigger fast spam.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('window')
                        .setDescription('Window in seconds for fast spam.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setslow')
                .setDescription('Configure slow spam threshold and window.')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Number of messages to trigger slow spam.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('window')
                        .setDescription('Window in seconds for slow spam.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settimeout')
                .setDescription('Set the default timeout duration for spammers.')
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration (e.g., 1m, 10m, 1h).')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ignore')
                .setDescription('Manage users who should ALWAYS be caught by antispam (even if they are Admin).')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove from the watchlist.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to manage.')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        let settings = await AntiSpam.findOne({ guildId });
        if (!settings) {
            settings = new AntiSpam({ guildId });
            await settings.save();
        }

        if (subcommand === 'settings') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Antispam Settings')
                .setColor(0x3498DB)
                .addFields(
                    { name: '🚀 Fast Spam', value: `Enabled: \`${settings.fastSpam.enabled}\`\nThreshold: \`${settings.fastSpam.threshold}\` msgs\nWindow: \`${settings.fastSpam.window / 1000}\`s`, inline: true },
                    { name: '🐢 Slow Spam', value: `Enabled: \`${settings.slowSpam.enabled}\`\nThreshold: \`${settings.slowSpam.threshold}\` msgs\nWindow: \`${settings.slowSpam.window / 1000}\`s`, inline: true },
                    { name: '⚙️ Actions', value: `Warn User: \`${settings.warnUser}\`\nDelete Messages: \`${settings.deleteMessages}\`\nTimeout User: \`${settings.timeoutUser}\`` },
                    { name: '⏱️ Timeout Duration', value: `\`${settings.timeoutDuration / 60000}\` minute(s)`, inline: true },
                    { name: '🕵️ Watchlist (Always Caught)', value: settings.ignoredUsers?.length > 0 ? settings.ignoredUsers.map(id => `<@${id}>`).join(', ') : 'None' }
                )
                .setFooter({ text: 'Use /antispam to manage these settings.' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const type = interaction.options.getString('type');
            if (type === 'fastSpam' || type === 'slowSpam') {
                settings[type].enabled = !settings[type].enabled;
            } else {
                settings[type] = !settings[type];
            }
            await settings.save();
            return interaction.reply({ content: `✅ **${type}** has been ${settings[type]?.enabled ?? settings[type] ? 'Enabled' : 'Disabled'}.`, ephemeral: true });
        }

        if (subcommand === 'setfast') {
            const threshold = interaction.options.getInteger('threshold');
            const window = interaction.options.getInteger('window');
            settings.fastSpam.threshold = threshold;
            settings.fastSpam.window = window * 1000;
            await settings.save();
            return interaction.reply({ content: `✅ Fast spam set to **${threshold}** messages in **${window}** seconds.`, ephemeral: true });
        }

        if (subcommand === 'setslow') {
            const threshold = interaction.options.getInteger('threshold');
            const window = interaction.options.getInteger('window');
            settings.slowSpam.threshold = threshold;
            settings.slowSpam.window = window * 1000;
            await settings.save();
            return interaction.reply({ content: `✅ Slow spam set to **${threshold}** messages in **${window}** seconds.`, ephemeral: true });
        }

        if (subcommand === 'settimeout') {
            const durationInput = interaction.options.getString('duration');
            const ms = require('ms');
            const msDuration = ms(durationInput);
            if (!msDuration || msDuration < 5000) {
                return interaction.reply({ content: '❌ Invalid duration. Please use values like `1m`, `1h`.', ephemeral: true });
            }
            settings.timeoutDuration = msDuration;
            await settings.save();
            return interaction.reply({ content: `✅ Timeout duration set to **${ms(msDuration, { long: true })}**.`, ephemeral: true });
        }

        if (subcommand === 'ignore') {
            const action = interaction.options.getString('action');
            const targetUser = interaction.options.getUser('user');

            if (action === 'add') {
                if (settings.ignoredUsers.includes(targetUser.id)) {
                    return interaction.reply({ content: `❌ <@${targetUser.id}> is already in the watchlist.`, ephemeral: true });
                }
                settings.ignoredUsers.push(targetUser.id);
            } else {
                if (!settings.ignoredUsers.includes(targetUser.id)) {
                    return interaction.reply({ content: `❌ <@${targetUser.id}> is not in the watchlist.`, ephemeral: true });
                }
                settings.ignoredUsers = settings.ignoredUsers.filter(id => id !== targetUser.id);
            }

            await settings.save();
            return interaction.reply({ content: `✅ <@${targetUser.id}> has been ${action === 'add' ? 'Added to' : 'Removed from'} the antispam watchlist.`, ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You don’t have permission to manage antispam settings.');
        }

        const guildId = message.guild.id;
        let settings = await AntiSpam.findOne({ guildId });
        if (!settings) {
            settings = new AntiSpam({ guildId });
            await settings.save();
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'settings' || !subcommand) {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Antispam Settings')
                .setColor(0x3498DB)
                .addFields(
                    { name: '🚀 Fast Spam', value: `Enabled: \`${settings.fastSpam.enabled}\`\nThreshold: \`${settings.fastSpam.threshold}\` msgs\nWindow: \`${settings.fastSpam.window / 1000}\`s`, inline: true },
                    { name: '🐢 Slow Spam', value: `Enabled: \`${settings.slowSpam.enabled}\`\nThreshold: \`${settings.slowSpam.threshold}\` msgs\nWindow: \`${settings.slowSpam.window / 1000}\`s`, inline: true },
                    { name: '⚙️ Actions', value: `Warn User: \`${settings.warnUser}\`\nDelete Messages: \`${settings.deleteMessages}\`\nTimeout User: \`${settings.timeoutUser}\`` },
                    { name: '⏱️ Timeout Duration', value: `\`${settings.timeoutDuration / 60000}\` minute(s)`, inline: true },
                    { name: '🕵️ Watchlist (Always Caught)', value: settings.ignoredUsers?.length > 0 ? settings.ignoredUsers.map(id => `<@${id}>`).join(', ') : 'None' }
                )
                .setFooter({ text: 'Use -antispam to manage these settings.' })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const type = args[1]; // e.g. fastSpam, slowSpam, warnUser, deleteMessages, timeoutUser
            if (!type) return message.reply('⚠️ Specify a toggle type: `fastSpam`, `slowSpam`, `warnUser`, `deleteMessages`, or `timeoutUser`.');
            
            const validTypes = ['fastSpam', 'slowSpam', 'warnUser', 'deleteMessages', 'timeoutUser'];
            if (!validTypes.includes(type)) return message.reply(`⚠️ Invalid type. Use one of: ${validTypes.join(', ')}`);

            if (type === 'fastSpam' || type === 'slowSpam') {
                settings[type].enabled = !settings[type].enabled;
            } else {
                settings[type] = !settings[type];
            }
            await settings.save();
            return message.reply(`✅ **${type}** has been ${settings[type]?.enabled ?? settings[type] ? 'Enabled' : 'Disabled'}.`);
        }

        if (subcommand === 'setfast') {
            const threshold = parseInt(args[1]);
            const window = parseInt(args[2]);
            if (isNaN(threshold) || isNaN(window)) return message.reply('⚠️ Usage: `-antispam setfast <threshold> <window_in_seconds>`');
            
            settings.fastSpam.threshold = threshold;
            settings.fastSpam.window = window * 1000;
            await settings.save();
            return message.reply(`✅ Fast spam set to **${threshold}** messages in **${window}** seconds.`);
        }

        if (subcommand === 'setslow') {
            const threshold = parseInt(args[1]);
            const window = parseInt(args[2]);
            if (isNaN(threshold) || isNaN(window)) return message.reply('⚠️ Usage: `-antispam setslow <threshold> <window_in_seconds>`');
            
            settings.slowSpam.threshold = threshold;
            settings.slowSpam.window = window * 1000;
            await settings.save();
            return message.reply(`✅ Slow spam set to **${threshold}** messages in **${window}** seconds.`);
        }

        if (subcommand === 'settimeout') {
            const durationInput = args[1];
            if (!durationInput) return message.reply('⚠️ Usage: `-antispam settimeout <duration_like_10m>`');
            
            const ms = require('ms');
            const msDuration = ms(durationInput);
            if (!msDuration || msDuration < 5000) {
                return message.reply('❌ Invalid duration. Please use values like `1m`, `1h`.');
            }
            settings.timeoutDuration = msDuration;
            await settings.save();
            return message.reply(`✅ Timeout duration set to **${ms(msDuration, { long: true })}**.`);
        }

        if (subcommand === 'ignore') {
            const action = args[1]?.toLowerCase();
            const targetUser = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

            if (!action || !['add', 'remove'].includes(action)) {
                return message.reply('⚠️ Usage: `-antispam ignore <add|remove> <@user|id>`');
            }
            if (!targetUser) return message.reply('⚠️ Please mention a valid user or provide a user ID.');

            if (action === 'add') {
                if (settings.ignoredUsers.includes(targetUser.id)) {
                    return message.reply(`❌ <@${targetUser.id}> is already in the watchlist.`);
                }
                settings.ignoredUsers.push(targetUser.id);
            } else {
                if (!settings.ignoredUsers.includes(targetUser.id)) {
                    return message.reply(`❌ <@${targetUser.id}> is not in the watchlist.`);
                }
                settings.ignoredUsers = settings.ignoredUsers.filter(id => id !== targetUser.id);
            }

            await settings.save();
            return message.reply(`✅ <@${targetUser.id}> has been ${action === 'add' ? 'Added to' : 'Removed from'} the antispam watchlist.`);
        }

        return message.reply(`❓ Unknown subcommand. Available: \`settings\`, \`toggle\`, \`setfast\`, \`setslow\`, \`settimeout\`, \`ignore\`.`);
    },
};
