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

module.exports = {
    category: 'minigames',
    cooldown: 10,

    data: new SlashCommandBuilder()
        .setName('gridduel')
        .setDescription('Challenge someone to a Grid Duel (3x3 Battleship wager)!')
        .addUserOption(o =>
            o.setName('opponent')
                .setDescription('The user you want to duel.')
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName('wager')
                .setDescription('Baubles to wager (e.g. 1000, 5k, all, half, 50%)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const { parseAmount } = require('../../utils/economyEngine');
        const baubleData = await Bauble.findOne({ userId });
        const wager = parseAmount(interaction.options.getString('wager'), baubleData?.baubles ?? 0);
        if (isNaN(wager) || wager < 1000) {
            return interaction.reply({ content: '❌ Minimum wager is **1,000 Baubles**. You can use `1k`, `all`, `half`, or `50%`.', ephemeral: true });
        }
        await runGridDuel({
            isSlash: true,
            interaction,
            challenger: interaction.user,
            opponent: interaction.options.getUser('opponent'),
            wager,
        });
    },

    async executePrefix(message, args) {
        if (args.length < 2) {
            return message.reply('❌ Usage: `-gridduel @user <wager>`');
        }

        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        if (!mentionMatch) {
            return message.reply('❌ Please mention a valid user. Example: `-gridduel @someone 1000`');
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

        const { parseAmount } = require('../../utils/economyEngine');
        const baubleData = await Bauble.findOne({ userId: message.author.id });
        const wager = parseAmount(args[1], baubleData?.baubles ?? 0);
        if (isNaN(wager) || wager < 1000) {
            return message.reply('❌ Minimum wager is **1,000 Baubles**. You can use `1k`, `all`, `half`, or `50%`.');
        }

        await runGridDuel({
            isSlash: false,
            message,
            challenger: message.author,
            opponent,
            wager,
        });
    },
};

// ─── Main Grid Duel Runner ──────────────────────────────────────────────────
async function runGridDuel({ isSlash, interaction, message, challenger, opponent, wager }) {
    const channel = isSlash ? interaction.channel : message.channel;

    // ── Validate players ──────────────────────────────────────────────────────
    if (!opponent) {
        const err = '❌ Please mention a valid user to challenge.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (opponent.bot) {
        const err = '❌ Bots don\'t carry Baubles. Challenge a real player!';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (opponent.id === challenger.id) {
        const err = '❌ You can\'t duel yourself!';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (wager < 1000) {
        const err = '❌ Minimum wager is **1,000 Baubles**.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    // ── Fetch balances ────────────────────────────────────────────────────────
    let cData = await Bauble.findOne({ userId: challenger.id });
    let oData = await Bauble.findOne({ userId: opponent.id });

    if (!cData || cData.baubles < wager) {
        const err = `❌ ${cData ? 'You don\'t have enough Baubles for this wager.' : 'You have no Baubles at all!'}`;
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    if (!oData || oData.baubles < wager) {
        const err = `❌ **${opponent.username}** ${oData ? 'doesn\'t have enough Baubles for this wager.' : 'has no Baubles at all!'}`;
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    // ── Challenge embed ───────────────────────────────────────────────────────
    const challengeEmbed = new EmbedBuilder()
        .setColor(0x00d2ff)
        .setTitle('🛸  GRID DUEL — CHALLENGE ISSUED')
        .setDescription(
            `${opponent} — **${challenger.displayName ?? challenger.username}** is challenging you to a Grid Duel (3x3 Battleship)!\n\n` +
            `They're wagering **${wager.toLocaleString()} Baubles** on this tactical prediction game.\n` +
            `Do you accept the challenge?`
        )
        .addFields(
            { name: '🛸 Hide Phase', value: 'Secretly hide your command center in one of 9 coordinates.', inline: true },
            { name: '🎯 Attack Phase', value: 'Take turns striking coordinates. First direct hit wins!', inline: true }
        )
        .setFooter({ text: 'Challenge expires in 60 seconds.' })
        .setTimestamp();

    const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('grid_accept')
            .setLabel('⚔️ Accept the Duel')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('grid_decline')
            .setLabel('🏳️ Decline')
            .setStyle(ButtonStyle.Danger)
    );

    let challengeMsg;
    if (isSlash) {
        const response = await interaction.reply({
            content: `${opponent}`,
            embeds: [challengeEmbed],
            components: [acceptRow],
            withResponse: true
        });
        challengeMsg = response.resource.message;
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
            filter: i => i.user.id === opponent.id && ['grid_accept', 'grid_decline'].includes(i.customId),
            componentType: ComponentType.Button,
            time: 60_000,
        });

        if (btnInteraction.customId === 'grid_decline') {
            await btnInteraction.update({
                content: '',
                embeds: [new EmbedBuilder()
                    .setColor(0xff7171)
                    .setTitle('🏳️  Duel Declined')
                    .setDescription(`**${opponent.username}** backed down from the duel. No Baubles were lost.`)
                ],
                components: [],
            });
            return;
        }

        accepted = true;
        await btnInteraction.deferUpdate();
    } catch {
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

    // ── HIDE PHASE Setup ──────────────────────────────────────────────────────
    let p1 = {
        user: challenger,
        hideSlot: null
    };
    let p2 = {
        user: opponent,
        hideSlot: null
    };

    function buildHideEmbed() {
        const p1Status = p1.hideSlot ? '🟩 **Ready**' : '⏳ *Hiding base...*';
        const p2Status = p2.hideSlot ? '🟩 **Ready**' : '⏳ *Hiding base...*';

        return new EmbedBuilder()
            .setColor(0x00d2ff)
            .setTitle('🛸  GRID DUEL — HIDE PHASE')
            .setDescription(
                `Both players must secretly hide their command centers!\n\n` +
                `Click the **🛸 Hide Base** button below to open your secret 3x3 coordinate selector.`
            )
            .addFields(
                { name: `🛰️ ${p1.user.username}`, value: p1Status, inline: true },
                { name: `🛰️ ${p2.user.username}`, value: p2Status, inline: true }
            )
            .setFooter({ text: 'Hide phase expires in 60 seconds.' })
            .setTimestamp();
    }

    const hideRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('grid_hide_action')
            .setLabel('🛸 Hide Base')
            .setStyle(ButtonStyle.Primary)
    );

    await challengeMsg.edit({
        content: `${p1.user} & ${p2.user}`,
        embeds: [buildHideEmbed()],
        components: [hideRow]
    });

    const hideCollector = challengeMsg.createMessageComponentCollector({
        filter: i => [p1.user.id, p2.user.id].includes(i.user.id) && i.customId === 'grid_hide_action',
        componentType: ComponentType.Button,
        time: 60_000
    });

    let hidePhaseSuccess = false;

    await new Promise((resolveHide) => {
        hideCollector.on('collect', async (i) => {
            const isP1 = i.user.id === p1.user.id;
            const player = isP1 ? p1 : p2;

            if (player.hideSlot !== null) {
                return i.reply({ content: '❌ You have already hidden your command center!', ephemeral: true });
            }

            // Build 3x3 grid buttons
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hide_coord_1').setLabel('1').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_2').setLabel('2').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_3').setLabel('3').setStyle(ButtonStyle.Secondary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hide_coord_4').setLabel('4').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_5').setLabel('5').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_6').setLabel('6').setStyle(ButtonStyle.Secondary)
            );
            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hide_coord_7').setLabel('7').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_8').setLabel('8').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('hide_coord_9').setLabel('9').setStyle(ButtonStyle.Secondary)
            );

            const selectionMsg = await i.reply({
                content: '🛸 **Coordinate Selection**\nChoose a slot (1-9) to hide your command center:',
                components: [row1, row2, row3],
                ephemeral: true,
                fetchReply: true
            });

            try {
                const choiceClick = await selectionMsg.awaitMessageComponent({
                    filter: click => click.user.id === player.user.id && click.customId.startsWith('hide_coord_'),
                    componentType: ComponentType.Button,
                    time: 30_000
                });

                await choiceClick.deferUpdate();
                player.hideSlot = parseInt(choiceClick.customId.replace('hide_coord_', ''));

                await choiceClick.editReply({
                    content: `✅ Base successfully hidden at coordinate **${player.hideSlot}**! Wait for your opponent...`,
                    components: []
                });

                // Update main board status
                await challengeMsg.edit({
                    embeds: [buildHideEmbed()],
                    components: [hideRow]
                });

                if (p1.hideSlot !== null && p2.hideSlot !== null) {
                    hidePhaseSuccess = true;
                    hideCollector.stop('both_ready');
                }

            } catch (err) {
                await i.editReply({
                    content: '⏰ Time limit expired! You failed to hide your base.',
                    components: []
                }).catch(() => {});
            }
        });

        hideCollector.on('end', (collected, reason) => {
            resolveHide();
        });
    });

    if (!hidePhaseSuccess) {
        await challengeMsg.edit({
            content: '',
            embeds: [new EmbedBuilder()
                .setColor(0x747f8d)
                .setTitle('⏰  Hide Phase Timed Out')
                .setDescription('One or both players took too long to hide their bases. The duel is cancelled.')
            ],
            components: [],
        });
        return;
    }

    // ── ATTACK PHASE Setup ────────────────────────────────────────────────────
    let turnPlayer = p1;
    let idlePlayer = p2;
    let roundCount = 1;
    let lastActionText = `Bases hidden! **${p1.user.username}** gets the first strike.`;
    let guessedSlots = new Set(); // 1-9

    // Helper to build 3x3 shared board actions
    function buildBoardRows() {
        const rows = [];
        for (let r = 0; r < 3; r++) {
            const row = new ActionRowBuilder();
            for (let c = 1; c <= 3; c++) {
                const num = r * 3 + c;
                const btn = new ButtonBuilder()
                    .setCustomId(`strike_${num}`)
                    .setLabel(String(num));

                if (guessedSlots.has(num)) {
                    btn.setStyle(ButtonStyle.Secondary)
                       .setLabel('❌')
                       .setDisabled(true);
                } else {
                    btn.setStyle(ButtonStyle.Primary);
                }
                row.addComponents(btn);
            }
            rows.push(row);
        }
        return rows;
    }

    function buildGameEmbed() {
        return new EmbedBuilder()
            .setColor(0x00d2ff)
            .setTitle(`🎯  GRID DUEL — Turn ${roundCount}`)
            .setDescription(
                `**Wager:** ${wager.toLocaleString()} Baubles\n\n` +
                `> ${lastActionText}\n\n` +
                `It is **${turnPlayer.user.username}**'s turn to strike!`
            )
            .setFooter({ text: 'Make your strike within 60 seconds.' })
            .setTimestamp();
    }

    let gameEnded = false;
    let forfeitPlayer = null;
    let winner = null;

    while (!gameEnded) {
        await challengeMsg.edit({
            content: `${turnPlayer.user}`,
            embeds: [buildGameEmbed()],
            components: buildBoardRows()
        });

        try {
            const strikeClick = await challengeMsg.awaitMessageComponent({
                filter: i => i.user.id === turnPlayer.user.id && i.customId.startsWith('strike_'),
                componentType: ComponentType.Button,
                time: 60_000
            });

            await strikeClick.deferUpdate();
            const slot = parseInt(strikeClick.customId.replace('strike_', ''));

            // Check if slot hits idlePlayer's base
            if (slot === idlePlayer.hideSlot) {
                // Direct Hit!
                gameEnded = true;
                winner = turnPlayer;
                lastActionText = `💥 **DIRECT HIT!** **${turnPlayer.user.username}** struck coordinate **${slot}** and obliterated **${idlePlayer.user.username}**'s base!`;
            } else {
                // Miss!
                guessedSlots.add(slot);
                lastActionText = `💨 **${turnPlayer.user.username}** struck coordinate **${slot}**... and missed!`;
                roundCount++;

                // Swap turns
                let temp = turnPlayer;
                turnPlayer = idlePlayer;
                idlePlayer = temp;
            }

        } catch (err) {
            gameEnded = true;
            forfeitPlayer = turnPlayer;
            lastActionText = `⏰ **${turnPlayer.user.username}** took too long to strike and forfeited the duel!`;
        }
    }

    // ── Resolve End Results ───────────────────────────────────────────────────
    let winnerUser = null;
    let loserUser = null;

    if (forfeitPlayer) {
        loserUser = forfeitPlayer.user;
        winnerUser = forfeitPlayer.user.id === p1.user.id ? p2.user : p1.user;
    } else {
        winnerUser = winner.user;
        loserUser = winner.user.id === p1.user.id ? p2.user : p1.user;
    }

    cData = await Bauble.findOne({ userId: challenger.id });
    oData = await Bauble.findOne({ userId: opponent.id });

    const isChallengerWinner = winnerUser.id === challenger.id;
    let shieldSavedLoser = false;

    if (isChallengerWinner) {
        const shieldIndex = oData.inventory ? oData.inventory.findIndex(item => item.itemId === 'shield' && item.quantity > 0) : -1;
        if (shieldIndex !== -1) {
            oData.inventory[shieldIndex].quantity -= 1;
            if (oData.inventory[shieldIndex].quantity <= 0) {
                oData.inventory.splice(shieldIndex, 1);
            }
            oData.markModified('inventory');
            shieldSavedLoser = true;
            cData.baubles += wager;
        } else {
            cData.baubles += wager;
            oData.baubles -= wager;
        }
    } else {
        const shieldIndex = cData.inventory ? cData.inventory.findIndex(item => item.itemId === 'shield' && item.quantity > 0) : -1;
        if (shieldIndex !== -1) {
            cData.inventory[shieldIndex].quantity -= 1;
            if (cData.inventory[shieldIndex].quantity <= 0) {
                cData.inventory.splice(shieldIndex, 1);
            }
            cData.markModified('inventory');
            shieldSavedLoser = true;
            oData.baubles += wager;
        } else {
            cData.baubles -= wager;
            oData.baubles += wager;
        }
    }

    await cData.save();
    await oData.save();

    const finalTitle = `🏆  GRID DUEL OVER — ${winnerUser.username.toUpperCase()} WINS!`;
    const finalDesc = `${lastActionText}\n\n**${winnerUser.username}** claims the spoils!` +
        (shieldSavedLoser ? `\n\n🛡️ **${loserUser.username}**'s **Aegis Shield** broke in their inventory, protecting their wallet from losing any Baubles!` : '');

    const finalEmbed = new EmbedBuilder()
        .setColor(0x4ADE80)
        .setTitle(finalTitle)
        .setDescription(finalDesc)
        .addFields(
            {
                name: `🏆 ${winnerUser.username}'s Balance`,
                value: `**${(isChallengerWinner ? cData.baubles : oData.baubles).toLocaleString()}** Baubles`,
                inline: true,
            },
            {
                name: `💀 ${loserUser.username}'s Balance`,
                value: `**${(isChallengerWinner ? oData.baubles : cData.baubles).toLocaleString()}** Baubles`,
                inline: true,
            }
        )
        .setTimestamp();

    await challengeMsg.edit({ content: '', embeds: [finalEmbed], components: [] });
}
