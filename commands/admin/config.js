const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettingsSchema');
const AutoMod = require('../../models/autoModSchema');
const Censor = require('../../models/censorSchema');
const MediaOnly = require('../../models/mediaOnlySchema');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config.json');

async function checkGuildPremium(guildId, client) {
    const premiumGuilds = (process.env.PREMIUM_GUILDS || "").split(",").map(id => id.trim());
    if (premiumGuilds.includes(guildId)) return true;

    const premiumUsers = (process.env.PREMIUM_USERS || "").split(",").map(id => id.trim());
    try {
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (guild && premiumUsers.includes(guild.ownerId)) return true;
    } catch (e) {}

    const guildConfig = await GuildSettings.findOne({ guildId }).lean();
    if (guildConfig && guildConfig.isPremium) return true;

    return false;
}

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure server settings and dashboard permissions.')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current server configuration overview.'))
        .addSubcommand(sub =>
            sub.setName('bot')
                .setDescription('Configure general bot settings.')
                .addStringOption(opt => opt.setName('prefix').setDescription('Change command prefix (use empty string to clear).'))
                .addStringOption(opt => opt.setName('nickname').setDescription('Change the bot\'s server nickname.'))
                .addIntegerOption(opt => opt.setName('purge_amount').setDescription('Default message count for purge command.'))
                .addBooleanOption(opt => opt.setName('delete_invoke').setDescription('Automatically delete invocation messages.'))
                .addBooleanOption(opt => opt.setName('unknown_cmd_msg').setDescription('Announce unknown command usage warnings.'))
                .addChannelOption(opt => opt.setName('quotes_channel').setDescription('DESIGNATED quotes channel.').addChannelTypes(ChannelType.GuildText))
                .addBooleanOption(opt => opt.setName('snipe_enabled').setDescription('Toggle message deletion sniping.')))
        .addSubcommand(sub =>
            sub.setName('music')
                .setDescription('Configure music settings.')
                .addIntegerOption(opt => opt.setName('default_volume').setDescription('Set bot default playing volume (0-100).').setMinValue(0).setMaxValue(100))
                .addRoleOption(opt => opt.setName('dj_role').setDescription('Configure a DJ role for music queue moderation.'))
                .addBooleanOption(opt => opt.setName('announce_songs').setDescription('Announce now playing songs.'))
                .addBooleanOption(opt => opt.setName('twenty_four_seven').setDescription('Keep bot in music channel 24/7 (Premium Only).')))
        .addSubcommand(sub =>
            sub.setName('automod')
                .setDescription('Configure basic AutoMod status.')
                .addBooleanOption(opt => opt.setName('antispam').setDescription('Enable or disable AntiSpam moderation.'))
                .addBooleanOption(opt => opt.setName('antilink').setDescription('Enable or disable AntiLink URL restrictions.'))
                .addChannelOption(opt => opt.setName('log_channel').setDescription('Text channel to route AutoMod alerts.').addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub =>
            sub.setName('censor')
                .setDescription('Configure chat word censors.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Toggle censor filter status.'))
                .addStringOption(opt => opt.setName('add_word').setDescription('Words to blacklist (comma separated).'))
                .addStringOption(opt => opt.setName('remove_word').setDescription('Words to remove from blacklist (comma separated).'))
                .addChannelOption(opt => opt.setName('log_channel').setDescription('Logs warnings channel.').addChannelTypes(ChannelType.GuildText))
                .addRoleOption(opt => opt.setName('staff_role').setDescription('Role to ping on censor violations.')))
        .addSubcommand(sub =>
            sub.setName('mediaonly')
                .setDescription('Configure media-only channels.')
                .addStringOption(opt => opt.setName('action').setDescription('Action to perform').setRequired(true).addChoices(
                    { name: 'Add channel', value: 'add' },
                    { name: 'Remove channel', value: 'remove' },
                    { name: 'List channels', value: 'list' }
                ))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target channel (for add/remove).').addChannelTypes(ChannelType.GuildText))
                .addStringOption(opt => opt.setName('warning').setDescription('Custom message warning text (for add).'))
                .addBooleanOption(opt => opt.setName('create_thread').setDescription('Create discussion thread (for add).'))
                .addBooleanOption(opt => opt.setName('apply_everyone').setDescription('Enforce on moderators too (for add).')))
        .addSubcommand(sub =>
            sub.setName('permissions')
                .setDescription('Manage custom dashboard permission roles.')
                .addStringOption(opt => opt.setName('tab').setDescription('Dashboard tab settings area').setRequired(true).addChoices(
                    { name: 'Bot Identity', value: 'bot' },
                    { name: 'Music Settings', value: 'music' },
                    { name: 'AutoMod Config', value: 'automod' },
                    { name: 'Censor Settings', value: 'censor' },
                    { name: 'Triggers Manager', value: 'triggers' },
                    { name: 'Giveaways Manager', value: 'giveaways' },
                    { name: 'Embed Builder', value: 'embed' },
                    { name: 'Media Only', value: 'mediaonly' }
                ))
                .addStringOption(opt => opt.setName('action').setDescription('Action to perform').setRequired(true).addChoices(
                    { name: 'Add permission role', value: 'add' },
                    { name: 'Remove permission role', value: 'remove' },
                    { name: 'View configuration', value: 'view' }
                ))
                .addRoleOption(opt => opt.setName('role').setDescription('Role (required for add/remove).'))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const guildId = guild.id;

        // Perform module-level permission checks
        if (sub === 'view') {
            const hasAny = await checkCommandPermission(interaction, 'bot') ||
                           await checkCommandPermission(interaction, 'music') ||
                           await checkCommandPermission(interaction, 'automod') ||
                           await checkCommandPermission(interaction, 'censor') ||
                           await checkCommandPermission(interaction, 'mediaonly') ||
                           await checkCommandPermission(interaction, 'triggers') ||
                           await checkCommandPermission(interaction, 'giveaways') ||
                           await checkCommandPermission(interaction, 'embed');
            if (!hasAny) {
                return interaction.reply({ content: '❌ You do not have permission to view server configuration settings.', ephemeral: true });
            }
        } else if (sub === 'bot') {
            if (!await checkCommandPermission(interaction, 'bot')) {
                return interaction.reply({ content: '❌ You do not have permission to modify general bot settings.', ephemeral: true });
            }
        } else if (sub === 'music') {
            if (!await checkCommandPermission(interaction, 'music')) {
                return interaction.reply({ content: '❌ You do not have permission to modify music settings.', ephemeral: true });
            }
        } else if (sub === 'automod') {
            if (!await checkCommandPermission(interaction, 'automod')) {
                return interaction.reply({ content: '❌ You do not have permission to modify AutoMod settings.', ephemeral: true });
            }
        } else if (sub === 'censor') {
            if (!await checkCommandPermission(interaction, 'censor')) {
                return interaction.reply({ content: '❌ You do not have permission to modify Censor settings.', ephemeral: true });
            }
        } else if (sub === 'mediaonly') {
            if (!await checkCommandPermission(interaction, 'mediaonly')) {
                return interaction.reply({ content: '❌ You do not have permission to modify Media-Only settings.', ephemeral: true });
            }
        } else if (sub === 'permissions') {
            const isOwner = guild.ownerId === interaction.user.id;
            const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isDev = interaction.user.id === config.devId;
            if (!isOwner && !isAdmin && !isDev) {
                return interaction.reply({ content: '❌ Only server Owners or Administrators can modify Dashboard Permissions.', ephemeral: true });
            }
        }

        try {
            if (sub === 'view') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });
                let automod = await AutoMod.findOne({ guildId });
                if (!automod) automod = new AutoMod({ guildId });
                let censor = await Censor.findOne({ guildId });
                if (!censor) censor = new Censor({ guildId });
                let mediaChannels = await MediaOnly.find({ guildId });

                const embed = new EmbedBuilder()
                    .setTitle(`⚙️ Configuration Overview: ${guild.name}`)
                    .setColor('#a78bfa')
                    .setThumbnail(guild.iconURL({ size: 128 }))
                    .setDescription('Current server settings. Modify these with subcommands or via the Dashboard!')
                    .addFields(
                        {
                            name: '🤖 Bot Identity (`/config bot`)',
                            value: `• **Prefix:** \`${settings.bot?.prefix || 'Default (-)'}\`\n` +
                                   `• **Nickname:** \`${settings.bot?.nickname || 'None'}\`\n` +
                                   `• **Purge Amount:** \`${settings.bot?.defaultPurgeAmount ?? 10}\`\n` +
                                   `• **Snipe:** ${settings.bot?.snipeEnabled !== false ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **Quotes Channel:** ${settings.bot?.quotesChannelId ? `<#${settings.bot.quotesChannelId}>` : 'Disabled'}\n` +
                                   `• **Delete Invoke:** ${settings.bot?.deleteInvoke ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **Unknown Command Warn:** ${settings.bot?.unknownCommandMsg ? '🟢 Yes' : '🔴 No'}`
                        },
                        {
                            name: '🎵 Music settings (`/config music`)',
                            value: `• **Default Volume:** \`${settings.music?.defaultVolume ?? 50}%\`\n` +
                                   `• **DJ Role:** ${settings.music?.djRoleId ? `<@&${settings.music.djRoleId}>` : 'None'}\n` +
                                   `• **Announce Songs:** ${settings.music?.announceSongs !== false ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **24/7 Playback:** ${settings.music?.twentyFourSeven ? '🟢 Yes' : '🔴 No'}`
                        },
                        {
                            name: '🛡️ AutoMod Status (`/config automod`)',
                            value: `• **AntiSpam:** ${automod.antiSpamEnabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **AntiLink:** ${automod.antiLink?.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **Log Channel:** ${automod.logChannelId ? `<#${automod.logChannelId}>` : 'None'}`
                        },
                        {
                            name: '🤬 Censor Config (`/config censor`)',
                            value: `• **Enabled:** ${censor.enabled ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **Hardcore Words:** \`${censor.hardcoreWords?.length || 0}\` words\n` +
                                   `• **Log Channel:** ${censor.logChannelId ? `<#${censor.logChannelId}>` : 'None'}\n` +
                                   `• **Staff Ping Role:** ${censor.staffRoleId ? `<@&${censor.staffRoleId}>` : 'None'}`
                        },
                        {
                            name: '🖼️ Media Only (`/config mediaonly`)',
                            value: `• **Configured Channels:** ${mediaChannels.length > 0 ? mediaChannels.map(c => `<#${c.channelId}>`).join(', ') : 'None'}`
                        },
                        {
                            name: '🔑 Dashboard Perm Roles (`/config permissions`)',
                            value: `• **Bot Identity:** ${settings.dashboardPermissions?.bot?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Music:** ${settings.dashboardPermissions?.music?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **AutoMod:** ${settings.dashboardPermissions?.automod?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Censor:** ${settings.dashboardPermissions?.censor?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Triggers:** ${settings.dashboardPermissions?.triggers?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Giveaways:** ${settings.dashboardPermissions?.giveaways?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Embed:** ${settings.dashboardPermissions?.embed?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}`
                        }
                    );

                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'bot') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                let updated = [];
                const prefix = interaction.options.getString('prefix');
                if (prefix !== null) {
                    settings.bot.prefix = prefix;
                    updated.push(`prefix: \`${prefix || '(fallback)'}\``);
                }
                const nickname = interaction.options.getString('nickname');
                if (nickname !== null) {
                    settings.bot.nickname = nickname;
                    updated.push(`nickname: \`${nickname || 'None'}\``);
                    try {
                        await guild.members.me.setNickname(nickname || null);
                    } catch (e) {}
                }
                const purgeAmount = interaction.options.getInteger('purge_amount');
                if (purgeAmount !== null) {
                    if (purgeAmount < 1) return interaction.reply({ content: '❌ Purge amount must be at least 1.', ephemeral: true });
                    settings.bot.defaultPurgeAmount = purgeAmount;
                    updated.push(`default purge amount: \`${purgeAmount}\``);
                }
                const deleteInvoke = interaction.options.getBoolean('delete_invoke');
                if (deleteInvoke !== null) {
                    settings.bot.deleteInvoke = deleteInvoke;
                    updated.push(`delete invoke: \`${deleteInvoke}\``);
                }
                const unknownCmdMsg = interaction.options.getBoolean('unknown_cmd_msg');
                if (unknownCmdMsg !== null) {
                    settings.bot.unknownCommandMsg = unknownCmdMsg;
                    updated.push(`unknown command warning: \`${unknownCmdMsg}\``);
                }
                const quotesChannel = interaction.options.getChannel('quotes_channel');
                if (quotesChannel !== null) {
                    settings.bot.quotesChannelId = quotesChannel ? quotesChannel.id : null;
                    updated.push(`quotes channel: ${quotesChannel ? quotesChannel : 'Disabled'}`);
                }
                const snipeEnabled = interaction.options.getBoolean('snipe_enabled');
                if (snipeEnabled !== null) {
                    settings.bot.snipeEnabled = snipeEnabled;
                    updated.push(`snipe enabled: \`${snipeEnabled}\``);
                }

                if (updated.length > 0) {
                    await settings.save();
                    return interaction.reply(`✅ Updated General Bot settings: ${updated.join(', ')}`);
                } else {
                    return interaction.reply({ content: '⚠️ Please specify at least one general bot option to configure.', ephemeral: true });
                }
            }

            if (sub === 'music') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                let updated = [];
                const defaultVolume = interaction.options.getInteger('default_volume');
                if (defaultVolume !== null) {
                    settings.music.defaultVolume = defaultVolume;
                    updated.push(`default volume: \`${defaultVolume}%\``);
                }
                const djRole = interaction.options.getRole('dj_role');
                if (djRole !== null) {
                    settings.music.djRoleId = djRole ? djRole.id : null;
                    updated.push(`DJ role: ${djRole ? djRole : 'None'}`);
                }
                const announce = interaction.options.getBoolean('announce_songs');
                if (announce !== null) {
                    settings.music.announceSongs = announce;
                    updated.push(`announce songs: \`${announce}\``);
                }
                const tfs = interaction.options.getBoolean('twenty_four_seven');
                if (tfs !== null) {
                    const isPrem = await checkGuildPremium(guildId, interaction.client);
                    if (tfs === true && !isPrem) {
                        return interaction.reply({ content: '❌ 24/7 Playback is a **Premium Only** feature.', ephemeral: true });
                    }
                    settings.music.twentyFourSeven = tfs;
                    updated.push(`24/7 playback: \`${tfs}\``);
                }

                if (updated.length > 0) {
                    await settings.save();
                    return interaction.reply(`✅ Updated Music settings: ${updated.join(', ')}`);
                } else {
                    return interaction.reply({ content: '⚠️ Please specify at least one music option to configure.', ephemeral: true });
                }
            }

            if (sub === 'automod') {
                let automod = await AutoMod.findOne({ guildId });
                if (!automod) automod = new AutoMod({ guildId });

                let updated = [];
                const spam = interaction.options.getBoolean('antispam');
                if (spam !== null) {
                    automod.antiSpamEnabled = spam;
                    updated.push(`antiSpamEnabled: \`${spam}\``);
                }
                const link = interaction.options.getBoolean('antilink');
                if (link !== null) {
                    if (!automod.antiLink) automod.antiLink = {};
                    automod.antiLink.enabled = link;
                    updated.push(`antiLink.enabled: \`${link}\``);
                }
                const logChan = interaction.options.getChannel('log_channel');
                if (logChan !== null) {
                    automod.logChannelId = logChan ? logChan.id : null;
                    updated.push(`logChannelId: ${logChan ? logChan : 'Disabled'}`);
                }

                if (updated.length > 0) {
                    await automod.save();
                    if (interaction.client.autoModSettings) interaction.client.autoModSettings.delete(guildId);
                    return interaction.reply(`✅ Updated AutoMod settings: ${updated.join(', ')}`);
                } else {
                    return interaction.reply({ content: '⚠️ Please specify at least one AutoMod option to configure.', ephemeral: true });
                }
            }

            if (sub === 'censor') {
                let censor = await Censor.findOne({ guildId });
                if (!censor) censor = new Censor({ guildId });

                let updated = [];
                const enabled = interaction.options.getBoolean('enabled');
                if (enabled !== null) {
                    censor.enabled = enabled;
                    updated.push(`enabled: \`${enabled}\``);
                }
                const addWord = interaction.options.getString('add_word');
                if (addWord !== null) {
                    const words = addWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                    if (words.length > 0) {
                        const totalWords = (censor.hardcoreWords || []).length + (censor.restrictedWords || []).length + words.length;
                        const { getGuildPremiumTier } = require('../../utils/premiumPromo');
                        const guildTier = await getGuildPremiumTier(guildId);
                        let censorLimit = 30;
                        if (guildTier === 'lite') censorLimit = 100;
                        else if (guildTier === 'pro') censorLimit = 300;
                        else if (guildTier === 'network' || guildTier === 'lifetime') censorLimit = Infinity;

                        if (totalWords > censorLimit) {
                            return interaction.reply({ content: `❌ Your server's tier (${guildTier.toUpperCase()}) is limited to ${censorLimit} censored words. Please upgrade to unlock higher limits.`, ephemeral: true });
                        }

                        censor.hardcoreWords = [...new Set([...(censor.hardcoreWords || []), ...words])];
                        updated.push(`added words: \`${words.join(', ')}\``);
                    }
                }
                const removeWord = interaction.options.getString('remove_word');
                if (removeWord !== null) {
                    const words = removeWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                    if (words.length > 0) {
                        censor.hardcoreWords = (censor.hardcoreWords || []).filter(w => !words.includes(w));
                        censor.restrictedWords = (censor.restrictedWords || []).filter(w => !words.includes(w));
                        updated.push(`removed words: \`${words.join(', ')}\``);
                    }
                }
                const logChan = interaction.options.getChannel('log_channel');
                if (logChan !== null) {
                    censor.logChannelId = logChan ? logChan.id : null;
                    updated.push(`log channel: ${logChan ? logChan : 'Disabled'}`);
                }
                const staffRole = interaction.options.getRole('staff_role');
                if (staffRole !== null) {
                    censor.staffRoleId = staffRole ? staffRole.id : null;
                    updated.push(`staff ping role: ${staffRole ? staffRole : 'Disabled'}`);
                }

                if (updated.length > 0) {
                    await censor.save();
                    if (interaction.client.censorCache) interaction.client.censorCache.delete(guildId);
                    return interaction.reply(`✅ Updated Censor settings: ${updated.join(', ')}`);
                } else {
                    return interaction.reply({ content: '⚠️ Please specify at least one Censor option to configure.', ephemeral: true });
                }
            }

            if (sub === 'mediaonly') {
                const action = interaction.options.getString('action');

                if (action === 'list') {
                    const channels = await MediaOnly.find({ guildId });
                    if (channels.length === 0) {
                        return interaction.reply('📋 No media-only channels are configured for this server.');
                    }
                    const list = channels.map(c => `• <#${c.channelId}> (Thread: \`${c.createThread !== false}\`, Everyone: \`${c.applyToEveryone || false}\`)`).join('\n');
                    return interaction.reply(`📋 **Media-Only Channels:**\n${list}`);
                }

                const channel = interaction.options.getChannel('channel');
                if (!channel) {
                    return interaction.reply({ content: '❌ You must specify a target channel.', ephemeral: true });
                }

                if (action === 'add') {
                    const isPrem = await checkGuildPremium(guildId, interaction.client);
                    const count = await MediaOnly.countDocuments({ guildId });
                    if (!isPrem && count >= 10) {
                        return interaction.reply({ content: '❌ Free servers are limited to 10 media-only channels. Get Premium to unlock unlimited!', ephemeral: true });
                    }

                    const warning = interaction.options.getString('warning') || null;
                    const createThread = interaction.options.getBoolean('create_thread') !== false;
                    const applyEveryone = interaction.options.getBoolean('apply_everyone') || false;

                    await MediaOnly.findOneAndUpdate(
                        { guildId, channelId: channel.id },
                        { enabled: true, customWarning: warning, createThread, applyToEveryone: applyEveryone },
                        { upsert: true, new: true }
                    );

                    return interaction.reply(`✅ Successfully added ${channel} to media-only channels.`);
                }

                if (action === 'remove') {
                    const result = await MediaOnly.deleteOne({ guildId, channelId: channel.id });
                    if (result.deletedCount > 0) {
                        return interaction.reply(`🗑️ Removed ${channel} from media-only channels.`);
                    } else {
                        return interaction.reply(`⚠️ Channel ${channel} is not configured as media-only.`);
                    }
                }
            }

            if (sub === 'permissions') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                const tab = interaction.options.getString('tab');
                const action = interaction.options.getString('action');
                const role = interaction.options.getRole('role');

                if (!settings.dashboardPermissions) {
                    settings.dashboardPermissions = {};
                }

                if (action === 'view') {
                    const roles = settings.dashboardPermissions[tab] || [];
                    if (roles.length === 0) {
                        return interaction.reply(`📋 Permission roles for **${tab}** tab: None set (Only Server Owners and Administrators can manage).`);
                    }
                    const list = roles.map(r => `<@&${r}>`).join(', ');
                    return interaction.reply(`📋 Permission roles for **${tab}** tab: ${list}`);
                }

                if (!role) {
                    return interaction.reply({ content: '❌ You must specify a role for add/remove actions.', ephemeral: true });
                }

                if (action === 'add') {
                    const current = settings.dashboardPermissions[tab] || [];
                    if (current.includes(role.id)) {
                        return interaction.reply(`⚠️ Role ${role} is already added to **${tab}** permissions.`);
                    }
                    settings.dashboardPermissions[tab] = [...current, role.id];
                    settings.markModified('dashboardPermissions');
                    await settings.save();
                    return interaction.reply(`✅ Added ${role} to **${tab}** dashboard access permission roles.`);
                }

                if (action === 'remove') {
                    const current = settings.dashboardPermissions[tab] || [];
                    if (!current.includes(role.id)) {
                        return interaction.reply(`⚠️ Role ${role} is not in **${tab}** permissions.`);
                    }
                    settings.dashboardPermissions[tab] = current.filter(id => id !== role.id);
                    settings.markModified('dashboardPermissions');
                    await settings.save();
                    return interaction.reply(`🗑️ Removed ${role} from **${tab}** dashboard access permission roles.`);
                }
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Failed to process configuration change.', ephemeral: true });
        }
    },

    async executePrefix(message, args, client) {
        const guild = message.guild;
        const guildId = guild.id;
        const sub = args[0]?.toLowerCase();

        // Perform module-level permission checks
        if (!sub || sub === 'view') {
            const hasAny = await checkCommandPermission(message, 'bot') ||
                           await checkCommandPermission(message, 'music') ||
                           await checkCommandPermission(message, 'automod') ||
                           await checkCommandPermission(message, 'censor') ||
                           await checkCommandPermission(message, 'mediaonly') ||
                           await checkCommandPermission(message, 'triggers') ||
                           await checkCommandPermission(message, 'giveaways') ||
                           await checkCommandPermission(message, 'embed');
            if (!hasAny) {
                return message.reply('❌ You do not have permission to view server configuration settings.');
            }
        } else if (sub === 'bot') {
            if (!await checkCommandPermission(message, 'bot')) {
                return message.reply('❌ You do not have permission to modify general bot settings.');
            }
        } else if (sub === 'music') {
            if (!await checkCommandPermission(message, 'music')) {
                return message.reply('❌ You do not have permission to modify music settings.');
            }
        } else if (sub === 'automod') {
            if (!await checkCommandPermission(message, 'automod')) {
                return message.reply('❌ You do not have permission to modify AutoMod settings.');
            }
        } else if (sub === 'censor') {
            if (!await checkCommandPermission(message, 'censor')) {
                return message.reply('❌ You do not have permission to modify Censor settings.');
            }
        } else if (sub === 'mediaonly') {
            if (!await checkCommandPermission(message, 'mediaonly')) {
                return message.reply('❌ You do not have permission to modify Media-Only settings.');
            }
        } else if (sub === 'permissions') {
            const isOwner = guild.ownerId === message.author.id;
            const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isDev = message.author.id === config.devId;
            if (!isOwner && !isAdmin && !isDev) {
                return message.reply('❌ Only server Owners or Administrators can modify Dashboard Permissions.');
            }
        }

        try {
            if (!sub || sub === 'view') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });
                let automod = await AutoMod.findOne({ guildId });
                if (!automod) automod = new AutoMod({ guildId });
                let censor = await Censor.findOne({ guildId });
                if (!censor) censor = new Censor({ guildId });
                let mediaChannels = await MediaOnly.find({ guildId });

                const embed = new EmbedBuilder()
                    .setTitle(`⚙️ Configuration Overview: ${guild.name}`)
                    .setColor('#a78bfa')
                    .setThumbnail(guild.iconURL({ size: 128 }))
                    .setDescription('Current server settings. Modify these with: `-config <bot/music/automod/censor/mediaonly/permissions>`')
                    .addFields(
                        {
                            name: '🤖 Bot Identity (`-config bot`)',
                            value: `• **Prefix:** \`${settings.bot?.prefix || 'Default (-)'}\`\n` +
                                   `• **Nickname:** \`${settings.bot?.nickname || 'None'}\`\n` +
                                   `• **Purge Amount:** \`${settings.bot?.defaultPurgeAmount ?? 10}\`\n` +
                                   `• **Snipe:** ${settings.bot?.snipeEnabled !== false ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **Quotes Channel:** ${settings.bot?.quotesChannelId ? `<#${settings.bot.quotesChannelId}>` : 'Disabled'}\n` +
                                   `• **Delete Invoke:** ${settings.bot?.deleteInvoke ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **Unknown Command Warn:** ${settings.bot?.unknownCommandMsg ? '🟢 Yes' : '🔴 No'}`
                        },
                        {
                            name: '🎵 Music settings (`-config music`)',
                            value: `• **Default Volume:** \`${settings.music?.defaultVolume ?? 50}%\`\n` +
                                   `• **DJ Role:** ${settings.music?.djRoleId ? `<@&${settings.music.djRoleId}>` : 'None'}\n` +
                                   `• **Announce Songs:** ${settings.music?.announceSongs !== false ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **24/7 Playback:** ${settings.music?.twentyFourSeven ? '🟢 Yes' : '🔴 No'}`
                        },
                        {
                            name: '🛡️ AutoMod Status (`-config automod`)',
                            value: `• **AntiSpam:** ${automod.antiSpamEnabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **AntiLink:** ${automod.antiLink?.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                                   `• **Log Channel:** ${automod.logChannelId ? `<#${automod.logChannelId}>` : 'None'}`
                        },
                        {
                            name: '🤬 Censor Config (`-config censor`)',
                            value: `• **Enabled:** ${censor.enabled ? '🟢 Yes' : '🔴 No'}\n` +
                                   `• **Hardcore Words:** \`${censor.hardcoreWords?.length || 0}\` words\n` +
                                   `• **Log Channel:** ${censor.logChannelId ? `<#${censor.logChannelId}>` : 'None'}\n` +
                                   `• **Staff Ping Role:** ${censor.staffRoleId ? `<@&${censor.staffRoleId}>` : 'None'}`
                        },
                        {
                            name: '🖼️ Media Only (`-config mediaonly`)',
                            value: `• **Configured Channels:** ${mediaChannels.length > 0 ? mediaChannels.map(c => `<#${c.channelId}>`).join(', ') : 'None'}`
                        },
                        {
                            name: '🔑 Dashboard Perm Roles (`-config permissions`)',
                            value: `• **Bot Identity:** ${settings.dashboardPermissions?.bot?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Music:** ${settings.dashboardPermissions?.music?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **AutoMod:** ${settings.dashboardPermissions?.automod?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Censor:** ${settings.dashboardPermissions?.censor?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Triggers:** ${settings.dashboardPermissions?.triggers?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Giveaways:** ${settings.dashboardPermissions?.giveaways?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}\n` +
                                   `• **Embed:** ${settings.dashboardPermissions?.embed?.map(r => `<@&${r}>`).join(', ') || 'Only Admins'}`
                        }
                    );

                return message.reply({ embeds: [embed] });
            }

            if (sub === 'bot') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                const key = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');

                if (!key) {
                    return message.reply('⚠️ Specify parameter to edit: `prefix`, `nickname`, `purge_amount`, `delete_invoke`, `unknown_cmd_msg`, `quotes_channel`, or `snipe_enabled`.\nExample: `-config bot prefix !`');
                }

                if (key === 'prefix') {
                    settings.bot.prefix = value;
                    await settings.save();
                    return message.reply(`✅ Updated command prefix to \`${value || '(fallback)'}\`.`);
                } else if (key === 'nickname') {
                    settings.bot.nickname = value;
                    await settings.save();
                    try {
                        await guild.members.me.setNickname(value || null);
                    } catch (e) {}
                    return message.reply(`✅ Updated bot server nickname to \`${value || 'None'}\`.`);
                } else if (key === 'purge_amount' || key === 'defaultpurgeamount') {
                    const amt = parseInt(value);
                    if (isNaN(amt) || amt < 1) return message.reply('❌ Please specify a valid integer of at least 1.');
                    settings.bot.defaultPurgeAmount = amt;
                    await settings.save();
                    return message.reply(`✅ Updated default purge amount to \`${amt}\`.`);
                } else if (key === 'delete_invoke' || key === 'deleteinvoke') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    settings.bot.deleteInvoke = active;
                    await settings.save();
                    return message.reply(`✅ Auto-delete invocation set to \`${active}\`.`);
                } else if (key === 'unknown_cmd_msg' || key === 'unknowncommandmsg') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    settings.bot.unknownCommandMsg = active;
                    await settings.save();
                    return message.reply(`✅ Unknown command warning warnings set to \`${active}\`.`);
                } else if (key === 'quotes_channel' || key === 'quoteschannel') {
                    if (value.toLowerCase() === 'none' || value.toLowerCase() === 'disable') {
                        settings.bot.quotesChannelId = null;
                        await settings.save();
                        return message.reply('🗑️ Quotes channel has been disabled.');
                    }
                    const chanId = value.replace(/[<#&>]/g, '');
                    const chan = guild.channels.cache.get(chanId);
                    if (!chan || chan.type !== ChannelType.GuildText) {
                        return message.reply('❌ Please specify a valid text channel.');
                    }
                    settings.bot.quotesChannelId = chan.id;
                    await settings.save();
                    return message.reply(`✅ Designated quotes channel set to ${chan}.`);
                } else if (key === 'snipe_enabled' || key === 'snipeenabled') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    settings.bot.snipeEnabled = active;
                    await settings.save();
                    return message.reply(`✅ Snipe feature set to \`${active}\`.`);
                } else {
                    return message.reply(`❌ Unknown parameter: \`${key}\`.`);
                }
            }

            if (sub === 'music') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                const key = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');

                if (!key) {
                    return message.reply('⚠️ Specify parameter to edit: `default_volume`, `dj_role`, `announce_songs`, or `twenty_four_seven`.\nExample: `-config music default_volume 50`');
                }

                if (key === 'default_volume' || key === 'defaultvolume' || key === 'volume') {
                    const vol = parseInt(value);
                    if (isNaN(vol) || vol < 0 || vol > 100) return message.reply('❌ Specify a volume between 0 and 100.');
                    settings.music.defaultVolume = vol;
                    await settings.save();
                    return message.reply(`✅ Default playing volume set to \`${vol}%\`.`);
                } else if (key === 'dj_role' || key === 'djrole') {
                    if (value.toLowerCase() === 'none' || value.toLowerCase() === 'disable') {
                        settings.music.djRoleId = null;
                        await settings.save();
                        return message.reply('🗑️ DJ role disabled.');
                    }
                    const roleId = value.replace(/[<@&>]/g, '');
                    const role = guild.roles.cache.get(roleId);
                    if (!role) return message.reply('❌ Invalid role specified.');
                    settings.music.djRoleId = role.id;
                    await settings.save();
                    return message.reply(`✅ Music DJ role set to ${role}.`);
                } else if (key === 'announce_songs' || key === 'announcesongs') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    settings.music.announceSongs = active;
                    await settings.save();
                    return message.reply(`✅ Now playing announcement set to \`${active}\`.`);
                } else if (key === 'twenty_four_seven' || key === '247') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    const isPrem = await checkGuildPremium(guildId, client);
                    if (active && !isPrem) {
                        return message.reply('❌ 24/7 Playback is a **Premium Only** feature.');
                    }
                    settings.music.twentyFourSeven = active;
                    await settings.save();
                    return message.reply(`✅ 24/7 playback set to \`${active}\`.`);
                } else {
                    return message.reply(`❌ Unknown parameter: \`${key}\`.`);
                }
            }

            if (sub === 'automod') {
                let automod = await AutoMod.findOne({ guildId });
                if (!automod) automod = new AutoMod({ guildId });

                const key = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');

                if (!key) {
                    return message.reply('⚠️ Specify parameter to edit: `antispam`, `antilink`, or `log_channel`.\nExample: `-config automod antispam on`');
                }

                if (key === 'antispam' || key === 'spam') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    automod.antiSpamEnabled = active;
                    await automod.save();
                    if (client.autoModSettings) client.autoModSettings.delete(guildId);
                    return message.reply(`✅ AntiSpam status updated to \`${active}\`.`);
                } else if (key === 'antilink' || key === 'link') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    if (!automod.antiLink) automod.antiLink = {};
                    automod.antiLink.enabled = active;
                    await automod.save();
                    if (client.autoModSettings) client.autoModSettings.delete(guildId);
                    return message.reply(`✅ AntiLink status updated to \`${active}\`.`);
                } else if (key === 'log_channel' || key === 'logchannel') {
                    if (value.toLowerCase() === 'none' || value.toLowerCase() === 'disable') {
                        automod.logChannelId = null;
                        await automod.save();
                        return message.reply('🗑️ AutoMod alert logging disabled.');
                    }
                    const chanId = value.replace(/[<#&>]/g, '');
                    const chan = guild.channels.cache.get(chanId);
                    if (!chan || chan.type !== ChannelType.GuildText) return message.reply('❌ Specify a valid text channel.');
                    automod.logChannelId = chan.id;
                    await automod.save();
                    if (client.autoModSettings) client.autoModSettings.delete(guildId);
                    return message.reply(`✅ AutoMod alert channel set to ${chan}.`);
                } else {
                    return message.reply(`❌ Unknown parameter: \`${key}\`.`);
                }
            }

            if (sub === 'censor') {
                let censor = await Censor.findOne({ guildId });
                if (!censor) censor = new Censor({ guildId });

                const key = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');

                if (!key) {
                    return message.reply('⚠️ Specify parameter to edit: `enabled`, `add_word`, `remove_word`, `log_channel`, or `staff_role`.\nExample: `-config censor enabled on`');
                }

                if (key === 'enabled' || key === 'status') {
                    const active = value.toLowerCase() === 'on' || value.toLowerCase() === 'true';
                    censor.enabled = active;
                    await censor.save();
                    if (client.censorCache) client.censorCache.delete(guildId);
                    return message.reply(`✅ Censor status updated to \`${active}\`.`);
                } else if (key === 'add_word' || key === 'addword' || key === 'add') {
                    const words = value.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                    if (words.length === 0) return message.reply('❌ Specify words to add (comma-separated).');

                    const totalWords = (censor.hardcoreWords || []).length + (censor.restrictedWords || []).length + words.length;
                    const { getGuildPremiumTier } = require('../../utils/premiumPromo');
                    const guildTier = await getGuildPremiumTier(guildId);
                    let censorLimit = 30;
                    if (guildTier === 'lite') censorLimit = 100;
                    else if (guildTier === 'pro') censorLimit = 300;
                    else if (guildTier === 'network' || guildTier === 'lifetime') censorLimit = Infinity;

                    if (totalWords > censorLimit) {
                        return message.reply(`❌ Your server's tier (${guildTier.toUpperCase()}) is limited to ${censorLimit} censored words. Please upgrade to unlock higher limits.`);
                    }

                    censor.hardcoreWords = [...new Set([...(censor.hardcoreWords || []), ...words])];
                    await censor.save();
                    if (client.censorCache) client.censorCache.delete(guildId);
                    return message.reply(`✅ Added words to censor blacklist: \`${words.join(', ')}\``);
                } else if (key === 'remove_word' || key === 'removeword' || key === 'remove' || key === 'delete') {
                    const words = value.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                    if (words.length === 0) return message.reply('❌ Specify words to remove (comma-separated).');
                    censor.hardcoreWords = (censor.hardcoreWords || []).filter(w => !words.includes(w));
                    censor.restrictedWords = (censor.restrictedWords || []).filter(w => !words.includes(w));
                    await censor.save();
                    if (client.censorCache) client.censorCache.delete(guildId);
                    return message.reply(`🗑️ Removed words from censor blacklist: \`${words.join(', ')}\``);
                } else if (key === 'log_channel' || key === 'logchannel') {
                    if (value.toLowerCase() === 'none' || value.toLowerCase() === 'disable') {
                        censor.logChannelId = null;
                        await censor.save();
                        return message.reply('🗑️ Censor warnings logging disabled.');
                    }
                    const chanId = value.replace(/[<#&>]/g, '');
                    const chan = guild.channels.cache.get(chanId);
                    if (!chan || chan.type !== ChannelType.GuildText) return message.reply('❌ Specify a valid text channel.');
                    censor.logChannelId = chan.id;
                    await censor.save();
                    if (client.censorCache) client.censorCache.delete(guildId);
                    return message.reply(`✅ Censor alert channel set to ${chan}.`);
                } else if (key === 'staff_role' || key === 'staffrole') {
                    if (value.toLowerCase() === 'none' || value.toLowerCase() === 'disable') {
                        censor.staffRoleId = null;
                        await censor.save();
                        return message.reply('🗑️ Staff ping role disabled.');
                    }
                    const roleId = value.replace(/[<@&>]/g, '');
                    const role = guild.roles.cache.get(roleId);
                    if (!role) return message.reply('❌ Invalid role specified.');
                    censor.staffRoleId = role.id;
                    await censor.save();
                    if (client.censorCache) client.censorCache.delete(guildId);
                    return message.reply(`✅ Staff ping role set to ${role}.`);
                } else {
                    return message.reply(`❌ Unknown parameter: \`${key}\`.`);
                }
            }

            if (sub === 'mediaonly') {
                const action = args[1]?.toLowerCase();
                const target = args[2];

                if (!action || action === 'list') {
                    const channels = await MediaOnly.find({ guildId });
                    if (channels.length === 0) {
                        return message.reply('📋 No media-only channels are configured for this server.');
                    }
                    const list = channels.map(c => `• <#${c.channelId}> (Thread: \`${c.createThread !== false}\`, Everyone: \`${c.applyToEveryone || false}\`)`).join('\n');
                    return message.reply(`📋 **Media-Only Channels:**\n${list}`);
                }

                if (!target) {
                    return message.reply('❌ Please specify a target channel. Example: `-config mediaonly add #gallery`');
                }

                const chanId = target.replace(/[<#&>]/g, '');
                const targetChannel = guild.channels.cache.get(chanId);
                if (!targetChannel) return message.reply('❌ Invalid channel specified.');

                if (action === 'add') {
                    const isPrem = await checkGuildPremium(guildId, client);
                    const count = await MediaOnly.countDocuments({ guildId });
                    if (!isPrem && count >= 10) {
                        return message.reply('❌ Free servers are limited to 10 media-only channels. Get Premium to unlock unlimited!');
                    }
                    await MediaOnly.findOneAndUpdate(
                        { guildId, channelId: targetChannel.id },
                        { enabled: true },
                        { upsert: true, new: true }
                    );
                    return message.reply(`✅ Added ${targetChannel} to media-only channels.`);
                } else if (action === 'remove' || action === 'delete') {
                    const result = await MediaOnly.deleteOne({ guildId, channelId: targetChannel.id });
                    if (result.deletedCount > 0) {
                        return message.reply(`🗑️ Removed ${targetChannel} from media-only channels.`);
                    } else {
                        return message.reply(`⚠️ Channel ${targetChannel} is not configured as media-only.`);
                    }
                } else {
                    return message.reply('❌ Action must be `add`, `remove`, or `list`.');
                }
            }

            if (sub === 'permissions') {
                let settings = await GuildSettings.findOne({ guildId });
                if (!settings) settings = new GuildSettings({ guildId });

                const tab = args[1]?.toLowerCase();
                const action = args[2]?.toLowerCase();
                const targetRole = args[3];

                const validTabs = ['bot', 'music', 'automod', 'censor', 'triggers', 'giveaways', 'embed', 'mediaonly'];
                if (!tab || !validTabs.includes(tab)) {
                    return message.reply(`⚠️ Specify dashboard tab: \`${validTabs.join(', ')}\`.\nExample: \`-config permissions bot view\``);
                }

                if (!settings.dashboardPermissions) settings.dashboardPermissions = {};

                if (!action || action === 'view' || action === 'list') {
                    const roles = settings.dashboardPermissions[tab] || [];
                    if (roles.length === 0) {
                        return message.reply(`📋 Permission roles for **${tab}** tab: None set (Only Server Owners and Administrators can manage).`);
                    }
                    const list = roles.map(r => `<@&${r}>`).join(', ');
                    return message.reply(`📋 Permission roles for **${tab}** tab: ${list}`);
                }

                if (!targetRole) {
                    return message.reply('❌ Please specify a target role. Example: `-config permissions bot add @Moderator`');
                }

                const roleId = targetRole.replace(/[<@&>]/g, '');
                const role = guild.roles.cache.get(roleId);
                if (!role) return message.reply('❌ Invalid role specified.');

                if (action === 'add') {
                    const current = settings.dashboardPermissions[tab] || [];
                    if (current.includes(role.id)) {
                        return message.reply(`⚠️ Role **${role.name}** is already added to **${tab}** permissions.`);
                    }
                    settings.dashboardPermissions[tab] = [...current, role.id];
                    settings.markModified('dashboardPermissions');
                    await settings.save();
                    return message.reply(`✅ Added **${role.name}** to **${tab}** dashboard access permission roles.`);
                } else if (action === 'remove' || action === 'delete') {
                    const current = settings.dashboardPermissions[tab] || [];
                    if (!current.includes(role.id)) {
                        return message.reply(`⚠️ Role **${role.name}** is not in **${tab}** permissions.`);
                    }
                    settings.dashboardPermissions[tab] = current.filter(id => id !== role.id);
                    settings.markModified('dashboardPermissions');
                    await settings.save();
                    return message.reply(`🗑️ Removed **${role.name}** from **${tab}** dashboard access permission roles.`);
                } else {
                    return message.reply('❌ Action must be `add`, `remove`, or `view`.');
                }
            }
        } catch (err) {
            console.error(err);
            return message.reply('❌ Failed to update configuration settings.');
        }
    }
};
