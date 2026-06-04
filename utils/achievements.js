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
    { id: 'relic_collector', name: 'Museum Curator', emoji: '🏺', description: 'Collect 10 unique relics/items in your inventory.', rarity: 0.5, isAward: true, isBadge: true, category: 'economy' },

    // Insanely Hard Achievements
    { id: 'mines_perfect_10', name: 'Legendary Mine Clearer', emoji: '🌌', description: 'Clear a 10-mines grid perfectly (reveal all 6 safe gems).', rarity: 0.01, isAward: true, isBadge: true, category: 'mines' },
    { id: 'mines_perfect_8', name: 'Unmineable Titan', emoji: '🪐', description: 'Clear an 8-mines grid perfectly (reveal all 8 safe gems).', rarity: 0.005, isAward: true, isBadge: true, category: 'mines' },
    { id: 'streak_500', name: 'Centennial Legend', emoji: '🌋', description: 'Maintain a daily streak for 500 days straight.', rarity: 0.01, isAward: true, isBadge: true, category: 'streaks' },
    { id: 'streak_1000', name: 'Nishanka Immortal', emoji: '☄️', description: 'Maintain a daily streak for 1000 days straight.', rarity: 0.001, isAward: true, isBadge: true, category: 'streaks' },
    { id: 'coinflip_streak_25', name: 'Coinflip Apex', emoji: '🔮', description: 'Win 25 Coinflip games in a row.', rarity: 0.005, isAward: true, isBadge: true, category: 'casino' },
    { id: 'slots_jackpot_10', name: 'Jackpot Sovereign', emoji: '🎰', description: 'Win the Slots jackpot 10 times in total.', rarity: 0.01, isAward: true, isBadge: true, category: 'casino' },
    { id: 'blackjack_500', name: 'Blackjack Overlord', emoji: '🃏', description: 'Win 500 Blackjack games.', rarity: 0.01, isAward: true, isBadge: true, category: 'casino' },
    { id: 'economy_emperor', name: 'Bauble Emperor', emoji: '👑', description: 'Amass 10,000,000 Baubles in your wallet balance.', rarity: 0.01, isAward: true, isBadge: true, category: 'economy' },
    { id: 'economy_god', name: 'Bauble Sovereign', emoji: '⚜️', description: 'Amass 50,000,000 Baubles in your wallet balance.', rarity: 0.001, isAward: true, isBadge: true, category: 'economy' },
    { id: 'tax_emperor', name: 'Nishanka Sponsor', emoji: '💼', description: 'Pay a cumulative total of 1,000,000 Baubles in daily wealth taxes.', rarity: 0.01, isAward: true, isBadge: true, category: 'economy' },
    { id: 'relic_sovereign', name: 'Relic Sovereign', emoji: '🏺', description: 'Collect 20 unique relics/items in your inventory.', rarity: 0.05, isAward: true, isBadge: true, category: 'economy' },
    { id: 'work_legend', name: 'CEO of Nishanka', emoji: '🏢', description: 'Complete 5,000 work jobs in total.', rarity: 0.01, isAward: true, isBadge: true, category: 'economy' },
    { id: 'work_titan', name: 'Industrious God', emoji: '🏗️', description: 'Complete 10,000 work jobs in total.', rarity: 0.001, isAward: true, isBadge: true, category: 'economy' },
    { id: 'scavenge_mythic_5', name: 'Archeology Titan', emoji: '⚜️', description: 'Hold 5 or more Mythic or Unique items in your inventory.', rarity: 0.01, isAward: true, isBadge: true, category: 'economy' },

    // Creative & Cross-Mechanic Achievements
    { id: 'jack_of_all_trades', name: 'Jack of All Trades', emoji: '🃏', description: 'Win a game of Slots, Blackjack, Gamble, Coinflip, AND Mines all on the same calendar day.', rarity: 0.05, isAward: true, isBadge: true, category: 'casino' },
    { id: 'comeback_kid', name: 'The Comeback Kid', emoji: '🔥', description: 'Win a Coinflip when you had fewer than 1,000 Baubles in your wallet before betting.', rarity: 1.0, isAward: true, isBadge: false, category: 'casino' },
    { id: 'midnight_gambler', name: 'Midnight Phantom', emoji: '🌙', description: 'Win a Coinflip or Gamble between 00:00 and 00:10 UTC.', rarity: 0.5, isAward: true, isBadge: true, category: 'casino' },
    { id: 'draw_winner', name: 'Against the Universe', emoji: '🌌', description: 'Correctly guess the Sideways/Draw outcome in Coinflip — a 0.1% chance.', rarity: 0.1, isAward: true, isBadge: true, category: 'casino' },
    { id: 'high_roller_god', name: 'All-In Legend', emoji: '🎰', description: 'Win a HIGH risk Gamble with a bet of at least 1,000,000 Baubles.', rarity: 0.01, isAward: true, isBadge: true, category: 'casino' },
    { id: 'loss_streak_survivor', name: 'Rock Bottom Comeback', emoji: '💀', description: 'Lose 15 Coinflip games in a row, then win the very next one.', rarity: 0.1, isAward: true, isBadge: true, category: 'casino' },
    { id: 'philanthropist', name: 'The Philanthropist', emoji: '💝', description: 'Give Baubles to 25 different unique players in your lifetime.', rarity: 0.2, isAward: true, isBadge: true, category: 'economy' },
    { id: 'robin_hood', name: 'Robin Hood', emoji: '🏹', description: 'Give away a cumulative total of 1,000,000 Baubles to other players.', rarity: 0.05, isAward: true, isBadge: true, category: 'economy' },
    { id: 'crime_lord', name: 'Crime Lord', emoji: '🕵️', description: 'Pull off 300 consecutive successful crimes without getting arrested once.', rarity: 0.01, isAward: true, isBadge: true, category: 'economy' },
    { id: 'master_heist', name: 'The Phantom Thief', emoji: '🦹', description: 'Successfully complete 50 High-Stakes Heist robberies.', rarity: 0.05, isAward: true, isBadge: true, category: 'economy' },
    { id: 'overtime_grinder', name: 'Overtime Legend', emoji: '⏰', description: 'Complete 30 work jobs in a single calendar day.', rarity: 0.1, isAward: true, isBadge: true, category: 'economy' },
    { id: 'completionist', name: 'The Completionist', emoji: '🎖️', description: 'Unlock 40 or more achievements. You truly do it all.', rarity: 0.005, isAward: true, isBadge: true, category: 'economy' }
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

        // After any award, check if they now have enough for completionist
        if (achievementId !== 'completionist') {
            try {
                const count = await Achievement.countDocuments({ userId });
                if (count >= 40) {
                    await checkAndAwardAchievement(client, userId, 'completionist', interactionOrMessage);
                }
            } catch (_) {}
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

async function syncUserAchievements(client, userId) {
    try {
        const Bauble = require('../models/baubleSchema');
        const baubleData = await Bauble.findOne({ userId });
        if (!baubleData) return;

        // Coinflip streak achievements
        const maxCf = Math.max(baubleData.coinflipMaxStreak || 0, baubleData.coinflipStreak || 0);
        if (maxCf >= 10) await checkAndAwardAchievement(client, userId, 'coinflip_streak_10');
        if (maxCf >= 15) await checkAndAwardAchievement(client, userId, 'coinflip_streak_15');
        if (maxCf >= 20) await checkAndAwardAchievement(client, userId, 'coinflip_streak_20');
        if (maxCf >= 25) await checkAndAwardAchievement(client, userId, 'coinflip_streak_25');

        // Streaks achievements
        const maxDaily = Math.max(baubleData.dailyMaxStreak || 0, baubleData.dailyStreak || 0);
        if (maxDaily >= 7) await checkAndAwardAchievement(client, userId, 'streak_7');
        if (maxDaily >= 30) {
            await checkAndAwardAchievement(client, userId, 'streak_30');
            await checkAndAwardAchievement(client, userId, 'streak_perfectionist');
        }
        if (maxDaily >= 100) await checkAndAwardAchievement(client, userId, 'streak_100');
        if (maxDaily >= 180) await checkAndAwardAchievement(client, userId, 'active_180');
        if (maxDaily >= 365) await checkAndAwardAchievement(client, userId, 'active_year');
        if (maxDaily >= 500) await checkAndAwardAchievement(client, userId, 'streak_500');
        if (maxDaily >= 1000) await checkAndAwardAchievement(client, userId, 'streak_1000');

        // Balance achievements
        if (baubleData.baubles >= 1000000) await checkAndAwardAchievement(client, userId, 'economy_millionaire');
        if (baubleData.baubles >= 5000000) await checkAndAwardAchievement(client, userId, 'economy_billionaire');
        if (baubleData.baubles >= 10000000) await checkAndAwardAchievement(client, userId, 'economy_emperor');
        if (baubleData.baubles >= 50000000) await checkAndAwardAchievement(client, userId, 'economy_god');

        // Casino totals
        if (baubleData.slotsWins >= 50) await checkAndAwardAchievement(client, userId, 'slots_win_50');
        if (baubleData.gambleWins >= 100) await checkAndAwardAchievement(client, userId, 'gamble_win_100');
        if (baubleData.blackjackWins >= 100) await checkAndAwardAchievement(client, userId, 'blackjack_pro');
        if (baubleData.blackjackWins >= 500) await checkAndAwardAchievement(client, userId, 'blackjack_500');

        const slotsJacks = baubleData.slotsJackpots || 0;
        if (slotsJacks >= 1) await checkAndAwardAchievement(client, userId, 'slots_jackpot');
        if (slotsJacks >= 3) await checkAndAwardAchievement(client, userId, 'slots_jackpot_triple');
        if (slotsJacks >= 10) await checkAndAwardAchievement(client, userId, 'slots_jackpot_10');

        // Taxes paid
        const taxes = baubleData.cumulativeTaxPaid || 0;
        if (taxes >= 50000) await checkAndAwardAchievement(client, userId, 'tax_evader');
        if (taxes >= 250000) await checkAndAwardAchievement(client, userId, 'tax_tycoon');
        if (taxes >= 1000000) await checkAndAwardAchievement(client, userId, 'tax_emperor');

        // Work jobs completed
        const workJobs = baubleData.workJobsCompleted || 0;
        if (workJobs >= 5000) await checkAndAwardAchievement(client, userId, 'work_legend');
        if (workJobs >= 10000) await checkAndAwardAchievement(client, userId, 'work_titan');

        // Relics/Inventory
        if (baubleData.inventory && baubleData.inventory.length > 0) {
            const uniqueItems = new Set(baubleData.inventory.filter(i => i.quantity > 0).map(i => i.itemId)).size;
            if (uniqueItems >= 10) {
                await checkAndAwardAchievement(client, userId, 'relic_collector');
            }
            if (uniqueItems >= 20) {
                await checkAndAwardAchievement(client, userId, 'relic_sovereign');
            }

            // Mythic/Unique check
            const { ITEMS } = require('./items');
            const mythicUniqueCount = baubleData.inventory.filter(i => {
                if (i.quantity <= 0) return false;
                const itemDef = ITEMS[i.itemId];
                return itemDef && (itemDef.rarity === 'Mythic' || itemDef.rarity === 'Unique');
            }).reduce((sum, i) => sum + i.quantity, 0);

            if (mythicUniqueCount >= 5) {
                await checkAndAwardAchievement(client, userId, 'scavenge_mythic_5');
            }
        }

        // Creative achievements (retroactive where trackable from existing fields)
        const given = baubleData.uniqueUsersGiftedTo || [];
        if (given.length >= 25) await checkAndAwardAchievement(client, userId, 'philanthropist');

        const totalGiven = baubleData.totalBaublesGiven || 0;
        if (totalGiven >= 1000000) await checkAndAwardAchievement(client, userId, 'robin_hood');

        const heistSuccesses = baubleData.heistRobsSuccessful || 0;
        if (heistSuccesses >= 50) await checkAndAwardAchievement(client, userId, 'master_heist');

        // Completionist check
        const achievementCount = await Achievement.countDocuments({ userId });
        if (achievementCount >= 40) await checkAndAwardAchievement(client, userId, 'completionist');

    } catch (err) {
        console.error(`[Achievements] Error syncing achievements for ${userId}:`, err);
    }
}

module.exports = {
    ACHIEVEMENTS,
    checkAndAwardAchievement,
    getUserAchievements,
    syncUserAchievements
};
