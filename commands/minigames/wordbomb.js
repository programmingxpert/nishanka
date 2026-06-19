/* eslint-disable */
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType 
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const activeGames = {
    has: (channelId) => {
        if (!global.client) return false;
        if (!global.client.activeMinigames) global.client.activeMinigames = new Set();
        return global.client.activeMinigames.has(channelId);
    },
    add: (channelId) => {
        if (!global.client) return;
        if (!global.client.activeMinigames) global.client.activeMinigames = new Set();
        global.client.activeMinigames.add(channelId);
    },
    delete: (channelId) => {
        if (!global.client) return;
        if (!global.client.activeMinigames) global.client.activeMinigames = new Set();
        global.client.activeMinigames.delete(channelId);
    }
};

async function fetchRandomWords() {
    const allWords = [];

    // Fetch all APIs in parallel (much faster than sequential)
    const results = await Promise.allSettled([
        // Random Word API
        (async () => {
            const res = await fetch('https://random-word-api.herokuapp.com/word?number=100');
            if (res.ok) {
                const words = await res.json();
                if (Array.isArray(words) && words.length > 0) {
                    return words.map(w => w.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w));
                }
            }
            return [];
        })(),

        // Datamuse API
        (async () => {
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const randChar = letters[Math.floor(Math.random() * letters.length)];
            const res = await fetch(`https://api.datamuse.com/words?sp=${randChar}*&max=100`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return data.map(item => item.word.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w));
                }
            }
            return [];
        })(),

        // Wikipedia API
        (async () => {
            const res = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=50&format=json&origin=*');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.query && data.query.random && Array.isArray(data.query.random)) {
                    for (const item of data.query.random) {
                        const title = item.title.trim().toLowerCase().replace(/\s+/g, '');
                        if (/^[a-z]{3,}$/.test(title)) words.push(title);
                    }
                }
                return words;
            }
            return [];
        })(),

        // Jikan API (Anime)
        (async () => {
            const res = await fetch('https://api.jikan.moe/v4/random/anime');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.data && data.data.title) {
                    const title = data.data.title.trim().toLowerCase().replace(/\s+/g, '');
                    if (/^[a-z]{3,}$/.test(title)) words.push(title);
                }
                return words;
            }
            return [];
        })(),

        // REST Countries API
        // Local Countries Data
        (() => {
            try {
                const data = require('../../utils/countries.json');
                const words = [];
                if (Array.isArray(data)) {
                    for (const country of data.slice(0, 50)) {
                        const name = country.name?.common?.trim().toLowerCase().replace(/\s+/g, '');
                        if (name && /^[a-z]{3,}$/.test(name)) words.push(name);
                    }
                }
                return words;
            } catch (err) {
                console.error('[WordBomb] Error reading local countries data:', err);
                return [];
            }
        })(),

        // RAWG Video Games API
        (async () => {
            const res = await fetch('https://api.rawg.io/api/games?page_size=50&ordering=-rating');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.results && Array.isArray(data.results)) {
                    for (const game of data.results) {
                        const name = game.name?.trim().toLowerCase().replace(/\s+/g, '');
                        if (name && /^[a-z]{3,}$/.test(name)) words.push(name);
                    }
                }
                return words;
            }
            return [];
        })(),

        // PokéAPI
        (async () => {
            const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.results && Array.isArray(data.results)) {
                    for (const pokemon of data.results) {
                        const name = pokemon.name?.trim().toLowerCase().replace(/\s+/g, '');
                        if (name && /^[a-z]{3,}$/.test(name)) words.push(name);
                    }
                }
                return words;
            }
            return [];
        })(),

        // Star Wars API
        (async () => {
            const randomId = Math.floor(Math.random() * 82) + 1;
            const res = await fetch(`https://swapi.dev/api/people/${randomId}/`);
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.name) {
                    const name = data.name.trim().toLowerCase().replace(/\s+/g, '');
                    if (/^[a-z]{3,}$/.test(name)) words.push(name);
                }
                return words;
            }
            return [];
        })(),

        // Rick and Morty API
        (async () => {
            const res = await fetch('https://rickandmortyapi.com/api/character?page=1');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.results && Array.isArray(data.results)) {
                    for (const character of data.results.slice(0, 30)) {
                        const name = character.name?.trim().toLowerCase().replace(/\s+/g, '');
                        if (name && /^[a-z]{3,}$/.test(name)) words.push(name);
                    }
                }
                return words;
            }
            return [];
        })(),

        // Trivia API
        (async () => {
            const res = await fetch('https://opentdb.com/api.php?amount=20&type=multiple');
            if (res.ok) {
                const data = await res.json();
                const words = [];
                if (data.results && Array.isArray(data.results)) {
                    for (const question of data.results) {
                        const category = question.category?.trim().toLowerCase().replace(/\s+/g, '');
                        if (category && /^[a-z]{3,}$/.test(category)) words.push(category);
                    }
                }
                return words;
            }
            return [];
        })()
    ]);

    // Collect all successful results
    for (const result of results) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            allWords.push(...result.value);
        }
    }

    // Deduplicate and filter
    const uniqueWords = [...new Set(allWords)].filter(w => /^[a-z]{3,}$/.test(w));

    if (uniqueWords.length > 0) {
        return uniqueWords;
    }

    // Absolute fallback - minimal hardcoded list (only if all APIs fail)
    console.warn('All APIs failed, using absolute fallback list');
    return ['word', 'game', 'player', 'challenge', 'victory', 'action', 'character', 'element', 'fantasy', 'history'];
}

function getPromptFromPool(wordsPool, promptLength = 2) {
    const shuffled = [...wordsPool].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
        if (word.length >= promptLength + 2) {
            const startIdx = Math.floor(Math.random() * (word.length - promptLength + 1));
            const prompt = word.slice(startIdx, startIdx + promptLength);
            if (/^[a-z]+$/.test(prompt)) {
                return prompt.toUpperCase();
            }
        }
    }
    const defaultPrompts2 = ['AN', 'IN', 'ER', 'AT', 'ON', 'ES', 'ED', 'OR', 'IT', 'AL', 'RE', 'ST', 'CO', 'DE', 'TH', 'HE', 'TE', 'VE'];
    const defaultPrompts3 = ['ING', 'ENT', 'ION', 'ATE', 'TER', 'PRO', 'CON', 'RES', 'VER', 'STA', 'TRA', 'ALL', 'THE', 'AND', 'FOR', 'THA'];
    const list = promptLength === 2 ? defaultPrompts2 : defaultPrompts3;
    return list[Math.floor(Math.random() * list.length)];
}

async function validateEnglishWord(word) {
    const cleanWord = word.trim().toLowerCase();
    if (!/^[a-z]{3,20}$/.test(cleanWord)) {
        return { valid: false, reason: 'Word must be between 3 and 20 alphabetic letters!' };
    }
    
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]) {
                let definition = '';
                try {
                    definition = data[0].meanings[0].definitions[0].definition;
                } catch (e) {}
                return { valid: true, definition: definition || 'A valid English word.' };
            }
        } else if (res.status === 404) {
            return { valid: false, reason: 'Not a valid English word!' };
        }
    } catch (err) {
        console.error('FreeDictionaryAPI failed, trying Datamuse:', err);
    }

    try {
        const res = await fetch(`https://api.datamuse.com/words?sp=${cleanWord}&max=1`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].word.toLowerCase() === cleanWord) {
                return { valid: true, definition: 'A valid English word.' };
            }
        }
    } catch (err) {
        console.error('Datamuse API failed during validation:', err);
    }

    return { valid: false, reason: 'Could not verify word validity (API connection error).' };
}

async function runWordBombGame(initialMessageOrInteraction, channel, host) {
    const isSlash = !initialMessageOrInteraction.author;

    const players = [host];
    const maxPlayers = 8;
    const lobbyDuration = 60000;

    function getLobbyEmbed() {
        const playerMentions = players.map((p, idx) => `\`${idx + 1}.\` **${p.username}**`).join('\n');
        return new EmbedBuilder()
            .setColor(0x2b2d42)
            .setTitle('💣 Word Bomb — Lobby')
            .setDescription(
                `**Host:** ${host.username}\n\n` +
                `**Players (${players.length}/${maxPlayers}):**\n${playerMentions || '*None*'}\n\n` +
                `*Lobby closes in 60 seconds.*`
            );
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wb_lobby_join')
            .setLabel('Join')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕'),
        new ButtonBuilder()
            .setCustomId('wb_lobby_leave')
            .setLabel('Leave')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪'),
        new ButtonBuilder()
            .setCustomId('wb_lobby_start')
            .setLabel('Start Game')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('▶️')
    );

    let lobbyMsg;
    if (isSlash) {
        lobbyMsg = await initialMessageOrInteraction.reply({
            embeds: [getLobbyEmbed()],
            components: [row],
            withResponse: true
        });
    } else {
        lobbyMsg = await channel.send({
            embeds: [getLobbyEmbed()],
            components: [row]
        });
    }

    const buttonCollector = lobbyMsg.createMessageComponentCollector({
        filter: i => i.customId.startsWith('wb_lobby_'),
        time: lobbyDuration
    });

    let gameStarted = false;

    buttonCollector.on('collect', async i => {
        if (i.customId === 'wb_lobby_join') {
            if (players.some(p => p.id === i.user.id)) {
                return i.reply({ content: '❌ You are already in the lobby!', ephemeral: true });
            }
            if (players.length >= maxPlayers) {
                return i.reply({ content: '❌ The lobby is full!', ephemeral: true });
            }
            players.push(i.user);
            await i.deferUpdate();
            await lobbyMsg.edit({ embeds: [getLobbyEmbed()] });
        } 
        else if (i.customId === 'wb_lobby_leave') {
            if (i.user.id === host.id) {
                return i.reply({ content: '❌ As the host, you cannot leave the lobby. Let the timer run out to cancel.', ephemeral: true });
            }
            const idx = players.findIndex(p => p.id === i.user.id);
            if (idx === -1) {
                return i.reply({ content: "❌ You aren't in the lobby!", ephemeral: true });
            }
            players.splice(idx, 1);
            await i.deferUpdate();
            await lobbyMsg.edit({ embeds: [getLobbyEmbed()] });
        } 
        else if (i.customId === 'wb_lobby_start') {
            if (i.user.id !== host.id) {
                return i.reply({ content: '❌ Only the host can start the game!', ephemeral: true });
            }
            if (players.length < 2) {
                return i.reply({ content: '❌ You need at least 2 players to start the game!', ephemeral: true });
            }
            gameStarted = true;
            buttonCollector.stop('manual');
            await i.deferUpdate();
        }
    });

    await new Promise(resolve => buttonCollector.on('end', (collected, reason) => {
        resolve();
    }));

    if (!gameStarted && players.length >= 2) {
        gameStarted = true;
    }

    if (!gameStarted) {
        activeGames.delete(channel.id);
        const cancelEmbed = new EmbedBuilder()
            .setColor(0x2b2d42)
            .setTitle('❌ Word Bomb — Cancelled')
            .setDescription('Not enough players.');
        
        await lobbyMsg.edit({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wb_lobby_join')
            .setLabel('Join')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('wb_lobby_leave')
            .setLabel('Leave')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('wb_lobby_start')
            .setLabel('Start Game')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('▶️')
            .setDisabled(true)
    );
    await lobbyMsg.edit({ components: [disabledRow] }).catch(() => {});

    const startingMsg = await channel.send('🔄 **Fetching words list and initializing game...**');
    const wordsPool = await fetchRandomWords();
    await startingMsg.delete().catch(() => {});

    const client = channel.client;
    if (!client.activeWordbombGames) {
        client.activeWordbombGames = new Map();
    }

    let gameStopped = false;
    try {
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        const gameState = shuffledPlayers.map(p => ({
            user: p,
            lives: 3,
            eliminated: false,
            successfulGuesses: 0
        }));

        let usedWords = new Set();
        let currentTurnIdx = 0;
        let roundCount = 1;
        let baseTimeLimit = 15000;
        let turnsSinceLastLifeLoss = 0;
        let currentPrompt = null;

        const runEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🏁 WORD BOMB: GAME STARTED!')
            .setDescription(
                `**Turn Order:**\n${gameState.map((p, idx) => `${idx + 1}. **${p.user.username}** (Lives: 💣 💣 💣)`).join('\n')}\n\n` +
                `**Rules:**\n` +
                `- On your turn, submit a valid English word that contains the prompt characters.\n` +
                `- You have a limited time to answer! If you fail, you lose a life.\n` +
                `- Words cannot be reused. Let's play!`
            );
        
        await channel.send({ embeds: [runEmbed] });
        await new Promise(resolve => setTimeout(resolve, 5000));

        while (true) {
            if (gameStopped) break;
            const activePlayers = gameState.filter(p => p.lives > 0);
            if (activePlayers.length <= 1) {
                break;
            }

            while (gameState[currentTurnIdx].lives <= 0) {
                currentTurnIdx = (currentTurnIdx + 1) % gameState.length;
            }
            const activePlayer = gameState[currentTurnIdx];

            const totalTurnsPlayed = roundCount - 1;
            const isDeathBattleMode = turnsSinceLastLifeLoss >= 8;
            const currentLimit = isDeathBattleMode ? 10000 : Math.max(8000, baseTimeLimit - Math.floor(totalTurnsPlayed / 5) * 500);
            const promptLength = totalTurnsPlayed >= 12 ? 3 : 2;

            if (!currentPrompt) {
                currentPrompt = getPromptFromPool(wordsPool, promptLength);
            }
            const prompt = currentPrompt;
            
            client.activeWordbombGames.set(channel.id, {
                channelId: channel.id,
                guildName: channel.guild?.name || 'Unknown Server',
                channelName: channel.name,
                round: roundCount,
                prompt,
                activePlayer: activePlayer.user.username,
                lives: activePlayer.lives,
                usedWordsCount: usedWords.size,
                timestamp: Date.now()
            });

            try {
                const { sendGameSolutionAlert } = require('../../utils/webhookDispatcher');
                sendGameSolutionAlert({
                    type: 'wordbomb',
                    userId: activePlayer.user.id,
                    username: activePlayer.user.tag,
                    bet: null,
                    details: `Word Bomb (Round ${roundCount}) in channel #${channel.name || 'unknown'} (${channel.id}). Active Player: ${activePlayer.user.username}`,
                    solution: `Active Prompt: ${prompt.toUpperCase()}\nRemaining Lives: ${activePlayer.lives}`
                }).catch(err => console.error('Failed to send game solution webhook:', err));
            } catch (e) {
                console.error('Error dispatching game solution webhook:', e);
            }

            const livesVisual = '💣'.repeat(activePlayer.lives);

            let turnDescription = `Type a word containing:\n\n# **\`${prompt}\`**\n\n` +
                `⏳ Time Limit: **${(currentLimit / 1000).toFixed(1)} seconds**\n` +
                `❤️ Lives: ${livesVisual}\n\n` +
                `*Type your word in this channel!*`;

            if (isDeathBattleMode) {
                turnDescription = `🔥 **DEATH BATTLE ACTIVE!** 🔥\n*No one has lost a life in 8 turns! The bomb timer is locked at 10 seconds until someone explodes!*\n\n` + turnDescription;
            }

            const turnEmbed = new EmbedBuilder()
                .setColor(isDeathBattleMode ? 0xff1a1a : 0xe67e22)
                .setTitle(`🔄 Round ${roundCount} — ${activePlayer.user.username}'s Turn!`)
                .setDescription(turnDescription)
                .setTimestamp();

            const turnMsg = await channel.send({ content: `${activePlayer.user}`, embeds: [turnEmbed] });

            const filter = m => {
                if (m.author.bot) return false;
                return m.author.id === activePlayer.user.id || m.author.id === host.id;
            };
            let turnActive = true;
            const turnStartTime = Date.now();
            let errorMsg = null;

            while (turnActive) {
                const elapsed = Date.now() - turnStartTime;
                const timeLeft = currentLimit - elapsed;
                if (timeLeft <= 0) {
                    activePlayer.lives--;
                    turnsSinceLastLifeLoss = 0; // Reset on life loss
                    turnActive = false;

                    const failEmbed = new EmbedBuilder()
                        .setColor(0xc0392b)
                        .setTitle('💥 BOOM!')
                        .setDescription(`⏰ Time's up! **${activePlayer.user.username}** took too long and lost a life!\nRemaining Lives: ${'💣'.repeat(activePlayer.lives) || '💀 (ELIMINATED)'}`);
                    
                    await channel.send({ embeds: [failEmbed] });

                    if (activePlayer.lives <= 0) {
                        await channel.send(`💀 **${activePlayer.user.username}** has been eliminated!`);
                    }
                    break;
                }

                try {
                    const collected = await channel.awaitMessages({
                        filter,
                        max: 1,
                        time: timeLeft,
                        errors: ['time']
                    });

                    const msg = collected.first();
                    const word = msg.content.trim().toLowerCase();

                    // Check for manual stop by host
                    if (msg.author.id === host.id && (word === 'stop' || word === 'cancel' || word === '-stop' || word === '-cancel')) {
                        let isWordGuess = false;
                        if (msg.author.id === activePlayer.user.id && word.includes(prompt.toLowerCase())) {
                            isWordGuess = true;
                        }
                        if (!isWordGuess) {
                            gameStopped = true;
                            turnActive = false;
                            const stopEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setTitle('🛑 Word Bomb Canceled')
                                .setDescription(`**${msg.author.username}** stopped the game.`);
                            await channel.send({ embeds: [stopEmbed] });
                            break;
                        }
                    }

                    if (!word.includes(prompt.toLowerCase())) {
                        if (errorMsg) {
                            await errorMsg.delete().catch(() => {});
                        }
                        errorMsg = await msg.reply(`❌ **\`${word.toUpperCase()}\`** does not contain **\`${prompt}\`**! Try again.`);
                        continue;
                    }

                    if (usedWords.has(word)) {
                        if (errorMsg) {
                            await errorMsg.delete().catch(() => {});
                        }
                        errorMsg = await msg.reply(`❌ **\`${word.toUpperCase()}\`** has already been used! Try again.`);
                        continue;
                    }

                    await channel.sendTyping().catch(() => {});

                    const validation = await validateEnglishWord(word);
                    if (!validation.valid) {
                        if (errorMsg) {
                            await errorMsg.delete().catch(() => {});
                        }
                        errorMsg = await msg.reply(`❌ **\`${word.toUpperCase()}\`** is not valid: ${validation.reason}`);
                        continue;
                    }

                    usedWords.add(word);
                    activePlayer.successfulGuesses++;
                    turnsSinceLastLifeLoss++; // Survived another turn
                    turnActive = false;
                    currentPrompt = null; // Clear so next turn gets a new prompt

                    if (errorMsg) {
                        await errorMsg.delete().catch(() => {});
                    }

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('✅ WORD ACCEPTED')
                        .setDescription(`**${activePlayer.user.username}** cleared the bomb with **\`${word.toUpperCase()}\`**!\n\n*Definition:* ${validation.definition}`);
                    
                    await msg.reply({ embeds: [successEmbed] });

                } catch (err) {
                    activePlayer.lives--;
                    turnsSinceLastLifeLoss = 0; // Reset on life loss
                    turnActive = false;

                    if (errorMsg) {
                        await errorMsg.delete().catch(() => {});
                    }

                    const failEmbed = new EmbedBuilder()
                        .setColor(0xc0392b)
                        .setTitle('💥 BOOM!')
                        .setDescription(`⏰ Time's up! **${activePlayer.user.username}** lost a life!\nRemaining Lives: ${'💣'.repeat(activePlayer.lives) || '💀 (ELIMINATED)'}`);
                    
                    await channel.send({ embeds: [failEmbed] });

                    if (activePlayer.lives <= 0) {
                        await channel.send(`💀 **${activePlayer.user.username}** has been eliminated!`);
                    }
                    break;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
            
            roundCount++;
            currentTurnIdx = (currentTurnIdx + 1) % gameState.length;
        }

        if (gameStopped) {
            return;
        }

        const winnerData = gameState.find(p => p.lives > 0);
        const winner = winnerData ? winnerData.user : null;

        const payoutDetails = [];
        const globalMultiplier = await getGlobalMultiplier();
        for (const playerState of gameState) {
            let basePrize = playerState.successfulGuesses * 10;
            const isWinner = winner && playerState.user.id === winner.id;
            if (isWinner) {
                basePrize += 100;
            }
            
            let prize = Math.floor(basePrize * globalMultiplier);

            if (prize > 0) {
                try {
                    let baubleData = await Bauble.findOne({ userId: playerState.user.id });
                    if (!baubleData) {
                        baubleData = new Bauble({ userId: playerState.user.id, baubles: 0 });
                    }
                    baubleData.baubles += prize;
                    baubleData.dailyGameLastCompleted = new Date();
                    
                    if (isWinner) {
                        baubleData.wordbombWins = (baubleData.wordbombWins || 0) + 1;
                    }
                    
                    await baubleData.save();

                    if (isWinner) {
                        const client = initialMessageOrInteraction.client || (initialMessageOrInteraction.channel && initialMessageOrInteraction.channel.client);
                        if (client) {
                            const { checkAndAwardAchievement } = require('../../utils/achievements');
                            const targetMsg = { channel };
                            if (baubleData.wordbombWins >= 10) {
                                await checkAndAwardAchievement(client, playerState.user.id, 'wordbomb_win_10', targetMsg);
                            }
                            if (baubleData.wordbombWins >= 50) {
                                await checkAndAwardAchievement(client, playerState.user.id, 'wordbomb_win_50', targetMsg);
                            }
                            if (baubleData.wordbombWins >= 100) {
                                await checkAndAwardAchievement(client, playerState.user.id, 'wordbomb_win_100', targetMsg);
                            }
                            if (baubleData.wordbombWins >= 250) {
                                await checkAndAwardAchievement(client, playerState.user.id, 'wordbomb_win_250', targetMsg);
                            }
                        }
                    }
                } catch (dbErr) {
                    console.error(`Failed to save baubles for ${playerState.user.username}:`, dbErr);
                }
                payoutDetails.push(`${isWinner ? '👑' : '👤'} **${playerState.user.username}**: +**${prize.toLocaleString()}** Baubles (${playerState.successfulGuesses} correct guesses)`);
            } else {
                payoutDetails.push(`👤 **${playerState.user.username}**: +0 Baubles (0 correct guesses)`);
            }
        }

        const victoryEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🏆 WORD BOMB: GAME OVER!')
            .setDescription(
                `Here are the final standings and Bauble rewards:\n\n${payoutDetails.join('\n')}`
            )
            .setTimestamp();

        if (winner) {
            victoryEmbed.setThumbnail(winner.displayAvatarURL({ dynamic: true }));
        }

        await channel.send({ embeds: [victoryEmbed] });
    } finally {
        activeGames.delete(channel.id);
        if (client.activeWordbombGames) {
            client.activeWordbombGames.delete(channel.id);
        }
    }
}

module.exports = {
    category: 'minigames',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('wordbomb')
        .setDescription('Start a multiplayer turn-based Word Bomb game!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ A Word Bomb game is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        runWordBombGame(interaction, interaction.channel, interaction.user).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ A Word Bomb game is already running in this channel!');
        }

        activeGames.add(channelId);
        runWordBombGame(message, message.channel, message.author).catch(err => {
            console.error(err);
            activeGames.delete(channelId);
        });
    }
};
