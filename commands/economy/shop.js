/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');

// Define our shop items catalog with categories and premium pricing
const ITEMS = {
    // --- Economy & Utility Boosters ---
    coffee: {
        id: 'coffee',
        name: '☕ Energizing Coffee',
        emoji: '☕',
        description: 'Halves work (10s -> 5s) and scavenge (10m -> 5m) cooldowns for 30 minutes.',
        price: 15000,
        sellPrice: null,
        type: 'consumable',
        category: 'boosters'
    },
    clover: {
        id: 'clover',
        name: '🍀 Lucky Clover',
        emoji: '🍀',
        description: 'Increases Coinflip and Gamble win rates by 10% for 15 minutes.',
        price: 30000,
        sellPrice: null,
        type: 'consumable',
        category: 'boosters'
    },
    shield: {
        id: 'shield',
        name: '🛡️ Aegis Shield',
        emoji: '🛡️',
        description: 'Passive. Protects you from wager loss on your next failed Brawl duel (consumed on use).',
        price: 100000,
        sellPrice: null,
        type: 'collectible',
        category: 'boosters'
    },
    mystery_box: {
        id: 'mystery_box',
        name: '📦 Mystery Box',
        emoji: '📦',
        description: 'Open to win Coffee, Clovers, Aegis Shields, or bonus Baubles.',
        price: 25000,
        sellPrice: null,
        type: 'consumable',
        category: 'boosters'
    },

    // --- Cosmetics & Premium Collectibles ---
    tag: {
        id: 'tag',
        name: '🏷️ Custom Tag',
        emoji: '🏷️',
        description: 'Cosmetic. Gives you a custom tag role in the server (ask an admin to apply!).',
        price: 50000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics'
    },
    paintbrush: {
        id: 'paintbrush',
        name: '🎨 Profile Paintbrush',
        emoji: '🎨',
        description: 'Cosmetic tool. Required to customize profile banners (color and URL) using /profile-edit.',
        price: 120000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics'
    },
    nugget: {
        id: 'nugget',
        name: '💎 Golden Nugget',
        emoji: '💎',
        description: 'A premium gold chunk. High value for selling back (150,000 Baubles) or gifting.',
        price: 250000,
        sellPrice: 150000,
        type: 'collectible',
        category: 'cosmetics'
    },
    crown: {
        id: 'crown',
        name: '👑 Crown of Royalty',
        emoji: '👑',
        description: 'The ultimate status symbol of absolute wealth. Displays proudly in your inventory.',
        price: 2500000,
        sellPrice: null,
        type: 'collectible',
        category: 'cosmetics'
    }
};

async function executePurchase(userId, itemId, quantity, baubleData) {
    const item = ITEMS[itemId];
    if (!item) return { error: '❌ Invalid item ID.' };

    const totalPrice = item.price * quantity;
    if (baubleData.baubles < totalPrice) {
        return { error: `❌ You need **${totalPrice.toLocaleString()}** Baubles to buy **${quantity}x ${item.name}**, but you only have **${baubleData.baubles.toLocaleString()}**.` };
    }

    baubleData.baubles -= totalPrice;

    if (!baubleData.inventory) baubleData.inventory = [];
    const invItem = baubleData.inventory.find(i => i.itemId === itemId);
    if (invItem) {
        invItem.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }

    await baubleData.save();
    return { success: true, totalPrice, itemName: item.name };
}

module.exports = {
    category: 'economy',
    ITEMS,
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse and purchase items using your Glimmering Baubles.')
        .addStringOption(option =>
            option.setName('buy')
                .setDescription('The ID of the item you want to buy')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items you want to buy')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const buyOption = interaction.options.getString('buy');
            const quantityOption = interaction.options.getInteger('quantity') || 1;

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            // Direct purchase via command options
            if (buyOption) {
                const cleanId = buyOption.trim().toLowerCase();
                const result = await executePurchase(userId, cleanId, quantityOption, baubleData);
                if (result.error) {
                    return interaction.reply({ content: result.error, ephemeral: true });
                }
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(`You successfully purchased **${quantityOption}x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!`)
                    .addFields(
                        { name: '💰 Remaining Balance', value: `${baubleData.baubles.toLocaleString()} Baubles`, inline: true },
                        { name: '🎒 Action', value: 'Use `/inventory` to view your items, or `/use <item>` to activate them!', inline: true }
                    )
                    .setTimestamp();
                return interaction.reply({ embeds: [successEmbed] });
            }

            // Interactive catalog menu
            const boostersList = Object.values(ITEMS)
                .filter(item => item.category === 'boosters')
                .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${item.price.toLocaleString()}** Baubles\n_${item.description}_`)
                .join('\n\n');

            const cosmeticsList = Object.values(ITEMS)
                .filter(item => item.category === 'cosmetics')
                .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${item.price.toLocaleString()}** Baubles\n_${item.description}_`)
                .join('\n\n');

            const shopEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🛍️ Glimmering Bauble Shop')
                .setDescription(`You currently have **${baubleData.baubles.toLocaleString()}** Baubles.`)
                .addFields(
                    { name: '⚡ Economy & Utility Boosters', value: boostersList },
                    { name: '🎨 Cosmetics & Premium Collectibles', value: cosmeticsList }
                )
                .setFooter({ text: 'Use /shop buy:<id> to purchase items instantly.' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_select')
                .setPlaceholder('Select an item to buy 1x')
                .addOptions(
                    Object.values(ITEMS).map(item => ({
                        label: item.name.replace(/^[^\s]+\s+/, ''),
                        description: `${item.price.toLocaleString()} Baubles - ${item.description.substring(0, 50)}`,
                        value: item.id
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const response = await interaction.reply({ embeds: [shopEmbed], components: [row], fetchReply: true });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: i => i.user.id === userId && i.customId === 'shop_select',
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                const selectedId = i.values[0];
                const freshData = await Bauble.findOne({ userId });
                const result = await executePurchase(userId, selectedId, 1, freshData);
                
                if (result.error) {
                    return i.reply({ content: result.error, ephemeral: true });
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(`You successfully purchased **1x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!\n\nYour new balance is **${freshData.baubles.toLocaleString()}** Baubles.`)
                    .setFooter({ text: 'Use /inventory to view your items.' })
                    .setTimestamp();

                await i.update({ embeds: [resultEmbed], components: [] });
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Error in shop command:', error);
            await interaction.reply({ content: '❌ An error occurred while accessing the shop.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            // Support prefix syntax: -shop buy <item> [quantity]
            if (args[0] === 'buy') {
                const itemId = args[1]?.toLowerCase();
                const quantity = parseInt(args[2]) || 1;

                if (!itemId) return message.reply('⚠️ Please specify an item to buy. Example: `-shop buy coffee 2`');
                if (!ITEMS[itemId]) return message.reply(`⚠️ Invalid item. Choose from: ${Object.keys(ITEMS).join(', ')}`);

                const result = await executePurchase(userId, itemId, quantity, baubleData);
                if (result.error) return message.reply(result.error);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(`You successfully purchased **${quantity}x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!\n\nNew Balance: **${baubleData.baubles.toLocaleString()}** Baubles.`)
                    .setTimestamp();
                return message.reply({ embeds: [successEmbed] });
            }

            // Default display
            const boostersList = Object.values(ITEMS)
                .filter(item => item.category === 'boosters')
                .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${item.price.toLocaleString()}** Baubles\n_${item.description}_`)
                .join('\n\n');

            const cosmeticsList = Object.values(ITEMS)
                .filter(item => item.category === 'cosmetics')
                .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${item.price.toLocaleString()}** Baubles\n_${item.description}_`)
                .join('\n\n');

            const shopEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🛍️ Glimmering Bauble Shop')
                .setDescription(`You currently have **${baubleData.baubles.toLocaleString()}** Baubles.`)
                .addFields(
                    { name: '⚡ Economy & Utility Boosters', value: boostersList },
                    { name: '🎨 Cosmetics & Premium Collectibles', value: cosmeticsList }
                )
                .setFooter({ text: 'Type "-shop buy <id> [quantity]" to purchase items.' });

            await message.reply({ embeds: [shopEmbed] });
        } catch (error) {
            console.error('Error in shop command:', error);
            await message.reply('❌ An error occurred while accessing the shop.');
        }
    }
};