/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('deathbattle')
        .setDescription('Simulate an interactive and funny death battle!')
        .addUserOption(option =>
            option.setName('user1')
                .setDescription('The first combatant (default: you)')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user2')
                .setDescription('The second combatant (default: Nishanka bot)')
                .setRequired(false)),

    async execute(interaction) {
        const user1 = interaction.options.getUser('user1') || interaction.user;
        let user2 = interaction.options.getUser('user2');

        if (!user2) {
            user2 = interaction.client.user;
        }

        if (user1.id === user2.id) {
            return interaction.reply({ content: 'You can’t battle yourself! 😹', ephemeral: true });
        }

        await runDeathBattle({
            isSlash: true,
            context: interaction,
            user1,
            user2
        });
    },

    async executePrefix(message, args) {
        // Collect all mentioned users first
        const mentions = Array.from(message.mentions.users.values());
        
        let user1, user2;

        if (mentions.length >= 2) {
            user1 = mentions[0];
            user2 = mentions[1];
        } else if (mentions.length === 1) {
            user1 = message.author;
            user2 = mentions[0];
        } else {
            // No mentions. Let's try to parse IDs from args.
            const userIds = [];
            for (const arg of args) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d+)$/);
                if (idMatch) {
                    userIds.push(idMatch[1]);
                }
            }

            const resolvedUsers = [];
            for (const id of userIds) {
                try {
                    const fetchedUser = await message.client.users.fetch(id);
                    if (fetchedUser) resolvedUsers.push(fetchedUser);
                } catch (e) {}
            }

            if (resolvedUsers.length >= 2) {
                user1 = resolvedUsers[0];
                user2 = resolvedUsers[1];
            } else if (resolvedUsers.length === 1) {
                user1 = message.author;
                user2 = resolvedUsers[0];
            } else {
                user1 = message.author;
                user2 = message.client.user;
            }
        }

        if (user1.id === user2.id) {
            return message.reply('You can’t battle yourself! 😹');
        }

        await runDeathBattle({
            isSlash: false,
            context: message,
            user1,
            user2
        });
    }
};

// ─── Main Battle Runner ──────────────────────────────────────────────────────
async function runDeathBattle({ isSlash, context, user1, user2 }) {
    const isUser2Bot = user2.bot;

    // Challenge Phase if opponent is a human
    let battleMsg;
    if (!isUser2Bot) {
        const challengeEmbed = new EmbedBuilder()
            .setColor(0xff1a1a)
            .setTitle('⚔️ DEATH BATTLE CHALLENGE')
            .setDescription(`**${user1.username}** has challenged **${user2.username}** to a death battle!\n\nDo you accept this challenge?`)
            .setFooter({ text: 'Expires in 30 seconds.' });

        const challengeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('db_challenge_accept')
                .setLabel('⚔️ Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('db_challenge_decline')
                .setLabel('🏳️ Decline')
                .setStyle(ButtonStyle.Danger)
        );

        if (isSlash) {
            battleMsg = await context.reply({
                content: `${user2}`,
                embeds: [challengeEmbed],
                components: [challengeRow],
                fetchReply: true
            });
        } else {
            battleMsg = await context.reply({
                content: `${user2}`,
                embeds: [challengeEmbed],
                components: [challengeRow]
            });
        }

        try {
            const btnInteraction = await battleMsg.awaitMessageComponent({
                filter: i => i.user.id === user2.id && ['db_challenge_accept', 'db_challenge_decline'].includes(i.customId),
                componentType: ComponentType.Button,
                time: 30_000
            });

            if (btnInteraction.customId === 'db_challenge_decline') {
                await btnInteraction.update({
                    content: '',
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff7171)
                            .setTitle('🏳️ Challenge Declined')
                            .setDescription(`**${user2.username}** chickened out of the death battle! 🐔`)
                    ],
                    components: []
                });
                return;
            }

            await btnInteraction.deferUpdate();
        } catch (e) {
            await battleMsg.edit({
                content: '',
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x747f8d)
                        .setTitle('⏰ Challenge Expired')
                        .setDescription(`**${user2.username}** didn't respond in time. The death battle challenge has expired.`)
                ],
                components: []
            });
            return;
        }
    } else {
        // Opponent is a bot, start immediately
        const startEmbed = new EmbedBuilder()
            .setColor(0xff1a1a)
            .setTitle('⚔️ DEATH BATTLE STARTED')
            .setDescription(`**${user1.username}** enters the arena against **${user2.username}**!`);
        
        if (isSlash) {
            battleMsg = await context.reply({
                embeds: [startEmbed],
                fetchReply: true
            });
        } else {
            battleMsg = await context.reply({
                embeds: [startEmbed]
            });
        }
        // Small delay before starting first turn
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Initialize state
    let p1 = {
        user: user1,
        hp: 100,
        defending: false,
        confused: false,
        soggyTurns: 0
    };
    let p2 = {
        user: user2,
        hp: 100,
        defending: false,
        confused: false,
        soggyTurns: 0
    };

    let turnPlayer = p1;
    let idlePlayer = p2;
    let turnCount = 1;
    let lastActionText = `The death battle has begun! **${p1.user.username}** takes the field first.`;

    function buildHpBar(hp) {
        const totalBlocks = 10;
        const greenBlocks = Math.round(hp / 10);
        const redBlocks = totalBlocks - greenBlocks;
        return `${'🟩'.repeat(Math.max(0, greenBlocks))}${'🟥'.repeat(Math.max(0, redBlocks))} (${hp}/100)`;
    }

    function buildGameEmbed() {
        return new EmbedBuilder()
            .setColor(0xff1a1a)
            .setTitle(`⚔️ DEATH BATTLE — Turn ${turnCount}`)
            .setDescription(`> ${lastActionText}\n\nIt is **${turnPlayer.user.username}**'s turn!`)
            .addFields(
                {
                    name: `👤 ${p1.user.username}`,
                    value: `**HP:** ${buildHpBar(p1.hp)}`,
                    inline: true
                },
                { name: '⚡', value: '**VS**', inline: true },
                {
                    name: `👤 ${p2.user.username}`,
                    value: `**HP:** ${buildHpBar(p2.hp)}`,
                    inline: true
                }
            )
            .setFooter({ text: turnPlayer.user.bot ? 'Nishanka is deciding...' : `Waiting for ${turnPlayer.user.username} to move...` })
            .setTimestamp();
    }

    function buildActionRow(disabled = false) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('db_play_attack')
                .setLabel('⚔️ Attack')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('db_play_defend')
                .setLabel('🛡️ Defend')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('db_play_chaos')
                .setLabel('🌀 Chaos')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('db_play_item')
                .setLabel('📦 Item')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );
    }

    let gameEnded = false;
    let winner = null;
    let forfeit = null;

    while (!gameEnded) {
        // If turnPlayer is confused, skip turn
        if (turnPlayer.confused) {
            turnPlayer.confused = false;
            lastActionText = `💫 **${turnPlayer.user.username}** is too confused to move and skips their turn!`;
            turnCount++;
            let temp = turnPlayer;
            turnPlayer = idlePlayer;
            idlePlayer = temp;
            await battleMsg.edit({
                embeds: [buildGameEmbed()],
                components: []
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
        }

        // Decrement soggy turns if any
        if (turnPlayer.soggyTurns > 0) {
            turnPlayer.soggyTurns--;
        }

        // Show game embed
        const buttonsDisabled = turnPlayer.user.bot;
        await battleMsg.edit({
            embeds: [buildGameEmbed()],
            components: [buildActionRow(buttonsDisabled)]
        });

        let chosenAction = null;

        if (turnPlayer.user.bot) {
            // Wait 1.5 seconds to simulate thinking
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Randomly choose action for bot
            const rand = Math.random();
            if (rand < 0.45) chosenAction = 'attack';
            else if (rand < 0.65) chosenAction = 'defend';
            else if (rand < 0.85) chosenAction = 'chaos';
            else chosenAction = 'item';
        } else {
            try {
                const btnInteraction = await battleMsg.awaitMessageComponent({
                    filter: i => i.user.id === turnPlayer.user.id && i.customId.startsWith('db_play_'),
                    componentType: ComponentType.Button,
                    time: 30_000
                });

                await btnInteraction.deferUpdate();
                chosenAction = btnInteraction.customId.replace('db_play_', '');
            } catch (e) {
                gameEnded = true;
                forfeit = turnPlayer;
                lastActionText = `⏰ **${turnPlayer.user.username}** took too long to move and forfeited the battle!`;
                break;
            }
        }

        // Execute action
        // Reset turn player's defense
        turnPlayer.defending = false;

        let damage = 0;
        let healAmount = 0;

        if (chosenAction === 'attack') {
            damage = Math.floor(Math.random() * 9) + 12; // 12-20
            // Apply defensive reductions
            if (idlePlayer.defending) {
                damage = Math.floor(damage / 2);
            }
            // Apply soggy reduction
            if (turnPlayer.soggyTurns > 0) {
                damage = Math.floor(damage * 0.7);
            }

            idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);

            const templates = [
                (att, def) => `⚔️ **${att}** slaps **${def}** with a giant smelly mackerel for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** throws a keyboard at **${def}**'s face, landing a critical key-stroke for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** performs a spectacular roundhouse kick on **${def}** for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** hits **${def}** with a barrage of wet pool noodles for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** drops an anvil on **${def}**'s head cartoon-style for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** pokes **${def}** in the eyes, classic three-stooges style, for **${damage} damage**!`,
                (att, def) => `⚔️ **${att}** tickles **${def}** relentlessly, causing them to lose **${damage} HP** from laughing!`,
                (att, def) => `⚔️ **${att}** launches a high-speed burrito at **${def}** for **${damage} damage**!`
            ];
            const t = templates[Math.floor(Math.random() * templates.length)];
            lastActionText = t(turnPlayer.user.username, idlePlayer.user.username);
            if (idlePlayer.defending) {
                lastActionText += `\n*(Defended! Half damage taken)*`;
            }
        } 
        else if (chosenAction === 'defend') {
            turnPlayer.defending = true;
            healAmount = Math.floor(Math.random() * 6) + 5; // 5-10
            turnPlayer.hp = Math.min(100, turnPlayer.hp + healAmount);

            const templates = [
                (att) => `🛡️ **${att}** hides behind a giant cardboard box! *(Healed ${healAmount} HP, takes 50% less damage next turn)*`,
                (att) => `🛡️ **${att}** prepares a shield made of toasted garlic bread! *(Healed ${healAmount} HP, takes 50% less damage next turn)*`,
                (att) => `🛡️ **${att}** starts doing a ridiculous defensive matrix dance! *(Healed ${healAmount} HP, takes 50% less damage next turn)*`,
                (att) => `🛡️ **${att}** builds a fort out of sofa cushions! *(Healed ${healAmount} HP, takes 50% less damage next turn)*`
            ];
            const t = templates[Math.floor(Math.random() * templates.length)];
            lastActionText = t(turnPlayer.user.username);
        }
        else if (chosenAction === 'chaos') {
            const outcome = Math.random();
            if (outcome < 0.35) {
                // Super blast
                damage = Math.floor(Math.random() * 21) + 30; // 30-50
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                lastActionText = `🌀 **${turnPlayer.user.username}** tries a chaotic spell and accidentally unleashes a super blast, hitting **${idlePlayer.user.username}** for **${damage} damage**!`;
                if (idlePlayer.defending) lastActionText += `\n*(Defended! Half damage taken)*`;
            } else if (outcome < 0.70) {
                // Backfire
                damage = Math.floor(Math.random() * 11) + 15; // 15-25
                turnPlayer.hp = Math.max(0, turnPlayer.hp - damage);
                lastActionText = `🌀 **${turnPlayer.user.username}**'s chaotic spell backfired! They ended up hitting themselves for **${damage} damage**!`;
            } else if (outcome < 0.85) {
                // HP Swap
                const tempHp = turnPlayer.hp;
                turnPlayer.hp = idlePlayer.hp;
                idlePlayer.hp = tempHp;
                lastActionText = `🌀 **${turnPlayer.user.username}** casts a reality-bending spell and **swaps HP** with **${idlePlayer.user.username}**! What a turn of events!`;
            } else {
                // Tea Time
                turnPlayer.hp = Math.min(100, turnPlayer.hp + 15);
                idlePlayer.hp = Math.min(100, idlePlayer.hp + 15);
                lastActionText = `🌀 **${turnPlayer.user.username}**'s chaos spell summoned a pleasant tea set. Both players take a break and restore **15 HP**! ☕`;
            }
        }
        else if (chosenAction === 'item') {
            const itemOptions = ['nokia', 'duck', 'shark', 'towel', 'system32'];
            const chosenItem = itemOptions[Math.floor(Math.random() * itemOptions.length)];

            if (chosenItem === 'nokia') {
                damage = Math.floor(Math.random() * 11) + 20; // 20-30
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                lastActionText = `📦 **${turnPlayer.user.username}** throws an indestructible **Nokia 3310** at **${idlePlayer.user.username}** for **${damage} damage**! (Unblockable!)`;
            } 
            else if (chosenItem === 'duck') {
                damage = 5;
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                idlePlayer.confused = true;
                lastActionText = `📦 **${turnPlayer.user.username}** squeezes a squeaky **Rubber Duck**. **${idlePlayer.user.username}** is so confused by the squeak they are stunned for the next turn! *(Deals 5 damage)* 🦆`;
            }
            else if (chosenItem === 'shark') {
                damage = 15;
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                healAmount = 10;
                
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                turnPlayer.hp = Math.min(100, turnPlayer.hp + healAmount);
                lastActionText = `📦 **${turnPlayer.user.username}** plays **Baby Shark** on loop. **${idlePlayer.user.username}** takes **${damage} mental damage**, while **${turnPlayer.user.username}** absorbs their sanity to heal **${healAmount} HP**! 🎶`;
                if (idlePlayer.defending) lastActionText += `\n*(Defended! Half damage taken)*`;
            }
            else if (chosenItem === 'towel') {
                damage = 10;
                if (idlePlayer.defending) damage = Math.floor(damage / 2);
                if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                
                idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                idlePlayer.soggyTurns = 2;
                lastActionText = `📦 **${turnPlayer.user.username}** whips **${idlePlayer.user.username}** with a cold, wet towel for **${damage} damage**. **${idlePlayer.user.username}** is now soggy, reducing their damage output by 30% for 2 turns!`;
                if (idlePlayer.defending) lastActionText += `\n*(Defended! Half damage taken)*`;
            }
            else if (chosenItem === 'system32') {
                if (Math.random() < 0.8) {
                    damage = 35;
                    if (idlePlayer.defending) damage = Math.floor(damage / 2);
                    if (turnPlayer.soggyTurns > 0) damage = Math.floor(damage * 0.7);
                    idlePlayer.hp = Math.max(0, idlePlayer.hp - damage);
                    lastActionText = `📦 **${turnPlayer.user.username}** deleted **${idlePlayer.user.username}**'s System32 folder, causing a major crash for **${damage} damage**!`;
                    if (idlePlayer.defending) lastActionText += `\n*(Defended! Half damage taken)*`;
                } else {
                    lastActionText = `📦 **${turnPlayer.user.username}** tried to delete System32, but got a Windows Update screen and accomplished nothing!`;
                }
            }
        }

        // Check if game ended
        if (idlePlayer.hp <= 0) {
            gameEnded = true;
            winner = turnPlayer;
        } else {
            // Swap turns
            turnCount++;
            let temp = turnPlayer;
            turnPlayer = idlePlayer;
            idlePlayer = temp;
        }
    }

    // Determine end results
    let finalEmbed;
    if (forfeit) {
        const winnerUser = forfeit.user.id === p1.user.id ? p2.user : p1.user;
        finalEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🏆 DEATH BATTLE OVER')
            .setDescription(`**${forfeit.user.username}** forfeited the battle.\n\n👑 **Winner:** **${winnerUser.username}**`);
    } else {
        const loser = winner.user.id === p1.user.id ? p2 : p1;
        finalEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🏆 DEATH BATTLE OVER')
            .setDescription(
                `> ${lastActionText}\n\n` +
                `👑 **Winner:** **${winner.user.username}** (HP: ${winner.hp}/100)\n` +
                `💀 **Loser:** ~~${loser.user.username}~~ (HP: 0/100)`
            )
            .setThumbnail(winner.user.displayAvatarURL({ dynamic: true }));
    }

    await battleMsg.edit({
        embeds: [finalEmbed],
        components: []
    });
}
