/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Achievement = require('../../models/achievementSchema');
const { ACHIEVEMENTS, syncUserAchievements } = require('../../utils/achievements');

const CATEGORIES = {
    all: { label: 'All Achievements', emoji: '🏆', desc: 'Complete list of all global accolades.' },
    mines: { label: 'Minesweeper Milestones', emoji: '💣', desc: 'Achievements earned playing the Mines minigame.' },
    streaks: { label: 'Daily & Active Streaks', emoji: '🔥', desc: 'Milestones for persistent daily active play.' },
    casino: { label: 'Casino & Card Games', emoji: '🎰', desc: 'Milestones earned in Slots, Coinflip, and Blackjack.' },
    supporter: { label: 'Supporters & Pre-Release', emoji: '💎', desc: 'Trophies for premium support and early users.' },
    economy: { label: 'Wealth & Relics', emoji: '👑', desc: 'Milestones for wealth totals, tax tiers, and rare items.' }
};

module.exports = {
    category: 'profile',
    aliases: ['awards-list', 'achievementslist', 'awardslist'],
    data: new SlashCommandBuilder()
        .setName('achievements-list')
        .setDescription("List all achievements grouped by category and strike out the ones you own."),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            await syncUserAchievements(interaction.client, userId);
            const userUnlocked = await Achievement.find({ userId }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

            const embed = buildCategoryEmbed(interaction.user, 'all', unlockedIds);
            const components = createControls(userId, 'all');

            const reply = await interaction.reply({ embeds: [embed], components, fetchReply: true });
            createCategoryCollector(reply, userId, unlockedIds);
        } catch (error) {
            console.error('Error in achievements-list slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the achievements list.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            await syncUserAchievements(message.client, userId);
            const userUnlocked = await Achievement.find({ userId }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

            const embed = buildCategoryEmbed(message.author, 'all', unlockedIds);
            const components = createControls(userId, 'all');

            const reply = await message.reply({ embeds: [embed], components });
            createCategoryCollector(reply, userId, unlockedIds);
        } catch (error) {
            console.error('Error in achievements-list prefix command:', error);
            await message.reply('❌ An error occurred while fetching the achievements list.');
        }
    }
};

function buildCategoryEmbed(user, currentCategory, unlockedIds) {
    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = unlockedIds.size;
    const totalPct = totalCount > 0 ? ((unlockedCount / totalCount) * 100).toFixed(1) : '0.0';

    const categoryInfo = CATEGORIES[currentCategory];
    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`${categoryInfo.emoji} ${categoryInfo.label}`)
        .setFooter({ text: 'Use the buttons below to switch categories!' })
        .setTimestamp();

    if (currentCategory === 'all') {
        let desc = `*${categoryInfo.desc}*\n\n` +
            `Global Progress: **${unlockedCount} / ${totalCount}** unlocked (${totalPct}%)\n\n` +
            `**Category Overview:**\n`;

        for (const [catKey, catVal] of Object.entries(CATEGORIES)) {
            if (catKey === 'all') continue;
            const catAchievements = ACHIEVEMENTS.filter(ach => ach.category === catKey);
            const catTotal = catAchievements.length;
            const catUnlocked = catAchievements.filter(a => unlockedIds.has(a.id)).length;
            const catPct = catTotal > 0 ? ((catUnlocked / catTotal) * 100).toFixed(0) : '0';
            desc += `${catVal.emoji} **${catVal.label}**: **${catUnlocked} / ${catTotal}** (${catPct}%)\n`;
        }

        desc += `\n*Click any button below to see the specific achievements for that category!*`;
        embed.setDescription(desc);
    } else {
        const filteredAchievements = ACHIEVEMENTS.filter(ach => ach.category === currentCategory);
        const categoryTotal = filteredAchievements.length;
        const categoryUnlocked = filteredAchievements.filter(a => unlockedIds.has(a.id)).length;
        const categoryPct = categoryTotal > 0 ? ((categoryUnlocked / categoryTotal) * 100).toFixed(0) : '0';

        const descHeader = `*${categoryInfo.desc}*\n\n` +
            `Global Progress: **${unlockedCount} / ${totalCount}** unlocked (${totalPct}%)\n` +
            `Category Progress: **${categoryUnlocked} / ${categoryTotal}** unlocked (${categoryPct}%)\n\n` +
            `Owned achievements are ~~struck out~~.\n\n`;

        const listLines = filteredAchievements.map(ach => {
            const isOwned = unlockedIds.has(ach.id);
            const typeLabel = ach.isBadge && ach.isAward ? 'Award & Badge' : ach.isBadge ? 'Badge' : 'Award';
            if (isOwned) {
                return `✅ ~~${ach.emoji} **${ach.name}**: ${ach.description}~~ *(Owned | ${typeLabel})*`;
            } else {
                return `🔒 ${ach.emoji} **${ach.name}**: ${ach.description} *(Rarity: ${ach.rarity}% | ${typeLabel})*`;
            }
        });

        embed.setDescription(descHeader + (listLines.join('\n\n') || '_No achievements in this category._'));
    }
    return embed;
}

function createControls(userId, currentCategory) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ach_cat_all_${userId}`)
            .setLabel('All')
            .setStyle(currentCategory === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId(`ach_cat_mines_${userId}`)
            .setLabel('Mines')
            .setStyle(currentCategory === 'mines' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('💣'),
        new ButtonBuilder()
            .setCustomId(`ach_cat_streaks_${userId}`)
            .setLabel('Streaks')
            .setStyle(currentCategory === 'streaks' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔥'),
        new ButtonBuilder()
            .setCustomId(`ach_cat_casino_${userId}`)
            .setLabel('Casino')
            .setStyle(currentCategory === 'casino' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🎰'),
        new ButtonBuilder()
            .setCustomId(`ach_cat_supporter_${userId}`)
            .setLabel('Supporter')
            .setStyle(currentCategory === 'supporter' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('💎')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ach_cat_economy_${userId}`)
            .setLabel('Economy')
            .setStyle(currentCategory === 'economy' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('👑'),
        new ButtonBuilder()
            .setCustomId(`ach_close_${userId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    return [row1, row2];
}

function createCategoryCollector(message, userId, unlockedIds) {
    const collector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === userId,
        time: 120000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'This list is only interactive for the original user.', ephemeral: true });
        }

        if (interaction.customId === `ach_close_${userId}`) {
            collector.stop('closed');
            const disabledRows = interaction.message.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach(comp => comp.setDisabled(true));
                return newRow;
            });
            return interaction.update({ components: disabledRows });
        }

        if (interaction.customId.startsWith('ach_cat_')) {
            const selectedCategory = interaction.customId.split('_')[2];
            const newEmbed = buildCategoryEmbed(interaction.user, selectedCategory, unlockedIds);
            const newComponents = createControls(userId, selectedCategory);
            await interaction.update({ embeds: [newEmbed], components: newComponents });
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason !== 'closed') {
            try {
                const disabledRows = message.components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(comp => comp.setDisabled(true));
                    return newRow;
                });
                await message.edit({ components: disabledRows });
            } catch (error) {
                console.error('Failed to disable achievements controls after timeout:', error);
            }
        }
    });
}
