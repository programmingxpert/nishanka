const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const FALLBACK_SCENARIOS = [
    "Your boss caught you sleeping under your desk during a major client presentation.",
    "You accidentally texted your boss a complaint about them.",
    "You got caught practicing wedding vows with a mop by your crush.",
    "Your roommate caught you eating their leftover pizza at 4:00 AM.",
    "You accidentally unmuted your mic while complaining about a boring meeting.",
    "Your crush walked in on you singing opera in a public restroom stall.",
    "You got caught trying to pay for groceries with Monopoly money.",
    "Your mother-in-law caught you hiding under the kitchen table with a box of donuts.",
    "You accidentally liked a 7-year-old Instagram photo of your ex at 3:00 AM.",
    "You told everyone you were sick, but got caught on a rollercoaster on your boss's Instagram.",
    "Your teacher caught you using ChatGPT to write your personal diary entries.",
    "You got caught waving back at someone who was waving to the person behind you.",
    "Your landlord caught you trying to teach your cat how to do taxes.",
    "You got caught smuggling a whole watermelon under your shirt into a movie theater.",
    "Your doctor caught you eating a giant bag of potato chips in the waiting room.",
    "You accidentally called your teacher 'Mom' in front of the whole class.",
    "Your trainer caught you eating a donut on the treadmill.",
    "You got caught trying on a mannequin's clothes at a department store.",
    "You accidentally sent a text badmouthing your best friend to that exact friend.",
    "Your roommate caught you drinking milk directly from the carton and putting it back empty.",
    "You got caught doing a dramatic anime fight in the mirror by your boss.",
    "You accidentally shared your screen showing a recipe for 'how to make potato cannons'.",
    "Your boss caught you looking at flights to Hawaii during a performance review.",
    "You got caught taking a nap on a display bed in IKEA.",
    "Your partner caught you buying a replica sword instead of paying rent.",
    "You got caught walking out of the communal office kitchen with the microwave.",
    "You accidentally texted your crush a screenshot of their own profile.",
    "Your teacher caught you sleeping with your eyes drawn on your eyelids.",
    "You got caught sniffing scented candles for 20 minutes in a quiet store.",
    "You got caught trying to high-five a person who was just hailing a cab.",
    "Your dentist caught you eating gummy bears in the waiting room.",
    "You accidentally liked a TikTok of your boss doing a dance trend.",
    "Your mom caught you pretending to be in a music video in the rain.",
    "You got caught trying to sneak into a kids' bouncy castle.",
    "Your landlord caught you trying to slide down the banister.",
    "You got caught using a fake accent to get free food.",
    "Your roommate caught you hiding their keys so they wouldn't leave.",
    "You got caught trying to pet a raccoon behind the restaurant.",
    "Your boss caught you playing games on your phone during a one-on-one meeting.",
    "You accidentally walked into the wrong house thinking it was yours."
];

module.exports = {
    category: 'fun',
    cooldown: 15,
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
        console.error('Failed to generate scenario via AI, using fallback:', err);
        scenario = generateFallbackScenario();
    }

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🚨 BUSTED! EXCUSE BY AI (SOLO)')
        .setDescription(`**SCENARIO:**\n${scenario}\n\n*You have 90 seconds to type your excuse in this channel. Make it good!*`)
        .setFooter({ text: 'The AI Judge is waiting...', iconURL: user.displayAvatarURL({ dynamic: true }) });

    if (isSlash) {
        await initialData.editReply({ embeds: [embed] });
    } else {
        await channel.send({ embeds: [embed] });
    }

    const filter = m => m.author.id === user.id && !m.author.bot;
    
    try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 90000, errors: ['time'] });
        const excuseMsg = collected.first();
        const excuseText = excuseMsg.content;

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

            const fields = [
                { name: 'Your Excuse', value: `*"${excuseText}"*` }
            ];

            metrics.forEach((m, idx) => {
                const mName = m.name ? String(m.name).trim() : `Metric ${idx + 1}`;
                fields.push({ name: mName, value: buildProgressBar(m.score), inline: true });
                if (idx === 1 || idx === 3) {
                    fields.push({ name: '\u200B', value: '\u200B', inline: true });
                }
            });

            fields.push({ name: 'Verdict', value: result.verdict || 'No verdict provided.' });

            // Reward some baubles even for solo excuse play! E.g. average score * 1 baubles
            const avgScore = Math.round(metrics.reduce((sum, met) => sum + met.score, 0) / metrics.length);
            const prize = Math.round(avgScore * 1);
            let prizeMsg = '';
            if (prize > 0) {
                try {
                    let userBaubles = await Bauble.findOne({ userId: user.id });
                    if (!userBaubles) {
                        userBaubles = new Bauble({ userId: user.id, baubles: 0 });
                    }
                    userBaubles.baubles += prize;
                    await userBaubles.save();
                    prizeMsg = `\n\n🪙 You earned **${prize}** Baubles!`;
                } catch (dbErr) {
                    console.error('Failed to save baubles for solo player:', dbErr);
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('⚖️ THE AI HAS SPOKEN')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(fields)
                .setDescription(prizeMsg || null)
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
            `How to play: Type your best excuse in the channel when a scenario is shown.\n` +
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
    const userMap = new Map(); 

    for (let round = 1; round <= 3; round++) {
        let scenario;
        try {
            scenario = await generateAIScenario(apiKey);
        } catch (err) {
            console.error('Failed to generate scenario via AI, using fallback:', err);
            scenario = generateFallbackScenario();
        }

        const roundStartEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`🚨 ROUND ${round}/3: BUSTED!`)
            .setDescription(`**SCENARIO:**\n${scenario}\n\n*Everyone has 90 seconds to type their excuse in this channel!*`)
            .setFooter({ text: 'Reacting 📝 confirms your excuse.' });

        await channel.send({ embeds: [roundStartEmbed] });

        const excuses = new Map(); 
        const filter = m => !m.author.bot;
        const collector = channel.createMessageCollector({ filter, time: 90000 });

        collector.on('collect', m => {
            if (excuses.has(m.author.id)) {
                m.react('❌').catch(() => {});
            } else {
                excuses.set(m.author.id, {
                    userId: m.author.id,
                    username: m.author.username,
                    text: m.content
                });
                userMap.set(m.author.id, m.author.username);
                m.react('📝').catch(() => {});
            }
        });

        await new Promise(resolve => collector.on('end', resolve));

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
            result = getFallbackMultiplayerEvaluation(playersList);
            await channel.send('⚠️ The AI Judge had a brain freeze, so a backup judge stepped in!');
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

            const avgScore = Math.round(metrics.reduce((sum, met) => sum + met.score, 0) / metrics.length);
            scores[res.userId] = (scores[res.userId] || 0) + avgScore;

            const metricsStr = metrics.map(m => `**${m.name}**: ${m.score}%`).join(' | ');
            const verdict = res.verdict || 'No verdict provided.';

            roundEmbed.addFields(
                { name: `👤 ${playerObj.username} — Score: ${avgScore}/100`, value: `*"${playerObj.text}"*\n📊 ${metricsStr}\n💬 ${verdict}` }
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

    const payoutDetails = [];
    for (let i = 0; i < sortedPlayers.length; i++) {
        const [userId, totalScore] = sortedPlayers[i];
        const isWinner = i === 0;
        const prize = isWinner ? 500 + totalScore * 2 : totalScore * 2;

        try {
            let userBaubles = await Bauble.findOne({ userId });
            if (!userBaubles) {
                userBaubles = new Bauble({ userId, baubles: 0 });
            }
            userBaubles.baubles += prize;
            await userBaubles.save();

            const username = userMap.get(userId) || `<@${userId}>`;
            payoutDetails.push(`${isWinner ? '👑' : '👤'} **${username}**: +${prize} Baubles (Total Score: ${totalScore})`);
        } catch (dbErr) {
            console.error(`Failed to save baubles for user ${userId}:`, dbErr);
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

function generateFallbackScenario() {
    return FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)];
}

async function generateAIScenario(apiKey) {
    const prompt = `Generate a single, extremely short, hilarious, and instantly understandable scenario (maximum 12 words) of a person getting caught in a funny, embarrassing situation.
Make it simple, punchy, and highly relatable to daily life.
Ensure the scenario makes absolute sense logically (e.g. do not say "double-tapping your own post" or other nonsensical combinations).
Do NOT write complex stories or paragraph scripts.
Do NOT use the exact template "You told everyone X, but got caught Y" repeatedly. Vary the scenario format (e.g., "Your crush caught you...", "You accidentally unmuted while...", "You got caught...").
Output ONLY the scenario itself, with no quotation marks, no introductory text, no markdown, and no explanation.`;

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
            temperature: 0.9,
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

function getFallbackMultiplayerEvaluation(playersList) {
    const genericVerdicts = [
        "Honestly, a toddler could make up a better story.",
        "The audacity to say this is almost respectable, but you are still guilty.",
        "A classic excuse, but the delivery lacked conviction.",
        "It is so stupid that it might actually work. Almost.",
        "Nice try, but you're not fooling anyone today."
    ];
    return {
        results: playersList.map(p => ({
            userId: p.userId,
            metrics: [
                { name: "Believability", score: Math.floor(Math.random() * 50) + 30 },
                { name: "Confidence", score: Math.floor(Math.random() * 50) + 40 },
                { name: "Manipulation", score: Math.floor(Math.random() * 50) + 20 },
                { name: "Stupidity", score: Math.floor(Math.random() * 50) + 50 }
            ],
            verdict: genericVerdicts[Math.floor(Math.random() * genericVerdicts.length)]
        }))
    };
}
