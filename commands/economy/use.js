/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS } = require('./shop');

function addItem(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) baubleData.inventory = [];
    const existing = baubleData.inventory.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        baubleData.inventory.push({ itemId, quantity });
    }
}

function removeItem(baubleData, itemId, quantity = 1) {
    if (!baubleData.inventory) return false;
    const existingIndex = baubleData.inventory.findIndex(i => i.itemId === itemId);
    if (existingIndex === -1) return false;
    const existing = baubleData.inventory[existingIndex];
    if (existing.quantity < quantity) return false;
    
    existing.quantity -= quantity;
    if (existing.quantity <= 0) {
        baubleData.inventory.splice(existingIndex, 1);
    }
    return true;
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Activate or consume an item from your inventory.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item to use')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const itemId = interaction.options.getString('item').trim().toLowerCase();

            if (!ITEMS[itemId]) {
                return interaction.reply({ content: `❌ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``, ephemeral: true });
            }

            const baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                return interaction.reply({ content: '❌ You do not have any items in your inventory.', ephemeral: true });
            }

            // Check inventory
            const hasItem = baubleData.inventory && baubleData.inventory.some(i => i.itemId === itemId && i.quantity > 0);
            if (!hasItem) {
                return interaction.reply({ content: `❌ You do not own any **${ITEMS[itemId].name}**. Buy one from the \`/shop\`!`, ephemeral: true });
            }

            // Resolve item effects
            let useResult = '';
            let color = 0x3498DB;

            if (itemId === 'coffee') {
                removeItem(baubleData, 'coffee', 1);
                baubleData.coffeeExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
                useResult = '☕ You drank the **Energizing Coffee**! Your `/work` and `/scavenge` cooldowns are reduced by 50% for the next 30 minutes!';
                color = 0xE67E22;
            } else if (itemId === 'clover') {
                removeItem(baubleData, 'clover', 1);
                baubleData.luckExpiresAt = new Date(Date.now() + 900000); // 15 minutes
                useResult = '🍀 You rubbed the **Lucky Clover**! Your `/coinflip` and `/gamble` win rates are boosted by **+10%** for the next 15 minutes!';
                color = 0x2ECC71;
            } else if (itemId === 'mystery_box') {
                removeItem(baubleData, 'mystery_box', 1);
                const rng = Math.random();
                if (rng < 0.4) {
                    const bonus = Math.floor(Math.random() * 301) + 100; // 100-400
                    baubleData.baubles += bonus;
                    useResult = `📦 You popped open the **Mystery Box** and found **${bonus.toLocaleString()}** Glimmering Baubles!`;
                } else if (rng < 0.6) {
                    addItem(baubleData, 'coffee', 1);
                    useResult = '📦 You popped open the **Mystery Box** and discovered a cup of ☕ **Energizing Coffee**!';
                } else if (rng < 0.8) {
                    addItem(baubleData, 'clover', 1);
                    useResult = '📦 You popped open the **Mystery Box** and found a lucky 🍀 **Lucky Clover**!';
                } else {
                    addItem(baubleData, 'shield', 1);
                    useResult = '📦 You popped open the **Mystery Box** and pulled out an ancient 🛡️ **Aegis Shield**!';
                }
                color = 0x9B59B6;
            } else if (itemId === 'shield') {
                return interaction.reply({ content: '🛡️ The **Aegis Shield** is a passive item. As long as it sits in your inventory, it will automatically consume itself to prevent wager loss in your next failed `/battle` duel!', ephemeral: true });
            } else if (itemId === 'nugget') {
                return interaction.reply({ content: '💎 The **Golden Nugget** is a collectible item. You cannot consume it, but you can sell it using `/sell item:nugget` or gift it using `/gift`!', ephemeral: true });
            } else if (itemId === 'tag') {
                return interaction.reply({ content: '🏷️ The **Custom Tag** is a cosmetic item. Please contact a server administrator to create and assign your custom tag role!', ephemeral: true });
            } else if (itemId === 'crown') {
                return interaction.reply({ content: '👑 The **Crown of Royalty** is the ultimate status symbol of absolute wealth. You cannot consume it, but it displays proudly in your inventory!', ephemeral: true });
            } else if (itemId === 'paintbrush') {
                return interaction.reply({ content: '🎨 The **Profile Paintbrush** is a tool used to customize your profile banner (both custom Hex colors and URLs) using `/profile-edit`!', ephemeral: true });
            }

            await baubleData.save();

            const useEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🎒 Item Activated')
                .setDescription(useResult)
                .setTimestamp()
                .setFooter({ text: 'Glimmering Inventory' });

            return interaction.reply({ embeds: [useEmbed] });

        } catch (error) {
            console.error('Error in use command:', error);
            await interaction.reply({ content: '❌ An error occurred while using this item.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const itemId = args[0]?.toLowerCase();

            if (!itemId) {
                return message.reply(`⚠️ Please specify an item ID to use. Example: \`-use coffee\`. Options: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            if (!ITEMS[itemId]) {
                return message.reply(`⚠️ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            const baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                return message.reply('❌ You do not have any items in your inventory.');
            }

            const hasItem = baubleData.inventory && baubleData.inventory.some(i => i.itemId === itemId && i.quantity > 0);
            if (!hasItem) {
                return message.reply(`❌ You do not own any **${ITEMS[itemId].name}**. Buy one from the shop!`);
            }

            let useResult = '';
            let color = 0x3498DB;

            if (itemId === 'coffee') {
                removeItem(baubleData, 'coffee', 1);
                baubleData.coffeeExpiresAt = new Date(Date.now() + 1800000);
                useResult = '☕ You drank the **Energizing Coffee**! Your work and scavenge cooldowns are reduced by 50% for the next 30 minutes!';
                color = 0xE67E22;
            } else if (itemId === 'clover') {
                removeItem(baubleData, 'clover', 1);
                baubleData.luckExpiresAt = new Date(Date.now() + 900000);
                useResult = '🍀 You rubbed the **Lucky Clover**! Your coinflip and gamble win rates are boosted by **+10%** for the next 15 minutes!';
                color = 0x2ECC71;
            } else if (itemId === 'mystery_box') {
                removeItem(baubleData, 'mystery_box', 1);
                const rng = Math.random();
                if (rng < 0.4) {
                    const bonus = Math.floor(Math.random() * 301) + 100;
                    baubleData.baubles += bonus;
                    useResult = `📦 You popped open the **Mystery Box** and found **${bonus.toLocaleString()}** Glimmering Baubles!`;
                } else if (rng < 0.6) {
                    addItem(baubleData, 'coffee', 1);
                    useResult = '📦 You popped open the **Mystery Box** and discovered a cup of ☕ **Energizing Coffee**!';
                } else if (rng < 0.8) {
                    addItem(baubleData, 'clover', 1);
                    useResult = '📦 You popped open the **Mystery Box** and found a lucky 🍀 **Lucky Clover**!';
                } else {
                    addItem(baubleData, 'shield', 1);
                    useResult = '📦 You popped open the **Mystery Box** and pulled out an ancient 🛡️ **Aegis Shield**!';
                }
                color = 0x9B59B6;
            } else if (itemId === 'shield') {
                return message.reply('🛡️ The **Aegis Shield** is a passive item. As long as it sits in your inventory, it will automatically consume itself to prevent wager loss in your next failed Brawl duel!');
            } else if (itemId === 'nugget') {
                return message.reply('💎 The **Golden Nugget** is a collectible item. You cannot consume it, but you can sell it using `-sell nugget` or gift it using `-gift <user> nugget`!');
            } else if (itemId === 'tag') {
                return message.reply('🏷️ The **Custom Tag** is a cosmetic item. Please contact a server administrator to create and assign your custom tag role!');
            } else if (itemId === 'crown') {
                return message.reply('👑 The **Crown of Royalty** is the ultimate status symbol of absolute wealth. You cannot consume it, but it displays proudly in your inventory!');
            } else if (itemId === 'paintbrush') {
                return message.reply('🎨 The **Profile Paintbrush** is a tool used to customize your profile banner (both custom Hex colors and URLs) using `-profile-edit`!');
            }

            await baubleData.save();

            const useEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🎒 Item Activated')
                .setDescription(useResult)
                .setTimestamp()
                .setFooter({ text: 'Glimmering Inventory' });

            return message.reply({ embeds: [useEmbed] });

        } catch (error) {
            console.error('Error in use command:', error);
            await message.reply('❌ An error occurred while using this item.');
        }
    }
};
