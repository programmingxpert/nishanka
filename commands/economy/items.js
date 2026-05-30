/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ITEMS, RARITIES } = require('../../utils/items');

const CATEGORIES = {
    boosters: { name: '⚡ Boosters', desc: 'Consumables, luck enhancers, and vault shields.' },
    cosmetics: { name: '🎨 Cosmetics', desc: 'Prestige items, nuggets, and profile titles.' },
    family: { name: '🏠 Family', desc: 'Commitment rings and adoption papers.' },
    dumpster: { name: '🗑️ Dumpster', desc: 'Trash finds and lucky/unlucky rabbit feet.' },
    fishing: { name: '🎣 Fishing', desc: 'Chests, urns, and slimy fish catches.' },
    digging: { name: '⛏️ Digging', desc: 'Fossils, mammoth bones, and skulls.' },
    memehunt: { name: '🐸 Meme Hunt', desc: 'Stale Pepes and legendary rickrolls.' },
    ducks: { name: '🦆 Ducks', desc: 'Collectible rubber ducks.' },
    computers: { name: '💻 Computers', desc: 'Mining rigs, quantum grids, and alien terminals.' },
    mythic: { name: '✨ Mythic', desc: 'High-value dragon eggs and void stars.' },
    unique: { name: '👑 Unique', desc: 'One-of-a-kind items (exactly 1 copy exists globally).' }
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
        .setColor(0x2b2d42) // Minimal dark-slate theme
        .setTimestamp();

    const normalizedFilter = filter && CATEGORIES[filter.trim().toLowerCase()] ? filter.trim().toLowerCase() : null;

    if (normalizedFilter) {
        const catInfo = CATEGORIES[normalizedFilter];
        embed.setTitle(`📖 Catalog: ${catInfo.name}`)
             .setDescription(`_${catInfo.desc}_\nUse \`-use <item_id>\` to activate them!\n\n`);

        const matchingItems = Object.values(ITEMS).filter(i => i.category === normalizedFilter);

        if (matchingItems.length === 0) {
            embed.setDescription(embed.data.description + '_No items in this category._');
        } else {
            const lines = [];
            for (const item of matchingItems) {
                const priceInfo = [];
                if (item.basePrice) priceInfo.push(`Buy: **${item.basePrice.toLocaleString()}**`);
                if (item.sellPrice) priceInfo.push(`Sell: **${item.sellPrice.toLocaleString()}**`);
                const pricesStr = priceInfo.length > 0 ? ` • ${priceInfo.join(' / ')}` : ' • Unbuyable';
                
                const useStr = item.useInfo ? `\n  ⚡ *Use:* _${item.useInfo}_` : '';
                
                lines.push(`• ${item.emoji} **${item.name}** (\`${item.id}\`)${pricesStr} [${item.rarity}]\n  ↳ _${item.description}_${useStr}`);
            }
            embed.setDescription(embed.data.description + lines.join('\n\n'));
        }
    } else {
        embed.setTitle('📖 Items Catalog')
             .setDescription('Use \`-items <category>\` to see specific item details.\n\n');

        const catLines = [];
        for (const [key, cat] of Object.entries(CATEGORIES)) {
            const count = Object.values(ITEMS).filter(i => i.category === key).length;
            catLines.push(`• **${cat.name}** (\`${key}\` • ${count} items)\n  ↳ _${cat.desc}_`);
        }

        embed.setDescription(embed.data.description + catLines.join('\n\n'));
    }

    return embed;
}
