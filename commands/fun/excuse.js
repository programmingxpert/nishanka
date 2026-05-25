const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SCENARIOS = [
    "You got caught cheating on your math final by the strictest teacher in the state.",
    "You were supposed to be at a funeral, but your boss saw you on a rollercoaster at a theme park.",
    "Your partner found a receipt for a $5,000 diamond ring, but their birthday passed and they got nothing.",
    "You accidentally sent a text complaining about your best friend... TO your best friend.",
    "You were caught sneaking out of the office with the communal microwave in your arms.",
    "Your mom walked into your room while you were dramatically practicing an argument in the mirror.",
    "You accidentally liked your ex's photo from 6 years ago at 3:00 AM.",
    "You called in sick, but you just posted a highly produced TikTok of yourself doing a dance trend.",
    "You got pulled over for going 110 mph in a school zone.",
    "The fire alarm went off, and you were the only one holding a lighter and a melted marshmallow.",
    "Your roommate's expensive leftovers are gone, and you have pasta sauce all over your shirt.",
    "You told everyone you were a strict vegan, but you were just caught devouring a triple bacon cheeseburger.",
    "You tried to forge your parents' signature on a bad report card, but you misspelled your own last name.",
    "You told the interviewer you were fluent in French, and they immediately started speaking French to you.",
    "You fell asleep during a crucial zoom meeting and started loudly snoring while unmuted."
];

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
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        const msg = '⚠️ The bot owner hasn\'t configured the `DEEPSEEK_API_KEY` in the `.env` file! AI features are disabled.';
        if (initialData.reply) {
            return initialData.reply({ content: msg, ephemeral: true });
        } else {
            return channel.send(msg);
        }
    }

    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🚨 BUSTED! EXCUSE BY AI')
        .setDescription(`**SCENARIO:**\n${scenario}\n\n*You have 60 seconds to type your excuse in this channel. Make it good!*`)
        .setFooter({ text: 'The AI Judge is waiting...', iconURL: user.displayAvatarURL({ dynamic: true }) });

    if (initialData.reply) {
        await initialData.reply({ embeds: [embed] });
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
            
            const resultEmbed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('⚖️ THE AI HAS SPOKEN')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Your Excuse', value: `*"${excuseText}"*` },
                    { name: 'Believability', value: buildProgressBar(result.believability), inline: true },
                    { name: 'Confidence', value: buildProgressBar(result.confidence), inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Manipulation', value: buildProgressBar(result.manipulation), inline: true },
                    { name: 'Stupidity', value: buildProgressBar(result.stupidity), inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Verdict', value: result.verdict }
                )
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
    
    return '\`' + '█'.repeat(filled) + '░'.repeat(empty) + ` ${safeScore}%\``;
}

async function evaluateExcuse(scenario, excuse, apiKey) {
    const prompt = `You are a hilarious, highly critical, and somewhat unhinged AI judge. The user has been placed in the following embarrassing scenario:
"${scenario}"

They provided this excuse:
"${excuse}"

Evaluate their excuse. You MUST return your evaluation strictly as a valid JSON object matching exactly this structure (no markdown, no backticks, no other text):
{
  "believability": <integer 0-100>,
  "confidence": <integer 0-100>,
  "manipulation": <integer 0-100>,
  "stupidity": <integer 0-100>,
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
            max_tokens: 300
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Try to strip markdown if the AI stubbornly adds it
    if (content.startsWith('\`\`\`json')) {
        content = content.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    } else if (content.startsWith('\`\`\`')) {
        content = content.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
    }

    return JSON.parse(content);
}
