/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Achievement = require('../../models/achievementSchema');
const { ACHIEVEMENTS } = require('../../utils/achievements');

module.exports = {
    category: 'profile',
    aliases: ['awards-list', 'achievementslist', 'awardslist'],
    data: new SlashCommandBuilder()
        .setName('achievements-list')
        .setDescription("List all achievements and strike out the ones you already own."),

    async execute(interaction) {
        try {
            const embed = await buildAchievementsListEmbed(interaction.user);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in achievements-list slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the achievements list.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const embed = await buildAchievementsListEmbed(message.author);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in achievements-list prefix command:', error);
            await message.reply('❌ An error occurred while fetching the achievements list.');
        }
    }
};

async function buildAchievementsListEmbed(user) {
    const userUnlocked = await Achievement.find({ userId: user.id }).lean();
    const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = userUnlocked.length;
    const pct = totalCount > 0 ? ((unlockedCount / totalCount) * 100).toFixed(1) : '0.0';

    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🏆 Achievements & Awards List')
        .setFooter({ text: 'Interact with the bot to unlock achievements!' })
        .setTimestamp();

    let descriptionText = `Track your achievements progress here! Owned achievements are ~~struck out~~.\n\nProgress: **${unlockedCount} / ${totalCount}** unlocked (${pct}%)\n\n`;

    const listLines = ACHIEVEMENTS.map(ach => {
        const isOwned = unlockedIds.has(ach.id);
        const typeLabel = ach.isBadge && ach.isAward ? 'Award & Badge' : ach.isBadge ? 'Badge' : 'Award';
        if (isOwned) {
            return `✅ ~~${ach.emoji} **${ach.name}**: ${ach.description}~~ *(Owned | ${typeLabel})*`;
        } else {
            return `🔒 ${ach.emoji} **${ach.name}**: ${ach.description} *(Rarity: ${ach.rarity}% | ${typeLabel})*`;
        }
    });

    embed.setDescription(descriptionText + listLines.join('\n\n'));
    return embed;
}
