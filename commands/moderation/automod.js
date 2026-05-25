/* eslint-disable */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AutoMod = require('../../models/autoModSchema');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Manage the AutoMod (Anti-Spam & Anti-Link) system settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current AutoMod settings.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle AutoMod modules or actions.')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Select what to toggle.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Anti-Spam System', value: 'antiSpamEnabled' },
                            { name: 'Anti-Link System', value: 'antiLink' },
                            { name: 'Fast Spam Detection', value: 'fastSpam' },
                            { name: 'Slow Spam Detection', value: 'slowSpam' },
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
                .setDescription('Manage users who should ALWAYS be caught by AutoMod (even if Admin/Mod).')
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
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repetition')
                .setDescription('Toggle repetitive message detection.')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable repetition detection.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setrepetition')
                .setDescription('Set the threshold for repetitive messages.')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Number of same messages to trigger AutoMod.')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        let settings = await AutoMod.findOneAndUpdate(
            { guildId },
            { $setOnInsert: { guildId } },
            { upsert: true, new: true }
        );

        if (subcommand === 'settings') {
            const spamChs = settings.antiSpamFilterMode === 'whitelist' 
                ? (settings.antiSpamWhitelistedChannels?.length > 0 ? settings.antiSpamWhitelistedChannels.map(id => `<#${id}>`).join(', ') : 'None')
                : (settings.antiSpamBlacklistedChannels?.length > 0 ? settings.antiSpamBlacklistedChannels.map(id => `<#${id}>`).join(', ') : 'None');

            const linkChs = settings.antiLink?.filterMode === 'whitelist'
                ? (settings.antiLink?.whitelistedChannels?.length > 0 ? settings.antiLink.whitelistedChannels.map(id => `<#${id}>`).join(', ') : 'None')
                : (settings.antiLink?.blacklistedChannels?.length > 0 ? settings.antiLink.blacklistedChannels.map(id => `<#${id}>`).join(', ') : 'None');

            const formatModule = (modConfig, globalConfig) => {
                const warn = modConfig?.warnUser !== undefined ? modConfig.warnUser : globalConfig.warnUser;
                const del = modConfig?.deleteMessages !== undefined ? modConfig.deleteMessages : globalConfig.deleteMessages;
                const timeout = modConfig?.timeoutUser !== undefined ? modConfig.timeoutUser : globalConfig.timeoutUser;
                const duration = modConfig?.timeoutDuration !== undefined ? modConfig.timeoutDuration : globalConfig.timeoutDuration;
                const watchlist = modConfig?.ignoredUsers?.length > 0
                    ? modConfig.ignoredUsers.map(id => `<@${id}>`).join(', ')
                    : 'None';
                return `Warn: \`${warn}\` | Delete: \`${del}\` | Timeout: \`${timeout}\` (${Math.round(duration / 60000)}m)\nWatchlist: ${watchlist}`;
            };

            const linkFormats = [];
            if (settings.antiLink?.allowedFormats?.images) linkFormats.push('Images');
            if (settings.antiLink?.allowedFormats?.gifs) linkFormats.push('GIFs');
            if (settings.antiLink?.allowedFormats?.videos) linkFormats.push('Videos');
            const allowedFormatsStr = linkFormats.length > 0 ? linkFormats.join(', ') : 'None';
            const whitelistedSitesStr = settings.antiLink?.whitelistedWebsites?.length > 0 ? settings.antiLink.whitelistedWebsites.map(s => `\`${s}\``).join(', ') : 'None';

            const embed = new EmbedBuilder()
                .setTitle('🛡️ AutoMod System Settings')
                .setColor(0x3498DB)
                .addFields(
                    { name: '⚙️ General Status', value: `Spam Protection: \`${settings.antiSpamEnabled !== false ? 'Enabled' : 'Disabled'}\`\nLink Protection: \`${settings.antiLink?.enabled ? 'Enabled' : 'Disabled'}\`` },
                    { name: '🚀 Spam Channel Rules', value: `Mode: \`${settings.antiSpamFilterMode || 'whitelist'}\`\nChannels: ${spamChs}` },
                    { name: '🔗 Link Channel Rules', value: `Mode: \`${settings.antiLink?.filterMode || 'whitelist'}\`\nChannels: ${linkChs}` },
                    { name: '⚡ Fast Spam Detection', value: `Enabled: \`${settings.fastSpam?.enabled}\`\nThreshold: \`${settings.fastSpam?.threshold}\` msgs\nWindow: \`${(settings.fastSpam?.window || 0) / 1000}\`s\n${formatModule(settings.fastSpam, settings)}` },
                    { name: '🐢 Slow Spam Detection', value: `Enabled: \`${settings.slowSpam?.enabled}\`\nThreshold: \`${settings.slowSpam?.threshold}\` msgs\nWindow: \`${(settings.slowSpam?.window || 0) / 1000}\`s\n${formatModule(settings.slowSpam, settings)}` },
                    { name: '🔁 Repetition Detection', value: `Enabled: \`${settings.repetitionEnabled}\`\nThreshold: \`${settings.repetitionThreshold}\` msgs`, inline: true },
                    { name: '🔗 Link Protection Rules', value: `${formatModule(settings.antiLink, settings)}\nAllowed Formats: \`${allowedFormatsStr}\`\nWhitelisted Sites: ${whitelistedSitesStr}` },
                    { name: '🕵️ Global Watchlist', value: settings.ignoredUsers?.length > 0 ? settings.ignoredUsers.map(id => `<@${id}>`).join(', ') : 'None' },
                    { name: '📋 Activity Log Settings', value: `Log Channel: ${settings.logChannelId ? `<#${settings.logChannelId}>` : '`Disabled`'}\nLogged Events:\n• Spam Protection: \`${settings.logFeatures?.antiSpam !== false ? 'Enabled' : 'Disabled'}\`\n• Link Protection: \`${settings.logFeatures?.antiLink !== false ? 'Enabled' : 'Disabled'}\`` }
                )
                .setFooter({ text: 'Use /automod to manage these settings.' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const type = interaction.options.getString('type');
            let updatedVal;
            if (type === 'antiSpamEnabled') {
                settings.antiSpamEnabled = !settings.antiSpamEnabled;
                updatedVal = settings.antiSpamEnabled;
            } else if (type === 'antiLink') {
                if (!settings.antiLink) settings.antiLink = { enabled: false, filterMode: 'whitelist', whitelistedChannels: [], blacklistedChannels: [] };
                settings.antiLink.enabled = !settings.antiLink.enabled;
                updatedVal = settings.antiLink.enabled;
            } else if (type === 'fastSpam' || type === 'slowSpam') {
                settings[type].enabled = !settings[type].enabled;
                updatedVal = settings[type].enabled;
            } else {
                settings[type] = !settings[type];
                updatedVal = settings[type];
            }
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ **${type}** has been ${updatedVal ? 'Enabled' : 'Disabled'}.`, ephemeral: true });
        }

        if (subcommand === 'setfast') {
            const threshold = interaction.options.getInteger('threshold');
            const window = interaction.options.getInteger('window');
            settings.fastSpam.threshold = threshold;
            settings.fastSpam.window = window * 1000;
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ Fast spam set to **${threshold}** messages in **${window}** seconds.`, ephemeral: true });
        }

        if (subcommand === 'setslow') {
            const threshold = interaction.options.getInteger('threshold');
            const window = interaction.options.getInteger('window');
            settings.slowSpam.threshold = threshold;
            settings.slowSpam.window = window * 1000;
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ Slow spam set to **${threshold}** messages in **${window}** seconds.`, ephemeral: true });
        }

        if (subcommand === 'settimeout') {
            const durationInput = interaction.options.getString('duration');
            const ms = require('ms');
            const msDuration = ms(durationInput);
            if (!msDuration || msDuration < 5000) {
                return interaction.reply({ content: '❌ Invalid duration. Please use values like `1m`, `10m`, `1h`.', ephemeral: true });
            }
            settings.timeoutDuration = msDuration;
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
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
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ <@${targetUser.id}> has been ${action === 'add' ? 'Added to' : 'Removed from'} the AutoMod watchlist.`, ephemeral: true });
        }

        if (subcommand === 'repetition') {
            const enabled = interaction.options.getBoolean('enabled');
            settings.repetitionEnabled = enabled;
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ Repetition detection has been **${enabled ? 'Enabled' : 'Disabled'}**.`, ephemeral: true });
        }

        if (subcommand === 'setrepetition') {
            const threshold = interaction.options.getInteger('threshold');
            settings.repetitionThreshold = threshold;
            await settings.save();
            if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
            return interaction.reply({ content: `✅ Repetition threshold set to **${threshold}** messages.`, ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You don’t have permission to manage AutoMod settings.');
        }

        const guildId = message.guild.id;
        let settings = await AutoMod.findOneAndUpdate(
            { guildId },
            { $setOnInsert: { guildId } },
            { upsert: true, new: true }
        );

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'settings' || !subcommand) {
            const spamChs = settings.antiSpamFilterMode === 'whitelist' 
                ? (settings.antiSpamWhitelistedChannels?.length > 0 ? settings.antiSpamWhitelistedChannels.map(id => `<#${id}>`).join(', ') : 'None')
                : (settings.antiSpamBlacklistedChannels?.length > 0 ? settings.antiSpamBlacklistedChannels.map(id => `<#${id}>`).join(', ') : 'None');

            const linkChs = settings.antiLink?.filterMode === 'whitelist'
                ? (settings.antiLink?.whitelistedChannels?.length > 0 ? settings.antiLink.whitelistedChannels.map(id => `<#${id}>`).join(', ') : 'None')
                : (settings.antiLink?.blacklistedChannels?.length > 0 ? settings.antiLink.blacklistedChannels.map(id => `<#${id}>`).join(', ') : 'None');

            const formatModule = (modConfig, globalConfig) => {
                const warn = modConfig?.warnUser !== undefined ? modConfig.warnUser : globalConfig.warnUser;
                const del = modConfig?.deleteMessages !== undefined ? modConfig.deleteMessages : globalConfig.deleteMessages;
                const timeout = modConfig?.timeoutUser !== undefined ? modConfig.timeoutUser : globalConfig.timeoutUser;
                const duration = modConfig?.timeoutDuration !== undefined ? modConfig.timeoutDuration : globalConfig.timeoutDuration;
                const watchlist = modConfig?.ignoredUsers?.length > 0
                    ? modConfig.ignoredUsers.map(id => `<@${id}>`).join(', ')
                    : 'None';
                return `Warn: \`${warn}\` | Delete: \`${del}\` | Timeout: \`${timeout}\` (${Math.round(duration / 60000)}m)\nWatchlist: ${watchlist}`;
            };

            const linkFormats = [];
            if (settings.antiLink?.allowedFormats?.images) linkFormats.push('Images');
            if (settings.antiLink?.allowedFormats?.gifs) linkFormats.push('GIFs');
            if (settings.antiLink?.allowedFormats?.videos) linkFormats.push('Videos');
            const allowedFormatsStr = linkFormats.length > 0 ? linkFormats.join(', ') : 'None';
            const whitelistedSitesStr = settings.antiLink?.whitelistedWebsites?.length > 0 ? settings.antiLink.whitelistedWebsites.map(s => `\`${s}\``).join(', ') : 'None';

            const embed = new EmbedBuilder()
                .setTitle('🛡️ AutoMod System Settings')
                .setColor(0x3498DB)
                .addFields(
                    { name: '⚙️ General Status', value: `Spam Protection: \`${settings.antiSpamEnabled !== false ? 'Enabled' : 'Disabled'}\`\nLink Protection: \`${settings.antiLink?.enabled ? 'Enabled' : 'Disabled'}\`` },
                    { name: '🚀 Spam Channel Rules', value: `Mode: \`${settings.antiSpamFilterMode || 'whitelist'}\`\nChannels: ${spamChs}` },
                    { name: '🔗 Link Channel Rules', value: `Mode: \`${settings.antiLink?.filterMode || 'whitelist'}\`\nChannels: ${linkChs}` },
                    { name: '⚡ Fast Spam Detection', value: `Enabled: \`${settings.fastSpam?.enabled}\`\nThreshold: \`${settings.fastSpam?.threshold}\` msgs\nWindow: \`${(settings.fastSpam?.window || 0) / 1000}\`s\n${formatModule(settings.fastSpam, settings)}` },
                    { name: '🐢 Slow Spam Detection', value: `Enabled: \`${settings.slowSpam?.enabled}\`\nThreshold: \`${settings.slowSpam?.threshold}\` msgs\nWindow: \`${(settings.slowSpam?.window || 0) / 1000}\`s\n${formatModule(settings.slowSpam, settings)}` },
                    { name: '🔁 Repetition Detection', value: `Enabled: \`${settings.repetitionEnabled}\`\nThreshold: \`${settings.repetitionThreshold}\` msgs`, inline: true },
                    { name: '🔗 Link Protection Rules', value: `${formatModule(settings.antiLink, settings)}\nAllowed Formats: \`${allowedFormatsStr}\`\nWhitelisted Sites: ${whitelistedSitesStr}` },
                    { name: '🕵️ Global Watchlist', value: settings.ignoredUsers?.length > 0 ? settings.ignoredUsers.map(id => `<@${id}>`).join(', ') : 'None' }
                )
                .setFooter({ text: 'Use -automod to manage these settings.' })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const type = args[1];
            if (!type) return message.reply('⚠️ Specify what to toggle: `antiSpamEnabled`, `antiLink`, `fastSpam`, `slowSpam`, `warnUser`, `deleteMessages`, or `timeoutUser`.');
            
            const validTypes = ['antiSpamEnabled', 'antiLink', 'fastSpam', 'slowSpam', 'warnUser', 'deleteMessages', 'timeoutUser'];
            if (!validTypes.includes(type)) return message.reply(`⚠️ Invalid type. Use one of: ${validTypes.join(', ')}`);

            let updatedVal;
            if (type === 'antiSpamEnabled') {
                settings.antiSpamEnabled = !settings.antiSpamEnabled;
                updatedVal = settings.antiSpamEnabled;
            } else if (type === 'antiLink') {
                if (!settings.antiLink) settings.antiLink = { enabled: false, filterMode: 'whitelist', whitelistedChannels: [], blacklistedChannels: [] };
                settings.antiLink.enabled = !settings.antiLink.enabled;
                updatedVal = settings.antiLink.enabled;
            } else if (type === 'fastSpam' || type === 'slowSpam') {
                settings[type].enabled = !settings[type].enabled;
                updatedVal = settings[type].enabled;
            } else {
                settings[type] = !settings[type];
                updatedVal = settings[type];
            }
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ **${type}** has been ${updatedVal ? 'Enabled' : 'Disabled'}.`);
        }

        if (subcommand === 'setfast') {
            const threshold = parseInt(args[1]);
            const window = parseInt(args[2]);
            if (isNaN(threshold) || isNaN(window)) return message.reply('⚠️ Usage: `-automod setfast <threshold> <window_in_seconds>`');
            
            settings.fastSpam.threshold = threshold;
            settings.fastSpam.window = window * 1000;
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ Fast spam set to **${threshold}** messages in **${window}** seconds.`);
        }

        if (subcommand === 'setslow') {
            const threshold = parseInt(args[1]);
            const window = parseInt(args[2]);
            if (isNaN(threshold) || isNaN(window)) return message.reply('⚠️ Usage: `-automod setslow <threshold> <window_in_seconds>`');
            
            settings.slowSpam.threshold = threshold;
            settings.slowSpam.window = window * 1000;
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ Slow spam set to **${threshold}** messages in **${window}** seconds.`);
        }

        if (subcommand === 'settimeout') {
            const durationInput = args[1];
            if (!durationInput) return message.reply('⚠️ Usage: `-automod settimeout <duration_like_10m>`');
            
            const ms = require('ms');
            const msDuration = ms(durationInput);
            if (!msDuration || msDuration < 5000) {
                return message.reply('❌ Invalid duration. Please use values like `1m`, `1h`.');
            }
            settings.timeoutDuration = msDuration;
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ Timeout duration set to **${ms(msDuration, { long: true })}**.`);
        }

        if (subcommand === 'ignore') {
            const action = args[1]?.toLowerCase();
            const targetUser = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

            if (!action || !['add', 'remove'].includes(action)) {
                return message.reply('⚠️ Usage: `-automod ignore <add|remove> <@user|id>`');
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
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ <@${targetUser.id}> has been ${action === 'add' ? 'Added to' : 'Removed from'} the AutoMod watchlist.`);
        }

        if (subcommand === 'repetition') {
            const val = args[1]?.toLowerCase();
            if (!val || !['true', 'false', 'on', 'off'].includes(val)) return message.reply('⚠️ Usage: `-automod repetition <on|off>`');
            const enabled = ['true', 'on'].includes(val);
            settings.repetitionEnabled = enabled;
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ Repetition detection has been **${enabled ? 'Enabled' : 'Disabled'}**.`);
        }

        if (subcommand === 'setrepetition') {
            const threshold = parseInt(args[1]);
            if (isNaN(threshold)) return message.reply('⚠️ Usage: `-automod setrepetition <threshold>`');
            settings.repetitionThreshold = threshold;
            await settings.save();
            if (message.client.autoModSettings) message.client.autoModSettings.delete(guildId);
            return message.reply(`✅ Repetition threshold set to **${threshold}** messages.`);
        }

        return message.reply(`❓ Unknown subcommand. Available: \`settings\`, \`toggle\`, \`setfast\`, \`setslow\`, \`settimeout\`, \`ignore\`, \`repetition\`, \`setrepetition\`.`);
    },
};
