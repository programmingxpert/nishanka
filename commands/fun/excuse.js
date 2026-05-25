const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('excuse')
        .setDescription('You are caught in a sticky situation. Give your best excuse and let the AI judge you!'),

    async execute(interaction) {
        await runExcuseGame(interaction, interaction.channel, interaction.user);
    },

    async executePrefix(message, args) {
        await runExcuseGame(message, message.channel, message.author);
    }
};

async function runExcuseGame(initialData, channel, user) {
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
        .setTitle('🚨 BUSTED! EXCUSE BY AI')
        .setDescription(`**SCENARIO:**\n${scenario}\n\n*You have 60 seconds to type your excuse in this channel. Make it good!*`)
        .setFooter({ text: 'The AI Judge is waiting...', iconURL: user.displayAvatarURL({ dynamic: true }) });

    if (isSlash) {
        await initialData.editReply({ embeds: [embed] });
    } else {
        await channel.send({ embeds: [embed] });
    }

    const filter = m => m.author.id === user.id && !m.author.bot;
    
    try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
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

            // Limit to exactly 4 metrics
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

            const resultEmbed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('⚖️ THE AI HAS SPOKEN')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(fields)
                .setFooter({ text: 'Excuse by AI (Powered by DeepSeek)' });

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
            .setDescription('⏰ You stood there in silence for 60 seconds. The AI Judge finds you guilty by default.');
        await channel.send({ embeds: [timeoutEmbed] });
    }
}

function buildProgressBar(score) {
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    const filled = Math.round(safeScore / 10);
    const empty = 10 - filled;
    
    return '`' + '█'.repeat(filled) + '░'.repeat(empty) + ` ${safeScore}%\``;
}

function generateFallbackScenario() {
    const subjects = [
        "Your boss", "Your teacher", "Your partner", "Your mother", "A police officer", 
        "The job interviewer", "Your roommate", "A security guard", "Your dentist", "A TSA agent",
        "Your principal", "The head chef", "A gym trainer", "Your doctor", "Your landlord"
    ];
    const actions = [
        "caught you trying to forge their signature",
        "spotted you eating raw cookie dough directly from the tub",
        "walked in on you doing a highly dramatic TikTok dance",
        "found a hidden box of expensive chocolate wrappers",
        "caught you taking a nap under your desk",
        "saw you driving a lawnmower on the highway",
        "heard you loudly snoring while unmuted",
        "spotted you wearing a complete clown suit",
        "caught you sneaking a communal microwave out of the office",
        "found you talking to your reflection in a public restroom mirror",
        "saw you trying to pay for coffee using Monopoly money",
        "caught you wearing their clothes backwards",
        "saw you searching 'how to build a potato cannon' during a meeting"
    ];
    const details = [
        "during a crucial performance review.",
        "at 3:00 AM in the kitchen.",
        "while pretending to be extremely busy.",
        "and immediately demanded an explanation.",
        "with pasta sauce all over your face.",
        "while you were supposed to be on sick leave.",
        "in front of the entire executive board.",
        "and they are absolutely not amused.",
        "during a highly solemn ceremony.",
        "and they just stared at you in absolute silence."
    ];
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const a = actions[Math.floor(Math.random() * actions.length)];
    const d = details[Math.floor(Math.random() * details.length)];
    return `${s} ${a} ${d}`;
}

async function generateAIScenario(apiKey) {
    const prompt = `Generate a single, short (1-2 sentences), highly embarrassing and funny scenario where someone gets caught red-handed doing something they shouldn't.
Output ONLY the scenario text itself, with no introductory text, no quotes, and no formatting (no markdown). Just the raw sentence.`;

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
            max_tokens: 150
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
