/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Achievement = require('../../models/achievementSchema');
const { ACHIEVEMENTS, syncUserAchievements } = require('../../utils/achievements');

module.exports = {
    category: 'profile',
    aliases: ['awards', 'achievement'],
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription("View a user's unlocked achievements.")
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose achievements you want to view')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            await syncUserAchievements(interaction.client, targetUser.id);
            const embed = await buildAchievementsEmbed(targetUser);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in achievements slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching achievements.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            let targetUser;
            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch (err) {
                    targetUser = message.author;
                }
            } else {
                targetUser = message.author;
            }

            await syncUserAchievements(message.client, targetUser.id);
            const embed = await buildAchievementsEmbed(targetUser);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in achievements prefix command:', error);
            await message.reply('❌ An error occurred while fetching achievements.');
        }
    }
};

async function buildAchievementsEmbed(user) {
    const userUnlocked = await Achievement.find({ userId: user.id }).lean();
    const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = userUnlocked.length;
    const pct = totalCount > 0 ? ((unlockedCount / totalCount) * 100).toFixed(1) : '0.0';

    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🏆 ${user.username}'s Achievements`)
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
        .setFooter({ text: 'Unlock achievements by playing minigames, gaining streaks, and supporting us!' })
        .setTimestamp();

    if (unlockedCount === 0) {
        embed.setDescription(`This user has not unlocked any achievements yet.\n\nUse \`/profile achievements-list\` or \`-achievements-list\` to view all available achievements and how to unlock them!`);
        return embed;
    }

    embed.setDescription(`Progress: **${unlockedCount} / ${totalCount}** unlocked (${pct}%)\n\n`);

    let descriptionText = ``;
    for (const ach of ACHIEVEMENTS) {
        if (unlockedIds.has(ach.id)) {
            const unlockData = userUnlocked.find(a => a.achievementId === ach.id);
            const unixTime = unlockData && unlockData.unlockedAt 
                ? Math.floor(new Date(unlockData.unlockedAt).getTime() / 1000)
                : Math.floor(Date.now() / 1000);
            const unlockedTime = `<t:${unixTime}:f> (<t:${unixTime}:R>)`;
            
            descriptionText += `**${ach.emoji} ${ach.name}**\n${ach.description}\n*Unlocked: ${unlockedTime} | Rarity: ${ach.rarity}%*\n\n`;
        }
    }

    embed.setDescription(embed.data.description + descriptionText);
    return embed;
}
