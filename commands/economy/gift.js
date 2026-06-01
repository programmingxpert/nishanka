/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS } = require('../../utils/items');

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
        .setDescription('Gift items w/ message')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Gift recipient')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to gift')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items to gift')
                .setMinValue(1)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Gift message (optional)')
                .setMaxLength(250)
                .setRequired(false)),

    async execute(interaction) {
        try {
            const senderId = interaction.user.id;
            const targetUser = interaction.options.getUser('user');
            const itemId = interaction.options.getString('item').trim().toLowerCase();
            const quantity = interaction.options.getInteger('quantity') || 1;
            const customMessage = interaction.options.getString('message');

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

            if (item.giftable === false) {
                return interaction.reply({ content: `❌ **${item.name}** is a premium/personal item and cannot be gifted!`, ephemeral: true });
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

            if (customMessage) {
                successEmbed.addFields({ name: '✉️ Message from Sender', value: `*"${customMessage}"*` });
            }

            // Attempt to DM the recipient
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setTitle('🎁 You received a Gift!')
                    .setDescription(`**${interaction.user.username}** sent you **${quantity}x ${item.name}** in **${interaction.guild.name}**!`)
                    .setTimestamp();
                if (customMessage) {
                    dmEmbed.addFields({ name: '✉️ Message', value: `*"${customMessage}"*` });
                }
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log(`Could not send gift DM to ${targetUser.tag}`);
            }

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

            if (!targetUser) {
                return message.reply('⚠️ Please mention a user to gift. Example: `-gift @username coffee 1 [message]`');
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

            if (item.giftable === false) {
                return message.reply(`❌ **${item.name}** is a premium/personal item and cannot be gifted!`);
            }

            // Parse quantity and message
            let quantity = 1;
            let messageIndex = 2;
            if (args[2] && !isNaN(parseInt(args[2]))) {
                quantity = parseInt(args[2]);
                messageIndex = 3;
            }
            const customMessage = args.slice(messageIndex).join(' ') || null;

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

            if (customMessage) {
                successEmbed.addFields({ name: '✉️ Message from Sender', value: `*"${customMessage}"*` });
            }

            // Attempt to DM the recipient
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setTitle('🎁 You received a Gift!')
                    .setDescription(`**${message.author.username}** sent you **${quantity}x ${item.name}** in **${message.guild.name}**!`)
                    .setTimestamp();
                if (customMessage) {
                    dmEmbed.addFields({ name: '✉️ Message', value: `*"${customMessage}"*` });
                }
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log(`Could not send gift DM to ${targetUser.tag}`);
            }

            return message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in gift command:', error);
            await message.reply('❌ An error occurred while gifting this item.');
        }
    }
};
