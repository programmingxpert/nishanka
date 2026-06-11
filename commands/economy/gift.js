/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const Gift = require('../../models/giftSchema');
const { ITEMS } = require('../../utils/items');
const { getGlobalMultiplier } = require('../../utils/economyEngine');
const { triggerGlobalGenerosityAlert } = require('../../utils/generosity');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Wrap and send a gift (items or baubles) to another member with a custom message.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to gift')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item to gift (optional if gifting Baubles)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('baubles')
                .setDescription('The amount of Baubles to gift (optional if gifting an item)')
                .setMinValue(1)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items to gift (only used if gifting an item)')
                .setMinValue(1)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('An optional card message for the recipient')
                .setMaxLength(250)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('extra_tax')
                .setDescription('Extra Baubles to tip directly to the Federal Tax Fund (optional)')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        try {
            const senderId = interaction.user.id;
            const targetUser = interaction.options.getUser('user');
            const itemId = interaction.options.getString('item')?.trim().toLowerCase() || null;
            const baublesAmount = interaction.options.getInteger('baubles') || 0;
            const quantity = interaction.options.getInteger('quantity') || 1;
            const customMessage = interaction.options.getString('message') || null;
            const extraTax = interaction.options.getInteger('extra_tax') || 0;

            if (targetUser.bot) {
                return interaction.reply({ content: '❌ You cannot gift to bots!', ephemeral: true });
            }

            if (targetUser.id === senderId) {
                return interaction.reply({ content: '❌ You cannot gift to yourself!', ephemeral: true });
            }

            if (!itemId && baublesAmount <= 0) {
                return interaction.reply({ content: '❌ You must specify either an **item** OR a **baubles** amount to gift!', ephemeral: true });
            }

            if (itemId && baublesAmount > 0) {
                return interaction.reply({ content: '❌ You cannot gift both an item and baubles in the same wrapper! Gift them separately.', ephemeral: true });
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData) {
                return interaction.reply({ content: "❌ You don't have an economy profile yet. Run `/bauble` first.", ephemeral: true });
            }

            let giftValue = 0;
            let giftType = 'baubles';

            if (itemId) {
                giftType = 'item';
                const item = ITEMS[itemId];
                if (!item) {
                    return interaction.reply({ content: `❌ Invalid item ID. Choose from: \`${Object.keys(ITEMS).join(', ')}\``, ephemeral: true });
                }
                if (item.giftable === false) {
                    return interaction.reply({ content: `❌ **${item.name}** is a premium/personal item and cannot be gifted!`, ephemeral: true });
                }

                const invItem = senderData.inventory?.find(i => i.itemId === itemId);
                if (!invItem || invItem.quantity < quantity) {
                    const count = invItem ? invItem.quantity : 0;
                    return interaction.reply({ content: `❌ You do not have **${quantity}x ${item.name}** in your inventory. You only have **${count}**.`, ephemeral: true });
                }

                const RARITY_VALUES = {
                    Common: 5000,
                    Uncommon: 15000,
                    Rare: 50000,
                    Epic: 100000,
                    Legendary: 250000,
                    Mythic: 500000,
                    Unique: 1000000
                };
                giftValue = item.basePrice || item.sellPrice || RARITY_VALUES[item.rarity] || 5000;
                giftValue *= quantity;
            } else {
                giftValue = baublesAmount;
                if ((senderData.baubles || 0) < baublesAmount) {
                    return interaction.reply({ content: `❌ You do not have **${baublesAmount.toLocaleString()}** Baubles to gift! Balance: **${(senderData.baubles || 0).toLocaleString()}**`, ephemeral: true });
                }
            }

            // Calculate fees: 5% base fee (min 500) plus extra tax
            const globalMultiplier = await getGlobalMultiplier();
            const baseFee = Math.max(500, Math.floor((giftValue * 0.05) / globalMultiplier));
            const totalRequiredBaubles = (giftType === 'baubles' ? baublesAmount : 0) + baseFee + extraTax;

            if ((senderData.baubles || 0) < totalRequiredBaubles) {
                return interaction.reply({ 
                    content: `❌ You do not have enough Baubles to cover the gift + delivery fee & tax!\nRequired: **${totalRequiredBaubles.toLocaleString()}** Baubles (Gift: **${(giftType === 'baubles' ? baublesAmount : 0).toLocaleString()}**, Base Fee: **${baseFee.toLocaleString()}**, Extra Tax: **${extraTax.toLocaleString()}**), but you only have **${(senderData.baubles || 0).toLocaleString()}** Glimmering Baubles.`, 
                    ephemeral: true 
                });
            }

            // Deduct from sender
            senderData.baubles -= totalRequiredBaubles;
            if (giftType === 'item') {
                const invItem = senderData.inventory.find(i => i.itemId === itemId);
                invItem.quantity -= quantity;
                if (invItem.quantity <= 0) {
                    senderData.inventory = senderData.inventory.filter(i => i.itemId !== itemId);
                }
                senderData.markModified('inventory');
            }
            await senderData.save();

            // Create pending gift entry
            const newGift = new Gift({
                senderId,
                recipientId: targetUser.id,
                guildId: interaction.guild.id,
                giftType,
                itemId: giftType === 'item' ? itemId : null,
                quantity: giftType === 'item' ? quantity : 0,
                amount: giftType === 'baubles' ? baublesAmount : 0,
                message: customMessage,
                extraTax: extraTax
            });
            await newGift.save();

            // Deposit fees to federal Tax Fund
            const totalTaxContribution = baseFee + extraTax;
            const GlobalEconomy = require('../../models/GlobalEconomy');
            await GlobalEconomy.findOneAndUpdate(
                {},
                { $inc: { taxFund: totalTaxContribution } },
                { upsert: true }
            );

            // Trigger Global Generosity alerts if amount >= 100k OR extraTax >= 100k
            const isHighValue = giftValue >= 100000 || extraTax >= 100000;
            if (isHighValue) {
                const displayItemOrVal = giftType === 'baubles' ? baublesAmount : `${quantity}x ${ITEMS[itemId].name}`;
                triggerGlobalGenerosityAlert(interaction.client, interaction.user, targetUser, displayItemOrVal, 'gift', extraTax);
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎁 Gift Wrapped & Sent!')
                .setDescription(`Successfully wrapped a gift for **${targetUser.username}**!\n\n💸 **Base Gifting Fee:** \`${baseFee.toLocaleString()} Baubles\`\n💸 **Extra Tax Tip:** \`${extraTax.toLocaleString()} Baubles\`\n*(Both added directly to the federal Tax Fund)*`)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Gifting System' });

            if (customMessage) {
                successEmbed.addFields({ name: '✉️ Card Message', value: `*"${customMessage}"*` });
            }

            // Notify recipient in DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setTitle('📬 You have a Pending Gift!')
                    .setDescription(`**${interaction.user.username}** has sent you a wrapped gift in **${interaction.guild.name}**!\n\nUse \`/opengift\` or \`-opengift\` in the server to open and claim it!`)
                    .setTimestamp();
                if (customMessage) {
                    dmEmbed.addFields({ name: '✉️ Card Message Preview', value: `*"${customMessage}"*` });
                }
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (_) {}

            return interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in gift slash command:', error);
            return interaction.reply({ content: '❌ An error occurred while wrapping the gift.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const senderId = message.author.id;
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('⚠️ Usage:\n- Gifting Baubles: `-gift @user <amount> [extra_tax] [message]`\n- Gifting Items: `-gift @user <item_id> [quantity] [extra_tax] [message]`');
            }

            if (targetUser.bot) {
                return message.reply('❌ You cannot gift to bots!');
            }

            if (targetUser.id === senderId) {
                return message.reply('❌ You cannot gift to yourself!');
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData) {
                return message.reply("❌ You don't have an economy profile yet. Run `-bauble` first.");
            }

            const arg1 = args[1]; // Can be item_id OR amount of baubles
            if (!arg1) {
                return message.reply('⚠️ Please specify what you want to gift (item ID or Bauble amount).');
            }

            const { parseAmount } = require('../../utils/economyEngine');
            let giftType = 'baubles';
            let itemId = null;
            let baublesAmount = 0;
            let quantity = 1;
            let extraTax = 0;
            let messageStartIdx = 3;

            // Check if arg1 is an item
            if (Object.keys(ITEMS).includes(arg1.toLowerCase())) {
                giftType = 'item';
                itemId = arg1.toLowerCase();

                // Check for quantity in arg2
                if (args[2] && !isNaN(parseInt(args[2]))) {
                    quantity = parseInt(args[2]);
                    messageStartIdx = 3;

                    // Check for extra_tax in arg3
                    if (args[3] && !isNaN(parseInt(args[3]))) {
                        extraTax = parseInt(args[3]);
                        messageStartIdx = 4;
                    }
                } else {
                    // Check if arg2 is extra_tax instead of quantity
                    if (args[2] && !isNaN(parseInt(args[2]))) {
                        extraTax = parseInt(args[2]);
                        messageStartIdx = 3;
                    }
                }
            } else {
                // It must be baubles
                baublesAmount = parseAmount(arg1, senderData.baubles || 0);
                if (isNaN(baublesAmount) || baublesAmount <= 0) {
                    return message.reply('❌ Please specify a valid item ID or Bauble amount.');
                }

                // Check for extra_tax in arg2
                if (args[2] && !isNaN(parseInt(args[2]))) {
                    extraTax = parseInt(args[2]);
                    messageStartIdx = 3;
                } else {
                    messageStartIdx = 2;
                }
            }

            const customMessage = args.slice(messageStartIdx).join(' ') || null;

            let giftValue = 0;
            if (giftType === 'item') {
                const item = ITEMS[itemId];
                if (item.giftable === false) {
                    return message.reply(`❌ **${item.name}** is a premium/personal item and cannot be gifted!`);
                }

                const invItem = senderData.inventory?.find(i => i.itemId === itemId);
                if (!invItem || invItem.quantity < quantity) {
                    const count = invItem ? invItem.quantity : 0;
                    return message.reply(`❌ You do not have **${quantity}x ${item.name}** in your inventory. You only have **${count}**.`);
                }

                const RARITY_VALUES = {
                    Common: 5000,
                    Uncommon: 15000,
                    Rare: 50000,
                    Epic: 100000,
                    Legendary: 250000,
                    Mythic: 500000,
                    Unique: 1000000
                };
                giftValue = (item.basePrice || item.sellPrice || RARITY_VALUES[item.rarity] || 5000) * quantity;
            } else {
                giftValue = baublesAmount;
                if ((senderData.baubles || 0) < baublesAmount) {
                    return message.reply(`❌ You do not have **${baublesAmount.toLocaleString()}** Baubles to gift!`);
                }
            }

            // Calculate fees: 5% base fee (min 500) plus extra tax
            const globalMultiplier = await getGlobalMultiplier();
            const baseFee = Math.max(500, Math.floor((giftValue * 0.05) / globalMultiplier));
            const totalRequiredBaubles = (giftType === 'baubles' ? baublesAmount : 0) + baseFee + extraTax;

            if ((senderData.baubles || 0) < totalRequiredBaubles) {
                return message.reply(`❌ You do not have enough Baubles to cover the gift + delivery fee & tax!\nRequired: **${totalRequiredBaubles.toLocaleString()}** Baubles, but you only have **${(senderData.baubles || 0).toLocaleString()}** Glimmering Baubles.`);
            }

            // Deduct from sender
            senderData.baubles -= totalRequiredBaubles;
            if (giftType === 'item') {
                const invItem = senderData.inventory.find(i => i.itemId === itemId);
                invItem.quantity -= quantity;
                if (invItem.quantity <= 0) {
                    senderData.inventory = senderData.inventory.filter(i => i.itemId !== itemId);
                }
                senderData.markModified('inventory');
            }
            await senderData.save();

            // Create pending gift entry
            const newGift = new Gift({
                senderId,
                recipientId: targetUser.id,
                guildId: message.guild.id,
                giftType,
                itemId: giftType === 'item' ? itemId : null,
                quantity: giftType === 'item' ? quantity : 0,
                amount: giftType === 'baubles' ? baublesAmount : 0,
                message: customMessage,
                extraTax: extraTax
            });
            await newGift.save();

            // Deposit fees to federal Tax Fund
            const totalTaxContribution = baseFee + extraTax;
            const GlobalEconomy = require('../../models/GlobalEconomy');
            await GlobalEconomy.findOneAndUpdate(
                {},
                { $inc: { taxFund: totalTaxContribution } },
                { upsert: true }
            );

            // Trigger Global Generosity alerts if amount >= 100k OR extraTax >= 100k
            const isHighValue = giftValue >= 100000 || extraTax >= 100000;
            if (isHighValue) {
                const displayItemOrVal = giftType === 'baubles' ? baublesAmount : `${quantity}x ${ITEMS[itemId].name}`;
                triggerGlobalGenerosityAlert(message.client, message.author, targetUser, displayItemOrVal, 'gift', extraTax);
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎁 Gift Wrapped & Sent!')
                .setDescription(`Successfully wrapped a gift for **${targetUser.username}**!\n\n💸 **Base Gifting Fee:** \`${baseFee.toLocaleString()} Baubles\`\n💸 **Extra Tax Tip:** \`${extraTax.toLocaleString()} Baubles\`\n*(Both added directly to the federal Tax Fund)*`)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Gifting System' });

            if (customMessage) {
                successEmbed.addFields({ name: '✉️ Card Message', value: `*"${customMessage}"*` });
            }

            // Notify recipient in DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setTitle('📬 You have a Pending Gift!')
                    .setDescription(`**${message.author.username}** has sent you a wrapped gift in **${message.guild.name}**!\n\nUse \`-opengift\` or \`/opengift\` in the server to open and claim it!`)
                    .setTimestamp();
                if (customMessage) {
                    dmEmbed.addFields({ name: '✉️ Card Message Preview', value: `*"${customMessage}"*` });
                }
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (_) {}

            return message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in gift prefix command:', error);
            return message.reply('❌ An error occurred while wrapping the gift.');
        }
    }
};
