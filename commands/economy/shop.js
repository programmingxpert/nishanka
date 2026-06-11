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

// Define our shop items catalog with categories and premium pricing
const { ITEMS } = require('../../utils/items');

async function executePurchase(userId, itemId, quantity, baubleData, globalMultiplier, client = null, interactionOrMessage = null) {
    const item = ITEMS[itemId];
    if (!item) return { error: '❌ Invalid item ID.' };

    const { getGlobalItemSupply } = require('../../utils/items');
    const limit = item.maxGlobalSupply !== undefined ? item.maxGlobalSupply : (item.isUnique ? 1 : null);
    if (limit !== null) {
        const supply = await getGlobalItemSupply(itemId);
        if (supply >= limit) {
            return { error: `❌ **${item.name}** has reached its global supply cap of **${limit}** copies. No more can be obtained/bought!` };
        }
        if (supply + quantity > limit) {
            const allowed = limit - supply;
            return { error: `❌ Buying **${quantity}x ${item.name}** would exceed its global supply cap of **${limit}** copies. You can only buy at most **${allowed}** more.` };
        }
    }

    const dynamicPrice = Math.floor(item.basePrice / globalMultiplier);
    const totalPrice = dynamicPrice * quantity;

    // Calculate rich wealth tax if buyer has >= 150,000 baubles
    const isRich = baubleData.baubles >= 150000;
    let taxPercent = 0;
    let taxAmount = 0;
    if (isRich) {
        taxPercent = baubleData.baubles >= 500000 ? 0.05 : 0.02;
        taxAmount = Math.floor(totalPrice * taxPercent);
    }

    if (baubleData.baubles < totalPrice + taxAmount) {
        if (taxAmount > 0) {
            return { error: `❌ You need **${(totalPrice + taxAmount).toLocaleString()}** Baubles to complete this purchase (Price: **${totalPrice.toLocaleString()}**, including **${(taxPercent * 100).toFixed(0)}%** wealth transaction tax of **${taxAmount.toLocaleString()}**), but you only have **${baubleData.baubles.toLocaleString()}** Glimmering Baubles.` };
        }
        return { error: `❌ You need **${totalPrice.toLocaleString()}** Baubles to buy **${quantity}x ${item.name}**, but you only have **${baubleData.baubles.toLocaleString()}**.` };
    }

    baubleData.baubles -= (totalPrice + taxAmount);
    if (taxAmount > 0) {
        baubleData.cumulativeTaxPaid = (baubleData.cumulativeTaxPaid || 0) + taxAmount;
    }

    if (!baubleData.inventory) baubleData.inventory = [];
    const invItem = baubleData.inventory.find(i => i.itemId === itemId);
    if (invItem) {
        invItem.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }
    await baubleData.save();

    // Check achievements
    if (client && interactionOrMessage) {
        const { checkAndAwardAchievement } = require('../../utils/achievements');
        if (taxAmount > 0) {
            if (baubleData.cumulativeTaxPaid >= 50000) {
                await checkAndAwardAchievement(client, userId, 'tax_evader', interactionOrMessage);
            }
            if (baubleData.cumulativeTaxPaid >= 250000) {
                await checkAndAwardAchievement(client, userId, 'tax_tycoon', interactionOrMessage);
            }
        }
        const uniqueItems = (baubleData.inventory || []).filter(i => i.quantity > 0).length;
        if (uniqueItems >= 10) {
            await checkAndAwardAchievement(client, userId, 'relic_collector', interactionOrMessage);
        }
        if (baubleData.baubles >= 1000000) {
            await checkAndAwardAchievement(client, userId, 'economy_millionaire', interactionOrMessage);
        }
        if (baubleData.baubles >= 5000000) {
            await checkAndAwardAchievement(client, userId, 'economy_billionaire', interactionOrMessage);
        }
    }

    // Add tax to the GlobalEconomy federal tax fund
    if (taxAmount > 0) {
        try {
            const GlobalEconomy = require('../../models/GlobalEconomy');
            let globalEco = await GlobalEconomy.findOne();
            if (globalEco) {
                globalEco.taxFund = (globalEco.taxFund || 0) + taxAmount;
                await globalEco.save();
            }
        } catch (e) {
            console.error('[Shop Purchase] Failed to deposit transaction tax into tax fund:', e);
        }
    }

    return { success: true, totalPrice, taxAmount, taxPercent, itemName: item.name };
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
            `🎨 **Cosmetics & Collectibles:** Flaunt your status, customize profile banners, and stand out.\n` +
            `🏠 **Family Essentials:** Buy rings to propose marriage or adoption papers to expand your family.`
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
            .setCustomId('shop_btn_family')
            .setLabel('🏠 Family')
            .setStyle(ButtonStyle.Success),
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
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('shop_btn_family')
            .setLabel('🏠 Family')
            .setStyle(ButtonStyle.Success)
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
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_btn_family')
            .setLabel('🏠 Family')
            .setStyle(ButtonStyle.Success)
    );

    return [row1, row2];
}

function getFamilyPageEmbed(baubles, globalMultiplier) {
    const list = Object.values(ITEMS)
        .filter(item => item.category === 'family')
        .map(item => `**${item.name}** (\`${item.id}\`)\nPrice: **${Math.floor(item.basePrice / globalMultiplier).toLocaleString()}** Baubles\n_${item.description}_`)
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🏠 Shop: Family Essentials')
        .setDescription(`💰 **Your Balance:** **${baubles.toLocaleString()}** Baubles\n\n${list}`)
        .setFooter({ text: 'Select an item from the dropdown below to buy 1x.' });
}

function getFamilyComponents(globalMultiplier) {
    const items = Object.values(ITEMS).filter(item => item.category === 'family');

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
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_btn_cosmetics')
            .setLabel('🎨 Cosmetics')
            .setStyle(ButtonStyle.Primary)
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
            `- **Selling:** You can sell items back to the shop using \`/sell\` to receive a payout. Special items like Custom Tags cannot be sold.`
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
                const result = await executePurchase(userId, cleanId, quantityOption, baubleData, globalMultiplier, interaction.client, interaction);
                if (result.error) {
                    return interaction.reply({ content: result.error, ephemeral: true });
                }
                
                let description = `You successfully purchased **${quantityOption}x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!`;
                if (result.taxAmount > 0) {
                    description += `\n\n📉 **Wealth Transaction Tax:** Paid **${result.taxAmount.toLocaleString()}** Baubles (**${(result.taxPercent * 100).toFixed(0)}%**) to the federal Tax Fund.`;
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(description)
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
                    case 'family':
                        return { embeds: [getFamilyPageEmbed(baubles, globalMultiplier)], components: getFamilyComponents(globalMultiplier) };
                    case 'help':
                        return { embeds: [getHelpPageEmbed(baubles, globalMultiplier)], components: getHelpComponents() };
                }
            }

            const initialData = getPageData(currentPage, baubleData.baubles, globalMultiplier);
            const response = await interaction.reply({
                embeds: initialData.embeds,
                components: initialData.components,
                withResponse: true
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
                    else if (btnId === 'shop_btn_family') currentPage = 'family';
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
                    const result = await executePurchase(userId, selectedId, 1, freshData, freshMultiplier, i.client, i);
                    
                    if (result.error) {
                        return i.reply({ content: result.error, ephemeral: true });
                    }

                    // Success reply
                    const taxNotice = result.taxAmount > 0 ? ` (including **${result.taxAmount.toLocaleString()}** transaction tax)` : '';
                    await i.reply({
                        content: `🛍️ **Purchase Successful!** You bought **1x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles${taxNotice}.`,
                        ephemeral: false
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

                const result = await executePurchase(userId, itemId, quantity, baubleData, globalMultiplier, message.client, message);
                if (result.error) return message.reply(result.error);

                let description = `You successfully purchased **${quantity}x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles!`;
                if (result.taxAmount > 0) {
                    description += `\n\n📉 **Wealth Transaction Tax:** Paid **${result.taxAmount.toLocaleString()}** Baubles (**${(result.taxPercent * 100).toFixed(0)}%**) to the federal Tax Fund.`;
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛍️ Purchase Successful!')
                    .setDescription(description + `\n\nNew Balance: **${baubleData.baubles.toLocaleString()}** Baubles.`)
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
                    case 'family':
                        return { embeds: [getFamilyPageEmbed(baubles, globalMultiplier)], components: getFamilyComponents(globalMultiplier) };
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
                    else if (btnId === 'shop_btn_family') currentPage = 'family';
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
                    const result = await executePurchase(userId, selectedId, 1, freshData, freshMultiplier, i.client, i);
                    
                    if (result.error) {
                        return i.reply({ content: result.error, ephemeral: true });
                    }

                    // Success reply (public message)
                    const taxNotice = result.taxAmount > 0 ? ` (including **${result.taxAmount.toLocaleString()}** transaction tax)` : '';
                    await i.reply({
                        content: `🛍️ **Purchase Successful!** You bought **1x ${result.itemName}** for **${result.totalPrice.toLocaleString()}** Baubles${taxNotice}.`,
                        ephemeral: false
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