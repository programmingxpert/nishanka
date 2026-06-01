/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getIncomeMultiplier, rollItemDrop, addItemToInventory } = require('../../utils/items');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const EXPEDITION_DURATION_MS = 3600 * 1000; // 1 hour

const EXPEDITION_STORIES = [
    { text: "🌲 You ventured deep into the Whispering Woods. You tripped over a root and got a sprained ankle, but you found a hidden cache containing **{coins}** Baubles!", injury: true },
    { text: "🏺 You discovered an ancient tomb buried under sand dunes. Inside, you bypassed old security traps and retrieved **{coins}** Baubles!", injury: false },
    { text: "🏔️ You climbed the frozen heights of Mt. Shanka. You got minor frostbite on your fingers, but you mined some rare mineral veins worth **{coins}** Baubles!", injury: true },
    { text: "🛸 You stumbled upon a crashed UFO in the swamp. The radiation gave you a headache, but you recovered alien tech sold for **{coins}** Baubles!", injury: true },
    { text: "🏴‍☠️ You sailed to a remote shipwreck. You fought off crab monsters and returned with **{coins}** Baubles!", injury: false }
];

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('expedition')
        .setDescription('1-hour expedition'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
            }

            const now = Date.now();
            const exp = baubleData.activeExpedition || { status: 'idle' };

            if (exp.status === 'exploring') {
                const endTime = new Date(exp.endTime).getTime();
                if (now < endTime) {
                    const remainingSec = Math.ceil((endTime - now) / 1000);
                    const hours = Math.floor(remainingSec / 3600);
                    const minutes = Math.floor((remainingSec % 3600) / 60);
                    const seconds = remainingSec % 60;
                    
                    const timeStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle('🧭 Expedition in Progress')
                        .setDescription(`Your character is currently exploring the wilderness. They will return in **${timeStr}**.\n\nCome back then to claim your rewards!`)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed] });
                } else {
                    // Ready to claim!
                    await claimExpedition(interaction, baubleData, true);
                }
            } else {
                // Idle, start a new one!
                baubleData.activeExpedition = {
                    startedAt: new Date(now),
                    endTime: new Date(now + EXPEDITION_DURATION_MS),
                    status: 'exploring'
                };
                await baubleData.save();

                const endTimestamp = Math.floor((now + EXPEDITION_DURATION_MS) / 1000);
                const embed = new EmbedBuilder()
                    .setColor(0xe67e22)
                    .setTitle('🧭 Expedition Started!')
                    .setDescription(`⛵ You have packed your gear and set off on a dangerous expedition!\n\nYou will return <t:${endTimestamp}:R>. Run this command again then to see what you found!`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in expedition command:', error);
            await interaction.reply({ content: '❌ An error occurred while managing your expedition.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId });
            }

            const now = Date.now();
            const exp = baubleData.activeExpedition || { status: 'idle' };

            if (exp.status === 'exploring') {
                const endTime = new Date(exp.endTime).getTime();
                if (now < endTime) {
                    const remainingSec = Math.ceil((endTime - now) / 1000);
                    const hours = Math.floor(remainingSec / 3600);
                    const minutes = Math.floor((remainingSec % 3600) / 60);
                    const seconds = remainingSec % 60;
                    
                    const timeStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle('🧭 Expedition in Progress')
                        .setDescription(`Your character is currently exploring the wilderness. They will return in **${timeStr}**.\n\nCome back then to claim your rewards!`)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                } else {
                    // Ready to claim!
                    await claimExpedition(message, baubleData, false);
                }
            } else {
                // Idle, start a new one!
                baubleData.activeExpedition = {
                    startedAt: new Date(now),
                    endTime: new Date(now + EXPEDITION_DURATION_MS),
                    status: 'exploring'
                };
                await baubleData.save();

                const endTimestamp = Math.floor((now + EXPEDITION_DURATION_MS) / 1000);
                const embed = new EmbedBuilder()
                    .setColor(0xe67e22)
                    .setTitle('🧭 Expedition Started!')
                    .setDescription(`⛵ You have packed your gear and set off on a dangerous expedition!\n\nYou will return <t:${endTimestamp}:R>. Run this command again then to see what you found!`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in expedition prefix:', error);
            await message.reply('❌ An error occurred while managing your expedition.');
        }
    }
};

async function claimExpedition(context, baubleData, isSlash) {
    const user = isSlash ? context.user : context.author;
    const incomeMult = await getIncomeMultiplier(user.id);
    const globalMult = await getGlobalMultiplier();

    // 1. Pick a scenario
    const scenario = EXPEDITION_STORIES[Math.floor(Math.random() * EXPEDITION_STORIES.length)];

    // 2. Base Baubles reward: 200 - 500
    const baseCoins = Math.floor(Math.random() * 301) + 200;
    const coins = Math.floor(baseCoins * incomeMult * globalMult);

    baubleData.baubles += coins;

    // 3. Roll for items: 80% chance of 1 item, 20% chance of 2 items
    const rolledItems = [];
    const itemCategories = ['fishing', 'digging', 'dumpster', 'ducks', 'computers', 'mythic', 'unique'];
    
    const item1 = await rollItemDrop(itemCategories);
    if (item1) {
        addItemToInventory(baubleData, item1.id, 1);
        rolledItems.push(item1);
    }

    if (Math.random() < 0.25) { // 25% chance for a second item
        const item2 = await rollItemDrop(itemCategories);
        if (item2 && item2.id !== item1?.id) {
            addItemToInventory(baubleData, item2.id, 1);
            rolledItems.push(item2);
        }
    }

    // Reset expedition status
    baubleData.activeExpedition = {
        startedAt: null,
        endTime: null,
        status: 'idle'
    };

    await baubleData.save();

    // Build the story text
    let description = scenario.text.replace('{coins}', coins.toLocaleString());
    
    if (scenario.injury) {
        description += `\n\n🩹 *You suffered some scrapes and injuries on your body, but you pushed through.*`;
    }

    if (rolledItems.length > 0) {
        description += `\n\n🎒 **Items Recovered:**\n` + rolledItems.map(item => `✨ 1x **${item.name}** (${item.rarity})`).join('\n');
    } else {
        description += `\n\n🎒 You didn't find any relics, but you brought back plenty of dirt!`;
    }

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🧭 Expedition Completed & Claimed!')
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(description)
        .addFields(
            { name: '💰 Earned', value: `${coins.toLocaleString()} Baubles`, inline: true },
            { name: '💰 Total Balance', value: `${baubleData.baubles.toLocaleString()} Baubles`, inline: true }
        )
        .setTimestamp();

    const controls = createExpeditionControls(user.id);
    let reply;

    if (isSlash) {
        reply = await context.reply({ embeds: [embed], components: controls, fetchReply: true });
    } else {
        reply = await context.reply({ embeds: [embed], components: controls });
    }

    createExpeditionCollector(reply, user.id, isSlash);
    return reply;
}

function createExpeditionControls(userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`expedition_restart_${userId}`)
                .setLabel('Go on expedition again')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀')
        )
    ];
}

function disableExpeditionControls(actionRow) {
    return new ActionRowBuilder().addComponents(
        ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
    );
}

function createExpeditionCollector(message, userId, isSlash) {
    const collector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === userId,
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (button) => {
        if (button.user.id !== userId) {
            return button.reply({ content: 'Only the expedition starter can use this button.', ephemeral: true });
        }

        if (button.customId === `expedition_restart_${userId}`) {
            collector.stop('restart');
            await button.update({ components: [disableExpeditionControls(message.components[0])] });
            await startNewExpedition(button, userId);
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason !== 'restart') {
            try {
                await message.edit({ components: [disableExpeditionControls(message.components[0])] });
            } catch (error) {
                console.error('Failed to disable expedition controls after timeout:', error);
            }
        }
    });
}

async function startNewExpedition(button, userId) {
    const now = Date.now();
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        baubleData = new Bauble({ userId });
    }

    baubleData.activeExpedition = {
        startedAt: new Date(now),
        endTime: new Date(now + EXPEDITION_DURATION_MS),
        status: 'exploring'
    };
    await baubleData.save();

    const endTimestamp = Math.floor((now + EXPEDITION_DURATION_MS) / 1000);
    const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('🧭 Expedition Started Again!')
        .setDescription(`⛵ You have packed your gear and set off on a new dangerous expedition!\n\nYou will return <t:${endTimestamp}:R>. Run the command again then to claim your rewards!`)
        .setTimestamp();

    await button.followUp({ embeds: [embed] });
}
