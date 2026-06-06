/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const LOSS_TRACKER = new Map(); // Hidden 5-loss safety net

function getWinChance(risk) {
    switch (risk) {
        case 'low': return { chance: 0.8, multiplier: 1.5 };
        case 'medium': return { chance: 0.5, multiplier: 2 };
        case 'high': return { chance: 0.3, multiplier: 3 };
        default: return { chance: 0.5, multiplier: 2 };
    }
}

async function retryDatabaseOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 'UND_ERR_SOCKET' && i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

module.exports = {
    category: 'casino',
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your Baubles with different risk and reward tiers!')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount of Baubles to gamble (e.g. 500, 1k, all, half, 50%)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('risk')
                .setDescription('Risk level: low, medium, or high')
                .setRequired(false)
                .addChoices(
                    { name: 'Low (80% win, 1.5x)', value: 'low' },
                    { name: 'Medium (50% win, 2x)', value: 'medium' },
                    { name: 'High (30% win, 3x)', value: 'high' }
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const baubleData = await require('../../models/baubleSchema').findOne({ userId });
        const amountStr = interaction.options.getString('amount');
        const amount = require('../../utils/economyEngine').parseAmount(amountStr, baubleData?.baubles ?? 0);
        if (isNaN(amount) || amount < 500) {
            return interaction.reply({ content: '❌ The minimum amount to gamble is **500** Baubles. Use a number, `all`, `half`, or `50%`.', ephemeral: true });
        }
        const risk = interaction.options.getString('risk') || 'medium';

        await handleGamble({
            userId,
            amount,
            risk,
            sendWin: embed => interaction.reply({ embeds: [embed] }),
            sendLose: embed => interaction.reply({ embeds: [embed] }),
            sendError: msg => interaction.reply({ content: msg, ephemeral: true }),
            interactionOrMessage: interaction
        });
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        const { parseAmount } = require('../../utils/economyEngine');
        const baubleData = await require('../../models/baubleSchema').findOne({ userId });
        const amount = parseAmount(args[0], baubleData?.baubles ?? 0);
        const risk = (args[1] || 'medium').toLowerCase();

        if (isNaN(amount) || amount < 500) {
            return message.reply({ content: '❌ The minimum amount to gamble is **500** Baubles.' });
        }

        await handleGamble({
            userId,
            amount,
            risk,
            sendWin: embed => message.channel.send({ embeds: [embed] }),
            sendLose: embed => message.channel.send({ embeds: [embed] }),
            sendError: msg => message.reply({ content: msg }),
            interactionOrMessage: message
        });
    }
};

async function handleGamble({ userId, amount, risk, sendWin, sendLose, sendError, interactionOrMessage }) {
    try {
        const baubleData = await retryDatabaseOperation(() => Bauble.findOne({ userId }));
        if (!baubleData) return sendError("❌ You don't have any Baubles yet! Use `/work` to earn some.");
        if (amount < 500) return sendError("❌ The minimum amount to gamble is **500** Baubles.");
        if (baubleData.baubles < amount) return sendError(`❌ You only have ${baubleData.baubles} Baubles, can't gamble ${amount}.`);

        const { chance, multiplier } = getWinChance(risk);

        const losses = LOSS_TRACKER.get(userId) || 0;
        const isGuaranteedWin = losses >= 5;

        let actualChance = chance;
        let cloverUsed = false;
        let rabbitUsed = false;
        let luckPenaltyActive = false;

        const now = Date.now();
        if (baubleData.luckPenaltyExpiresAt && now < new Date(baubleData.luckPenaltyExpiresAt).getTime()) {
            actualChance -= 0.15;
            luckPenaltyActive = true;
        }

        if (baubleData.luckExpiresAt && now < new Date(baubleData.luckExpiresAt).getTime()) {
            const luckTime = new Date(baubleData.luckExpiresAt).getTime();
            const isRabbit = (luckTime % 10 === 5);
            if (isRabbit) {
                actualChance += 0.15;
                rabbitUsed = true;
            } else {
                actualChance += 0.10;
                cloverUsed = true;
            }
        }

        const didWin = isGuaranteedWin || Math.random() < actualChance;
        baubleData.gamblePlayed = (baubleData.gamblePlayed || 0) + 1;

        if (didWin) {
            const earnings = Math.floor(amount * multiplier);
            baubleData.baubles += earnings;
            baubleData.gambleWins = (baubleData.gambleWins || 0) + 1;
            baubleData.gambleStreak = (baubleData.gambleStreak || 0) + 1;
            if (baubleData.gambleStreak > (baubleData.gambleMaxStreak || 0)) {
                baubleData.gambleMaxStreak = baubleData.gambleStreak;
            }
            baubleData.dailyGambleLastCompleted = new Date();
            await retryDatabaseOperation(() => baubleData.save());

            LOSS_TRACKER.set(userId, 0); // reset loss streak

            // Check achievements
            if (interactionOrMessage) {
                const client = interactionOrMessage.client || (interactionOrMessage.channel && interactionOrMessage.channel.client);
                if (client) {
                    const { checkAndAwardAchievement } = require('../../utils/achievements');
                    if (baubleData.gambleWins >= 100) {
                        await checkAndAwardAchievement(client, userId, 'gamble_win_100', interactionOrMessage);
                    }
                    if (baubleData.gamblePlayed >= 100) {
                        await checkAndAwardAchievement(client, userId, 'gamble_play_100', interactionOrMessage);
                    }
                    if (risk === 'high' && cloverUsed) {
                        await checkAndAwardAchievement(client, userId, 'lucky_clover_max', interactionOrMessage);
                    }
                    if (amount >= 250000) {
                        await checkAndAwardAchievement(client, userId, 'high_stakes_hero', interactionOrMessage);
                    }
                    if (baubleData.baubles >= 1000000) {
                        await checkAndAwardAchievement(client, userId, 'economy_millionaire', interactionOrMessage);
                    }
                    if (baubleData.baubles >= 5000000) {
                        await checkAndAwardAchievement(client, userId, 'economy_billionaire', interactionOrMessage);
                    }
                    if (baubleData.baubles >= 10000000) {
                        await checkAndAwardAchievement(client, userId, 'economy_emperor', interactionOrMessage);
                    }
                    if (baubleData.baubles >= 50000000) {
                        await checkAndAwardAchievement(client, userId, 'economy_god', interactionOrMessage);
                    }
                    // high_roller_god: win a HIGH risk gamble with bet >= 1,000,000
                    if (risk === 'high' && amount >= 1000000) {
                        await checkAndAwardAchievement(client, userId, 'high_roller_god', interactionOrMessage);
                    }
                    // midnight_gambler: win between 00:00 and 00:10 UTC
                    const _utcH = new Date().getUTCHours();
                    const _utcM = new Date().getUTCMinutes();
                    if (_utcH === 0 && _utcM < 10) {
                        await checkAndAwardAchievement(client, userId, 'midnight_gambler', interactionOrMessage);
                    }
                    // jack_of_all_trades: track today's wins across game types
                    const _today = new Date().toISOString().slice(0, 10);
                    if (baubleData.jackOfAllTradesDate !== _today) {
                        baubleData.jackOfAllTradesDate = _today;
                        baubleData.jackOfAllTradesWins = [];
                        await baubleData.save();
                    }
                    if (!baubleData.jackOfAllTradesWins.includes('gamble')) {
                        baubleData.jackOfAllTradesWins.push('gamble');
                        await baubleData.save();
                    }
                    const _needed = ['coinflip', 'slots', 'blackjack', 'gamble', 'mines'];
                    if (_needed.every(g => baubleData.jackOfAllTradesWins.includes(g))) {
                        await checkAndAwardAchievement(client, userId, 'jack_of_all_trades', interactionOrMessage);
                    }
                }
            }

            let luckText = '';
            if (rabbitUsed) luckText = '\n\n🐰 *Rabbit\'s Foot luck boost (+15%) was active!*';
            else if (cloverUsed) luckText = '\n\n🍀 *Lucky Clover boost (+10%) was active!*';
            else if (luckPenaltyActive) luckText = '\n\n🐰 *Rabbit\'s Foot curse (-15%) was active, but you overcame it!*';

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 YOU WON!')
                .setDescription(`Risk: **${risk}**\nYou gambled **${amount}** and won **${earnings}**!${luckText}`)
                .addFields(
                    { name: '💰 New Balance', value: `${baubleData.baubles} Baubles`, inline: true },
                    { name: '🔥 Win Streak', value: `\`${baubleData.gambleStreak} wins\` (Best: \`${baubleData.gambleMaxStreak}\`)`, inline: true }
                )
                .setFooter({ text: 'Luck was on your side today... ✨' })
                .setTimestamp();

            return sendWin(embed);
        } else {
            const pity = Math.ceil(amount * 0.1); // 10% refund
            baubleData.baubles = baubleData.baubles - amount + pity;
            const previousStreak = baubleData.gambleStreak || 0;
            baubleData.gambleStreak = 0;
            baubleData.dailyGambleLastCompleted = new Date();
            await retryDatabaseOperation(() => baubleData.save());

            if (interactionOrMessage) {
                const client = interactionOrMessage.client || (interactionOrMessage.channel && interactionOrMessage.channel.client);
                if (client && baubleData.gamblePlayed >= 100) {
                    const { checkAndAwardAchievement } = require('../../utils/achievements');
                    await checkAndAwardAchievement(client, userId, 'gamble_play_100', interactionOrMessage);
                }
            }

            const newStreak = losses + 1;
            LOSS_TRACKER.set(userId, newStreak);

            let streakLossDesc = '';
            if (previousStreak > 0) {
                streakLossDesc = `\n\n*💔 Loss ended your winning streak of **${previousStreak}** wins!*`;
            }

            let luckText = '';
            if (luckPenaltyActive) luckText = '\n\n🐰 *Rabbit\'s Foot curse (-15%) was active and dragged you down!*';
            else if (rabbitUsed) luckText = '\n\n🐰 *Rabbit\'s Foot boost (+15%) was active, but failed you!*';
            else if (cloverUsed) luckText = '\n\n🍀 *Lucky Clover boost (+10%) was active, but failed you!*';

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('💔 You Lost...')
                .setDescription(`Risk: **${risk}**\nYou lost **${amount}**, but got **${pity}** Baubles back out of pity.${streakLossDesc}${luckText}`)
                .addFields(
                    { name: '💸 New Balance', value: `${baubleData.baubles} Baubles`, inline: true },
                    { name: '🪹 Win Streak', value: `\`0 wins\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)`, inline: true }
                )
                .setFooter({ text: 'Oof... maybe next time.' })
                .setTimestamp();

            return sendLose(embed);
        }

    } catch (error) {
        console.error('Error in gamble command:', error);
        return sendError('❌ Something went wrong while gambling. Try again later.');
    }
}
