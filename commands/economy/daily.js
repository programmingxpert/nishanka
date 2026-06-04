/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');
const { emoji } = require('../../utils/customEmojis');

const EMOJI = {
    bauble: emoji('currency.bauble', '🪙'),
    balance: emoji('ui.balance', '💰'),
    cooldown: emoji('ui.cooldown', '⏳'),
    daily: emoji('ui.daily', '✦'),
    error: emoji('ui.error', '❌'),
    nextClaim: emoji('ui.next_claim', '⏱️'),
    streak: emoji('ui.streak', '🔥'),
    streakLost: emoji('ui.streak_lost', '💔')
};

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
                        .setTitle(`${EMOJI.cooldown} Daily Cooldown`)
                        .setDescription(
                            `Available <t:${nextClaimEpoch}:R>\n\n` +
                            `${EMOJI.streak} Streak: **${baubleData.dailyStreak || 0} days**`
                        );

                    return interaction.reply({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(`${EMOJI.streakLost} Streak Lost`)
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
            const { getUserPremiumTier } = require('../../utils/premiumPromo');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            
            const userTier = getUserPremiumTier(userId);
            const TIER_DAILY_BONUS = { free: 0, lite: 1000, pro: 2500, network: 5000, lifetime: 10000 };
            const premiumBonus = TIER_DAILY_BONUS[userTier] || 0;
            const totalReward = Math.floor((baseReward + streakBonus) * multiplier) + premiumBonus;

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(interaction.client, userId, 'streak_7', interaction);
            if (baubleData.dailyStreak >= 30) {
                await checkAndAwardAchievement(interaction.client, userId, 'streak_30', interaction);
                await checkAndAwardAchievement(interaction.client, userId, 'streak_perfectionist', interaction);
            }
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(interaction.client, userId, 'streak_100', interaction);
            if (baubleData.dailyStreak >= 180) await checkAndAwardAchievement(interaction.client, userId, 'active_180', interaction);
            if (baubleData.dailyStreak >= 365) await checkAndAwardAchievement(interaction.client, userId, 'active_year', interaction);
            if (baubleData.dailyStreak >= 500) await checkAndAwardAchievement(interaction.client, userId, 'streak_500', interaction);
            if (baubleData.dailyStreak >= 1000) await checkAndAwardAchievement(interaction.client, userId, 'streak_1000', interaction);

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            let descriptionText = `Received **+${totalReward.toLocaleString()}** ${EMOJI.bauble} (Base: \`${baseReward}\` • Streak Bonus: \`+${streakBonus}\` • Multiplier: \`${multiplier.toFixed(2)}x\``;
            if (premiumBonus > 0) {
                descriptionText += ` • Premium Bonus: \`+${premiumBonus.toLocaleString()} (${userTier.toUpperCase()})\``;
            }
            descriptionText += `)\n\n${EMOJI.balance} Balance: **${baubleData.baubles.toLocaleString()}** ${EMOJI.bauble}\n${EMOJI.streak} Streak: **${baubleData.dailyStreak}** days (Best: \`${baubleData.dailyMaxStreak}\`)\n${EMOJI.nextClaim} Next Claim: <t:${nextClaimEpoch}:R>`;
            if (baubleData.baubles >= 100000 && !baubleData.passiveMode) {
                descriptionText += `\n\n💡 **Tip:** You have a heavy wallet balance! Consider enabling **Passive Mode** (\`/passive\`) to protect your wealth from thieves!`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle(`${EMOJI.daily} Daily Claim`)
                .setDescription(descriptionText);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily slash command:', error);
            await interaction.reply({ content: `${EMOJI.error} Something went wrong while claiming daily.`, ephemeral: true });
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
                        .setTitle(`${EMOJI.cooldown} Daily Cooldown`)
                        .setDescription(
                            `Available <t:${nextClaimEpoch}:R>\n\n` +
                            `${EMOJI.streak} Streak: **${baubleData.dailyStreak || 0} days**`
                        );

                    return message.channel.send({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(`${EMOJI.streakLost} Streak Lost`)
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
            const { getUserPremiumTier } = require('../../utils/premiumPromo');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            
            const userTier = getUserPremiumTier(userId);
            const TIER_DAILY_BONUS = { free: 0, lite: 1000, pro: 2500, network: 5000, lifetime: 10000 };
            const premiumBonus = TIER_DAILY_BONUS[userTier] || 0;
            const totalReward = Math.floor((baseReward + streakBonus) * multiplier) + premiumBonus;

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(message.client, userId, 'streak_7', message);
            if (baubleData.dailyStreak >= 30) {
                await checkAndAwardAchievement(message.client, userId, 'streak_30', message);
                await checkAndAwardAchievement(message.client, userId, 'streak_perfectionist', message);
            }
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(message.client, userId, 'streak_100', message);
            if (baubleData.dailyStreak >= 180) await checkAndAwardAchievement(message.client, userId, 'active_180', message);
            if (baubleData.dailyStreak >= 365) await checkAndAwardAchievement(message.client, userId, 'active_year', message);
            if (baubleData.dailyStreak >= 500) await checkAndAwardAchievement(message.client, userId, 'streak_500', message);
            if (baubleData.dailyStreak >= 1000) await checkAndAwardAchievement(message.client, userId, 'streak_1000', message);

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            let descriptionText = `Received **+${totalReward.toLocaleString()}** ${EMOJI.bauble} (Base: \`${baseReward}\` • Streak Bonus: \`+${streakBonus}\` • Multiplier: \`${multiplier.toFixed(2)}x\``;
            if (premiumBonus > 0) {
                descriptionText += ` • Premium Bonus: \`+${premiumBonus.toLocaleString()} (${userTier.toUpperCase()})\``;
            }
            descriptionText += `)\n\n${EMOJI.balance} Balance: **${baubleData.baubles.toLocaleString()}** ${EMOJI.bauble}\n${EMOJI.streak} Streak: **${baubleData.dailyStreak}** days (Best: \`${baubleData.dailyMaxStreak}\`)\n${EMOJI.nextClaim} Next Claim: <t:${nextClaimEpoch}:R>`;
            if (baubleData.baubles >= 100000 && !baubleData.passiveMode) {
                descriptionText += `\n\n💡 **Tip:** You have a heavy wallet balance! Consider enabling **Passive Mode** (\`/passive\`) to protect your wealth from thieves!`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle(`${EMOJI.daily} Daily Claim`)
                .setDescription(descriptionText);

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily prefix command:', error);
            await message.reply({ content: `${EMOJI.error} Something went wrong while claiming daily.` });
        }
    }
};
