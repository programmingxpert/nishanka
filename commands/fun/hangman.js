const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    PermissionsBitField
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');

// ─── Fallback word pool (ONLY used if DeepSeek fails entirely) ───────────────
const FALLBACK_WORDS = [
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
    'expedition', 'odyssey', 'journey', 'voyage', 'quest',
    'safari', 'pilgrimage', 'excursion', 'symphony', 'orchestra',
    'melody', 'harmony', 'rhythm', 'serenade', 'crescendo',
    'labyrinth', 'mystery', 'enigma', 'puzzle', 'riddle',
    'paradox', 'conundrum', 'illusion', 'mirage', 'phantom'
];

// ─── Persistent used-words tracking (survives across games in the same process) ─
const usedWordsGlobal = new Set();

// ─── Active game tracking ─────────────────────────────────────────────────────
const activeGames = new Set();

// ─── Hangman ASCII art stages ─────────────────────────────────────────────────
const HANGMAN_STAGES = [
`\`\`\`
  +---+
  |   |
      |
      |
      |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
      |
      |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
  |   |
      |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========\`\`\``,
`\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========\`\`\``
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ─── DeepSeek word generation ─────────────────────────────────────────────────
async function generateWordsViaDeepSeek(count, avoidList) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        throw new Error('No DeepSeek API key configured.');
    }

    // Ask for extra words in case some fail validation or duplicate
    const requestCount = count + 10;
    const avoidStr = avoidList.length > 0 ? avoidList.join(', ') : 'none';

    const prompt = `Generate ${requestCount} unique single English words for a Hangman game.

STRICT RULES:
1. Each word must be 5–10 lowercase letters, only a-z, no spaces or punctuation.
2. Words must be common, recognizable nouns, verbs, or adjectives.
3. DO NOT use any of these already-used words: [${avoidStr}]
4. Avoid overly cliché words like: computer, science, keyboard, dinosaur, chocolate, universe, technology.
5. No proper nouns, brand names, or abbreviations.

Return ONLY a raw JSON array of strings. No markdown, no code fences, no extra text.
Example format: ["backpack","cascade","festival","eclipse","mirage"]`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 1.2,
            max_tokens: 300
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    let raw = data?.choices?.[0]?.message?.content?.trim() ?? '';

    // Strip any accidental markdown fences
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    // Extract the JSON array even if there's stray text
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('DeepSeek response did not contain a JSON array.');
    }
    raw = raw.slice(start, end + 1);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Parsed response is not an array.');

    // Validate, lowercase, deduplicate against usedWordsGlobal
    const valid = parsed
        .map(w => String(w).trim().toLowerCase())
        .filter(w => /^[a-z]{5,10}$/.test(w) && !usedWordsGlobal.has(w));

    // Remove duplicates within this batch
    const unique = [...new Set(valid)];

    if (unique.length < count) {
        throw new Error(`DeepSeek only returned ${unique.length} usable words, needed ${count}.`);
    }

    return unique.slice(0, count);
}

// ─── Word fetcher with retry + fallback ──────────────────────────────────────
async function getWordsForGame(count) {
    // Try DeepSeek up to 2 times
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const words = await generateWordsViaDeepSeek(count, [...usedWordsGlobal]);
            // Register in global used set
            for (const w of words) usedWordsGlobal.add(w);
            // Cap the set size so it doesn't grow forever
            if (usedWordsGlobal.size > 500) {
                const oldest = [...usedWordsGlobal].slice(0, usedWordsGlobal.size - 500);
                oldest.forEach(w => usedWordsGlobal.delete(w));
            }
            console.log(`[Hangman] DeepSeek words (attempt ${attempt}):`, words);
            return { words, source: 'deepseek' };
        } catch (err) {
            console.error(`[Hangman] DeepSeek attempt ${attempt} failed:`, err.message);
            if (attempt < 2) await delay(1500); // small pause before retry
        }
    }

    // ── Fallback to hardcoded words ──────────────────────────────────────────
    console.warn('[Hangman] Falling back to hardcoded word list.');
    const available = FALLBACK_WORDS.filter(w => !usedWordsGlobal.has(w));
    const pool = available.length >= count ? available : FALLBACK_WORDS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    for (const w of selected) usedWordsGlobal.add(w);
    return { words: selected, source: 'fallback' };
}

// ─── Pick a random letter to reveal at round start ───────────────────────────
function pickRevealedLetter(word) {
    // Pick a random letter that's not the first/last to keep it interesting
    const indices = [...word].map((_, i) => i);
    // Shuffle and pick one that isn't the very first or last character if possible
    const inner = indices.filter(i => i > 0 && i < word.length - 1);
    const pool = inner.length > 0 ? inner : indices;
    return word[pool[Math.floor(Math.random() * pool.length)]];
}

// ─── Render word display ──────────────────────────────────────────────────────
function renderWordDisplay(word, guessedLetters) {
    return word.split('').map(char => (guessedLetters.has(char) ? `**${char.toUpperCase()}**` : `\\_`)).join(' ');
}

// ─── Check if bot has manage messages permission ─────────────────────────────
function canDeleteMessages(channel) {
    const perms = channel.permissionsFor(channel.guild.members.me);
    return perms && perms.has(PermissionsBitField.Flags.ManageMessages);
}

// ─── Main game runner ─────────────────────────────────────────────────────────
async function runHangmanGame(channel, hostId, joinedPlayers) {
    const TOTAL_ROUNDS = 5;
    const POINTS_PER_ROUND = 500;

    // ── Scores map: userId → { name, points } ──────────────────────────────
    const scores = new Map();
    joinedPlayers.forEach(p => scores.set(p.id, { name: p.username, points: 0 }));

    // ── Fetch words before the game even starts (with timing) ──────────────
    const wordFetchPromise = getWordsForGame(TOTAL_ROUNDS);

    const canDelete = canDeleteMessages(channel);

    const startEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('🎮 Hangman — Game Starting!')
        .setDescription(
            `**${TOTAL_ROUNDS} rounds** of Hangman await!\n\n` +
            `• Type a **single letter** to guess it\n` +
            `• Type the **full word** to solve the round instantly\n` +
            `• Each round, **1 letter is revealed** for free\n` +
            `• 6 wrong guesses = 💀\n\n` +
            `*First round begins in 5 seconds...*`
        )
        .setFooter({ text: canDelete ? '✅ Message cleanup enabled' : '⚠️ Missing Manage Messages — guesses won\'t be deleted' });

    await channel.send({ embeds: [startEmbed] });

    // ── Resolve words (wait for fetch to finish, then wait remainder of 5s) ─
    const fetchStart = Date.now();
    const { words: gameWords, source: wordSource } = await wordFetchPromise;
    const fetchElapsed = Date.now() - fetchStart;
    await delay(Math.max(0, 5000 - fetchElapsed));

    if (wordSource === 'fallback') {
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setDescription('⚠️ Could not reach DeepSeek API. Using backup word list for this game.')
            ]
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        if (round > 1) await delay(5000);

        const word = gameWords[round - 1];
        let mistakes = 0;
        const guessedLetters = new Set();
        let roundOver = false;

        // Reveal one random letter for free
        const freebie = pickRevealedLetter(word);
        guessedLetters.add(freebie);

        // ── Embed builder ──────────────────────────────────────────────────
        const buildEmbed = (status = null) => {
            const display = renderWordDisplay(word, guessedLetters);
            const stage = HANGMAN_STAGES[mistakes];
            const guessedStr = [...guessedLetters].sort().join(' ') || '—';
            const wrongLetters = [...guessedLetters].filter(l => !word.includes(l)).sort().join(' ') || '—';
            const livesBar = '🟥'.repeat(mistakes) + '🟩'.repeat(6 - mistakes);

            let color = 0x3498db;
            if (status === 'won') color = 0x2ecc71;
            else if (status === 'lost') color = 0xe74c3c;
            else if (status === 'timeout') color = 0xe74c3c;
            else if (mistakes >= 4) color = 0xe67e22;

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`Round ${round} / ${TOTAL_ROUNDS}`)
                .addFields(
                    {
                        name: '🔤 Word',
                        value: display,
                        inline: false
                    },
                    {
                        name: '❤️ Lives',
                        value: `${livesBar} (${6 - mistakes}/6)`,
                        inline: true
                    },
                    {
                        name: '✅ Guessed',
                        value: `\`${[...guessedLetters].filter(l => word.includes(l)).sort().join('  ') || '—'}\``,
                        inline: true
                    },
                    {
                        name: '❌ Wrong',
                        value: `\`${wrongLetters}\``,
                        inline: true
                    }
                )
                .setDescription(stage)
                .setFooter({ text: 'Type a letter to guess • Type the full word to solve' });

            return embed;
        };

        const gameMsg = await channel.send({ embeds: [buildEmbed()] });

        // ── Message collector ──────────────────────────────────────────────
        const playerIds = new Set(joinedPlayers.keys());
        const filter = m => {
            if (m.author.bot) return false;
            if (playerIds.size > 0 && !playerIds.has(m.author.id)) return false;
            const c = m.content.trim().toLowerCase();
            return /^[a-z]$/.test(c) || /^[a-z]{2,}$/.test(c);
        };

        const collector = channel.createMessageCollector({ filter, time: 90_000 });

        await new Promise(resolve => {
            collector.on('collect', async m => {
                const guess = m.content.trim().toLowerCase();

                if (guess.length === 1) {
                    // ── Single letter guess ────────────────────────────────
                    if (guessedLetters.has(guess)) {
                        // Already guessed — react and ignore
                        m.react('🔁').catch(() => {});
                        return;
                    }

                    guessedLetters.add(guess);
                    
                    // Delete single letter guess
                    if (canDelete) {
                        m.delete().catch(() => {});
                    }

                    if (word.includes(guess)) {
                        // Correct letter
                        const allRevealed = word.split('').every(c => guessedLetters.has(c));
                        if (allRevealed) {
                            roundOver = true;
                            collector.stop('won');
                            _awardPoint(scores, m.author.id, m.author.username);
                            const winEmbed = new EmbedBuilder()
                                .setColor(0x2ecc71)
                                .setTitle('🎉 Round Won!')
                                .setDescription(
                                    `**${m.author.username}** revealed the last letter!\n` +
                                    `The word was: **\`${word.toUpperCase()}\`** ✅\n` +
                                    `*+1 point awarded!*`
                                );
                            await channel.send({ embeds: [winEmbed] });
                            return;
                        }
                        // Update embed with correct guess
                        await gameMsg.edit({ embeds: [buildEmbed()] }).catch(() => {});
                    } else {
                        // Wrong letter
                        mistakes++;
                        if (mistakes >= 6) {
                            roundOver = true;
                            collector.stop('lost');
                            const lossEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setTitle('💀 Hanged!')
                                .setDescription(
                                    `**${m.author.username}** made the final wrong guess.\n` +
                                    `The word was: **\`${word.toUpperCase()}\`** 😬`
                                );
                            await gameMsg.edit({ embeds: [buildEmbed('lost')] }).catch(() => {});
                            await channel.send({ embeds: [lossEmbed] });
                            return;
                        }
                        await gameMsg.edit({ embeds: [buildEmbed()] }).catch(() => {});
                    }
                } else {
                    // ── Full word guess ────────────────────────────────────
                    if (guess === word) {
                        roundOver = true;
                        collector.stop('won');
                        _awardPoint(scores, m.author.id, m.author.username);
                        
                        // Delete correct word guess
                        if (canDelete) {
                            m.delete().catch(() => {});
                        }
                        
                        const winEmbed = new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('🎉 Word Solved!')
                            .setDescription(
                                `**${m.author.username}** guessed the whole word!\n` +
                                `The word was: **\`${word.toUpperCase()}\`** ✅\n` +
                                `*+1 point awarded!*`
                            );
                        await gameMsg.edit({ embeds: [buildEmbed('won')] }).catch(() => {});
                        await channel.send({ embeds: [winEmbed] });
                    } else {
                        // Wrong word attempt — NO penalty, no deletion, just left alone
                    }
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time' && !roundOver) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ Time\'s Up!')
                        .setDescription(`Nobody guessed the word in time.\nIt was: **\`${word.toUpperCase()}\`**`);
                    await gameMsg.edit({ embeds: [buildEmbed('timeout')] }).catch(() => {});
                    await channel.send({ embeds: [timeoutEmbed] });
                }
                resolve();
            });
        });

        // ── Between-round scoreboard ───────────────────────────────────────
        if (round < TOTAL_ROUNDS) {
            const sorted = _getSortedScores(scores);
            if (sorted.length > 0) {
                const boardText = sorted
                    .map((s, i) => `${['🥇','🥈','🥉'][i] ?? `**${i+1}.**`} ${s.name} — **${s.points}** pt${s.points !== 1 ? 's' : ''}`)
                    .join('\n');
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf1c40f)
                            .setTitle('📊 Standings After Round ' + round)
                            .setDescription(boardText)
                            .setFooter({ text: 'Next round in 5 seconds...' })
                    ]
                });
            } else {
                await channel.send({ content: '*No scores yet. Next round in 5 seconds...*' });
            }
        }
    }

    // ── Game over ──────────────────────────────────────────────────────────
    activeGames.delete(channel.id);

    const finalScores = _getSortedScores(scores);
    if (finalScores.length === 0) {
        return channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('🏁 Game Over')
                    .setDescription('Nobody scored any points this game. Better luck next time!')
            ]
        });
    }

    const { getGlobalMultiplier } = require('../../utils/economyEngine');
    const globalMultiplier = await getGlobalMultiplier();

    let finalText = '';
    for (const [idx, { id: uId, name, points }] of finalScores.entries()) {
        const reward = Math.floor(points * POINTS_PER_ROUND * globalMultiplier);
        const medal = ['🥇', '🥈', '🥉'][idx] ?? `**${idx + 1}.**`;
        finalText += `${medal} **${name}** — ${points} pt${points !== 1 ? 's' : ''} → +**${reward.toLocaleString()}** Baubles *(Economy Multiplier: ${globalMultiplier}x)*\n`;

        try {
            let baubleData = await Bauble.findOne({ userId: uId });
            if (!baubleData) baubleData = new Bauble({ userId: uId, baubles: 0 });
            baubleData.baubles += reward;
            baubleData.dailyGameLastCompleted = new Date();
            await baubleData.save();
        } catch (e) {
            console.error('[Hangman] Error saving baubles:', e);
        }
    }

    await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🏆 Hangman — Final Results')
                .setDescription(finalText)
        ]
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _awardPoint(scores, userId, username) {
    if (!scores.has(userId)) scores.set(userId, { name: username, points: 0 });
    scores.get(userId).points += 1;
}

function _getSortedScores(scores) {
    return Array.from(scores.entries())
        .filter(([, d]) => d.points > 0)
        .sort((a, b) => b[1].points - a[1].points)
        .map(([id, d]) => ({ id, name: d.name, points: d.points }));
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
async function createLobby(interactionOrMessage, channel) {
    const isSlash = !!interactionOrMessage.user;
    const hostId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    const hostName = isSlash ? interactionOrMessage.user.username : interactionOrMessage.author.username;

    const joinedPlayers = new Map();
    joinedPlayers.set(hostId, { id: hostId, username: hostName });

    const buildLobbyEmbed = () => {
        const list = Array.from(joinedPlayers.values()).map(p => `> ${p.username}`).join('\n');
        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎮 Multiplayer Hangman — Lobby')
            .setDescription(
                `**Host:** ${hostName}\n\n` +
                `**Players (${joinedPlayers.size}):**\n${list}\n\n` +
                `Click **Join** to enter the game.\nThe host clicks **Start** when everyone's ready.\n\n` +
                `*Lobby closes in 2 minutes.*`
            );
    };

    const joinBtn  = new ButtonBuilder().setCustomId('hm_join').setLabel('Join').setStyle(ButtonStyle.Success).setEmoji('✋');
    const leaveBtn = new ButtonBuilder().setCustomId('hm_leave').setLabel('Leave').setStyle(ButtonStyle.Danger).setEmoji('🚪');
    const startBtn = new ButtonBuilder().setCustomId('hm_start').setLabel('Start Game').setStyle(ButtonStyle.Primary).setEmoji('▶️');
    const row = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, startBtn);

    let lobbyMsg;
    if (isSlash) {
        lobbyMsg = await interactionOrMessage.reply({ embeds: [buildLobbyEmbed()], components: [row], withResponse: true });
    } else {
        lobbyMsg = await channel.send({ embeds: [buildLobbyEmbed()], components: [row] });
    }

    const collector = lobbyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000
    });

    collector.on('collect', async i => {
        if (i.customId === 'hm_join') {
            if (joinedPlayers.has(i.user.id)) {
                return i.reply({ content: 'You\'re already in the lobby!', ephemeral: true });
            }
            joinedPlayers.set(i.user.id, { id: i.user.id, username: i.user.username });
            await i.update({ embeds: [buildLobbyEmbed()] });

        } else if (i.customId === 'hm_leave') {
            if (i.user.id === hostId) {
                return i.reply({ content: 'The host can\'t leave. Wait for timeout or start the game!', ephemeral: true });
            }
            if (!joinedPlayers.has(i.user.id)) {
                return i.reply({ content: 'You\'re not in the lobby.', ephemeral: true });
            }
            joinedPlayers.delete(i.user.id);
            await i.update({ embeds: [buildLobbyEmbed()] });

        } else if (i.customId === 'hm_start') {
            if (i.user.id !== hostId) {
                return i.reply({ content: 'Only the host can start the game!', ephemeral: true });
            }
            collector.stop('started');
        }
    });

    collector.on('end', async (_, reason) => {
        const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(joinBtn).setDisabled(true),
            ButtonBuilder.from(leaveBtn).setDisabled(true),
            ButtonBuilder.from(startBtn).setDisabled(true)
        );
        await lobbyMsg.edit({ components: [disabledRow] }).catch(() => {});

        if (reason === 'started') {
            runHangmanGame(channel, hostId, joinedPlayers).catch(err => {
                console.error('[Hangman] Game error:', err);
                activeGames.delete(channel.id);
                channel.send({ content: '⚠️ An unexpected error ended the game early. Sorry!' });
            });
        } else {
            activeGames.delete(channel.id);
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setDescription('⏱️ Hangman lobby timed out. Game cancelled.')
                ]
            });
        }
    });
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'fun',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Start a multiplayer Hangman game!'),

    async execute(interaction) {
        if (activeGames.has(interaction.channelId)) {
            return interaction.reply({ content: '⚠️ A Hangman game is already running in this channel!', ephemeral: true });
        }
        activeGames.add(interaction.channelId);
        createLobby(interaction, interaction.channel).catch(err => {
            console.error('[Hangman] Lobby error:', err);
            activeGames.delete(interaction.channelId);
        });
    },

    async executePrefix(message) {
        if (activeGames.has(message.channel.id)) {
            return message.reply('⚠️ A Hangman game is already running in this channel!');
        }
        activeGames.add(message.channel.id);
        createLobby(message, message.channel).catch(err => {
            console.error('[Hangman] Lobby error:', err);
            activeGames.delete(message.channel.id);
        });
    }
};