const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');

// ─── Card deck ────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function cardString(card) {
    return `${card.rank}${card.suit}`;
}

function cardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
}

function calculateHand(cards) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        const val = cardValue(card.rank);
        total += val;
        if (card.rank === 'A') aces++;
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

// ─── Active games tracking ────────────────────────────────────────────────────
const activeGames = new Set();

// ─── Render hand display ──────────────────────────────────────────────────────
function renderHand(cards, hideFirst = false) {
    if (hideFirst && cards.length > 0) {
        return `🂠 ${cards.slice(1).map(cardString).join(' ')}`;
    }
    return cards.map(cardString).join(' ');
}

// ─── Main game runner ─────────────────────────────────────────────────────────
async function runBlackjackGame(channel, playerId, playerName, betAmount) {
    const deck = createDeck();
    let playerHand = [];
    let dealerHand = [];
    let gameOver = false;
    let playerBust = false;
    let dealerBust = false;

    // Deal initial cards
    playerHand.push(deck.pop(), deck.pop());
    dealerHand.push(deck.pop(), deck.pop());

    const buildEmbed = (showDealerCard = false) => {
        const playerTotal = calculateHand(playerHand);
        const dealerTotal = showDealerCard ? calculateHand(dealerHand) : cardValue(dealerHand[0]);
        
        let color = 0x3498db;
        if (gameOver) {
            if (playerBust) color = 0xe74c3c;
            else if (dealerBust) color = 0x2ecc71;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎰 Blackjack')
            .addFields(
                {
                    name: `💰 Your Hand (${playerTotal})`,
                    value: renderHand(playerHand),
                    inline: false
                },
                {
                    name: `🤖 Dealer's Hand${showDealerCard ? ` (${dealerTotal})` : ''}`,
                    value: renderHand(dealerHand, !showDealerCard),
                    inline: false
                },
                {
                    name: '💸 Bet',
                    value: `${betAmount.toLocaleString()} Baubles`,
                    inline: true
                }
            )
            .setFooter({ text: `Deck: ${deck.length} cards remaining` });

        return embed;
    };

    // Check for natural blackjack
    if (calculateHand(playerHand) === 21 && calculateHand(dealerHand) === 21) {
        // Push (tie)
        const pushEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('🤝 Push!')
            .setDescription(`Both you and the dealer have blackjack. Your ${betAmount.toLocaleString()} Baubles are returned.`);
        await channel.send({ embeds: [pushEmbed] });

        try {
            let baubleData = await Bauble.findOne({ userId: playerId });
            if (!baubleData) baubleData = new Bauble({ userId: playerId, baubles: 0 });
            baubleData.baubles += betAmount; // Return the bet
            baubleData.dailyGameLastCompleted = new Date();
            await baubleData.save();
        } catch (e) {
            console.error('[Blackjack] Error saving baubles:', e);
        }

        activeGames.delete(channel.id);
        return;
    } else if (calculateHand(playerHand) === 21) {
        // Player natural blackjack
        const winAmount = Math.floor(betAmount * 1.5);
        const winEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🎉 Natural Blackjack!')
            .setDescription(`**${playerName}** got blackjack!\n\n**+${winAmount.toLocaleString()}** Baubles (1.5x multiplier)`)
            .addFields(
                {
                    name: 'Your Hand',
                    value: renderHand(playerHand),
                    inline: true
                }
            );
        await channel.send({ embeds: [winEmbed] });

        try {
            let baubleData = await Bauble.findOne({ userId: playerId });
            if (!baubleData) baubleData = new Bauble({ userId: playerId, baubles: 0 });
            baubleData.baubles += winAmount;
            baubleData.dailyGameLastCompleted = new Date();
            await baubleData.save();
        } catch (e) {
            console.error('[Blackjack] Error saving baubles:', e);
        }

        activeGames.delete(channel.id);
        return;
    } else if (calculateHand(dealerHand) === 21) {
        // Dealer natural blackjack
        const lossEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💀 Dealer Blackjack')
            .setDescription(`The dealer has blackjack. You lost **${betAmount.toLocaleString()}** Baubles.`)
            .addFields(
                {
                    name: 'Dealer\'s Hand',
                    value: renderHand(dealerHand),
                    inline: true
                }
            );
        await channel.send({ embeds: [lossEmbed] });
        activeGames.delete(channel.id);
        return;
    }

    const gameMsg = await channel.send({ embeds: [buildEmbed()] });

    // ─── Player turn ──────────────────────────────────────────────────────────
    const hitBtn = new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('Hit')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎲');
    const standBtn = new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('Stand')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️');
    const doubleBtn = new ButtonBuilder()
        .setCustomId('bj_double')
        .setLabel('Double Down')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('2️⃣');

    let row = new ActionRowBuilder().addComponents(hitBtn, standBtn, doubleBtn);

    const collector = gameMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === playerId,
        time: 90_000
    });

    const playerTurn = new Promise(resolve => {
        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                const playerTotal = calculateHand(playerHand);

                if (playerTotal > 21) {
                    playerBust = true;
                    gameOver = true;
                    collector.stop('bust');
                } else if (playerTotal === 21) {
                    gameOver = true;
                    collector.stop('stand');
                } else {
                    await gameMsg.edit({ embeds: [buildEmbed()] }).catch(() => {});
                }
            } else if (i.customId === 'bj_stand') {
                gameOver = true;
                collector.stop('stand');
            } else if (i.customId === 'bj_double') {
                // Double the bet and draw one card
                betAmount *= 2;
                playerHand.push(deck.pop());
                const playerTotal = calculateHand(playerHand);

                if (playerTotal > 21) {
                    playerBust = true;
                    gameOver = true;
                    collector.stop('bust');
                } else {
                    gameOver = true;
                    collector.stop('stand');
                }
            }

            if (gameOver) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(hitBtn).setDisabled(true),
                    ButtonBuilder.from(standBtn).setDisabled(true),
                    ButtonBuilder.from(doubleBtn).setDisabled(true)
                );
                await gameMsg.edit({ components: [disabledRow] }).catch(() => {});
            } else {
                await gameMsg.edit({ components: [row] }).catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (!gameOver && reason === 'time') {
                playerBust = true;
                gameOver = true;
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('⏱️ Time\'s Up!')
                    .setDescription('You took too long to make a decision. You lose.');
                await channel.send({ embeds: [timeoutEmbed] });
                activeGames.delete(channel.id);
                resolve();
                return;
            }
            resolve();
        });
    });

    await playerTurn;

    if (!gameOver) return;

    // ─── Dealer turn ──────────────────────────────────────────────────────────
    if (playerBust) {
        const bustEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💥 Bust!')
            .setDescription(`You went over 21 and lost **${betAmount.toLocaleString()}** Baubles.`)
            .addFields(
                {
                    name: 'Your Hand',
                    value: `${renderHand(playerHand)} (${calculateHand(playerHand)})`,
                    inline: true
                }
            );
        await gameMsg.edit({ embeds: [buildEmbed(true)] }).catch(() => {});
        await channel.send({ embeds: [bustEmbed] });
        activeGames.delete(channel.id);
        return;
    }

    // Dealer plays
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    while (calculateHand(dealerHand) < 17) {
        dealerHand.push(deck.pop());
        await delay(1000);
        await gameMsg.edit({ embeds: [buildEmbed(true)] }).catch(() => {});
    }

    const playerTotal = calculateHand(playerHand);
    const dealerTotal = calculateHand(dealerHand);

    // ─── Determine winner ─────────────────────────────────────────────────────
    let result = '';
    let winnings = 0;
    let embedColor = 0x95a5a6;

    if (dealerTotal > 21) {
        dealerBust = true;
        winnings = betAmount * 2;
        result = `Dealer busted! You win **${winnings.toLocaleString()}** Baubles!`;
        embedColor = 0x2ecc71;
    } else if (playerTotal > dealerTotal) {
        winnings = betAmount * 2;
        result = `You beat the dealer! You win **${winnings.toLocaleString()}** Baubles!`;
        embedColor = 0x2ecc71;
    } else if (playerTotal === dealerTotal) {
        winnings = betAmount;
        result = `Push! Your **${betAmount.toLocaleString()}** Baubles are returned.`;
        embedColor = 0xf39c12;
    } else {
        result = `Dealer wins. You lost **${betAmount.toLocaleString()}** Baubles.`;
        embedColor = 0xe74c3c;
    }

    const finalEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('🏁 Game Over')
        .setDescription(result)
        .addFields(
            {
                name: 'Your Hand',
                value: `${renderHand(playerHand)} (${playerTotal})`,
                inline: true
            },
            {
                name: 'Dealer\'s Hand',
                value: `${renderHand(dealerHand)} (${dealerTotal})`,
                inline: true
            }
        );

    await gameMsg.edit({ embeds: [buildEmbed(true)] }).catch(() => {});
    await channel.send({ embeds: [finalEmbed] });

    // ─── Save winnings ────────────────────────────────────────────────────────
    try {
        let baubleData = await Bauble.findOne({ userId: playerId });
        if (!baubleData) baubleData = new Bauble({ userId: playerId, baubles: 0 });
        baubleData.baubles += winnings;
        baubleData.dailyGameLastCompleted = new Date();
        await baubleData.save();
    } catch (e) {
        console.error('[Blackjack] Error saving baubles:', e);
    }

    activeGames.delete(channel.id);
}

// ─── Bet selection ────────────────────────────────────────────────────────────
async function selectBet(interaction, channel) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Fetch user's bauble balance
    let baubleData = await Bauble.findOne({ userId });
    const balance = baubleData?.baubles ?? 0;

    if (balance < 100) {
        return interaction.reply({
            content: `❌ You need at least 100 Baubles to play. You have **${balance}** Baubles.`,
            ephemeral: true
        });
    }

    const betOptions = [
        { label: '100 Baubles', value: '100' },
        { label: '500 Baubles', value: '500' },
        { label: '1,000 Baubles', value: '1000' },
        { label: '5,000 Baubles', value: '5000' },
        { label: '10,000 Baubles', value: '10000' }
    ];

    const betBtn100 = new ButtonBuilder()
        .setCustomId('bj_bet_100')
        .setLabel('100')
        .setStyle(ButtonStyle.Secondary);
    const betBtn500 = new ButtonBuilder()
        .setCustomId('bj_bet_500')
        .setLabel('500')
        .setStyle(ButtonStyle.Secondary);
    const betBtn1000 = new ButtonBuilder()
        .setCustomId('bj_bet_1000')
        .setLabel('1000')
        .setStyle(ButtonStyle.Secondary);
    const betBtn5000 = new ButtonBuilder()
        .setCustomId('bj_bet_5000')
        .setLabel('5000')
        .setStyle(ButtonStyle.Secondary);
    const betBtn10000 = new ButtonBuilder()
        .setCustomId('bj_bet_10000')
        .setLabel('10000')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(
        betBtn100,
        betBtn500,
        betBtn1000,
        betBtn5000,
        betBtn10000
    );

    const betEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎰 Blackjack — Select Your Bet')
        .setDescription(`**Your Balance:** ${balance.toLocaleString()} Baubles\n\nChoose your bet amount:`)
        .setFooter({ text: 'Bet selection times out in 1 minute' });

    const betMsg = await interaction.reply({
        embeds: [betEmbed],
        components: [row],
        fetchReply: true
    });

    const betCollector = betMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === userId,
        time: 60_000
    });

    betCollector.on('collect', async i => {
        const betAmount = parseInt(i.customId.split('_')[2]);

        if (betAmount > balance) {
            return i.reply({
                content: `❌ You don't have enough Baubles! You need ${betAmount.toLocaleString()} but only have ${balance.toLocaleString()}.`,
                ephemeral: true
            });
        }

        // Deduct bet from balance
        baubleData.baubles -= betAmount;
        await baubleData.save();

        // Disable all buttons
        const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(betBtn100).setDisabled(true),
            ButtonBuilder.from(betBtn500).setDisabled(true),
            ButtonBuilder.from(betBtn1000).setDisabled(true),
            ButtonBuilder.from(betBtn5000).setDisabled(true),
            ButtonBuilder.from(betBtn10000).setDisabled(true)
        );
        await betMsg.edit({ components: [disabledRow] }).catch(() => {});

        await i.deferUpdate();
        betCollector.stop('selected');

        // Start the game
        if (activeGames.has(channel.id)) {
            return channel.send('⚠️ A Blackjack game is already running in this channel!');
        }
        activeGames.add(channel.id);

        runBlackjackGame(channel, userId, username, betAmount).catch(err => {
            console.error('[Blackjack] Game error:', err);
            activeGames.delete(channel.id);
            channel.send({ content: '⚠️ An unexpected error ended the game. Sorry!' });
        });
    });

    betCollector.on('end', async (_, reason) => {
        if (reason !== 'selected') {
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(betBtn100).setDisabled(true),
                ButtonBuilder.from(betBtn500).setDisabled(true),
                ButtonBuilder.from(betBtn1000).setDisabled(true),
                ButtonBuilder.from(betBtn5000).setDisabled(true),
                ButtonBuilder.from(betBtn10000).setDisabled(true)
            );
            await betMsg.edit({ components: [disabledRow] }).catch(() => {});
        }
    });
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack and win Baubles!'),

    async execute(interaction) {
        selectBet(interaction, interaction.channel).catch(err => {
            console.error('[Blackjack] Setup error:', err);
        });
    },

    async executePrefix(message) {
        selectBet({ user: message.author, reply: async (opts) => message.reply(opts) }, message.channel).catch(err => {
            console.error('[Blackjack] Setup error:', err);
        });
    }
};
