// commands/economy/buckshot.js
/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const ITEMS = [
    { id: 'magnifier', name: 'Magnifying Glass', emoji: '🔍', desc: 'Check the current shell secretly.' },
    { id: 'beer', name: 'Energy Drink', emoji: '🍺', desc: 'Rack the shotgun, ejecting the current shell.' },
    { id: 'cigar', name: 'Cigar', emoji: '🚬', desc: 'Heals you for 1 HP.' },
    { id: 'saw', name: 'Handsaw', emoji: '🪚', desc: 'Your next shot deals 2 damage.' },
    { id: 'handcuffs', name: 'Handcuffs', emoji: '🔗', desc: 'Opponent skips their next turn.' },
    { id: 'inverter', name: 'Inverter', emoji: '🔄', desc: 'Inverts the current shell in the chamber (live becomes blank, blank becomes live).' }
];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildHp(hp, maxHp = 4) {
    const safeHp = Math.max(0, Math.min(hp, maxHp));
    return '🟩'.repeat(safeHp) + '⬛'.repeat(maxHp - safeHp);
}

function reloadShotgun() {
    // Generate 2 to 8 shells
    const count = Math.floor(Math.random() * 7) + 2;
    let live = 0;
    let blank = 0;
    
    if (count % 2 === 0) {
        live = count / 2;
        blank = count / 2;
    } else {
        live = Math.random() > 0.5 ? Math.ceil(count / 2) : Math.floor(count / 2);
        blank = count - live;
    }
    
    const shells = [];
    for (let i = 0; i < live; i++) shells.push('live');
    for (let i = 0; i < blank; i++) shells.push('blank');
    
    // Shuffle
    for (let i = shells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shells[i], shells[j]] = [shells[j], shells[i]];
    }
    
    return { shells, live, blank };
}

function giveItems(player, amount) {
    for(let i=0; i<amount; i++) {
        if (player.items.length < 8) {
            player.items.push(getRandom(ITEMS));
        }
    }
}

module.exports = {
    category: 'casino',
    cooldown: 15,

    data: new SlashCommandBuilder()
        .setName('buckshot')
        .setDescription('Play Buckshot Showdown with someone!')
        .addUserOption(o =>
            o.setName('opponent')
                .setDescription('The user you want to challenge.')
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName('wager')
                .setDescription('How many Baubles to put on the line (e.g. 1000, 1k, all, half, 50%)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const baubleData = await require('../../models/baubleSchema').findOne({ userId });
        const wagerVal = interaction.options.get('wager')?.value;
        const wagerStr = wagerVal !== undefined ? String(wagerVal) : '';
        const wager = require('../../utils/economyEngine').parseAmount(wagerStr, baubleData?.baubles ?? 0);
        if (isNaN(wager) || wager < 1000) {
            return interaction.reply({ content: '❌ Minimum wager is **1,000 Baubles**. Use a number, `all`, `half`, or `50%`.', ephemeral: true });
        }
        await runBuckshot({
            isSlash: true,
            interaction,
            challenger: interaction.user,
            opponent: interaction.options.getUser('opponent'),
            wager,
        });
    },

    async executePrefix(message, args) {
        if (args.length < 2) {
            return message.reply('❌ Usage: `-buckshot @user <wager>`');
        }

        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        if (!mentionMatch) {
            return message.reply('❌ Please mention a valid user. Example: `-buckshot @someone 1000`');
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
        const baubleData = await require('../../models/baubleSchema').findOne({ userId: message.author.id });
        const wager = parseAmount(args[1], baubleData?.baubles ?? 0);
        if (isNaN(wager) || wager < 1000) {
            return message.reply('❌ Minimum wager is **1,000 Baubles**.');
        }

        await runBuckshot({
            isSlash: false,
            message,
            challenger: message.author,
            opponent,
            wager,
        });
    },
};

// ─── Main Game Runner ────────────────────────────────────────────────────────

async function runBuckshot({ isSlash, interaction, message, challenger, opponent, wager }) {
    const channel = isSlash ? interaction.channel : message.channel;

    // Validate players
    if (!opponent) {
        const err = '❌ Please mention a valid user to challenge.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (opponent.bot) {
        const err = '❌ Bots don\'t play Buckshot Showdown!';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (opponent.id === challenger.id) {
        const err = '❌ You can\'t play against yourself.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }
    if (wager < 1000) {
        const err = '❌ Minimum wager is **1,000 Baubles**.';
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    // Fetch balances
    let cData = await Bauble.findOne({ userId: challenger.id });
    let oData = await Bauble.findOne({ userId: opponent.id });

    if (!cData || cData.baubles < wager) {
        const err = `❌ You don't have enough Baubles for this wager.`;
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    if (!oData || oData.baubles < wager) {
        const err = `❌ **${opponent.username}** doesn't have enough Baubles for this wager.`;
        return isSlash ? interaction.reply({ content: err, ephemeral: true }) : message.reply(err);
    }

    // Challenge embed
    const challengeEmbed = new EmbedBuilder()
        .setColor(0x8B0000) // Dark red
        .setTitle('🩸 BUCKSHOT SHOWDOWN 🩸')
        .setDescription(
            `${opponent} — **${challenger.displayName ?? challenger.username}** has challenged you to Buckshot Showdown!\n\n` +
            `They're wagering **${wager.toLocaleString()} Baubles**.\n` +
            `Do you accept?`
        )
        .setFooter({ text: 'Challenge expires in 60 seconds.' })
        .setTimestamp();

    const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buckshot_accept').setLabel('🔫 Accept').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('buckshot_decline').setLabel('🏳️ Decline').setStyle(ButtonStyle.Secondary)
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

    // Wait for accept/decline
    let accepted = false;
    try {
        const btnInteraction = await challengeMsg.awaitMessageComponent({
            filter: i => i.user.id === opponent.id && ['buckshot_accept', 'buckshot_decline'].includes(i.customId),
            componentType: ComponentType.Button,
            time: 60_000,
        });

        if (btnInteraction.customId === 'buckshot_decline') {
            await btnInteraction.update({
                content: '',
                embeds: [new EmbedBuilder().setColor(0x444444).setTitle('🏳️ Challenge Declined').setDescription(`**${opponent.username}** chose life. No Baubles were lost.`)],
                components: [],
            });
            return;
        }

        accepted = true;
        await btnInteraction.deferUpdate();
    } catch {
        await challengeMsg.edit({
            content: '',
            embeds: [new EmbedBuilder().setColor(0x444444).setTitle('⏰ Challenge Expired').setDescription(`**${opponent.username}** didn't respond in time.`)],
            components: [],
        });
        return;
    }

    if (!accepted) return;

    // Game state
    const p1 = { user: challenger, hp: 4, maxHp: 4, items: [] };
    const p2 = { user: opponent, hp: 4, maxHp: 4, items: [] };

    const startingPlayer = Math.random() > 0.5 ? p1 : p2;
    let turnPlayer = startingPlayer;
    let idlePlayer = startingPlayer === p1 ? p2 : p1;
    let { shells, live, blank } = reloadShotgun();
    
    // Fair item distribution: give both players the same number of items at the start
    const startItemCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 items
    giveItems(p1, startItemCount);
    giveItems(p2, startItemCount);

    let lastActionText = `🔄 The shotgun is loaded with **${live} Live** (🔴) and **${blank} Blank** (⚪) shells.\n**${turnPlayer.user.username}** grabs the shotgun first.`;
    let gameEnded = false;
    let forfeit = null;
    let sawActive = false;
    let handcuffed = null;

    // Embed builder
    function buildGameEmbed() {
        // Items string formatting
        const formatItems = (player) => player.items.map(i => i.emoji).join('') || '*(None)*';
        
        const embed = new EmbedBuilder()
            .setColor(sawActive ? 0xFF0000 : 0x8B0000)
            .setTitle('🩸 BUCKSHOT SHOWDOWN 🩸')
            .setDescription(`**Wager:** ${wager.toLocaleString()} Baubles\n\n> ${lastActionText}\n\nIt is **${turnPlayer.user.username}**'s turn!`)
            .addFields(
                { name: `${p1.user.username}`, value: `**HP:** ${buildHp(p1.hp, p1.maxHp)}\n**Items:** ${formatItems(p1)}`, inline: true },
                { name: '╸╸╸', value: '**VS**', inline: true },
                { name: `${p2.user.username}`, value: `**HP:** ${buildHp(p2.hp, p2.maxHp)}\n**Items:** ${formatItems(p2)}`, inline: true },
                { name: 'Shells Known', value: `🔴 **${live}** Live  |  ⚪ **${blank}** Blank`, inline: false }
            )
            .setFooter({ text: 'You have 60 seconds to make a move.' })
            .setTimestamp();
            
        return embed;
    }

    function buildComponents() {
        const rows = [];
        
        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shoot_opp').setLabel(`Shoot ${idlePlayer.user.username}`).setStyle(ButtonStyle.Danger).setEmoji('💥'),
            new ButtonBuilder().setCustomId('shoot_self').setLabel('Shoot Self').setStyle(ButtonStyle.Secondary).setEmoji('🔫')
        );
        rows.push(btnRow);

        if (turnPlayer.items.length > 0) {
            const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('use_item')
                .setPlaceholder('Use an item...')
                .addOptions(turnPlayer.items.map((item, index) => ({
                    label: item.name,
                    description: item.desc,
                    emoji: item.emoji,
                    value: `${item.id}_${index}` // ensure unique keys
                })));
            rows.push(new ActionRowBuilder().addComponents(itemSelect));
        }

        return rows;
    }

    // Game Loop
    while (!gameEnded) {
        if (shells.length === 0) {
            let reload = reloadShotgun();
            shells = reload.shells;
            live = reload.live;
            blank = reload.blank;
            // Fair item distribution: give both players the same number of items on reload
            const reloadItemCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 items
            giveItems(p1, reloadItemCount);
            giveItems(p2, reloadItemCount);
            lastActionText += `\n\n🔄 **RELOADED:** The shotgun now has **${live} Live** (🔴) and **${blank} Blank** (⚪) shells.`;
        }

        if (handcuffed === turnPlayer.user.id) {
            lastActionText += `\n🔗 **${turnPlayer.user.username}** is handcuffed and skips their turn!`;
            handcuffed = null; // remove cuffs
            let temp = turnPlayer; turnPlayer = idlePlayer; idlePlayer = temp;
            
            // Loop again to redraw with new turnPlayer
            continue;
        }

        await challengeMsg.edit({
            content: `${turnPlayer.user}`,
            embeds: [buildGameEmbed()],
            components: buildComponents()
        });

        try {
            const btnInteraction = await challengeMsg.awaitMessageComponent({
                filter: i => i.user.id === turnPlayer.user.id && (i.customId === 'shoot_opp' || i.customId === 'shoot_self' || i.customId === 'use_item'),
                time: 60_000,
            });

            if (btnInteraction.isStringSelectMenu() && btnInteraction.customId === 'use_item') {
                const val = btnInteraction.values[0]; // e.g., 'beer_2'
                const index = parseInt(val.split('_')[1], 10);
                const item = turnPlayer.items[index];
                
                // Remove item
                turnPlayer.items.splice(index, 1);

                if (item.id === 'magnifier') {
                    const currentShell = shells[0];
                    await btnInteraction.reply({ content: `🔍 You secretly check the chamber... it's a **${currentShell.toUpperCase()}** shell!`, ephemeral: true });
                    lastActionText = `🔍 **${turnPlayer.user.username}** used a **Magnifying Glass** and checked the chamber secretly.`;
                }
                else if (item.id === 'beer') {
                    const ejected = shells.shift();
                    if (ejected === 'live') live--; else blank--;
                    await btnInteraction.deferUpdate();
                    lastActionText = `🍺 **${turnPlayer.user.username}** drank an **Energy Drink** and racked the shotgun.\nA **${ejected.toUpperCase()}** shell popped out!`;
                }
                else if (item.id === 'cigar') {
                    turnPlayer.hp = Math.min(turnPlayer.maxHp, turnPlayer.hp + 1);
                    await btnInteraction.deferUpdate();
                    lastActionText = `🚬 **${turnPlayer.user.username}** smoked a **Cigar** and regained 1 HP.`;
                }
                else if (item.id === 'saw') {
                    sawActive = true;
                    await btnInteraction.deferUpdate();
                    lastActionText = `🪚 **${turnPlayer.user.username}** used a **Handsaw** on the barrel.\nThe next shot will deal **2 damage**!`;
                }
                else if (item.id === 'handcuffs') {
                    handcuffed = idlePlayer.user.id;
                    await btnInteraction.deferUpdate();
                    lastActionText = `🔗 **${turnPlayer.user.username}** put **Handcuffs** on **${idlePlayer.user.username}**.\nThey will skip their next turn!`;
                }
                else if (item.id === 'inverter') {
                    const currentShell = shells[0];
                    if (currentShell === 'live') {
                        shells[0] = 'blank';
                        live--;
                        blank++;
                    } else {
                        shells[0] = 'live';
                        blank--;
                        live++;
                    }
                    await btnInteraction.deferUpdate();
                    lastActionText = `🔄 **${turnPlayer.user.username}** used an **Inverter**.\nThe shell in the chamber has been **INVERTED**!`;
                }
                
                continue; // Redraw UI
            } 
            else if (btnInteraction.isButton()) {
                const action = btnInteraction.customId;
                const currentShell = shells.shift();
                if (currentShell === 'live') live--; else blank--;
                
                let damage = sawActive ? 2 : 1;
                sawActive = false; // consume saw
                
                await btnInteraction.deferUpdate();

                if (action === 'shoot_opp') {
                    if (currentShell === 'live') {
                        idlePlayer.hp -= damage;
                        lastActionText = `💥 **${turnPlayer.user.username}** shot **${idlePlayer.user.username}**!\nIt was a **LIVE** shell! (${damage} damage)`;
                    } else {
                        lastActionText = `💨 **${turnPlayer.user.username}** shot **${idlePlayer.user.username}**...\n*Click.* It was a **BLANK**.`;
                    }
                    // Swap turns
                    let temp = turnPlayer; turnPlayer = idlePlayer; idlePlayer = temp;
                }
                else if (action === 'shoot_self') {
                    if (currentShell === 'live') {
                        turnPlayer.hp -= damage;
                        lastActionText = `💥 **${turnPlayer.user.username}** shot themselves!\nIt was a **LIVE** shell! (${damage} damage)`;
                        // Swap turns
                        let temp = turnPlayer; turnPlayer = idlePlayer; idlePlayer = temp;
                    } else {
                        lastActionText = `💨 **${turnPlayer.user.username}** shot themselves...\n*Click.* It was a **BLANK**.\nThey get to go again!`;
                        // Turn player does NOT swap
                    }
                }

                if (turnPlayer.hp <= 0 || idlePlayer.hp <= 0) {
                    gameEnded = true;
                }
            }

        } catch (error) {
            // Timeout
            gameEnded = true;
            forfeit = turnPlayer;
            lastActionText = `⏰ **${turnPlayer.user.username}** took too long to move and forfeit the match!`;
        }
    }

    // Game Over ─────────────────────────────────────────────────────────────
    let winnerUser, loserUser;
    
    if (forfeit) {
        loserUser = forfeit.user;
        winnerUser = forfeit.user.id === p1.user.id ? p2.user : p1.user;
    } else {
        winnerUser = p1.hp > p2.hp ? p1.user : p2.user;
        loserUser = p1.hp > p2.hp ? p2.user : p1.user;
    }

    // Refresh db data
    cData = await Bauble.findOne({ userId: challenger.id });
    oData = await Bauble.findOne({ userId: opponent.id });

    const isChallengerWinner = winnerUser.id === challenger.id;

    if (isChallengerWinner) {
        cData.baubles += wager;
        oData.baubles -= wager;
    } else {
        cData.baubles -= wager;
        oData.baubles += wager;
    }

    await cData.save();
    await oData.save();

    const finalTitle = `🏆 BUCKSHOT SHOWDOWN — ${winnerUser.username.toUpperCase()} SURVIVES!`;
    const finalDesc = `${lastActionText}\n\n**${winnerUser.username}** survived the showdown against **${loserUser.username}** and claims the **${(wager * 2).toLocaleString()} Baubles** pot!`;

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
