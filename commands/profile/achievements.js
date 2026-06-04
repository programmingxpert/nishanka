/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Achievement = require('../../models/achievementSchema');
const { ACHIEVEMENTS, syncUserAchievements } = require('../../utils/achievements');

const CATEGORIES = {
    all: { label: 'All Achievements', emoji: '🏆', desc: 'Summary of all unlocked achievements.' },
    mines: { label: 'Minesweeper Milestones', emoji: '💣', desc: 'Achievements earned playing the Mines minigame.' },
    streaks: { label: 'Daily & Active Streaks', emoji: '🔥', desc: 'Milestones for persistent daily active play.' },
    casino: { label: 'Casino & Card Games', emoji: '🎰', desc: 'Milestones earned in Slots, Coinflip, and Blackjack.' },
    supporter: { label: 'Supporters & Pre-Release', emoji: '💎', desc: 'Trophies for premium support and early users.' },
    economy: { label: 'Wealth & Relics', emoji: '👑', desc: 'Milestones for wealth totals, tax tiers, and rare items.' }
};

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
            const runnerId = interaction.user.id;

            await syncUserAchievements(interaction.client, targetUser.id);

            const userUnlocked = await Achievement.find({ userId: targetUser.id }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

            const embed = buildCategoryEmbed(targetUser, 'all', userUnlocked, unlockedIds);
            const components = createControls(targetUser.id, runnerId, 'all');

            const reply = await interaction.reply({ embeds: [embed], components, fetchReply: true });
            createCategoryCollector(reply, targetUser, runnerId);
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

            const runnerId = message.author.id;

            await syncUserAchievements(message.client, targetUser.id);

            const userUnlocked = await Achievement.find({ userId: targetUser.id }).lean();
            const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

            const embed = buildCategoryEmbed(targetUser, 'all', userUnlocked, unlockedIds);
            const components = createControls(targetUser.id, runnerId, 'all');

            const reply = await message.reply({ embeds: [embed], components });
            createCategoryCollector(reply, targetUser, runnerId);
        } catch (error) {
            console.error('Error in achievements prefix command:', error);
            await message.reply('❌ An error occurred while fetching achievements.');
        }
    }
};

function buildCategoryEmbed(targetUser, currentCategory, userUnlocked, unlockedIds) {
    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = unlockedIds.size;
    const totalPct = totalCount > 0 ? ((unlockedCount / totalCount) * 100).toFixed(1) : '0.0';

    const categoryInfo = CATEGORIES[currentCategory];
    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🏆 ${targetUser.username}'s Unlocked Achievements`)
        .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
        .setFooter({ text: 'Unlock achievements by playing minigames, gaining streaks, and supporting us!' })
        .setTimestamp();

    if (unlockedCount === 0) {
        embed.setDescription(`This user has not unlocked any achievements yet.\n\nUse \`/profile achievements-list\` or \`-achievements-list\` to view all available achievements!`);
        return embed;
    }

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

        desc += `\n*Click any button below to see the specific unlocked achievements for that category!*`;
        embed.setDescription(desc);
    } else {
        const filteredAchievements = ACHIEVEMENTS.filter(ach => ach.category === currentCategory);
        const categoryTotal = filteredAchievements.length;
        const categoryUnlocked = filteredAchievements.filter(a => unlockedIds.has(a.id)).length;
        const categoryPct = categoryTotal > 0 ? ((categoryUnlocked / categoryTotal) * 100).toFixed(0) : '0';

        const descHeader = `*${categoryInfo.desc}*\n\n` +
            `Global Progress: **${unlockedCount} / ${totalCount}** unlocked (${totalPct}%)\n` +
            `Category Progress: **${categoryUnlocked} / ${categoryTotal}** unlocked (${categoryPct}%)\n\n`;

        const listLines = [];
        for (const ach of filteredAchievements) {
            if (unlockedIds.has(ach.id)) {
                const unlockData = userUnlocked.find(a => a.achievementId === ach.id);
                const unixTime = unlockData && unlockData.unlockedAt 
                    ? Math.floor(new Date(unlockData.unlockedAt).getTime() / 1000)
                    : Math.floor(Date.now() / 1000);
                const unlockedTime = `<t:${unixTime}:f> (<t:${unixTime}:R>)`;
                const typeLabel = ach.isBadge && ach.isAward ? 'Award & Badge' : ach.isBadge ? 'Badge' : 'Award';
                listLines.push(`**${ach.emoji} ${ach.name}**\n${ach.description}\n*Unlocked: ${unlockedTime} | Rarity: ${ach.rarity}% | ${typeLabel}*`);
            }
        }

        embed.setDescription(descHeader + (listLines.join('\n\n') || '_No achievements unlocked in this category yet._'));
    }
    return embed;
}

function createControls(targetUserId, runnerId, currentCategory) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ach_view_all_${targetUserId}_${runnerId}`)
            .setLabel('All')
            .setStyle(currentCategory === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId(`ach_view_mines_${targetUserId}_${runnerId}`)
            .setLabel('Mines')
            .setStyle(currentCategory === 'mines' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('💣'),
        new ButtonBuilder()
            .setCustomId(`ach_view_streaks_${targetUserId}_${runnerId}`)
            .setLabel('Streaks')
            .setStyle(currentCategory === 'streaks' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔥'),
        new ButtonBuilder()
            .setCustomId(`ach_view_casino_${targetUserId}_${runnerId}`)
            .setLabel('Casino')
            .setStyle(currentCategory === 'casino' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🎰'),
        new ButtonBuilder()
            .setCustomId(`ach_view_supporter_${targetUserId}_${runnerId}`)
            .setLabel('Supporter')
            .setStyle(currentCategory === 'supporter' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('💎')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ach_view_economy_${targetUserId}_${runnerId}`)
            .setLabel('Economy')
            .setStyle(currentCategory === 'economy' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('👑'),
        new ButtonBuilder()
            .setCustomId(`ach_view_close_${targetUserId}_${runnerId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    return [row1, row2];
}

function createCategoryCollector(message, targetUser, runnerId) {
    const collector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === runnerId,
        time: 120000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== runnerId) {
            return interaction.reply({ content: 'This view is only interactive for the user who ran the command.', ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const categoryOrClose = parts[2];

        if (categoryOrClose === 'close') {
            collector.stop('closed');
            const disabledRows = interaction.message.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach(comp => comp.setDisabled(true));
                return newRow;
            });
            return interaction.update({ components: disabledRows });
        }

        const userUnlocked = await Achievement.find({ userId: targetUser.id }).lean();
        const unlockedIds = new Set(userUnlocked.map(a => a.achievementId));

        const newEmbed = buildCategoryEmbed(targetUser, categoryOrClose, userUnlocked, unlockedIds);
        const newComponents = createControls(targetUser.id, runnerId, categoryOrClose);
        await interaction.update({ embeds: [newEmbed], components: newComponents });
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
                console.error('Failed to disable achievements view controls after timeout:', error);
            }
        }
    });
}
