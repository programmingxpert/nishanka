/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

const slotEmojis = ['💎', '💰', '🍀', '🔔', '🍒']; // Slot machine emojis

module.exports = {
    category: 'casino',
    cooldown: 30, // 30-second cooldown
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Spin the Glimmering Bauble slots!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount of Baubles to bet (100 - 100k)')
                .setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const betVal = interaction.options.get('bet')?.value;
        const betStr = betVal !== undefined ? String(betVal) : '';

        await runSlots({
            userId,
            betStr,
            interaction,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        if (args.length < 1) {
            return message.reply('❌ Correct usage: `-slots <bet_amount>`');
        }
        const betStr = args[0];

        await runSlots({
            userId,
            betStr,
            message,
            isSlash: false
        });
    }
};

async function runSlots({ userId, betStr, interaction, message, isSlash }) {
    const channel = isSlash ? interaction.channel : message.channel;
    const client = isSlash ? interaction.client : message.client;
    const author = isSlash ? interaction.user : message.author;

    try {
        // Fetch user balance
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                .setDescription(
                    "Hey there! You've unlocked the Glimmering Bauble system!\n\n" +
                    "Collect Baubles by being active, using commands, and exploring the bot!\n\n" +
                    "Use `/bauble` to check your balance."
                )
                .setFooter({ text: 'Glimmering Baubles', iconURL: author.displayAvatarURL({ dynamic: true }) });

            if (isSlash) {
                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: false });
            } else {
                await message.reply({ embeds: [welcomeEmbed] });
            }

            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
            return;
        }

        const { parseAmount } = require('../../utils/economyEngine');
        const bet = parseAmount(betStr, baubleData.baubles);

        if (isNaN(bet) || bet < 100) {
            const err = `❌ The minimum bet for slots is **100** Baubles.`;
            return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
        }

        if (bet > 100000) {
            const err = `❌ The maximum bet for slots is **100,000** Baubles.`;
            return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
        }

        if (baubleData.baubles < bet) {
            const err = `❌ You need at least **${bet.toLocaleString()}** Baubles to spin the slots!`;
            return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
        }

        baubleData.baubles -= bet;
        await baubleData.save();

        // Generate slot results
        const slotResults = [
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
        ];

        try {
            const { sendGameSolutionAlert } = require('../../utils/webhookDispatcher');
            sendGameSolutionAlert({
                type: 'slots',
                userId: userId,
                username: author.tag,
                bet: bet,
                details: `Slots game in channel #${channel?.name || 'unknown'} (${channel?.id})`,
                solution: `Predetermined Slot Results: ${slotResults.join(' | ')}`
            }).catch(err => console.error('Failed to send game solution webhook:', err));
        } catch (e) {
            console.error('Error dispatching game solution webhook:', e);
        }

        if (client) {
            if (!client.activeCasinoGames) {
                client.activeCasinoGames = new Map();
            }
            client.activeCasinoGames.set(`slots_${userId}`, {
                userId,
                username: author.username,
                type: 'slots',
                bet: bet,
                outcome: slotResults,
                timestamp: Date.now()
            });
        }

        const spinningEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎰 Bauble Slots')
            .setDescription('Spinning... 🔄')
            .addFields({ name: 'Results', value: ' | | ' })
            .setFooter({ text: `Cost: ${bet} Baubles` });

        let slotsMsg;
        if (isSlash) {
            slotsMsg = await interaction.reply({ embeds: [spinningEmbed], fetchReply: true });
        } else {
            slotsMsg = await message.reply({ embeds: [spinningEmbed] });
        }

        const editReply = async (payload) => {
            if (isSlash) {
                await interaction.editReply(payload).catch(() => {});
            } else {
                await slotsMsg.edit(payload).catch(() => {});
            }
        };

        // Simulate spinning effect with message edits
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updateEmbed1 = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎰 Bauble Slots')
            .setDescription('Spinning... 🔄')
            .addFields({ name: 'Results', value: `${slotResults[0]} | | ` })
            .setFooter({ text: `Cost: ${bet} Baubles` });
        await editReply({ embeds: [updateEmbed1] });

        await new Promise(resolve => setTimeout(resolve, 1000));
        const updateEmbed2 = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎰 Bauble Slots')
            .setDescription('Spinning... 🔄')
            .addFields({ name: 'Results', value: `${slotResults[0]} | ${slotResults[1]} | ` })
            .setFooter({ text: `Cost: ${bet} Baubles` });
        await editReply({ embeds: [updateEmbed2] });

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (client && client.activeCasinoGames) {
            client.activeCasinoGames.delete(`slots_${userId}`);
        }

        const finalEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎰 Bauble Slots')
            .addFields({ name: 'Results', value: slotResults.join(' | ') })
            .setFooter({ text: `Cost: ${bet} Baubles` });

        let winnings = 0;
        const previousStreak = baubleData.slotsStreak || 0;
        let isWin = false;

        // Check for win conditions
        let isJackpot = false;
        let isPremiumJackpot = false;
        if (slotResults[0] === slotResults[1] && slotResults[1] === slotResults[2]) {
            winnings = bet * 5; // Three in a row: 5x payout
            isWin = true;
            isJackpot = true;
            if (slotResults[0] === '💎') {
                isPremiumJackpot = true;
            }
            finalEmbed.setColor(0x00FF00).setDescription('🎉 Jackpot! Three in a row!');
        } else if (slotResults[0] === slotResults[1] || slotResults[1] === slotResults[2] || slotResults[0] === slotResults[2]) {
            winnings = Math.floor(bet * 1.4); // Two in a row: 1.4x payout
            isWin = true;
            finalEmbed.setColor(0x00FFFF).setDescription('✨ Two in a row!');
        } else {
            finalEmbed.setColor(0xFF0000).setDescription('🙁 No luck this time!');
        }

        baubleData.slotsPlayed = (baubleData.slotsPlayed || 0) + 1;

        if (isWin) {
            baubleData.slotsWins = (baubleData.slotsWins || 0) + 1;
            if (isJackpot) {
                baubleData.slotsJackpots = (baubleData.slotsJackpots || 0) + 1;
            }
            baubleData.slotsStreak = (baubleData.slotsStreak || 0) + 1;
            if (baubleData.slotsStreak > (baubleData.slotsMaxStreak || 0)) {
                baubleData.slotsMaxStreak = baubleData.slotsStreak;
            }
        } else {
            baubleData.slotsStreak = 0;
        }

        baubleData.baubles += winnings;
        baubleData.dailyGambleLastCompleted = new Date();
        await baubleData.save();

        // Check achievements
        if (client) {
            const targetInteractionOrMsg = isSlash ? interaction : slotsMsg;
            if (isPremiumJackpot) {
                await checkAndAwardAchievement(client, userId, 'slots_jackpot', targetInteractionOrMsg);
            }
            if (baubleData.slotsJackpots >= 3) {
                await checkAndAwardAchievement(client, userId, 'slots_jackpot_triple', targetInteractionOrMsg);
            }
            if (baubleData.slotsJackpots >= 10) {
                await checkAndAwardAchievement(client, userId, 'slots_jackpot_10', targetInteractionOrMsg);
            }
            if (baubleData.slotsWins >= 50) {
                await checkAndAwardAchievement(client, userId, 'slots_win_50', targetInteractionOrMsg);
            }
            if (baubleData.slotsPlayed >= 100) {
                await checkAndAwardAchievement(client, userId, 'slots_play_100', targetInteractionOrMsg);
            }
            if (baubleData.baubles >= 1000000) {
                await checkAndAwardAchievement(client, userId, 'economy_millionaire', targetInteractionOrMsg);
            }
            if (baubleData.baubles >= 5000000) {
                await checkAndAwardAchievement(client, userId, 'economy_billionaire', targetInteractionOrMsg);
            }
            if (baubleData.baubles >= 10000000) {
                await checkAndAwardAchievement(client, userId, 'economy_emperor', targetInteractionOrMsg);
            }
            if (baubleData.baubles >= 50000000) {
                await checkAndAwardAchievement(client, userId, 'economy_god', targetInteractionOrMsg);
            }
            // jack_of_all_trades: track today's slots win
            if (isWin) {
                const _slotToday = new Date().toISOString().slice(0, 10);
                if (baubleData.jackOfAllTradesDate !== _slotToday) {
                    baubleData.jackOfAllTradesDate = _slotToday;
                    baubleData.jackOfAllTradesWins = [];
                }
                if (!baubleData.jackOfAllTradesWins.includes('slots')) {
                    baubleData.jackOfAllTradesWins.push('slots');
                    await baubleData.save();
                }
                const _joatNeeded = ['coinflip', 'slots', 'blackjack', 'gamble', 'mines'];
                if (_joatNeeded.every(g => baubleData.jackOfAllTradesWins.includes(g))) {
                    await checkAndAwardAchievement(client, userId, 'jack_of_all_trades', targetInteractionOrMsg);
                }
            }
        }

        let streakLossDesc = '';
        if (!isWin && previousStreak > 0) {
            streakLossDesc = `\n\n*💔 Loss ended your winning streak of **${previousStreak}** spins!*`;
            finalEmbed.setDescription((finalEmbed.data.description || '') + streakLossDesc);
        }

        finalEmbed.addFields(
            { name: 'Winnings', value: `\`${winnings} Baubles\``, inline: true },
            { name: 'New Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true }
        );

        if (isWin) {
            finalEmbed.addFields({ name: '🔥 Win Streak', value: `\`${baubleData.slotsStreak} wins\` (Best: \`${baubleData.slotsMaxStreak}\`)`, inline: true });
        } else {
            finalEmbed.addFields({ name: '🪹 Win Streak', value: `\`0 wins\` (Best: \`${baubleData.slotsMaxStreak || 0}\`)`, inline: true });
        }

        await editReply({ embeds: [finalEmbed] });

    } catch (error) {
        console.error('Error in slots command:', error);
        const errText = '❌ An error occurred while spinning the slots.';
        if (isSlash) {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errText, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: errText, ephemeral: true }).catch(() => {});
            }
        } else {
            await message.reply(errText).catch(() => {});
        }
    }
}