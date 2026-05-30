/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getIncomeMultiplier, rollItemDrop, addItemToInventory } = require('../../utils/items');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const COOLDOWN_SEC = 30;

async function doFishing(userId, client) {
    const now = Date.now();
    const cooldownMs = COOLDOWN_SEC * 1000;

    if (!client.cooldowns.has('fish')) {
        client.cooldowns.set('fish', new Collection());
    }
    const timestamps = client.cooldowns.get('fish');

    // Skip Energizing Coffee for fishing since it is only for work/scavenge, but let's check it anyway just in case:
    // Coffee does not apply to fishing, keeping standard 30s cooldown.
    if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownMs;
        if (now < expirationTime) {
            return { error: true, timeLeft: Math.ceil((expirationTime - now) / 1000) };
        }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownMs);

    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        baubleData = new Bauble({ userId });
    }

    const incomeMult = await getIncomeMultiplier(userId);
    const globalMult = await getGlobalMultiplier();

    // 40% chance of only coins, 60% chance of item + coins
    const baseCoins = Math.floor(Math.random() * 41) + 20; // 20-60
    const coins = Math.floor(baseCoins * incomeMult * globalMult);

    let itemReward = null;
    const itemRoll = Math.random();
    if (itemRoll < 0.65) {
        itemReward = await rollItemDrop(['fishing']);
    }

    let resultMsg = '';
    let color = 0x3498db; // Blue

    if (itemReward) {
        addItemToInventory(baubleData, itemReward.id, 1);
        resultMsg = `🎣 You cast your line and caught a **${itemReward.name}**!\n_${itemReward.description}_`;
        if (coins > 0) {
            baubleData.baubles += coins;
            resultMsg += `\nPlus you found **${coins}** Baubles tangled in the net!`;
        }
        // Change color based on item rarity
        if (itemReward.rarity === 'Legendary') color = 0xe67e22;
        else if (itemReward.rarity === 'Epic') color = 0x9b59b6;
        else if (itemReward.rarity === 'Mythic') color = 0xe74c3c;
        else if (itemReward.rarity === 'Unique') color = 0xf1c40f;
    } else {
        baubleData.baubles += coins;
        resultMsg = `🎣 You cast your line and reeled in **${coins}** Baubles!`;
        color = 0x2ecc71; // Green
    }

    await baubleData.save();

    return {
        error: false,
        resultMsg,
        color,
        balance: baubleData.baubles
    };
}

function createComponents(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`fish_again_${userId}`)
            .setLabel('Fish Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎣')
    );
}

module.exports = {
    category: 'economy',
    cooldown: COOLDOWN_SEC,
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Cast your fishing line and catch rare items or baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const res = await doFishing(userId, interaction.client);

            if (res.error) {
                return interaction.reply({ content: `⏳ Please wait **${res.timeLeft}s** before fishing again.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${interaction.user.username} is fishing...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `fish_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doFishing(userId, interaction.client);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${interaction.user.username} is fishing...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in fishing repeat button collect:', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in fish execute:', error);
            await interaction.reply({ content: '❌ An error occurred while fishing.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const res = await doFishing(userId, message.client);

            if (res.error) {
                return message.reply(`⏳ Please wait **${res.timeLeft}s** before fishing again.`);
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${message.author.username} is fishing...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await message.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `fish_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doFishing(userId, message.client);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${message.author.username} is fishing...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in fishing repeat button collect (prefix):', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in fish prefix:', error);
            await message.reply('❌ An error occurred while fishing.');
        }
    }
};
