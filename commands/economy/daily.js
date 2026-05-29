/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { checkAndAwardAchievement } = require('../../utils/achievements');

function getDailyRarity(amount) {
    if (amount <= 1100) {
        return {
            tier: 'Common',
            name: 'Mildly Disappointing Pocket Lint',
            desc: 'You found some baubles stuck to a half-eaten lollipop in the bot\'s coin pouch. Still counts!',
            color: 0x8B89AC // Greyish blue
        };
    } else if (amount <= 1350) {
        return {
            tier: 'Uncommon',
            name: 'Slightly Spicy Loose Change',
            desc: 'A respectable amount. Enough to buy a virtual coffee or bribe a small goblin.',
            color: 0x4ADE80 // Green
        };
    } else if (amount <= 1600) {
        return {
            tier: 'Rare',
            name: 'Glow-in-the-Dark Jackpot',
            desc: 'Wow! These baubles are so shiny they might actually be radioactive. Please don\'t eat them.',
            color: 0x7C6CF0 // Purple
        };
    } else if (amount <= 1750) {
        return {
            tier: 'Epic',
            name: 'Hypnotic Glitter Explosion',
            desc: 'The bot sneezed and accidentally dropped a handful of premium sparkling baubles. Score!',
            color: 0xF97FA8 // Pink
        };
    } else {
        return {
            tier: 'Legendary',
            name: 'Deity-Tier Shiny Sparkler',
            desc: 'A legendary bounty! The heavens parted, a choir of digital angels sang, and this divine pile of baubles fell directly into your pockets!',
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
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your daily reward today!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.\n\n🔥 Current Streak: **${baubleData.dailyStreak || 0}** days`)
                        .setTimestamp()
                        .setFooter({ text: 'Consistency is key!' });

                    return interaction.reply({ embeds: [embed] });
                }

                // Check if streak is broken (more than 48 hours since last claim)
                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0; // Will be incremented to 1 below
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xFF7171)
                        .setTitle('💔 Streak Broken!')
                        .setDescription(`Oh no! You went over 48 hours without claiming your daily. Your streak of **${oldStreak}** days has turned to dust. 😭\nStarting a new streak today!`)
                        .setFooter({ text: 'Don\'t forget tomorrow!' });

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
            const globalMultiplier = await getGlobalMultiplier();
            const totalReward = Math.floor((baseReward + streakBonus) * globalMultiplier);

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
                .setTitle('🎁 Daily Reward Claimed!')
                .setDescription(`You successfully claimed your daily Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true }
                );

            if (streakBonus > 0) {
                embed.addFields({ name: '🔥 Streak Bonus', value: `+**${streakBonus}** Baubles`, inline: true });
            }

            embed.addFields(
                { name: '💵 Total Earned', value: `**${totalReward}** Baubles`, inline: true },
                { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true },
                { name: '🔥 Current Streak', value: `**${baubleData.dailyStreak}** Days (Best: **${baubleData.dailyMaxStreak}** days)`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Claim again tomorrow to keep your streak alive!' });

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
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your daily reward today!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.\n\n🔥 Current Streak: **${baubleData.dailyStreak || 0}** days`)
                        .setTimestamp()
                        .setFooter({ text: 'Consistency is key!' });

                    return message.channel.send({ embeds: [embed] });
                }

                if (diff >= breakWindowMs) {
                    const oldStreak = baubleData.dailyStreak || 0;
                    baubleData.dailyStreak = 0;
                    
                    const streakBrokenEmbed = new EmbedBuilder()
                        .setColor(0xFF7171)
                        .setTitle('💔 Streak Broken!')
                        .setDescription(`Oh no! You went over 48 hours without claiming your daily. Your streak of **${oldStreak}** days has turned to dust. 😭\nStarting a new streak today!`)
                        .setFooter({ text: 'Don\'t forget tomorrow!' });

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
            const globalMultiplier = await getGlobalMultiplier();
            const totalReward = Math.floor((baseReward + streakBonus) * globalMultiplier);

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
                .setTitle('🎁 Daily Reward Claimed!')
                .setDescription(`You successfully claimed your daily Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true }
                );

            if (streakBonus > 0) {
                embed.addFields({ name: '🔥 Streak Bonus', value: `+**${streakBonus}** Baubles`, inline: true });
            }

            embed.addFields(
                { name: '💵 Total Earned', value: `**${totalReward}** Baubles`, inline: true },
                { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true },
                { name: '🔥 Current Streak', value: `**${baubleData.dailyStreak}** Days (Best: **${baubleData.dailyMaxStreak}** days)`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Claim again tomorrow to keep your streak alive!' });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming daily.' });
        }
    }
};
