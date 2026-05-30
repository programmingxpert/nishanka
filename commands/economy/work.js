/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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

        const games = ['mining', 'security', 'electrician', 'barista'];

        const selectedGame =
            games[Math.floor(Math.random() * games.length)];

        if (selectedGame === 'mining') {
            await runMiningGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'security') {
            await runSecurityGame(initialData, channel, user, baubleData);
        } else if (selectedGame === 'electrician') {
            await runElectricianGame(initialData, channel, user, baubleData);
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

        await mainMessage
            .edit({
                embeds: [successEmbed],
                components: [disabledRow]
            })
            .catch(() => {});
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

        await mainMessage
            .edit({
                embeds: [resultEmbed],
                components: [disabledRow]
            })
            .catch(() => {});
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

        await mainMessage.edit({ embeds: [resultEmbed], components: [disabledRow] }).catch(() => {});
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
