/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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
            const pages = buildInventoryPages(baubleData, interaction.user, unlockedCollections, unlockedTitles);
            const components = createInventoryControls(userId, pages.length);
            const reply = await interaction.reply({ embeds: [pages[0]], components, fetchReply: true });

            if (pages.length > 1) {
                createInventoryCollector(reply, userId, pages);
            }

            return reply;
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
            const pages = buildInventoryPages(baubleData, message.author, unlockedCollections, unlockedTitles);
            const components = createInventoryControls(userId, pages.length);
            const reply = await message.reply({ embeds: [pages[0]], components });

            if (pages.length > 1) {
                createInventoryCollector(reply, userId, pages);
            }

            return reply;
        } catch (error) {
            console.error('Error in inventory command (prefix):', error);
            await message.reply('❌ An error occurred while retrieving your inventory.');
        }
    }
};

function buildInventoryPages(baubleData, user, unlockedCollections, unlockedTitles) {
    const baseEmbed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setAuthor({ name: `${user.username}'s Backpack`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    if (unlockedCollections.length > 0) {
        baseEmbed.setDescription(`🎉 **Collection Completed!**\nYou completed: ${unlockedCollections.map(c => `**${c}**`).join(', ')}` +
            (unlockedTitles.length > 0 ? `\nEquip new titles using \`-title\`!` : ''));
    }

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

    const itemsList = [];
    if (baubleData.inventory && baubleData.inventory.length > 0) {
        for (const invItem of baubleData.inventory) {
            const item = ITEMS[invItem.itemId];
            if (item && invItem.quantity > 0) {
                const displayName = item.name.startsWith(item.emoji) ? item.name : `${item.emoji} ${item.name}`;
                itemsList.push(`**${displayName}** × \`${invItem.quantity}\` (\`${item.id}\`)\n> ${item.description}`);
            }
        }
    }

    const pages = [];
    if (itemsList.length === 0) {
        const emptyEmbed = EmbedBuilder.from(baseEmbed).setFooter({ text: 'Page 1 of 1' });

        if (statusLines.length > 0) {
            emptyEmbed.addFields({ name: '⚡ Active Stats & Buffs', value: statusLines.join('\n') });
        }

        emptyEmbed.addFields({ name: '🎒 Backpack Contents', value: '_Empty. Go buy stuff from the shop!_' });
        pages.push(emptyEmbed);
        return pages;
    }

    const chunkSize = 4;
    const totalPages = Math.ceil(itemsList.length / chunkSize);

    for (let i = 0; i < itemsList.length; i += chunkSize) {
        const pageEmbed = EmbedBuilder.from(baseEmbed).setFooter({ text: `Page ${pages.length + 1} of ${totalPages}` });

        if (statusLines.length > 0) {
            pageEmbed.addFields({ name: '⚡ Active Stats & Buffs', value: statusLines.join('\n') });
        }

        const pageItems = itemsList.slice(i, i + chunkSize).join('\n\n');
        pageEmbed.addFields({ name: '🎒 Backpack Contents', value: pageItems });
        pages.push(pageEmbed);
    }

    return pages;
}

function createInventoryControls(userId, pageCount) {
    const isSinglePage = pageCount <= 1;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`inventory_prev_${userId}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
                .setDisabled(isSinglePage),
            new ButtonBuilder()
                .setCustomId(`inventory_next_${userId}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➡️')
                .setDisabled(isSinglePage),
            new ButtonBuilder()
                .setCustomId(`inventory_close_${userId}`)
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        )
    ];
}

function createInventoryCollector(message, userId, pages) {
    let currentPage = 0;
    const collector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === userId,
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (button) => {
        if (button.user.id !== userId) {
            return button.reply({ content: 'This inventory is only interactive for the original user.', ephemeral: true });
        }

        if (button.customId === `inventory_close_${userId}`) {
            collector.stop('closed');
            return button.update({ components: [disableInventoryControls(button.message.components[0])] });
        }

        if (button.customId === `inventory_prev_${userId}`) {
            currentPage = Math.max(currentPage - 1, 0);
        }
        if (button.customId === `inventory_next_${userId}`) {
            currentPage = Math.min(currentPage + 1, pages.length - 1);
        }

        await button.update({ embeds: [pages[currentPage]], components: [updateInventoryControls(button.message.components[0], currentPage, pages.length)] });
    });

    collector.on('end', async (_, reason) => {
        if (reason !== 'closed') {
            try {
                await message.edit({ components: [disableInventoryControls(message.components[0])] });
            } catch (error) {
                console.error('Failed to disable inventory controls after timeout:', error);
            }
        }
    });
}

function updateInventoryControls(actionRow, currentPage, pageCount) {
    const prev = ButtonBuilder.from(actionRow.components[0]).setDisabled(currentPage === 0);
    const next = ButtonBuilder.from(actionRow.components[1]).setDisabled(currentPage >= pageCount - 1);
    const close = ButtonBuilder.from(actionRow.components[2]).setDisabled(false);

    return new ActionRowBuilder().addComponents(prev, next, close);
}

function disableInventoryControls(actionRow) {
    const prev = ButtonBuilder.from(actionRow.components[0]).setDisabled(true);
    const next = ButtonBuilder.from(actionRow.components[1]).setDisabled(true);
    const close = ButtonBuilder.from(actionRow.components[2]).setDisabled(true);

    return new ActionRowBuilder().addComponents(prev, next, close);
}
