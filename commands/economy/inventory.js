/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS } = require('./shop');

module.exports = {
    category: 'economy',
    aliases: ['inv'],
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View the items in your inventory.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData || (!baubleData.inventory?.length && !baubleData.coffeeExpiresAt && !baubleData.luckExpiresAt)) {
                return interaction.reply({ content: '🎒 Your inventory is empty! Use `/shop` to purchase some items.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setAuthor({ name: `${interaction.user.username}'s Inventory`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            // Active Boosters
            const activeBuffs = [];
            const now = Date.now();
            if (baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                const ts = Math.floor(new Date(baubleData.coffeeExpiresAt).getTime() / 1000);
                activeBuffs.push(`☕ **Energizing Coffee** (halves work/scavenge cooldowns) — expires <t:${ts}:R>`);
            }
            if (baubleData.luckExpiresAt && now < new Date(baubleData.luckExpiresAt).getTime()) {
                const ts = Math.floor(new Date(baubleData.luckExpiresAt).getTime() / 1000);
                activeBuffs.push(`🍀 **Lucky Clover** (+10% gamble/coinflip luck) — expires <t:${ts}:R>`);
            }

            if (activeBuffs.length > 0) {
                embed.addFields({ name: '⚡ Active Boosters', value: activeBuffs.join('\n') });
            }

            // Inventory Items
            const itemsList = [];
            if (baubleData.inventory && baubleData.inventory.length > 0) {
                for (const invItem of baubleData.inventory) {
                    const item = ITEMS[invItem.itemId];
                    if (item && invItem.quantity > 0) {
                        itemsList.push(`**${item.name}** x\`${invItem.quantity}\` (\`${item.id}\`)\n_${item.description}_`);
                    }
                }
            }

            if (itemsList.length > 0) {
                embed.addFields({ name: '🎒 Items', value: itemsList.join('\n\n') });
            } else {
                embed.addFields({ name: '🎒 Items', value: '_No items in your backpack._' });
            }

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in inventory command:', error);
            await interaction.reply({ content: '❌ An error occurred while retrieving your inventory.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData || (!baubleData.inventory?.length && !baubleData.coffeeExpiresAt && !baubleData.luckExpiresAt)) {
                return message.reply('🎒 Your inventory is empty! Use `-shop` to purchase some items.');
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setAuthor({ name: `${message.author.username}'s Inventory`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            // Active Boosters
            const activeBuffs = [];
            const now = Date.now();
            if (baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                const ts = Math.floor(new Date(baubleData.coffeeExpiresAt).getTime() / 1000);
                activeBuffs.push(`☕ **Energizing Coffee** (halves work/scavenge cooldowns) — expires <t:${ts}:R>`);
            }
            if (baubleData.luckExpiresAt && now < new Date(baubleData.luckExpiresAt).getTime()) {
                const ts = Math.floor(new Date(baubleData.luckExpiresAt).getTime() / 1000);
                activeBuffs.push(`🍀 **Lucky Clover** (+10% gamble/coinflip luck) — expires <t:${ts}:R>`);
            }

            if (activeBuffs.length > 0) {
                embed.addFields({ name: '⚡ Active Boosters', value: activeBuffs.join('\n') });
            }

            // Inventory Items
            const itemsList = [];
            if (baubleData.inventory && baubleData.inventory.length > 0) {
                for (const invItem of baubleData.inventory) {
                    const item = ITEMS[invItem.itemId];
                    if (item && invItem.quantity > 0) {
                        itemsList.push(`**${item.name}** x\`${invItem.quantity}\` (\`${item.id}\`)\n_${item.description}_`);
                    }
                }
            }

            if (itemsList.length > 0) {
                embed.addFields({ name: '🎒 Items', value: itemsList.join('\n\n') });
            } else {
                embed.addFields({ name: '🎒 Items', value: '_No items in your backpack._' });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in inventory command:', error);
            await message.reply('❌ An error occurred while retrieving your inventory.');
        }
    }
};
