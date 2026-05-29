const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const WORDS = [
    'javascript', 'moderation', 'giveaway', 'economy', 'discord', 
    'developer', 'community', 'antigravity', 'adventure', 'championship', 
    'programming', 'database', 'keyboard', 'beautiful', 'universe',
    'algorithm', 'technology', 'network', 'cybersecurity', 'blockchain'
];

const activeGames = new Set();

const HANGMAN_STAGES = [
`  +---+
  |   |
      |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
];

async function generateAIHangmanWords(apiKey, totalRounds) {
    const prompt = `Generate a list of ${totalRounds} unique, interesting, and single-word English nouns, verbs, or adjectives (no spaces, no punctuation, no special characters, between 5 and 10 characters long) suitable for a Hangman game. Return the result strictly as a valid JSON array of strings, e.g.:
["dinosaur", "keyboard", "universe", "chocolate", "technology"]
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
            temperature: 0.9,
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
    const cleanWords = parsed.map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{5,10}$/.test(w));
    if (cleanWords.length < totalRounds) {
        throw new Error('Not enough valid words returned by AI');
    }
    return cleanWords;
}

async function getHangmanWords(totalRounds) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
        try {
            const aiWords = await generateAIHangmanWords(apiKey, totalRounds);
            if (aiWords && aiWords.length >= totalRounds) {
                console.log(`Generated ${aiWords.length} hangman words using DeepSeek API:`, aiWords);
                return aiWords.slice(0, totalRounds);
            }
        } catch (err) {
            console.error('Failed to generate hangman words via DeepSeek API, falling back to hardcoded words:', err);
        }
    }
    
    // Fallback: choose random unique words from WORDS
    const fallbackWords = [...WORDS];
    fallbackWords.sort(() => Math.random() - 0.5);
    return fallbackWords.slice(0, totalRounds);
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runHangmanGame(initialContext, channel, hostId, joinedPlayers) {
    const totalRounds = 5;
    const scores = new Map(); // userId -> { name: string, points: number }
    
    joinedPlayers.forEach(p => {
        scores.set(p.id, { name: p.username, points: 0 });
    });

    const startEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('🏁 HANGMAN GAME: STARTED!')
        .setDescription(`There will be **${totalRounds}** rounds.\nGuess individual letters or guess the whole word to win the round.\nThe first round starts in 5 seconds...`);
        
    await channel.send({ embeds: [startEmbed] });

    const gameWordsPromise = getHangmanWords(totalRounds);

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
        
        let mistakes = 0;
        let guessedLetters = new Set();
        let guessedWords = new Set();
        let roundOver = false;
        
        const renderWord = () => {
            return word.split('').map(char => guessedLetters.has(char) ? char : '_').join(' ');
        };

        const renderEmbed = () => {
            return new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`🔄 Round ${round}/${totalRounds}`)
                .setDescription(`\`\`\`\n${HANGMAN_STAGES[mistakes]}\n\`\`\`\n**Word:** \`${renderWord().toUpperCase()}\`\n\n**Mistakes:** ${mistakes}/6\n**Guessed Letters:** ${Array.from(guessedLetters).sort().join(', ') || 'None'}`)
                .setFooter({ text: 'Type a letter to guess it, or type the whole word to solve!' });
        };

        const msg = await channel.send({ embeds: [renderEmbed()] });
        
        const filter = m => {
            if (m.author.bot) return false;
            if (joinedPlayers.size > 0 && !joinedPlayers.has(m.author.id)) return false; // Only joined players can play if it's a closed lobby
            return /^[a-z]+$/i.test(m.content.trim());
        };

        const collector = channel.createMessageCollector({ filter, time: 90000 });

        await new Promise((resolve) => {
            collector.on('collect', async m => {
                const guess = m.content.trim().toLowerCase();
                
                if (guess.length === 1) {
                    // Letter guess
                    if (guessedLetters.has(guess)) {
                        m.react('❌').catch(() => {});
                        return;
                    }
                    
                    guessedLetters.add(guess);
                    
                    if (word.includes(guess)) {
                        m.react('✅').catch(() => {});
                        // Check if all letters are revealed
                        const allRevealed = word.split('').every(char => guessedLetters.has(char));
                        if (allRevealed) {
                            roundOver = true;
                            collector.stop('won');
                            const uId = m.author.id;
                            if (!scores.has(uId)) scores.set(uId, { name: m.author.username, points: 0 });
                            scores.get(uId).points += 1;
                            
                            const winEmbed = new EmbedBuilder()
                                .setColor(0x2ecc71)
                                .setDescription(`🎉 **${m.author.username}** guessed the final letter! The word was **\`${word.toUpperCase()}\`**! (+1 point)`);
                            await channel.send({ embeds: [winEmbed] });
                            return;
                        }
                    } else {
                        m.react('❌').catch(() => {});
                        mistakes += 1;
                        if (mistakes >= 6) {
                            roundOver = true;
                            collector.stop('lost');
                            const lossEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setDescription(`💀 You've been HANGED! The word was **\`${word.toUpperCase()}\`**.`);
                            await channel.send({ embeds: [lossEmbed] });
                            return;
                        }
                    }
                } else {
                    // Word guess
                    if (guessedWords.has(guess)) {
                        m.react('❌').catch(() => {});
                        return;
                    }
                    guessedWords.add(guess);
                    
                    if (guess === word) {
                        roundOver = true;
                        collector.stop('won');
                        const uId = m.author.id;
                        if (!scores.has(uId)) scores.set(uId, { name: m.author.username, points: 0 });
                        scores.get(uId).points += 1;
                        
                        const winEmbed = new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setDescription(`🎉 **${m.author.username}** correctly guessed the word **\`${word.toUpperCase()}\`**! (+1 point)`);
                        await channel.send({ embeds: [winEmbed] });
                        return;
                    } else {
                        m.react('❌').catch(() => {});
                        mistakes += 1;
                        if (mistakes >= 6) {
                            roundOver = true;
                            collector.stop('lost');
                            const lossEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setDescription(`💀 Too many wrong guesses! The word was **\`${word.toUpperCase()}\`**.`);
                            await channel.send({ embeds: [lossEmbed] });
                            return;
                        }
                    }
                }
                
                // Update the embed if the game continues
                try {
                    await msg.edit({ embeds: [renderEmbed()] });
                } catch(e) {}
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && !roundOver) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setDescription(`⏰ Time's up! Nobody guessed the word. It was **\`${word.toUpperCase()}\`**.`);
                    await channel.send({ embeds: [timeoutEmbed] });
                }
                resolve();
            });
        });
        
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
    
    // Check if anyone scored
    const validScores = Array.from(scores.entries()).filter(s => s[1].points > 0);
    if (validScores.length === 0) {
        return channel.send({ content: '🏁 The game has ended! Nobody scored any points.' });
    }
    
    const sortedScores = validScores.sort((a, b) => b[1].points - a[1].points);
    let finalText = '';
    
    for (const [idx, [uId, data]] of sortedScores.entries()) {
        const reward = data.points * 500;
        finalText += `**${idx + 1}.** ${data.name} — ${data.points} pts (+**${reward.toLocaleString()}** Baubles)\n`;
        
        try {
            let baubleData = await Bauble.findOne({ userId: uId });
            if (!baubleData) {
                baubleData = new Bauble({ userId: uId, baubles: 0 });
            }
            baubleData.baubles += reward;
            baubleData.dailyGameLastCompleted = new Date();
            await baubleData.save();
        } catch(e) {
            console.error('Error saving baubles for hangman winner:', e);
        }
    }
    
    const finalEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 HANGMAN GAME: FINAL RESULTS')
        .setDescription(finalText);
    await channel.send({ embeds: [finalEmbed] });
}

async function createLobby(interactionOrMessage, channel) {
    const hostId = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    const hostName = interactionOrMessage.user ? interactionOrMessage.user.username : interactionOrMessage.author.username;
    
    const joinedPlayers = new Map();
    joinedPlayers.set(hostId, { id: hostId, username: hostName });

    const renderLobby = () => {
        const playerList = Array.from(joinedPlayers.values()).map(p => `• ${p.username}`).join('\n');
        return new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎮 Multiplayer Hangman Lobby')
            .setDescription(`**Host:** ${hostName}\n\n**Players Joined (${joinedPlayers.size}):**\n${playerList}\n\nClick **Join** to play! The host can click **Start** when everyone is ready.`);
    };

    const joinBtn = new ButtonBuilder()
        .setCustomId('hangman_join')
        .setLabel('Join')
        .setStyle(ButtonStyle.Success);

    const leaveBtn = new ButtonBuilder()
        .setCustomId('hangman_leave')
        .setLabel('Leave')
        .setStyle(ButtonStyle.Danger);

    const startBtn = new ButtonBuilder()
        .setCustomId('hangman_start')
        .setLabel('Start Game')
        .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, startBtn);

    let lobbyMsg;
    if (interactionOrMessage.reply) {
        lobbyMsg = await interactionOrMessage.reply({ embeds: [renderLobby()], components: [actionRow], fetchReply: true });
    } else {
        lobbyMsg = await channel.send({ embeds: [renderLobby()], components: [actionRow] });
    }

    const collector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
        if (i.customId === 'hangman_join') {
            if (!joinedPlayers.has(i.user.id)) {
                joinedPlayers.set(i.user.id, { id: i.user.id, username: i.user.username });
                await i.update({ embeds: [renderLobby()] });
            } else {
                await i.reply({ content: 'You are already in the lobby.', ephemeral: true });
            }
        } else if (i.customId === 'hangman_leave') {
            if (i.user.id === hostId) {
                await i.reply({ content: 'The host cannot leave the lobby. If you want to cancel, just wait for it to timeout.', ephemeral: true });
            } else if (joinedPlayers.has(i.user.id)) {
                joinedPlayers.delete(i.user.id);
                await i.update({ embeds: [renderLobby()] });
            } else {
                await i.reply({ content: 'You are not in the lobby.', ephemeral: true });
            }
        } else if (i.customId === 'hangman_start') {
            if (i.user.id !== hostId) {
                await i.reply({ content: 'Only the host can start the game!', ephemeral: true });
                return;
            }
            
            collector.stop('started');
        }
    });

    collector.on('end', async (collected, reason) => {
        // Disable buttons
        const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(joinBtn).setDisabled(true),
            ButtonBuilder.from(leaveBtn).setDisabled(true),
            ButtonBuilder.from(startBtn).setDisabled(true)
        );
        
        await lobbyMsg.edit({ components: [disabledRow] }).catch(() => {});

        if (reason === 'started') {
            runHangmanGame(interactionOrMessage, channel, hostId, joinedPlayers).catch(err => {
                console.error(err);
                activeGames.delete(channel.id);
            });
        } else {
            activeGames.delete(channel.id);
            channel.send('⏱️ Hangman lobby timed out. Not enough players or host didn\'t start.');
        }
    });
}

module.exports = {
    category: 'fun',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Start a multiplayer Hangman game!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ A game is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        createLobby(interaction, interaction.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ A game is already running in this channel!');
        }

        activeGames.add(channelId);
        createLobby(message, message.channel).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    }
};
