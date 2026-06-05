/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getIncomeMultiplier, rollItemDrop, addItemToInventory } = require('../../utils/items');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const COOLDOWN_SEC = 60; // 1 minute standard cooldown

const SUCCESS_SCENARIOS = [
    { text: "You pickpocketed a wealthy-looking tourist. You stole **{coins}** Baubles!", chance: 0.35 },
    { text: "You hotwired a luxury sports car and sold it to a chop shop for **{coins}** Baubles!", chance: 0.25 },
    { text: "You hacked into a small crypto exchange and transferred **{coins}** Baubles to your wallet!", chance: 0.20 },
    { text: "You blackmailed a corrupt politician, receiving hush money of **{coins}** Baubles!", chance: 0.20 }
];

const FAILURE_SCENARIOS = [
    { text: "You tried to shoplift a candy bar, but the store manager chased you out. You lost **{coins}** Baubles while escaping!", fineMin: 50, fineMax: 200 },
    { text: "You tried to hack a database, but their firewall caught you. You had to hire a lawyer for **{coins}** Baubles!", fineMin: 100, fineMax: 300 },
    { text: "You tried to mug an old lady, but she whipped you with her purse. You dropped **{coins}** Baubles in panic!", fineMin: 30, fineMax: 150 }
];

const ARREST_SCENARIOS = [
    { text: "🚔 SWAT BUST! You got caught red-handed! The police fined you **{coins}** Baubles and locked you up in jail (5-minute crime lockout)!" }
];

async function doCrime(userId, client, isButton = false) {
    const now = Date.now();
    const cooldownMs = COOLDOWN_SEC * 1000;

    if (isButton) {
        if (!client.cooldowns.has('crime')) {
            client.cooldowns.set('crime', new Collection());
        }
        const timestamps = client.cooldowns.get('crime');

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownMs;
            if (now < expirationTime) {
                return { error: true, timeLeft: Math.ceil((expirationTime - now) / 1000) };
            }
        }

        // Set standard cooldown first
        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownMs);
    }

    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        baubleData = new Bauble({ userId });
    }

    baubleData.crimesAttempted = (baubleData.crimesAttempted || 0) + 1;

    const incomeMult = await getIncomeMultiplier(userId);
    const globalMult = await getGlobalMultiplier();

    const rng = Math.random();

    let resultMsg = '';
    let color = 0x2ecc71; // Green for success
    let isArrested = false;

    if (rng < 0.60) {
        // SUCCESS (60% chance)
        baubleData.crimesSuccessful = (baubleData.crimesSuccessful || 0) + 1;
        const baseCoins = Math.floor(Math.random() * 151) + 50; // 50-200
        const coins = Math.floor(baseCoins * incomeMult * globalMult);

        const scenario = SUCCESS_SCENARIOS[Math.floor(Math.random() * SUCCESS_SCENARIOS.length)];
        resultMsg = scenario.text.replace('{coins}', coins.toLocaleString());
        baubleData.baubles += coins;
        baubleData.crimeSuccessStreak = (baubleData.crimeSuccessStreak || 0) + 1;

        // Crime success can drop ANY rare/epic/unique item (5% chance)
        const itemRoll = Math.random();
        if (itemRoll < 0.15) { // 15% chance of item reward on crime success
            // Categories allowed for crime drops: dumpster, digging, fishing, mythic, unique, cosmetics
            const itemReward = await rollItemDrop(['dumpster', 'digging', 'fishing', 'mythic', 'unique', 'cosmetics']);
            if (itemReward) {
                addItemToInventory(baubleData, itemReward.id, 1);
                resultMsg += `\n\nOMGOMGOM! While fleeing, you also found a **${itemReward.name}** dropped on the street!\n_${itemReward.description}_`;
                
                // Color override for item rarity
                if (itemReward.rarity === 'Legendary') color = 0xe67e22;
                else if (itemReward.rarity === 'Epic') color = 0x9b59b6;
                else if (itemReward.rarity === 'Mythic') color = 0xe74c3c;
                else if (itemReward.rarity === 'Unique') color = 0xf1c40f;
            }
        }
    } else if (rng < 0.85) {
        // FAIL (25% chance) - Lose some baubles
        const scenario = FAILURE_SCENARIOS[Math.floor(Math.random() * FAILURE_SCENARIOS.length)];
        const baseFine = Math.floor(Math.random() * (scenario.fineMax - scenario.fineMin + 1)) + scenario.fineMin;
        const fine = Math.floor(baseFine * globalMult);
        
        baubleData.baubles = Math.max(0, baubleData.baubles - fine);
        resultMsg = scenario.text.replace('{coins}', fine.toLocaleString());
        color = 0xe67e22; // Orange for failure

        try {
            const GlobalEconomy = require('../../models/GlobalEconomy');
            let globalEco = await GlobalEconomy.findOne();
            if (!globalEco) globalEco = new GlobalEconomy({ taxFund: 0 });
            globalEco.taxFund = (globalEco.taxFund || 0) + fine;
            await globalEco.save();
        } catch (err) {
            console.error('Failed to add crime fine to taxfund:', err);
        }
    } else {
        // ARRESTED (15% chance) - Heavy penalty + 5m cooldown lock
        isArrested = true;
        const fine = Math.floor((Math.random() * 200 + 150) * globalMult); // 150-350 fine
        baubleData.baubles = Math.max(0, baubleData.baubles - fine);
        baubleData.crimeSuccessStreak = 0; // Reset consecutive crime success streak on arrest

        const scenario = ARREST_SCENARIOS[Math.floor(Math.random() * ARREST_SCENARIOS.length)];
        resultMsg = scenario.text.replace('{coins}', fine.toLocaleString());
        color = 0xe74c3c; // Red for arrest

        try {
            const GlobalEconomy = require('../../models/GlobalEconomy');
            let globalEco = await GlobalEconomy.findOne();
            if (!globalEco) globalEco = new GlobalEconomy({ taxFund: 0 });
            globalEco.taxFund = (globalEco.taxFund || 0) + fine;
            await globalEco.save();
        } catch (err) {
            console.error('Failed to add crime arrest fine to taxfund:', err);
        }

        // Lock them out of crime for 5 minutes by overriding the cooldown timestamp in client cache
        if (!client.cooldowns.has('crime')) {
            client.cooldowns.set('crime', new Collection());
        }
        const crimeTimestamps = client.cooldowns.get('crime');
        const arrestLockMs = 300 * 1000;
        crimeTimestamps.set(userId, now + arrestLockMs - cooldownMs);
    }

    await baubleData.save();

    // Achievement checks
    if (client) {
        const { checkAndAwardAchievement } = require('../../utils/achievements');
        if (rng < 0.60) {
            if ((baubleData.crimeSuccessStreak || 0) >= 300) {
                await checkAndAwardAchievement(client, userId, 'crime_lord', null);
            }
            if ((baubleData.crimesSuccessful || 0) >= 50) {
                await checkAndAwardAchievement(client, userId, 'crime_success_50', null);
            }
            if ((baubleData.crimesSuccessful || 0) >= 200) {
                await checkAndAwardAchievement(client, userId, 'crime_success_200', null);
            }
        }
        if ((baubleData.crimesAttempted || 0) >= 100) {
            await checkAndAwardAchievement(client, userId, 'crime_attempt_100', null);
        }
    }

    return {
        error: false,
        resultMsg,
        color,
        balance: baubleData.baubles,
        isArrested
    };
}

function createComponents(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`crime_again_${userId}`)
            .setLabel('Try Crime Again')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔫')
    );
}

module.exports = {
    category: 'economy',
    cooldown: COOLDOWN_SEC,
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commit a high-risk crime to steal Glimmering Baubles or rare items!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const res = await doCrime(userId, interaction.client);

            if (res.error) {
                return interaction.reply({ content: `⏳ Please wait **${res.timeLeft}s** before trying another crime.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${interaction.user.username} is planning a heist...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `crime_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doCrime(userId, interaction.client, true);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${interaction.user.username} is planning a heist...`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in crime repeat button collect:', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in crime execute:', error);
            await interaction.reply({ content: '❌ An error occurred while committing crime.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const res = await doCrime(userId, message.client);

            if (res.error) {
                return message.reply(`⏳ Please wait **${res.timeLeft}s** before trying another crime.`);
            }

            const embed = new EmbedBuilder()
                .setColor(res.color)
                .setAuthor({ name: `${message.author.username} is planning a heist...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(res.resultMsg)
                .addFields({ name: '💰 Balance', value: `${res.balance.toLocaleString()} Baubles`, inline: true })
                .setTimestamp();

            const row = createComponents(userId);
            const response = await message.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === `crime_again_${userId}`,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    const newRes = await doCrime(userId, message.client, true);
                    if (newRes.error) {
                        return i.followUp({ content: `⏳ Cooldown active! Wait **${newRes.timeLeft}s**.`, ephemeral: true });
                    }

                    const newEmbed = new EmbedBuilder()
                        .setColor(newRes.color)
                        .setAuthor({ name: `${message.author.username} is planning a heist...`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setDescription(newRes.resultMsg)
                        .addFields({ name: '💰 Balance', value: `${newRes.balance.toLocaleString()} Baubles`, inline: true })
                        .setTimestamp();

                    await response.edit({ embeds: [newEmbed], components: [row] });
                } catch (err) {
                    console.error('Error in crime repeat button collect (prefix):', err);
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in crime prefix:', error);
            await message.reply('❌ An error occurred while committing crime.');
        }
    }
};
