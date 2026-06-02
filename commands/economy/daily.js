/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

function getDailyRarity(amount) {
    if (amount <= 1100) {
        return {
            tier: 'Common',
            name: 'Pocket Lint',
            desc: 'Found some loose baubles stuck to a candy wrapper. It counts.',
            color: 0x8B89AC // Greyish blue
        };
    } else if (amount <= 1350) {
        return {
            tier: 'Uncommon',
            name: 'Spare Change',
            desc: 'A respectable handful. Enough to bribe a very small goblin.',
            color: 0x4ADE80 // Green
        };
    } else if (amount <= 1600) {
        return {
            tier: 'Rare',
            name: 'Neon Pebbles',
            desc: 'These baubles are suspiciously bright. Please do not eat them.',
            color: 0x7C6CF0 // Purple
        };
    } else if (amount <= 1750) {
        return {
            tier: 'Epic',
            name: 'Glitter Bomb',
            desc: 'A dazzling burst of premium sparkly baubles. Exceptional.',
            color: 0xF97FA8 // Pink
        };
    } else {
        return {
            tier: 'Legendary',
            name: 'Celestial Bounty',
            desc: 'The heavens parted just to drop this ridiculous pile of wealth on you.',
            color: 0xFBBF24 // Gold
        };
    }
}

function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

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
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle('⏳ Daily Already Claimed')
                        .setDescription([
                            `Come back in **${formatTimeRemaining(timeLeft)}**`,
                            '',
                            `🔥 Current Streak: **${baubleData.dailyStreak || 0} days**`
                        ].join('\n'))
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });
                }

                // Check if streak is broken (more than 48 hours since last claim)
                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0; // Will be incremented to 1 below
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('💔 Streak Lost')
                        .setDescription([
                            `Previous Streak: **${oldStreak} days**`,
                            '',
                            'You missed your daily for over 48 hours.',
                            'Your streak has been reset.',
                            '',
                            'Starting fresh today.'
                        ].join('\n'));

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
            // Add a funny streak bonus: +20 baubles per streak day, capped at 500 bonus baubles
            const streakBonus = Math.min((baubleData.dailyStreak - 1) * 20, 500);
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const totalReward = Math.floor((baseReward + streakBonus) * globalMultiplier * incomeMultiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(interaction.client, userId, 'streak_7', interaction);
            if (baubleData.dailyStreak >= 30) await checkAndAwardAchievement(interaction.client, userId, 'streak_30', interaction);
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(interaction.client, userId, 'streak_100', interaction);

            const rarity = getDailyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle(`✦ ${rarity.tier} Daily`)
                .setDescription([
                    `## ${rarity.name}`,
                    '',
                    `+ **${totalReward.toLocaleString()}** 🪙`,
                    '',
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}**`,
                    `🔥 Streak: **${baubleData.dailyStreak}** days`,
                    '',
                    `${rarity.desc}`
                ].join('\n'))
                .setFooter({
                    text: `Best Streak • ${baubleData.dailyMaxStreak} days`
                })
                .setTimestamp();

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
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle('⏳ Daily Already Claimed')
                        .setDescription([
                            `Come back in **${formatTimeRemaining(timeLeft)}**`,
                            '',
                            `🔥 Current Streak: **${baubleData.dailyStreak || 0} days**`
                        ].join('\n'))
                        .setTimestamp();

                    return message.channel.send({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('💔 Streak Lost')
                        .setDescription([
                            `Previous Streak: **${oldStreak} days**`,
                            '',
                            'You missed your daily for over 48 hours.',
                            'Your streak has been reset.',
                            '',
                            'Starting fresh today.'
                        ].join('\n'));

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
            const totalReward = Math.floor((baseReward + streakBonus) * globalMultiplier * incomeMultiplier);

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.dailyLastClaimed = now;
            await baubleData.save();

            // Check Streak Achievements
            if (baubleData.dailyStreak >= 7) await checkAndAwardAchievement(message.client, userId, 'streak_7', message);
            if (baubleData.dailyStreak >= 30) await checkAndAwardAchievement(message.client, userId, 'streak_30', message);
            if (baubleData.dailyStreak >= 100) await checkAndAwardAchievement(message.client, userId, 'streak_100', message);

            const rarity = getDailyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle(`✦ ${rarity.tier} Daily`)
                .setDescription([
                    `## ${rarity.name}`,
                    '',
                    `+ **${totalReward.toLocaleString()}** 🪙`,
                    '',
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}**`,
                    `🔥 Streak: **${baubleData.dailyStreak}** days`,
                    '',
                    `${rarity.desc}`
                ].join('\n'))
                .setFooter({
                    text: `Best Streak • ${baubleData.dailyMaxStreak} days`
                })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming daily.' });
        }
    }
};
