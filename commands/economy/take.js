/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('take')
        .setDescription('[ADMIN ONLY] Take Glimmering Baubles or shop items from a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to take from.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles or quantity of items to take.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The shop item to take (leave blank for Baubles).')
                .setRequired(false)
                .addChoices(
                    { name: '☕ Energizing Coffee', value: 'coffee' },
                    { name: '🍀 Lucky Clover', value: 'clover' },
                    { name: '🛡️ Aegis Shield', value: 'shield' },
                    { name: '📦 Mystery Box', value: 'mystery_box' },
                    { name: '🏷️ Custom Tag', value: 'tag' },
                    { name: '🎨 Profile Paintbrush', value: 'paintbrush' },
                    { name: '💎 Golden Nugget', value: 'nugget' },
                    { name: '👑 Crown of Royalty', value: 'crown' }
                )),
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
                return interaction.reply({ content: `❌ ${user.tag} does not have an economy profile.`, ephemeral: true });
            }

            if (itemId) {
                if (!baubleData.inventory || baubleData.inventory.length === 0) {
                    return interaction.reply({ content: `❌ ${user.tag} does not own any items.`, ephemeral: true });
                }

                const invItem = baubleData.inventory.find(i => i.itemId === itemId);
                if (!invItem || invItem.quantity <= 0) {
                    return interaction.reply({ content: `❌ ${user.tag} does not own any of this item.`, ephemeral: true });
                }

                if (invItem.quantity < amount) {
                    return interaction.reply({ content: `❌ ${user.tag} only has **${invItem.quantity}** of this item.`, ephemeral: true });
                }

                invItem.quantity -= amount;
                if (invItem.quantity === 0) {
                    baubleData.inventory = baubleData.inventory.filter(i => i.itemId !== itemId);
                }
                
                baubleData.markModified('inventory');
                await baubleData.save();

                const itemNames = {
                    coffee: '☕ Energizing Coffee',
                    clover: '🍀 Lucky Clover',
                    shield: '🛡️ Aegis Shield',
                    mystery_box: '📦 Mystery Box',
                    tag: '🏷️ Custom Tag',
                    paintbrush: '🎨 Profile Paintbrush',
                    nugget: '💎 Golden Nugget',
                    crown: '👑 Crown of Royalty'
                };
                const itemName = itemNames[itemId] || itemId;
                await interaction.reply({ content: `✅ Successfully took **${amount}x ${itemName}** from ${user.tag}'s inventory.`, ephemeral: true });
            } else {
                if (baubleData.baubles < amount) {
                    return interaction.reply({ content: `❌ ${user.tag} only has **${baubleData.baubles}** Baubles.`, ephemeral: true });
                }

                baubleData.baubles -= amount;
                await baubleData.save();

                await interaction.reply({ content: `✅ Successfully took **${amount}** Baubles from ${user.tag}. New balance: **${baubleData.baubles.toLocaleString()}**`, ephemeral: true });
            }

        } catch (error) {
            console.error('Error in take command:', error);
            await interaction.reply({ content: '❌ An error occurred while taking items.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        const adminId = "805007574193405952";

        if (message.author.id !== adminId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('⚠️ Please mention a user to take from. Usage: `-take <@user> <amount|item_id> [item_id|amount]`');
        }

        const itemIds = ["coffee", "clover", "shield", "mystery_box", "tag", "paintbrush", "nugget", "crown"];
        let itemId = null;
        let amount = 1;
        let isItem = false;

        const arg1 = args[1];
        const arg2 = args[2];

        if (!arg1) {
            return message.reply('⚠️ Usage:\n- To take Baubles: `-take @user <amount>`\n- To take items: `-take @user <item_id> [quantity]` or `-take @user <quantity> <item_id>`');
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
            const parsedNum = parseInt(arg1);
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
                return message.reply(`❌ ${user.tag} does not have an economy profile.`);
            }

            if (isItem) {
                if (!baubleData.inventory || baubleData.inventory.length === 0) {
                    return message.reply(`❌ ${user.tag} does not own any items.`);
                }

                const invItem = baubleData.inventory.find(i => i.itemId === itemId);
                if (!invItem || invItem.quantity <= 0) {
                    return message.reply(`❌ ${user.tag} does not own any of this item.`);
                }

                if (invItem.quantity < amount) {
                    return message.reply(`❌ ${user.tag} only has **${invItem.quantity}** of this item.`);
                }

                invItem.quantity -= amount;
                if (invItem.quantity === 0) {
                    baubleData.inventory = baubleData.inventory.filter(i => i.itemId !== itemId);
                }
                
                baubleData.markModified('inventory');
                await baubleData.save();

                const itemNames = {
                    coffee: '☕ Energizing Coffee',
                    clover: '🍀 Lucky Clover',
                    shield: '🛡️ Aegis Shield',
                    mystery_box: '📦 Mystery Box',
                    tag: '🏷️ Custom Tag',
                    paintbrush: '🎨 Profile Paintbrush',
                    nugget: '💎 Golden Nugget',
                    crown: '👑 Crown of Royalty'
                };
                const itemName = itemNames[itemId] || itemId;
                await message.reply(`✅ Successfully took **${amount}x ${itemName}** from ${user.tag}'s inventory.`);
            } else {
                if (baubleData.baubles < amount) {
                    return message.reply(`❌ ${user.tag} only has **${baubleData.baubles}** Baubles.`);
                }

                baubleData.baubles -= amount;
                await baubleData.save();

                await message.reply(`✅ Successfully took **${amount}** Baubles from ${user.tag}. New balance: **${baubleData.baubles.toLocaleString()}**`);
            }

        } catch (error) {
            console.error('Error in take command (prefix):', error);
            await message.reply('❌ An error occurred while taking items.');
        }
    },
};
