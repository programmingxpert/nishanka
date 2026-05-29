/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const QUESTIONS = [
    { emojis: '🦁👑', answers: ['the lion king', 'lion king'], category: 'Movie' },
    { emojis: '🕸️👨', answers: ['spider man', 'spiderman', 'spider-man'], category: 'Movie/Hero' },
    { emojis: '❄️☃️🏰', answers: ['frozen'], category: 'Movie' },
    { emojis: '🦇👨', answers: ['batman', 'bat man'], category: 'Movie/Hero' },
    { emojis: '🤡🎈', answers: ['it'], category: 'Movie' },
    { emojis: '🚀🌌⚔️', answers: ['star wars'], category: 'Movie Franchise' },
    { emojis: '🚢🧊🥶', answers: ['titanic'], category: 'Movie' },
    { emojis: '🦖🏝️🦕', answers: ['jurassic park'], category: 'Movie' },
    { emojis: '⚡👓🧹', answers: ['harry potter'], category: 'Movie/Book Franchise' },
    { emojis: '🐜👨', answers: ['ant man', 'antman', 'ant-man'], category: 'Movie/Hero' },
    { emojis: '🍫🏭🧔', answers: ['charlie and the chocolate factory', 'willy wonka'], category: 'Movie' },
    { emojis: '🐢🥋🐀', answers: ['teenage mutant ninja turtles', 'tmnt'], category: 'Movie/Show' },
    { emojis: '👽📞👉👈🏠', answers: ['et', 'e.t.', 'e.t. the extra-terrestrial'], category: 'Movie' },
    { emojis: '🧸🤠🤠', answers: ['toy story'], category: 'Movie' },
    { emojis: '🏠🎈🎈', answers: ['up'], category: 'Movie' },
    { emojis: '👑 Kong', answers: ['king kong'], category: 'Movie' },
    { emojis: '👻🚫🔫', answers: ['ghostbusters', 'ghost busters'], category: 'Movie' },
    { emojis: '👹👹👹🏢', answers: ['monsters inc', 'monsters inc.', 'monsters incorporated'], category: 'Movie' },
    { emojis: '🦈🌊🏊', answers: ['jaws'], category: 'Movie' },
    { emojis: '🐼🥋👊', answers: ['kung fu panda', 'kungfu panda'], category: 'Movie' }
];

const activeGames = new Set();
const recentAIQuestions = [];

async function generateAIEmojiQuestion(apiKey) {
    const avoidList = recentAIQuestions.length > 0 ? recentAIQuestions.join(', ') : 'none';
    const prompt = `Generate a single emoji decode trivia question. The user will be shown a set of emojis and must guess the title or name of the thing represented.
Return the result strictly as a valid JSON object matching exactly this structure (no markdown, no backticks, no other text):
{
  "emojis": "<a string of 1-5 emojis representing a famous movie, video game, book, pop culture franchise, song, or concept>",
  "answers": [
    "<the primary correct answer in lowercase, e.g., 'the lion king'>",
    "<alternative acceptable answers/spellings in lowercase, e.g., 'lion king' (optional)>"
  ],
  "category": "<the category, e.g., Movie, Video Game, Song, Book, Pop Culture, etc.>"
}
Ensure the question is fun, guessable, and uses common emojis. Ensure all entries in the "answers" array are in lowercase.
CRITICAL: Do NOT generate a question for any of the following recently used topics/answers: [${avoidList}].
Choose a completely different, interesting, and recognizable title or concept. Be creative! Avoid cliché trivia answers (like harry potter, titanic, star wars, frozen, spiderman, minecraft) unless they are not recently used.`;

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
            temperature: 1.0,
            max_tokens: 200
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

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(content);
    if (!parsed.emojis || !Array.isArray(parsed.answers) || parsed.answers.length === 0 || !parsed.category) {
        throw new Error('Invalid JSON structure returned by DeepSeek');
    }
    
    // Clean data
    parsed.answers = parsed.answers.map(a => a.trim().toLowerCase());

    // Track recently used answers to prevent repetition
    const primaryAnswer = parsed.answers[0];
    if (!recentAIQuestions.includes(primaryAnswer)) {
        recentAIQuestions.push(primaryAnswer);
        if (recentAIQuestions.length > 50) {
            recentAIQuestions.shift();
        }
    }

    return parsed;
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('emojidecode')
        .setDescription('Decode the emojis to guess the title and win Baubles!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ An Emoji Decode game is already running in this channel!', ephemeral: true });
        }

        await interaction.deferReply();
        activeGames.add(channelId);

        let question;
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
            try {
                question = await generateAIEmojiQuestion(apiKey);
                console.log('Generated emoji question using DeepSeek API:', question);
            } catch (err) {
                console.error('Failed to generate emoji question via DeepSeek API, falling back to hardcoded question:', err);
            }
        }

        if (!question) {
            question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        }

        const reward = Math.floor(Math.random() * 76) + 25; // 25-100 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🧩 EMOJI DECODE')
            .setDescription(`Decode the emojis below to guess the title!\n\n# **${question.emojis}**\n\n**Category:** ${question.category}\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type your answer in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            const guess = m.content.trim().toLowerCase();
            return question.answers.includes(guess);
        };

        const collector = interaction.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                baubleData.dailyGameLastCompleted = new Date();
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT ANSWER!')
                    .setDescription(`Congratulations to **${m.author.username}** for decoding the emojis!\n\n• **Emojis:** ${question.emojis}\n• **Answer:** **${question.answers[0].toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to decode the emojis in time!\n\n• **Emojis:** ${question.emojis}\n• **Answer was:** **${question.answers[0].toUpperCase()}**`)
                    .setTimestamp();

                await interaction.followUp({ embeds: [timeoutEmbed] });
            }
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ An Emoji Decode game is already running in this channel!');
        }

        activeGames.add(channelId);
        message.channel.sendTyping().catch(() => {});

        let question;
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
            try {
                question = await generateAIEmojiQuestion(apiKey);
                console.log('Generated emoji question using DeepSeek API:', question);
            } catch (err) {
                console.error('Failed to generate emoji question via DeepSeek API, falling back to hardcoded question:', err);
            }
        }

        if (!question) {
            question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        }

        const reward = Math.floor(Math.random() * 76) + 25; // 25-100 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🧩 EMOJI DECODE')
            .setDescription(`Decode the emojis below to guess the title!\n\n# **${question.emojis}**\n\n**Category:** ${question.category}\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type your answer in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await message.reply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            const guess = m.content.trim().toLowerCase();
            return question.answers.includes(guess);
        };

        const collector = message.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                baubleData.dailyGameLastCompleted = new Date();
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT ANSWER!')
                    .setDescription(`Congratulations to **${m.author.username}** for decoding the emojis!\n\n• **Emojis:** ${question.emojis}\n• **Answer:** **${question.answers[0].toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to decode the emojis in time!\n\n• **Emojis:** ${question.emojis}\n• **Answer was:** **${question.answers[0].toUpperCase()}**`)
                    .setTimestamp();

                await message.reply({ embeds: [timeoutEmbed] });
            }
        });
    }
};
