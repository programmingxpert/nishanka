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

// ─── Card helpers ─────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS)
        for (const rank of RANKS)
            deck.push({ suit, rank });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
}

function calculateHand(cards) {
    let total = 0, aces = 0;
    for (const card of cards) {
        total += cardValue(card.rank);
        if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function renderCards(cards, hideFirst = false) {
    if (!cards || cards.length === 0) return '`[empty]`';
    return cards.map((c, i) =>
        (hideFirst && i === 0) ? '`[?]`' : `\`[${c.rank}${c.suit}]\``
    ).join(' ');
}

const delay = ms => new Promise(r => setTimeout(r, ms));
function genId() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }

// ─── Global state ─────────────────────────────────────────────────────────────
const sessions   = new Map(); // gameId -> session object
const busyUsers  = new Set(); // userId -> prevents joining multiple games

// ─── Embed builders ───────────────────────────────────────────────────────────
function buildLobbyEmbed(session) {
    const lines = session.players.map((p, i) => {
        const betStr = p.bet > 0
            ? `✅ **${p.bet.toLocaleString()} Baubles**`
            : '⌛ *selecting bet...*';
        return `\`${i + 1}.\` **${p.username}** — ${betStr}`;
    });

    const ready = session.players.filter(p => p.bet > 0).length;
    const need  = Math.max(0, 2 - ready);

    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🃏 Multiplayer Blackjack — Lobby')
        .setDescription(
            `**Host:** ${session.hostName}\n\n` +
            `**Players (${session.players.length}/6):**\n` +
            (lines.length ? lines.join('\n') : '*No players yet — be the first to join!*') +
            `\n\n${need === 0 ? '✅ Ready! Host can press **Start**.' : `⏳ Need **${need}** more player${need !== 1 ? 's' : ''} with bets.`}`
        )
        .setFooter({ text: 'Click "Join & Bet" to enter • Lobby closes in 60s or when host presses Start' });
}

function buildGameEmbed(session, desc = '') {
    const showDealer = session.phase === 'dealer' || session.phase === 'ended';
    const dTotal = showDealer
        ? calculateHand(session.dealerHand)
        : (session.dealerHand[1] ? cardValue(session.dealerHand[1].rank) : 0);

    const embed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setTitle('🃏 Multiplayer Blackjack');

    if (desc) embed.setDescription(desc);

    embed.addFields({
        name: showDealer ? `🤖 Dealer (${dTotal})` : `🤖 Dealer (showing ${dTotal})`,
        value: session.dealerHand.length
            ? renderCards(session.dealerHand, !showDealer)
            : '`[waiting]`',
        inline: false
    });

    for (let i = 0; i < session.players.length; i++) {
        const p   = session.players[i];
        const tot = p.hand.length ? calculateHand(p.hand) : 0;
        const isActive = session.phase === 'playing' && i === session.currentIndex;

        let icon = '⏳';
        if (p.naturalBJ)          icon = '🌟';
        else if (p.busted)        icon = '💥';
        else if (p.stood)         icon = '✋';
        else if (isActive)        icon = '▶️';

        embed.addFields({
            name: `${icon} ${p.username}${isActive ? '  ← YOUR TURN' : ''} (${tot})`,
            value: (p.hand.length ? renderCards(p.hand) : '`[waiting for deal]`') +
                `\nBet: **${p.bet.toLocaleString()}** Baubles` +
                (p.doubled ? '  ⬆️ *Doubled*' : '') +
                (p.naturalBJ ? '  *(Natural BJ!)*' : ''),
            inline: false
        });
    }

    return embed;
}

// ─── Turn runner ──────────────────────────────────────────────────────────────
async function runTurn(session) {
    // Advance past already-done players
    while (
        session.currentIndex < session.players.length &&
        (session.players[session.currentIndex].stood ||
         session.players[session.currentIndex].busted)
    ) {
        session.currentIndex++;
    }

    if (session.currentIndex >= session.players.length) {
        return runDealerTurn(session);
    }

    const p   = session.players[session.currentIndex];
    const gid = session.id;
    const { gameMsg } = session;

    const hitBtn = new ButtonBuilder()
        .setCustomId(`mbj_hit_${gid}`)
        .setLabel('Hit')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎲');
    const standBtn = new ButtonBuilder()
        .setCustomId(`mbj_stand_${gid}`)
        .setLabel('Stand')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️');
    const doubleBtn = new ButtonBuilder()
        .setCustomId(`mbj_double_${gid}`)
        .setLabel('Double Down')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('2️⃣')
        .setDisabled(p.hand.length !== 2);  // only available on first action

    const makeRow = (dblDisabled = false) => new ActionRowBuilder().addComponents(
        ButtonBuilder.from(hitBtn),
        ButtonBuilder.from(standBtn),
        ButtonBuilder.from(doubleBtn).setDisabled(dblDisabled || p.hand.length !== 2)
    );

    await gameMsg.edit({
        embeds: [buildGameEmbed(session,
            `⏳ **${p.username}**, it's your turn! Hand total: **${calculateHand(p.hand)}**\nHit, Stand, or Double Down.`
        )],
        components: [makeRow()]
    }).catch(() => {});

    await new Promise(resolve => {
        const collector = gameMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === p.userId && i.customId.endsWith(`_${gid}`),
            time: 90_000
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const action = i.customId.split('_')[1]; // hit | stand | double

            if (action === 'hit') {
                p.hand.push(session.deck.pop());
                const tot = calculateHand(p.hand);

                if (tot > 21) {
                    p.busted = true;
                    collector.stop('done');
                } else if (tot === 21) {
                    p.stood = true; // auto-stand on 21
                    collector.stop('done');
                } else {
                    // After first hit, double is no longer available
                    await gameMsg.edit({
                        embeds: [buildGameEmbed(session,
                            `⏳ **${p.username}** hit! Total now **${tot}**. Hit again or Stand?`
                        )],
                        components: [makeRow(true)]
                    }).catch(() => {});
                }

            } else if (action === 'stand') {
                p.stood = true;
                collector.stop('done');

            } else if (action === 'double') {
                const data = await Bauble.findOne({ userId: p.userId });
                const bal  = data?.baubles ?? 0;

                if (bal < p.bet) {
                    // Not enough baubles — treat as stand
                    await i.followUp({ content: '❌ Not enough Baubles to double down! Auto-standing.', ephemeral: true }).catch(() => {});
                    p.stood = true;
                } else {
                    await Bauble.updateOne({ userId: p.userId }, { $inc: { baubles: -p.bet } });
                    p.bet    *= 2;
                    p.doubled = true;
                    p.hand.push(session.deck.pop());
                    const tot = calculateHand(p.hand);
                    if (tot > 21) p.busted = true;
                    else          p.stood  = true;
                }
                collector.stop('done');
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                p.stood = true; // auto-stand on timeout
            }
            resolve();
        });
    });

    // Disable buttons between turns
    await gameMsg.edit({
        components: [new ActionRowBuilder().addComponents(
            ButtonBuilder.from(hitBtn).setDisabled(true),
            ButtonBuilder.from(standBtn).setDisabled(true),
            ButtonBuilder.from(doubleBtn).setDisabled(true)
        )]
    }).catch(() => {});

    await delay(700);

    session.currentIndex++;
    return runTurn(session);
}

// ─── Dealer turn ──────────────────────────────────────────────────────────────
async function runDealerTurn(session) {
    session.phase = 'dealer';

    await session.gameMsg.edit({
        embeds: [buildGameEmbed(session, '🤖 All players done. Dealer reveals their hole card...')],
        components: []
    }).catch(() => {});
    await delay(1800);

    while (calculateHand(session.dealerHand) < 17) {
        session.dealerHand.push(session.deck.pop());
        await session.gameMsg.edit({
            embeds: [buildGameEmbed(session,
                `🤖 Dealer draws... total now **${calculateHand(session.dealerHand)}**`
            )],
            components: []
        }).catch(() => {});
        await delay(1400);
    }

    return showResults(session);
}

// ─── Results ──────────────────────────────────────────────────────────────────
async function showResults(session) {
    session.phase = 'ended';
    const dTotal  = calculateHand(session.dealerHand);
    const channel = session.gameMsg.channel;

    const lines = [];

    for (const p of session.players) {
        if (!p.hand.length) { busyUsers.delete(p.userId); continue; }

        const pTotal = calculateHand(p.hand);
        let result = '', payout = 0;

        if (p.naturalBJ && dTotal !== 21) {
            // Natural BJ vs non-BJ dealer → 3:2
            payout = Math.floor(p.bet * 2.5);
            result = `🌟 **Natural Blackjack!** — Won **${(payout - p.bet).toLocaleString()} Baubles** (3:2 payout)`;
        } else if (p.naturalBJ && dTotal === 21) {
            // Both BJ → push
            payout = p.bet;
            result = `🤝 Both Blackjack — Push, bet returned`;
        } else if (p.busted) {
            result = `💥 Busted **(${pTotal})** — lost **${p.bet.toLocaleString()} Baubles**`;
        } else if (dTotal > 21) {
            payout = p.bet * 2;
            result = `🎉 Dealer busted! — Won **${p.bet.toLocaleString()} Baubles**`;
        } else if (pTotal > dTotal) {
            payout = p.bet * 2;
            result = `🏆 Won! **(${pTotal} vs ${dTotal})** — Won **${p.bet.toLocaleString()} Baubles**`;
        } else if (pTotal === dTotal) {
            payout = p.bet;
            result = `🤝 Push **(${pTotal})** — bet returned`;
        } else {
            result = `❌ Lost **(${pTotal} vs ${dTotal})** — lost **${p.bet.toLocaleString()} Baubles**`;
        }

        if (payout > 0) {
            await Bauble.findOneAndUpdate(
                { userId: p.userId },
                { $inc: { baubles: payout } },
                { upsert: true }
            ).catch(() => {});
        }

        lines.push(`**${p.username}:** ${result}`);
        busyUsers.delete(p.userId);
    }

    sessions.delete(session.id);

    // Final game embed
    await session.gameMsg.edit({
        embeds: [buildGameEmbed(session, '✅ Game over! See results below.')],
        components: []
    }).catch(() => {});

    // Results embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x2b2d42)
        .setTitle('🃏 Multiplayer Blackjack — Results')
        .setDescription(
            `🤖 **Dealer:** ${renderCards(session.dealerHand)} **(${dTotal}${dTotal > 21 ? ' — BUST!' : ''})**\n\n` +
            lines.join('\n')
        );

    for (const p of session.players) {
        if (p.hand.length) {
            resultEmbed.addFields({
                name: p.username,
                value: renderCards(p.hand) + ` **(${calculateHand(p.hand)})**`,
                inline: true
            });
        }
    }

    await channel.send({ embeds: [resultEmbed] });
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
async function startLobby(channel, host) {
    if (busyUsers.has(host.id)) {
        return { error: '❌ You are already in a game!' };
    }

    const session = {
        id:          genId(),
        hostId:      host.id,
        hostName:    host.username,
        phase:       'lobby',
        players:     [],
        deck:        createDeck(),
        dealerHand:  [],
        currentIndex: 0,
        gameMsg:     null,
        lobbyMsg:    null,
    };

    sessions.set(session.id, session);
    busyUsers.add(host.id); // lock host from starting another game
    const gid = session.id;

    // ── Lobby buttons ──
    const joinBtn = new ButtonBuilder()
        .setCustomId(`mbj_join_${gid}`)
        .setLabel('Join & Bet')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🃏');
    const startBtn = new ButtonBuilder()
        .setCustomId(`mbj_start_${gid}`)
        .setLabel('Start Game')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('▶️');
    const lobbyRow = new ActionRowBuilder().addComponents(joinBtn, startBtn);

    const lobbyMsg = await channel.send({ embeds: [buildLobbyEmbed(session)], components: [lobbyRow] });
    session.lobbyMsg = lobbyMsg;

    const pendingBet = new Set(); // users currently in bet-selection flow

    const lobbyCollector = lobbyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: i => i.customId.endsWith(`_${gid}`)
    });

    await new Promise(resolve => {
        lobbyCollector.on('collect', async i => {

            // ── JOIN button ──
            if (i.customId === `mbj_join_${gid}`) {
                const uid = i.user.id;

                if (session.players.find(p => p.userId === uid)) {
                    return i.reply({ content: '❌ You already joined this lobby!', ephemeral: true });
                }
                if (busyUsers.has(uid) && uid !== session.hostId) {
                    return i.reply({ content: '❌ You are already in another game!', ephemeral: true });
                }
                if (session.players.length >= 6) {
                    return i.reply({ content: '❌ Lobby is full (6 players max)!', ephemeral: true });
                }
                if (pendingBet.has(uid)) {
                    return i.reply({ content: '❌ You already have a bet prompt open — select your bet!', ephemeral: true });
                }

                const data    = await Bauble.findOne({ userId: uid });
                const balance = data?.baubles ?? 0;
                if (balance < 100) {
                    return i.reply({ content: `❌ Need at least **100 Baubles** to play. You have **${balance.toLocaleString()}**.`, ephemeral: true });
                }

                // Add player (bet = 0 = pending)
                session.players.push({
                    userId: uid, username: i.user.username,
                    bet: 0, hand: [],
                    stood: false, busted: false, doubled: false, naturalBJ: false
                });
                busyUsers.add(uid);
                pendingBet.add(uid);

                await i.deferUpdate();
                await lobbyMsg.edit({ embeds: [buildLobbyEmbed(session)], components: [lobbyRow] }).catch(() => {});

                // ── Inline bet selection message (visible to all, only interactive for this user) ──
                const maxCap  = Math.min(balance, 50000);
                const amts    = [100, 500, 1000, 5000];
                const betBtns = amts.map(b =>
                    new ButtonBuilder()
                        .setCustomId(`mbjbet_${b}_${gid}_${uid}`)
                        .setLabel(b.toLocaleString())
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(balance < b)
                );
                const maxBetBtn = new ButtonBuilder()
                    .setCustomId(`mbjbet_max_${gid}_${uid}`)
                    .setLabel(`Max (${maxCap.toLocaleString()})`)
                    .setStyle(ButtonStyle.Danger);

                const betRow = new ActionRowBuilder().addComponents(...betBtns, maxBetBtn);

                const betMsg = await channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle(`💰 ${i.user.username} — Choose Your Bet`)
                        .setDescription(`Balance: **${balance.toLocaleString()}** Baubles\n\n_You have 30 seconds to lock in your bet._`)
                    ],
                    components: [betRow]
                });

                const betCollector = betMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter:        bi => bi.user.id === uid && bi.customId.includes(`_${gid}_${uid}`),
                    time:          30_000,
                    max:           1
                });

                betCollector.on('collect', async bi => {
                    await bi.deferUpdate();

                    const betAmount = bi.customId.startsWith('mbjbet_max_')
                        ? maxCap
                        : parseInt(bi.customId.split('_')[1]);

                    // Deduct bet immediately
                    await Bauble.findOneAndUpdate(
                        { userId: uid },
                        { $inc: { baubles: -betAmount } },
                        { upsert: true }
                    ).catch(() => {});

                    const player = session.players.find(p => p.userId === uid);
                    if (player) player.bet = betAmount;

                    pendingBet.delete(uid);
                    await betMsg.delete().catch(() => {});
                    await lobbyMsg.edit({ embeds: [buildLobbyEmbed(session)], components: [lobbyRow] }).catch(() => {});

                    // Ephemeral-like confirmation: tiny send, auto-deletes in 5s
                    channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setDescription(`✅ **${i.user.username}** locked in a bet of **${betAmount.toLocaleString()} Baubles**!`)
                        ]
                    }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
                });

                betCollector.on('end', async (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        // Timeout — remove from game, no refund needed (they hadn't bet yet)
                        pendingBet.delete(uid);
                        session.players = session.players.filter(p => p.userId !== uid);
                        busyUsers.delete(uid);
                        await betMsg.delete().catch(() => {});
                        await lobbyMsg.edit({ embeds: [buildLobbyEmbed(session)], components: [lobbyRow] }).catch(() => {});
                    }
                });

            // ── START button ──
            } else if (i.customId === `mbj_start_${gid}`) {
                if (i.user.id !== session.hostId) {
                    return i.reply({ content: '❌ Only the host can start the game!', ephemeral: true });
                }
                const ready = session.players.filter(p => p.bet > 0).length;
                if (ready < 2) {
                    return i.reply({ content: `❌ Need at least **2 players with bets** to start. Have **${ready}** so far.`, ephemeral: true });
                }
                await i.deferUpdate();
                lobbyCollector.stop('started');
            }
        });

        lobbyCollector.on('end', (_, reason) => resolve(reason));
    });

    // ── Post-lobby: disable buttons ──
    const disabledLobbyRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(joinBtn).setDisabled(true),
        ButtonBuilder.from(startBtn).setDisabled(true)
    );

    // Filter to only confirmed (bet > 0) players
    session.players = session.players.filter(p => p.bet > 0);

    // Release any busy entries for users who were in lobby but didn't bet in time
    // (already handled by betCollector timeout, but safety net for host)
    if (!session.players.find(p => p.userId === session.hostId)) {
        busyUsers.delete(session.hostId);
    }

    if (session.players.length < 2) {
        // Refund and cancel
        for (const p of session.players) {
            await Bauble.findOneAndUpdate({ userId: p.userId }, { $inc: { baubles: p.bet } }).catch(() => {});
            busyUsers.delete(p.userId);
        }
        sessions.delete(gid);

        await lobbyMsg.edit({
            embeds: [new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Game Cancelled')
                .setDescription('Not enough players with locked-in bets. All bets have been refunded.')
            ],
            components: [disabledLobbyRow]
        }).catch(() => {});
        return;
    }

    await lobbyMsg.edit({
        embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Game Starting!')
            .setDescription(
                session.players.map(p =>
                    `**${p.username}** — ${p.bet.toLocaleString()} Baubles`
                ).join('\n')
            )
        ],
        components: [disabledLobbyRow]
    }).catch(() => {});

    await delay(1500);

    // ── Deal initial hands ──
    for (const p of session.players) {
        p.hand.push(session.deck.pop(), session.deck.pop());
    }
    session.dealerHand.push(session.deck.pop(), session.deck.pop());
    session.phase = 'playing';

    // Mark naturals
    for (const p of session.players) {
        if (calculateHand(p.hand) === 21) {
            p.naturalBJ = true;
            p.stood     = true;
        }
    }

    // Send game embed
    const gameMsg = await channel.send({
        embeds: [buildGameEmbed(session, '🃏 Cards dealt! Taking turns in order...')],
        components: []
    });
    session.gameMsg = gameMsg;

    await delay(1000);

    // ── Run turns → dealer → results ──
    await runTurn(session).catch(err => {
        console.error('[MBlackjack] Fatal game error:', err);
        for (const p of session.players) busyUsers.delete(p.userId);
        busyUsers.delete(session.hostId);
        sessions.delete(session.id);
        channel.send('⚠️ A fatal error ended the game. Please contact an admin to sort out bets.').catch(() => {});
    });

    // Safety: clear host busy flag after game fully ends
    busyUsers.delete(session.hostId);
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'casino',
    aliases:  ['mbj'],
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('mblackjack')
        .setDescription('Start a multiplayer Blackjack table. Up to 6 players, each with their own bet!'),

    async execute(interaction) {
        if (busyUsers.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ You are already in a game!', ephemeral: true });
        }
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x3498db)
                .setDescription('🃏 Opening Multiplayer Blackjack lobby...')
            ],
            ephemeral: true
        });
        await startLobby(interaction.channel, interaction.user);
    },

    async executePrefix(message) {
        if (busyUsers.has(message.author.id)) {
            return message.reply('❌ You are already in a game!');
        }
        await startLobby(message.channel, message.author);
    }
};
