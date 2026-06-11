const { EmbedBuilder } = require('discord.js');
const { ACHIEVEMENTS, checkAndAwardAchievement } = require('../../utils/achievements');
const config = require('../../config.json');

module.exports = {
    category: 'developer',
    devOnly: true,
    hidden: true,
    data: {
        name: 'awardachievement',
        description: 'Award an achievement or badge to a player manually.',
        options: [] // Prefix command only for developer safety
    },
    aliases: ['awardbadge', 'awardaward'],

    async executePrefix(message, args, client) {
        if (message.author.id !== config.devId) {
            return message.reply('❌ This command is restricted to the bot developer only.');
        }

        if (args.length < 2) {
            return message.reply('⚠️ Usage: `-awardachievement <user_id_or_mention> <achievement_id>`\nExample: `-awardbadge 123456789012345678 beta_tester`');
        }

        // Parse user
        let targetUser = message.mentions.users.first();
        if (!targetUser) {
            try {
                targetUser = await message.client.users.fetch(args[0]);
            } catch (err) {
                return message.reply('❌ Could not find/fetch that user.');
            }
        }

        const achievementId = args[1];
        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievement) {
            return message.reply(`❌ Invalid achievement/badge ID! Use one of the following:\n${ACHIEVEMENTS.map(a => `\`${a.id}\``).join(', ')}`);
        }

        try {
            const success = await checkAndAwardAchievement(client, targetUser.id, achievementId, message);
            if (success) {
                return message.reply(`✅ Successfully awarded **${achievement.name}** to **${targetUser.username}**!`);
            } else {
                return message.reply(`⚠️ User already has this achievement or there was a conflict.`);
            }
        } catch (err) {
            console.error('[AwardAchievement] Error:', err);
            return message.reply('❌ An error occurred while awarding the achievement.');
        }
    }
};
