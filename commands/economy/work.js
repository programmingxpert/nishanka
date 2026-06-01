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
        .setDescription('Do a work job'),

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
   MINING GAME
========================= */

async function runMiningGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    const progress = 100;

    const bar =
        '`' + '█'.repeat(10) + ` ${progress}%\``;

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

        const { finalEarnings, taxMsg } = await applyParentLaborTax(userId, earnings, baubleData);

        try {
            const currentProfile =
                await Bauble.findOne({ userId });

            if (currentProfile) {
                currentProfile.baubles += finalEarnings;
                currentProfile.dailyWorkLastCompleted = new Date();

                await currentProfile.save();

                baubleData.baubles =
                    currentProfile.baubles;
            }
        } catch (dbErr) {
            console.error(
                'Error saving mining earnings:',
                dbErr
            );
        }

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
                value: `${baubleData.baubles} Baubles`,
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: 'Hard work pays off 💼'
            });

        const disabledRow =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('work_mine')
                    .setLabel('Mining Complete')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
                    .setEmoji('💎')
            );

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

        const disabledRow =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('work_security')
                    .setLabel('Incident Concluded')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                    .setEmoji('📹')
            );

        if (reason === 'early') {
            resultEmbed
                .setColor(0xe74c3c)
                .setTitle('❌ False Alarm!')
                .setDescription(
                    `You got scared by a shadow and embarrassed yourself.\n\nEarned **0** Glimmering Baubles.`
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

            const { finalEarnings, taxMsg } = await applyParentLaborTax(userId, earnings, baubleData);

            resultEmbed
                .setColor(0x2ecc71)
                .setTitle('👮 Security Job Complete!')
                .setDescription(
                    `You caught the intruder in **${ms}ms**!\n\nEarned **${finalEarnings}** Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
                );

            try {
                const currentProfile =
                    await Bauble.findOne({ userId });

                if (currentProfile) {
                    currentProfile.baubles += finalEarnings;
                    currentProfile.dailyWorkLastCompleted = new Date();

                    await currentProfile.save();

                    baubleData.baubles =
                        currentProfile.baubles;
                }
            } catch (dbErr) {
                console.error(
                    'Error saving security earnings:',
                    dbErr
                );
            }

            resultEmbed.addFields({
                name: '💰 New Balance',
                value: `${baubleData.baubles} Baubles`,
                inline: true
            });

        } else {

            resultEmbed
                .setColor(0x7f8c8d)
                .setTitle('❌ Thief Escaped!')
                .setDescription(
                    `You missed the intruder completely.\n\nEarned **0** Glimmering Baubles.`
                );
        }

        const components = reason === 'caught' ? [buildWorkAgainRow()] : [disabledRow];
        const finalEmbed = reason === 'caught'
            ? appendWorkAgainFooter(resultEmbed, initialData, baubleData)
            : resultEmbed;

        await mainMessage
            .edit({
                embeds: [finalEmbed],
                components
            })
            .catch(() => {});

        if (reason === 'caught') {
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        }
    });
}

/* =========================
   FIXED ELECTRICIAN GAME
========================= */

async function runElectricianGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;

    const wireClues = [
        { clue: "Cut the color of the sky!", answer: "blue" },
        { clue: "Cut the color of grass!", answer: "green" },
        { clue: "Cut the color of fire!", answer: "red" },
        { clue: "Cut the color of bananas!", answer: "yellow" },
        { clue: "Cut the color with 5 letters!", answer: "green" },
        { clue: "Cut the color with 6 letters!", answer: "yellow" },
        { clue: "Cut the primary color that starts with B!", answer: "blue" },
        { clue: "Cut the primary color that starts with R!", answer: "red" }
    ];

    const selectedClue =
        wireClues[Math.floor(Math.random() * wireClues.length)];

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🔌 Emergency Electrician')
        .setDescription(
            `A power generator is overloading! Cut the correct wire within **10 seconds** to stabilize it!\n\n💡 **Code Hint:** *${selectedClue.clue}*`
        )
        .setFooter({ text: 'Focus!' });

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wire_red')
            .setLabel('Red')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔴'),

        new ButtonBuilder()
            .setCustomId('wire_blue')
            .setLabel('Blue')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔵'),

        new ButtonBuilder()
            .setCustomId('wire_green')
            .setLabel('Green')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢'),

        new ButtonBuilder()
            .setCustomId('wire_yellow')
            .setLabel('Yellow')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🟡')
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

    let gameResult = null;
    let clickedColor = null;

    const collector =
        mainMessage.createMessageComponentCollector({
            filter:
                i =>
                    i.user.id === userId &&
                    i.customId.startsWith('wire_'),
            time: 10000
        });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate();
        } catch (_) {}

        clickedColor =
            i.customId.replace('wire_', '');

        if (clickedColor === selectedClue.answer) {
            gameResult = 'success';
        } else {
            gameResult = 'wrong';
        }

        collector.stop();
    });

    collector.on('end', async () => {

        let earnings = 0;

        const resultEmbed = new EmbedBuilder();

        const disabledRow =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('wire_red')
                    .setLabel('Red')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔴')
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId('wire_blue')
                    .setLabel('Blue')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔵')
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId('wire_green')
                    .setLabel('Green')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🟢')
                    .setDisabled(true),

                new ButtonBuilder()
                    .setCustomId('wire_yellow')
                    .setLabel('Yellow')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🟡')
                    .setDisabled(true)
            );

        if (gameResult === 'success') {

            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            earnings = Math.floor(65 * globalMultiplier * incomeMultiplier);

            const { finalEarnings, taxMsg } = await applyParentLaborTax(userId, earnings, baubleData);

            resultEmbed
                .setColor(0x2ecc71)
                .setTitle('✅ Generator Stabilized!')
                .setDescription(
                    `Excellent work! You cut the **${clickedColor.toUpperCase()}** wire.\n\nEarned **${finalEarnings}** Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`
                );

            try {
                const currentProfile =
                    await Bauble.findOne({ userId });

                if (currentProfile) {
                    currentProfile.baubles += finalEarnings;
                    currentProfile.dailyWorkLastCompleted = new Date();

                    await currentProfile.save();

                    baubleData.baubles =
                        currentProfile.baubles;
                }
            } catch (dbErr) {
                console.error(
                    'Error saving electrician earnings:',
                    dbErr
                );
            }

            resultEmbed.addFields({
                name: '💰 New Balance',
                value: `${baubleData.baubles} Baubles`,
                inline: true
            });

        } else if (gameResult === 'wrong') {

            resultEmbed
                .setColor(0xe74c3c)
                .setTitle('💥 Short Circuit!')
                .setDescription(
                    `ZAP! You cut the **${clickedColor.toUpperCase()}** wire instead of the **${selectedClue.answer.toUpperCase()}** wire!\n\nEarned **0** Glimmering Baubles.`
                );

        } else {

            resultEmbed
                .setColor(0xe67e22)
                .setTitle('💥 Generator Overloaded!')
                .setDescription(
                    `You didn't cut a wire in time and the generator exploded!\n\nEarned **0** Glimmering Baubles.`
                );
        }

        await mainMessage
            .edit({
                embeds: [resultEmbed],
                components: [disabledRow]
            })
            .catch(() => {});
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

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('barista_coffee').setLabel('Coffee').setStyle(ButtonStyle.Primary).setEmoji('☕').setDisabled(true),
            new ButtonBuilder().setCustomId('barista_milk').setLabel('Milk').setStyle(ButtonStyle.Secondary).setEmoji('🥛').setDisabled(true),
            new ButtonBuilder().setCustomId('barista_chocolate').setLabel('Chocolate').setStyle(ButtonStyle.Success).setEmoji('🍫').setDisabled(true),
            new ButtonBuilder().setCustomId('barista_ice').setLabel('Ice').setStyle(ButtonStyle.Danger).setEmoji('🧊').setDisabled(true)
        );

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

                const { finalEarnings, taxMsg } = await applyParentLaborTax(userId, earnings, baubleData);
                
                resultEmbed
                    .setColor(0x2ecc71)
                    .setTitle('☕ Order Served!')
                    .setDescription(`Perfect! You brewed a fresh **${recipe.name}**! The customer tipped you generously.\n\nEarned **${finalEarnings}** Glimmering Baubles. *(Economy Multiplier: ${globalMultiplier}x)*${taxMsg}`)
                    .setTimestamp();

                try {
                    const currentProfile = await Bauble.findOne({ userId });
                    if (currentProfile) {
                        currentProfile.baubles += finalEarnings;
                        currentProfile.dailyWorkLastCompleted = new Date();
                        await currentProfile.save();
                        baubleData.baubles = currentProfile.baubles;
                    }
                } catch (dbErr) {
                    console.error('Error saving barista earnings:', dbErr);
                }

                resultEmbed.addFields({ name: '💰 New Balance', value: `${baubleData.baubles} Baubles`, inline: true });
            } else {
                resultEmbed
                    .setColor(0xe74c3c)
                    .setTitle('🤢 Ruined Drink')
                    .setDescription(`Yuck! You mixed a weird combo and served it to the customer. They gagged and walked out!\n\nEarned **0** Glimmering Baubles.`)
                    .setTimestamp();
            }
        } else {
            // Timeout
            resultEmbed
                .setColor(0x95a5a6)
                .setTitle('⏰ Customer Walked Out!')
                .setDescription(`You took too long to make the drink, and the customer got tired of waiting and left!\n\nEarned **0** Glimmering Baubles.`)
                .setTimestamp();
        }

            const finalEmbed = appendWorkAgainFooter(resultEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
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
    const unlockedTitles = unlockWorkTitles(baubleData);
    await baubleData.save();

    return { finalEarnings, taxMsg, event, unlockedTitles, balance: baubleData.baubles };
}

function makeButtonRow(buttons) {
    return new ActionRowBuilder().addComponents(buttons);
}

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

function buildPaginatedJobList(name, description) {
    return new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(name)
        .setDescription(description);
}

async function runPizzaDeliveryGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const routes = [
        {
            stops: ['north', 'east', 'north', 'west'],
            clue: 'Start at the bakery, then head to the neon arcade, then the cat cafe, and finally the hilltop mansion.'
        },
        {
            stops: ['south', 'south', 'east', 'north'],
            clue: 'Begin at the dock, pass the market twice, turn to the observatory, then deliver to the skylight tower.'
        },
        {
            stops: ['east', 'north', 'east', 'south'],
            clue: 'Leave the train station, cross the memorial bridge, head to the glass dome, then back to the waterfall cafe.'
        }
    ];
    const selected = routes[Math.floor(Math.random() * routes.length)];
    const directions = {
        north: 'North',
        east: 'East',
        south: 'South',
        west: 'West'
    };
    let step = 0;
    const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🍕 Pizza Delivery Shift')
        .setDescription(
            `You have a single route with **4 stops**. Remember the order and deliver each pizza correctly.

**Route Clue:** ${selected.clue}

**Current Stop:** 1 of 4`
        )
        .setFooter({ text: 'Choose the next direction carefully.' });

    const buttons = Object.entries(directions).map(([key, label]) =>
        new ButtonBuilder().setCustomId(`pizza_${key}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );

    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('pizza_'),
        time: 20000
    });

    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = i.customId.replace('pizza_', '');
        if (choice !== selected.stops[step]) {
            collector.stop('wrong');
            return;
        }
        step += 1;
        if (step === selected.stops.length) {
            collector.stop('success');
            return;
        }

        const updated = EmbedBuilder.from(mainMessage.embeds[0])
            .setDescription(
                `You have a single route with **4 stops**. Remember the order and deliver each pizza correctly.

**Route Clue:** ${selected.clue}

**Current Stop:** ${step + 1} of 4`
            );
        await mainMessage.edit({ embeds: [updated] }).catch(() => {});
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'success') {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 95, 'deliveriesCompleted');
            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🚗 Pizza Delivered!')
                .setDescription(`You completed the route and delivered every pizza on time!${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles. *(A delivery job well done.)*${taxMsg}`)
                .addFields({ name: '💰 New Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) {
                successEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            }
            const finalEmbed = appendWorkAgainFooter(successEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else if (reason === 'wrong') {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🧭 Wrong Turn!')
                .setDescription('You took the wrong turn and dropped the pizza in a fountain. Karen demanded to speak to your manager.')
                .setFooter({ text: 'Deliveries are more dangerous than they look.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        } else {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏱️ Delivery Late!')
                .setDescription('You got stuck in traffic and the customer refused the order. Earned **0** Baubles.')
                .setFooter({ text: 'Speed doesn’t help when you can’t choose the right street.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runBombDisposalGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const puzzles = [
        {
            clue: 'The red wire is dangerous. The yellow wire is only safe if the blue wire stays intact. Cut the only wire you can trust.',
            safe: 'green'
        },
        {
            clue: 'The blue wire is safe when the green wire is not cut. If the yellow wire is chosen, the alarm will sound. Pick the safe wire.',
            safe: 'blue'
        },
        {
            clue: 'The last wire is a decoy, the red wire is full of sparks, and the green wire is always safe unless the yellow one is cut first.',
            safe: 'green'
        }
    ];
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    const embed = new EmbedBuilder()
        .setColor(0xff4d4f)
        .setTitle('💣 Bomb Disposal')
        .setDescription(`A timer ticks nearby. ${selected.clue}\n\nSelect the correct wire to cut.`)
        .setFooter({ text: 'One wrong move and it is over.' });
    const buttons = ['red', 'blue', 'green', 'yellow'].map(color =>
        new ButtonBuilder().setCustomId(`bomb_${color}`).setLabel(color.charAt(0).toUpperCase() + color.slice(1)).setStyle(color === 'green' ? ButtonStyle.Success : ButtonStyle.Danger)
    );

    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('bomb_'),
        max: 1,
        time: 15000
    });

    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = i.customId.replace('bomb_', '');
        const success = choice === selected.safe;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 110, 'bombsDefused');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Bomb Defused!')
                .setDescription(`You cut the **${choice.toUpperCase()}** wire and the device goes quiet.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) {
                winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            }
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const loseEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('💥 Boom!')
                .setDescription(`You snipped the **${choice.toUpperCase()}** wire and the bomb exploded. The dinosaur ate your paycheck. Earned **0** Baubles.`)
                .setFooter({ text: 'Maybe bomb disposal requires a little more training.' });
            await mainMessage.edit({ embeds: [loseEmbed], components: [] }).catch(() => {});
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ Too Slow!')
                .setDescription('The timer ran out before you could cut a wire. The bomb exploded on its own. Earned **0** Baubles.')
                .setFooter({ text: 'You might want to stick to paperwork.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runGhostHunterGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const puzzles = [
        {
            clue: 'The EMF reader flashes in a three-two-three pattern. The ghost is hiding behind the door that does not follow the repetition.',
            options: ['Door A', 'Door B', 'Door C', 'Door D'],
            answer: 1,
            detail: 'A B A B C A B A'
        },
        {
            clue: 'The cold spots form a sequence where every third reading is stronger. Find the room with the stronger pulse.',
            options: ['Room Blue', 'Room Green', 'Room Red', 'Room Yellow'],
            answer: 2,
            detail: 'low, low, high, low, low, high'
        },
        {
            clue: 'The ghost repeats two flashes then one pause. Choose the room that matches the pattern.',
            options: ['North Wing', 'South Wing', 'East Wing', 'West Wing'],
            answer: 3,
            detail: '⚡⚡⏸️ ⚡⚡⏸️ ⚡⚡'
        }
    ];
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    const embed = new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle('👻 Ghost Hunter')
        .setDescription(`${selected.clue}\n\n**Signal:** ${selected.detail}`)
        .setFooter({ text: 'Which room is the ghost in?' });
    const buttons = selected.options.map((label, index) =>
        new ButtonBuilder().setCustomId(`ghost_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('ghost_'),
        max: 1,
        time: 20000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('ghost_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 90, 'ghostsCaptured');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Ghost Captured!')
                .setDescription(`You trapped the spirit and sealed the room.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('👻 Phantom Flees!')
                .setDescription('The ghost vanished into the ceiling, leaving ectoplasm everywhere. Earned **0** Baubles.')
                .setFooter({ text: 'The spirits are not impressed.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🕒 Lost the Signal')
                .setDescription('The ghost slipped away before you could act. Earned **0** Baubles.')
                .setFooter({ text: 'Ghost hunting requires patience.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runAlienTranslatorGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const puzzles = [
        {
            cipher: '🔺◼🔺',
            mapping: '🔺=A ◼=T ☆=R ☾=O',
            choices: ['CAT', 'ART', 'RAT', 'TOA'],
            answer: 1
        },
        {
            cipher: '☾☆◼',
            mapping: '☾=O ☆=R ◼=T 🔺=A',
            choices: ['ROT', 'TOR', 'ORT', 'TRO'],
            answer: 0
        },
        {
            cipher: '🔺☾☆',
            mapping: '🔺=A ☾=O ☆=R ◼=T',
            choices: ['OAR', 'ART', 'ORA', 'ROA'],
            answer: 0
        }
    ];
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('👽 Alien Translator')
        .setDescription(`Translate the alien symbols using the code below.\n\n**Code:** ${selected.mapping}\n**Phrase:** ${selected.cipher}`)
        .setFooter({ text: 'Pick the correct Earth equivalent.' });
    const buttons = selected.choices.map((label, index) =>
        new ButtonBuilder().setCustomId(`alien_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('alien_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('alien_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 100, 'aliensTranslated');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛸 Translation Complete!')
                .setDescription(`You cracked the alien phrase and impressed the ship captain.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const loseEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🛸 Lost in Translation')
                .setDescription('You mistranslated the message and the alien paid you in space coupons that are not worth anything here. Earned **0** Baubles.')
                .setFooter({ text: 'Maybe try a different dialect.' });
            await mainMessage.edit({ embeds: [loseEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Signal Lost')
                .setDescription('The aliens drifted away before you could finish translating. Earned **0** Baubles.')
                .setFooter({ text: 'Intergalactic linguistics is not for the faint of heart.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runFastFoodGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const orders = [
        { order: 'Burger, Fries, and Soda', options: ['Burger Combo', 'Salad Pack', 'Fish Meal', 'Veggie Bowl'], answer: 0 },
        { order: 'Nuggets, Shake, and Onion Rings', options: ['Snack Pack', 'Kids Meal', 'Burger Combo', 'Pasta Special'], answer: 1 },
        { order: 'Taco, Milkshake, and Fries', options: ['Taco Feast', 'Burger Combo', 'Drinks Only', 'Hot Dog Set'], answer: 0 }
    ];
    const selected = orders[Math.floor(Math.random() * orders.length)];
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🍔 Fast Food Worker')
        .setDescription(`A customer ordered: **${selected.order}**\n\nChoose the correct prepared combo.`)
        .setFooter({ text: 'One wrong tray and the customer will complain.' });
    const buttons = selected.options.map((label, index) =>
        new ButtonBuilder().setCustomId(`fastFood_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('fastFood_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('fastFood_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 85, 'customersServed');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🍟 Order Served!')
                .setDescription(`You handed over the perfect tray and avoided a meltdown.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('😡 Angry Customer!')
                .setDescription('You served the wrong combo and a customer threw a soda at you. Earned **0** Baubles.')
                .setFooter({ text: 'Fast food moves fast for a reason.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏲️ Cold Order')
                .setDescription('The order went cold while you hesitated. Earned **0** Baubles.')
                .setFooter({ text: 'Speed matters in fast food.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runDinosaurKeeperGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const moods = [
        { mood: 'Herbivore and mellow', options: ['Steak', 'Ferns', 'Berries', 'Chalk'], answer: 1 },
        { mood: 'Hungry for speed', options: ['Meat', 'Ferns', 'Soufflé', 'Nails'], answer: 0 },
        { mood: 'Likes crunchy snacks', options: ['Pineapple', 'Ferns', 'Sand', 'Mango'], answer: 1 }
    ];
    const selected = moods[Math.floor(Math.random() * moods.length)];
    const embed = new EmbedBuilder()
        .setColor(0x16a085)
        .setTitle('🦖 Dinosaur Keeper')
        .setDescription(`The dinosaur is ${selected.mood}. Choose the safest food for it.`)
        .setFooter({ text: 'One bite can devour your paycheck.' });
    const buttons = selected.options.map((label, index) =>
        new ButtonBuilder().setCustomId(`dinosaur_${index}`).setLabel(label).setStyle(index === selected.answer ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('dinosaur_'),
        max: 1,
        time: 16000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('dinosaur_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 95, 'dragonsHandled');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🦕 Dinosaur Happy!')
                .setDescription(`The dinosaur enjoyed the meal and left your paycheck alone.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const loseEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('💸 Paycheck Eaten!')
                .setDescription('The dinosaur chomped your paycheck and left you with nothing. Earned **0** Baubles.')
                .setFooter({ text: 'This job is not for the faint-hearted.' });
            await mainMessage.edit({ embeds: [loseEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🦖 Sit Still!')
                .setDescription('The dinosaur got bored and wandered off. Earned **0** Baubles.')
                .setFooter({ text: 'Animal care is a test of patience.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runScientistAssistantGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const experiments = [
        {
            clue: 'Mix the base after the catalyst, but do not combine the glowing reagent with the acid. Which sequence is safe?',
            choices: ['Catalyst, Base, Acid', 'Base, Catalyst, Acid', 'Acid, Catalyst, Base', 'Base, Acid, Catalyst'],
            answer: 0
        },
        {
            clue: 'The green solution is only stable when the red one is added last. Choose the correct order.',
            choices: ['Blue, Green, Red', 'Green, Blue, Red', 'Red, Blue, Green', 'Blue, Red, Green'],
            answer: 1
        }
    ];
    const selected = experiments[Math.floor(Math.random() * experiments.length)];
    const embed = new EmbedBuilder()
        .setColor(0x2980b9)
        .setTitle('🔬 Scientist Assistant')
        .setDescription(`${selected.clue}`)
        .setFooter({ text: 'A wrong mix could cause a lab explosion.' });
    const buttons = selected.choices.map((label, index) =>
        new ButtonBuilder().setCustomId(`scientist_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('scientist_'),
        max: 1,
        time: 20000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('scientist_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 105, 'inspectionsSurvived');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🧪 Experiment Successful!')
                .setDescription(`The experiment completed without incident.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('💥 Lab Accident!')
                .setDescription('The mixture fizzled violently and the lab went red. Earned **0** Baubles.')
                .setFooter({ text: 'Science is dangerous at the wrong moment.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🧬 Experiment Aborted')
                .setDescription('You hesitated too long and the experiment was shut down. Earned **0** Baubles.')
                .setFooter({ text: 'Precision is everything in the lab.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runDetectiveGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const cases = [
        {
            clue: 'The thief wore shoes with grass stains and was seen near the garden gate, but the accountant always stays indoors.',
            suspects: ['Accountant', 'Gardener', 'Chef', 'Janitor'],
            answer: 1
        },
        {
            clue: 'Only one suspect owns a map of the museum and has a key to Room 3.',
            suspects: ['Curator', 'Guard', 'Chef', 'Cleaner'],
            answer: 0
        }
    ];
    const selected = cases[Math.floor(Math.random() * cases.length)];
    const embed = new EmbedBuilder()
        .setColor(0x34495e)
        .setTitle('🕵️ Detective')
        .setDescription(`${selected.clue}`)
        .setFooter({ text: 'Who solved the mystery?' });
    const buttons = selected.suspects.map((label, index) =>
        new ButtonBuilder().setCustomId(`detective_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('detective_'),
        max: 1,
        time: 20000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('detective_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 100, 'mysteriesSolved');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🧠 Mystery Solved!')
                .setDescription(`Your deduction was flawless and the case is closed.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Wrong Suspect!')
                .setDescription('You accused the wrong person and the real culprit escaped. Earned **0** Baubles.')
                .setFooter({ text: 'Detectives learn from their mistakes.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🕵️ Time Ran Out')
                .setDescription('The trail went cold before you could choose a suspect. Earned **0** Baubles.')
                .setFooter({ text: 'A detective must act before the clues fade.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runArcadeTechnicianGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const machines = [
        {
            clue: 'The cabinet with the arcade light flickering is the one with the stuck coin slot.',
            options: ['Cabinet A', 'Cabinet B', 'Cabinet C', 'Cabinet D'],
            answer: 2
        },
        {
            clue: 'Only the machine with the flashing red button has a broken joystick. Repair that one.',
            options: ['Cabinet X', 'Cabinet Y', 'Cabinet Z', 'Cabinet W'],
            answer: 1
        }
    ];
    const selected = machines[Math.floor(Math.random() * machines.length)];
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🕹️ Arcade Technician')
        .setDescription(`${selected.clue}`)
        .setFooter({ text: 'Fix the right cabinet before the arcade closes.' });
    const buttons = selected.options.map((label, index) =>
        new ButtonBuilder().setCustomId(`arcade_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('arcade_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('arcade_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 90, 'arcadeRepairs');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛠️ Repair Complete!')
                .setDescription(`You fixed the cabinet and the arcade crowd cheers.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('⚠️ Wrong Repair!')
                .setDescription('You pulled the wrong plug and the machine shorted out. Earned **0** Baubles.')
                .setFooter({ text: 'Arcade electronics are tricky.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🕒 Repair Delayed')
                .setDescription('The arcade closed before you finished fixing it. Earned **0** Baubles.')
                .setFooter({ text: 'Fast repairs keep the tokens flowing.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runZooKeeperGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const puzzles = [
        {
            animal: 'A sleepy penguin',
            options: ['Tropical Aviary', 'Arctic Pool', 'Savannah Plains', 'Reptile House'],
            answer: 1
        },
        {
            animal: 'A hopping kangaroo',
            options: ['Reptile House', 'Desert Dome', 'Outback Exhibit', 'Ocean Tank'],
            answer: 2
        },
        {
            animal: 'A slithering python',
            options: ['Bird Cage', 'Reptile House', 'Rainforest Treehouse', 'Savannah Plains'],
            answer: 1
        }
    ];
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    const embed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('🦓 Zoo Keeper')
        .setDescription(`Where should you move ${selected.animal}?`)
        .setFooter({ text: 'Choose the right habitat.' });
    const buttons = selected.options.map((label, index) =>
        new ButtonBuilder().setCustomId(`zookeeper_${index}`).setLabel(label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('zookeeper_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('zookeeper_', ''));
        const success = choice === selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 90, 'customersServed');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🦜 Animal Safely Moved!')
                .setDescription(`The animal went to the perfect habitat.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🐾 Wrong Habitat!')
                .setDescription('The animal was unhappy and your supervisor was not pleased. Earned **0** Baubles.')
                .setFooter({ text: 'Habitat match matters.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ Animal Waited Too Long')
                .setDescription('The animal grew restless before you chose a home. Earned **0** Baubles.')
                .setFooter({ text: 'Zoo work is always in motion.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runTreasureDiverGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const choices = [
        { label: 'Coral Chest', clue: 'The coral reef chest is old and carries glittering coins.', answer: false },
        { label: 'Sunken Vault', clue: 'The vault has shark teeth carved on it but may hold the richest prize.', answer: true },
        { label: 'Sand Pile', clue: 'The sand pile looks safe but may contain a decoy.', answer: false }
    ];
    const embed = new EmbedBuilder()
        .setColor(0x2980b9)
        .setTitle('🤿 Treasure Recovery Diver')
        .setDescription('Three underwater chests lie before you. Only one is worth recovering safely. Choose wisely.')
        .setFooter({ text: 'The ocean is full of tricks.' });
    const buttons = choices.map((choice, index) =>
        new ButtonBuilder().setCustomId(`diver_${index}`).setLabel(choice.label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('diver_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('diver_', ''));
        const selected = choices[choice];
        const success = selected.answer;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 120, 'treasuresRecovered');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🏴‍☠️ Treasure Recovered!')
                .setDescription(`You surfaced with the sunken vault intact and a glittering haul.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🐙 Trap!')
                .setDescription('The chest was a hollow decoy full of seaweed and old socks. Earned **0** Baubles.')
                .setFooter({ text: 'The ocean keeps some secrets.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ Diving Delay')
                .setDescription('You surfaced empty-handed as the tide changed. Earned **0** Baubles.')
                .setFooter({ text: 'The sea waits for no one.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runTrainConductorGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const options = [
        { label: 'Switch to Platform A', correct: true },
        { label: 'Switch to Engine Yard', correct: false },
        { label: 'Switch to Freight Track', correct: false },
        { label: 'Switch to Maintenance Loop', correct: false }
    ];
    const embed = new EmbedBuilder()
        .setColor(0x2c3e50)
        .setTitle('🚆 Train Conductor')
        .setDescription('A passenger express is approaching. Send it to the correct platform before the signal changes.')
        .setFooter({ text: 'One wrong switch and the schedule collapses.' });
    const buttons = options.map((choice, index) =>
        new ButtonBuilder().setCustomId(`train_${index}`).setLabel(choice.label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('train_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('train_', ''));
        const success = options[choice].correct;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 100, 'trainsConducted');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🚉 On Time!')
                .setDescription(`The express rolled into the right platform and the passengers cheered.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🚨 Wrong Track!')
                .setDescription('The train was routed to the wrong line and the station erupted in chaos. Earned **0** Baubles.')
                .setFooter({ text: 'Conductors must think ahead.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ Missed the Signal')
                .setDescription('The train left before you could switch the track. Earned **0** Baubles.')
                .setFooter({ text: 'Timing is everything in rail work.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runAirportBaggageGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const luggage = [
        { tag: 'Flight 412', destination: 'Gate B', correct: true },
        { tag: 'Flight 205', destination: 'Gate A', correct: false },
        { tag: 'Flight 773', destination: 'Gate C', correct: false },
        { tag: 'Flight 609', destination: 'Gate D', correct: false }
    ];
    const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🛄 Airport Baggage Handler')
        .setDescription('You need to place Flight 412 baggage on the correct belt. Which is it?')
        .setFooter({ text: 'One wrong bag and a customer loses a vacation.' });
    const buttons = luggage.map((item, index) =>
        new ButtonBuilder().setCustomId(`airport_${index}`).setLabel(item.destination).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('airport_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('airport_', ''));
        const success = luggage[choice].correct;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 90, 'bagsHandled');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛫 Bag Routed Correctly!')
                .setDescription(`The passenger’s luggage made it to the right gate.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🧳 Lost Bag!')
                .setDescription('You sent the bag to the wrong gate and the vacation is ruined. Earned **0** Baubles.')
                .setFooter({ text: 'Airport work is all about the little details.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ On Hold')
                .setDescription('The belt closed before you could sort the luggage. Earned **0** Baubles.')
                .setFooter({ text: 'Baggage handling waits for no one.' });
            await mainMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
}

async function runDragonDaycareGame(initialData, channel, user, baubleData) {
    const isSlash = !!initialData.deferReply;
    const userId = user.id;
    const actions = [
        { label: 'Feed Fruit', success: true },
        { label: 'Sing a Song', success: false },
        { label: 'Do a Magic Trick', success: false }
    ];
    const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('🐉 Dragon Daycare Worker')
        .setDescription('A dragon toddler is fussy. Choose how to calm it down before the audit begins.')
        .setFooter({ text: 'Dragons are adorable until they are not.' });
    const buttons = actions.map((action, index) =>
        new ButtonBuilder().setCustomId(`dragonDaycare_${index}`).setLabel(action.label).setStyle(ButtonStyle.Primary)
    );
    let mainMessage;
    if (isSlash) {
        if (initialData.replied || initialData.deferred) {
            mainMessage = await initialData.followUp({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        } else {
            mainMessage = await initialData.reply({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)], withResponse: true });
        }
    } else {
        mainMessage = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [makeButtonRow(buttons)] });
    }
    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId && i.customId.startsWith('dragonDaycare_'),
        max: 1,
        time: 18000
    });
    collector.on('collect', async i => {
        try { await i.deferUpdate(); } catch (_) {}
        const choice = Number(i.customId.replace('dragonDaycare_', ''));
        const success = actions[choice].success;
        if (success) {
            const { finalEarnings, taxMsg, event, unlockedTitles, balance } = await processWorkReward(baubleData, 110, 'dragonsHandled');
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔥 Dragon Tamed!')
                .setDescription(`The little dragon calmed down and the daycare passed inspection.${getEventNote(event)}\n\nEarned **${finalEarnings}** Glimmering Baubles.${taxMsg}`)
                .addFields({ name: '💰 Balance', value: `${balance} Baubles`, inline: true });
            if (unlockedTitles.length > 0) winEmbed.addFields({ name: '🏷️ Title Unlocked', value: unlockedTitles.join(', ') });
            await mainMessage.edit({ embeds: [winEmbed], components: [] }).catch(() => {});
        } else {
            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔥 Dragon Tantrum!')
                .setDescription('The dragon burned your timesheet and shrieked at the supervisor. Earned **0** Baubles.')
                .setFooter({ text: 'Dragon daycare is chaos disguised as cuteness.' });
            await mainMessage.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }
    });
    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏳ Dragon Unhappy')
                .setDescription('The dragon got bored before you could act. Earned **0** Baubles.')
                .setFooter({ text: 'Dragon care requires quick choices.' });
            const finalEmbed = appendWorkAgainFooter(winEmbed, initialData, baubleData);
            await mainMessage.edit({ embeds: [finalEmbed], components: [buildWorkAgainRow()] }).catch(() => {});
            attachWorkAgainCollector(mainMessage, initialData, channel, user, baubleData);
        }
    });
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
