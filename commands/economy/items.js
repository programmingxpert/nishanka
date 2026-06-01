/* eslint-disable */
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ComponentType 
} = require('discord.js');
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

// Priority order for categories shown in first embed
const PRIORITY_CATEGORIES = ['boosters', 'cosmetics', 'computers', 'mythic', 'unique', 'family'];

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
            if (filter) {
                const embed = buildItemsEmbed(filter, interaction.user);
                return interaction.reply({ embeds: [embed] });
            } else {
                await sendItemsCatalog(interaction);
            }
        } catch (error) {
            console.error('Error in items command:', error);
            await interaction.reply({ content: '❌ An error occurred while retrieving the catalog.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const filter = args[0]?.toLowerCase();
            if (filter) {
                const embed = buildItemsEmbed(filter, message.author);
                return message.reply({ embeds: [embed] });
            } else {
                await sendItemsCatalogPrefix(message);
            }
        } catch (error) {
            console.error('Error in items command (prefix):', error);
            await message.reply('❌ An error occurred while retrieving the catalog.');
        }
    }
};

async function sendItemsCatalog(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setTitle('📖 Item Catalog')
        .setDescription(
            '**Select a category below to browse items.**\n\n' +
            '🌟 *Popular Categories:*\n' +
            PRIORITY_CATEGORIES.map(key => {
                const cat = CATEGORIES[key];
                const count = Object.values(ITEMS).filter(i => i.category === key).length;
                return `• **${cat.name}** (${count} items)`;
            }).join('\n')
        )
        .setFooter({ text: 'Use the dropdown to explore all 11 categories' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('items-category-select')
        .setPlaceholder('📂 Choose an item category')
        .addOptions(
            Object.entries(CATEGORIES).map(([key, cat]) => {
                const count = Object.values(ITEMS).filter(i => i.category === key).length;
                return {
                    label: cat.name,
                    value: key,
                    description: `${count} items • ${cat.desc}`,
                };
            })
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false,
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 600000, // 10 minutes
    });

    collector.on('collect', async (selectInteraction) => {
        try {
            await selectInteraction.deferUpdate();
            const selected = selectInteraction.values[0];
            const itemEmbed = buildItemsEmbed(selected);
            await selectInteraction.editReply({
                embeds: [itemEmbed],
                components: [row],
            });
        } catch (error) {
            console.error('Error in items dropdown:', error);
            await selectInteraction.followUp({ 
                content: '❌ An error occurred.', 
                ephemeral: true 
            }).catch(() => {});
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            reply.edit({ components: [] }).catch(console.error);
        }
    });
}

async function sendItemsCatalogPrefix(message) {
    const embed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setTitle('📖 Item Catalog')
        .setDescription(
            '**Select a category below to browse items.**\n\n' +
            '🌟 *Popular Categories:*\n' +
            PRIORITY_CATEGORIES.map(key => {
                const cat = CATEGORIES[key];
                const count = Object.values(ITEMS).filter(i => i.category === key).length;
                return `• **${cat.name}** (${count} items)`;
            }).join('\n')
        )
        .setFooter({ text: 'Use the dropdown to explore all 11 categories' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`items-prefix-${message.author.id}`)
        .setPlaceholder('📂 Choose an item category')
        .addOptions(
            Object.entries(CATEGORIES).map(([key, cat]) => {
                const count = Object.values(ITEMS).filter(i => i.category === key).length;

                return {
                    label: cat.name.replace(/[^\w\s]/g, '').trim(),
                    value: key,
                    description: `${count} items • ${cat.desc}`.slice(0, 100)
                };
            })
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const sentMessage = await message.reply({
        embeds: [embed],
        components: [row]
    });

    const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 600000
    });

    collector.on('collect', async interaction => {
        try {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: '❌ Only the command author can use this menu.',
                    ephemeral: true
                });
            }

            const selected = interaction.values[0];
            const itemEmbed = buildItemsEmbed(selected);

            await interaction.update({
                embeds: [itemEmbed],
                components: [row]
            });
        } catch (err) {
            console.error('Prefix items dropdown error:', err);
        }
    });

    collector.on('end', async () => {
        try {
            await sentMessage.edit({
                components: []
            });
        } catch {}
    });
}

function buildItemsEmbed(filter) {
    const embed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setTimestamp();

    const normalizedFilter = filter && CATEGORIES[filter.trim().toLowerCase()] ? filter.trim().toLowerCase() : null;

    if (normalizedFilter) {
        const catInfo = CATEGORIES[normalizedFilter];
        embed.setTitle(`${catInfo.name}`)
             .setDescription(`_${catInfo.desc}_\n\n`);

        const matchingItems = Object.values(ITEMS).filter(i => i.category === normalizedFilter);

        if (matchingItems.length === 0) {
            embed.setDescription(embed.data.description + '_No items in this category._');
        } else {
            const lines = [];
            for (const item of matchingItems) {
                const priceInfo = [];
                if (item.basePrice) priceInfo.push(`Buy: **${item.basePrice.toLocaleString()}**`);
                if (item.sellPrice) priceInfo.push(`Sell: **${item.sellPrice.toLocaleString()}**`);
                
                const pricesStr = priceInfo.length > 0 
                    ? `\n  💰 ${priceInfo.join('  •  ')}` 
                    : '\n  💰 Unbuyable';
                
                const useStr = item.useInfo ? `\n  ⚡ *Use:* _${item.useInfo}_` : '';
                
                const displayName = item.name.startsWith(item.emoji) ? item.name : `${item.emoji} ${item.name}`;
                
                lines.push(`• **${displayName}** (\`${item.id}\`) [${item.rarity}]${pricesStr}\n  ↳ _${item.description}_${useStr}`);
            }
            embed.setDescription(embed.data.description + lines.join('\n\n'));
        }
    }

    return embed;
}
