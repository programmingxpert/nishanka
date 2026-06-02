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
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [row], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [row], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] });
    }

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('choice_'),
        max: 1,
        time: config.timeLimit || 15000
    });

    let chosenOption = null;

    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const index = parseInt(i.customId.replace('choice_', ''), 10);
        chosenOption = scenario.options[index];
        collector.stop('answered');
    });

    collector.on('end', async (collected, reason) => {
        let resultEmbed = new EmbedBuilder();

        if (reason === 'answered' && chosenOption) {
            if (chosenOption.success) {
                const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, config.baseEarnings || 100, config.statField);
                
                resultEmbed
                    .setColor(0x2ecc71)
                    .setTitle(config.winTitle || '🎉 Success!')
                    .setDescription(`${chosenOption.msg || 'You did it!'}${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                    .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });

                if (unlockedTitles.length > 0) {
                    resultEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
                }
            } else {
                resultEmbed
                    .setColor(0xe74c3c)
                    .setTitle(config.loseTitle || '❌ Failure!')
                    .setDescription(`${chosenOption.msg || 'You failed.'}\n\nEarned **0** Glimmering Baubles.`);
            }
        } else {
            // Timeout
            resultEmbed
                .setColor(0x95a5a6)
                .setTitle('⏰ Too Slow!')
                .setDescription(`${config.timeoutMsg || 'You hesitated too long and failed.'}\n\nEarned **0** Glimmering Baubles.`);
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
            `Mash the **MINE** button as fast as you can to shatter the crystal! You have **6 seconds**!`
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
                withResponse: true
            });
        } else {
            mainMessage = await initialData.reply({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                withResponse: true
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
            time: 6000
        });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate();
        } catch (_) {}

        clicks++;

        if (clicks % 3 === 0 || clicks === maxClicks) {
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
                `You swung your pickaxe **${clicks}** times and extracted **${finalEarnings}** Glimmering Baubles! *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
            )
            .addFields({
                name: '💰 New Balance',
                value: `${balance} Baubles`,
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
                withResponse: true
            });
        } else {
            mainMessage = await initialData.reply({
                content: `<@${userId}>`,
                embeds: [embed],
                components: [btnRow],
                withResponse: true
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

    const alertDelay =
        Math.random() * 2000 + 1500;

    const collector =
        mainMessage.createMessageComponentCollector({
            filter:
                i =>
                    i.user.id === userId &&
                    i.customId === 'work_security',
            time: alertDelay + 2500
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
        try {
            await i.deferUpdate();
        } catch (_) {}

        if (!alertTriggered) {
            clearTimeout(alertTimeout);
            collector.stop('early');
        } else {
            collector.stop('caught');
        }
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
                    `You caught the intruder in **${ms}ms**!${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
                )
                .addFields({
                    name: '💰 New Balance',
                    value: `${balance} Baubles`,
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
                    `You were playing games on your phone and the thief took the entire vault.\n\nEarned **0** Glimmering Baubles.`
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
        .setDescription(`The morning rush is here! Craft a **${recipe.name}** within **12 seconds**!\n\n📜 **Recipe:** ${recipe.display}`)
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
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [btnRow], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [btnRow], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [btnRow] });
    }

    const selectedIngredients = [];
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('barista_'),
        time: 12000
    });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate();
        } catch (_) {}

        const item = i.customId.replace('barista_', '');
        selectedIngredients.push(item);

        const ingredientEmojis = selectedIngredients.map(ing => {
            if (ing === 'coffee') return '☕';
            if (ing === 'milk') return '🥛';
            if (ing === 'chocolate') return '🍫';
            return '🧊';
        }).join(' + ');

        const updatedEmbed = EmbedBuilder.from(mainMessage.embeds[0])
            .setFields({ name: '🛒 Your Cup', value: ingredientEmojis });

        await mainMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});

        if (selectedIngredients.length === 2) {
            collector.stop('complete');
        }
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
                    .setDescription(`Perfect! You brewed a fresh **${recipe.name}**! The customer tipped you generously.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`)
                    .setTimestamp();

                resultEmbed.addFields({ name: '💰 New Balance', value: `${balance} Baubles`, inline: true });
                if (unlockedTitles.length > 0) {
                    resultEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
                }
            } else {
                resultEmbed
                    .setColor(0xe74c3c)
                    .setTitle('🤢 Ruined Drink')
                    .setDescription(`Yuck! You mixed a weird combo and served it to the customer. They gagged, called you a monster, and walked out!\n\nEarned **0** Glimmering Baubles.`)
                    .setTimestamp();
            }
        } else {
            // Timeout
            resultEmbed
                .setColor(0x95a5a6)
                .setTitle('⏰ Customer Walked Out!')
                .setDescription(`You took too long to read the coffee machine manual. The customer got tired and left!\n\nEarned **0** Glimmering Baubles.`)
                .setTimestamp();
        }

        const finalEmbed = appendWorkAgainFooter(resultEmbed, initialData, baubleData);
        await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
        attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
    });
}

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
                description: 'The breakroom microwave is shooting green sparks and making dubstep noises! Quick, what do you do?',
                options: [
                    { label: 'Throw water on it', success: false, msg: '💦 **BZZZT!** Water conducts electricity, genius. You got shocked and danced the robot involuntarily.' },
                    { label: 'Pull the plug', success: true, msg: '🔌 **Success!** You unplugged the demon machine safely. The breakroom is saved!' },
                    { label: 'Smash it with a chair', success: false, msg: '🪑 The chair shattered, the microwave is still sparking, and your boss is now staring at you.' },
                    { label: 'Warm up a burrito', success: false, msg: '🌯 You threw a burrito inside. It mutated and started crawling. You ran away.' }
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
                description: 'You arrive at the customer\'s house, but a giant raccoon is guarding the front door like a mini-boss! How do you deliver the pizza?',
                options: [
                    { label: 'Bribe it with pepperoni', success: true, msg: '🍖 You distracted the raccoon with pepperoni. It accepted your bribe and let you pass.' },
                    { label: 'Kickflip over it', success: true, msg: '🛹 You did a sick kickflip over the raccoon, landed on the porch, and delivered the pizza. The customer tipped extra for the style!' },
                    { label: 'Fight the raccoon', success: false, msg: '🦝 The raccoon turned out to be a black belt in karate. You were beaten up and your pizza was stolen.' },
                    { label: 'Scream for help', success: false, msg: '🗣️ You screamed. The raccoon laughed at you. Neighbors judged you.' }
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
                description: 'A ticking package is sitting on the office toilet! The timer shows 10 seconds! What do you do?',
                options: [
                    { label: 'Yeet it out the window', success: true, msg: '🪟 You threw it out the window! It exploded in the empty parking lot, blowing up the CEO\'s empty sports car. You get a raise for saving lives!' },
                    { label: 'Snip the red wire', success: false, msg: '✂️ You cut the red wire. It was indeed the wrong wire. You have been launched into low-Earth orbit.' },
                    { label: 'Flush the toilet', success: false, msg: '🚽 You tried to flush a bomb. It clogged the toilet. Now you have a ticking bomb and a plumbing crisis.' },
                    { label: 'Run away screaming', success: false, msg: '🏃 You ran away! The bomb exploded, destroying the office. You are fired, but alive.' }
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
                description: 'A spooky Victorian ghost is hovering in the server room, messing with the Wi-Fi! How do you handle it?',
                options: [
                    { label: 'Use breakroom vacuum', success: true, msg: '🧹 You grabbed the breakroom vacuum and sucked the ghost in. Who you gonna call? You!' },
                    { label: 'Ask for its tax records', success: true, msg: '📋 You asked the ghost for its tax returns. Terrified of the IRS, the ghost fled the building instantly.' },
                    { label: 'Throw a shoe at it', success: false, msg: '👟 The shoe passed right through the ghost and hit the main server. The Wi-Fi is still down and the ghost is laughing.' },
                    { label: 'Offer it a cup of coffee', success: false, msg: '☕ The ghost drank it, got a caffeine rush, and started haunting the server room at 5x speed.' }
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
                description: 'A green alien stands before you, points a laser gun, and says: "Blorp glorp zzzzt!" What do you do?',
                options: [
                    { label: 'Offer a high-five', success: true, msg: '🖐️ The alien loves high-fives! It lowered the gun and handed you some space coupons.' },
                    { label: 'Challenge to dance-off', success: true, msg: '🕺 You styled on the alien with a flawless breakdance. The alien was so impressed it tipped you generously.' },
                    { label: 'Try to eat their spaceship', success: false, msg: '🚀 You bit the landing gear. It tasted like metal and sadness. You chipped a tooth.' },
                    { label: 'Insult its mother', success: false, msg: '😡 You made a crude gesture. The alien vaporized your coffee cup and walked away angry.' }
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
                description: 'A customer yells that there is a pickle on their burger, but they ordered "NO PICKLES". You see a single pickle staring at you. What do you do?',
                options: [
                    { label: 'Eat the pickle yourself', success: true, msg: '🥒 You grabbed the pickle and ate it in one bite. "What pickle?" you asked. The customer was confused but satisfied.' },
                    { label: 'Flick it at the ceiling', success: true, msg: '🎯 You flicked the pickle. It stuck to the ceiling. The customer didn\'t notice and walked away happy.' },
                    { label: 'Throw burger at them', success: false, msg: '🍔 You threw the burger. It hit them square in the face. You got fired immediately.' },
                    { label: 'Argue that pickles are fruit', success: false, msg: '🗣️ You tried to explain botanical definitions. The customer screamed for the manager.' }
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
                description: 'The baby T-Rex is crying and stomping its feet. It looks like it wants to eat your paycheck! What do you feed it?',
                options: [
                    { label: 'Give it a raw steak', success: true, msg: '🥩 The T-Rex devoured the steak and happily went to sleep. Your paycheck is safe!' },
                    { label: 'Play fetch with a car', success: true, msg: '🚗 You threw a toy sports car. The T-Rex chased it, caught it, and wagged its tail like a puppy.' },
                    { label: 'Tickle its tiny arms', success: false, msg: '🦖 You tried to tickle it. The T-Rex was offended by your jokes about its short arms and bit your leg.' },
                    { label: 'Read it bedtime stories', success: false, msg: '📚 You started reading. The T-Rex fell asleep, but right on top of you. You are pinned under 2 tons of scaly toddler.' }
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
                description: 'The Professor tells you to mix two chemicals to create "Glow-in-the-dark juice". You see three beakers. What do you do?',
                options: [
                    { label: 'Mix Blue and Yellow', success: true, msg: '🧪 You mixed blue and yellow. It glowed bright green! The Professor is thrilled and calls you a genius.' },
                    { label: 'Drink the glowing liquid', success: false, msg: '🥛 You drank it. You now glow in the dark, but you spent the rest of the shift in the bathroom.' },
                    { label: 'Sneeze into the beaker', success: false, msg: '🤧 You sneezed. The mixture fizzled and created a sentient slime that stole your wallet.' },
                    { label: 'Taste-test with your finger', success: false, msg: '☝️ Tastes like burning. A lot of burning. The safety inspector is writing a report.' }
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
                description: 'Someone stole the office cookies! The suspect has chocolate crumbs all over their face. How do you solve the mystery?',
                options: [
                    { label: 'Accuse chocolate face', success: true, msg: '🍪 You accused the coworker with chocolate crumbs. They confessed immediately. Easiest case ever.' },
                    { label: 'Arrest the office plant', success: false, msg: '🪴 You handcuffed a fern. It remained silent. The real thief ate another cookie.' },
                    { label: 'Blame the ghost of HR', success: false, msg: '👻 You blamed ghosts. HR did not appreciate being called ghosts. You got a warning.' },
                    { label: 'Interrogate the cookie box', success: false, msg: '📦 You stared at the empty box for 3 hours waiting for it to crack. It said nothing.' }
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
                description: 'The claw machine is rigged and kids are crying because they can\'t win the giant duck plushie. What do you do?',
                options: [
                    { label: 'Kick the machine', success: true, msg: '🥾 You kicked it. The claw shook loose and dropped 5 plushies. The kids think you are a god.' },
                    { label: 'Set claw grip to 100%', success: true, msg: '🔧 You set the claw strength to maximum. Everyone wins! You broke arcade laws but made people happy.' },
                    { label: 'Rig it even more', success: false, msg: '📉 You set claw grip to 0%. The claw now actively runs away from plushies. The kids started a riot.' },
                    { label: 'Play it yourself', success: false, msg: '🕹️ You spent $20 trying to win a $2 plushie. You lost. The kids laughed at you.' }
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
                description: 'A sneaky monkey stole the master keys and ran up a tall tree! How do you get them back?',
                options: [
                    { label: 'Bribe it with a banana', success: true, msg: '🍌 The monkey accepted the banana, dropped the keys, and gave you a high-five. Transaction complete.' },
                    { label: 'Climb the tree yourself', success: false, msg: '🌳 You tried to climb. The monkey threw acorns at your head. You fell and landed in a bush.' },
                    { label: 'Throw a rock at it', success: false, msg: '🪨 You threw a pebble. The monkey caught it and threw it back with 100% accuracy, giving you a black eye.' },
                    { label: 'File a complaint', success: false, msg: '📝 You filed a complaint with Monkey HR. They shredded it and ate the paper.' }
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
                description: 'You find a chest full of gold, but a giant, sleepy shark is resting right on top of it! What do you do?',
                options: [
                    { label: 'Swim quietly past', success: true, msg: '🏊 You swam past. The shark just blew a bubble. You grabbed the chest and surfaced safely!' },
                    { label: 'Poke it with a stick', success: false, msg: '🥢 You poked the shark. The shark woke up very cranky. You had to escape using your emergency thrusters.' },
                    { label: 'Sing it a lullaby', success: true, msg: '🎵 You sang a beautiful underwater lullaby. The shark fell into a deeper sleep, snoring bubbles. Easy loot!' },
                    { label: 'Play Rock-Paper-Scissors', success: false, msg: '✊ The shark chose paper because of its fins. But then it ate your scorecard.' }
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
                description: 'A passenger is playing loud music on their phone speaker without headphones. The whole train carriage is furious! What do you do?',
                options: [
                    { label: 'Politely offer headphones', success: true, msg: '🎧 You gave them free headphones. They took the hint. The passengers cheered!' },
                    { label: 'Sing along terribly', success: true, msg: '🎤 You sat next to them and sang along at maximum volume, completely off-key. Embarrassed, they turned it off instantly.' },
                    { label: 'Throw them off train', success: false, msg: '🚂 You tried to yeet them. That is highly illegal. You were fined and given a lecture.' },
                    { label: 'Stare intensely at them', success: false, msg: '👁️ You stared at them for 10 minutes. It got weird. They started playing the music louder to break the tension.' }
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
                description: 'A suitcase on the conveyor belt is vibrating loudly and making ticking noises! What do you do?',
                options: [
                    { label: 'Call the bomb squad', success: true, msg: '🚨 You called the squad. Turns out it was just a fancy electric massager, but everyone thanked you for safety first!' },
                    { label: 'Open it up to check', success: false, msg: '🔓 You opened it. The passenger saw you and accused you of stealing. You got suspended.' },
                    { label: 'Yeet it onto plane', success: false, msg: '✈️ You threw it on the plane. The ticking scared the pilots. The flight was cancelled.' },
                    { label: 'Slap Fragile sticker on it', success: false, msg: '🏷️ You slapped a sticker on it and walked away. The vibration shook the belt and caused a massive baggage jam.' }
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
                description: 'A baby dragon sneezed and set the nursery curtains on fire! What do you do?',
                options: [
                    { label: 'Throw water on curtains', success: true, msg: '🧯 You threw a bucket of water. Fire out! The baby dragon giggled and blew bubbles.' },
                    { label: 'Toast marshmallows', success: true, msg: '🍢 You grabbed marshmallows and had a quick toast session. The kids loved it! (You put out the fire right after).' },
                    { label: 'Scream and run away', success: false, msg: '🏃 You ran. The fire alarms went off. The daycare is now soggy and your boss is furious.' },
                    { label: 'Blame the baby dragon', success: false, msg: '👈 You tried to blame the baby. The baby cried, which caused it to accidentally spit fire at your supervisor\'s clipboard.' }
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
        try {
            await i.deferUpdate();
        } catch (_) {}

        const cooldown = getWorkCooldownInfo(initialData, baubleData);
        if (cooldown.timeLeft > 0) {
            const seconds = Math.ceil(cooldown.timeLeft / 1000);
            await i.followUp({
                content: `⏳ Please wait **${seconds}s** before pressing Work Again.`,
                ephemeral: true
            }).catch(() => {});
            return;
        }

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
