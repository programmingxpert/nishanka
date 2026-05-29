const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const WORDS = [
    'javascript', 'moderation', 'giveaway', 'economy', 'discord', 
    'developer', 'community', 'antigravity', 'adventure', 'championship', 
    'programming', 'database', 'keyboard', 'beautiful', 'universe',
    'algorithm', 'technology', 'network', 'cybersecurity', 'blockchain',
    'encryption', 'processor', 'server', 'application', 'hardware',
    'software', 'compiler', 'variable', 'function', 'coefficient',
    'dashboard', 'automation', 'astronomy', 'chocolate', 'dinosaur',
    'matrix', 'sanctuary', 'glimmering', 'baubles', 'spacetime',
    'galaxy', 'telescope', 'constellation', 'astronaut', 'nebula',
    'supernova', 'meteorite', 'eclipse', 'gravity', 'satellite',
    'volcano', 'avalanche', 'hurricane', 'earthquake', 'tsunami',
    'lightning', 'thunderstorm', 'monsoon', 'blizzard', 'tornado',
    'wilderness', 'rainforest', 'waterfall', 'canyon', 'mountain',
    'glacier', 'archipelago', 'peninsula', 'oasis', 'savannah',
    'adventure', 'expedition', 'odyssey', 'journey', 'voyage',
    'quest', 'safari', 'pilgrimage', 'excursion', 'crusade',
    'symphony', 'orchestra', 'melody', 'harmony', 'rhythm',
    'serenade', 'crescendo', 'concert', 'festival', 'carnival',
    'labyrinth', 'mystery', 'enigma', 'puzzle', 'riddle',
    'paradox', 'conundrum', 'illusion', 'mirage', 'phantom'
];

const activeGames = new Set();
const recentWords = [];

async function generateAIScrambleWords(apiKey, totalRounds) {
    const avoidList = recentWords.length > 0 ? recentWords.join(', ') : 'none';
    const prompt = `Generate a list of ${totalRounds} unique, interesting, and single-word English nouns, verbs, or adjectives (no spaces, no punctuation, no special characters, between 5 and 12 characters long) suitable for a word scramble game. The words should be recognizable but fun to solve.
CRITICAL: Do NOT generate any of the following recently used words: [${avoidList}].
Avoid cliché words like 'dinosaur', 'keyboard', 'universe', 'technology', 'chocolate', 'computer', 'science'. Focus on variety and interesting, recognizable vocabulary.
Return the result strictly as a valid JSON array of strings, e.g.:
["backpack", "wilderness", "microscope", "symphony", "explorer"]
Do not wrap the JSON in markdown code blocks or any other formatting, and do not provide any extra text.`;

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
            max_tokens: 150
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

    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        content = content.slice(firstBracket, lastBracket + 1);
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
        throw new Error('Response is not a JSON array');
    }
    // Clean and validate words
    const cleanWords = parsed.map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{5,12}$/.test(w));
    if (cleanWords.length < totalRounds) {
        throw new Error('Not enough valid words returned by AI');
    }

    // Add to recent words to prevent repetition
    cleanWords.forEach(w => {
        if (!recentWords.includes(w)) {
            recentWords.push(w);
        }
    });
    if (recentWords.length > 150) {
        recentWords.splice(0, recentWords.length - 150);
    }

    return cleanWords;
}

async function getScrambleWords(totalRounds) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
        try {
            const aiWords = await generateAIScrambleWords(apiKey, totalRounds);
            if (aiWords && aiWords.length >= totalRounds) {
                console.log(`Generated ${aiWords.length} scramble words using DeepSeek API:`, aiWords);
                return aiWords.slice(0, totalRounds);
            }
        } catch (err) {
            console.error('Failed to generate scramble words via DeepSeek API, falling back to hardcoded words:', err);
        }
    }
    
    // Fallback: choose random unique words from WORDS
    const availableFallback = WORDS.filter(w => !recentWords.includes(w));
    const pool = availableFallback.length >= totalRounds ? availableFallback : WORDS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, totalRounds);

    // Track fallback words as recently used too
    selected.forEach(w => {
        if (!recentWords.includes(w)) {
            recentWords.push(w);
        }
    });
    if (recentWords.length > 150) {
        recentWords.splice(0, recentWords.length - 150);
    }
    
    return selected;
}

function scrambleWord(word) {
    let scrambled = word;
    while (scrambled === word) {
        scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    }
    return scrambled;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runScrambleGame(initialMessageOrInteraction, channel) {
    const totalRounds = 5;
    const scores = new Map(); // userId -> { name: string, points: number }
    
    const startEmbed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('🏁 SCRAMBLED WORD RACE: STARTED!')
        .setDescription(`Get ready! There will be **${totalRounds}** rounds.\nUnscramble the words faster than your opponents to earn points!\n\nThe first round starts in 5 seconds...`);
        
    if (initialMessageOrInteraction.reply) {
        await initialMessageOrInteraction.reply({ embeds: [startEmbed] });
    }

    const gameWordsPromise = getScrambleWords(totalRounds);

    for (let round = 1; round <= totalRounds; round++) {
        if (round === 1) {
            const startTime = Date.now();
            const gameWords = await gameWordsPromise;
            const elapsed = Date.now() - startTime;
            const remainingDelay = Math.max(0, 5000 - elapsed);
            await delay(remainingDelay);
        } else {
            await delay(5000);
        }
        
        const gameWords = await gameWordsPromise;
        const word = gameWords[round - 1];
        const scrambled = scrambleWord(word);
        
        const roundEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🔄 Round ${round}/${totalRounds}`)
            .setDescription(`Unscramble this word:\n\n# **\`${scrambled.toUpperCase()}\`**\n\n*First to type it correctly wins the round! (30 seconds)*`);
            
        await channel.send({ embeds: [roundEmbed] });
        
        const filter = m => {
            if (m.author.bot) return false;
            return m.content.trim().toLowerCase() === word.toLowerCase();
        };

        try {
            const collected = await channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const winner = collected.first();
            
            const uId = winner.author.id;
            if (!scores.has(uId)) {
                scores.set(uId, { name: winner.author.username, points: 0 });
            }
            scores.get(uId).points += 1;
            
            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription(`🎉 **${winner.author.username}** unscrambled the word **\`${word.toUpperCase()}\`** first! (+1 point)`);
            await channel.send({ embeds: [winEmbed] });
            
        } catch (err) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setDescription(`⏰ Time's up! The word was **\`${word.toUpperCase()}\`**.`);
            await channel.send({ embeds: [timeoutEmbed] });
        }
        
        // Between rounds scoreboard
        if (round < totalRounds) {
            if (scores.size > 0) {
                const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1].points - a[1].points);
                let boardText = sortedScores.map((s, idx) => `**${idx + 1}.** ${s[1].name} — ${s[1].points} pts`).join('\n');
                
                const boardEmbed = new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setTitle('📊 Current Standings')
                    .setDescription(boardText)
                    .setFooter({ text: 'Next round starting soon...' });
                await channel.send({ embeds: [boardEmbed] });
            } else {
                await channel.send({ content: '*Next round starting in 5 seconds...*' });
            }
        }
    }
    
    activeGames.delete(channel.id);
    
    if (scores.size === 0) {
        return channel.send({ content: '🏁 The game has ended! Nobody scored any points.' });
    }
    
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1].points - a[1].points);
    let finalText = '';
    
    const { getGlobalMultiplier } = require('../../utils/economyEngine');
    const globalMultiplier = await getGlobalMultiplier();

    for (const [idx, [uId, data]] of sortedScores.entries()) {
        const reward = Math.floor(data.points * 500 * globalMultiplier);
        finalText += `**${idx + 1}.** ${data.name} — ${data.points} pts (+**${reward.toLocaleString()}** Baubles) *(Economy Multiplier: ${globalMultiplier}x)*\n`;
        
        try {
            let baubleData = await Bauble.findOne({ userId: uId });
            if (!baubleData) {
                baubleData = new Bauble({ userId: uId, baubles: 0 });
            }
            baubleData.baubles += reward;
            baubleData.dailyGameLastCompleted = new Date();
            await baubleData.save();
        } catch(e) {
            console.error('Error saving baubles for scramble winner:', e);
        }
    }
    
    const finalEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 SCRAMBLED WORD RACE: FINAL RESULTS')
        .setDescription(finalText);
    await channel.send({ embeds: [finalEmbed] });
}

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('scramble')
        .setDescription('Play a 5-round Scrambled Word Race and win Baubles!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ A Scrambled Word Race is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        runScrambleGame(interaction, interaction.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ A Scrambled Word Race is already running in this channel!');
        }

        activeGames.add(channelId);
        runScrambleGame(message, message.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    }
};
