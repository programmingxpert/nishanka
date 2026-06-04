/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

const slotEmojis = ['💎', '💰', '🍀', '🔔', '🍒']; // Slot machine emojis

module.exports = {
    category: 'economy',
    slashOnly: true,
    cooldown: 30, // 30-second cooldown
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Spin the Glimmering Bauble slots!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of Baubles to bet.')
                .setRequired(true)
                .setMinValue(100)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const bet = interaction.options.getInteger('bet');

            // Check if user exists and apply the welcome message if they don't
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                // If the user is new send a welcome message
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        "Hey there! You've unlocked the Glimmering Bauble system!\n\n" +
                        "Collect Baubles by being active, using commands, and exploring the bot!\n\n" +
                        "Use `/bauble` to check your balance."
                    )
                    .setFooter({ text: 'Glimmering Baubles', iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) });

                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: false });

                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return; // Exit out of this to stop the old method
            }

            if (bet < 100) {
                return interaction.reply({ content: `❌ The minimum bet for slots is **100** Baubles.`, ephemeral: true });
            }

            if (baubleData.baubles < bet) {
                return interaction.reply({ content: `❌ You need at least ${bet} Baubles to spin the slots!`, ephemeral: true });
            }

            baubleData.baubles -= bet;
            await baubleData.save();

            // Generate slot results
            const slotResults = [
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            ];

            const spinningEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: ' | | ' })
                .setFooter({ text: `Cost: ${bet} Baubles` });

            const message = await interaction.reply({ embeds: [spinningEmbed] });

            // Simulate spinning effect with message edits
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updateEmbed1 = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: `${slotResults[0]} | | ` })
                .setFooter({ text: `Cost: ${bet} Baubles` });
            await interaction.editReply({ embeds: [updateEmbed1] });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const updateEmbed2 = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: `${slotResults[0]} | ${slotResults[1]} | ` })
                .setFooter({ text: `Cost: ${bet} Baubles` });
            await interaction.editReply({ embeds: [updateEmbed2] });

            await new Promise(resolve => setTimeout(resolve, 1000));
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
                winnings = bet * 2; // Two in a row: 2x payout
                isWin = true;
                finalEmbed.setColor(0x00FFFF).setDescription('✨ Two in a row!');
            } else {
                finalEmbed.setColor(0xFF0000).setDescription('🙁 No luck this time!');
            }

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
            const client = interaction.client;
            if (client) {
                if (isPremiumJackpot) {
                    await checkAndAwardAchievement(client, userId, 'slots_jackpot', interaction);
                }
                if (baubleData.slotsJackpots >= 3) {
                    await checkAndAwardAchievement(client, userId, 'slots_jackpot_triple', interaction);
                }
                if (baubleData.slotsJackpots >= 10) {
                    await checkAndAwardAchievement(client, userId, 'slots_jackpot_10', interaction);
                }
                if (baubleData.slotsWins >= 50) {
                    await checkAndAwardAchievement(client, userId, 'slots_win_50', interaction);
                }
                if (baubleData.baubles >= 1000000) {
                    await checkAndAwardAchievement(client, userId, 'economy_millionaire', interaction);
                }
                if (baubleData.baubles >= 5000000) {
                    await checkAndAwardAchievement(client, userId, 'economy_billionaire', interaction);
                }
                if (baubleData.baubles >= 10000000) {
                    await checkAndAwardAchievement(client, userId, 'economy_emperor', interaction);
                }
                if (baubleData.baubles >= 50000000) {
                    await checkAndAwardAchievement(client, userId, 'economy_god', interaction);
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
                        await checkAndAwardAchievement(client, userId, 'jack_of_all_trades', interaction);
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

            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Error in slots command:', error);
            await interaction.reply({ content: '❌ An error occurred while spinning the slots.', ephemeral: true });
        }
    },
    async executePrefix(message) {
        return message.reply('❌ This command is only available as a slash command.');
    },
};