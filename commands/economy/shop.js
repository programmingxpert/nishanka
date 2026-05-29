/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

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
    padlock: {
        id: 'padlock',
        name: '🔒 Safe Padlock',
        emoji: '🔒',
        description: 'Passive. Protects your wallet from being robbed once. Consumed on successful defense.',
        price: 25000,
        sellPrice: null,
        type: 'collectible',
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
        category: 'cosmetics',
        giftable: false
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
        category: 'cosmetics',
        giftable: false
    }
};

async function executePurchase(userId, itemId, quantity, baubleData, globalMultiplier) {
    const item = ITEMS[itemId];
    if (!item) return { error: '❌ Invalid item ID.' };

    const dynamicPrice = Math.floor(item.basePrice / globalMultiplier);
    const totalPrice = dynamicPrice * quantity;
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

// Embed and component helper functions for pagination
function getHomePageEmbed(baubles, globalMultiplier) {
    return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🛍️ Glimmering Bauble Shop')
        .setDescription(
            `Spend your hard-earned **Glimmering Baubles** here!\n\n` +
            `💰 **Your Balance:** **${baubles.toLocaleString()}** Baubles\n` +
            `📈 **Economy Multiplier:** **${globalMultiplier.toFixed(2)}x** (Prices scale inversely with the multiplier)\n\n` +
            `Please select a category button below to browse items:\n` +
            `⚡ **Economy & Utility Boosters:** Lower cooldowns, boost gamble win rates, and protect wagers.\n` +
            `🎨 **Cosmetics & Collectibles:** Flaunt your status, customize profile banners, and stand out.`
        )
        .addFields({
            name: '🛍️ How to Buy Items',
            value: `1️⃣ Select a category using the buttons below.\n` +
                   `2️⃣ Choose an item from the dropdown menu to purchase **1x** instantly!\n` +
                   `*Or buy directly:* \`/shop buy:<id> [quantity]\` or \`-shop buy <id> [quantity]\``
        })
        .setFooter({ text: 'Select a category below to browse items.' });
}

function getHomePageComponents() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop_btn_boosters')
            .setLabel('⚡ Boosters')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_btn_cosmetics')
            .setLabel('🎨 Cosmetics & Profile')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('shop_btn_help')
            .setLabel('❓ Help Guide')
            .setStyle(ButtonStyle.Secondary)
    );
    return [row];
}

function getBoostersPageEmbed(baubles, globalMultiplier) {
    const list = Object.values(ITEMS)
        .filter(item => item.category === 'boosters')
        .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${Math.floor(item.basePrice / globalMultiplier).toLocaleString()}** Baubles\n_${item.description}_`)
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('⚡ Shop: Economy & Utility Boosters')
        .setDescription(`💰 **Your Balance:** **${baubles.toLocaleString()}** Baubles\n\n${list}`)
        .setFooter({ text: 'Select a booster from the dropdown below to buy 1x.' });
}

function getBoostersComponents(globalMultiplier) {
    const items = Object.values(ITEMS).filter(item => item.category === 'boosters');
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select_buy')
        .setPlaceholder('Select an item to buy 1x')
        .addOptions(
            items.map(item => ({
                label: item.name.replace(/^[^\s]+\s+/, ''),
                description: `${Math.floor(item.basePrice / globalMultiplier).toLocaleString()} Baubles - ${item.description.substring(0, 50)}`,
                value: item.id
            }))
        );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop_btn_home')
            .setLabel('⬅️ Back to Categories')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('shop_btn_cosmetics')
            .setLabel('🎨 Cosmetics & Profile')
            .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2];
}

function getCosmeticsPageEmbed(baubles, globalMultiplier) {
    const list = Object.values(ITEMS)
        .filter(item => item.category === 'cosmetics')
        .map(item => {
            const giftableSuffix = item.giftable === false ? ' 🔒 *Non-giftable*' : '';
            return `**${item.name}** (\`${item.id}\`)\nPrice: **${Math.floor(item.basePrice / globalMultiplier).toLocaleString()}** Baubles\n_${item.description}_${giftableSuffix}`;
        })
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🎨 Shop: Cosmetics & Premium Collectibles')
        .setDescription(`💰 **Your Balance:** **${baubles.toLocaleString()}** Baubles\n\n${list}`)
        .setFooter({ text: 'Select an item from the dropdown below to buy 1x.' });
}

function getCosmeticsComponents(globalMultiplier) {
    const items = Object.values(ITEMS).filter(item => item.category === 'cosmetics');

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select_buy')
        .setPlaceholder('Select an item to buy 1x')
        .addOptions(
            items.map(item => ({
                label: item.name.replace(/^[^\s]+\s+/, ''),
                description: `${Math.floor(item.basePrice / globalMultiplier).toLocaleString()} Baubles - ${item.description.substring(0, 50)}`,
                value: item.id
            }))
        );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop_btn_home')
            .setLabel('⬅️ Back to Categories')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('shop_btn_boosters')
            .setLabel('⚡ Boosters')
            .setStyle(ButtonStyle.Success)
    );

    return [row1, row2];
}

function getHelpPageEmbed(baubles, globalMultiplier) {
    return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🛍️ Shop: Help & FAQ')
        .setDescription(
            `**🛒 How to purchase items from the catalog:**\n\n` +
            `**Method A: Dropdown Menu (Interactive)**\n` +
            `1. Click on the \`⚡ Boosters\` or \`🎨 Cosmetics\` category buttons.\n` +
            `2. Select any item from the dropdown list to purchase exactly **1x** of that item instantly.\n\n` +
            `**Method B: Slash Command (Fast)**\n` +
            `- Use \`/shop buy:<item_id> quantity:<num>\`\n` +
            `- *Example:* \`/shop buy:coffee quantity:2\`\n\n` +
            `**Method C: Prefix Command (Fast)**\n` +
            `- Use \`-shop buy <item_id> [quantity]\`\n` +
            `- *Example:* \`-shop buy coffee 2\`\n\n` +
            `**💸 Economy Rules & Constraints:**\n` +
            `- **Gifting:** Use \`/gift\` to send items to friends with a custom message. Note that select items like Custom Tags and Crown of Royalty are non-giftable.\n` +
            `- **Selling:** Only the Golden Nugget can be sold back to the shop using \`/sell\` (refunds **150,000** Baubles). All other items are non-sellable.`
        )
        .setFooter({ text: 'Use the buttons below to browse items.' });
}

function getHelpComponents() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop_btn_home')
            .setLabel('⬅️ Back to Categories')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('shop_btn_boosters')
            .setLabel('⚡ Boosters')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_btn_cosmetics')
            .setLabel('🎨 Cosmetics & Profile')
            .setStyle(ButtonStyle.Primary)
    );
    return [row];
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

            const globalMultiplier = await getGlobalMultiplier();
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            // Direct purchase via command options
            if (buyOption) {
                const cleanId = buyOption.trim().toLowerCase();
                const result = await executePurchase(userId, cleanId, quantityOption, baubleData, globalMultiplier);
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

            // Interactive catalog menu starting at 'home'
            let currentPage = 'home';

            function getPageData(page, baubles, globalMultiplier) {
                switch (page) {
                    case 'home':
                        return { embeds: [getHomePageEmbed(baubles, globalMultiplier)], components: getHomePageComponents() };
                    case 'boosters':
                        return { embeds: [getBoostersPageEmbed(baubles, globalMultiplier)], components: getBoostersComponents(globalMultiplier) };
                    case 'cosmetics':
                        return { embeds: [getCosmeticsPageEmbed(baubles, globalMultiplier)], components: getCosmeticsComponents(globalMultiplier) };
                    case 'help':
                        return { embeds: [getHelpPageEmbed(baubles, globalMultiplier)], components: getHelpComponents() };
                }
            }

            const initialData = getPageData(currentPage, baubleData.baubles, globalMultiplier);
            const response = await interaction.reply({
                embeds: initialData.embeds,
                components: initialData.components,
                fetchReply: true
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId,
                time: 60000
            });

            collector.on('collect', async i => {
                collector.resetTimer();

                if (i.isButton()) {
                    const btnId = i.customId;
                    if (btnId === 'shop_btn_home') currentPage = 'home';
                    else if (btnId === 'shop_btn_boosters') currentPage = 'boosters';
                    else if (btnId === 'shop_btn_cosmetics') currentPage = 'cosmetics';
                    else if (btnId === 'shop_btn_help') currentPage = 'help';

                    const freshMultiplier = await getGlobalMultiplier();
                    const freshData = await Bauble.findOne({ userId }) || { baubles: 0 };
                    const pageData = getPageData(currentPage, freshData.baubles, freshMultiplier);
                    await i.update({
                        embeds: pageData.embeds,
                        components: pageData.components
                    });
                } else if (i.isStringSelectMenu() && i.customId === 'shop_select_buy') {
                    const selectedId = i.values[0];
                    const freshMultiplier = await getGlobalMultiplier();
                    const freshData = await Bauble.findOne({ userId });
                    const result = await executePurchase(userId, selectedId, 1, freshData, freshMultiplier);
                    
                    if (result.error) {
                        return i.reply({ content: result.error, ephemeral: true });
                    }

                    // Success reply
                    await i.reply({
                        content: `🛍️ **Purchase Successful!** You bought **1x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles.`,
                        ephemeral: true
                    });

                    // Update main shop embed with new balance
                    const pageData = getPageData(currentPage, freshData.baubles, freshMultiplier);
                    await interaction.editReply({
                        embeds: pageData.embeds,
                        components: pageData.components
                    });
                }
            });

            collector.on('end', (_, reason) => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in shop command:', error);
            await interaction.reply({ content: '❌ An error occurred while accessing the shop.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const globalMultiplier = await getGlobalMultiplier();
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

                const result = await executePurchase(userId, itemId, quantity, baubleData, globalMultiplier);
                if (result.error) return message.reply(result.error);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(`You successfully purchased **${quantity}x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!\n\nNew Balance: **${baubleData.baubles.toLocaleString()}** Baubles.`)
                    .setTimestamp();
                return message.reply({ embeds: [successEmbed] });
            }

            // Interactive catalog menu starting at 'home'
            let currentPage = 'home';

            function getPageData(page, baubles, globalMultiplier) {
                switch (page) {
                    case 'home':
                        return { embeds: [getHomePageEmbed(baubles, globalMultiplier)], components: getHomePageComponents() };
                    case 'boosters':
                        return { embeds: [getBoostersPageEmbed(baubles, globalMultiplier)], components: getBoostersComponents(globalMultiplier) };
                    case 'cosmetics':
                        return { embeds: [getCosmeticsPageEmbed(baubles, globalMultiplier)], components: getCosmeticsComponents(globalMultiplier) };
                    case 'help':
                        return { embeds: [getHelpPageEmbed(baubles, globalMultiplier)], components: getHelpComponents() };
                }
            }

            const initialData = getPageData(currentPage, baubleData.baubles, globalMultiplier);
            const response = await message.reply({
                embeds: initialData.embeds,
                components: initialData.components
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId,
                time: 60000
            });

            collector.on('collect', async i => {
                collector.resetTimer();

                if (i.isButton()) {
                    const btnId = i.customId;
                    if (btnId === 'shop_btn_home') currentPage = 'home';
                    else if (btnId === 'shop_btn_boosters') currentPage = 'boosters';
                    else if (btnId === 'shop_btn_cosmetics') currentPage = 'cosmetics';
                    else if (btnId === 'shop_btn_help') currentPage = 'help';

                    const freshMultiplier = await getGlobalMultiplier();
                    const freshData = await Bauble.findOne({ userId }) || { baubles: 0 };
                    const pageData = getPageData(currentPage, freshData.baubles, freshMultiplier);
                    await i.update({
                        embeds: pageData.embeds,
                        components: pageData.components
                    });
                } else if (i.isStringSelectMenu() && i.customId === 'shop_select_buy') {
                    const selectedId = i.values[0];
                    const freshMultiplier = await getGlobalMultiplier();
                    const freshData = await Bauble.findOne({ userId });
                    const result = await executePurchase(userId, selectedId, 1, freshData, freshMultiplier);
                    
                    if (result.error) {
                        return i.reply({ content: result.error, ephemeral: true });
                    }

                    // Success reply (ephemeral is fine for components collected from prefix messages!)
                    await i.reply({
                        content: `🛍️ **Purchase Successful!** You bought **1x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles.`,
                        ephemeral: true
                    });

                    // Update main shop embed with new balance
                    const pageData = getPageData(currentPage, freshData.baubles, freshMultiplier);
                    await response.edit({
                        embeds: pageData.embeds,
                        components: pageData.components
                    });
                }
            });

            collector.on('end', (_, reason) => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in shop command (prefix):', error);
            await message.reply('❌ An error occurred while accessing the shop.');
        }
    }
};