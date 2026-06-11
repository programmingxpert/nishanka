/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const Gift = require('../../models/giftSchema');
const { ITEMS, addItemToInventory } = require('../../utils/items');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('opengift')
        .setDescription('Open and claim all pending wrapped gifts sent to you!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const gifts = await Gift.find({ recipientId: userId, claimed: false });

            if (gifts.length === 0) {
                return interaction.reply({ content: '❌ You do not have any pending wrapped gifts to open! Tell someone to `/gift` you! 🎁', ephemeral: true });
            }

            let recipientData = await Bauble.findOne({ userId });
            if (!recipientData) {
                recipientData = new Bauble({ userId, baubles: 0, inventory: [] });
            }

            const claimedLines = [];
            const fields = [];
            let containsHighValue = false;

            for (const gift of gifts) {
                gift.claimed = true;
                gift.claimedAt = new Date();
                await gift.save();

                let giftDisplay = '';
                if (gift.giftType === 'baubles') {
                    recipientData.baubles += gift.amount;
                    giftDisplay = `🪙 **${gift.amount.toLocaleString()} Baubles**`;
                    if (gift.amount >= 100000) containsHighValue = true;
                } else if (gift.giftType === 'item') {
                    addItemToInventory(recipientData, gift.itemId, gift.quantity);
                    const item = ITEMS[gift.itemId];
                    const itemName = item?.name || gift.itemId;
                    giftDisplay = `📦 **${gift.quantity}x ${itemName}**`;
                    if (item && (item.rarity === 'Mythic' || item.rarity === 'Unique' || item.rarity === 'Legendary')) {
                        containsHighValue = true;
                    }
                }

                if (gift.extraTax >= 100000) containsHighValue = true;

                claimedLines.push(`• ${giftDisplay} from <@${gift.senderId}>`);

                // Create a card field for each gift
                let senderTag = `Sender: <@${gift.senderId}>`;
                let giftCardText = `🎁 **Contents:** ${giftDisplay}`;
                if (gift.message) {
                    giftCardText += `\n✉️ *Message:* "${gift.message}"`;
                }
                if (gift.extraTax > 0) {
                    giftCardText += `\n💸 *Sender Extra Tax Tip:* **${gift.extraTax.toLocaleString()}** Baubles`;
                }

                fields.push({
                    name: `✉️ Card from User`,
                    value: giftCardText,
                    inline: false
                });
            }

            recipientData.markModified('inventory');
            await recipientData.save();

            const embed = new EmbedBuilder()
                .setColor(containsHighValue ? 0xF1C40F : 0x9B59B6) // Gold or Purple
                .setTitle(containsHighValue ? '✨ 🎁 LEGENDARY GIFTS UNWRAPPED! 🎁 ✨' : '🎁 Gifts Opened!')
                .setDescription(`🎉 **Congratulations!** You unwrapped **${gifts.length}** gift(s)!\n\n${claimedLines.join('\n')}\n\n*All contents have been added directly to your wallet/bag.*`)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Gifting System' });

            if (fields.length <= 10) {
                embed.addFields(fields);
            } else {
                // Too many cards, summarize
                embed.addFields({ name: '✉️ Card Messages', value: `Opened too many gifts to show individual cards! Check your DMs for previews.` });
            }

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in opengift slash command:', error);
            return interaction.reply({ content: '❌ An error occurred while opening your gifts.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const gifts = await Gift.find({ recipientId: userId, claimed: false });

            if (gifts.length === 0) {
                return message.reply('❌ You do not have any pending wrapped gifts to open! Tell someone to gift you with `-gift`! 🎁');
            }

            let recipientData = await Bauble.findOne({ userId });
            if (!recipientData) {
                recipientData = new Bauble({ userId, baubles: 0, inventory: [] });
            }

            const claimedLines = [];
            const fields = [];
            let containsHighValue = false;

            for (const gift of gifts) {
                gift.claimed = true;
                gift.claimedAt = new Date();
                await gift.save();

                let giftDisplay = '';
                if (gift.giftType === 'baubles') {
                    recipientData.baubles += gift.amount;
                    giftDisplay = `🪙 **${gift.amount.toLocaleString()} Baubles**`;
                    if (gift.amount >= 100000) containsHighValue = true;
                } else if (gift.giftType === 'item') {
                    addItemToInventory(recipientData, gift.itemId, gift.quantity);
                    const item = ITEMS[gift.itemId];
                    const itemName = item?.name || gift.itemId;
                    giftDisplay = `📦 **${gift.quantity}x ${itemName}**`;
                    if (item && (item.rarity === 'Mythic' || item.rarity === 'Unique' || item.rarity === 'Legendary')) {
                        containsHighValue = true;
                    }
                }

                if (gift.extraTax >= 100000) containsHighValue = true;

                claimedLines.push(`• ${giftDisplay} from <@${gift.senderId}>`);

                let giftCardText = `🎁 **Contents:** ${giftDisplay}`;
                if (gift.message) {
                    giftCardText += `\n✉️ *Message:* "${gift.message}"`;
                }
                if (gift.extraTax > 0) {
                    giftCardText += `\n💸 *Sender Extra Tax Tip:* **${gift.extraTax.toLocaleString()}** Baubles`;
                }

                fields.push({
                    name: `✉️ Card from User`,
                    value: giftCardText,
                    inline: false
                });
            }

            recipientData.markModified('inventory');
            await recipientData.save();

            const embed = new EmbedBuilder()
                .setColor(containsHighValue ? 0xF1C40F : 0x9B59B6)
                .setTitle(containsHighValue ? '✨ 🎁 LEGENDARY GIFTS UNWRAPPED! 🎁 ✨' : '🎁 Gifts Opened!')
                .setDescription(`🎉 **Congratulations!** You unwrapped **${gifts.length}** gift(s)!\n\n${claimedLines.join('\n')}\n\n*All contents have been added directly to your wallet/bag.*`)
                .setTimestamp()
                .setFooter({ text: 'Nishanka Gifting System' });

            if (fields.length <= 10) {
                embed.addFields(fields);
            } else {
                embed.addFields({ name: '✉️ Card Messages', value: `Opened too many gifts to show individual cards!` });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in opengift prefix command:', error);
            return message.reply('❌ An error occurred while opening your gifts.');
        }
    }
};
