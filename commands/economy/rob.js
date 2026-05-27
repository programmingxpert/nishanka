/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const STRATEGIES = {
    stealth: {
        id: 'stealth',
        name: '🥷 Stealthy Pickpocket',
        baseSuccess: 0.65,
        minSteal: 0.05,
        maxSteal: 0.10,
        finePercent: 0.05,
        description: 'High success chance (65%), but low yield (steals 5-10% wallet). 5% wallet fine if caught.'
    },
    smash: {
        id: 'smash',
        name: '💰 Smash & Grab',
        baseSuccess: 0.50,
        minSteal: 0.10,
        maxSteal: 0.20,
        finePercent: 0.12,
        description: 'Medium success chance (50%) and yield (steals 10-20% wallet). 12% wallet fine if caught.'
    },
    heist: {
        id: 'heist',
        name: '🏦 High-Stakes Heist',
        baseSuccess: 0.30,
        minSteal: 0.25,
        maxSteal: 0.40,
        finePercent: 0.25,
        description: 'Low success chance (30%), but huge yield (steals 25-40% wallet). Massive 25% wallet fine if caught.'
    }
};

const STOLEN_CAP = 50000;
const FINE_CAP = 30000;
const BASE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to rob another player using different strategies.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The player you want to rob.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        await runRob({
            interaction,
            robberUser: interaction.user,
            targetUser: target,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        if (!args[0]) {
            return message.reply('⚠️ Please mention a user to rob. Example: `-rob @someone [strategy]`');
        }

        // Parse target user from mention
        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        if (!mentionMatch) {
            return message.reply('❌ Please mention a valid user to rob.');
        }

        const targetId = mentionMatch[1];
        let targetUser;
        try {
            targetUser = await message.guild.members.fetch(targetId);
            targetUser = targetUser?.user ?? null;
        } catch {
            targetUser = null;
        }

        if (!targetUser) {
            return message.reply('❌ Could not find that user in this server.');
        }

        // Optional strategy parameter (stealth, smash, heist)
        let strategyArg = args[1]?.toLowerCase() || null;
        if (strategyArg && !STRATEGIES[strategyArg]) {
            // Check short aliases
            if (strategyArg === 'stealthy' || strategyArg === 'pickpocket') strategyArg = 'stealth';
            else if (strategyArg === 'grab') strategyArg = 'smash';
            else if (strategyArg === 'heist') strategyArg = 'heist';
            else {
                return message.reply('⚠️ Invalid robbery strategy! Choose: `stealth`, `smash`, or `heist`.');
            }
        }

        await runRob({
            message,
            robberUser: message.author,
            targetUser,
            strategyOverride: strategyArg,
            isSlash: false
        });
    }
};

async function runRob({ interaction, message, robberUser, targetUser, strategyOverride, isSlash }) {
    const channel = isSlash ? interaction.channel : message.channel;
    const robberId = robberUser.id;
    const targetId = targetUser.id;

    // 1. Pre-flight checks
    if (robberId === targetId) {
        const msg = '❌ You cannot rob yourself. Try locking your keys inside your house instead!';
        return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
    }
    if (targetUser.bot) {
        const msg = '❌ Bots do not carry wallets. Robbing them only nets you electric shocks!';
        return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
    }

    try {
        // Fetch/create robber and target profiles
        let robberData = await Bauble.findOne({ userId: robberId });
        if (!robberData) {
            robberData = new Bauble({ userId: robberId, baubles: 0 });
            await robberData.save();
        }

        let targetData = await Bauble.findOne({ userId: targetId });
        if (!targetData) {
            targetData = new Bauble({ userId: targetId, baubles: 0 });
            await targetData.save();
        }

        // Balance requirements
        if (robberData.baubles < 1000) {
            const msg = `❌ You need at least **1,000 Baubles** in your wallet to cover potential caught fines before attempting a robbery!`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (targetData.baubles < 1000) {
            const msg = `❌ **${targetUser.username}** has less than **1,000 Baubles** in their wallet. Show some class and leave them alone!`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }

        // Passive Mode checks
        if (robberData.passiveMode) {
            const msg = `❌ You cannot rob other players while you are in Passive Mode! Disable it first using \`/passive\`.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (targetData.passiveMode) {
            const msg = `🛡️ **${targetUser.username}** is in Passive Mode! You cannot rob players who are playing peacefully.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }

        // Cooldown checks
        const now = Date.now();
        let currentCooldown = BASE_COOLDOWN_MS;
        if (robberData.coffeeExpiresAt && now < new Date(robberData.coffeeExpiresAt).getTime()) {
            currentCooldown = BASE_COOLDOWN_MS / 2; // Coffee reduces cooldown by 50%
        }

        if (robberData.robLastAttemptedAt) {
            const timePassed = now - new Date(robberData.robLastAttemptedAt).getTime();
            if (timePassed < currentCooldown) {
                const timeLeft = currentCooldown - timePassed;
                const msg = `⏰ You need to plan your next job! You can attempt another robbery in **${formatTimeRemaining(timeLeft)}**.`;
                return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
            }
        }

        // 2. Safe Padlock Check
        const padlockIndex = targetData.inventory ? targetData.inventory.findIndex(item => item.itemId === 'padlock' && item.quantity > 0) : -1;
        if (padlockIndex !== -1) {
            // Consume padlock
            targetData.inventory[padlockIndex].quantity -= 1;
            if (targetData.inventory[padlockIndex].quantity <= 0) {
                targetData.inventory.splice(padlockIndex, 1);
            }
            targetData.markModified('inventory');

            // Apply fine to robber
            const fine = Math.min(robberData.baubles, Math.max(2500, Math.floor(robberData.baubles * 0.15)));
            const finalFine = Math.min(fine, 15000); // Padlock fine capped at 15k

            robberData.baubles -= finalFine;
            targetData.baubles += finalFine;
            robberData.robLastAttemptedAt = new Date();

            await robberData.save();
            await targetData.save();

            const padlockEmbed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🔒  ROBBERY DEFLECTED!')
                .setDescription(`<@${robberId}> tried to break in and rob <@${targetId}>, but they ran straight into a **Safe Padlock**! 🔔\n\nThe padlock triggered alarms, protecting their wallet, but was destroyed in the process.`)
                .addFields(
                    { name: '🚨 Fine Paid', value: `\`-${finalFine} Baubles\``, inline: true },
                    { name: '👛 Target Compensated', value: `\`+${finalFine} Baubles\``, inline: true },
                    { name: '👛 Your Balance', value: `\`${robberData.baubles} Baubles\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Always secure your vault with padlocks!' });

            return isSlash ? interaction.reply({ embeds: [padlockEmbed] }) : message.reply({ embeds: [padlockEmbed] });
        }

        // Active Clover buff check
        let cloverActive = false;
        if (robberData.luckExpiresAt && now < new Date(robberData.luckExpiresAt).getTime()) {
            cloverActive = true;
        }

        // 3. Resolve robbery directly if strategy override was specified
        if (strategyOverride) {
            return await executeRobberyResolution({
                interaction,
                message,
                robberUser,
                targetUser,
                strategy: STRATEGIES[strategyOverride],
                cloverActive,
                isSlash,
                initialMsg: null
            });
        }

        // 4. Interactive Setup Embed
        const setupEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🕵️‍♂️  CHOOSE YOUR ROBBERY STRATEGY')
            .setDescription(
                `You are scouting <@${targetId}>'s vault. Select a method below to initiate the job!\n\n` +
                `🍀 **Lucky Clover Buff:** ${cloverActive ? '🟢 **ACTIVE** (+10% Success Boost!)' : '🔴 **INACTIVE**'}\n` +
                `👛 **Target Wallet:** **${targetData.baubles.toLocaleString()}** Baubles`
            )
            .addFields(
                { name: '🥷  Stealthy Pickpocket', value: `*Success:* ${cloverActive ? '75%' : '65%'} | *Steals:* 5-10% wallet | *Fine:* 5% wallet`, inline: false },
                { name: '💰  Smash & Grab', value: `*Success:* ${cloverActive ? '60%' : '50%'} | *Steals:* 10-20% wallet | *Fine:* 12% wallet`, inline: false },
                { name: '🏦  High-Stakes Heist', value: `*Success:* ${cloverActive ? '40%' : '30%'} | *Steals:* 25-40% wallet | *Fine:* 25% wallet`, inline: false }
            )
            .setFooter({ text: 'Pick a strategy within 30 seconds to proceed!' })
            .setTimestamp();

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rob_btn_stealth')
                .setLabel('Stealthy Pickpocket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🥷'),
            new ButtonBuilder()
                .setCustomId('rob_btn_smash')
                .setLabel('Smash & Grab')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰'),
            new ButtonBuilder()
                .setCustomId('rob_btn_heist')
                .setLabel('High-Stakes Heist')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🏦')
        );

        let setupMsg;
        if (isSlash) {
            setupMsg = await interaction.reply({ embeds: [setupEmbed], components: [btnRow], fetchReply: true });
        } else {
            setupMsg = await message.reply({ embeds: [setupEmbed], components: [btnRow] });
        }

        const filter = i => {
            if (i.user.id !== robberId) {
                i.reply({ content: '❌ This robbery setup is not yours!', ephemeral: true });
                return false;
            }
            return true;
        };

        const collector = setupMsg.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (i) => {
            collector.stop();
            await i.deferUpdate();

            const selection = i.customId.replace('rob_btn_', '');
            const strategy = STRATEGIES[selection];

            await executeRobberyResolution({
                interaction: i,
                message,
                robberUser,
                targetUser,
                strategy,
                cloverActive,
                isSlash: true,
                initialMsg: setupMsg
            });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x747f8d)
                    .setTitle('⏰  ROBBERY TIMED OUT')
                    .setDescription('You took too long to pick a strategy. The target got away!');
                
                const disabledRow = new ActionRowBuilder().addComponents(
                    btnRow.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                );

                await setupMsg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('Error starting rob command:', error);
        const errMsg = '❌ An error occurred while planning the robbery.';
        if (isSlash) {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
            }
        } else {
            await message.reply(errMsg).catch(() => {});
        }
    }
}

async function executeRobberyResolution({ interaction, message, robberUser, targetUser, strategy, cloverActive, isSlash, initialMsg }) {
    const robberId = robberUser.id;
    const targetId = targetUser.id;

    // Refetch profiles to prevent race conditions during button click
    let robberData = await Bauble.findOne({ userId: robberId });
    let targetData = await Bauble.findOne({ userId: targetId });

    if (!robberData || !targetData) return;

    // Sanity checks (in case items changed, passive enabled, or balance dropped below 1k while selecting)
    if (robberData.baubles < 1000 || targetData.baubles < 1000 || robberData.passiveMode || targetData.passiveMode) {
        const cancelEmbed = new EmbedBuilder()
            .setColor(0xff7171)
            .setTitle('❌  ROBBERY ABORTED')
            .setDescription('Conditions have changed since you started scouting. The heist has been cancelled.');

        if (initialMsg) {
            return await initialMsg.edit({ embeds: [cancelEmbed], components: [] });
        } else {
            return isSlash ? interaction.reply({ embeds: [cancelEmbed] }) : message.reply({ embeds: [cancelEmbed] });
        }
    }

    // Check padlock defense again (prevent bypass race conditions)
    const padlockIndex = targetData.inventory ? targetData.inventory.findIndex(item => item.itemId === 'padlock' && item.quantity > 0) : -1;
    if (padlockIndex !== -1) {
        targetData.inventory[padlockIndex].quantity -= 1;
        if (targetData.inventory[padlockIndex].quantity <= 0) {
            targetData.inventory.splice(padlockIndex, 1);
        }
        targetData.markModified('inventory');

        const fine = Math.min(robberData.baubles, Math.max(2500, Math.floor(robberData.baubles * 0.15)));
        const finalFine = Math.min(fine, 15000);

        robberData.baubles -= finalFine;
        targetData.baubles += finalFine;
        robberData.robLastAttemptedAt = new Date();

        await robberData.save();
        await targetData.save();

        const padlockEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🔒  ROBBERY DEFLECTED!')
            .setDescription(`<@${robberId}> tried to rob <@${targetId}>, but they ran straight into a **Safe Padlock**! 🔔\n\nThe padlock triggered alarms, protecting their wallet, but was destroyed in the process.`)
            .addFields(
                { name: '🚨 Fine Paid', value: `\`-${finalFine} Baubles\``, inline: true },
                { name: '👛 Target Compensated', value: `\`+${finalFine} Baubles\``, inline: true },
                { name: '👛 Your Balance', value: `\`${robberData.baubles} Baubles\``, inline: true }
            )
            .setTimestamp();

        if (initialMsg) {
            return await initialMsg.edit({ embeds: [padlockEmbed], components: [] });
        } else {
            return isSlash ? interaction.reply({ embeds: [padlockEmbed] }) : message.reply({ embeds: [padlockEmbed] });
        }
    }

    // Calculate outcomes
    const rand = Math.random();
    let successChance = strategy.baseSuccess;
    if (cloverActive) {
        successChance += 0.10; // Boost rate by +10%
    }

    const isSuccess = rand < successChance;
    robberData.robLastAttemptedAt = new Date();

    const resultEmbed = new EmbedBuilder().setTimestamp();

    if (isSuccess) {
        // Calculate stolen amount
        const stealPercent = Math.random() * (strategy.maxSteal - strategy.minSteal) + strategy.minSteal;
        let stolen = Math.floor(targetData.baubles * stealPercent);
        stolen = Math.min(stolen, STOLEN_CAP); // Cap theft at 50k

        targetData.baubles -= stolen;
        robberData.baubles += stolen;

        await robberData.save();
        await targetData.save();

        resultEmbed
            .setColor(0x2ECC71) // Emerald Green
            .setTitle('🎉  SUCCESSFUL ROBBERY!')
            .setDescription(`**${robberUser.username}** successfully pulled off a **${strategy.name}** against **${targetUser.username}**! 🏦💸`)
            .addFields(
                { name: '🥷 Robber', value: `<@${robberId}>`, inline: true },
                { name: '👤 Victim', value: `<@${targetId}>`, inline: true },
                { name: '💰 Baubles Stolen', value: `**+${stolen.toLocaleString()}** Baubles`, inline: true },
                { name: '👛 Your New Balance', value: `\`${robberData.baubles.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Target New Balance', value: `\`${targetData.baubles.toLocaleString()}\` Baubles`, inline: true }
            )
            .setFooter({ text: 'Nice loot! Don\'t get caught next time. 😎' });
    } else {
        // Calculate fine
        let fine = Math.floor(robberData.baubles * strategy.finePercent);
        fine = Math.min(fine, FINE_CAP); // Cap fine at 30k

        robberData.baubles -= fine;
        targetData.baubles += fine;

        await robberData.save();
        await targetData.save();

        resultEmbed
            .setColor(0xE74C3C) // Alizarin Red
            .setTitle('🚨  CAUGHT RED-HANDED!')
            .setDescription(`**${robberUser.username}** failed their **${strategy.name}** against **${targetUser.username}** and was caught by server guards! 👮‍♂️⚖️`)
            .addFields(
                { name: '🥷 Robber', value: `<@${robberId}>`, inline: true },
                { name: '👤 Victim', value: `<@${targetId}>`, inline: true },
                { name: '⚖️ Court Fine Paid', value: `\`-${fine.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Your New Balance', value: `\`${robberData.baubles.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Target Compensated', value: `\`+${fine.toLocaleString()}\` Baubles`, inline: true }
            )
            .setFooter({ text: 'Crime doesn\'t pay... or at least, this strategy didn\'t! 😬' });
    }

    if (initialMsg) {
        await initialMsg.edit({ embeds: [resultEmbed], components: [] });
    } else {
        if (isSlash) {
            await interaction.reply({ embeds: [resultEmbed] });
        } else {
            await message.reply({ embeds: [resultEmbed] });
        }
    }
}
