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
    // Shuffle the deck (Fisher-Yates style for better randomization)
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
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        total += cardValue(card.rank);
        if (card.rank === 'A') aces++;
    }

    // Adjust Aces from 11 to 1 if total exceeds 21
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

// ─── Draw ANSI styled cards ───────────────────────────────────────────────────
function drawCardsANSI(cards, hideFirst = false) {
    if (!cards || cards.length === 0) return 'No cards';
    
    let result = '';
    for (let i = 0; i < cards.length; i++) {
        if (hideFirst && i === 0) {
            result += '`[ ? ]` ';
        } else {
            const card = cards[i];
            result += `\`[${card.rank}${card.suit}]\` `;
        }
    }
    return result.trim() + '\n';
}

// ─── Active games tracking (keyed by userId — allows multiple concurrent games per channel) ───
const activeGames = new Set();

function updateBlackjackCache(client, playerId, data) {
    if (client && client.activeCasinoGames) {
        const game = client.activeCasinoGames.get(`blackjack_${playerId}`);
        if (game) {
            Object.assign(game, data);
        }
    }
}

function deleteBlackjackCache(client, playerId) {
    activeGames.delete(playerId);
    if (client && client.activeCasinoGames) {
        client.activeCasinoGames.delete(`blackjack_${playerId}`);
    }
}

// ─── Database helper ──────────────────────────────────────────────────────────
async function adjustBaubles(userId, amount) {
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) {
        baubleData = new Bauble({ userId, baubles: 0 });
    }
    baubleData.baubles += amount;
    if (amount > 0) {
        baubleData.dailyGameLastCompleted = new Date();
    }
    await baubleData.save();
    return baubleData.baubles;
}

async function handleStreak(userId, isWin, channel = null) {
    let baubleData = await Bauble.findOne({ userId });
    if (!baubleData) return 0;
    
    baubleData.blackjackPlayed = (baubleData.blackjackPlayed || 0) + 1;

    if (isWin === true) {
        baubleData.blackjackStreak = (baubleData.blackjackStreak || 0) + 1;
        baubleData.blackjackWins = (baubleData.blackjackWins || 0) + 1;
        if (baubleData.blackjackStreak > (baubleData.blackjackMaxStreak || 0)) {
            baubleData.blackjackMaxStreak = baubleData.blackjackStreak;
        }
        
        if (channel && channel.client) {
            const { checkAndAwardAchievement } = require('../../utils/achievements');
            const targetMsg = { channel };
            if (baubleData.blackjackWins >= 10) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_win_10', targetMsg);
            }
            if (baubleData.blackjackWins >= 50) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_win_50', targetMsg);
            }
            if (baubleData.blackjackWins >= 100) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_pro', targetMsg);
            }
            if (baubleData.blackjackWins >= 250) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_win_250', targetMsg);
            }
            if (baubleData.blackjackWins >= 500) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_500', targetMsg);
            }
            if (baubleData.blackjackWins >= 1000) {
                await checkAndAwardAchievement(channel.client, userId, 'blackjack_win_1000', targetMsg);
            }
            if (baubleData.baubles >= 1000000) {
                await checkAndAwardAchievement(channel.client, userId, 'economy_millionaire', targetMsg);
            }
            if (baubleData.baubles >= 5000000) {
                await checkAndAwardAchievement(channel.client, userId, 'economy_billionaire', targetMsg);
            }
            if (baubleData.baubles >= 10000000) {
                await checkAndAwardAchievement(channel.client, userId, 'economy_emperor', targetMsg);
            }
            if (baubleData.baubles >= 50000000) {
                await checkAndAwardAchievement(channel.client, userId, 'economy_god', targetMsg);
            }
            // jack_of_all_trades: track today's blackjack win
            const _bjToday = new Date().toISOString().slice(0, 10);
            if (baubleData.jackOfAllTradesDate !== _bjToday) {
                baubleData.jackOfAllTradesDate = _bjToday;
                baubleData.jackOfAllTradesWins = [];
            }
            if (!baubleData.jackOfAllTradesWins.includes('blackjack')) {
                baubleData.jackOfAllTradesWins.push('blackjack');
            }
            const _bjNeeded = ['coinflip', 'slots', 'blackjack', 'gamble', 'mines'];
            if (_bjNeeded.every(g => baubleData.jackOfAllTradesWins.includes(g))) {
                await checkAndAwardAchievement(channel.client, userId, 'jack_of_all_trades', targetMsg);
            }
        }
    } else if (isWin === false) {
        baubleData.blackjackStreak = 0;
    }
    // tie = no streak change

    if (channel && channel.client) {
        const { checkAndAwardAchievement } = require('../../utils/achievements');
        const targetMsg = { channel };
        if (baubleData.blackjackPlayed >= 100) {
            await checkAndAwardAchievement(channel.client, userId, 'blackjack_play_100', targetMsg);
        }
    }

    await baubleData.save();
    return baubleData.blackjackStreak;
}

// ─── Main game runner ─────────────────────────────────────────────────────────
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runBlackjackGame(channel, playerId, playerName, betAmount) {
    const deck = createDeck();
    let playerHand1 = [];
    let playerHand2 = [];
    let dealerHand = [];
    
    let isSplit = false;
    let currentHandIndex = 0; // 0 = hand 1, 1 = hand 2
    
    let betHand1 = betAmount;
    let betHand2 = 0;
    
    let doubleHand1 = false;
    let doubleHand2 = false;
    
    let insuranceBought = false;
    let insuranceCost = 0;
    let mainGameEnded = false;
    
    // Deal initial cards
    playerHand1.push(deck.pop(), deck.pop());
    dealerHand.push(deck.pop(), deck.pop());

    const client = channel.client;
    if (client) {
        if (!client.activeCasinoGames) {
            client.activeCasinoGames = new Map();
        }
        client.activeCasinoGames.set(`blackjack_${playerId}`, {
            userId: playerId,
            username: playerName,
            type: 'blackjack',
            bet: betAmount,
            playerHand: playerHand1,
            playerHand2: playerHand2,
            dealerHand: dealerHand,
            nextCards: deck.slice(-10).reverse(),
            timestamp: Date.now()
        });
    }

    try {
        const { sendGameSolutionAlert } = require('../../utils/webhookDispatcher');
        const nextCardsPreview = deck.slice(-10).reverse().map(c => `${c.rank}${c.suit}`).join(', ');
        sendGameSolutionAlert({
            type: 'blackjack',
            userId: playerId,
            username: playerName,
            bet: betAmount,
            details: `Blackjack game in channel #${channel.name || 'unknown'} (${channel.id})`,
            solution: `Dealer Hand: ${dealerHand.map(c => `${c.rank}${c.suit}`).join(', ')}\n` +
                      `Player Hand: ${playerHand1.map(c => `${c.rank}${c.suit}`).join(', ')}\n` +
                      `Next 10 Cards in Deck: ${nextCardsPreview}`
        }).catch(err => console.error('Failed to send game solution webhook:', err));
    } catch (e) {
        console.error('Error dispatching game solution webhook:', e);
    }

    const getBalance = async () => {
        const data = await Bauble.findOne({ userId: playerId });
        return data?.baubles ?? 0;
    };

    let currentDbBalance = await getBalance();

    // 1. OFFER INSURANCE IF DEALER SHOWS AN ACE
    // Dealer upcard is dealerHand[1] (since dealerHand[0] is face down)
    if (dealerHand[1].rank === 'A' && currentDbBalance >= Math.floor(betAmount / 2)) {
        insuranceCost = Math.floor(betAmount / 2);
        
        const insEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('🛡️ Buy Insurance?')
            .setDescription(`The dealer shows an **Ace**. Would you like to buy insurance for **${insuranceCost.toLocaleString()}** Baubles?\n*(Insurance pays 2:1 if the dealer has Blackjack).*`)
            .addFields(
                { name: 'Your Hand', value: drawCardsANSI(playerHand1), inline: true },
                { name: "Dealer's Upcard", value: drawCardsANSI([dealerHand[1]]), inline: true }
            );

        const insBtnYes = new ButtonBuilder().setCustomId('bj_ins_yes').setLabel('Buy Insurance').setStyle(ButtonStyle.Success);
        const insBtnNo = new ButtonBuilder().setCustomId('bj_ins_no').setLabel('Decline').setStyle(ButtonStyle.Danger);
        const insRow = new ActionRowBuilder().addComponents(insBtnYes, insBtnNo);

        const insMsg = await channel.send({ embeds: [insEmbed], components: [insRow] });

        try {
            const insInteraction = await insMsg.awaitMessageComponent({
                filter: i => i.user.id === playerId,
                time: 30_000
            });

            await insInteraction.deferUpdate();

            if (insInteraction.customId === 'bj_ins_yes') {
                insuranceBought = true;
                await adjustBaubles(playerId, -insuranceCost);
                currentDbBalance -= insuranceCost;
                
                const insBoughtEmbed = EmbedBuilder.from(insEmbed)
                    .setDescription(`🛡️ Insurance bought for **${insuranceCost.toLocaleString()}** Baubles.\nChecking dealer's hand...`);
                await insMsg.edit({ embeds: [insBoughtEmbed], components: [] });
            } else {
                await insMsg.delete().catch(() => {});
            }
        } catch (e) {
            await insMsg.delete().catch(() => {});
        }

        if (insuranceBought) {
            const dealerTotal = calculateHand(dealerHand);
            if (dealerTotal === 21) {
                const playerTotal = calculateHand(playerHand1);
                const isPush = playerTotal === 21;
                
                const insPayout = insuranceCost * 3;
                let finalPayout = insPayout;
                
                let resultText = `The dealer has **Blackjack**! You lost your main bet of **${betAmount.toLocaleString()}** Baubles, but won **${insPayout.toLocaleString()}** Baubles from your Insurance!`;
                let embedColor = 0xf39c12; // Orange for break even

                if (isPush) {
                    finalPayout += betAmount;
                    resultText = `Both you and the dealer have **Blackjack**! Your main bet pushed (returned), and you won your Insurance! You received **${finalPayout.toLocaleString()}** Baubles back.`;
                    embedColor = 0x2ecc71; // Win
                }

                await adjustBaubles(playerId, finalPayout);

                const insResultEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle('🏁 Dealer Blackjack (Insurance Payoff)')
                    .setDescription(resultText)
                    .addFields(
                        { name: 'Your Hand', value: drawCardsANSI(playerHand1) + ` (${playerTotal})`, inline: true },
                        { name: "Dealer's Hand", value: drawCardsANSI(dealerHand) + ` (${dealerTotal})`, inline: true }
                    );

                await channel.send({ embeds: [insResultEmbed] });
                deleteBlackjackCache(client, playerId);
                return;
            } else {
                const insLostEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('🛡️ Insurance Lost')
                    .setDescription(`Dealer does not have Blackjack. You lost your **${insuranceCost.toLocaleString()}** Baubles insurance bet.\nPlaying hand...`);
                const tempMsg = await channel.send({ embeds: [insLostEmbed] });
                await delay(2000);
                await tempMsg.delete().catch(() => {});
            }
        }
    }

    // 2. CHECK FOR NATURAL BLACKJACK
    const player1Total = calculateHand(playerHand1);
    const dealerStartTotal = calculateHand(dealerHand);

    if (player1Total === 21 && dealerStartTotal === 21) {
        await adjustBaubles(playerId, betAmount);
        const naturalPushEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('🤝 Push!')
            .setDescription(`Both you and the dealer have **Blackjack**! Your bet of **${betAmount.toLocaleString()}** Baubles has been returned.`)
            .addFields(
                { name: 'Your Hand', value: drawCardsANSI(playerHand1), inline: true },
                { name: "Dealer's Hand", value: drawCardsANSI(dealerHand), inline: true }
            );
        await channel.send({ embeds: [naturalPushEmbed] });
        deleteBlackjackCache(client, playerId);
        return;
    } else if (player1Total === 21) {
        const payout = Math.floor(betAmount * 2.5);
        const winProfit = payout - betAmount;
        await adjustBaubles(playerId, payout);
        
        const naturalWinEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🎉 Natural Blackjack!')
            .setDescription(`**${playerName}** got blackjack!\n\nYou won **${winProfit.toLocaleString()}** Baubles! (3:2 payout)`)
            .addFields(
                { name: 'Your Hand', value: drawCardsANSI(playerHand1), inline: true },
                { name: "Dealer's Hand", value: drawCardsANSI(dealerHand), inline: true }
            );
        
        const currentStreak = await handleStreak(playerId, true, channel);
        if (currentStreak >= 3) naturalWinEmbed.setDescription(naturalWinEmbed.data.description + `\n🔥 **Streak:** ${currentStreak}`);
        
        await channel.send({ embeds: [naturalWinEmbed] });
        deleteBlackjackCache(client, playerId);
        return;
    } else if (dealerStartTotal === 21) {
        const naturalLossEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💀 Dealer Blackjack')
            .setDescription(`Dealer has Blackjack. You lost your bet of **${betAmount.toLocaleString()}** Baubles.`)
            .addFields(
                { name: 'Your Hand', value: drawCardsANSI(playerHand1), inline: true },
                { name: "Dealer's Hand", value: drawCardsANSI(dealerHand), inline: true }
            );
        await handleStreak(playerId, false, channel);
        await channel.send({ embeds: [naturalLossEmbed] });
        deleteBlackjackCache(client, playerId);
        return;
    }

    // 3. MAIN GAMEPLAY INTERACTION
    const buildEmbed = (showDealerCard = false, extraDescription = '') => {
        const embed = new EmbedBuilder()
            .setColor(mainGameEnded ? 0x95a5a6 : 0x3498db)
            .setTitle('🎰 Blackjack');

        if (extraDescription) {
            embed.setDescription(extraDescription);
        }

        if (isSplit) {
            const h1Total = calculateHand(playerHand1);
            const h2Total = calculateHand(playerHand2);
            
            embed.addFields(
                {
                    name: `${currentHandIndex === 0 && !mainGameEnded ? '▶ ' : ''}💰 Hand 1 (${h1Total})${currentHandIndex === 0 && !mainGameEnded ? ' (Active)' : ''}`,
                    value: drawCardsANSI(playerHand1) + `Bet: ${betHand1.toLocaleString()} Baubles` + (doubleHand1 ? ' [Doubled]' : ''),
                    inline: false
                },
                {
                    name: `${currentHandIndex === 1 && !mainGameEnded ? '▶ ' : ''}💰 Hand 2 (${h2Total})${currentHandIndex === 1 && !mainGameEnded ? ' (Active)' : ''}`,
                    value: drawCardsANSI(playerHand2) + `Bet: ${betHand2.toLocaleString()} Baubles` + (doubleHand2 ? ' [Doubled]' : ''),
                    inline: false
                }
            );
        } else {
            const pTotal = calculateHand(playerHand1);
            embed.addFields(
                {
                    name: `💰 Your Hand (${pTotal})`,
                    value: drawCardsANSI(playerHand1) + `Bet: ${betHand1.toLocaleString()} Baubles` + (doubleHand1 ? ' [Doubled]' : ''),
                    inline: false
                }
            );
        }

        const dTotal = showDealerCard ? calculateHand(dealerHand) : cardValue(dealerHand[1].rank);
        embed.addFields(
            {
                name: `🤖 Dealer's Hand${showDealerCard ? ` (${dTotal})` : ''}`,
                value: drawCardsANSI(dealerHand, !showDealerCard),
                inline: false
            }
        );

        return embed;
    };

    const hitBtn = new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary).setEmoji('🎲');
    const standBtn = new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger).setEmoji('⏹️');
    const doubleBtn = new ButtonBuilder().setCustomId('bj_double').setLabel('Double Down').setStyle(ButtonStyle.Secondary).setEmoji('2️⃣');
    const splitBtn = new ButtonBuilder().setCustomId('bj_split').setLabel('Split').setStyle(ButtonStyle.Secondary).setEmoji('🔀');
    const surrenderBtn = new ButtonBuilder().setCustomId('bj_surrender').setLabel('Surrender').setStyle(ButtonStyle.Secondary).setEmoji('🏳️');

    const getActionRow = (isFirstAction = true, handCards) => {
        const canDouble = isFirstAction && handCards.length === 2 && currentDbBalance >= (currentHandIndex === 0 ? betHand1 : betHand2);
        const canSplit = !isSplit && isFirstAction && handCards.length === 2 && 
                         cardValue(handCards[0].rank) === cardValue(handCards[1].rank) && 
                         currentDbBalance >= betHand1;
        const canSurrender = !isSplit && isFirstAction && handCards.length === 2;

        return new ActionRowBuilder().addComponents(
            ButtonBuilder.from(hitBtn).setDisabled(false),
            ButtonBuilder.from(standBtn).setDisabled(false),
            ButtonBuilder.from(doubleBtn).setDisabled(!canDouble),
            ButtonBuilder.from(splitBtn).setDisabled(!canSplit),
            ButtonBuilder.from(surrenderBtn).setDisabled(!canSurrender)
        );
    };

    const gameMsg = await channel.send({ 
        embeds: [buildEmbed(false, 'Your turn! Choose an action.')], 
        components: [getActionRow(true, playerHand1)] 
    });

    const collector = gameMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === playerId,
        time: 90_000
    });

    let currentActionIsFirst = true;

    collector.on('collect', async i => {
        await i.deferUpdate();

        const activeHand = currentHandIndex === 0 ? playerHand1 : playerHand2;

        if (i.customId === 'bj_surrender') {
            mainGameEnded = true;
            collector.stop('surrender');
            
            const refund = Math.floor(betAmount / 2);
            await adjustBaubles(playerId, refund);

            const surrenderEmbed = new EmbedBuilder()
                .setColor(0x7f8c8d)
                .setTitle('🏳️ Surrendered')
                .setDescription(`You surrendered the hand and received a **${refund.toLocaleString()}** Baubles refund (50% of bet).`)
                .addFields(
                    { name: 'Your Hand', value: drawCardsANSI(playerHand1), inline: true },
                    { name: "Dealer's Hand", value: drawCardsANSI(dealerHand), inline: true }
                );

            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(hitBtn).setDisabled(true),
                ButtonBuilder.from(standBtn).setDisabled(true),
                ButtonBuilder.from(doubleBtn).setDisabled(true),
                ButtonBuilder.from(splitBtn).setDisabled(true),
                ButtonBuilder.from(surrenderBtn).setDisabled(true)
            );

            await gameMsg.edit({ embeds: [surrenderEmbed], components: [disabledRow] });
            deleteBlackjackCache(client, playerId);
            return;
        }

        if (i.customId === 'bj_split') {
            isSplit = true;
            betHand2 = betHand1;
            
            await adjustBaubles(playerId, -betHand2);
            currentDbBalance -= betHand2;

            playerHand2.push(playerHand1.pop());
            playerHand1.push(deck.pop());
            playerHand2.push(deck.pop());

            currentHandIndex = 0;
            currentActionIsFirst = true;

            updateBlackjackCache(client, playerId, {
                playerHand: playerHand1,
                playerHand2: playerHand2,
                nextCards: deck.slice(-10).reverse(),
                bet: betHand1 + betHand2
            });

            await gameMsg.edit({ 
                embeds: [buildEmbed(false, 'Split complete! Playing Hand 1.')], 
                components: [getActionRow(true, playerHand1)] 
            });
            return;
        }

        if (i.customId === 'bj_double') {
            const addBet = currentHandIndex === 0 ? betHand1 : betHand2;
            await adjustBaubles(playerId, -addBet);
            currentDbBalance -= addBet;

            if (currentHandIndex === 0) {
                betHand1 *= 2;
                doubleHand1 = true;
                playerHand1.push(deck.pop());
            } else {
                betHand2 *= 2;
                doubleHand2 = true;
                playerHand2.push(deck.pop());
            }

            updateBlackjackCache(client, playerId, {
                playerHand: playerHand1,
                playerHand2: playerHand2,
                nextCards: deck.slice(-10).reverse(),
                bet: betHand1 + betHand2
            });

            if (isSplit && currentHandIndex === 0) {
                currentHandIndex = 1;
                currentActionIsFirst = true;
                await gameMsg.edit({ 
                    embeds: [buildEmbed(false, 'Doubled down on Hand 1! Switching to Hand 2.')], 
                    components: [getActionRow(true, playerHand2)] 
                });
            } else {
                mainGameEnded = true;
                collector.stop('stand');
            }
            return;
        }

        if (i.customId === 'bj_hit') {
            activeHand.push(deck.pop());
            updateBlackjackCache(client, playerId, {
                playerHand: playerHand1,
                playerHand2: playerHand2,
                nextCards: deck.slice(-10).reverse()
            });
            const total = calculateHand(activeHand);

            if (total > 21) {
                if (isSplit && currentHandIndex === 0) {
                    currentHandIndex = 1;
                    currentActionIsFirst = true;
                    await gameMsg.edit({ 
                        embeds: [buildEmbed(false, '💥 Hand 1 Busted! Switching to Hand 2.')], 
                        components: [getActionRow(true, playerHand2)] 
                    });
                } else {
                    mainGameEnded = true;
                    collector.stop('bust');
                }
            } else if (total === 21) {
                if (isSplit && currentHandIndex === 0) {
                    currentHandIndex = 1;
                    currentActionIsFirst = true;
                    await gameMsg.edit({ 
                        embeds: [buildEmbed(false, '🎉 Hand 1 reached 21! Switching to Hand 2.')], 
                        components: [getActionRow(true, playerHand2)] 
                    });
                } else {
                    mainGameEnded = true;
                    collector.stop('stand');
                }
            } else {
                currentActionIsFirst = false;
                await gameMsg.edit({ 
                    embeds: [buildEmbed(false, `Playing Hand ${currentHandIndex + 1}.`)], 
                    components: [getActionRow(false, activeHand)] 
                });
            }
            return;
        }

        if (i.customId === 'bj_stand') {
            if (isSplit && currentHandIndex === 0) {
                currentHandIndex = 1;
                currentActionIsFirst = true;
                await gameMsg.edit({ 
                    embeds: [buildEmbed(false, 'Stood on Hand 1. Switching to Hand 2.')], 
                    components: [getActionRow(true, playerHand2)] 
                });
            } else {
                mainGameEnded = true;
                collector.stop('stand');
            }
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            mainGameEnded = true;
        }
    });

    while (!mainGameEnded) {
        await delay(500);
    }

    const finalDisabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(hitBtn).setDisabled(true),
        ButtonBuilder.from(standBtn).setDisabled(true),
        ButtonBuilder.from(doubleBtn).setDisabled(true),
        ButtonBuilder.from(splitBtn).setDisabled(true),
        ButtonBuilder.from(surrenderBtn).setDisabled(true)
    );
    await gameMsg.edit({ components: [finalDisabledRow] }).catch(() => {});

    if (collector.reason === 'surrender') return;

    const h1Bust = calculateHand(playerHand1) > 21;
    const h2Bust = isSplit ? (calculateHand(playerHand2) > 21) : true;

    if (h1Bust && h2Bust) {
        const bustEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💥 Bust!')
            .setDescription(isSplit ? 'Both hands went over 21! You lost all bets.' : `Your hand went over 21! You lost your bet of **${betAmount.toLocaleString()}** Baubles.`)
            .addFields(
                { name: 'Your Hand 1', value: drawCardsANSI(playerHand1) + ` (${calculateHand(playerHand1)})`, inline: true }
            );

        if (isSplit) {
            bustEmbed.addFields({ name: 'Your Hand 2', value: drawCardsANSI(playerHand2) + ` (${calculateHand(playerHand2)})`, inline: true });
        }

        await handleStreak(playerId, false);
        await gameMsg.edit({ embeds: [buildEmbed(true, 'Bust!')] }).catch(() => {});
        await channel.send({ embeds: [bustEmbed] });
        deleteBlackjackCache(client, playerId);
        return;
    }

    // 4. DEALER TURN
    await gameMsg.edit({ embeds: [buildEmbed(true, "Dealer reveals their hidden card...")] }).catch(() => {});
    await delay(1500);

    while (calculateHand(dealerHand) < 17) {
        dealerHand.push(deck.pop());
        updateBlackjackCache(client, playerId, {
            dealerHand: dealerHand,
            nextCards: deck.slice(-10).reverse()
        });
        await gameMsg.edit({ embeds: [buildEmbed(true, "Dealer drawing a card...")] }).catch(() => {});
        await delay(1500);
    }

    const dTotal = calculateHand(dealerHand);
    await gameMsg.edit({ embeds: [buildEmbed(true, "Dealer finished drawing.")] }).catch(() => {});

    // 5. DETERMINE RESULTS AND PAYOUTS
    let totalWinnings = 0;
    let totalBet = betHand1 + betHand2;
    let descriptionText = '';

    const evaluateHand = (hand, bet, label) => {
        const pTotal = calculateHand(hand);
        if (pTotal > 21) {
            descriptionText += `❌ **${label} (${pTotal})**: Busted. Lost **${bet.toLocaleString()}** Baubles.\n`;
            return 0;
        } else if (dTotal > 21) {
            const win = Math.floor(bet * 2);
            descriptionText += `🎉 **${label} (${pTotal})**: Dealer busted! Won **${win.toLocaleString()}** Baubles!\n`;
            return win;
        } else if (pTotal > dTotal) {
            const win = Math.floor(bet * 2);
            descriptionText += `🎉 **${label} (${pTotal})**: Beat Dealer's ${dTotal}! Won **${win.toLocaleString()}** Baubles!\n`;
            return win;
        } else if (pTotal === dTotal) {
            descriptionText += `🤝 **${label} (${pTotal})**: Push. Bet of **${bet.toLocaleString()}** Baubles returned.\n`;
            return bet;
        } else {
            descriptionText += `❌ **${label} (${pTotal})**: Lost to Dealer's ${dTotal}. Lost **${bet.toLocaleString()}** Baubles.\n`;
            return 0;
        }
    };

    if (isSplit) {
        totalWinnings += evaluateHand(playerHand1, betHand1, 'Hand 1');
        totalWinnings += evaluateHand(playerHand2, betHand2, 'Hand 2');
    } else {
        totalWinnings += evaluateHand(playerHand1, betHand1, 'Your Hand');
    }

    if (totalWinnings > 0) {
        await adjustBaubles(playerId, totalWinnings);
    }

    const netProfit = totalWinnings - totalBet;
    let resultTitle = '🏁 Game Over';
    let embedColor = 0x95a5a6;

    if (netProfit > 0) {
        resultTitle = '🏆 You Win!';
        embedColor = 0x2ecc71;
    } else if (netProfit < 0) {
        resultTitle = '💀 Dealer Wins';
        embedColor = 0xe74c3c;
    } else {
        resultTitle = '🤝 Push (Tie)';
        embedColor = 0xf39c12;
    }

    const finalEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(resultTitle)
        .setDescription(`${descriptionText}\n**Summary:**\nTotal Bet: **${totalBet.toLocaleString()}** Baubles\nTotal Payout: **${totalWinnings.toLocaleString()}** Baubles\nNet Profit: **${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}** Baubles`)
        .addFields(
            { name: isSplit ? 'Hand 1' : 'Your Hand', value: drawCardsANSI(playerHand1) + ` (${calculateHand(playerHand1)})`, inline: true }
        );

    if (isSplit) {
        finalEmbed.addFields({ name: 'Hand 2', value: drawCardsANSI(playerHand2) + ` (${calculateHand(playerHand2)})`, inline: true });
    }

    finalEmbed.addFields({ name: "Dealer's Hand", value: drawCardsANSI(dealerHand) + ` (${dTotal})`, inline: true });

    let streakDisplay = '';
    if (netProfit > 0) {
        const streak = await handleStreak(playerId, true, channel);
        if (streak >= 3) streakDisplay = `\n🔥 **Winning Streak:** ${streak}`;
    } else if (netProfit < 0) {
        await handleStreak(playerId, false, channel);
    }
    
    if (streakDisplay) {
        finalEmbed.setDescription(finalEmbed.data.description + streakDisplay);
    }

    await channel.send({ embeds: [finalEmbed] });
    deleteBlackjackCache(client, playerId);
}

// ─── Bet selection ────────────────────────────────────────────────────────────
async function selectBet(context, channel, user) {
    const userId = user.id;
    const username = user.username;
    
    let baubleData = await Bauble.findOne({ userId });
    let balance = baubleData?.baubles ?? 0;

    if (balance < 100) {
        const errorMsg = `❌ You need at least 100 Baubles to play. You have **${balance.toLocaleString()}** Baubles.`;
        if (context.reply && typeof context.deferReply === 'function') {
            return context.reply({ content: errorMsg, ephemeral: true });
        } else {
            return context.reply(errorMsg);
        }
    }

    const betBtn100 = new ButtonBuilder().setCustomId('bj_bet_100').setLabel('100').setStyle(ButtonStyle.Secondary);
    const betBtn500 = new ButtonBuilder().setCustomId('bj_bet_500').setLabel('500').setStyle(ButtonStyle.Secondary);
    const betBtn1000 = new ButtonBuilder().setCustomId('bj_bet_1000').setLabel('1000').setStyle(ButtonStyle.Secondary);
    const betBtn5000 = new ButtonBuilder().setCustomId('bj_bet_5000').setLabel('5000').setStyle(ButtonStyle.Secondary);
    const maxBetAllowed = Math.min(balance, 250000);
    const betBtnMax = new ButtonBuilder().setCustomId('bj_bet_max').setLabel(`Max (${maxBetAllowed.toLocaleString()})`).setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(betBtn100, betBtn500, betBtn1000, betBtn5000, betBtnMax);

    const betEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎰 Blackjack — Select Your Bet')
        .setDescription(`**Your Balance:** ${balance.toLocaleString()} Baubles\n\nChoose your bet amount:`)
        .setFooter({ text: 'Bet selection times out in 1 minute' });

    let betMsg;
    if (context.reply && typeof context.deferReply === 'function') {
        betMsg = await context.reply({ embeds: [betEmbed], components: [row], withResponse: true });
    } else {
        betMsg = await context.reply({ embeds: [betEmbed], components: [row] });
    }

    const betCollector = betMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === userId,
        time: 60_000
    });

    betCollector.on('collect', async i => {
        let betAmount;
        if (i.customId === 'bj_bet_max') {
            betAmount = Math.min(balance, 250000);
        } else {
            betAmount = parseInt(i.customId.split('_')[2]);
        }

        if (betAmount > balance) {
            return i.reply({
                content: `❌ You don't have enough Baubles! You need ${betAmount.toLocaleString()} but only have ${balance.toLocaleString()}.`,
                ephemeral: true
            });
        }

        // Deduct bet from balance
        await adjustBaubles(userId, -betAmount);

        // Disable all buttons
        const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(betBtn100).setDisabled(true),
            ButtonBuilder.from(betBtn500).setDisabled(true),
            ButtonBuilder.from(betBtn1000).setDisabled(true),
            ButtonBuilder.from(betBtn5000).setDisabled(true),
            ButtonBuilder.from(betBtnMax).setDisabled(true)
        );
        await betMsg.edit({ components: [disabledRow] }).catch(() => {});

        await i.deferUpdate();
        betCollector.stop('selected');

        // Start the game
        if (activeGames.has(userId)) {
            return channel.send('⚠️ You already have a Blackjack game running!');
        }
        activeGames.add(userId);

        runBlackjackGame(channel, userId, username, betAmount).catch(err => {
            console.error('[Blackjack] Game error:', err);
            deleteBlackjackCache(channel.client, userId);
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
                ButtonBuilder.from(betBtnMax).setDisabled(true)
            );
            await betMsg.edit({ components: [disabledRow] }).catch(() => {});
        }
    });
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'casino',
    aliases: ['bj'],
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack and win Baubles!')
        .addStringOption(option => 
            option.setName('bet')
                .setDescription('Baubles to bet (100 - 250k). Leave blank for the selector.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        let baubleData = await Bauble.findOne({ userId });
        const balance = baubleData?.baubles ?? 0;

        const betVal = interaction.options.get('bet')?.value;
        const betStr = betVal !== undefined ? String(betVal) : null;
        let betAmount = null;
        if (betStr) {
            const { parseAmount } = require('../../utils/economyEngine');
            betAmount = parseAmount(betStr, balance);
        }

        if (betAmount) {
            if (balance < 100) {
                return interaction.reply({
                    content: `❌ You need at least 100 Baubles to play. You have **${balance.toLocaleString()}** Baubles.`,
                    ephemeral: true
                });
            }
            if (isNaN(betAmount) || betAmount < 100) {
                return interaction.reply({
                    content: `❌ Invalid bet amount. Use a number (minimum 100), \`all\`, \`half\`, or \`50%\`.`,
                    ephemeral: true
                });
            }
            if (betAmount > 250000) {
                return interaction.reply({
                    content: `❌ The maximum bet is **250,000** Baubles.`,
                    ephemeral: true
                });
            }
            if (betAmount > balance) {
                return interaction.reply({
                    content: `❌ You don't have enough Baubles! You tried to bet ${betAmount.toLocaleString()} but only have ${balance.toLocaleString()}.`,
                    ephemeral: true
                });
            }

            await interaction.reply({ content: `🎰 Starting Blackjack with a bet of **${betAmount.toLocaleString()}** Baubles!`, ephemeral: true });

            if (activeGames.has(userId)) {
                return interaction.followUp({ content: '⚠️ You already have a Blackjack game running!', ephemeral: true });
            }
            activeGames.add(userId);

            // Deduct bet
            await adjustBaubles(userId, -betAmount);

            runBlackjackGame(interaction.channel, userId, username, betAmount).catch(err => {
                console.error('[Blackjack] Game error:', err);
                deleteBlackjackCache(interaction.client, userId);
                interaction.channel.send({ content: '⚠️ An unexpected error ended the game. Sorry!' });
            });
        } else {
            selectBet(interaction, interaction.channel, interaction.user).catch(err => {
                console.error('[Blackjack] Setup error:', err);
            });
        }
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        let baubleData = await Bauble.findOne({ userId });
        const balance = baubleData?.baubles ?? 0;

        let betAmount;
        if (args && args.length > 0) {
            const { parseAmount } = require('../../utils/economyEngine');
            betAmount = parseAmount(args[0], balance);
        }

        if (!betAmount || isNaN(betAmount) || betAmount < 100) {
            selectBet({
                reply: async (opts) => message.reply(opts)
            }, message.channel, message.author).catch(err => {
                console.error('[Blackjack] Setup error:', err);
            });
        } else {
            if (balance < 100) {
                return message.reply(`❌ You need at least 100 Baubles to play. You have **${balance.toLocaleString()}** Baubles.`);
            }
            if (betAmount > 250000) {
                return message.reply(`❌ The maximum bet is **250,000** Baubles.`);
            }
            if (betAmount > balance) {
                return message.reply(`❌ You don't have enough Baubles! You tried to bet ${betAmount.toLocaleString()} but only have ${balance.toLocaleString()}.`);
            }

            if (activeGames.has(userId)) {
                return message.reply('⚠️ You already have a Blackjack game running!');
            }
            activeGames.add(userId);

            // Deduct bet
            await adjustBaubles(userId, -betAmount);

            runBlackjackGame(message.channel, userId, username, betAmount).catch(err => {
                console.error('[Blackjack] Game error:', err);
                deleteBlackjackCache(message.client, userId);
                message.channel.send({ content: '⚠️ An unexpected error ended the game. Sorry!' });
            });
        }
    }
};
