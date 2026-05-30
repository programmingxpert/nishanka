/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ITEMS, RARITIES } = require('../../utils/items');

const CATEGORIES = {
    boosters: { name: '⚡ Boosters', desc: 'Consumables, luck enhancers, and wager shields.' },
    cosmetics: { name: '🎨 Cosmetics', desc: 'Prestige items, nuggets, and banner tools.' },
    family: { name: '🏠 Family', desc: 'Wedding rings and adoption papers.' },
    dumpster: { name: '🗑️ Dumpster', desc: 'Trash finds and funny rabbit feet.' },
    fishing: { name: '🎣 Fishing', desc: 'Chests, artifacts, and slimy catches.' },
    digging: { name: '⛏️ Digging', desc: 'Bones, shells, and massive skulls.' },
    memehunt: { name: '🐸 Meme Hunt', desc: 'Dead memes and legendary classics.' },
    ducks: { name: '🦆 Ducks', desc: 'Collectible rubber ducks.' },
    computers: { name: '💻 Computers', desc: 'Laptops, gaming PCs, and alien tech.' },
    mythic: { name: '✨ Mythic', desc: 'High-value treasures and boss drops.' },
    unique: { name: '👑 Unique', desc: 'One-of-a-kind items (only 1 exists globally).' }
};

module.exports = {
    category: 'economy',
    aliases: ['iteminfo', 'catalog', 'itemlist'],
    data: new SlashCommandBuilder()
        .setName('items')
        .setDescription('View the catalog of available items and what they do.')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter items by category')
                .setRequired(false)
                .addChoices(
                    { name: 'Boosters', value: 'boosters' },
                    { name: 'Cosmetics', value: 'cosmetics' },
                    { name: 'Family', value: 'family' },
                    { name: 'Dumpster', value: 'dumpster' },
                    { name: 'Fishing', value: 'fishing' },
                    { name: 'Digging', value: 'digging' },
                    { name: 'Meme Hunt', value: 'memehunt' },
                    { name: 'Ducks', value: 'ducks' },
                    { name: 'Computers', value: 'computers' },
                    { name: 'Mythic', value: 'mythic' },
                    { name: 'Unique', value: 'unique' }
                )),

    async execute(interaction) {
        try {
            const filter = interaction.options.getString('category');
            const embed = buildItemsEmbed(filter, interaction.user);
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in items command:', error);
            await interaction.reply({ content: '❌ An error occurred while retrieving the catalog.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const filter = args[0]?.toLowerCase();
            const embed = buildItemsEmbed(filter, message.author);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in items command (prefix):', error);
            await message.reply('❌ An error occurred while retrieving the catalog.');
        }
    }
};

function buildItemsEmbed(filter, user) {
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const normalizedFilter = filter && CATEGORIES[filter.trim().toLowerCase()] ? filter.trim().toLowerCase() : null;

    if (normalizedFilter) {
        const catInfo = CATEGORIES[normalizedFilter];
        embed.setTitle(`📖 Items Catalog: ${catInfo.name}`)
             .setDescription(`_${catInfo.desc}_\nUse \`-use <item_id>\` to activate them!`);

        const matchingItems = Object.values(ITEMS).filter(i => i.category === normalizedFilter);

        if (matchingItems.length === 0) {
            embed.addFields({ name: 'Items', value: '_No items in this category._' });
        } else {
            for (const item of matchingItems) {
                const priceInfo = [];
                if (item.basePrice) priceInfo.push(`Buy: **${item.basePrice.toLocaleString()}**`);
                if (item.sellPrice) priceInfo.push(`Sell: **${item.sellPrice.toLocaleString()}**`);
                const pricesStr = priceInfo.length > 0 ? ` (${priceInfo.join(' | ')})` : ' (Unbuyable)';

                const useStr = item.useInfo ? `\n⚡ **Use Effect:** _${item.useInfo}_` : '';

                embed.addFields({
                    name: `${item.name} \`(${item.id})\` [${item.rarity}]${pricesStr}`,
                    value: `_${item.description}_${useStr}`
                });
            }
        }
    } else {
        embed.setTitle('📖 Nishanka Items Catalog')
             .setDescription('View items available in Nishanka. Run \`-items <category>\` or \`/items [category]\` to see specific item details.');

        const catLines = [];
        for (const [key, cat] of Object.entries(CATEGORIES)) {
            const count = Object.values(ITEMS).filter(i => i.category === key).length;
            catLines.push(`**${cat.name}** (\`${key}\`) - _${cat.desc}_ (\`${count}\` items)`);
        }

        embed.addFields({ name: '📂 Categories', value: catLines.join('\n') });
    }

    return embed;
}
