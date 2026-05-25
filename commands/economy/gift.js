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
        .setName('gift')
        .setDescription('Gift items from your inventory to another member.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to gift items to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item to gift')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items to gift')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        try {
            const senderId = interaction.user.id;
            const targetUser = interaction.options.getUser('user');
            const itemId = interaction.options.getString('item').trim().toLowerCase();
            const quantity = interaction.options.getInteger('quantity') || 1;

            if (targetUser.bot) {
                return interaction.reply({ content: '❌ You cannot gift items to bots!', ephemeral: true });
            }

            if (targetUser.id === senderId) {
                return interaction.reply({ content: '❌ You cannot gift items to yourself!', ephemeral: true });
            }

            const item = ITEMS[itemId];
            if (!item) {
                return interaction.reply({ content: `❌ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``, ephemeral: true });
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData) {
                return interaction.reply({ content: '❌ You do not have any items to gift.', ephemeral: true });
            }

            const invItem = senderData.inventory?.find(i => i.itemId === itemId);
            if (!invItem || invItem.quantity < quantity) {
                const count = invItem ? invItem.quantity : 0;
                return interaction.reply({ content: `❌ You do not have **${quantity}x ${item.name}** to gift. You only have **${count}**.`, ephemeral: true });
            }

            // Fetch or create recipient data
            let targetData = await Bauble.findOne({ userId: targetUser.id });
            if (!targetData) {
                targetData = new Bauble({ userId: targetUser.id, baubles: 0 });
            }

            // Transfer items
            removeItem(senderData, itemId, quantity);
            addItem(targetData, itemId, quantity);

            await senderData.save();
            await targetData.save();

            const successEmbed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎁 Gift Sent!')
                .setDescription(`You successfully gifted **${quantity}x ${item.name}** to **${targetUser.username}**!`)
                .setTimestamp()
                .setFooter({ text: 'Glimmering Gifting System' });

            return interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in gift command:', error);
            await interaction.reply({ content: '❌ An error occurred while gifting this item.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const senderId = message.author.id;
            const targetUser = message.mentions.users.first();
            const itemId = args[1]?.toLowerCase();
            const quantity = parseInt(args[2]) || 1;

            if (!targetUser) {
                return message.reply('⚠️ Please mention a user to gift. Example: `-gift @username coffee 1`');
            }

            if (targetUser.bot) {
                return message.reply('❌ You cannot gift items to bots!');
            }

            if (targetUser.id === senderId) {
                return message.reply('❌ You cannot gift items to yourself!');
            }

            if (!itemId) {
                return message.reply(`⚠️ Please specify an item to gift. Options: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            const item = ITEMS[itemId];
            if (!item) {
                return message.reply(`⚠️ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``);
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData) {
                return message.reply('❌ You do not have any items to gift.');
            }

            const invItem = senderData.inventory?.find(i => i.itemId === itemId);
            if (!invItem || invItem.quantity < quantity) {
                const count = invItem ? invItem.quantity : 0;
                return message.reply(`❌ You do not have **${quantity}x ${item.name}** to gift. You only have **${count}**.`);
            }

            let targetData = await Bauble.findOne({ userId: targetUser.id });
            if (!targetData) {
                targetData = new Bauble({ userId: targetUser.id, baubles: 0 });
            }

            removeItem(senderData, itemId, quantity);
            addItem(targetData, itemId, quantity);

            await senderData.save();
            await targetData.save();

            const successEmbed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎁 Gift Sent!')
                .setDescription(`You successfully gifted **${quantity}x ${item.name}** to **${targetUser.username}**!`)
                .setTimestamp()
                .setFooter({ text: 'Glimmering Gifting System' });

            return message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in gift command:', error);
            await message.reply('❌ An error occurred while gifting this item.');
        }
    }
};
