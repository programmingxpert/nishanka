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
        .setDescription('Rob another player')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Target player')
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
    const robberId = robberUser.id;
    const targetId = targetUser.id;

    if (robberId === targetId) {
        const msg = '❌ You cannot rob yourself. Try locking your keys inside your house instead!';
        return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
    }
    if (targetUser.bot) {
        const msg = '❌ Bots do not carry wallets. Robbing them only nets you electric shocks!';
        return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
    }

    try {
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

        const now = Date.now();

        // Status effect checks for Robber
        if (robberData.blindedExpiresAt && now < new Date(robberData.blindedExpiresAt).getTime()) {
            const left = Math.ceil((new Date(robberData.blindedExpiresAt).getTime() - now) / 1000);
            const msg = `❌ You are blinded! You cannot execute a heist when you cannot see. Wait **${left}s**!`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (robberData.itemLockoutExpiresAt && now < new Date(robberData.itemLockoutExpiresAt).getTime()) {
            const left = Math.ceil((new Date(robberData.itemLockoutExpiresAt).getTime() - now) / 1000);
            const msg = `❌ You are paralyzed by electric shock! Wait **${left}s** to recover.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (robberData.beamedExpiresAt && now < new Date(robberData.beamedExpiresAt).getTime()) {
            const left = Math.ceil((new Date(robberData.beamedExpiresAt).getTime() - now) / 1000);
            const msg = `❌ You have been beamed up by aliens! You are floating in space for another **${left}s**!`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (robberData.padlockedExpiresAt && now < new Date(robberData.padlockedExpiresAt).getTime()) {
            const left = Math.ceil((new Date(robberData.padlockedExpiresAt).getTime() - now) / 1000);
            const msg = `❌ You are padlocked inside your own vault! You cannot sneak out to rob others. Wait **${left}s**!`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (robberData.invisibilityExpiresAt && now < new Date(robberData.invisibilityExpiresAt).getTime()) {
            const left = Math.ceil((new Date(robberData.invisibilityExpiresAt).getTime() - now) / 1000);
            const msg = `❌ You cannot sneak up on anyone while invisible! Wait **${left}s** for the invisibility to fade.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }

        // Status effect checks for Target
        if (targetData.invisibilityExpiresAt && now < new Date(targetData.invisibilityExpiresAt).getTime()) {
            const msg = `❌ **${targetUser.username}** is currently invisible in the shadow realm! Your hands swing right through their shadow.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (targetData.shieldExpiresAt && now < new Date(targetData.shieldExpiresAt).getTime()) {
            const msg = `🛡️ **${targetUser.username}** is shielded by a **Cardboard Aegis Shield**! You cannot break through their defenses.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }
        if (targetData.padlockedExpiresAt && now < new Date(targetData.padlockedExpiresAt).getTime()) {
            const msg = `🛡️ **${targetUser.username}** is locked inside a vault with a padlock! You cannot bypass their lock.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }

        // Cooldown checks
        let currentCooldown = BASE_COOLDOWN_MS;
        if (robberData.coffeeExpiresAt && now < new Date(robberData.coffeeExpiresAt).getTime()) {
            currentCooldown = BASE_COOLDOWN_MS / 2;
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
                `🍀 **Lucky Clover Buff:** ${cloverActive ? '🟢 **ACTIVE** (Slower QTE Reaction Timers!)' : '🔴 **INACTIVE**'}\n` +
                `👛 **Target Wallet:** **${targetData.baubles.toLocaleString()}** Baubles`
            )
            .addFields(
                { name: '🥷  Stealthy Pickpocket', value: `*Difficulty:* Easy (1-Stage QTE) | *Steals:* 5-10% wallet | *Fine:* 5% wallet`, inline: false },
                { name: '💰  Smash & Grab', value: `*Difficulty:* Medium (2-Stage HP + Grab) | *Steals:* 10-20% wallet | *Fine:* 12% wallet`, inline: false },
                { name: '🏦  High-Stakes Heist', value: `*Difficulty:* Hard (3-Stage Sequence/Laser/Puzzle) | *Steals:* 25-40% wallet | *Fine:* 25% wallet`, inline: false }
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
            setupMsg = await interaction.reply({ embeds: [setupEmbed], components: [btnRow], withResponse: true });
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

    // 1. Initial State Save & Cooldown Write
    let robberData = await Bauble.findOne({ userId: robberId });
    let targetData = await Bauble.findOne({ userId: targetId });

    if (!robberData || !targetData) return;

    // Apply cooldown and save immediately to prevent exploit exit triggers
    robberData.robLastAttemptedAt = new Date();
    await robberData.save();

    // Helper function to resolve robbery outcome as failure
    async function handleFailure(reasonText, customTitle = '🚨  CAUGHT RED-HANDED!') {
        // Refetch to prevent race conditions during long minigames
        robberData = await Bauble.findOne({ userId: robberId });
        targetData = await Bauble.findOne({ userId: targetId });

        let fine = Math.floor(robberData.baubles * strategy.finePercent);
        fine = Math.min(fine, FINE_CAP);
        fine = Math.min(robberData.baubles, fine);

        robberData.baubles -= fine;
        targetData.baubles += fine;

        await robberData.save();
        await targetData.save();

        const failEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(customTitle)
            .setDescription(`${reasonText}\n\n**${robberUser.username}** failed their robbery against **${targetUser.username}**! 👮‍♂️⚖️`)
            .addFields(
                { name: '🥷 Robber', value: `<@${robberId}>`, inline: true },
                { name: '👤 Victim', value: `<@${targetId}>`, inline: true },
                { name: '⚖️ Court Fine Paid', value: `\`-${fine.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Your New Balance', value: `\`${robberData.baubles.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Target Balance', value: `\`${targetData.baubles.toLocaleString()}\` Baubles`, inline: true }
            )
            .setTimestamp();

        if (initialMsg) {
            await initialMsg.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        } else {
            if (isSlash) {
                await interaction.reply({ embeds: [failEmbed] }).catch(() => {});
            } else {
                await message.reply({ embeds: [failEmbed] }).catch(() => {});
            }
        }
    }

    // Helper function to resolve robbery outcome as success
    async function handleSuccess() {
        robberData = await Bauble.findOne({ userId: robberId });
        targetData = await Bauble.findOne({ userId: targetId });

        const stealPercent = Math.random() * (strategy.maxSteal - strategy.minSteal) + strategy.minSteal;
        let stolen = Math.floor(targetData.baubles * stealPercent);
        stolen = Math.min(stolen, STOLEN_CAP);
        stolen = Math.min(targetData.baubles, stolen);

        targetData.baubles -= stolen;
        robberData.baubles += stolen;

        await robberData.save();
        await targetData.save();

        const successEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🎉  SUCCESSFUL ROBBERY!')
            .setDescription(`**${robberUser.username}** successfully pulled off a **${strategy.name}** against **${targetUser.username}**! 🏦💸`)
            .addFields(
                { name: '🥷 Robber', value: `<@${robberId}>`, inline: true },
                { name: '👤 Victim', value: `<@${targetId}>`, inline: true },
                { name: '💰 Baubles Stolen', value: `**+${stolen.toLocaleString()}** Baubles`, inline: true },
                { name: '👛 Your Balance', value: `\`${robberData.baubles.toLocaleString()}\` Baubles`, inline: true },
                { name: '👛 Target Balance', value: `\`${targetData.baubles.toLocaleString()}\` Baubles`, inline: true }
            )
            .setTimestamp();

        if (initialMsg) {
            await initialMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
        } else {
            if (isSlash) {
                await interaction.reply({ embeds: [successEmbed] }).catch(() => {});
            } else {
                await message.reply({ embeds: [successEmbed] }).catch(() => {});
            }
        }
    }

    // Helper for editing current message safely
    async function updateMsg(embed, row) {
        if (initialMsg) {
            await initialMsg.edit({ embeds: [embed], components: row ? [row] : [] });
        } else {
            if (isSlash) {
                if (!interaction.replied && !interaction.deferred) {
                    initialMsg = await interaction.reply({ embeds: [embed], components: row ? [row] : [], withResponse: true });
                } else {
                    initialMsg = await interaction.followUp({ embeds: [embed], components: row ? [row] : [], withResponse: true });
                }
            } else {
                initialMsg = await message.reply({ embeds: [embed], components: row ? [row] : [] });
            }
        }
    }

    // --- GAME EXECUTION STATES ---

    if (strategy.id === 'stealth') {
        // --- Stealthy Pickpocket (Reaction speed) ---
        const waitTime = Math.floor(Math.random() * 2000) + 1500; // 1.5 - 3.5s
        
        const waitingEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🥷  STEALTHY PICKPOCKET')
            .setDescription(`Scanning <@${targetId}>'s pockets...\n\n*Wait for the right moment to strike!* ⏳`)
            .setTimestamp();
        
        await updateMsg(waitingEmbed, null);

        await new Promise(r => setTimeout(r, waitTime));

        const options = [
            { id: 'stealth_air1', label: '💨 Pocket Lint', emoji: '💨', style: ButtonStyle.Secondary },
            { id: 'stealth_wallet', label: '👛 Wallet', emoji: '👛', style: ButtonStyle.Primary },
            { id: 'stealth_air2', label: '💨 Keys', emoji: '💨', style: ButtonStyle.Secondary }
        ];
        options.sort(() => Math.random() - 0.5);

        const row = new ActionRowBuilder().addComponents(
            options.map(opt => new ButtonBuilder().setCustomId(opt.id).setLabel(opt.label).setEmoji(opt.emoji).setStyle(opt.style))
        );

        const playEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('👀  OPPORTUNITY!')
            .setDescription(`**THE TARGET LOOKED AWAY! GRAB THE WALLET NOW!** 👛⚡`)
            .setTimestamp();

        await updateMsg(playEmbed, row);

        const timeLimit = cloverActive ? 3500 : 2000; // Lucky clover adds 1.5 seconds

        try {
            const btnClick = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === robberId && i.customId.startsWith('stealth_'),
                componentType: ComponentType.Button,
                time: timeLimit
            });

            await btnClick.deferUpdate();

            if (btnClick.customId === 'stealth_wallet') {
                return await handleSuccess();
            } else {
                return await handleFailure('❌ **Wrong item!** You grabbed keys and made noise, alerting the target!', '🚨  CAUGHT RED-HANDED!');
            }

        } catch (err) {
            return await handleFailure('⏰ **Too slow!** You hesitated and the target noticed you looking in their pockets.', '🚨  CAUGHT RED-HANDED!');
        }

    } else if (strategy.id === 'smash') {
        // --- Smash & Grab (Brute HP speed click + Quick Select) ---
        
        // Stage 1: Smash the display case
        let glassHp = 3;
        const stage1Embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🔨  SMASH THE GLASS')
            .setDescription(`Click the **Smash** button **3 times** before the alarm sounds! ⏰\n\n**Glass Integrity:** 🟥🟥🟥 (3/3 HP)`)
            .setTimestamp();

        const smashBtn = new ButtonBuilder().setCustomId('smash_click').setLabel('Smash! 🔨').setStyle(ButtonStyle.Danger);
        let row = new ActionRowBuilder().addComponents(smashBtn);

        await updateMsg(stage1Embed, row);

        let stage1Succeeded = false;
        const endTime = Date.now() + 5000; // 5 seconds total

        while (Date.now() < endTime && glassHp > 0) {
            const timeLeft = endTime - Date.now();
            if (timeLeft <= 0) break;

            try {
                const btnClick = await initialMsg.awaitMessageComponent({
                    filter: i => i.user.id === robberId && i.customId === 'smash_click',
                    componentType: ComponentType.Button,
                    time: timeLeft
                });

                await btnClick.deferUpdate();
                glassHp--;

                if (glassHp <= 0) {
                    stage1Succeeded = true;
                    break;
                }

                const hpIcons = '🟥'.repeat(glassHp) + '⬛'.repeat(3 - glassHp);
                const progressEmbed = new EmbedBuilder()
                    .setColor(0xE67E22)
                    .setTitle('🔨  SMASH THE GLASS')
                    .setDescription(`Keep smashing! 🔨\n\n**Glass Integrity:** ${hpIcons} (${glassHp}/3 HP)`)
                    .setTimestamp();

                await updateMsg(progressEmbed, row);

            } catch (err) {
                break;
            }
        }

        if (!stage1Succeeded) {
            return await handleFailure('❌ **Time ran out!** You failed to break the glass display case before guards closed in.', '🚨  CAUGHT RED-HANDED!');
        }

        // Stage 2: Grab the Gold
        const stage2Embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🚨  ALARM BLARING!')
            .setDescription(`**THE GLASS SHATTERED! Grab the Gold Nugget before guards block the exit!** 💎🏃‍♂️`)
            .setTimestamp();

        const options = [
            { id: 'smash_crate1', label: 'Crate', emoji: '📦', style: ButtonStyle.Secondary },
            { id: 'smash_crate2', label: 'Box', emoji: '📦', style: ButtonStyle.Secondary },
            { id: 'smash_gold', label: 'Gold Nugget', emoji: '💎', style: ButtonStyle.Primary },
            { id: 'smash_crate3', label: 'Trash', emoji: '🗑️', style: ButtonStyle.Secondary }
        ];
        options.sort(() => Math.random() - 0.5);

        row = new ActionRowBuilder().addComponents(
            options.map(opt => new ButtonBuilder().setCustomId(opt.id).setLabel(opt.label).setEmoji(opt.emoji).setStyle(opt.style))
        );

        await updateMsg(stage2Embed, row);

        const timeLimit = cloverActive ? 3500 : 2000; // 3.5s vs 2s

        try {
            const btnClick = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === robberId && i.customId.startsWith('smash_'),
                componentType: ComponentType.Button,
                time: timeLimit
            });

            await btnClick.deferUpdate();

            if (btnClick.customId === 'smash_gold') {
                return await handleSuccess();
            } else {
                return await handleFailure('❌ **Wrong item!** You grabbed a box of worthless files while escaping.', '🚨  CAUGHT RED-HANDED!');
            }

        } catch (err) {
            return await handleFailure('⏰ **Too slow!** Security guards blocked the exit before you could grab the gold.', '🚨  CAUGHT RED-HANDED!');
        }

    } else if (strategy.id === 'heist') {
        // --- High-Stakes Heist (3-Stage Sequence / Laser Cycle / Math combo code) ---
        
        // STAGE 1: Hotwire the security panel (Sequence button sequence)
        const panelEmbed = new EmbedBuilder()
            .setColor(0xD35400)
            .setTitle('🏦  HEIST STAGE 1: HOTWIRE PANEL')
            .setDescription(`Connect the wire terminals in the correct sequence:\n\n⚡ **RED ➔ BLUE ➔ GREEN**`)
            .setTimestamp();

        const wires = [
            { id: 'heist_red', label: 'Red Wire', emoji: '🔴', style: ButtonStyle.Danger },
            { id: 'heist_blue', label: 'Blue Wire', emoji: '🔵', style: ButtonStyle.Primary },
            { id: 'heist_green', label: 'Green Wire', emoji: '🟢', style: ButtonStyle.Success }
        ];
        wires.sort(() => Math.random() - 0.5);

        let heistRow = new ActionRowBuilder().addComponents(
            wires.map(opt => new ButtonBuilder().setCustomId(opt.id).setLabel(opt.label).setEmoji(opt.emoji).setStyle(opt.style))
        );

        await updateMsg(panelEmbed, heistRow);

        const sequence = ['heist_red', 'heist_blue', 'heist_green'];
        let seqIndex = 0;
        let stage1Succeeded = true;
        const endTime = Date.now() + 7000; // 7 seconds

        while (Date.now() < endTime && seqIndex < 3) {
            const timeLeft = endTime - Date.now();
            if (timeLeft <= 0) {
                stage1Succeeded = false;
                break;
            }

            try {
                const btnClick = await initialMsg.awaitMessageComponent({
                    filter: i => i.user.id === robberId && i.customId.startsWith('heist_'),
                    componentType: ComponentType.Button,
                    time: timeLeft
                });

                await btnClick.deferUpdate();

                if (btnClick.customId === sequence[seqIndex]) {
                    seqIndex++;
                    if (seqIndex < 3) {
                        const progressIcons = ['🔴 Red Terminal hotwired...', '🔵 Blue Terminal hotwired...', '🟢 Green Terminal hotwired!'];
                        const midEmbed = new EmbedBuilder()
                            .setColor(0xD35400)
                            .setTitle('🏦  HEIST STAGE 1: HOTWIRE PANEL')
                            .setDescription(`Terminals connected:\n${progressIcons.slice(0, seqIndex).map(s => `✅ ${s}`).join('\n')}\n\n⚡ Next terminal needed!`)
                            .setTimestamp();
                        await updateMsg(midEmbed, heistRow);
                    }
                } else {
                    stage1Succeeded = false;
                    break;
                }

            } catch (err) {
                stage1Succeeded = false;
                break;
            }
        }

        if (!stage1Succeeded) {
            return await handleFailure('❌ **Security Panel Shorted!** You clicked the wrong sequence or ran out of time.', '🚨  ALARM TRIGGERED!');
        }

        // STAGE 2: Bypass Laser Grid (Tension gate)
        const laserEmbed = new EmbedBuilder()
            .setColor(0xD35400)
            .setTitle('🏦  HEIST STAGE 2: LASER GRID')
            .setDescription(`🔴 **LASER GRID ACTIVE! Wait for the lasers to cycle off!**\n\n*Do NOT click Slip Through yet!* ⚡`)
            .setTimestamp();

        const slipBtn = new ButtonBuilder().setCustomId('heist_slip').setLabel('Slip Through! 🏃‍♂️').setStyle(ButtonStyle.Secondary).setDisabled(false);
        heistRow = new ActionRowBuilder().addComponents(slipBtn);

        await updateMsg(laserEmbed, heistRow);

        const preWaitTime = Math.floor(Math.random() * 1500) + 1500; // 1.5 - 3.0 seconds
        let clickedEarly = false;

        try {
            const earlyClick = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === robberId && i.customId === 'heist_slip',
                componentType: ComponentType.Button,
                time: preWaitTime
            });
            await earlyClick.deferUpdate();
            clickedEarly = true;
        } catch (err) {
            // Succeeded wait
        }

        if (clickedEarly) {
            return await handleFailure('❌ **Laser Grid Tripped!** You ran straight into a red security laser!', '🚨  ALARM TRIGGERED!');
        }

        // Lasers offline
        const greenEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🏦  HEIST STAGE 2: LASER GRID')
            .setDescription(`🟢 **LASERS OFFLINE! SLIP THROUGH NOW!** 🏃‍♂️💨`)
            .setTimestamp();

        slipBtn.setStyle(ButtonStyle.Success);
        heistRow = new ActionRowBuilder().addComponents(slipBtn);

        await updateMsg(greenEmbed, heistRow);

        const laserTimeLimit = cloverActive ? 2200 : 1200; // 2.2s vs 1.2s

        let stage2Succeeded = false;
        try {
            const escapeClick = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === robberId && i.customId === 'heist_slip',
                componentType: ComponentType.Button,
                time: laserTimeLimit
            });
            await escapeClick.deferUpdate();
            stage2Succeeded = true;
        } catch (err) {
            // Timeout
        }

        if (!stage2Succeeded) {
            return await handleFailure('❌ **Lasers Reactivated!** You hesitated too long and the grid turned back on.', '🚨  ALARM TRIGGERED!');
        }

        // STAGE 3: Combination Lock Encryption (Math code cracking)
        const a = Math.floor(Math.random() * 8) + 3; // 3-10
        const b = Math.floor(Math.random() * 8) + 3; // 3-10
        const answer = a * b;
        
        const choices = [answer, answer + 5, answer - 3, answer + 12];
        const uniqueChoices = [...new Set(choices)].filter(x => x >= 0);
        while (uniqueChoices.length < 4) {
            uniqueChoices.push(answer + Math.floor(Math.random() * 20) + 1);
        }
        uniqueChoices.sort(() => Math.random() - 0.5);

        const lockEmbed = new EmbedBuilder()
            .setColor(0xD35400)
            .setTitle('🏦  HEIST STAGE 3: CRACK THE VAULT COMBINATION')
            .setDescription(`🔐 Solve the mechanical gear calculation to crack the vault combo:\n\n💻 **Gear Rotation Formula:** What is **${a} × ${b}**?`)
            .setTimestamp();

        heistRow = new ActionRowBuilder().addComponents(
            uniqueChoices.map(c => new ButtonBuilder().setCustomId(`combo_${c}`).setLabel(String(c)).setStyle(ButtonStyle.Secondary))
        );

        await updateMsg(lockEmbed, heistRow);

        const comboTimeLimit = cloverActive ? 6500 : 4000; // 6.5s vs 4.0s

        try {
            const comboClick = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === robberId && i.customId.startsWith('combo_'),
                componentType: ComponentType.Button,
                time: comboTimeLimit
            });

            await comboClick.deferUpdate();

            const chosenAnswer = parseInt(comboClick.customId.split('_')[1]);
            if (chosenAnswer === answer) {
                return await handleSuccess();
            } else {
                return await handleFailure('❌ **Incorrect Combination!** The vault mechanism locked down and triggered alarms.', '🚨  VAULT LOCKDOWN!');
            }

        } catch (err) {
            return await handleFailure('⏰ **Lockdown Triggered!** You took too long to decipher the gear formula.', '🚨  VAULT LOCKDOWN!');
        }
    }
}
