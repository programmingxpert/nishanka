/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: { name: 'add' },
    async execute(interaction) {
        const adminId = "805007574193405952";

        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const itemId = interaction.options.getString('item');

        if (amount <= 0) {
            return interaction.reply({ content: '❌ Amount must be greater than 0.', ephemeral: true });
        }

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0, inventory: [] });
            }

            if (itemId) {
                if (!baubleData.inventory) baubleData.inventory = [];
                const invItem = baubleData.inventory.find(i => i.itemId === itemId);
                if (invItem) {
                    invItem.quantity += amount;
                } else {
                    baubleData.inventory.push({ itemId, quantity: amount });
                }
                await baubleData.save();

                const itemNames = {
                    coffee: '☕ Energizing Coffee',
                    clover: '🍀 Lucky Clover',
                    shield: '🛡️ Aegis Shield',
                    mystery_box: '📦 Mystery Box',
                    padlock: '🔒 Safe Padlock',
                    tag: '🏷️ Custom Tag',
                    paintbrush: '🎨 Profile Paintbrush',
                    nugget: '💎 Golden Nugget',
                    crown: '👑 Crown of Royalty'
                };
                const itemName = itemNames[itemId] || itemId;
                await interaction.reply({ content: `✅ Successfully added **${amount}x ${itemName}** to ${user.tag}'s inventory.`, ephemeral: true });
            } else {
                baubleData.baubles += amount;
                await baubleData.save();

                await interaction.reply({ content: `✅ Successfully added **${amount}** Baubles to ${user.tag}. New balance: **${baubleData.baubles.toLocaleString()}**`, ephemeral: true });
            }

        } catch (error) {
            console.error('Error in add command:', error);
            await interaction.reply({ content: '❌ An error occurred while adding.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        const adminId = "805007574193405952";

        if (message.author.id !== adminId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('⚠️ Please mention a user to add to. Usage: `-add <@user> <amount|item_id> [item_id|amount]`');
        }

        const itemIds = ["coffee", "clover", "shield", "mystery_box", "padlock", "tag", "paintbrush", "nugget", "crown"];
        let itemId = null;
        let amount = 1;
        let isItem = false;

        const { parseAmount } = require('../../utils/economyEngine');
        const arg1 = args[1];
        const arg2 = args[2];

        if (!arg1) {
            return message.reply('⚠️ Usage:\n- To add Baubles: `-add @user <amount>`\n- To add items: `-add @user <item_id> [quantity]` or `-add @user <quantity> <item_id>`');
        }

        if (itemIds.includes(arg1.toLowerCase())) {
            itemId = arg1.toLowerCase();
            isItem = true;
            if (arg2) {
                const parsedQty = parseInt(arg2);
                if (!isNaN(parsedQty) && parsedQty > 0) {
                    amount = parsedQty;
                }
            }
        } else {
            const parsedNum = parseAmount(arg1);
            if (!isNaN(parsedNum)) {
                if (arg2 && itemIds.includes(arg2.toLowerCase())) {
                    itemId = arg2.toLowerCase();
                    isItem = true;
                    amount = parsedNum;
                } else {
                    amount = parsedNum;
                }
            } else {
                return message.reply(`⚠️ Invalid argument. Choose from items: ${itemIds.join(', ')} or specify a number.`);
            }
        }

        if (amount <= 0) {
            return message.reply('❌ Amount must be greater than 0.');
        }

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0, inventory: [] });
            }

            if (isItem) {
                if (!baubleData.inventory) baubleData.inventory = [];
                const invItem = baubleData.inventory.find(i => i.itemId === itemId);
                if (invItem) {
                    invItem.quantity += amount;
                } else {
                    baubleData.inventory.push({ itemId, quantity: amount });
                }
                await baubleData.save();

                const itemNames = {
                    coffee: '☕ Energizing Coffee',
                    clover: '🍀 Lucky Clover',
                    shield: '🛡️ Aegis Shield',
                    mystery_box: '📦 Mystery Box',
                    padlock: '🔒 Safe Padlock',
                    tag: '🏷️ Custom Tag',
                    paintbrush: '🎨 Profile Paintbrush',
                    nugget: '💎 Golden Nugget',
                    crown: '👑 Crown of Royalty'
                };
                const itemName = itemNames[itemId] || itemId;
                await message.reply(`✅ Successfully added **${amount}x ${itemName}** to ${user.tag}'s inventory.`);
            } else {
                baubleData.baubles += amount;
                await baubleData.save();

                await message.reply(`✅ Successfully added **${amount}** Baubles to ${user.tag}. New balance: **${baubleData.baubles.toLocaleString()}**`);
            }

        } catch (error) {
            console.error('Error in add command (prefix):', error);
            await message.reply('❌ An error occurred while adding.');
        }
    },
};