/* eslint-disable */
const { Collection, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        // Handle button interactions for adventure choices
        if (interaction.isButton()) {
            const customId = interaction.customId;
            if (customId === 'ticket_create') {
                return await handleTicketCreate(interaction, client);
            }
            if (customId === 'ticket_close') {
                return await handleTicketClose(interaction, client);
            }
            if (customId.startsWith('bauble_rain_grab_')) {
                const rainId = customId.replace('bauble_rain_grab_', '');
                return await handleBaubleRainGrab(interaction, client, rainId);
            }
            if (customId.startsWith('claim_pre_release_')) {
                const targetUserId = customId.split('_')[3];
                if (interaction.user.id !== targetUserId) {
                    return interaction.reply({ content: '❌ This badge is not for you!', flags: MessageFlags.Ephemeral });
                }

                await interaction.deferUpdate();

                const { checkAndAwardAchievement } = require('../utils/achievements');
                await checkAndAwardAchievement(client, interaction.user.id, 'pre_release_badge');

                const { EmbedBuilder } = require('discord.js');
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('🚀 Pre-Release Badge Claimed!')
                    .setDescription(`🎉 **Congratulations!** You have successfully claimed the exclusive **Pre-Release Supporter** badge!\n\nCheck it out on your profile with \`/profile view\` or \`-profile\`.`)
                    .setColor('#10b981');

                await interaction.message.edit({ embeds: [embed], components: [] }).catch(() => {});
                return;
            }

            if (customId.startsWith('adv_choice_') || customId.startsWith('adv_custom_')) {
                const parts = customId.split('_');
                let actionType, targetUserId, choiceVal;

                if (parts[1] === 'custom') {
                    actionType = 'custom';
                    targetUserId = parts[2];
                } else if (parts[1] === 'choice') {
                    actionType = 'choice';
                    choiceVal = parts[2]; // 'A', 'B', 'C', or 'D'
                    targetUserId = parts[3];
                }

                if (interaction.user.id !== targetUserId) {
                    return interaction.reply({ content: '❌ This is not your adventure!', flags: MessageFlags.Ephemeral });
                }

                if (actionType === 'custom') {
                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                    const modal = new ModalBuilder()
                        .setCustomId(`adv_modal_${interaction.user.id}`)
                        .setTitle('Adventure Custom Action');

                    const actionInput = new TextInputBuilder()
                        .setCustomId('adv_action_input')
                        .setLabel('What do you want to do next?')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Describe your action (e.g. cast a fireball, run...)')
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(actionInput);
                    modal.addComponents(row);

                    await interaction.showModal(modal);
                } else if (actionType === 'choice') {
                    await interaction.deferUpdate();
                    try {
                        const { handleAdventureChoose } = require('../commands/utility/ai.js');
                        await handleAdventureChoose(interaction, interaction.user, choiceVal);
                    } catch (err) {
                        console.error('Persistent adventure button error:', err);
                    }
                }
                return;
            }
        }

        // Handle modal submissions for custom adventure actions
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            if (customId.startsWith('adv_modal_')) {
                const targetUserId = customId.split('_')[2];
                if (interaction.user.id !== targetUserId) {
                    return interaction.reply({ content: '❌ This is not your adventure!', flags: MessageFlags.Ephemeral });
                }

                const actionText = interaction.fields.getTextInputValue('adv_action_input');
                await interaction.deferUpdate();

                try {
                    const { handleAdventureChoose } = require('../commands/utility/ai.js');
                    await handleAdventureChoose(interaction, interaction.user, actionText);
                } catch (err) {
                    console.error('Persistent adventure modal error:', err);
                }
                return;
            }
        }

        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            const { resolveGroupedCommand } = require('../utils/slashCommandsBundler');
            const command = resolveGroupedCommand(interaction, client);
            if (command && typeof command.autocomplete === 'function') {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(`[interactionCreate] Error in autocomplete for /${interaction.commandName}:`, error);
                }
            }
            return;
        }

        // Only handle slash/chat-input commands
        if (!interaction.isChatInputCommand()) return;

        const { resolveGroupedCommand } = require('../utils/slashCommandsBundler');
        const command = resolveGroupedCommand(interaction, client);
        if (!command) {
            return interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
        }

        // ─── Global Ban & Soft-Ban Guards ──────────────────────────────────────────
        const UserRestriction = require('../models/UserRestriction');
        const userRestriction = await UserRestriction.findOne({ userId: interaction.user.id });
        if (userRestriction) {
            if (userRestriction.isBanned) {
                return interaction.reply({
                    content: `❌ **Global Ban:** You have been globally banned from using Nishanka.\nReason: *${userRestriction.banReason || 'Violation of terms'}*`,
                    ephemeral: true
                });
            }
            if (userRestriction.isSoftBanned && userRestriction.lockoutExpiresAt && Date.now() < new Date(userRestriction.lockoutExpiresAt).getTime()) {
                const isEconomyOrGame = command.category === 'economy' || command.category === 'minigames' || command.category === 'casino';
                if (isEconomyOrGame) {
                    const expiryUnix = Math.floor(new Date(userRestriction.lockoutExpiresAt).getTime() / 1000);
                    return interaction.reply({
                        content: `⚠️ **Access Suspended:** Your access to economy and games has been temporarily locked due to automated anti-exploit detection. You can play again <t:${expiryUnix}:R>.`,
                        ephemeral: true
                    });
                }
            } else if (userRestriction.isSoftBanned) {
                userRestriction.isSoftBanned = false;
                userRestriction.lockoutExpiresAt = null;
                await userRestriction.save();
            }
        }

        // ─── Maintenance Mode Guard ────────────────────────────────────────────────
        const SystemConfig = require('../models/SystemConfig');
        const sysConfig = await SystemConfig.findOne();
        if (sysConfig && sysConfig.maintenanceMode) {
            const isDev = interaction.user.id === config.devId;
            if (!isDev) {
                const etaStr = sysConfig.maintenanceETA ? `\n⏳ **Estimated Uptime:** ${sysConfig.maintenanceETA}` : '';
                return interaction.reply({
                    content: `🛠️ **Maintenance Mode:** Nishanka is currently undergoing scheduled maintenance. Please check back later.\n> *${sysConfig.maintenanceMessage}*${etaStr}`,
                    ephemeral: true
                });
            }
        }

        let announcementText = '';
        if (sysConfig && sysConfig.announcementActive && sysConfig.announcement) {
            announcementText = sysConfig.announcement;
        }

        let fullCommandPath = `/${interaction.commandName}`;
        try {
            const subGroup = interaction.options.getSubcommandGroup(false);
            const subCmd = interaction.options.getSubcommand(false);
            if (subGroup) fullCommandPath += ` ${subGroup}`;
            if (subCmd) fullCommandPath += ` ${subCmd}`;
        } catch (_) {}

        const isDevOnly = command.category === 'admin' || command.category === 'developer' || command.devOnly === true;
        if (isDevOnly && interaction.user.id !== config.devId) {
            return interaction.reply({ content: '❌ This command is restricted to the bot developer only.', ephemeral: true });
        }

        if (client.disabledCommands && client.disabledCommands.has(command.data.name)) {
            return interaction.reply({ content: '❌ This command is currently disabled by the developer.', ephemeral: true });
        }

        // Programmatically enforce default_member_permissions for subcommands
        if (command.data && command.data.default_member_permissions) {
            const perm = command.data.default_member_permissions;
            const requiredPermission = typeof perm === 'string' && /^\d+$/.test(perm) ? BigInt(perm) : perm;
            if (interaction.member && !interaction.member.permissions.has(requiredPermission)) {
                return interaction.reply({
                    content: '❌ You do not have the required permissions to execute this subcommand.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // --- Cooldown logic ---
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const { isGuildPremium, isUserPremium, getRandomPromoTip, getRandomDashboardTip } = require('../utils/premiumPromo');
        const isGuildPrem = await isGuildPremium(interaction.guildId);
        const isPrem = isGuildPrem || isUserPremium(interaction.user.id);

        const now         = Date.now();
        const timestamps  = cooldowns.get(command.data.name);
        let cooldownMs  = (command.cooldown ?? 3) * 1000;

        if (command.isAI) {
            cooldownMs = (isPrem ? (command.premiumCooldown ?? 5) : (command.cooldown ?? 60)) * 1000;
        }

        if (command.data.name === 'work' || command.data.name === 'scavenge') {
            const Bauble = require('../models/baubleSchema');
            const baubleData = await Bauble.findOne({ userId: interaction.user.id }).lean();
            if (baubleData && baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                cooldownMs /= 2;
            }
        }

        if (timestamps.has(interaction.user.id)) {
            const expiry = timestamps.get(interaction.user.id) + cooldownMs;
            if (now < expiry) {
                const timestampId = Math.floor(expiry / 1000);
                let contentText = `⏳ Please wait, you can use \`${fullCommandPath}\` again <t:${timestampId}:R>.`;
                if (!isPrem) {
                    contentText += `\n💡 *Get Premium for as low as **$1.99/mo** (VERY CHEAP!) to reduce/remove cooldowns!*`;
                }
                return interaction.reply({
                    content: contentText,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        const lastExecutionTime = timestamps.get(interaction.user.id);

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

        if (lastExecutionTime) {
            const { trackCommandTiming } = require('../utils/antiExploit');
            trackCommandTiming(interaction.user.id, command.data.name, cooldownMs, lastExecutionTime, client).catch(() => {});
        }

        // Wrap reply and followUp to clear cooldown on error response
        const originalReply = interaction.reply;
        const originalFollowUp = interaction.followUp;
        const originalEditReply = interaction.editReply;

        const injectPromo = (options) => {
            if (interaction.promoInjected) return options;
            interaction.promoInjected = true;

            const rand = Math.random();
            let promoText = '';

            if (isGuildPrem) {
                if (rand < 0.015) {
                    promoText = getRandomDashboardTip();
                }
            } else {
                if (rand < 0.01) {
                    promoText = getRandomPromoTip();
                } else if (rand < 0.025) {
                    promoText = getRandomDashboardTip();
                }
            }
            
            const announcePrefix = announcementText ? `📢 **Announcement:** ${announcementText}\n\n` : '';

            if (typeof options === 'string') {
                if (options.startsWith('❌') || options.startsWith('⚠️')) return options;
                return announcePrefix + options + (promoText ? `\n\n*${promoText}*` : '');
            } else if (options && typeof options === 'object') {
                let content = options.content || '';
                if (content.startsWith('❌') || content.startsWith('⚠️')) return options;
                
                if (options.embeds && options.embeds.length > 0) {
                    if (announcePrefix) {
                        options.content = announcePrefix + content;
                    }
                    const embed = options.embeds[0];
                    if (promoText) {
                        if (embed && typeof embed.setFooter === 'function') {
                            try {
                                const currentFooter = embed.data?.footer?.text;
                                if (!currentFooter || !currentFooter.includes(promoText)) {
                                    const footerText = currentFooter ? `${currentFooter} | ${promoText}` : promoText;
                                    embed.setFooter({ text: footerText, iconURL: embed.data?.footer?.icon_url });
                                }
                            } catch (e) {}
                        } else if (embed && typeof embed === 'object') {
                            const currentFooter = embed.footer?.text;
                            if (!currentFooter || !currentFooter.includes(promoText)) {
                                embed.footer = {
                                    text: currentFooter ? `${currentFooter} | ${promoText}` : promoText,
                                    icon_url: embed.footer?.icon_url
                                };
                            }
                        }
                    }
                } else {
                    if (announcePrefix || promoText) {
                        options.content = announcePrefix + content + (promoText ? `\n\n*${promoText}*` : '');
                    }
                }
            }
            return options;
        };

        const checkAndClearCooldown = (options) => {
            let content = '';
            let embedDesc = '';
            if (typeof options === 'string') {
                content = options;
            } else if (options) {
                content = options.content || '';
                if (options.embeds && options.embeds.length > 0) {
                    const embed = options.embeds[0];
                    embedDesc = embed.description || (typeof embed.data === 'object' ? embed.data.description : '') || '';
                }
            }
            if (
                content.startsWith('❌') || content.startsWith('⚠️') ||
                embedDesc.startsWith('❌') || embedDesc.startsWith('⚠️')
            ) {
                timestamps.delete(interaction.user.id);
            }
        };

        interaction.reply = async function (options, ...args) {
            checkAndClearCooldown(options);
            options = injectPromo(options);
            return originalReply.apply(this, [options, ...args]);
        };

        interaction.followUp = async function (options, ...args) {
            checkAndClearCooldown(options);
            options = injectPromo(options);
            return originalFollowUp.apply(this, [options, ...args]);
        };

        interaction.editReply = async function (options, ...args) {
            options = injectPromo(options);
            return originalEditReply.apply(this, [options, ...args]);
        };

        // --- Execute command ---
        try {
            await command.execute(interaction);
            const { checkAndPromptPreReleaseBadge } = require('../utils/preReleaseBadge');
            await checkAndPromptPreReleaseBadge(client, interaction.user, interaction);
        } catch (error) {
            timestamps.delete(interaction.user.id); // Clear cooldown on command error
            console.error(`[interactionCreate] Error in ${fullCommandPath}:`, error);
            const msg = { content: '❌ An error occurred while executing that command.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg).catch(() => {});
            } else {
                await interaction.reply(msg).catch(() => {});
            }
        }
    },
};

async function handleTicketCreate(interaction, client) {
    const { MessageFlags } = require('discord.js');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const { guild, user } = interaction;
    const GuildSettings = require('../models/guildSettingsSchema');
    const Ticket = require('../models/ticketSchema');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

    const settings = await GuildSettings.findOne({ guildId: guild.id });
    if (!settings || !settings.tickets || !settings.tickets.enabled) {
        return interaction.editReply({ content: '❌ The ticket system is currently disabled on this server.' });
    }

    // Check if user already has an open ticket
    const existingTicket = await Ticket.findOne({ guildId: guild.id, userId: user.id, status: 'open' });
    if (existingTicket) {
        // Double check if the channel still exists in Discord
        const chan = guild.channels.cache.get(existingTicket.channelId);
        if (chan) {
            return interaction.editReply({ content: `❌ You already have an open ticket: <#${existingTicket.channelId}>.` });
        } else {
            // Channel was deleted manually, close in DB
            existingTicket.status = 'closed';
            existingTicket.closedAt = new Date();
            existingTicket.closedBy = client.user.id;
            await existingTicket.save();
        }
    }

    // Increment ticket number
    settings.tickets.lastTicketNumber = (settings.tickets.lastTicketNumber || 0) + 1;
    await settings.save();

    const ticketNumberFormatted = String(settings.tickets.lastTicketNumber).padStart(4, '0');
    const channelName = `ticket-${ticketNumberFormatted}`;

    const permissionOverwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        {
            id: user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory]
        },
        {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
    ];

    if (settings.tickets.staffRoleId) {
        permissionOverwrites.push({
            id: settings.tickets.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory]
        });
    }

    try {
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: settings.tickets.categoryId || null,
            permissionOverwrites
        });

        const ticket = new Ticket({
            guildId: guild.id,
            ticketNumber: settings.tickets.lastTicketNumber,
            userId: user.id,
            channelId: ticketChannel.id,
            status: 'open',
            topic: 'General Support'
        });
        await ticket.save();

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`🎫 Ticket #${ticketNumberFormatted}`)
            .setDescription(`Welcome <@${user.id}>!\n\nThank you for reaching out to support. Please describe your issue or question in detail here. A staff member will assist you shortly.\n\nTo close this ticket, click the button below or type \`-ticket close\`.`)
            .setTimestamp();

        const closeBtn = new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const row = new ActionRowBuilder().addComponents(closeBtn);

        await ticketChannel.send({
            content: `<@${user.id}>${settings.tickets.staffRoleId ? ` <@&${settings.tickets.staffRoleId}>` : ''}`,
            embeds: [welcomeEmbed],
            components: [row]
        });

        await interaction.editReply({ content: `✅ Ticket created successfully! Go to <#${ticketChannel.id}>.` });

    } catch (err) {
        console.error('Failed to create ticket channel:', err);
        await interaction.editReply({ content: '❌ Failed to create ticket channel. Please check bot permissions.' });
    }
}

async function handleTicketClose(interaction, client) {
    await interaction.deferReply();
    const { closeTicket } = require('../utils/ticketEngine');
    await closeTicket({
        guild: interaction.guild,
        channel: interaction.channel,
        member: interaction.member,
        user: interaction.user,
        client,
        replyFn: async (msg) => {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(msg).catch(() => {});
            } else {
                await interaction.reply(msg).catch(() => {});
            }
        }
    });
}

async function handleBaubleRainGrab(interaction, client, rainId) {
    if (!client.activeBaubleRains) {
        client.activeBaubleRains = new Map();
    }
    const activeRain = client.activeBaubleRains.get(rainId);
    if (!activeRain) {
        return interaction.reply({ content: '❌ This bauble rain has expired or already ended.', flags: MessageFlags.Ephemeral });
    }

    if (interaction.user.id === activeRain.senderId) {
        return interaction.reply({ content: '❌ You cannot grab your own Bauble Rain!', flags: MessageFlags.Ephemeral });
    }

    if (activeRain.claimedBy.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ You have already grabbed a slice of this Bauble Rain!', flags: MessageFlags.Ephemeral });
    }

    if (activeRain.slices.length === 0) {
        return interaction.reply({ content: '❌ All slices of this Bauble Rain have been claimed!', flags: MessageFlags.Ephemeral });
    }

    // Shift slice synchronously to prevent double-claiming
    const claimAmount = activeRain.slices.shift();
    activeRain.claimedBy.add(interaction.user.id);
    activeRain.claims.push({ userId: interaction.user.id, amount: claimAmount });

    // Acknowledge interaction first so Discord doesn't timeout
    await interaction.reply({ content: `🎉 **Grabbed!** You snatched a rain droplet containing **${claimAmount.toLocaleString()}** Glimmering Baubles!`, flags: MessageFlags.Ephemeral });

    try {
        // Update database
        const Bauble = require('../models/baubleSchema');
        let userProfile = await Bauble.findOne({ userId: interaction.user.id });
        if (!userProfile) {
            userProfile = await Bauble.create({ userId: interaction.user.id, baubles: 0 });
        }
        userProfile.baubles = (userProfile.baubles || 0) + claimAmount;
        await userProfile.save();

        // Update the embed
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
        const originalEmbed = interaction.message.embeds[0];
        
        const remainingClaims = activeRain.slices.length;
        const embedBuilder = EmbedBuilder.from(originalEmbed)
            .setFooter({ text: `Claims remaining: ${remainingClaims}` });

        // Update/create fields
        const fields = [
            { name: '☁️ Cloud Size', value: `**${activeRain.totalAmount.toLocaleString()}** Baubles`, inline: true },
            { name: '👥 Claims Available', value: `${remainingClaims} slots remaining`, inline: true }
        ];

        // Add claim list if any claims have happened
        if (activeRain.claims.length > 0) {
            const claimsList = activeRain.claims.map(c => `<@${c.userId}> grabbed **${c.amount.toLocaleString()}** Baubles`).join('\n');
            fields.push({ name: '🎯 Grabbed Slices', value: claimsList });
        }

        embedBuilder.setFields(fields);

        if (remainingClaims === 0) {
            // Clear timeout
            if (activeRain.timeout) {
                clearTimeout(activeRain.timeout);
            }
            client.activeBaubleRains.delete(rainId);

            embedBuilder.setColor(0x2ECC71)
                .setTitle('☁️ BAUBLE RAIN COMPLETED!')
                .setDescription(`The rain cloud has fully condensed. **${activeRain.claims.length}** players grabbed slices!`);

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`bauble_rain_grab_${rainId}`)
                    .setLabel('Claimed / Ended')
                    .setStyle(2) // Secondary
                    .setDisabled(true)
            );

            await activeRain.message.edit({ embeds: [embedBuilder], components: [disabledRow] }).catch(() => {});
        } else {
            await activeRain.message.edit({ embeds: [embedBuilder] }).catch(() => {});
        }
    } catch (e) {
        console.error('Error in handleBaubleRainGrab:', e);
    }
}
