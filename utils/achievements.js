const Achievement = require('../models/achievementSchema');
const { EmbedBuilder } = require('discord.js');

const ACHIEVEMENTS = [
    { id: 'mines_9', name: 'Minesweeper Novice', emoji: '💣', description: 'Win a Mines game with 9 mines.', rarity: 15 },
    { id: 'mines_10', name: 'Minesweeper Apprentice', emoji: '🧨', description: 'Win a Mines game with 10 mines.', rarity: 10 },
    { id: 'mines_11', name: 'Minesweeper Adept', emoji: '💥', description: 'Win a Mines game with 11 mines.', rarity: 5 },
    { id: 'mines_12', name: 'Minesweeper Expert', emoji: '🤯', description: 'Win a Mines game with 12 mines.', rarity: 2 },
    { id: 'mines_13', name: 'Minesweeper Master', emoji: '☠️', description: 'Win a Mines game with 13 mines.', rarity: 1 },
    { id: 'mines_14', name: 'Minesweeper Grandmaster', emoji: '☢️', description: 'Win a Mines game with 14 mines.', rarity: 0.5 },
    { id: 'mines_15', name: 'Minesweeper God', emoji: '🌟', description: 'Win a Mines game with the absolute maximum of 15 mines!', rarity: 0.1 },
    { id: 'streak_7', name: 'Dedicated Week', emoji: '🔥', description: 'Reach a 7-day daily streak.', rarity: 20 },
    { id: 'streak_30', name: 'Monthly Regular', emoji: '📅', description: 'Reach a 30-day daily streak.', rarity: 5 },
    { id: 'streak_100', name: 'Unstoppable Dedication', emoji: '💯', description: 'Reach a 100-day daily streak.', rarity: 0.5 },
    { id: 'slots_win_50', name: 'Slots Enthusiast', emoji: '🎰', description: 'Win 50 games of Slots.', rarity: 15 },
    { id: 'gamble_win_100', name: 'High Roller', emoji: '🎲', description: 'Win 100 gamble games.', rarity: 5 }
];

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
                .setTitle(`🏆 Achievement Unlocked: ${achievementDef.name}`)
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
