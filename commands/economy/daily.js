/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward of Glimmering Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.dailyLastClaimed;
            const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
            const breakWindowMs = 48 * 60 * 60 * 1000; // 48 hours

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Daily Cooldown')
                        .setDescription(
                            `Available <t:${nextClaimEpoch}:R>\n\n` +
                            `🔥 Streak: **${baubleData.dailyStreak || 0} days**`
                        );

                    return interaction.reply({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('💔 Streak Lost')
                        .setDescription(`Your streak of **${oldStreak} days** has reset since you missed your daily for over 48 hours.`);

                    await interaction.channel.send({ content: `<@${userId}>`, embeds: [streakBrokenEmbed] }).catch(() => {});
                }
            }

            // Increment streak
            baubleData.dailyStreak = (baubleData.dailyStreak || 0) + 1;
            if (baubleData.dailyStreak > (baubleData.dailyMaxStreak || 0)) {
                baubleData.dailyMaxStreak = baubleData.dailyStreak;
            }

            // Calculate reward (900-1800)
            const baseReward = Math.floor(Math.random() * 901) + 900;
            const streakBonus = Math.min((baubleData.dailyStreak - 1) * 20, 500);
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            const totalReward = Math.floor((baseReward + streakBonus) * multiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(interaction.client, userId, 'streak_7', interaction);
            if (baubleData.dailyStreak >= 30) await checkAndAwardAchievement(interaction.client, userId, 'streak_30', interaction);
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(interaction.client, userId, 'streak_100', interaction);

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✦ Daily Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward}\` • Streak Bonus: \`+${streakBonus}\` • Multiplier: \`${multiplier.toFixed(2)}x\`)\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `🔥 Streak: **${baubleData.dailyStreak}** days (Best: \`${baubleData.dailyMaxStreak}\`)\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily slash command:', error);
            await interaction.reply({ content: '❌ Something went wrong while claiming daily.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.dailyLastClaimed;
            const cooldownMs = 24 * 60 * 60 * 1000;
            const breakWindowMs = 48 * 60 * 60 * 1000;

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Daily Cooldown')
                        .setDescription(
                            `Available <t:${nextClaimEpoch}:R>\n\n` +
                            `🔥 Streak: **${baubleData.dailyStreak || 0} days**`
                        );

                    return message.channel.send({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('💔 Streak Lost')
                        .setDescription(`Your streak of **${oldStreak} days** has reset since you missed your daily for over 48 hours.`);

                    await message.channel.send({ content: `<@${userId}>`, embeds: [streakBrokenEmbed] }).catch(() => {});
                }
            }

            baubleData.dailyStreak = (baubleData.dailyStreak || 0) + 1;
            if (baubleData.dailyStreak > (baubleData.dailyMaxStreak || 0)) {
                baubleData.dailyMaxStreak = baubleData.dailyStreak;
            }

            const baseReward = Math.floor(Math.random() * 901) + 900;
            const streakBonus = Math.min((baubleData.dailyStreak - 1) * 20, 500);
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            const totalReward = Math.floor((baseReward + streakBonus) * multiplier);

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(message.client, userId, 'streak_7', message);
            if (baubleData.dailyStreak >= 30) await checkAndAwardAchievement(message.client, userId, 'streak_30', message);
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(message.client, userId, 'streak_100', message);

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✦ Daily Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward}\` • Streak Bonus: \`+${streakBonus}\` • Multiplier: \`${multiplier.toFixed(2)}x\`)\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `🔥 Streak: **${baubleData.dailyStreak}** days (Best: \`${baubleData.dailyMaxStreak}\`)\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming daily.' });
        }
    }
};
