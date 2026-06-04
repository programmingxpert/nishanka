const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

    category: 'fun',
    isAI: true,
    cooldown: 60,
    premiumCooldown: 10,
    data: new SlashCommandBuilder()
        .setName('excuse')
        .setDescription('Give your best excuse for a sticky situation and let the AI judge you!')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Play solo or multiplayer mode')
                .setRequired(false)
                .addChoices(
                    { name: 'Solo', value: 'solo' },
                    { name: 'Multiplayer', value: 'multiplayer' }
                )),

    async execute(interaction) {
        const mode = interaction.options.getString('mode') || 'solo';
        await runExcuseGame(interaction, interaction.channel, interaction.user, mode);
    },

    async executePrefix(message, args) {
        const mode = args[0]?.toLowerCase() === 'multiplayer' ? 'multiplayer' : 'solo';
        await runExcuseGame(message, message.channel, message.author, mode);
    }
};

const { consumeAPU } = require('../../utils/aiManager');
const { isGuildPremium, isUserPremium } = require('../../utils/premiumPromo');

async function runExcuseGame(initialData, channel, user, mode) {
    const isSlash = !!initialData.deferReply;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The AI features are currently unavailable. Please check back later!';
        if (isSlash) {
            return initialData.reply({ content: msg, ephemeral: true });
        } else {
            return channel.send(msg);
        }
    }

    const guildId = initialData.guildId;
    const isPrem = (await isGuildPremium(guildId)) || isUserPremium(user.id);
    const cost = mode === 'multiplayer' ? 35 : 20;

    const apuResult = await consumeAPU(user.id, cost, isPrem);
    if (!apuResult.success) {
        const msg = `❌ **Insufficient AI Power Units (APU)!**\nHosting an **Excuse game (${mode})** costs **${cost} APU**.\nYou have **${apuResult.remaining}/${apuResult.max} APU** left.\n\nUse \`/ai status\` to check/recharge your APUs using Baubles.`;
        if (isSlash) {
            return initialData.reply({ content: msg, ephemeral: true });
        } else {
            return channel.send(msg);
        }
    }

    if (mode === 'multiplayer') {
        await runExcuseGameMultiplayer(initialData, channel, user, apiKey);
    } else {
        await runExcuseGameSolo(initialData, channel, user, apiKey);
    }
}

async function runExcuseGameSolo(initialData, channel, user, apiKey) {
    const isSlash = !!initialData.deferReply;

    if (isSlash) {
        await initialData.deferReply();
    }

    let scenario;
    try {
        scenario = await generateAIScenario(apiKey);
    } catch (err) {
        console.error('Failed to generate scenario via AI:', err);
        const msg = '⚠️ The AI Judge had a brain freeze (Failed to generate scenario). Please try again later!';
        if (isSlash) {
            return initialData.editReply({ content: msg, embeds: [], components: [] });
        } else {
            return channel.send(msg);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🚨 BUSTED! EXCUSE BY AI (SOLO)')
        .setDescription(`**SCENARIO:**\n${scenario}\n\n*Click the button below to write and submit your excuse within 90 seconds!*`)
        .setFooter({ text: 'The AI Judge is waiting...', iconURL: user.displayAvatarURL({ dynamic: true }) });

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('excuse_write_solo')
            .setLabel('Write Excuse')
            .setStyle(ButtonStyle.Primary)
    );

    let mainMessage;
    if (isSlash) {
        mainMessage = await initialData.editReply({ embeds: [embed], components: [btnRow] });
    } else {
        mainMessage = await channel.send({ embeds: [embed], components: [btnRow] });
    }

    const buttonFilter = i => i.customId === 'excuse_write_solo' && i.user.id === user.id;
    
    try {
        const btnInteraction = await mainMessage.awaitMessageComponent({
            filter: buttonFilter,
            time: 90000
        });

        const modalCustomId = `excuse_modal_solo_${user.id}_${Date.now()}`;
        const modal = new ModalBuilder()
            .setCustomId(modalCustomId)
            .setTitle('Submit Your Excuse')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('excuse_input')
                        .setLabel('Your Excuse')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Type your excuse here...')
                        .setMaxLength(300)
                        .setRequired(true)
                )
            );

        await btnInteraction.showModal(modal);

        const modalSubmit = await btnInteraction.awaitModalSubmit({
            filter: iModal => iModal.customId === modalCustomId,
            time: 60000
        });

        await modalSubmit.deferUpdate();

        // Disable button after excuse is submitted
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('excuse_write_solo')
                .setLabel('Excuse Submitted')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
        if (isSlash) {
            await initialData.editReply({ components: [disabledRow] }).catch(() => {});
        } else {
            await mainMessage.edit({ components: [disabledRow] }).catch(() => {});
        }

        const excuseText = modalSubmit.fields.getTextInputValue('excuse_input');

        const thinkingEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setDescription(`🧠 **The AI Judge is analyzing your excuse...**`);
        
        const thinkingMessage = await channel.send({ embeds: [thinkingEmbed] });

        try {
            const result = await evaluateExcuse(scenario, excuseText, apiKey);
            
            let metrics = result.metrics;
            if (!Array.isArray(metrics) || metrics.length === 0) {
                metrics = [
                    { name: 'Believability', score: result.believability || 50 },
                    { name: 'Confidence', score: result.confidence || 50 },
                    { name: 'Manipulation', score: result.manipulation || 50 },
                    { name: 'Stupidity', score: result.stupidity || 50 }
                ];
            }

            metrics = metrics.slice(0, 4);

            let successScore = result.successScore !== undefined ? Number(result.successScore) : null;
            if (successScore === null) {
                successScore = Math.round(metrics.reduce((sum, met) => sum + met.score, 0) / metrics.length);
            }

            const shortExcuse = result.shortExcuse ? String(result.shortExcuse).trim() : excuseText.slice(0, 40) + (excuseText.length > 40 ? '...' : '');

            const fields = [
                { name: 'Your Excuse', value: `*"${shortExcuse}"*` }
            ];

            metrics.forEach((m, idx) => {
                const mName = m.name ? String(m.name).trim() : `Metric ${idx + 1}`;
                fields.push({ name: mName, value: buildProgressBar(m.score), inline: true });
                if (idx === 1 || idx === 3) {
                    fields.push({ name: '\u200B', value: '\u200B', inline: true });
                }
            });

            fields.push({ name: 'Success Rate', value: buildProgressBar(successScore), inline: false });
            fields.push({ name: 'Verdict', value: result.verdict || 'No verdict provided.' });

            let prize = 0;
            let prizeMsg = '';
            if (successScore >= 40) {
                const globalMultiplier = await getGlobalMultiplier();
                prize = Math.floor(successScore * globalMultiplier);
                try {
                    let userBaubles = await Bauble.findOne({ userId: user.id });
                    if (!userBaubles) {
                        userBaubles = new Bauble({ userId: user.id, baubles: 0 });
                    }
                    userBaubles.baubles += prize;
                    await userBaubles.save();
                    prizeMsg = `\n\n🪙 You earned **${prize}** Baubles! *(Economy Multiplier: ${globalMultiplier}x)*`;
                } catch (dbErr) {
                    console.error('Failed to save baubles for solo player:', dbErr);
                }
            } else {
                prizeMsg = `\n\n⚖️ **Guilty!** The AI Judge rejected your excuse. No Baubles awarded.`;
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('⚖️ THE AI HAS SPOKEN')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(fields)
                .setDescription(prizeMsg)
                .setFooter({ text: 'Excuse by AI' });

            await thinkingMessage.edit({ embeds: [resultEmbed] });

        } catch (apiError) {
            console.error('DeepSeek API Error:', apiError);
            const errEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setDescription('⚠️ The AI Judge had a brain freeze (API Error). Try again later.');
            await thinkingMessage.edit({ embeds: [errEmbed] });
        }

    } catch (timeout) {
        // Disable button
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('excuse_write_solo')
                .setLabel('Write Excuse')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
        if (isSlash) {
            await initialData.editReply({ components: [disabledRow] }).catch(() => {});
        } else {
            await mainMessage.edit({ components: [disabledRow] }).catch(() => {});
        }
        
        const timeoutEmbed = new EmbedBuilder()
            .setColor(0x34495e)
            .setDescription('⏰ You stood there in silence for 90 seconds. The AI Judge finds you guilty by default.');
        await channel.send({ embeds: [timeoutEmbed] });
    }
}

async function runExcuseGameMultiplayer(initialData, channel, user, apiKey) {
    const isSlash = !!initialData.deferReply;

    const startEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎮 EXCUSE BY AI (MULTIPLAYER)')
        .setDescription(
            `**A new Multiplayer Excuse Game is starting!**\n\n` +
            `Rounds: **3**\n` +
            `Time per round: **90 seconds**\n` +
            `How to play: Click the button when a scenario is shown, type your excuse in the modal, and submit.\n` +
            `The AI Judge will grade each excuse individually. Bauble prizes are awarded at the end!`
        )
        .setFooter({ text: 'Starting round 1 in 5 seconds...' });

    if (isSlash) {
        await initialData.editReply({ embeds: [startEmbed] });
    } else {
        await channel.send({ embeds: [startEmbed] });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const scores = {}; 
    const playerPrizes = {};
    const userMap = new Map(); 

    for (let round = 1; round <= 3; round++) {
        let scenario;
        try {
            scenario = await generateAIScenario(apiKey);
        } catch (err) {
            console.error('Failed to generate scenario via AI in multiplayer round:', err);
            await channel.send('⚠️ The AI Judge had a brain freeze. Round failed!');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
        }

        const roundStartEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`🚨 ROUND ${round}/3: BUSTED!`)
            .setDescription(`**SCENARIO:**\n${scenario}\n\n*Click the button below to write and submit your excuse within 90 seconds!*`);

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('excuse_write_multi')
                .setLabel('Submit Excuse')
                .setStyle(ButtonStyle.Primary)
        );

        const roundMessage = await channel.send({ embeds: [roundStartEmbed], components: [btnRow] });

        const excuses = new Map(); 
        const collector = roundMessage.createMessageComponentCollector({
            filter: i => i.customId === 'excuse_write_multi' && !i.user.bot,
            time: 90000
        });

        collector.on('collect', async i => {
            if (excuses.has(i.user.id)) {
                await i.reply({ content: '❌ You already submitted an excuse for this round!', ephemeral: true });
                return;
            }

            const modalCustomId = `excuse_modal_multi_${i.user.id}_${Date.now()}`;
            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle('Submit Your Excuse')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('excuse_input')
                            .setLabel('Your Excuse')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Type your excuse here...')
                            .setMaxLength(300)
                            .setRequired(true)
                    )
                );

            await i.showModal(modal);

            try {
                const modalSubmit = await i.awaitModalSubmit({
                    filter: iModal => iModal.customId === modalCustomId,
                    time: 60000
                });

                if (excuses.has(i.user.id)) {
                    await modalSubmit.reply({ content: '❌ You already submitted an excuse!', ephemeral: true });
                    return;
                }

                const excuseText = modalSubmit.fields.getTextInputValue('excuse_input');
                excuses.set(i.user.id, {
                    userId: i.user.id,
                    username: i.user.username,
                    text: excuseText
                });
                userMap.set(i.user.id, i.user.username);

                await modalSubmit.reply({ content: '✅ Your excuse has been successfully registered!', ephemeral: true });
            } catch (err) {
                console.error('Modal submit error/timeout:', err);
            }
        });

        await new Promise(resolve => collector.on('end', resolve));

        // Disable button after round ends
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('excuse_write_multi')
                .setLabel('Round Closed')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
        await roundMessage.edit({ components: [disabledRow] }).catch(() => {});

        if (excuses.size === 0) {
            await channel.send(`⏰ No excuses were submitted in Round ${round}. Moving to the next round...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
        }

        const thinkingEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setDescription(`🧠 **The AI Judge is evaluating all excuses...**`);
        const thinkingMessage = await channel.send({ embeds: [thinkingEmbed] });

        const playersList = Array.from(excuses.values()).slice(0, 8); 

        let result;
        try {
            result = await evaluateMultiplayerExcuses(scenario, playersList, apiKey);
        } catch (apiError) {
            console.error('DeepSeek API Error in multiplayer:', apiError);
            const errEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setDescription('⚠️ The AI Judge had a brain freeze (API Error) and could not grade the excuses for this round.');
            await thinkingMessage.edit({ embeds: [errEmbed] });
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
        }

        const roundEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle(`⚖️ ROUND ${round} RESULTS`)
            .setDescription(`**Scenario:**\n${scenario}`);

        const resultsArray = Array.isArray(result.results) ? result.results : [];
        
        resultsArray.forEach(res => {
            const playerObj = excuses.get(res.userId);
            if (!playerObj) return;

            let metrics = res.metrics;
            if (!Array.isArray(metrics) || metrics.length === 0) {
                metrics = [
                    { name: 'Believability', score: 50 },
                    { name: 'Stupidity', score: 50 }
                ];
            }
            metrics = metrics.slice(0, 4);

            let successScore = res.successScore !== undefined ? Number(res.successScore) : null;
            if (successScore === null) {
                successScore = Math.round(metrics.reduce((sum, met) => sum + met.score, 0) / metrics.length);
            }
            scores[res.userId] = (scores[res.userId] || 0) + successScore;

            const roundPrize = successScore >= 40 ? Math.round(successScore * 2) : 0;
            playerPrizes[res.userId] = (playerPrizes[res.userId] || 0) + roundPrize;

            const shortExcuse = res.shortExcuse ? String(res.shortExcuse).trim() : playerObj.text.slice(0, 40) + (playerObj.text.length > 40 ? '...' : '');

            const metricsStr = metrics.map(m => `**${m.name}**: ${m.score}%`).join(' | ');
            const verdict = res.verdict || 'No verdict provided.';

            roundEmbed.addFields(
                { name: `👤 ${playerObj.username} — Success Rate: ${successScore}%`, value: `*"${shortExcuse}"*\n📊 ${metricsStr}\n💬 ${verdict}` }
            );
        });

        await thinkingMessage.edit({ embeds: [roundEmbed] });

        await new Promise(resolve => setTimeout(resolve, 10000));

        const leaderboardFields = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([userId, totalScore], index) => {
                const username = userMap.get(userId) || `<@${userId}>`;
                const medal = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
                return `${medal} **${username}**: ${totalScore} pts`;
            }).join('\n');

        const standingsEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`🏆 STANDINGS AFTER ROUND ${round}`)
            .setDescription(leaderboardFields || 'No scores yet.')
            .setFooter({ text: round < 3 ? 'Preparing next round...' : 'Game Over!' });

        await channel.send({ embeds: [standingsEmbed] });

        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    const sortedPlayers = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    if (sortedPlayers.length === 0) {
        await channel.send('🎮 **Game Over!** No excuses were submitted throughout the game.');
        return;
    }

    const globalMultiplier = await getGlobalMultiplier();
    const payoutDetails = [];
    for (let i = 0; i < sortedPlayers.length; i++) {
        const [userId, totalScore] = sortedPlayers[i];
        const isWinner = i === 0;
        
        const accumulatedPrize = playerPrizes[userId] || 0;
        const basePrize = (isWinner && accumulatedPrize > 0) ? accumulatedPrize + 500 : accumulatedPrize;
        const prize = Math.floor(basePrize * globalMultiplier);

        const username = userMap.get(userId) || `<@${userId}>`;
        
        if (prize > 0) {
            try {
                let userBaubles = await Bauble.findOne({ userId });
                if (!userBaubles) {
                    userBaubles = new Bauble({ userId, baubles: 0 });
                }
                userBaubles.baubles += prize;
                await userBaubles.save();
            } catch (dbErr) {
                console.error(`Failed to save baubles for user ${userId}:`, dbErr);
            }
            payoutDetails.push(`${isWinner ? '👑' : '👤'} **${username}**: +${prize} Baubles *(Economy: ${globalMultiplier}x)* (Total Score: ${totalScore})`);
        } else {
            payoutDetails.push(`${isWinner ? '👑' : '👤'} **${username}**: +0 Baubles (Guilty - Total Score: ${totalScore})`);
        }
    }

    const gameOverEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🏆 EXCUSE BY AI: GAME OVER!')
        .setDescription(`Here are the final standings and Bauble rewards:\n\n${payoutDetails.join('\n')}`)
        .setFooter({ text: 'Thanks for playing Excuse by AI!' });

    await channel.send({ embeds: [gameOverEmbed] });
}

function buildProgressBar(score) {
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    const filled = Math.round(safeScore / 10);
    const empty = 10 - filled;
    
    return '`' + '█'.repeat(filled) + '░'.repeat(empty) + ` ${safeScore}%\``;
}



async function generateAIScenario(apiKey) {
    const keywords = [
        "funeral vs theme park", "job interview calling interviewer darling", "cheating on exam", 
        "stealing office microwave", "stealing roommate leftovers", "unmuted zoom meeting trash talk", 
        "paying with monopoly money", "fake doctor note on vacation", "sleeping under boss desk", 
        "fake vegan eating cheeseburger", "sleeping with eyes painted on eyelids", "apology letter written by chatgpt", 
        "texting crush screenshot of themselves", "accidentally texting boss complaint about them", 
        "eating cake from mother-in-law fridge", "fake accent for free meals", "sliding down landlord banister"
    ];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];

    const prompt = `Generate a single, extremely short, highly unhinged, hilarious, and instantly understandable scenario (maximum 12 words) of a person getting caught red-handed in a ridiculous, embarrassing situation where they MUST make a desperate excuse.
    
    CRITICAL REQUIREMENTS:
    - Make it wild, funny, and chaotic! (e.g. caught trying to ride a roommate's vacuum like a horse, caught doing a solo flash mob in the office kitchen, caught trying to smuggle a live goose into a library, caught trying to feed spaghetti to a printer, etc.)
    - The situation must require a clear, urgent excuse/defense.
    - Output ONLY the scenario itself in the second person ("You...").
    - Do NOT wrap in quotes, do NOT include markdown, and do NOT write introductory/explanatory text.
    - Incorporate the following theme/keyword: "${keyword}".`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.95,
            max_tokens: 100
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error during scenario generation: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Remove wrapping quotes if any
    content = content.replace(/^["']|["']$/g, '');
    
    // If it starts with "Here is...", clean it up
    if (content.toLowerCase().startsWith('here is') || content.toLowerCase().startsWith('here\'s')) {
        const colonIdx = content.indexOf(':');
        if (colonIdx !== -1) {
            content = content.slice(colonIdx + 1).trim();
        }
    }
    
    content = content.replace(/^["']|["']$/g, '');
    return content;
}

async function evaluateExcuse(scenario, excuse, apiKey) {
    const prompt = `You are a hilarious, highly critical, and somewhat unhinged AI judge. The user has been placed in the following embarrassing scenario:
"${scenario}"

They provided this excuse:
"${excuse}"

Evaluate their excuse. You MUST return your evaluation strictly as a valid JSON object matching exactly this structure (no markdown, no backticks, no other text):
{
  "successScore": <integer 0-100, representing how successful their excuse was at getting them out of trouble. Give a very low score (0-20) if the excuse is garbage, off-topic, or just a few lazy words>,
  "shortExcuse": "<A highly shortened, summarized version of the user's excuse, maximum 12 words>",
  "metrics": [
    { "name": "<A funny, relevant metric to judge this excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
    { "name": "<A funny, relevant metric to judge this excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
    { "name": "<A funny, relevant metric to judge this excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
    { "name": "<A funny, relevant metric to judge this excuse/scenario, 1-3 words max>", "score": <integer 0-100> }
  ],
  "verdict": "<A funny, roasting 1-2 sentence verdict>"
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 350
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Strip markdown if present
    if (content.startsWith('```json')) {
        content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to extract only the JSON object
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(content);
}

async function evaluateMultiplayerExcuses(scenario, playersList, apiKey) {
    const playerExcuses = playersList.map(p => ({ userId: p.userId, username: p.username, excuse: p.text }));
    const prompt = `You are a hilarious, highly critical, and somewhat unhinged AI judge. The players have been placed in the following embarrassing scenario:
"${scenario}"

Here are the excuses submitted by the players:
${JSON.stringify(playerExcuses, null, 2)}

Evaluate each player's excuse individually. You MUST return your evaluation strictly as a valid JSON object matching exactly this structure (no markdown, no backticks, no other text):
{
  "results": [
    {
      "userId": "<exact userId of the player>",
      "successScore": <integer 0-100, representing how successful their excuse was at getting them out of trouble. Give a very low score (0-20) if the excuse is garbage, off-topic, or just a few lazy words>,
      "shortExcuse": "<A highly shortened, summarized version of this player's excuse, maximum 12 words>",
      "metrics": [
        { "name": "<A funny, custom metric relevant to their specific excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
        { "name": "<A funny, custom metric relevant to their specific excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
        { "name": "<A funny, custom metric relevant to their specific excuse/scenario, 1-3 words max>", "score": <integer 0-100> },
        { "name": "<A funny, custom metric relevant to their specific excuse/scenario, 1-3 words max>", "score": <integer 0-100> }
      ],
      "verdict": "<A hilarious, roasting 1-2 sentence verdict tailored to this specific player>"
    }
  ]
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Strip markdown if present
    if (content.startsWith('```json')) {
        content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to extract only the JSON object
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(content);
}


