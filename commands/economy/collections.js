/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { COLLECTIONS, ITEMS, checkCollections } = require('../../utils/items');

module.exports = {
    category: 'economy',
    aliases: ['col', 'collection'],
    data: new SlashCommandBuilder()
        .setName('collections')
        .setDescription('View your items collection progress and completion rewards.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            // Run completion check first
            await checkCollections(baubleData);

            const embed = buildCollectionsEmbed(baubleData, interaction.user);
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in collections command:', error);
            await interaction.reply({ content: '❌ An error occurred while retrieving collections.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            // Run completion check first
            await checkCollections(baubleData);

            const embed = buildCollectionsEmbed(baubleData, message.author);
            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in collections command (prefix):', error);
            await message.reply('❌ An error occurred while retrieving collections.');
        }
    }
};

function buildCollectionsEmbed(baubleData, user) {
    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Collections Checklist')
        .setDescription('Acquire all items in a set to auto-claim unique titles, bauble prizes, and income boosts!')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const inventoryMap = new Map();
    if (baubleData.inventory) {
        for (const item of baubleData.inventory) {
            if (item.quantity > 0) {
                inventoryMap.set(item.itemId, item.quantity);
            }
        }
    }

    const completed = baubleData.completedCollections || [];

    for (const [colId, col] of Object.entries(COLLECTIONS)) {
        const itemLines = [];
        let ownedCount = 0;

        for (const itemId of col.items) {
            const item = ITEMS[itemId];
            const hasItem = inventoryMap.has(itemId);
            if (hasItem) ownedCount++;
            
            const checkbox = hasItem ? '✅' : '❌';
            itemLines.push(`${checkbox} **${item.name}** \`[${item.rarity}]\``);
        }

        const isCompleted = completed.includes(colId);
        const statusHeader = isCompleted 
            ? '🏆 **Completed**' 
            : `📊 **Progress: ${ownedCount}/${col.items.length}**`;

        // Rewards string
        const rewards = [];
        if (col.reward.title) rewards.push(`Title: \`[${col.reward.title}]\``);
        if (col.reward.incomeMultiplier > 0) rewards.push(`+${Math.round(col.reward.incomeMultiplier * 100)}% Income`);
        if (col.reward.baubles > 0) rewards.push(`${col.reward.baubles.toLocaleString()} Baubles`);

        embed.addFields({
            name: `${col.name} (${statusHeader})`,
            value: `_${col.description}_\n` + itemLines.join('\n') + `\n🎁 **Rewards:** ${rewards.join(' | ')}`
        });
    }

    return embed;
}
