/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS, checkCollections } = require('../../utils/items');

module.exports = {
    category: 'economy',
    aliases: ['inv'],
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your items and active status effects.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            const { unlockedCollections, unlockedTitles } = await checkCollections(baubleData);
            const embed = buildMinimalInventory(baubleData, interaction.user, unlockedCollections, unlockedTitles);
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

            if (!baubleData) {
                baubleData = new Bauble({ userId });
                await baubleData.save();
            }

            const { unlockedCollections, unlockedTitles } = await checkCollections(baubleData);
            const embed = buildMinimalInventory(baubleData, message.author, unlockedCollections, unlockedTitles);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in inventory command (prefix):', error);
            await message.reply('❌ An error occurred while retrieving your inventory.');
        }
    }
};

function buildMinimalInventory(baubleData, user, unlockedCollections, unlockedTitles) {
    const embed = new EmbedBuilder()
        .setColor(0x2b2d42) // Minimal dark-slate theme
        .setAuthor({ name: `${user.username}'s Backpack`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    if (unlockedCollections.length > 0) {
        embed.setDescription(`🎉 **Collection Completed!**\nYou completed: ${unlockedCollections.map(c => `**${c}**`).join(', ')}` + 
            (unlockedTitles.length > 0 ? `\nEquip new titles using \`-title\`!` : ''));
    }

    // Status & Buffs Scanner
    const statusLines = [];
    const now = Date.now();

    if (baubleData.activeTitle) {
        statusLines.push(`🏷️ **Active Title:** \`${baubleData.activeTitle}\``);
    }
    if (baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.coffeeExpiresAt).getTime() / 1000);
        statusLines.push(`☕ **Espresso CD Boost:** CD halved • <t:${ts}:R>`);
    }
    if (baubleData.luckExpiresAt && now < new Date(baubleData.luckExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.luckExpiresAt).getTime() / 1000);
        const luckTime = new Date(baubleData.luckExpiresAt).getTime();
        const isRabbit = (luckTime % 10 === 5);
        statusLines.push(`🍀 **Luck Boost (${isRabbit ? '+15%' : '+10%'}):** active • <t:${ts}:R>`);
    }
    if (baubleData.luckPenaltyExpiresAt && now < new Date(baubleData.luckPenaltyExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.luckPenaltyExpiresAt).getTime() / 1000);
        statusLines.push(`🐰 **Luck Penalty (-15%):** cursed • <t:${ts}:R>`);
    }
    if (baubleData.grailIncomeExpiresAt && now < new Date(baubleData.grailIncomeExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.grailIncomeExpiresAt).getTime() / 1000);
        statusLines.push(`🏆 **Holy Grail (+50%):** income boost • <t:${ts}:R>`);
    }
    if (baubleData.divineDuckExpiresAt && now < new Date(baubleData.divineDuckExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.divineDuckExpiresAt).getTime() / 1000);
        statusLines.push(`✨ **Divine Duck (+100%):** income boost • <t:${ts}:R>`);
    }
    if (baubleData.shieldExpiresAt && now < new Date(baubleData.shieldExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.shieldExpiresAt).getTime() / 1000);
        statusLines.push(`🛡️ **Cardboard Shield (Immune):** active • <t:${ts}:R>`);
    }
    if (baubleData.padlockedExpiresAt && now < new Date(baubleData.padlockedExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.padlockedExpiresAt).getTime() / 1000);
        statusLines.push(`🔒 **Locked in Vault (Immune/Lockout):** active • <t:${ts}:R>`);
    }
    if (baubleData.invisibilityExpiresAt && now < new Date(baubleData.invisibilityExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.invisibilityExpiresAt).getTime() / 1000);
        statusLines.push(`💍 **Invisible (Immune/Rob Lockout):** active • <t:${ts}:R>`);
    }
    if (baubleData.blindedExpiresAt && now < new Date(baubleData.blindedExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.blindedExpiresAt).getTime() / 1000);
        statusLines.push(`🙈 **Blinded (No Item Use):** active • <t:${ts}:R>`);
    }
    if (baubleData.itemLockoutExpiresAt && now < new Date(baubleData.itemLockoutExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.itemLockoutExpiresAt).getTime() / 1000);
        statusLines.push(`⚡ **Paralyzed (No Item Use):** active • <t:${ts}:R>`);
    }
    if (baubleData.beamedExpiresAt && now < new Date(baubleData.beamedExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.beamedExpiresAt).getTime() / 1000);
        statusLines.push(`🛸 **Beamed Up (Lockout):** active • <t:${ts}:R>`);
    }
    if (baubleData.spaceDuckExpiresAt && now < new Date(baubleData.spaceDuckExpiresAt).getTime()) {
        const ts = Math.floor(new Date(baubleData.spaceDuckExpiresAt).getTime() / 1000);
        statusLines.push(`🚀 **Space Duck Intercept (5%):** active • <t:${ts}:R>`);
    }

    if (statusLines.length > 0) {
        addLongField(embed, '⚡ Active Stats & Buffs', statusLines);
    }

    // Inventory items formatting (Minimal bullet lists)
    const itemsList = [];
    if (baubleData.inventory && baubleData.inventory.length > 0) {
        for (const invItem of baubleData.inventory) {
            const item = ITEMS[invItem.itemId];
            if (item && invItem.quantity > 0) {
                const displayName = item.name.startsWith(item.emoji) ? item.name : `${item.emoji} ${item.name}`;
                itemsList.push(`• **${displayName}** × \`${invItem.quantity}\` (\`${item.id}\`)\n  ↳ _${item.description}_`);
            }
        }
    }

    if (itemsList.length > 0) {
        addLongField(embed, '🎒 Backpack Contents', itemsList);
    } else {
        embed.addFields({ name: '🎒 Backpack Contents', value: '_Empty. Go buy stuff from the shop!_' });
    }

    return embed;

    function addLongField(embedBuilder, fieldName, lines) {
        const MAX_FIELD_LENGTH = 1024;
        let currentLines = [];
        let currentLength = 0;
        let chunkIndex = 0;

        const pushChunk = () => {
            if (!currentLines.length) return;
            const value = currentLines.join('\n');
            embedBuilder.addFields({
                name: chunkIndex === 0 ? fieldName : `${fieldName} (cont.)`,
                value
            });
            chunkIndex += 1;
            currentLines = [];
            currentLength = 0;
        };

        for (const line of lines) {
            const lineLength = line.length + 1;
            if (currentLength + lineLength > MAX_FIELD_LENGTH) {
                pushChunk();
            }
            currentLines.push(line);
            currentLength += lineLength;
        }

        pushChunk();
    }
}
