/* eslint-disable */
const { Collection, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
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

        let fullCommandPath = `/${interaction.commandName}`;
        try {
            const subGroup = interaction.options.getSubcommandGroup(false);
            const subCmd = interaction.options.getSubcommand(false);
            if (subGroup) fullCommandPath += ` ${subGroup}`;
            if (subCmd) fullCommandPath += ` ${subCmd}`;
        } catch (_) {}

        if (command.category === 'admin' && interaction.user.id !== config.devId) {
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
                return interaction.reply({
                    content: `⏳ Please wait, you can use \`${fullCommandPath}\` again <t:${timestampId}:R>.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

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
                // Premium servers only get dashboard promo tips (1.5% chance)
                if (rand < 0.015) {
                    promoText = getRandomDashboardTip();
                } else {
                    return options;
                }
            } else {
                // Non-premium servers get premium promo (1%) or dashboard tips (1.5%)
                if (rand < 0.01) {
                    promoText = getRandomPromoTip();
                } else if (rand < 0.025) {
                    promoText = getRandomDashboardTip();
                } else {
                    return options;
                }
            }
            
            if (typeof options === 'string') {
                if (options.startsWith('❌') || options.startsWith('⚠️')) return options;
                return options + `\n\n*${promoText}*`;
            } else if (options && typeof options === 'object') {
                let content = options.content || '';
                if (content.startsWith('❌') || content.startsWith('⚠️')) return options;
                
                if (options.embeds && options.embeds.length > 0) {
                    const embed = options.embeds[0];
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
                } else {
                    options.content = content + `\n\n*${promoText}*`;
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
