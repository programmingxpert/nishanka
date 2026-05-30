/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS } = require('../../utils/items');

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
        .setName('sell')
        .setDescription('Sell items from your inventory back to the shop.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item to sell')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items to sell')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const itemId = interaction.options.getString('item').trim().toLowerCase();
            const quantity = interaction.options.getInteger('quantity') || 1;

            const item = ITEMS[itemId];
            if (!item) {
                return interaction.reply({ content: `❌ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``, ephemeral: true });
            }

            if (item.sellPrice === null || item.sellPrice === undefined) {
                return interaction.reply({ content: `❌ **${item.name}** cannot be sold back to the shop. Only collectibles like the Golden Nugget can be sold.`, ephemeral: true });
            }

            const baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                return interaction.reply({ content: '❌ You do not have any items to sell.', ephemeral: true });
            }

            const invItem = baubleData.inventory?.find(i => i.itemId === itemId);
            if (!invItem || invItem.quantity < quantity) {
                const count = invItem ? invItem.quantity : 0;
                return interaction.reply({ content: `❌ You do not have **${quantity}x ${item.name}** to sell. You only have **${count}**.`, ephemeral: true });
            }

            const totalEarned = item.sellPrice * quantity;
            removeItem(baubleData, itemId, quantity);
            baubleData.baubles += totalEarned;

            await baubleData.save();

            const successEmbed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🛍️ Items Sold')
                .setDescription(`You successfully sold **${quantity}x ${item.name}** back to the shop for **${totalEarned.toLocaleString()}** Baubles!`)
                .addFields(
                    { name: '💰 Earned', value: `${totalEarned.toLocaleString()} Baubles`, inline: true },
                    { name: '💰 New Balance', value: `${baubleData.baubles.toLocaleString()} Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Glimmering Shop Transaction' });

            return interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in sell command:', error);
            await interaction.reply({ content: '❌ An error occurred while selling this item.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const itemId = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!itemId) {
                return message.reply(`⚠️ Please specify an item to sell. Example: \`-sell nugget 2\`. Options: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            const item = ITEMS[itemId];
            if (!item) {
                return message.reply(`⚠️ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            if (item.sellPrice === null || item.sellPrice === undefined) {
                return message.reply(`❌ **${item.name}** cannot be sold back to the shop. Only collectibles like the Golden Nugget can be sold.`);
            }

            const baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                return message.reply('❌ You do not have any items to sell.');
            }

            const invItem = baubleData.inventory?.find(i => i.itemId === itemId);
            if (!invItem || invItem.quantity < quantity) {
                const count = invItem ? invItem.quantity : 0;
                return message.reply(`❌ You do not have **${quantity}x ${item.name}** to sell. You only have **${count}**.`);
            }

            const totalEarned = item.sellPrice * quantity;
            removeItem(baubleData, itemId, quantity);
            baubleData.baubles += totalEarned;

            await baubleData.save();

            const successEmbed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🛍️ Items Sold')
                .setDescription(`You successfully sold **${quantity}x ${item.name}** back to the shop for **${totalEarned.toLocaleString()}** Baubles!\n\nNew Balance: **${baubleData.baubles.toLocaleString()}** Baubles.`)
                .setTimestamp()
                .setFooter({ text: 'Glimmering Shop Transaction' });

            return message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in sell command:', error);
            await message.reply('❌ An error occurred while selling this item.');
        }
    }
};
