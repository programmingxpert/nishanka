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

const activeGames = new Set();

async function fetchRandomWords() {
    const allWords = [];

    // Try random-word-api (general English words)
    try {
        const res = await fetch('https://random-word-api.herokuapp.com/word?number=100');
        if (res.ok) {
            const words = await res.json();
            if (Array.isArray(words) && words.length > 0) {
                allWords.push(...words.map(w => w.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w)));
            }
        }
    } catch (err) {
        console.error('Failed to fetch from random-word-api:', err);
    }

    // Try datamuse (diverse vocabulary)
    try {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const randChar = letters[Math.floor(Math.random() * letters.length)];
        const res = await fetch(`https://api.datamuse.com/words?sp=${randChar}*&max=100`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                allWords.push(...data.map(item => item.word.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w)));
            }
        }
    } catch (err) {
        console.error('Failed to fetch from datamuse:', err);
    }

    // Try Wikipedia random articles (includes locations, cultural references, etc)
    try {
        const res = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=50&format=json&origin=*');
        if (res.ok) {
            const data = await res.json();
            if (data.query && data.query.random && Array.isArray(data.query.random)) {
                for (const item of data.query.random) {
                    const title = item.title.trim().toLowerCase().replace(/\s+/g, '');
                    if (/^[a-z]{3,}$/.test(title)) {
                        allWords.push(title);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Failed to fetch from Wikipedia:', err);
    }

    // Try Jikan API for anime names (anime/meme culture)
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime?query=title');
        if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.title) {
                const title = data.data.title.trim().toLowerCase().replace(/\s+/g, '');
                if (/^[a-z]{3,}$/.test(title)) {
                    allWords.push(title);
                }
            }
        }
    } catch (err) {
        console.error('Failed to fetch from Jikan API:', err);
    }

    // Try REST Countries API for location names
    try {
        const res = await fetch('https://restcountries.com/v3.1/all');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                for (const country of data.slice(0, 50)) {
                    const name = country.name?.common?.trim().toLowerCase().replace(/\s+/g, '');
                    if (name && /^[a-z]{3,}$/.test(name)) {
                        allWords.push(name);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Failed to fetch from REST Countries API:', err);
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
        const playerMentions = players.map((p, idx) => `**${idx + 1}.** ${p} (${p.username})`).join('\n');
        return new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💣 WORD BOMB: LOBBY')
            .setDescription(`A Word Bomb game has been initiated by **${host.username}**!\n\n**Players Joined (${players.length}/${maxPlayers}):**\n${playerMentions || '*None*'}\n\n*Click the buttons below to join/leave. The host can start the game manually once there are at least 2 players.*`)
            .setFooter({ text: `Lobby expires in ${lobbyDuration / 1000} seconds.` });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wb_lobby_join')
            .setLabel('➕ Join')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('wb_lobby_leave')
            .setLabel('➖ Leave')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('wb_lobby_start')
            .setLabel('🎮 Start Game')
            .setStyle(ButtonStyle.Primary)
    );

    let lobbyMsg;
    if (isSlash) {
        lobbyMsg = await initialMessageOrInteraction.reply({
            embeds: [getLobbyEmbed()],
            components: [row],
            fetchReply: true
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
                return i.reply({ content: '❌ As the host, you cannot leave the lobby. If you want to cancel the game, let the lobby timer run out.', ephemeral: true });
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
            .setColor(0x747f8d)
            .setTitle('❌ WORD BOMB LOBBY CANCELLED')
            .setDescription('The lobby closed because there were not enough players to start.');
        
        await lobbyMsg.edit({ embeds: [cancelEmbed], components: [] }).catch(() => {});
        return;
    }

    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wb_lobby_join')
            .setLabel('➕ Join')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('wb_lobby_leave')
            .setLabel('➖ Leave')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('wb_lobby_start')
            .setLabel('🎮 Started')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
    );
    await lobbyMsg.edit({ components: [disabledRow] }).catch(() => {});

    const startingMsg = await channel.send('🔄 **Fetching words list and initializing game...**');
    const wordsPool = await fetchRandomWords();
    await startingMsg.delete().catch(() => {});

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

        const filter = m => m.author.id === activePlayer.user.id && !m.author.bot;
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

    const winnerData = gameState.find(p => p.lives > 0);
    const winner = winnerData ? winnerData.user : null;

    const payoutDetails = [];
    for (const playerState of gameState) {
        let prize = playerState.successfulGuesses * 150;
        const isWinner = winner && playerState.user.id === winner.id;
        if (isWinner) {
            prize += 2000;
        }

        if (prize > 0) {
            try {
                let baubleData = await Bauble.findOne({ userId: playerState.user.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: playerState.user.id, baubles: 0 });
                }
                baubleData.baubles += prize;
                baubleData.dailyGameLastCompleted = new Date();
                await baubleData.save();
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

    activeGames.delete(channel.id);
}

module.exports = {
    category: 'fun',
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
