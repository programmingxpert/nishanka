const Achievement = require('../models/achievementSchema');
const { EmbedBuilder } = require('discord.js');
const { decorateEmojiDefinition, emoji } = require('./customEmojis');

const ACHIEVEMENTS = [
    // Minesweeper
    { id: 'mines_9', name: 'Minesweeper Novice', emoji: '💣', description: 'Win a Mines game with 9 mines.', rarity: 15, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_10', name: 'Minesweeper Apprentice', emoji: '🧨', description: 'Win a Mines game with 10 mines.', rarity: 10, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_11', name: 'Minesweeper Adept', emoji: '💥', description: 'Win a Mines game with 11 mines.', rarity: 5, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_12', name: 'Minesweeper Expert', emoji: '🤯', description: 'Win a Mines game with 12 mines.', rarity: 2, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_13', name: 'Minesweeper Master', emoji: '☠️', description: 'Win a Mines game with 13 mines.', rarity: 1, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_14', name: 'Minesweeper Grandmaster', emoji: '☢️', description: 'Win a Mines game with 14 mines.', rarity: 0.5, isAward: true, isBadge: false, category: 'mines' },
    { id: 'mines_15', name: 'Minesweeper God', emoji: '🌟', description: 'Win a Mines game with the absolute maximum of 15 mines!', rarity: 0.1, isAward: true, isBadge: true, category: 'mines' },
    { id: 'minesweeper_deity', name: 'Minesweeper Deity', emoji: '🏆', description: 'Complete a Mines game with 14 mines without hitting a single trap.', rarity: 0.5, isAward: true, isBadge: false, category: 'mines' },
    { id: 'minesweeper_demigod', name: 'Minesweeper Demigod', emoji: '⚡', description: 'Win a Mines game with 13 mines without hitting a single trap.', rarity: 0.2, isAward: true, isBadge: true, category: 'mines' },
    { id: 'mines_all_gems', name: 'Perfect Sweeper', emoji: '🛡️', description: 'Reveal 10 gems in a single Mines game without hitting any mine.', rarity: 1.0, isAward: true, isBadge: false, category: 'mines' },

    // Streaks
    { id: 'streak_7', name: 'Dedicated Week', emoji: '🔥', description: 'Reach a 7-day daily streak.', rarity: 20, isAward: true, isBadge: false, category: 'streaks' },
    { id: 'streak_30', name: 'Monthly Regular', emoji: '📅', description: 'Reach a 30-day daily streak.', rarity: 5, isAward: true, isBadge: false, category: 'streaks' },
    { id: 'streak_100', name: 'Unstoppable Dedication', emoji: '💯', description: 'Reach a 100-day daily streak.', rarity: 0.5, isAward: true, isBadge: false, category: 'streaks' },
    { id: 'active_180', name: 'Half-Year Devotion', emoji: '📅', description: 'Maintain a daily streak for 180 days straight.', rarity: 0.1, isAward: true, isBadge: true, category: 'streaks' },
    { id: 'active_year', name: 'Golden Year', emoji: '🌟', description: 'Maintain a daily streak for 365 days straight.', rarity: 0.05, isAward: true, isBadge: true, category: 'streaks' },
    { id: 'streak_perfectionist', name: 'Perfect Month', emoji: '🎯', description: 'Claim your daily rewards 30 days in a consecutive monthly period without missing a single day.', rarity: 2.0, isAward: true, isBadge: false, category: 'streaks' },

    // Casino & Minigames
    { id: 'slots_win_50', name: 'Slots Enthusiast', emoji: '🎰', description: 'Win 50 games of Slots.', rarity: 15, isAward: true, isBadge: false, category: 'casino' },
    { id: 'gamble_win_100', name: 'High Roller', emoji: '🎲', description: 'Win 100 gamble games.', rarity: 5, isAward: true, isBadge: false, category: 'casino' },
    { id: 'slots_jackpot', name: 'Jackpot Winner', emoji: '💎', description: 'Roll the 3x triple Premium Gem jackpot on Slots.', rarity: 0.5, isAward: true, isBadge: true, category: 'casino' },
    { id: 'blackjack_pro', name: 'Card Counter', emoji: '🃏', description: 'Win 100 Blackjack games.', rarity: 3, isAward: true, isBadge: false, category: 'casino' },
    { id: 'coinflip_streak_15', name: 'Coinflip Legend', emoji: '🔱', description: 'Win 15 Coinflip games in a row.', rarity: 0.1, isAward: true, isBadge: true, category: 'casino' },
    { id: 'coinflip_streak_20', name: 'Coinflip Overlord', emoji: '👑', description: 'Win 20 Coinflip games in a row.', rarity: 0.05, isAward: true, isBadge: true, category: 'casino' },
    { id: 'slots_jackpot_triple', name: 'Triple Glimmer Jackpot', emoji: '🔮', description: 'Win the Slots jackpot 3 times in total.', rarity: 0.05, isAward: true, isBadge: true, category: 'casino' },
    { id: 'high_stakes_hero', name: 'High Stakes Hero', emoji: '💸', description: 'Win a gamble game with a bet of at least 250,000 Baubles.', rarity: 0.5, isAward: true, isBadge: false, category: 'casino' },

    // Support
    { id: 'premium_supporter', name: 'Premium Supporter', emoji: '💎', description: 'Support Nishanka by purchasing Premium. Unlocks the exclusive profile trophy, 5,000 Baubles, and a rare item gift package!', rarity: 0.1, isAward: true, isBadge: true, category: 'supporter' },
    { id: 'pre_release_badge', name: 'Pre-Release Supporter', emoji: '🚀', description: 'Acquired during Nishanka\'s Pre-Release phase.', rarity: 0.1, isAward: true, isBadge: true, category: 'supporter' },
    { id: 'beta_tester', name: 'Beta Pioneer', emoji: '🧪', description: 'Help test new features during the early development phase.', rarity: 0.5, isAward: true, isBadge: true, category: 'supporter' },

    // Economy & Relics
    { id: 'coinflip_streak_10', name: 'Coinflip Champion', emoji: '🥇', description: 'Win 10 Coinflip games in a row.', rarity: 1, isAward: true, isBadge: true, category: 'economy' },
    { id: 'economy_millionaire', name: 'Bauble Tycoon', emoji: '👑', description: 'Amass 1,000,000 Baubles in your wallet balance.', rarity: 0.2, isAward: true, isBadge: true, category: 'economy' },
    { id: 'economy_billionaire', name: 'Bauble Oligarch', emoji: '🏛️', description: 'Amass 5,000,000 Baubles in your wallet balance.', rarity: 0.05, isAward: true, isBadge: true, category: 'economy' },
    { id: 'tax_evader', name: 'Tax Dodger', emoji: '🥷', description: 'Pay a cumulative total of 50,000 Baubles in daily wealth taxes.', rarity: 1, isAward: true, isBadge: true, category: 'economy' },
    { id: 'tax_tycoon', name: 'Tax Tycoon', emoji: '🎩', description: 'Pay a cumulative total of 250,000 Baubles in daily wealth taxes.', rarity: 0.1, isAward: true, isBadge: true, category: 'economy' },
    { id: 'lucky_clover_max', name: 'Master of Luck', emoji: '🍀', description: 'Win a maximum multiplier gamble with the Lucky Clover booster active.', rarity: 5, isAward: true, isBadge: false, category: 'economy' },
    { id: 'scavenge_legend', name: 'Relic Hunter', emoji: '🏺', description: 'Discover a Mythic or Unique item while scavenging.', rarity: 0.1, isAward: true, isBadge: true, category: 'economy' },
    { id: 'relic_collector', name: 'Museum Curator', emoji: '🏺', description: 'Collect 10 unique relics/items in your inventory.', rarity: 0.5, isAward: true, isBadge: true, category: 'economy' }
];

for (const achievement of ACHIEVEMENTS) {
    const fallbackEmoji = achievement.emoji || '';
    achievement.baseEmoji = fallbackEmoji;
    achievement.emojiKey = `achievement.${achievement.id}`;
    achievement.emoji = emoji(achievement.emojiKey, fallbackEmoji);
}

async function checkAndAwardAchievement(client, userId, achievementId, interactionOrMessage = null) {
    try {
        const achievementDef = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievementDef) return false;

        const existing = await Achievement.findOne({ userId, achievementId });
        if (existing) return false; // Already unlocked

        await Achievement.create({ userId, achievementId });

        if (interactionOrMessage) {
            const embed = new EmbedBuilder()
                .setColor('#facc15')
                .setTitle(`${emoji('achievement.unlock', '🏆')} Achievement Unlocked: ${achievementDef.name}`)
                .setDescription(`${achievementDef.emoji} **${achievementDef.description}**\n\n*Rarity: ${achievementDef.rarity}% of players have this.*`)
                .setFooter({ text: 'View all achievements on the web dashboard!' });

            const channel = interactionOrMessage.channel;
            if (channel) {
                await channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => {});
            }
        }
        return true;
    } catch (error) {
        if (error.code === 11000) return false; // Duplicate key error from mongo, meaning already unlocked
        console.error(`[Achievements] Error awarding ${achievementId} to ${userId}:`, error);
        return false;
    }
}

async function getUserAchievements(userId) {
    return await Achievement.find({ userId });
}

module.exports = {
    ACHIEVEMENTS,
    checkAndAwardAchievement,
    getUserAchievements
};
