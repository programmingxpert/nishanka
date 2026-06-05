/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Achievement = require('../../models/achievementSchema');
const { ACHIEVEMENTS, syncUserAchievements } = require('../../utils/achievements');

const CATEGORIES = {
    all: { label: 'All Achievements', emoji: '🏆', desc: 'Complete list of all global accolades.' },
    mines: { label: 'Minesweeper Milestones', emoji: '💣', desc: 'Achievements earned playing the Mines minigame.' },
    streaks: { label: 'Daily & Active Streaks', emoji: '🔥', desc: 'Milestones for persistent daily active play.' },
    casino: { label: 'Casino & Card Games', emoji: '🎰', desc: 'Milestones earned in Slots, Coinflip, and Blackjack.' },
    supporter: { label: 'Supporters & Pre-Release', emoji: '💎', desc: 'Trophies for premium support and early users.' },
    economy: { label: 'Wealth & Relics', emoji: '👑', desc: 'Milestones for wealth totals, tax tiers, and robberies.' },
    minigames: { label: 'Minigames & Wordplays', emoji: '🎮', desc: 'Accolades for Scramble, Word Bomb, and Emoji Decode.' }
};

const PAGE_SIZE = 5;

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

            const totalPages = Math.ceil(ACHIEVEMENTS.length / PAGE_SIZE) || 1;
            const embed = buildCategoryEmbed(interaction.user, 'all', unlockedIds, 0);
            const components = createControls(userId, 'all', 0, totalPages);

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

            const totalPages = Math.ceil(ACHIEVEMENTS.length / PAGE_SIZE) || 1;
            const embed = buildCategoryEmbed(message.author, 'all', unlockedIds, 0);
            const components = createControls(userId, 'all', 0, totalPages);

            const reply = await message.reply({ embeds: [embed], components });
            createCategoryCollector(reply, userId, unlockedIds);
        } catch (error) {
            console.error('Error in achievements-list prefix command:', error);
            await message.reply('❌ An error occurred while fetching the achievements list.');
        }
    }
};

function buildCategoryEmbed(user, currentCategory, unlockedIds, page = 0) {
    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = unlockedIds.size;
    const totalPct = totalCount > 0 ? ((unlockedCount / totalCount) * 100).toFixed(1) : '0.0';

    const categoryInfo = CATEGORIES[currentCategory];
    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`${categoryInfo.emoji} ${categoryInfo.label}`)
        .setTimestamp();

    if (currentCategory === 'all') {
        const filteredAchievements = ACHIEVEMENTS;
        const categoryTotal = filteredAchievements.length;
        const totalPages = Math.ceil(categoryTotal / PAGE_SIZE) || 1;
        const clampedPage = Math.max(0, Math.min(page, totalPages - 1));

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

        desc += `\n**Global Achievements List (Page ${clampedPage + 1}/${totalPages}):**\n\n`;

        const sliced = filteredAchievements.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

        const listLines = sliced.map(ach => {
            const isOwned = unlockedIds.has(ach.id);
            const typeLabel = ach.isBadge && ach.isAward ? 'Award & Badge' : ach.isBadge ? 'Badge' : 'Award';
            if (isOwned) {
                return `✅ ~~${ach.emoji} **${ach.name}** (${CATEGORIES[ach.category]?.label || ach.category}): ${ach.description}~~ *(Owned | ${typeLabel})*`;
            } else {
                return `🔒 ${ach.emoji} **${ach.name}** (${CATEGORIES[ach.category]?.label || ach.category}): ${ach.description} *(Rarity: ${ach.rarity}% | ${typeLabel})*`;
            }
        });

        embed.setDescription(desc + (listLines.join('\n\n') || '_No achievements in this category._'));
        embed.setFooter({ text: `Page ${clampedPage + 1}/${totalPages} • Use buttons below to switch categories or page` });
    } else {
        const filteredAchievements = ACHIEVEMENTS.filter(ach => ach.category === currentCategory);
        const categoryTotal = filteredAchievements.length;
        const categoryUnlocked = filteredAchievements.filter(a => unlockedIds.has(a.id)).length;
        const categoryPct = categoryTotal > 0 ? ((categoryUnlocked / categoryTotal) * 100).toFixed(0) : '0';

        const totalPages = Math.ceil(categoryTotal / PAGE_SIZE) || 1;
        const clampedPage = Math.max(0, Math.min(page, totalPages - 1));

        const descHeader = `*${categoryInfo.desc}*\n\n` +
            `Global Progress: **${unlockedCount} / ${totalCount}** unlocked (${totalPct}%)\n` +
            `Category Progress: **${categoryUnlocked} / ${categoryTotal}** unlocked (${categoryPct}%)\n\n` +
            `Owned achievements are ~~struck out~~.\n\n`;

        const sliced = filteredAchievements.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

        const listLines = sliced.map(ach => {
            const isOwned = unlockedIds.has(ach.id);
            const typeLabel = ach.isBadge && ach.isAward ? 'Award & Badge' : ach.isBadge ? 'Badge' : 'Award';
            if (isOwned) {
                return `✅ ~~${ach.emoji} **${ach.name}**: ${ach.description}~~ *(Owned | ${typeLabel})*`;
            } else {
                return `🔒 ${ach.emoji} **${ach.name}**: ${ach.description} *(Rarity: ${ach.rarity}% | ${typeLabel})*`;
            }
        });

        embed.setDescription(descHeader + (listLines.join('\n\n') || '_No achievements in this category._'));
        embed.setFooter({ text: `Page ${clampedPage + 1}/${totalPages} • Use buttons below to switch categories or page` });
    }
    return embed;
}

function createControls(userId, currentCategory, page = 0, totalPages = 1) {
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
            .setCustomId(`ach_cat_minigames_${userId}`)
            .setLabel('Minigames')
            .setStyle(currentCategory === 'minigames' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🎮'),
        new ButtonBuilder()
            .setCustomId(`ach_close_${userId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    const rows = [row1, row2];

    if (totalPages > 1) {
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ach_page_${currentCategory}_${page - 1}_${userId}`)
                .setLabel('Prev Page')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⬅️')
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId(`ach_page_${currentCategory}_${page + 1}_${userId}`)
                .setLabel('Next Page')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➡️')
                .setDisabled(page >= totalPages - 1)
        );
        rows.push(row3);
    }

    return rows;
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
            const filteredAchievements = selectedCategory === 'all'
                ? ACHIEVEMENTS
                : ACHIEVEMENTS.filter(ach => ach.category === selectedCategory);
            const totalPages = Math.ceil(filteredAchievements.length / PAGE_SIZE) || 1;

            const newEmbed = buildCategoryEmbed(interaction.user, selectedCategory, unlockedIds, 0);
            const newComponents = createControls(userId, selectedCategory, 0, totalPages);
            await interaction.update({ embeds: [newEmbed], components: newComponents });
        }
        else if (interaction.customId.startsWith('ach_page_')) {
            const parts = interaction.customId.split('_');
            const selectedCategory = parts[2];
            const pageIndex = parseInt(parts[3], 10);
            const filteredAchievements = selectedCategory === 'all'
                ? ACHIEVEMENTS
                : ACHIEVEMENTS.filter(ach => ach.category === selectedCategory);
            const totalPages = Math.ceil(filteredAchievements.length / PAGE_SIZE) || 1;

            const newEmbed = buildCategoryEmbed(interaction.user, selectedCategory, unlockedIds, pageIndex);
            const newComponents = createControls(userId, selectedCategory, pageIndex, totalPages);
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
