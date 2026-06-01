/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getIncomeMultiplier, rollItemDrop, addItemToInventory } = require('../../utils/items');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const COOLDOWN_SEC = 300; // 5 minutes

async function doDumpsterDive(userId, client, isButton = false) {
    const now = Date.now();
    const cooldownMs = COOLDOWN_SEC * 1000;

    if (isButton) {
        if (!client.cooldowns.has('dumpster')) {
            client.cooldowns.set('dumpster', new Collection());
        }
        const timestamps = client.cooldowns.get('dumpster');

        // Coffee booster halves scavenge AND dumpster cooldowns! Let's check:
        let finalCooldownMs = cooldownMs;
        const baubleDataCheck = await Bauble.findOne({ userId }).lean();
        if (baubleDataCheck && baubleDataCheck.coffeeExpiresAt && now < new Date(baubleDataCheck.coffeeExpiresAt).getTime()) {
            finalCooldownMs /= 2; // 2.5 minutes if coffee is active
        }

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + finalCooldownMs;
            if (now < expirationTime) {
                return { error: true, timeLeft: Math.ceil((expirationTime - now) / 1000) };
            }
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), finalCooldownMs);
    }

    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        baubleData = new Bauble({ userId });
    }

    const incomeMult = await getIncomeMultiplier(userId);
    const globalMult = await getGlobalMultiplier();

    // Small cash drop or item
    const baseCoins = Math.floor(Math.random() * 21) + 5; // 5-25
    const coins = Math.floor(baseCoins * incomeMult * globalMult);

    let itemReward = null;
    const itemRoll = Math.random();
    if (itemRoll < 0.70) { // 70% chance of dumpster item
        itemReward = await rollItemDrop(['dumpster']);
    }

    let resultMsg = '';
    let color = 0x556b2f; // Olive Green/Ugly Trash color

    if (itemReward) {
        addItemToInventory(baubleData, itemReward.id, 1);
        resultMsg = `🗑️ You dove into the dumpster and pulled out a **${itemReward.name}**!\n_${itemReward.description}_`;
        if (coins > 0) {
            baubleData.baubles += coins;
            resultMsg += `\nPlus you found a crumpled bill worth **${coins}** Baubles!`;
        }
        if (itemReward.rarity === 'Legendary') color = 0xe67e22;
        else if (itemReward.rarity === 'Epic') color = 0x9b59b6;
        else if (itemReward.rarity === 'Mythic') color = 0xe74c3c;
        else if (itemReward.rarity === 'Unique') color = 0xf1c40f;
    } else {
        baubleData.baubles += coins;
        resultMsg = `🗑️ You rummaged through the dumpster and only found **${coins}** Baubles!`;
        color = 0x7f8c8d; // Gray
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
            .setCustomId(`dumpster_again_${userId}`)
            .setLabel('Dive Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗑️')
    );
}

module.exports = {
    category: 'economy',
    cooldown: COOLDOWN_SEC,
    data: new SlashCommandBuilder()
        .setName('dumpster')
        .setDescription('Dumpster dive'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const res = await doDumpsterDive(userId, interaction.client);

            if (res.error) {
                return interaction.reply({ content: `⏳ Please wait **${res.timeLeft}s** before dumpster diving again.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${interaction.user.username} is dumpster diving...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `dumpster_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doDumpsterDive(userId, interaction.client, true);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${interaction.user.username} is dumpster diving...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in dumpster repeat button collect:', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in dumpster execute:', error);
            await interaction.reply({ content: '❌ An error occurred while dumpster diving.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const res = await doDumpsterDive(userId, message.client);

            if (res.error) {
                return message.reply(`⏳ Please wait **${res.timeLeft}s** before dumpster diving again.`);
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${message.author.username} is dumpster diving...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await message.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `dumpster_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doDumpsterDive(userId, message.client, true);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${message.author.username} is dumpster diving...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in dumpster repeat button collect (prefix):', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in dumpster prefix:', error);
            await message.reply('❌ An error occurred while dumpster diving.');
        }
    }
};
