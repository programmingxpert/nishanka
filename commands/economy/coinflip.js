/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin to gamble your baubles (heads, tails, or draw).')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to gamble.')
                .setRequired(true)
                .setMinValue(200)
        )
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Choose heads, tails, or a sideways draw (optional).')
                .setRequired(false)
                .addChoices(
                    { name: 'Heads (49.95% win, 2x)', value: 'heads' },
                    { name: 'Tails (49.95% win, 2x)', value: 'tails' },
                    { name: 'Draw / Sideways (0.1% win, 2x)', value: 'draw' }
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const side = interaction.options.getString('side')?.toLowerCase() || null;

        await runCoinflip({
            userId,
            amount,
            side,
            interaction,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        
        let sideArg = (args[0] || '').toLowerCase();
        let amountArg = args[1];

        // Handle both orders: prefix <amount> <side> or prefix <side> <amount>
        if (args.length >= 2) {
            if (isNaN(parseInt(sideArg)) && !isNaN(parseInt(amountArg))) {
                // sideArg is first, amountArg is second
            } else if (!isNaN(parseInt(sideArg)) && isNaN(parseInt(amountArg))) {
                // amountArg is first, sideArg is second
                amountArg = args[0];
                sideArg = args[1] || '';
            } else {
                // Fallback: amountArg is first, sideArg is second
                amountArg = args[0];
                sideArg = args[1] || '';
            }
        } else {
            // Only 1 argument provided, must be amount
            amountArg = args[0];
            sideArg = '';
        }

        const amount = parseInt(amountArg);
        if (isNaN(amount) || amount < 200) {
            return message.reply('❌ The minimum amount to gamble is **200** Baubles.');
        }

        let side = null;
        if (sideArg) {
            let tempSide = sideArg.toLowerCase();
            if (tempSide === 'h' || tempSide === 'head') side = 'heads';
            else if (tempSide === 't' || tempSide === 'tail') side = 'tails';
            else if (tempSide === 'd' || tempSide === 'draw' || tempSide === 'side' || tempSide === 'sideways' || tempSide === 'upright') side = 'draw';
            
            if (side !== 'heads' && side !== 'tails' && side !== 'draw') {
                return message.reply('❌ Please choose a valid side: `heads`, `tails`, or `draw`.');
            }
        }

        await runCoinflip({
            userId,
            amount,
            side,
            message,
            isSlash: false
        });
    }
};

async function runCoinflip({ userId, amount, side, interaction, message, isSlash }) {
    try {
        // Find or create user bauble data
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (amount < 200) {
            const errorMsg = `❌ The minimum amount to gamble is **200** Baubles.`;
            if (isSlash) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.followUp({ content: errorMsg, ephemeral: true });
                } else {
                    return interaction.reply({ content: errorMsg, ephemeral: true });
                }
            } else {
                return message.reply(errorMsg);
            }
        }

        if (baubleData.baubles < amount) {
            const errorMsg = `❌ You only have **${baubleData.baubles}** Baubles, you cannot gamble **${amount}**.`;
            if (isSlash) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.followUp({ content: errorMsg, ephemeral: true });
                } else {
                    return interaction.reply({ content: errorMsg, ephemeral: true });
                }
            } else {
                return message.reply(errorMsg);
            }
        }

        // If side was provided upfront, run the coinflip directly (fast mode)
        if (side) {
            return await executeCoinflipFlip({ userId, amount, side, interaction, message, isSlash, baubleData });
        }

        // Otherwise, show the interactive buttons!
        const initialEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0) // Aesthetic primary purple
            .setTitle('🪙  COINFLIP CHALLENGE')
            .setDescription(`⚡ *Double or nothing!*\n\nSelect a side below to flip the coin and test your luck.`)
            .addFields(
                { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                { name: '👛 Your Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true }
            )
            .setFooter({ text: 'Payout: 2x | Draw (Sideways): 0.1% chance' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('heads')
                    .setLabel('Heads')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪙'),
                new ButtonBuilder()
                    .setCustomId('tails')
                    .setLabel('Tails')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🪙'),
                new ButtonBuilder()
                    .setCustomId('draw')
                    .setLabel('Draw (Sideways)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📐')
            );

        let initialMsg;
        if (isSlash) {
            if (interaction.deferred || interaction.replied) {
                initialMsg = await interaction.followUp({ embeds: [initialEmbed], components: [row], fetchReply: true });
            } else {
                initialMsg = await interaction.reply({ embeds: [initialEmbed], components: [row], fetchReply: true });
            }
        } else {
            initialMsg = await message.reply({ embeds: [initialEmbed], components: [row] });
        }

        const filter = i => {
            if (i.user.id !== userId) {
                i.reply({ content: '❌ This coinflip session is not for you!', ephemeral: true });
                return false;
            }
            return true;
        };

        const collector = initialMsg.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (i) => {
            collector.stop();
            await i.deferUpdate();

            const chosenSide = i.customId; // 'heads', 'tails', or 'draw'

            // Refetch baubleData to prevent race conditions
            baubleData = await Bauble.findOne({ userId });
            if (!baubleData || baubleData.baubles < amount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('❌ Bet Cancelled')
                    .setDescription(`You no longer have enough Baubles to complete this bet.`);
                await initialMsg.edit({ embeds: [errorEmbed], components: [] });
                return;
            }

            // Deduct bet amount immediately upon selecting
            baubleData.baubles -= amount;
            await baubleData.save();

            // Edit to spinning state
            const spinningEmbed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('🪙  COINFLIP')
                .setDescription(`*The coin is spinning high in the air...* 🌀\n\nYou chose **${chosenSide.toUpperCase()}**!`)
                .addFields(
                    { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                    { name: '✨ Your Choice', value: `\`${chosenSide.toUpperCase()}\``, inline: true }
                )
                .setFooter({ text: 'Flipping...' })
                .setTimestamp();

            // Disable buttons
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                );

            await initialMsg.edit({ embeds: [spinningEmbed], components: [disabledRow] });

            // Wait 1.5s for dramatic effect
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Complete the flip
            await executeCoinflipOutcome({ userId, amount, side: chosenSide, initialMsg, baubleData });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x747f8d)
                    .setTitle('⏰  COINFLIP TIMED OUT')
                    .setDescription('You did not select a side in time. Coinflip challenge cancelled.');
                
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                    );

                await initialMsg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
            }
        });

    } catch (err) {
        console.error('Error starting coinflip:', err);
    }
}

// Fast mode execute (when side is provided upfront)
async function executeCoinflipFlip({ userId, amount, side, interaction, message, isSlash, baubleData }) {
    let replyMsg;
    // Deduct bet amount immediately
    baubleData.baubles -= amount;
    await baubleData.save();

    // 1. Send the spinning/flipping embed
    const initialEmbed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🪙  COINFLIP')
        .setDescription(`*The coin is spinning high in the air...* 🌀`)
        .addFields(
            { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
            { name: '✨ Your Choice', value: `\`${side.toUpperCase()}\``, inline: true }
        )
        .setFooter({ text: 'Flipping...' });

    if (isSlash) {
        if (interaction.deferred || interaction.replied) {
            replyMsg = await interaction.followUp({ embeds: [initialEmbed], fetchReply: true });
        } else {
            replyMsg = await interaction.reply({ embeds: [initialEmbed], fetchReply: true });
        }
    } else {
        replyMsg = await message.reply({ embeds: [initialEmbed] });
    }

    // Wait 1.5 seconds for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    await executeCoinflipOutcome({ userId, amount, side, initialMsg: replyMsg, baubleData });
}

// Calculate outcome and edit the embed
async function executeCoinflipOutcome({ userId, amount, side, initialMsg, baubleData }) {
    // Determine outcome
    const rand = Math.random();
    let outcome;
    if (rand < 0.001) {
        outcome = 'draw';
    } else if (rand < 0.5005) {
        outcome = 'heads';
    } else {
        outcome = 'tails';
    }

    // Refetch/reload baubleData to prevent race conditions during the setTimeout
    baubleData = await Bauble.findOne({ userId });
    const previousStreak = baubleData.coinflipStreak || 0;

    let didWin = (side === outcome);
    let cloverUsed = false;
    if (!didWin && baubleData.luckExpiresAt && Date.now() < new Date(baubleData.luckExpiresAt).getTime()) {
        if (Math.random() < 0.20) { // 20% of losses are converted to wins (boosts overall 50% win rate to 60%)
            didWin = true;
            cloverUsed = true;
        }
    }

    let winnings = 0;
    if (didWin) {
        winnings = amount * 2;
    }

    if (didWin) {
        baubleData.baubles += winnings;
        baubleData.coinflipStreak = (baubleData.coinflipStreak || 0) + 1;
        if (baubleData.coinflipStreak > (baubleData.coinflipMaxStreak || 0)) {
            baubleData.coinflipMaxStreak = baubleData.coinflipStreak;
        }
    } else {
        baubleData.coinflipStreak = 0;
    }
    await baubleData.save();

    // Create the final embed
    const finalEmbed = new EmbedBuilder()
        .setTimestamp();

    if (didWin) {
        finalEmbed.setColor(0x2ecc71); // Aesthetic emerald green
        if (outcome === 'draw') {
            finalEmbed.setTitle('🏆  UNBELIEVABLE DRAW!')
                .setDescription(`🪙 The coin landed perfectly **sideways/upright**!\nYou guessed the **0.1% chance** draw correctly! Absolutely insane luck! 💫` + (cloverUsed ? `\n\n🍀 *Lucky Clover boost converted a loss into a win!*` : ''));
        } else {
            finalEmbed.setTitle('🎉  VICTORY!')
                .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**!\nYou guessed correctly and doubled your bet! 🌟` + (cloverUsed ? `\n\n🍀 *Lucky Clover boost converted a loss into a win!*` : ''));
        }
        finalEmbed.addFields(
            { name: '💰 Bet', value: `\`${amount} Baubles\``, inline: true },
            { name: '📈 Winnings', value: `\`+${winnings} Baubles\``, inline: true },
            { name: '🪙 New Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true },
            { name: '🔥 Win Streak', value: `\`${baubleData.coinflipStreak} wins\` (Best: \`${baubleData.coinflipMaxStreak}\`)`, inline: true }
        );
        finalEmbed.setFooter({ text: 'Luck is on your side today! ✨' });
    } else {
        finalEmbed.setColor(0xe74c3c); // Aesthetic alizarin red
        let streakLossDesc = '';
        if (previousStreak > 0) {
            streakLossDesc = `\n\n*💔 Loss ended your winning streak of **${previousStreak}** wins!*`;
        }

        if (outcome === 'draw') {
            finalEmbed.setTitle('💔  COIN STOOD UPRIGHT!')
                .setDescription(`🪙 The coin landed perfectly **sideways/upright** (0.1% chance)!\nYou guessed **${side.toUpperCase()}** and got nothing.${streakLossDesc}`);
        } else {
            finalEmbed.setTitle('💔  DEFEAT...')
                .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**.\nYou guessed **${side.toUpperCase()}** and lost your bet.${streakLossDesc}`);
        }
        finalEmbed.addFields(
            { name: '💰 Bet', value: `\`${amount} Baubles\``, inline: true },
            { name: '📉 Loss', value: `\`-${amount} Baubles\``, inline: true },
            { name: '🪙 New Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true },
            { name: '🪹 Win Streak', value: `\`0 wins\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)`, inline: true }
        );
        finalEmbed.setFooter({ text: 'Better luck next time... 🍀' });
    }

    // Create the "Play Again" button
    const playAgainRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('play_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

    // Edit message and show play again button
    await initialMsg.edit({ embeds: [finalEmbed], components: [playAgainRow] });

    // Setup collector for Play Again
    const playAgainFilter = i => {
        if (i.user.id !== userId) {
            i.reply({ content: '❌ This coinflip session is not for you!', ephemeral: true });
            return false;
        }
        return true;
    };

    const playAgainCollector = initialMsg.createMessageComponentCollector({
        filter: playAgainFilter,
        componentType: ComponentType.Button,
        time: 15000 // 15 seconds to decide to play again
    });

    playAgainCollector.on('collect', async (i) => {
        playAgainCollector.stop();
        await i.deferUpdate();

        // Disable "Play Again" button on the old message
        const disabledPlayAgain = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('play_again')
                    .setLabel('Play Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
                    .setDisabled(true)
            );
        await initialMsg.edit({ components: [disabledPlayAgain] }).catch(() => {});

        // Run coinflip again in a new embed!
        await runCoinflip({
            userId,
            amount,
            side: null,
            interaction: i,
            isSlash: true
        });
    });

    playAgainCollector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const disabledPlayAgain = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('play_again')
                        .setLabel('Play Again')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                        .setDisabled(true)
                );
            await initialMsg.edit({ components: [disabledPlayAgain] }).catch(() => {});
        }
    });
}
