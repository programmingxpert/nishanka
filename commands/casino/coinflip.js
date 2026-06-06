/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

module.exports = {
    category: 'casino',
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
                    { name: 'Draw / Sideways (0.1% win, 100x)', value: 'draw' }
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

        const { parseAmount } = require('../../utils/economyEngine');
        // Handle both orders: prefix <amount> <side> or prefix <side> <amount>
        if (args.length >= 2) {
            if (isNaN(parseAmount(sideArg)) && !isNaN(parseAmount(amountArg))) {
                // sideArg is first, amountArg is second
            } else if (!isNaN(parseAmount(sideArg)) && isNaN(parseAmount(amountArg))) {
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

        const amount = parseAmount(amountArg);
        if (isNaN(amount) || amount < 200) {
            return message.reply('❌ The minimum amount to gamble is **200** Baubles.');
        }

        let side = null;
        if (sideArg) {
            let tempSide = sideArg.toLowerCase();
            if (tempSide === 'h' || tempSide === 'head' || tempSide === 'heads') side = 'heads';
            else if (tempSide === 't' || tempSide === 'tail' || tempSide === 'tails') side = 'tails';
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
        // Get client reference early (interaction.client is always reliable)
        const client = isSlash ? interaction.client : message.client;
        const predeterminedOutcome = determineOutcome();

        // Register the game BEFORE sending embed so admin panel sees it immediately
        if (!client.activeCasinoGames) client.activeCasinoGames = new Map();
        const discordUser = client.users.cache.get(userId);
        client.activeCasinoGames.set(`coinflip_${userId}`, {
            userId,
            username: discordUser ? discordUser.username : `User (${userId})`,
            type: 'coinflip',
            bet: amount,
            side: null, // User has not chosen yet
            outcome: predeterminedOutcome,
            timestamp: Date.now()
        });

        const initialEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0) // Aesthetic primary purple
            .setTitle('🪙  COINFLIP CHALLENGE')
            .setDescription(`⚡ *Double or nothing!*\n\nSelect a side below to flip the coin and test your luck.`)
            .addFields(
                { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                { name: '👛 Your Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true }
            )
            .setFooter({ text: 'Payout: 2x | Draw (Sideways): 0.1% chance, 100x payout' })
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
                initialMsg = await interaction.followUp({ embeds: [initialEmbed], components: [row] });
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
                client.activeCasinoGames?.delete(`coinflip_${userId}`);
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

            // Update the registered game entry with the chosen side
            const gameObj = client.activeCasinoGames?.get(`coinflip_${userId}`);
            const outcome = gameObj ? gameObj.outcome : predeterminedOutcome;
            if (gameObj) {
                gameObj.side = chosenSide;
                client.activeCasinoGames.set(`coinflip_${userId}`, gameObj);
            }

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
            await executeCoinflipOutcome({ userId, amount, side: chosenSide, initialMsg, baubleData, outcome });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                if (client && client.activeCasinoGames) {
                    client.activeCasinoGames.delete(`coinflip_${userId}`);
                }
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

function determineOutcome() {
    const rand = Math.random();
    if (rand < 0.001) {
        return 'draw';
    } else if (rand < 0.5005) {
        return 'heads';
    } else {
        return 'tails';
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
            replyMsg = await interaction.followUp({ embeds: [initialEmbed], withResponse: true });
        } else {
            replyMsg = await interaction.reply({ embeds: [initialEmbed], withResponse: true });
        }
    } else {
        replyMsg = await message.reply({ embeds: [initialEmbed] });
    }

    const outcome = determineOutcome();
    const client = replyMsg.client || (replyMsg.channel && replyMsg.channel.client);
    if (client) {
        if (!client.activeCasinoGames) {
            client.activeCasinoGames = new Map();
        }
        const discordUser = client.users.cache.get(userId);
        client.activeCasinoGames.set(`coinflip_${userId}`, {
            userId,
            username: discordUser ? discordUser.username : `User (${userId})`,
            type: 'coinflip',
            bet: amount,
            side: side,
            outcome: outcome,
            timestamp: Date.now()
        });
    }

    // Wait 1.5 seconds for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    await executeCoinflipOutcome({ userId, amount, side, initialMsg: replyMsg, baubleData, outcome });
}

// Calculate outcome and edit the embed
async function executeCoinflipOutcome({ userId, amount, side, initialMsg, baubleData, outcome }) {
    const client = initialMsg.client || (initialMsg.channel && initialMsg.channel.client);
    if (client && client.activeCasinoGames) {
        client.activeCasinoGames.delete(`coinflip_${userId}`);
    }

    // Determine outcome fallback
    if (!outcome) {
        outcome = determineOutcome();
    }

    // Refetch/reload baubleData to prevent race conditions during the setTimeout
    baubleData = await Bauble.findOne({ userId });
    const previousStreak = baubleData.coinflipStreak || 0;

    let didWin = (side === outcome);
    let cloverUsed = false;
    let rabbitUsed = false;
    let luckPenaltyActive = false;

    const now = Date.now();
    // 1. Luck penalty (-15%): converts 30% of wins into losses (making overall rate 35%)
    if (baubleData.luckPenaltyExpiresAt && now < new Date(baubleData.luckPenaltyExpiresAt).getTime()) {
        luckPenaltyActive = true;
        if (didWin && Math.random() < 0.30) {
            didWin = false;
        }
    }

    // 2. Good luck boost: clover (+10% win rate -> convert 20% of losses to wins) or rabbit's foot (+15% win rate -> convert 30% of losses to wins)
    if (!didWin && baubleData.luckExpiresAt && now < new Date(baubleData.luckExpiresAt).getTime()) {
        const luckTime = new Date(baubleData.luckExpiresAt).getTime();
        const isRabbit = (luckTime % 10 === 5);
        if (isRabbit) {
            if (Math.random() < 0.30) {
                didWin = true;
                rabbitUsed = true;
            }
        } else {
            if (Math.random() < 0.20) {
                didWin = true;
                cloverUsed = true;
            }
        }
    }

    let winnings = 0;
    if (didWin) {
        winnings = amount * (outcome === 'draw' ? 100 : 2);
    }

    const previousLossStreak = baubleData.coinflipLossStreak || 0;
    baubleData.coinflipPlayed = (baubleData.coinflipPlayed || 0) + 1;

    if (didWin) {
        baubleData.baubles += winnings;
        baubleData.coinflipWins = (baubleData.coinflipWins || 0) + 1;
        baubleData.coinflipStreak = (baubleData.coinflipStreak || 0) + 1;
        if (baubleData.coinflipStreak > (baubleData.coinflipMaxStreak || 0)) {
            baubleData.coinflipMaxStreak = baubleData.coinflipStreak;
        }
        baubleData.coinflipLossStreak = 0; // reset loss streak on win

        // Jack of All Trades: track today's wins across games
        const todayStr = new Date().toISOString().slice(0, 10);
        if (baubleData.jackOfAllTradesDate !== todayStr) {
            baubleData.jackOfAllTradesDate = todayStr;
            baubleData.jackOfAllTradesWins = [];
        }
        if (!baubleData.jackOfAllTradesWins.includes('coinflip')) {
            baubleData.jackOfAllTradesWins.push('coinflip');
        }
        
        const client = initialMsg.client || (initialMsg.channel && initialMsg.channel.client);
        if (client) {
            const balanceBefore = baubleData.baubles - winnings + amount; // balance before bet was placed

            if (baubleData.coinflipStreak >= 10) {
                await checkAndAwardAchievement(client, userId, 'coinflip_streak_10', initialMsg);
            }
            if (baubleData.coinflipStreak >= 15) {
                await checkAndAwardAchievement(client, userId, 'coinflip_streak_15', initialMsg);
            }
            if (baubleData.coinflipStreak >= 20) {
                await checkAndAwardAchievement(client, userId, 'coinflip_streak_20', initialMsg);
            }
            if (baubleData.coinflipStreak >= 25) {
                await checkAndAwardAchievement(client, userId, 'coinflip_streak_25', initialMsg);
            }
            if (baubleData.coinflipPlayed >= 100) {
                await checkAndAwardAchievement(client, userId, 'coinflip_play_100', initialMsg);
            }
            if (baubleData.coinflipWins >= 50) {
                await checkAndAwardAchievement(client, userId, 'coinflip_win_50', initialMsg);
            }
            if (baubleData.baubles >= 1000000) {
                await checkAndAwardAchievement(client, userId, 'economy_millionaire', initialMsg);
            }
            if (baubleData.baubles >= 5000000) {
                await checkAndAwardAchievement(client, userId, 'economy_billionaire', initialMsg);
            }
            if (baubleData.baubles >= 10000000) {
                await checkAndAwardAchievement(client, userId, 'economy_emperor', initialMsg);
            }
            if (baubleData.baubles >= 50000000) {
                await checkAndAwardAchievement(client, userId, 'economy_god', initialMsg);
            }
            // comeback_kid: won when balance was below 1,000 before betting
            if (balanceBefore < 1000) {
                await checkAndAwardAchievement(client, userId, 'comeback_kid', initialMsg);
            }
            // draw_winner: won the 0.1% sideways outcome
            if (side === 'draw' && outcome === 'draw') {
                await checkAndAwardAchievement(client, userId, 'draw_winner', initialMsg);
            }
            // midnight_gambler: won between 00:00 and 00:10 UTC
            const utcHour = new Date().getUTCHours();
            const utcMin = new Date().getUTCMinutes();
            if (utcHour === 0 && utcMin < 10) {
                await checkAndAwardAchievement(client, userId, 'midnight_gambler', initialMsg);
            }
            // loss_streak_survivor: won after losing 15+ in a row
            if (previousLossStreak >= 15) {
                await checkAndAwardAchievement(client, userId, 'loss_streak_survivor', initialMsg);
            }
            // jack_of_all_trades: won all 5 game types today
            const needed = ['coinflip', 'slots', 'blackjack', 'gamble', 'mines'];
            if (needed.every(g => baubleData.jackOfAllTradesWins.includes(g))) {
                await checkAndAwardAchievement(client, userId, 'jack_of_all_trades', initialMsg);
            }
        }
    } else {
        baubleData.coinflipStreak = 0;
        baubleData.coinflipLossStreak = (baubleData.coinflipLossStreak || 0) + 1;
    }
    baubleData.dailyGambleLastCompleted = new Date();
    await baubleData.save();

    // Create the final embed
    const finalEmbed = new EmbedBuilder()
        .setTimestamp();

    if (didWin) {
        finalEmbed.setColor(0x2ecc71); // Aesthetic emerald green
        let luckText = '';
        if (rabbitUsed) luckText = '\n\n🐰 *Your Rabbit\'s Foot saved you and converted a loss into a win!*';
        else if (cloverUsed) luckText = '\n\n🍀 *Your Lucky Clover saved you and converted a loss into a win!*';
        else if (luckPenaltyActive) luckText = '\n\n🐰 *Rabbit\'s Foot curse (-15%) was active, but you overcame it!*';

        if (outcome === 'draw') {
            finalEmbed.setTitle('🏆  UNBELIEVABLE DRAW!')
                .setDescription(`🪙 The coin landed perfectly **sideways/upright**!\nYou guessed the **0.1% chance** draw correctly! Absolutely insane luck! 💫${luckText}`);
        } else {
            finalEmbed.setTitle('🎉  VICTORY!')
                .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**!\nYou guessed correctly and doubled your bet! 🌟${luckText}`);
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

        let luckText = '';
        if (luckPenaltyActive) luckText = '\n\n🐰 *Rabbit\'s Foot curse (-15%) was active and dragged you down!*';
        else if (rabbitUsed) luckText = '\n\n🐰 *Rabbit\'s Foot boost (+15%) was active, but failed you!*';
        else if (cloverUsed) luckText = '\n\n🍀 *Lucky Clover boost (+10%) was active, but failed you!*';

        if (outcome === 'draw') {
            finalEmbed.setTitle('💔  COIN STOOD UPRIGHT!')
                .setDescription(`🪙 The coin landed perfectly **sideways/upright** (0.1% chance)!\nYou guessed **${side.toUpperCase()}** and got nothing.${streakLossDesc}${luckText}`);
        } else {
            finalEmbed.setTitle('💔  DEFEAT...')
                .setDescription(`🪙 The coin landed on **${outcome.toUpperCase()}**.\nYou guessed **${side.toUpperCase()}** and lost your bet.${streakLossDesc}${luckText}`);
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
