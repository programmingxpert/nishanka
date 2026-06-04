/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection
} = require('discord.js');

const Bauble = require('../../models/baubleSchema');
const Family = require('../../models/familySchema');

module.exports = {
    category: 'economy',
    cooldown: 10,

    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work a random interactive job to earn Glimmering Baubles!'),

    async execute(interaction) {
        await runWorkGame(interaction, interaction.channel, interaction.user);
    },

    async executePrefix(message) {
        await runWorkGame(message, message.channel, message.author);
    }
};

async function runWorkGame(initialData, channel, user) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    try {
        let baubleData = await Bauble.findOne({ userId });

        if (baubleData) {
            const now = Date.now();
            if (baubleData.workStenchExpiresAt && now < new Date(baubleData.workStenchExpiresAt).getTime()) {
                const timeLeft = Math.ceil((new Date(baubleData.workStenchExpiresAt).getTime() - now) / 1000);
                const msg = `🤢 **PEW!** You are covered in rotting banana stench and nobody wants to hire you! \nWait **${timeLeft} seconds** for the smell to wear off before working.`;
                
                const client = initialData.client;
                if (client && client.cooldowns && client.cooldowns.has('work')) {
                    client.cooldowns.get('work').delete(userId);
                }

                if (isSlash) {
                    return initialData.reply({ content: msg, ephemeral: true });
                } else {
                    return initialData.reply ? initialData.reply(msg) : channel.send(msg);
                }
            }

            if (baubleData.padlockedExpiresAt && now < new Date(baubleData.padlockedExpiresAt).getTime()) {
                const timeLeft = Math.ceil((new Date(baubleData.padlockedExpiresAt).getTime() - now) / 1000);
                const msg = `🔒 You are padlocked inside your own vault! You cannot go out to work. \nWait **${timeLeft} seconds** to be let out.`;
                
                const client = initialData.client;
                if (client && client.cooldowns && client.cooldowns.has('work')) {
                    client.cooldowns.get('work').delete(userId);
                }

                if (isSlash) {
                    return initialData.reply({ content: msg, ephemeral: true });
                } else {
                    return initialData.reply ? initialData.reply(msg) : channel.send(msg);
                }
            }
        }

        if (!baubleData) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFC0CB)
                .setTitle('🎀 Welcome to the Glimmering Workforce!')
                .setDescription(
                    `<@${userId}> you're now part of the Bauble grind 💼✨\nUse \`/bauble\` or \`-bauble\` to check your balance.\nLet’s get working!`
                )
                .setFooter({ text: 'Baubleverse HR Dept.' });

            if (isSlash) {
                await initialData.reply({ content: `<@${userId}>`, embeds: [welcomeEmbed] });
            } else {
                await channel.send({ content: `<@${userId}>`, embeds: [welcomeEmbed] });
            }

            baubleData = new Bauble({
                userId,
                baubles: 0
            });

            await baubleData.save();

            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        const games = [
            'mining',
            'security',
            'electrician',
            'barista',
            'pizza',
            'bomb',
            'ghost',
            'alien',
            'fastFood',
            'dinosaur',
            'scientist',
            'detective',
            'arcade',
            'zookeeper',
            'diver',
            'train',
            'airport',
            'dragonDaycare'
        ];

        const selectedGame =
            games[Math.floor(Math.random() * games.length)];

        if (selectedGame === 'mining') {
            await runMiningGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'security') {
            await runSecurityGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'electrician') {
            await runElectricianGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'barista') {
            await runBaristaGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'pizza') {
            await runPizzaDeliveryGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'bomb') {
            await runBombDisposalGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'ghost') {
            await runGhostHunterGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'alien') {
            await runAlienTranslatorGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'fastFood') {
            await runFastFoodGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'dinosaur') {
            await runDinosaurKeeperGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'scientist') {
            await runScientistAssistantGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'detective') {
            await runDetectiveGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'arcade') {
            await runArcadeTechnicianGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'zookeeper') {
            await runZooKeeperGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'diver') {
            await runTreasureDiverGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'train') {
            await runTrainConductorGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'airport') {
            await runAirportBaggageGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'dragonDaycare') {
            await runDragonDaycareGame(initialData, channel, user, baubleData);
        } else {
            await runBaristaGame(initialData, channel, user, baubleData);
        }

    } catch (error) {
        console.error('Error in work command:', error);

        const errMsg =
            '❌ Something went wrong while working.';

        if (isSlash) {
            if (initialData.replied || initialData.deferred) {
                await initialData
                    .followUp({
                        content: errMsg,
                        ephemeral: true
                    })
                    .catch(() => {});
            } else {
                await initialData
                    .reply({
                        content: errMsg,
                        ephemeral: true
                    })
                    .catch(() => {});
            }
        } else {
            await channel.send(errMsg).catch(() => {});
        }
    }
}

/* =========================
   GENERIC CHOICE GAME DRIVER
========================= */

async function runSimpleChoiceGame(initialData, channel, user, baubleData, config) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    // Pick a random scenario if multiple are provided
    const scenario = config.scenarios 
        ? config.scenarios[Math.floor(Math.random() * config.scenarios.length)]
        : config;

    const embed = new EmbedBuilder()
        .setColor(config.color || 0x3498db)
        .setTitle(config.title)
        .setDescription(scenario.description)
        .setFooter({ text: config.footerText || 'Choose wisely!' });

    // Build buttons
    const buttons = scenario.options.map((opt, index) => {
        return new ButtonBuilder()
            .setCustomId(`choice_${index}`)
            .setLabel(opt.label)
            .setStyle(ButtonStyle.Primary);
    });

    const row = new ActionRowBuilder().addComponents(buttons);

    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [row], fetchReply: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [row], fetchReply: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] });
    }

    const collector = channel.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('choice_') && i.message.id === mainMessage.id,
        time: config.timeLimit || 30000
    });

    let chosenOption = null;

    collector.on('collect', i => {
        const index = parseInt(i.customId.replace('choice_', ''), 10);
        chosenOption = scenario.options[index];
        collector.stop('answered');
        i.deferUpdate().catch(() => {});
    });

    collector.on('end', async (collected, reason) => {
        let resultEmbed = new EmbedBuilder();

        if (chosenOption) {
            if (chosenOption.success) {
                const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, config.baseEarnings || 100, config.statField);
                
                resultEmbed
                    .setColor(0x2ecc71)
                    .setTitle(config.winTitle || '🎉 Success!')
                    .setDescription(`${chosenOption.msg || 'You did it!'}${getEventNote(event)}\n\nEarned **${finalEarnings}** 🪙 Glimmering Baubles.${taxMsg}`)
                    .addFields({ name: '💰 Balance', value: `${balance} 🪙`, inline: true });

                if (unlockedTitles.length > 0) {
                    resultEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
                }
            } else {
                resultEmbed
                    .setColor(0xe74c3c)
                    .setTitle(config.loseTitle || '❌ Failure!')
                    .setDescription(`${chosenOption.msg || 'You failed.'}\n\nEarned **0** 🪙 Glimmering Baubles.`);
            }
        } else {
            // Timeout
            resultEmbed
                .setColor(0x95a5a6)
                .setTitle('⏰ Too Slow!')
                .setDescription(`${config.timeoutMsg || 'You hesitated too long and failed.'}\n\nEarned **0** 🪙 Glimmering Baubles.`);
        }

        const finalEmbed = appendWorkAgainFooter(resultEmbed, initialData, baubleData);
        await mainMessage.edit({
            embeds: [finalEmbed],
            components: [buildWorkAgainRow()]
        }).catch(() => {});

        attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
    });
}

/* =========================
   MINING GAME
========================= */

async function runMiningGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    const progress = 100;
    const bar = '`' + '█'.repeat(10) + ` ${progress}%\``;

    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('⛏️ Deep Rock Mining')
        .setDescription(
            `Mash the **MINE** button as fast as you can to shatter the crystal! You have **12 seconds**!`
        )
        .setFields({
            name: '💎 Crystal Integrity',
            value: bar
        })
        .setFooter({ text: 'Swing fast!' });

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('work_mine')
            .setLabel('Mine!')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️')
    );

    let mainMessage;

    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                fetchReply: true
            });
        } else {
            mainMessage = await initialData.reply({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                fetchReply: true
            });
        }
    } else {
        mainMessage = await channel.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [btnRow]
        });
    }

    let clicks = 0;
    const maxClicks = 20;

    const collector =
        mainMessage.createMessageComponentCollector({
            filter:
                i =>
                    i.user.id === userId &&
                    i.customId === 'work_mine',
            time: 12000
        });

    collector.on('collect', async i => {
        clicks++;
        const shouldUpdate = (clicks % 3 === 0 || clicks === maxClicks);
        
        try {
            await i.deferUpdate();
        } catch (_) {}

        if (shouldUpdate) {
            const currentProgress = Math.max(
                0,
                100 -
                    Math.round((clicks / maxClicks) * 100)
            );

            const filled =
                Math.round(currentProgress / 10);

            const empty = 10 - filled;

            const updatedBar =
                '`' +
                '█'.repeat(filled) +
                '░'.repeat(empty) +
                ` ${currentProgress}%\``;

            const updatedEmbed = EmbedBuilder.from(
                mainMessage.embeds[0]
            )
                .setDescription(
                    `Mash the **MINE** button as fast as you can to shatter the crystal! Clicks: **${clicks}**`
                )
                .setFields({
                    name: '💎 Crystal Integrity',
                    value: updatedBar
                });

            await mainMessage
                .edit({ embeds: [updatedEmbed] })
                .catch(() => {});
        }

        if (clicks >= maxClicks) {
            collector.stop('max');
        }
    });

    collector.on('end', async () => {
        const { getGlobalMultiplier } = require('../../utils/economyEngine');
        const { getIncomeMultiplier } = require('../../utils/items');
        const globalMultiplier = await getGlobalMultiplier();
        const incomeMultiplier = await getIncomeMultiplier(userId);
        const baseEarnings = Math.min(80, clicks * 4);
        const earnings = Math.floor(baseEarnings * globalMultiplier * incomeMultiplier);

        const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, earnings, null);

        const successEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(
                clicks >= maxClicks
                    ? '💎 Crystal Shattered!'
                    : '💎 Mining Complete!'
            )
            .setDescription(
                `You swung your pickaxe **${clicks}** times and extracted **${finalEarnings}** 🪙 Glimmering Baubles! *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
            )
            .addFields({
                name: '💰 New Balance',
                value: `${balance} 🪙`,
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: 'Hard work pays off 💼'
            });

        if (unlockedTitles && unlockedTitles.length > 0) {
            successEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
        }

        const finalEmbed = appendWorkAgainFooter(successEmbed, initialData, baubleData);
        await mainMessage
            .edit({
                embeds: [finalEmbed],
                components: [buildWorkAgainRow()]
            })
            .catch(() => {});

        attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
    });
}

/* =========================
   SECURITY GAME
========================= */

async function runSecurityGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🚨 Bank Security Patrol')
        .setDescription(
            `Watch the security cameras closely... Click the button the moment you see the green light \`🟢\`!\n\n**DO NOT CLICK EARLY!**`
        )
        .setFields({
            name: '🎥 Camera Feed',
            value: '🔴 **STANDBY**'
        })
        .setFooter({
            text: 'Keep your eyes on the feed...'
        });

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('work_security')
            .setLabel('Standby...')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📹')
    );

    let mainMessage;

    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                fetchReply: true
            });
        } else {
            mainMessage = await initialData.reply({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                fetchReply: true
            });
        }
    } else {
        mainMessage = await channel.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [btnRow]
        });
    }

    let alertTriggered = false;
    let startTime = 0;

    const alertDelay = Math.random() * 2000 + 1500;

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId === 'work_security',
        time: alertDelay + 5000
    });

    const alertTimeout = setTimeout(async () => {
        alertTriggered = true;
        startTime = Date.now();

        const alertEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🚨 Bank Security Patrol')
            .setDescription(
                `🚨 **INTRUDER SPOTTED! CLICK NOW!**`
            )
            .setFields({
                name: '🎥 Camera Feed',
                value:
                    '🟢 **ACTIVE ALERT! INTRUDER DETECTED!**'
            });

        const activeRow =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('work_security')
                    .setLabel('CATCH INTRUDER!')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚨')
            );

        await mainMessage
            .edit({
                embeds: [alertEmbed],
                components: [activeRow]
            })
            .catch(() => {});
    }, alertDelay);

    collector.on('collect', async i => {
        const wasAlertTriggered = alertTriggered;
        if (!wasAlertTriggered) {
            clearTimeout(alertTimeout);
            collector.stop('early');
        } else {
            collector.stop('caught');
        }

        try {
            await i.deferUpdate();
        } catch (_) {}
    });

    collector.on('end', async (_, reason) => {
        clearTimeout(alertTimeout);

        let earnings = 0;
        const resultEmbed = new EmbedBuilder();

        if (reason === 'early') {
            resultEmbed
                .setColor(0xe74c3c)
                .setTitle('❌ False Alarm!')
                .setDescription(
                    `You got scared by a shadow and tackled a cardboard cutout of the bank manager. Embarrassing.\n\nEarned **0** Glimmering Baubles.`
                );
        } else if (reason === 'caught') {
            const ms = Date.now() - startTime;

            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            let baseEarnings = 0;

            if (ms <= 250) {
                baseEarnings = 90;
            } else if (ms <= 500) {
                baseEarnings = 70;
            } else if (ms <= 1000) {
                baseEarnings = 50;
            } else {
                baseEarnings = 25;
            }
            
            earnings = Math.floor(baseEarnings * globalMultiplier * incomeMultiplier);

            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, earnings, 'inspectionsSurvived');

            resultEmbed
                .setColor(0x2ecc71)
                .setTitle('👮 Security Job Complete!')
                .setDescription(
                    `You caught the intruder in **${ms}ms**!${getEventNote(event)}\n\nEarned **${finalEarnings}** 🪙 Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
                )
                .addFields({
                    name: '💰 New Balance',
                    value: `${balance} 🪙`,
                    inline: true
                });

            if (unlockedTitles && unlockedTitles.length > 0) {
                resultEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            }

        } else {
            resultEmbed
                .setColor(0x7f8c8d)
                .setTitle('❌ Thief Escaped!')
                .setDescription(
                    `You were playing games on your phone and the thief took the entire vault.\n\nEarned **0** 🪙 Glimmering Baubles.`
                );
        }

        const finalEmbed = appendWorkAgainFooter(resultEmbed, initialData, baubleData);

        await mainMessage
            .edit({
                embeds: [finalEmbed],
                components: [buildWorkAgainRow()]
            })
            .catch(() => {});

        attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
    });
}

/* =========================
   BARISTA GAME
========================= */

async function runBaristaGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    const recipes = [
        { name: "Double Espresso", ingredients: ["coffee", "coffee"], display: "☕ Coffee + ☕ Coffee" },
        { name: "Coffee Latte", ingredients: ["coffee", "milk"], display: "☕ Coffee + 🥛 Milk" },
        { name: "Cafe Mocha", ingredients: ["coffee", "chocolate"], display: "☕ Coffee + 🍫 Chocolate" },
        { name: "Hot Chocolate", ingredients: ["chocolate", "milk"], display: "🍫 Chocolate + 🥛 Milk" },
        { name: "Iced Coffee", ingredients: ["coffee", "ice"], display: "☕ Coffee + 🧊 Ice" },
        { name: "Iced Chocolate", ingredients: ["chocolate", "ice"], display: "🍫 Chocolate + 🧊 Ice" }
    ];
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];

    const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('☕ Espresso Barista')
        .setDescription(`The morning rush is here! Craft a **${recipe.name}** within **20 seconds**!\n\n📜 **Recipe:** ${recipe.display}`)
        .setFields({ name: '🛒 Your Cup', value: '[ Empty ]' })
        .setFooter({ text: 'Combine the ingredients!' });

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('barista_coffee').setLabel('Coffee').setStyle(ButtonStyle.Primary).setEmoji('☕'),
        new ButtonBuilder().setCustomId('barista_milk').setLabel('Milk').setStyle(ButtonStyle.Secondary).setEmoji('🥛'),
        new ButtonBuilder().setCustomId('barista_chocolate').setLabel('Chocolate').setStyle(ButtonStyle.Success).setEmoji('🍫'),
        new ButtonBuilder().setCustomId('barista_ice').setLabel('Ice').setStyle(ButtonStyle.Danger).setEmoji('🧊')
    );

    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [btnRow], fetchReply: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [btnRow], fetchReply: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [btnRow] });
    }

    const selectedIngredients = [];
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('barista_'),
        time: 20000
    });

    collector.on('collect', async i => {
        const item = i.customId.replace('barista_', '');
        selectedIngredients.push(item);

        const isComplete = selectedIngredients.length >= 2;
        
        if (isComplete) {
            collector.stop('complete');
        }

        try {
            await i.deferUpdate();
        } catch (_) {}

        const ingredientEmojis = selectedIngredients.map(ing => {
            if (ing === 'coffee') return '☕';
            if (ing === 'milk') return '🥛';
            if (ing === 'chocolate') return '🍫';
            return '🧊';
        }).join(' + ');

        const updatedEmbed = EmbedBuilder.from(mainMessage.embeds[0])
            .setFields({ name: '🛒 Your Cup', value: ingredientEmojis });

        await mainMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});
    });

    collector.on('end', async (collected, reason) => {
        let earnings = 0;
        let resultEmbed = new EmbedBuilder();

        if (reason === 'complete') {
            const sortedSelected = [...selectedIngredients].sort();
            const sortedRecipe = [...recipe.ingredients].sort();
            const isMatch = sortedSelected.length === sortedRecipe.length && sortedSelected.every((val, index) => val === sortedRecipe[index]);

            if (isMatch) {
                const { getGlobalMultiplier } = require('../../utils/economyEngine');
                const { getIncomeMultiplier } = require('../../utils/items');
                const globalMultiplier = await getGlobalMultiplier();
                const incomeMultiplier = await getIncomeMultiplier(userId);
                earnings = Math.floor(70 * globalMultiplier * incomeMultiplier);

                const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, earnings, 'customersServed');
                
                resultEmbed
                    .setColor(0x2ecc71)
                    .setTitle('☕ Order Served!')
                    .setDescription(`Perfect! You brewed a fresh **${recipe.name}**! The customer tipped you generously.${getEventNote(event)}\n\nEarned **${finalEarnings}** 🪙 Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`)
                    .setTimestamp();

                resultEmbed.addFields({ name: '💰 New Balance', value: `${balance} 🪙`, inline: true });
                if (unlockedTitles.length > 0) {
                    resultEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
                }
            } else {
                resultEmbed
                    .setColor(0xe74c3c)
                    .setTitle('🤢 Ruined Drink')
                    .setDescription(`Yuck! You mixed a weird combo and served it to the customer. They gagged, called you a monster, and walked out!\n\nEarned **0** 🪙 Glimmering Baubles.`)
                    .setTimestamp();
            }
        } else {
            // Timeout
            resultEmbed
                .setColor(0x95a5a6)
                .setTitle('⏰ Customer Walked Out!')
                .setDescription(`You took too long to read the coffee machine manual. The customer got tired and left!\n\nEarned **0** 🪙 Glimmering Baubles.`)
                .setTimestamp();
        }

        const finalEmbed = appendWorkAgainFooter(resultEmbed, initialData, baubleData);
        await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
        attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
    });
}

// ... All other job specific functions and exports from here downwards are assumed valid.
// For brevity, not editing the boilerplate games array which maps these to \`runSimpleChoiceGame\`.

/* =========================
   ELECTRICIAN GAME
========================= */
async function runElectricianGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🔌 Emergency Electrician',
        color: 0xf1c40f,
        baseEarnings: 80,
        statField: 'inspectionsSurvived',
        winTitle: '⚡ Saved the Day!',
        loseTitle: '💥 Shocking Failure!',
        timeoutMsg: 'You stared at the sparks until the microwave exploded. You have no eyebrows left.',
        scenarios: [
            {
                description: 'The breakroom microwave is shooting sparks!',
                options: [
                    { label: 'Pull the plug', success: true, msg: '🔌 Safe! You unplugged the machine.' },
                    { label: 'Throw water on it', success: false, msg: '💥 Shocking! Water conducts electricity.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   PIZZA DELIVERY GAME
========================= */
async function runPizzaDeliveryGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🍕 Pizza Delivery',
        color: 0xe67e22,
        baseEarnings: 90,
        statField: 'deliveriesCompleted',
        winTitle: '🚗 Pizza Delivered!',
        loseTitle: '😭 Delivery Failed!',
        timeoutMsg: 'You sat in your car eating the pepperoni yourself. The customer cancelled.',
        scenarios: [
            {
                description: "A giant raccoon is guarding the customer's front door!",
                options: [
                    { label: 'Bribe it with pepperoni', success: true, msg: '🍖 Raccoon happily eats pepperoni and lets you pass.' },
                    { label: 'Fight the raccoon', success: false, msg: '🦝 Raccoon knows karate. You lost the pizza.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   BOMB DISPOSAL GAME
========================= */
async function runBombDisposalGame(initialData, channel, user, baubleData) {
    const config = {
        title: '💣 Bomb Disposal',
        color: 0xff4d4f,
        baseEarnings: 110,
        statField: 'bombsDefused',
        winTitle: '✅ Defused!',
        loseTitle: '💥 Boom!',
        timeoutMsg: 'The timer ticked to zero. You went out with a bang.',
        scenarios: [
            {
                description: 'A ticking package is sitting on the office toilet!',
                options: [
                    { label: 'Yeet it out the window', success: true, msg: '🪟 Bomb explodes safely in the empty parking lot.' },
                    { label: 'Snip the red wire', success: false, msg: '💥 Boom! Wrong wire.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   GHOST HUNTER GAME
========================= */
async function runGhostHunterGame(initialData, channel, user, baubleData) {
    const config = {
        title: '👻 Ghost Hunter',
        color: 0x8e44ad,
        baseEarnings: 90,
        statField: 'ghostsCaptured',
        winTitle: '👻 Ghost Captured!',
        loseTitle: '😱 Haunted!',
        timeoutMsg: 'The ghost possessed you and made you delete your browser history.',
        scenarios: [
            {
                description: 'A spooky Victorian ghost is messing with the server room Wi-Fi!',
                options: [
                    { label: 'Vacuum it up', success: true, msg: '🧹 Sucked the ghost into the breakroom vacuum!' },
                    { label: 'Throw a shoe at it', success: false, msg: '👟 Shoe went right through it and broke the server.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   ALIEN TRANSLATOR GAME
========================= */
async function runAlienTranslatorGame(initialData, channel, user, baubleData) {
    const config = {
        title: '👽 Alien Translator',
        color: 0x1abc9c,
        baseEarnings: 100,
        statField: 'aliensTranslated',
        winTitle: '🛸 Communication Established!',
        loseTitle: '👽 Alien Displeasure!',
        timeoutMsg: 'You stood silent. The aliens assumed you were a statue and drew a mustache on your face.',
        scenarios: [
            {
                description: 'A green alien points a laser gun and blorps at you!',
                options: [
                    { label: 'Give high-five', success: true, msg: '🖐️ Alien loves high-fives and lowers the gun.' },
                    { label: 'Try to eat spaceship', success: false, msg: '🚀 Tastes like metal and regret.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   FAST FOOD GAME
========================= */
async function runFastFoodGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🍔 Fast Food Shift',
        color: 0xf39c12,
        baseEarnings: 85,
        statField: 'customersServed',
        winTitle: '🍟 Shift Complete!',
        loseTitle: '😡 Customer Meltdown!',
        timeoutMsg: 'You got lost in the ball pit. The shift ended without you.',
        scenarios: [
            {
                description: 'A customer yells that there is a pickle on their burger, but they ordered "NO PICKLES"!',
                options: [
                    { label: 'Eat the pickle', success: true, msg: '🍔 You ate it. No pickle, no problem!' },
                    { label: 'Throw burger at them', success: false, msg: '🍔 Bullseye! You got fired immediately.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   DINOSAUR KEEPER GAME
========================= */
async function runDinosaurKeeperGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🦖 Dinosaur Keeper',
        color: 0x16a085,
        baseEarnings: 95,
        statField: 'dragonsHandled',
        winTitle: '🦖 Dino Calmed!',
        loseTitle: '💀 Dino Rampage!',
        timeoutMsg: 'You stood completely still. T-Rex vision is based on movement, but it still stepped on you by accident.',
        scenarios: [
            {
                description: 'A baby T-Rex wants to eat your paycheck!',
                options: [
                    { label: 'Feed it steak', success: true, msg: '🥩 Dino eats steak and falls asleep.' },
                    { label: 'Tickle its tiny arms', success: false, msg: '🦖 Baby T-Rex was offended and bit you.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   SCIENTIST ASSISTANT GAME
========================= */
async function runScientistAssistantGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🔬 Scientist Assistant',
        color: 0x2980b9,
        baseEarnings: 105,
        statField: 'inspectionsSurvived',
        winTitle: '🧪 Science Achieved!',
        loseTitle: '💥 Lab Accident!',
        timeoutMsg: 'You stared at the glowing beaker until it turned into a sentient goo and ran away.',
        scenarios: [
            {
                description: 'The Professor tells you to mix yellow and blue chemicals to create glow-in-the-dark juice.',
                options: [
                    { label: 'Mix blue and yellow', success: true, msg: '🧪 It glows! The Professor is thrilled.' },
                    { label: 'Drink the chemicals', success: false, msg: '🤢 Spent the rest of the shift in the bathroom.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   DETECTIVE GAME
========================= */
async function runDetectiveGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🕵️ Detective Agency',
        color: 0x34495e,
        baseEarnings: 100,
        statField: 'mysteriesSolved',
        winTitle: '🧠 Case Closed!',
        loseTitle: '❌ Mystery Unsolved!',
        timeoutMsg: 'The thief left a thank-you note and escaped while you were thinking.',
        scenarios: [
            {
                description: 'Someone stole the office cookies, and a coworker has chocolate crumbs on their face!',
                options: [
                    { label: 'Accuse chocolate face', success: true, msg: '🍪 Coworker confesses instantly.' },
                    { label: 'Arrest the office plant', success: false, msg: '🪴 Fern remains silent. Case cold.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   ARCADE TECHNICIAN GAME
========================= */
async function runArcadeTechnicianGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🕹️ Arcade Technician',
        color: 0x3498db,
        baseEarnings: 90,
        statField: 'arcadeRepairs',
        winTitle: '🛠️ Arcade Restored!',
        loseTitle: '⚠️ Game Over!',
        timeoutMsg: 'You got distracted playing Pac-Man and got fired.',
        scenarios: [
            {
                description: "The claw machine is rigged and kids are crying because they can't win the duck plushie.",
                options: [
                    { label: 'Set claw grip to 100%', success: true, msg: '🔧 Everyone wins! Kids are happy.' },
                    { label: 'Rig it to 0%', success: false, msg: '📉 Claw runs away from plushies. Kids riot.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   ZOOKEEPER GAME
========================= */
async function runZooKeeperGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🦓 Zoo Keeper',
        color: 0x27ae60,
        baseEarnings: 90,
        statField: 'customersServed',
        winTitle: '🦧 Zoo Order Restored!',
        loseTitle: '🚨 Animal Escape!',
        timeoutMsg: 'You took too long. The monkey is now driving the zoo golf cart.',
        scenarios: [
            {
                description: 'A sneaky monkey stole the master keys and ran up a tree!',
                options: [
                    { label: 'Bribe with banana', success: true, msg: '🍌 Monkey drops keys and takes banana.' },
                    { label: 'Climb the tree', success: false, msg: '🌳 Monkey threw acorns at you until you fell.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   TREASURE DIVER GAME
========================= */
async function runTreasureDiverGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🤿 Deep Sea Diver',
        color: 0x2980b9,
        baseEarnings: 120,
        statField: 'treasuresRecovered',
        winTitle: '🏴‍☠️ Loot Secured!',
        loseTitle: '🐙 Shark Bait!',
        timeoutMsg: 'You ran out of oxygen while staring at a pretty jellyfish.',
        scenarios: [
            {
                description: 'A giant shark is sleeping on the treasure chest!',
                options: [
                    { label: 'Swim quietly past', success: true, msg: '🏊 Shark snored. Loot secured!' },
                    { label: 'Poke it with a stick', success: false, msg: '🥢 Shark woke up very cranky.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   TRAIN CONDUCTOR GAME
========================= */
async function runTrainConductorGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🚆 Train Conductor',
        color: 0x2c3e50,
        baseEarnings: 100,
        statField: 'trainsConducted',
        winTitle: '🚉 All Aboard!',
        loseTitle: '🚨 Delay!',
        timeoutMsg: 'The train left without any passengers because you forgot to open the doors.',
        scenarios: [
            {
                description: 'A passenger plays music loudly on their phone speaker without headphones.',
                options: [
                    { label: 'Politely offer headphones', success: true, msg: '🎧 Passenger takes the hint.' },
                    { label: 'Stare intensely at them', success: false, msg: '👁️ Stare gets weird. Music gets louder.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   AIRPORT BAGGAGE GAME
========================= */
async function runAirportBaggageGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🛄 Baggage Handler',
        color: 0x95a5a6,
        baseEarnings: 90,
        statField: 'bagsHandled',
        winTitle: '🛫 Baggage Sorted!',
        loseTitle: '🧳 Luggage Lost!',
        timeoutMsg: 'You fell asleep on the baggage carousel and woke up in Cleveland.',
        scenarios: [
            {
                description: 'A suitcase is vibrating and ticking on the conveyor belt!',
                options: [
                    { label: 'Call bomb squad', success: true, msg: '🚨 Just a massager, but safety first!' },
                    { label: 'Open it up to check', success: false, msg: '🔓 Accused of stealing. Suspended.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   DRAGON DAYCARE GAME
========================= */
async function runDragonDaycareGame(initialData, channel, user, baubleData) {
    const config = {
        title: '🐉 Dragon Daycare',
        color: 0xe67e22,
        baseEarnings: 110,
        statField: 'dragonsHandled',
        winTitle: '🔥 Dragon Happy!',
        loseTitle: '🚒 Daycare on Fire!',
        timeoutMsg: 'You hesitated. The dragon toddler sneezed and turned your pants to ash.',
        scenarios: [
            {
                description: 'A baby dragon sneezed and set nursery curtains on fire!',
                options: [
                    { label: 'Throw water on it', success: true, msg: '🧯 Fire out! Baby dragon giggles.' },
                    { label: 'Scream and run away', success: false, msg: '🏃 Alarms went off. Boss is furious.' }
                ]
            }
        ]
    };
    await runSimpleChoiceGame(initialData, channel, user, baubleData, config);
}

/* =========================
   UTILITIES
========================= */

function getWorkCooldownInfo(initialData, baubleData) {
    const client = initialData?.client || initialData?.message?.client || initialData?.channel?.client;
    const userId = baubleData?.userId || initialData?.user?.id || initialData?.author?.id;
    const now = Date.now();
    let cooldownMs = 10000;

    if (baubleData?.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
        cooldownMs /= 2;
    }

    if (!client || !client.cooldowns || !client.cooldowns.has('work')) {
        return { timeLeft: 0, cooldownMs };
    }

    const timestamps = client.cooldowns.get('work');
    const startedAt = timestamps.get(userId);
    if (!startedAt) {
        return { timeLeft: 0, cooldownMs };
    }

    const expiry = startedAt + cooldownMs;
    return { timeLeft: Math.max(0, expiry - now), cooldownMs, expiry };
}

function buildWorkAgainRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('workAgain')
            .setLabel('Work Again')
            .setStyle(ButtonStyle.Success)
    );
}

function appendWorkAgainFooter(embed, initialData, baubleData) {
    const cooldown = getWorkCooldownInfo(initialData, baubleData);
    if (cooldown.timeLeft > 0) {
        const seconds = Math.ceil(cooldown.timeLeft / 1000);
        const existingFooter = embed.data?.footer?.text || '';
        const extra = `Available again in ${seconds}s.`;
        embed.setFooter({ text: existingFooter ? `${existingFooter} • ${extra}` : extra });
    }
    return embed;
}

async function attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData) {
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === user.id && i.customId === 'workAgain',
        time: 30000
    });

    collector.on('collect', async i => {
        const cooldown = getWorkCooldownInfo(initialData, baubleData);
        if (cooldown.timeLeft > 0) {
            const seconds = Math.ceil(cooldown.timeLeft / 1000);
            try { 
                await i.reply({
                    content: `⏳ Please wait **${seconds}s** before pressing Work Again.`,
                    ephemeral: true
                });
            } catch (_) {}
            return;
        }

        try {
            await i.deferUpdate();
        } catch (_) {}

        const client = initialData?.client || initialData?.message?.client || initialData?.channel?.client;
        if (client && client.cooldowns) {
            if (!client.cooldowns.has('work')) {
                client.cooldowns.set('work', new Collection());
            }
            const timestamps = client.cooldowns.get('work');
            const now = Date.now();
            const newCooldownMs = cooldown.cooldownMs || 10000;
            timestamps.set(user.id, now);
            setTimeout(() => timestamps.delete(user.id), newCooldownMs);
        }

        const disabledButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('workAgain')
                .setLabel('Working...')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        await mainMessage.edit({ components: [disabledButtonRow] }).catch(() => {});

        await runWorkGame(initialData, channel, user);
    });
}

const WORK_EVENTS = [
    {
        id: 'goldenPaycheck',
        label: 'Golden Paycheck',
        description: 'A golden paycheck slides under your desk, adding extra baubles to your haul.',
        multiplier: 1.25,
        extra: 40
    },
    {
        id: 'baubleKingVisit',
        label: 'Bauble King Visit',
        description: 'The Bauble King wanders past and tips you in ridiculous space coupons. Your job pays extra!',
        multiplier: 1.20,
        extra: 30
    },
    {
        id: 'workplaceMiracle',
        label: 'Workplace Miracle',
        description: 'A workplace miracle happens! Everything runs smoothly and your pay is boosted.',
        multiplier: 1.15,
        extra: 20
    },
    {
        id: 'lotteryTicket',
        label: 'Lottery Ticket Found',
        description: 'You find a lucky lottery ticket in the break room. It adds a little surprise bonus to your paycheck.',
        multiplier: 1.10,
        extra: 15
    },
    {
        id: 'ufoEncounter',
        label: 'UFO Encounter',
        description: 'A UFO hovers overhead and drops a handful of weird space coupons on your shift. Extra baubles come through.',
        multiplier: 1.12,
        extra: 20
    },
    {
        id: 'coffeeSpill',
        label: 'Coffee Spill',
        description: 'A coworker spilled coffee everywhere. You scramble and lose a little efficiency.',
        multiplier: 0.85
    },
    {
        id: 'angryCustomer',
        label: 'Angry Customer',
        description: 'A customer is furious and slows you down. You still finish the shift, but it pays less.',
        multiplier: 0.80
    },
    {
        id: 'lostWallet',
        label: 'Lost Wallet',
        description: 'You drop your wallet during the shift. You recover most of it, but you lose a small chunk.',
        multiplier: 0.90,
        extra: -10
    },
    {
        id: 'corporateInspection',
        label: 'Corporate Inspection',
        description: 'A surprise inspection makes you sweat, but you pass. Your earnings are a little messy.',
        multiplier: 0.95
    },
    {
        id: 'dragonAudit',
        label: 'Dragon Audit',
        description: 'A dragon auditor swoops into the daycare. Everything is fine, but the paperwork slows you down.',
        multiplier: 0.88
    }
];

function chooseWorkEvent() {
    const roll = Math.random();
    if (roll < 0.01) return WORK_EVENTS.find(e => e.id === 'goldenPaycheck');
    if (roll < 0.03) return WORK_EVENTS.find(e => e.id === 'baubleKingVisit');
    if (roll < 0.06) return WORK_EVENTS.find(e => e.id === 'workplaceMiracle');
    if (roll < 0.10) return WORK_EVENTS.find(e => e.id === 'lotteryTicket');
    if (roll < 0.15) return WORK_EVENTS.find(e => e.id === 'ufoEncounter');
    const common = Math.random();
    if (common < 0.14) return WORK_EVENTS.find(e => e.id === 'coffeeSpill');
    if (common < 0.24) return WORK_EVENTS.find(e => e.id === 'angryCustomer');
    if (common < 0.34) return WORK_EVENTS.find(e => e.id === 'lostWallet');
    if (common < 0.42) return WORK_EVENTS.find(e => e.id === 'corporateInspection');
    if (common < 0.48) return WORK_EVENTS.find(e => e.id === 'dragonAudit');
    return null;
}

function getEventNote(event) {
    if (!event) return '';
    return `\n\n*Event: ${event.label} — ${event.description}*`;
}

function adjustEarningsForEvent(baseEarnings, event) {
    if (!event) return baseEarnings;
    let adjusted = Math.floor(baseEarnings * (event.multiplier ?? 1));
    if (typeof event.extra === 'number') adjusted += event.extra;
    return Math.max(0, adjusted);
}

function unlockWorkTitles(baubleData) {
    if (!baubleData.titles) baubleData.titles = [];
    const unlocked = [];
    const rules = [
        { field: 'workJobsCompleted', threshold: 25, title: 'Employee of the Month' },
        { field: 'ghostsCaptured', threshold: 5, title: 'Ghost Puncher' },
        { field: 'dragonsHandled', threshold: 3, title: 'Dragon Whisperer' },
        { field: 'inspectionsSurvived', threshold: 8, title: 'Corporate Survivor' },
        { field: 'aliensTranslated', threshold: 4, title: 'Intergalactic Translator' },
        { field: 'mysteriesSolved', threshold: 5, title: 'Professional Problem Solver' },
        { field: 'bombsDefused', threshold: 3, title: 'Bomb Disposal Expert' },
        { field: 'mysteriesSolved', threshold: 8, title: 'Detective Genius' }
    ];
    for (const rule of rules) {
        if (baubleData[rule.field] >= rule.threshold && !baubleData.titles.includes(rule.title)) {
            baubleData.titles.push(rule.title);
            unlocked.push(rule.title);
        }
    }
    return unlocked;
}

async function processWorkReward(baubleData, baseEarnings, statField) {
    const event = chooseWorkEvent();
    const adjustedBase = adjustEarningsForEvent(baseEarnings, event);
    const { finalEarnings, taxMsg } = await applyParentLaborTax(baubleData.userId, adjustedBase, baubleData);

    if (typeof baubleData.workJobsCompleted !== 'number') baubleData.workJobsCompleted = 0;
    baubleData.workJobsCompleted += 1;
    if (statField) {
        baubleData[statField] = (baubleData[statField] || 0) + 1;
    }

    baubleData.baubles += finalEarnings;
    baubleData.dailyWorkLastCompleted = new Date(); // Sets the daily completed work date properly!
    
    const unlockedTitles = unlockWorkTitles(baubleData);
    await baubleData.save();

    return { finalEarnings, taxMsg, event, unlockedTitles, balance: baubleData.baubles };
}

async function applyParentLaborTax(userId, earnings, baubleData) {
    let finalEarnings = earnings;
    let taxMsg = '';
    try {
        const fam = await Family.findOne({ userId });
        if (fam && fam.parents && fam.parents.length > 0) {
            const parentId = fam.parents[0];
            const tax = Math.floor(earnings * 0.05);
            if (tax > 0) {
                const parentProfile = await Bauble.findOne({ userId: parentId });
                if (parentProfile) {
                    parentProfile.baubles += tax;
                    await parentProfile.save();
                    finalEarnings -= tax;
                    taxMsg = `\n\n📄 **Child Labor Tax:** **${tax} Baubles** (5%) transferred to your parent <@${parentId}>!`;
                }
            }
        }
    } catch (e) {
        console.error('Error applying parent labor tax:', e);
    }
    return { finalEarnings, taxMsg };
}
