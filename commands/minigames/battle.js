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

// ─── HP Bar Renderer ─────────────────────────────────────────────────────────
function buildHpBar(hp, maxHp = 100) {
    const filledBlocks = Math.round((hp / maxHp) * 10);
    const filled = Math.max(0, Math.min(10, filledBlocks));
    const empty = 10 - filled;
    
    // 🟥 for low health, 🟨 for medium, 🟩 for high
    let blockChar = '🟩';
    if (filled <= 3) blockChar = '🟥';
    else if (filled <= 6) blockChar = '🟨';
    
    return `${blockChar.repeat(filled)}${'⬛'.repeat(empty)}`;
}

// ─── Energy Renderer ─────────────────────────────────────────────────────────
function buildEnergy(energy) {
    const maxEnergy = 3;
    const current = Math.max(0, Math.min(maxEnergy, energy));
    return `${'⚡'.repeat(current)}${'⚪'.repeat(maxEnergy - current)}`;
}

// ─── Build Action Row ────────────────────────────────────────────────────────
function buildActionRow(playerEnergy) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('battle_strike')
            .setLabel('Strike (+1 ⚡)')
            .setEmoji('👊')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('battle_defend')
            .setLabel('Defend (+1 ⚡)')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('battle_heavy')
            .setLabel('Heavy (-1 ⚡)')
            .setEmoji('🗡️')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(playerEnergy < 1),
        new ButtonBuilder()
            .setCustomId('battle_heal')
            .setLabel('Heal (-2 ⚡)')
            .setEmoji('🩹')
            .setStyle(ButtonStyle.Success)
            .setDisabled(playerEnergy < 2),
        new ButtonBuilder()
            .setCustomId('battle_ultimate')
            .setLabel('Ultimate (-3 ⚡)')
            .setEmoji('💥')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(playerEnergy < 3)
    );
}

module.exports = {
    category: 'minigames',
    cooldown: 15,

    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Challenge someone to a Turn-Based Arena Brawl!')
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

        const { parseAmount } = require('../../utils/economyEngine');
        const wager = parseAmount(args[1]);
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
        const err = '❌ You can\'t battle yourself… or can you? (No, you can\'t.)';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (wager < 1000) {
        const err = '❌ Minimum wager is **1,000 Baubles**.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    // ── Fetch balances ────────────────────────────────────────────────────────
    let cData = await Bauble.findOne({ userId: challenger.id });
    let oData = await Bauble.findOne({ userId: opponent.id });

    if (cData && cData.passiveMode) {
        const err = '❌ You cannot battle while you are in Passive Mode! Use `/passive` to toggle it off.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (oData && oData.passiveMode) {
        const err = `❌ **${opponent.username}** is in Passive Mode and cannot be challenged to battles!`;
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

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
        .setColor(0x7c6cf0)
        .setTitle('⚔️  ARENA BRAWL — CHALLENGE ISSUED')
        .setDescription(
            `${opponent} — **${challenger.displayName ?? challenger.username}** is calling you out!\n\n` +
            `They're wagering **${wager.toLocaleString()} Baubles** on a Turn-Based Street Fight.\n` +
            `Do you accept?`
        )
        .setFooter({ text: 'Challenge expires in 60 seconds.' })
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
            filter: i => i.user.id === opponent.id && ['battle_accept', 'battle_decline'].includes(i.customId),
            componentType: ComponentType.Button,
            time: 60_000,
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
        await btnInteraction.deferUpdate(); // Acknowledge so we can freely edit challengeMsg
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

    // ── Game state ────────────────────────────────────────────────────────────
    let p1 = {
        user: challenger,
        hp: 100,
        energy: 0,
        defending: false
    };
    let p2 = {
        user: opponent,
        hp: 100,
        energy: 0,
        defending: false
    };

    let turnPlayer = p1;
    let idlePlayer = p2;
    let turnCount = 1;
    let lastActionText = `The fight begins! **${p1.user.username}** gets the first move.`;

    // ── Scoreboard embed builder ──────────────────────────────────────────────
    function buildGameEmbed() {
        return new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`⚔️  ARENA BRAWL — Turn ${turnCount}`)
            .setDescription(`**Wager:** ${wager.toLocaleString()} Baubles\n\n> ${lastActionText}\n\nIt is **${turnPlayer.user.username}**'s turn!`)
            .addFields(
                {
                    name: `🛡️ ${p1.user.username}`,
                    value: `**HP:** ${buildHpBar(p1.hp)}\n**Energy:** ${buildEnergy(p1.energy)}`,
                    inline: true,
                },
                { name: '╸╸╸', value: '**VS**', inline: true },
                {
                    name: `🛡️ ${p2.user.username}`,
                    value: `**HP:** ${buildHpBar(p2.hp)}\n**Energy:** ${buildEnergy(p2.energy)}`,
                    inline: true,
                }
            )
            .setFooter({ text: 'You have 60 seconds to make a move.' })
            .setTimestamp();
    }

    // ── Game Loop ─────────────────────────────────────────────────────────────
    let gameEnded = false;
    let forfeit = null;

    while (!gameEnded) {
        await challengeMsg.edit({
            content: `${turnPlayer.user}`,
            embeds: [buildGameEmbed()],
            components: [buildActionRow(turnPlayer.energy)]
        });

        try {
            const btnInteraction = await challengeMsg.awaitMessageComponent({
                filter: i => i.user.id === turnPlayer.user.id && i.customId.startsWith('battle_'),
                componentType: ComponentType.Button,
                time: 60_000,
            });

            await btnInteraction.deferUpdate();
            const action = btnInteraction.customId.replace('battle_', '');
            
            // Reset defender's block status if it's their turn (block only lasts until their next turn)
            turnPlayer.defending = false;

            let damage = 0;
            let healAmount = 0;

            if (action === 'strike') {
                damage = Math.floor(Math.random() * 6) + 10; // 10-15
                turnPlayer.energy = Math.min(3, turnPlayer.energy + 1);
                
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                idlePlayer.hp -= damage;
                lastActionText = `👊 **${turnPlayer.user.username}** strikes for **${damage} damage** and gains 1 Energy!`;
                if (idlePlayer.defending) lastActionText += `\n*(${idlePlayer.user.username} deflected half the damage!)*`;
            } 
            else if (action === 'defend') {
                turnPlayer.defending = true;
                turnPlayer.energy = Math.min(3, turnPlayer.energy + 1);
                lastActionText = `🛡️ **${turnPlayer.user.username}** takes a defensive stance and gains 1 Energy!\n*(They will take 50% less damage next turn)*`;
            }
            else if (action === 'heavy') {
                turnPlayer.energy -= 1;
                damage = Math.floor(Math.random() * 11) + 20; // 20-30
                
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                idlePlayer.hp -= damage;
                lastActionText = `🗡️ **${turnPlayer.user.username}** lands a heavy attack for **${damage} damage**!`;
                if (idlePlayer.defending) lastActionText += `\n*(${idlePlayer.user.username} deflected half the damage!)*`;
            }
            else if (action === 'heal') {
                turnPlayer.energy -= 2;
                healAmount = Math.floor(Math.random() * 11) + 25; // 25-35
                turnPlayer.hp = Math.min(100, turnPlayer.hp + healAmount);
                lastActionText = `🩹 **${turnPlayer.user.username}** patches themselves up, restoring **${healAmount} HP**!`;
            }
            else if (action === 'ultimate') {
                turnPlayer.energy -= 3;
                damage = Math.floor(Math.random() * 16) + 45; // 45-60
                
                // Ultimate is unblockable
                idlePlayer.hp -= damage;
                lastActionText = `💥 **${turnPlayer.user.username}** unleashes an unblockable **ULTIMATE** for **${damage} massive damage**!`;
            }

            if (idlePlayer.hp <= 0) {
                idlePlayer.hp = 0;
                gameEnded = true;
            } else {
                // Swap turns
                turnCount++;
                let temp = turnPlayer;
                turnPlayer = idlePlayer;
                idlePlayer = temp;
            }

        } catch (error) {
            // Timeout
            gameEnded = true;
            forfeit = turnPlayer;
            lastActionText = `⏰ **${turnPlayer.user.username}** took too long to move and forfeited the match! (60s limit)`;
        }
    }

    // ── Determine winner ──────────────────────────────────────────────────────
    let winnerUser, loserUser;
    
    if (forfeit) {
        loserUser = forfeit.user;
        winnerUser = forfeit.user.id === p1.user.id ? p2.user : p1.user;
    } else {
        winnerUser = p1.hp > p2.hp ? p1.user : p2.user;
        loserUser = p1.hp > p2.hp ? p2.user : p1.user;
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

    const finalTitle = `🏆  ARENA BRAWL — ${winnerUser.username.toUpperCase()} WINS!`;
    const finalDesc = `${lastActionText}\n\n**${winnerUser.username}** defeated **${loserUser.username}** and claims the spoils!` +
        (shieldSavedLoser ? `\n\n🛡️ **${loserUser.username}**'s **Aegis Shield** broke, protecting them from losing any Baubles!` : '');

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