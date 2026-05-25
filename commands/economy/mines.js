/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

function getMultiplier(totalTiles, minesCount, revealedCount, houseEdge = 0.02) {
    if (revealedCount === 0) return 1.0;
    let waysTotal = 1;
    let waysWinning = 1;
    for (let i = 0; i < revealedCount; i++) {
        waysTotal *= (totalTiles - i);
        waysWinning *= (totalTiles - minesCount - i);
    }
    const mult = (1 - houseEdge) * (waysTotal / waysWinning);
    return Math.round(mult * 100) / 100;
}

function formatMinesTimeRemaining(ms) {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
}

function createMinesGridRows(grid, revealed, active, minesCount, revealedCount, stake) {
    const rows = [];
    
    // Grid rows (4 rows of 4 buttons)
    for (let r = 0; r < 4; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 4; c++) {
            const idx = r * 4 + c;
            const btn = new ButtonBuilder()
                .setCustomId(`mines_tile_${idx}`);
            
            if (revealed[idx]) {
                if (grid[idx] === 'mine') {
                    btn.setEmoji('💥')
                       .setStyle(ButtonStyle.Danger)
                       .setDisabled(true);
                } else {
                    btn.setEmoji('💎')
                       .setStyle(ButtonStyle.Primary)
                       .setDisabled(true);
                }
            } else {
                if (!active) {
                    // Game is over, reveal the rest
                    if (grid[idx] === 'mine') {
                        btn.setEmoji('💣')
                           .setStyle(ButtonStyle.Secondary)
                           .setDisabled(true);
                    } else {
                        btn.setEmoji('💎')
                           .setStyle(ButtonStyle.Secondary)
                           .setDisabled(true);
                    }
                } else {
                    // Game is active and tile is unrevealed
                    btn.setLabel(`${idx + 1}`)
                       .setStyle(ButtonStyle.Secondary);
                }
            }
            row.addComponents(btn);
        }
        rows.push(row);
    }
    
    // Control row (row 5)
    const controlRow = new ActionRowBuilder();
    const currentMult = getMultiplier(16, minesCount, revealedCount);
    const payout = Math.floor(currentMult * stake);
    
    const cashoutBtn = new ButtonBuilder()
        .setCustomId('mines_cashout')
        .setLabel(revealedCount > 0 ? `Cash Out (${payout} Baubles)` : 'Cash Out')
        .setStyle(ButtonStyle.Success)
        .setDisabled(revealedCount === 0 || !active);
        
    const multBtn = new ButtonBuilder()
        .setCustomId('mines_mult_display')
        .setLabel(`📈 ${currentMult.toFixed(2)}x`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
        
    const minesDisplayBtn = new ButtonBuilder()
        .setCustomId('mines_count_display')
        .setLabel(`💣 ${minesCount} Mines`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
        
    controlRow.addComponents(cashoutBtn, multBtn, minesDisplayBtn);
    rows.push(controlRow);
    
    return rows;
}

module.exports = {
    category: 'economy',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Stake baubles in a minesweeper grid! Find diamonds to multiply your winnings.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to stake.')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('mines')
                .setDescription('Number of hidden mines (1-15, default is 3).')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(15)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const minesCount = interaction.options.getInteger('mines') || 3;

        await runMines({
            userId,
            amount,
            minesCount,
            interaction,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        const userId = message.author.id;
        
        if (args.length < 1) {
            return message.reply('❌ Correct usage: `-mines <amount> [mines_count]`');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Please provide a valid amount of Baubles to stake.');
        }

        let minesCount = 3;
        if (args[1]) {
            minesCount = parseInt(args[1]);
            if (isNaN(minesCount) || minesCount < 1 || minesCount > 15) {
                return message.reply('❌ The number of mines must be a number between 1 and 15.');
            }
        }

        await runMines({
            userId,
            amount,
            minesCount,
            message,
            isSlash: false
        });
    }
};

async function runMines({ userId, amount, minesCount, interaction, message, isSlash }) {
    // Check global lock to prevent multiple active games
    const client = interaction?.client || message?.client;
    if (!client.activeMinesGames) {
        client.activeMinesGames = new Map();
    }

    if (client.activeMinesGames.has(userId)) {
        const activeGameMsg = '❌ You already have an active Mines game! Please finish or cash out of that game first.';
        if (isSlash) {
            return interaction.reply({ content: activeGameMsg, ephemeral: true });
        } else {
            return message.reply(activeGameMsg);
        }
    }

    try {
        // Fetch user balance
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (baubleData.baubles < amount) {
            const errorMsg = `❌ You only have **${baubleData.baubles}** Glimmering Baubles, you cannot stake **${amount}**.`;
            if (isSlash) {
                return interaction.reply({ content: errorMsg, ephemeral: true });
            } else {
                return message.reply(errorMsg);
            }
        }

        // Deduct stake immediately
        baubleData.baubles -= amount;
        await baubleData.save();

        // Create Mines Grid: 16 tiles (4x4)
        const grid = new Array(16).fill('safe');
        let placed = 0;
        while (placed < minesCount) {
            const rand = Math.floor(Math.random() * 16);
            if (grid[rand] !== 'mine') {
                grid[rand] = 'mine';
                placed++;
            }
        }

        const revealed = new Array(16).fill(false);
        let revealedCount = 0;
        let active = true;

        const initialEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('💣  MINES CHALLENGE')
            .setDescription(`A **4x4** grid has been prepared with **${minesCount}** hidden mines.\n\nClick the numbered tiles below to reveal them. Find **Diamonds** \`💎\` to multiply your stake, but hit a **Mine** \`💥\` and you lose it all!`)
            .addFields(
                { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                { name: '📈 Current Multiplier', value: `\`1.00x\``, inline: true },
                { name: '💵 Winnings', value: `\`${amount} Baubles\``, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Find diamonds and cash out before hitting a mine!' });

        const rows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);

        let initialMsg;
        if (isSlash) {
            initialMsg = await interaction.reply({ embeds: [initialEmbed], components: rows, fetchReply: true });
        } else {
            initialMsg = await message.reply({ embeds: [initialEmbed], components: rows });
        }

        // Register the active game in the client map
        const gameSession = {
            userId,
            stake: amount,
            minesCount,
            grid,
            revealed,
            revealedCount,
            messageId: initialMsg.id,
            timestamp: Date.now()
        };
        client.activeMinesGames.set(userId, gameSession);

        const filter = i => {
            if (i.user.id !== userId) {
                i.reply({ content: '❌ This Mines game is not yours!', ephemeral: true });
                return false;
            }
            return true;
        };

        const collector = initialMsg.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes session time
        });

        collector.on('collect', async (i) => {
            // Reset timer on action to keep the session alive
            collector.resetTimer();
            await i.deferUpdate();

            if (!active) return;

            const buttonId = i.customId;

            if (buttonId.startsWith('mines_tile_')) {
                const tileIdx = parseInt(buttonId.split('_')[2]);
                if (revealed[tileIdx]) return; // Already revealed

                revealed[tileIdx] = true;

                if (grid[tileIdx] === 'mine') {
                    // KABOOM! Lose the game
                    active = false;
                    client.activeMinesGames.delete(userId);
                    collector.stop('mine');

                    const currentMult = getMultiplier(16, minesCount, revealedCount);
                    const kaboomEmbed = new EmbedBuilder()
                        .setColor(0xFF7171)
                        .setTitle('💥  KABOOM!')
                        .setDescription(`Oh no! You hit a mine at tile **${tileIdx + 1}** and blew up. 😭\nYou lost your stake of **${amount}** Glimmering Baubles.`)
                        .addFields(
                            { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                            { name: '🔥 Multiplier Reached', value: `\`${currentMult.toFixed(2)}x\``, inline: true },
                            { name: '💎 Safe Tiles Revealed', value: `\`${revealedCount}\``, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Better luck next time!' });

                    const finalRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                    await initialMsg.edit({ embeds: [kaboomEmbed], components: finalRows }).catch(() => {});
                } else {
                    // Safe tile revealed!
                    revealedCount++;
                    const totalSafe = 16 - minesCount;

                    if (revealedCount === totalSafe) {
                        // All safe tiles revealed, perfect game!
                        active = false;
                        client.activeMinesGames.delete(userId);
                        collector.stop('perfect');

                        const winMult = getMultiplier(16, minesCount, revealedCount);
                        const winnings = Math.floor(winMult * amount);

                        baubleData = await Bauble.findOne({ userId });
                        baubleData.baubles += winnings;
                        await baubleData.save();

                        const perfectEmbed = new EmbedBuilder()
                            .setColor(0x4ADE80)
                            .setTitle('🏆  PERFECT GAME!')
                            .setDescription(`Unbelievable! You cleared the entire grid without hitting a single mine!\n\nYou won **${winnings}** Glimmering Baubles!`)
                            .addFields(
                                { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                                { name: '📈 Final Multiplier', value: `\`${winMult.toFixed(2)}x\``, inline: true },
                                { name: '💵 Winnings Earned', value: `\`${winnings} Baubles\``, inline: true },
                                { name: '👛 New Balance', value: `\`${baubleData.baubles} Baubles\``, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Minesweeper Deity status achieved 👑' });

                        const finalRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                        await initialMsg.edit({ embeds: [perfectEmbed], components: finalRows }).catch(() => {});
                    } else {
                        // Game continues
                        const nextMult = getMultiplier(16, minesCount, revealedCount + 1);
                        const currentMult = getMultiplier(16, minesCount, revealedCount);
                        const currentWinnings = Math.floor(currentMult * amount);

                        const updateEmbed = new EmbedBuilder()
                            .setColor(0x7c6cf0)
                            .setTitle('💎  SAFE TILE REVEALED!')
                            .setDescription(`You found a Diamond! Your multiplier is now **${currentMult.toFixed(2)}x**.\n\nClick another tile to continue, or click **Cash Out** to claim your winnings!`)
                            .addFields(
                                { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                                { name: '📈 Multiplier', value: `\`${currentMult.toFixed(2)}x\` (Next: \`${nextMult.toFixed(2)}x\`)`, inline: true },
                                { name: '💵 Winnings', value: `\`${currentWinnings} Baubles\``, inline: true },
                                { name: '💎 Diamonds Found', value: `\`${revealedCount} / ${totalSafe}\``, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Avoid the mines!' });

                        const nextRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                        await initialMsg.edit({ embeds: [updateEmbed], components: nextRows }).catch(() => {});
                    }
                }
            } else if (buttonId === 'mines_cashout') {
                if (revealedCount === 0) return; // Cannot cash out at 0

                active = false;
                client.activeMinesGames.delete(userId);
                collector.stop('cashout');

                const winMult = getMultiplier(16, minesCount, revealedCount);
                const winnings = Math.floor(winMult * amount);

                baubleData = await Bauble.findOne({ userId });
                baubleData.baubles += winnings;
                await baubleData.save();

                const cashoutEmbed = new EmbedBuilder()
                    .setColor(0x4ADE80)
                    .setTitle('💰  CASH OUT SUCCESSFUL')
                    .setDescription(`You cashed out safely after finding **${revealedCount}** diamonds!`)
                    .addFields(
                        { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                        { name: '📈 Cashout Multiplier', value: `\`${winMult.toFixed(2)}x\``, inline: true },
                        { name: '💵 Winnings Claimed', value: `**${winnings}** Baubles`, inline: true },
                        { name: '👛 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Smart plays pay off 🧠' });

                const finalRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                await initialMsg.edit({ embeds: [cashoutEmbed], components: finalRows }).catch(() => {});
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && active) {
                // Game timed out and is still active. Auto-cash out to prevent loss of stake!
                active = false;
                client.activeMinesGames.delete(userId);

                baubleData = await Bauble.findOne({ userId });

                if (revealedCount === 0) {
                    // Refund if they never played
                    baubleData.baubles += amount;
                    await baubleData.save();

                    const refundEmbed = new EmbedBuilder()
                        .setColor(0x747f8d)
                        .setTitle('⏰  MINES SESSION TIMED OUT')
                        .setDescription('You did not make any moves. Your stake has been fully refunded.')
                        .setTimestamp()
                        .setFooter({ text: 'Game cancelled.' });

                    const finalRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                    await initialMsg.edit({ embeds: [refundEmbed], components: finalRows }).catch(() => {});
                } else {
                    // Auto cash out at current multiplier
                    const winMult = getMultiplier(16, minesCount, revealedCount);
                    const winnings = Math.floor(winMult * amount);
                    
                    baubleData.baubles += winnings;
                    await baubleData.save();

                    const autoCashoutEmbed = new EmbedBuilder()
                        .setColor(0x4ADE80)
                        .setTitle('⏰  AUTO CASH OUT')
                        .setDescription(`Your session timed out. You have been automatically cashed out at your last safe step.`)
                        .addFields(
                            { name: '💰 Bet Amount', value: `\`${amount} Baubles\``, inline: true },
                            { name: '📈 Multiplier', value: `\`${winMult.toFixed(2)}x\``, inline: true },
                            { name: '💵 Auto Payout', value: `**${winnings}** Baubles`, inline: true },
                            { name: '👛 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Winnings saved.' });

                    const finalRows = createMinesGridRows(grid, revealed, active, minesCount, revealedCount, amount);
                    await initialMsg.edit({ embeds: [autoCashoutEmbed], components: finalRows }).catch(() => {});
                }
            }
        });

    } catch (err) {
        console.error('Error starting mines game:', err);
        if (client.activeMinesGames) {
            client.activeMinesGames.delete(userId);
        }
    }
}
