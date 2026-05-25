// commands/economy/battle.js
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

// ─── Battle Move System ──────────────────────────────────────────────────────
//
// 5 moves in a rock-paper-scissors-style cycle:
//   CLEAVE  →  beats GUARD   (raw force smashes the shield)
//   GUARD   →  beats ZEPHYR  (anchored stance resists the dodge)
//   ZEPHYR  →  beats VENOM   (agility sidesteps the poison)
//   VENOM   →  beats SURGE   (toxin seeps through the energy blast)
//   SURGE   →  beats CLEAVE  (pure energy overwhelms brute strength)
//
// Draws earn 0 points each. Winning a round earns 1 point.
// First to 2 points wins. Max 3 rounds.

const MOVES = {
    CLEAVE: {
        id: 'cleave',
        label: '⚔️ Cleave',
        emoji: '⚔️',
        beats: 'GUARD',
        description: 'A savage overhead strike.',
        winVerbs: ['absolutely **cleaves through**', 'sends a devastating blow past', '**obliterates** the defense of'],
        loseVerbs: ['swings wildly but is **zapped down** by', 'gets their momentum **completely reversed** by'],
    },
    GUARD: {
        id: 'guard',
        label: '🛡️ Guard',
        emoji: '🛡️',
        beats: 'ZEPHYR',
        description: 'An immovable iron stance.',
        winVerbs: ['**catches and counters**', 'tanks the hit and **body-slams**', 'holds steady and **outpowers**'],
        loseVerbs: ['stands firm but gets **poisoned through the cracks** by', 'can\'t block the brute force of'],
    },
    ZEPHYR: {
        id: 'zephyr',
        label: '💨 Zephyr',
        emoji: '💨',
        beats: 'VENOM',
        description: 'A ghost-like vanishing step.',
        winVerbs: ['**vanishes** and reappears behind', 'sidesteps clean and **blindsides**', '**outpaces** and dismantles'],
        loseVerbs: ['dashes in but **can\'t hold the ground** against', 'slips up and gets **firmly blocked** by'],
    },
    VENOM: {
        id: 'venom',
        label: '☠️ Venom',
        emoji: '☠️',
        beats: 'SURGE',
        description: 'A slow-crawling, deadly poison.',
        winVerbs: ['**seeps through the cracks** of', 'poisons the energy core of', '**corrodes** the power of'],
        loseVerbs: ['oozes forward but gets **dodged effortlessly** by', 'drips with malice but **can\'t catch** the speed of'],
    },
    SURGE: {
        id: 'surge',
        label: '⚡ Surge',
        emoji: '⚡',
        beats: 'CLEAVE',
        description: 'An explosive burst of raw energy.',
        winVerbs: ['**blasts clean through** the attack of', 'channels pure force and **overwhelms**', '**electrifies** and disarms'],
        loseVerbs: ['fires a burst but gets **poisoned mid-channel** by', 'overloads and is **shut down** by'],
    },
};

const MOVE_KEYS = Object.keys(MOVES);

// ─── HP Bar Renderer ─────────────────────────────────────────────────────────
function buildHpBar(hp, maxHp = 3) {
    const filled = Math.max(0, hp);
    const empty = maxHp - filled;
    const blocks = {
        3: '🟩🟩🟩',
        2: '🟨🟨⬛',
        1: '🟥⬛⬛',
        0: '💀💀💀',
    };
    return blocks[filled] ?? '⬛⬛⬛';
}

// ─── Pick a random flavor verb from array ────────────────────────────────────
function pickVerb(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Build the 5-button move row ─────────────────────────────────────────────
function buildMoveRow(disabled = false) {
    const row = new ActionRowBuilder();
    for (const key of MOVE_KEYS) {
        const move = MOVES[key];
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`battle_move_${move.id}`)
                .setLabel(move.label)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );
    }
    return row;
}

// ─── Resolve round outcome: 'challenger' | 'opponent' | 'draw' ───────────────
function resolveRound(challengerMoveKey, opponentMoveKey) {
    if (challengerMoveKey === opponentMoveKey) return 'draw';
    const cMove = MOVES[challengerMoveKey];
    if (cMove.beats === opponentMoveKey) return 'challenger';
    return 'opponent';
}

// ─── Module Exports ──────────────────────────────────────────────────────────
module.exports = {
    category: 'economy',
    cooldown: 15,

    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Challenge someone to a Bauble Brawl — a 3-round card duel!')
        .addUserOption(o =>
            o.setName('opponent')
                .setDescription('The user you want to fight.')
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName('wager')
                .setDescription('How many Baubles to put on the line.')
                .setRequired(true)
                .setMinValue(1000)
        ),

    async execute(interaction) {
        await runBattle({
            isSlash: true,
            interaction,
            challenger: interaction.user,
            opponent: interaction.options.getUser('opponent'),
            wager: interaction.options.getInteger('wager'),
        });
    },

    async executePrefix(message, args) {
        if (args.length < 2) {
            return message.reply('❌ Usage: `-battle @user <wager>`');
        }

        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        if (!mentionMatch) {
            return message.reply('❌ Please mention a valid user. Example: `-battle @someone 1000`');
        }

        const opponentId = mentionMatch[1];
        let opponent;
        try {
            opponent = await message.guild.members.fetch(opponentId);
            opponent = opponent?.user ?? null;
        } catch {
            opponent = null;
        }

        if (!opponent) {
            return message.reply('❌ Could not find that user in this server.');
        }

        const wager = parseInt(args[1], 10);
        if (isNaN(wager) || wager < 1000) {
            return message.reply('❌ Minimum wager is **1,000 Baubles**.');
        }

        await runBattle({
            isSlash: false,
            message,
            challenger: message.author,
            opponent,
            wager,
        });
    },
};

// ─── Main Battle Runner ──────────────────────────────────────────────────────
async function runBattle({ isSlash, interaction, message, challenger, opponent, wager }) {
    const channel = isSlash ? interaction.channel : message.channel;
    const client = isSlash ? interaction.client : message.client;

    // ── Validate players ──────────────────────────────────────────────────────
    if (!opponent) {
        const err = '❌ Please mention a valid user to challenge.';
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    if (opponent.bot) {
        const err = '❌ Bots don\'t carry Baubles. Challenge a real player!';
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    if (opponent.id === challenger.id) {
        const err = '❌ You can\'t battle yourself… or can you? (No, you can\'t.)';
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    if (wager < 1000) {
        const err = '❌ Minimum wager is **1,000 Baubles**.';
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    // ── Fetch balances ────────────────────────────────────────────────────────
    let cData = await Bauble.findOne({ userId: challenger.id });
    let oData = await Bauble.findOne({ userId: opponent.id });

    if (!cData || cData.baubles < wager) {
        const err = `❌ ${cData ? 'You don\'t have enough Baubles for this wager.' : 'You have no Baubles at all!'}`;
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    if (!oData || oData.baubles < wager) {
        const err = `❌ **${opponent.username}** ${oData ? 'doesn\'t have enough Baubles for this wager.' : 'has no Baubles at all!'}`;
        return isSlash
            ? interaction.reply({ content: err, ephemeral: true })
            : message.reply(err);
    }

    // ── Challenge embed ───────────────────────────────────────────────────────
    const challengeEmbed = new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle('⚔️  BAUBLE BRAWL — CHALLENGE ISSUED')
        .setDescription(
            `${opponent} — **${challenger.displayName ?? challenger.username}** is calling you out!\n\n` +
            `They're wagering **${wager.toLocaleString()} Baubles** on a 3-round card duel.\n` +
            `Do you have the guts to accept?`
        )
        .addFields(
            { name: '📖 How It Works', value:
                '> Each round, both players secretly choose a move.\n' +
                '> Moves are revealed simultaneously — the winner scores a point.\n' +
                '> **First to 2 points wins** the entire wager.\n' +
                '> You have **25 seconds** per round to pick.',
                inline: false
            },
            { name: '🃏 The 5 Moves', value:
                '⚔️ **Cleave** → beats 🛡️ Guard\n' +
                '🛡️ **Guard** → beats 💨 Zephyr\n' +
                '💨 **Zephyr** → beats ☠️ Venom\n' +
                '☠️ **Venom** → beats ⚡ Surge\n' +
                '⚡ **Surge** → beats ⚔️ Cleave',
                inline: false
            }
        )
        .setFooter({ text: 'Challenge expires in 30 seconds.' })
        .setTimestamp();

    const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('battle_accept')
            .setLabel('⚔️ Accept the Brawl')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('battle_decline')
            .setLabel('🏳️ Decline')
            .setStyle(ButtonStyle.Danger)
    );

    let challengeMsg;
    if (isSlash) {
        challengeMsg = await interaction.reply({
            content: `${opponent}`,
            embeds: [challengeEmbed],
            components: [acceptRow],
            fetchReply: true,
        });
    } else {
        challengeMsg = await message.reply({
            content: `${opponent}`,
            embeds: [challengeEmbed],
            components: [acceptRow],
        });
    }

    // ── Wait for accept/decline ───────────────────────────────────────────────
    let accepted = false;
    try {
        const btnInteraction = await challengeMsg.awaitMessageComponent({
            filter: i => i.user.id === opponent.id && ['battle_accept', 'battle_decline'].includes(i.customId),
            componentType: ComponentType.Button,
            time: 30_000,
        });

        if (btnInteraction.customId === 'battle_decline') {
            await btnInteraction.update({
                content: '',
                embeds: [new EmbedBuilder()
                    .setColor(0xff7171)
                    .setTitle('🏳️  Challenge Declined')
                    .setDescription(`**${opponent.username}** backed down from the fight. No Baubles were lost.`)
                ],
                components: [],
            });
            return;
        }

        accepted = true;
        await btnInteraction.update({
            content: '',
            embeds: [new EmbedBuilder()
                .setColor(0x4ADE80)
                .setTitle('⚔️  Challenge Accepted — Brawl Starting!')
                .setDescription(`**${challenger.username}** vs **${opponent.username}** — ${wager.toLocaleString()} Baubles on the line!\n\nCheck your **DMs** for move selection each round!`)
            ],
            components: [],
        });
    } catch {
        // Timed out
        await challengeMsg.edit({
            content: '',
            embeds: [new EmbedBuilder()
                .setColor(0x747f8d)
                .setTitle('⏰  Challenge Expired')
                .setDescription(`**${opponent.username}** didn't respond in time. The challenge fizzles out.`)
            ],
            components: [],
        });
        return;
    }

    if (!accepted) return;

    // ── Game state ────────────────────────────────────────────────────────────
    let challengerScore = 0;
    let opponentScore   = 0;
    const totalRounds = 3;
    const roundHistory = [];

    // ── Scoreboard embed builder ──────────────────────────────────────────────
    function buildScoreboardEmbed(roundNum, description, color = 0x7c6cf0) {
        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`⚔️  BAUBLE BRAWL — Round ${roundNum > totalRounds ? 'FINAL' : roundNum}`)
            .setDescription(description)
            .addFields(
                {
                    name: `${challenger.username}`,
                    value: `${buildHpBar(challengerScore)} **${challengerScore}pt**`,
                    inline: true,
                },
                { name: '╸╸╸', value: '**VS**', inline: true },
                {
                    name: `${opponent.username}`,
                    value: `${buildHpBar(opponentScore)} **${opponentScore}pt**`,
                    inline: true,
                }
            )
            .setFooter({ text: `${wager.toLocaleString()} Baubles at stake` })
            .setTimestamp();
    }

    // ── DM a player to pick their move ────────────────────────────────────────
    async function collectMoveViaDM(player, roundNum) {
        let dmChannel;
        try {
            dmChannel = await player.createDM();
        } catch {
            return null; // Can't DM
        }

        const dmEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`⚔️  Round ${roundNum} — Choose Your Move`)
            .setDescription(
                `**${wager.toLocaleString()} Baubles** are on the line in your battle against **${player.id === challenger.id ? opponent.username : challenger.username}**!\n\n` +
                `Pick your move below. You have **25 seconds**.\n\n` +
                `⚔️ **Cleave** → beats 🛡️ Guard\n` +
                `🛡️ **Guard** → beats 💨 Zephyr\n` +
                `💨 **Zephyr** → beats ☠️ Venom\n` +
                `☠️ **Venom** → beats ⚡ Surge\n` +
                `⚡ **Surge** → beats ⚔️ Cleave`
            )
            .setFooter({ text: 'Your choice is hidden until both players pick!' });

        let dmMsg;
        try {
            dmMsg = await dmChannel.send({
                embeds: [dmEmbed],
                components: [buildMoveRow()],
            });
        } catch {
            return null;
        }

        try {
            const picked = await dmMsg.awaitMessageComponent({
                filter: i => i.user.id === player.id && i.customId.startsWith('battle_move_'),
                componentType: ComponentType.Button,
                time: 25_000,
            });

            // Acknowledge and disable buttons
            const moveKey = MOVE_KEYS.find(k => MOVES[k].id === picked.customId.replace('battle_move_', ''));
            const chosenMove = MOVES[moveKey];

            await picked.update({
                embeds: [new EmbedBuilder()
                    .setColor(0x4ADE80)
                    .setTitle('✅  Move Locked In!')
                    .setDescription(`You chose **${chosenMove.emoji} ${chosenMove.label.replace(/^.\s/, '')}**.\n\nWaiting for your opponent…`)
                ],
                components: [buildMoveRow(true)],
            });

            return moveKey;
        } catch {
            // Timed out — pick a random move as forfeit
            await dmMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle('⏰  Time\'s Up!')
                    .setDescription('You didn\'t pick in time — a random move was played for you!')
                ],
                components: [buildMoveRow(true)],
            });

            return MOVE_KEYS[Math.floor(Math.random() * MOVE_KEYS.length)];
        }
    }

    // ── Round loop ────────────────────────────────────────────────────────────
    // Post "round starting" status in the channel
    let statusMsg = await channel.send({
        embeds: [buildScoreboardEmbed(1, `🏁 **Round 1 begins!** Both players — **check your DMs** to choose your move!\n\nYou have **25 seconds**.`)],
    });

    for (let round = 1; round <= totalRounds; round++) {
        // Update channel status at round start (after round 1, already sent above)
        if (round > 1) {
            await statusMsg.edit({
                embeds: [buildScoreboardEmbed(round,
                    `🏁 **Round ${round} begins!** Both players — **check your DMs** to choose your move!\n\nYou have **25 seconds**.`
                )],
            });
        }

        // Collect both moves simultaneously (both DMs sent at same time)
        const [challengerMoveKey, opponentMoveKey] = await Promise.all([
            collectMoveViaDM(challenger, round),
            collectMoveViaDM(opponent, round),
        ]);

        // Handle DM failure — forfeit that player
        const cMove = challengerMoveKey ?? MOVE_KEYS[Math.floor(Math.random() * MOVE_KEYS.length)];
        const oMove = opponentMoveKey ?? MOVE_KEYS[Math.floor(Math.random() * MOVE_KEYS.length)];

        const result = resolveRound(cMove, oMove);
        const cMoveData = MOVES[cMove];
        const oMoveData = MOVES[oMove];

        let roundColor, resultLine, pointLine;

        if (result === 'draw') {
            roundColor = 0x747f8d;
            resultLine = `**${cMoveData.emoji} ${challenger.username}** vs **${oMoveData.emoji} ${opponent.username}** — It's a **DRAW!** No points scored.`;
            pointLine  = '';
        } else if (result === 'challenger') {
            challengerScore++;
            roundColor = 0x7c6cf0;
            const verb = pickVerb(cMoveData.winVerbs);
            resultLine = `${cMoveData.emoji} **${challenger.username}** ${verb} ${oMoveData.emoji} **${opponent.username}**!`;
            pointLine  = `🏆 **+1 point** to ${challenger.username}`;
        } else {
            opponentScore++;
            roundColor = 0xe8547a;
            const verb = pickVerb(oMoveData.winVerbs);
            resultLine = `${oMoveData.emoji} **${opponent.username}** ${verb} ${cMoveData.emoji} **${challenger.username}**!`;
            pointLine  = `🏆 **+1 point** to ${opponent.username}`;
        }

        roundHistory.push({ round, cMove, oMove, result });

        const roundResultEmbed = new EmbedBuilder()
            .setColor(roundColor)
            .setTitle(`⚔️  Round ${round} — REVEAL!`)
            .setDescription(`${resultLine}\n${pointLine}`)
            .addFields(
                {
                    name: `${challenger.username}`,
                    value: `${buildHpBar(challengerScore)} **${challengerScore}pt**`,
                    inline: true,
                },
                { name: '╸╸╸', value: '**VS**', inline: true },
                {
                    name: `${opponent.username}`,
                    value: `${buildHpBar(opponentScore)} **${opponentScore}pt**`,
                    inline: true,
                }
            )
            .setFooter({ text: `${wager.toLocaleString()} Baubles at stake · Round ${round}/${totalRounds}` })
            .setTimestamp();

        await statusMsg.edit({ embeds: [roundResultEmbed] });

        // Early exit if someone already has 2 points
        if (challengerScore >= 2 || opponentScore >= 2) break;

        // Brief pause between rounds for drama
        if (round < totalRounds) {
            await new Promise(r => setTimeout(r, 2500));
        }
    }

    // ── Determine final winner ────────────────────────────────────────────────
    cData = await Bauble.findOne({ userId: challenger.id });
    oData = await Bauble.findOne({ userId: opponent.id });

    let finalColor, finalTitle, finalDesc, winnerUser, loserUser;

    if (challengerScore > opponentScore) {
        winnerUser = challenger;
        loserUser  = opponent;
    } else if (opponentScore > challengerScore) {
        winnerUser = opponent;
        loserUser  = challenger;
    } else {
        winnerUser = null; // Impossible in current 3-round system but just in case
    }

    if (winnerUser) {
        const isChallenger = winnerUser.id === challenger.id;
        finalColor = 0x4ADE80;
        finalTitle = `🏆  BAUBLE BRAWL — ${winnerUser.username.toUpperCase()} WINS!`;
        finalDesc  = `**${winnerUser.username}** defeated **${loserUser.username}** **${isChallenger ? challengerScore : opponentScore}–${isChallenger ? opponentScore : challengerScore}** and claims the spoils!`;

        if (isChallenger) {
            cData.baubles += wager;
            oData.baubles -= wager;
        } else {
            cData.baubles -= wager;
            oData.baubles += wager;
        }

        await cData.save();
        await oData.save();
    } else {
        // Absolute draw — refund both
        finalColor = 0x747f8d;
        finalTitle = `🤝  BAUBLE BRAWL — DRAW!`;
        finalDesc  = `Both players finished **${challengerScore}–${opponentScore}**. No Baubles were transferred.`;
    }

    // Build round-by-round recap
    const recap = roundHistory.map(h => {
        const cEmoji = MOVES[h.cMove].emoji;
        const oEmoji = MOVES[h.oMove].emoji;
        const resultEmoji = h.result === 'challenger' ? '🏅' : h.result === 'opponent' ? '🥈' : '🤝';
        return `Round ${h.round}: ${cEmoji} vs ${oEmoji} ${resultEmoji}`;
    }).join('\n');

    const finalEmbed = new EmbedBuilder()
        .setColor(finalColor)
        .setTitle(finalTitle)
        .setDescription(finalDesc)
        .addFields(
            { name: '📜 Round Recap', value: recap || '—', inline: false },
            {
                name: `${challenger.username}'s Balance`,
                value: `**${cData.baubles.toLocaleString()}** Baubles`,
                inline: true,
            },
            {
                name: `${opponent.username}'s Balance`,
                value: `**${oData.baubles.toLocaleString()}** Baubles`,
                inline: true,
            }
        )
        .setFooter({ text: 'Rematch? Issue a new challenge!' })
        .setTimestamp();

    await statusMsg.edit({ embeds: [finalEmbed] });
}