/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const activeGames = new Set();

const ROLES = {
    MAFIA: 'Mafia 🔪',
    DOCTOR: 'Doctor 🛡️',
    DETECTIVE: 'Detective 🔍',
    VILLAGER: 'Villager 🌾'
};

const ALIGNMENTS = {
    MAFIA: 'Mafia',
    TOWN: 'Town'
};

const BOT_NAMES = ['Alice 🌸', 'Bob 🦊', 'Charlie 🐼', 'Dave 🐨', 'Emily 🦄'];

module.exports = {
    category: 'minigames',
    aliases: ['mafiagame'],
    data: new SlashCommandBuilder()
        .setName('mafia')
        .setDescription('Play a game of Mafia (Werewolf) - Solo with bots or Party with friends!')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Select Solo (play with bots) or Party (multiplayer)')
                .setRequired(false)
                .addChoices(
                    { name: 'Solo (with Bots)', value: 'solo' },
                    { name: 'Party (Multiplayer)', value: 'party' }
                )
        ),

    async execute(context) {
        const isSlash = !!context.options;
        const channel = context.channel;
        const author = isSlash ? context.user : context.author;
        const member = context.member;
        const client = context.client || channel.client;

        let mode = 'solo';
        if (isSlash) {
            mode = context.options.getString('mode') || 'solo';
        } else if (context.args && context.args.length > 0) {
            const arg = context.args[0].toLowerCase();
            if (arg === 'party' || arg === 'multiplayer' || arg === 'lobby') mode = 'party';
        }

        const reply = async (opts) => isSlash ? await context.reply(opts) : await channel.send(opts);

        if (activeGames.has(channel.id)) {
            return await reply({ content: '❌ A Mafia game is already running in this channel!', ephemeral: true });
        }
        activeGames.add(channel.id);

        const gameId = Math.random().toString(36).substring(2, 9);
        let gameActive = true;

        try {
            if (mode === 'solo') {
                await runSoloGame({ context, channel, author, isSlash, reply, gameId });
            } else {
                await runPartyGame({ context, channel, author, isSlash, reply, gameId });
            }
        } catch (err) {
            console.error('[Mafia] Game Error:', err);
            await channel.send('💥 An unexpected error occurred while running the Mafia game.');
        } finally {
            activeGames.delete(channel.id);
        }
    },

    async executePrefix(message, args) {
        await this.execute({
            client: message.client,
            user: message.author,
            author: message.author,
            member: message.member,
            channel: message.channel,
            message: message,
            args: args,
        });
    }
};

// ==========================================
// SOLO GAME LOGIC (vs BOTS)
// ==========================================
async function runSoloGame({ context, channel, author, isSlash, reply, gameId }) {
    // 1. Initialize Players
    const players = [
        { id: author.id, name: author.username, isBot: false, isAlive: true, role: null, alignment: null, suspicion: 0 },
        ...BOT_NAMES.map((name, idx) => ({ id: `bot_${idx}`, name, isBot: true, isAlive: true, role: null, alignment: null, suspicion: 10 }))
    ];

    // 2. Distribute Roles
    const rolesList = [ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
    for (let i = rolesList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesList[i], rolesList[j]] = [rolesList[j], rolesList[i]];
    }

    players.forEach((p, idx) => {
        p.role = rolesList[idx];
        p.alignment = p.role === ROLES.MAFIA ? ALIGNMENTS.MAFIA : ALIGNMENTS.TOWN;
    });

    const userPlayer = players.find(p => p.id === author.id);

    // 3. Show Start Embed
    const startEmbed = new EmbedBuilder()
        .setColor(0x2c3e50)
        .setTitle('🕵️‍♂️ Mafia: Solo Mode')
        .setDescription(
            `Welcome to the town of Nishanka! You are playing with 5 AI bots.\n\n` +
            `🎭 **Your Secret Role:** **${userPlayer.role}**\n` +
            `🛡️ **Your Alignment:** **${userPlayer.alignment}**\n\n` +
            `**Town Members:**\n` +
            players.map(p => `• ${p.id === author.id ? `👤 **${p.name}** (You)` : `🤖 ${p.name}`}`).join('\n') + `\n\n` +
            `*There is 1 Mafia in the town. Can you locate and lynch them before they take over?*`
        )
        .setFooter({ text: 'Mafia Minigame • Nishanka' })
        .setTimestamp();

    const startRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mafia_start_solo_${gameId}`)
            .setLabel('Begin Night 1 🌃')
            .setStyle(ButtonStyle.Primary)
    );

    let mainMsg;
    if (isSlash) {
        mainMsg = await context.reply({ embeds: [startEmbed], components: [startRow], fetchReply: true });
    } else {
        mainMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });
    }

    // Setup Main Collector
    const collector = mainMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 900000 // 15 mins timeout
    });

    let round = 1;
    let phase = 'lobby'; // 'lobby', 'night', 'day_announce', 'day_discuss', 'day_vote', 'ended'
    
    // Actions log
    let userNightActionTarget = null;
    let detectiveScanResult = null;
    let nightOutcomeText = '';
    let discussionChatText = '';
    let voteTallyText = '';
    let lynchedText = '';

    // Promises for user choices
    let userChoiceResolve = null;

    collector.on('collect', async (interaction) => {
        // Ensure only the host can trigger game state buttons, but anyone alive can trigger their own actions
        const customId = interaction.customId;
        
        if (!customId.endsWith(gameId)) return;

        if (customId.startsWith('mafia_start_solo_') || customId.startsWith('mafia_discuss_') || customId.startsWith('mafia_go_vote_') || customId.startsWith('mafia_next_night_') || customId.startsWith('mafia_end_game_')) {
            if (interaction.user.id !== author.id) {
                return await interaction.reply({ content: '❌ Only the host can advance the game phases.', ephemeral: true });
            }
        }

        if (customId.startsWith('mafia_start_solo_')) {
            await interaction.deferUpdate();
            phase = 'night';
            await runNightPhase();
        } else if (customId.startsWith('mafia_action_btn_')) {
            // Ephemeral night action panel
            if (!userPlayer.isAlive) {
                return await interaction.reply({ content: '💀 You are dead and cannot perform actions.', ephemeral: true });
            }

            const aliveOthers = players.filter(p => p.isAlive && p.id !== author.id);

            if (userPlayer.role === ROLES.VILLAGER) {
                return await interaction.reply({
                    content: '💤 **You are a Villager.** You have no active night roles. Sleep well and hope the Doctor protects you!',
                    ephemeral: true
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mafia_action_select_${gameId}`)
                .setPlaceholder('Select your target...');

            if (userPlayer.role === ROLES.MAFIA) {
                selectMenu.addOptions(aliveOthers.map(p => ({ label: p.name, value: p.id, emoji: '🔪' })));
            } else if (userPlayer.role === ROLES.DOCTOR) {
                // Doctor can protect anyone including themselves
                const aliveAll = players.filter(p => p.isAlive);
                selectMenu.addOptions(aliveAll.map(p => ({ label: p.id === author.id ? 'Protect Yourself' : p.name, value: p.id, emoji: '🛡️' })));
            } else if (userPlayer.role === ROLES.DETECTIVE) {
                selectMenu.addOptions(aliveOthers.map(p => ({ label: p.name, value: p.id, emoji: '🔍' })));
            }

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({
                content: `🎭 **Role Panel:** Select a player to target tonight.`,
                components: [selectRow],
                ephemeral: true
            });
        } else if (customId.startsWith('mafia_discuss_')) {
            await interaction.deferUpdate();
            phase = 'day_discuss';
            await runDiscussionPhase();
        } else if (customId.startsWith('mafia_go_vote_')) {
            await interaction.deferUpdate();
            phase = 'day_vote';
            await runVotingPhase();
        } else if (customId.startsWith('mafia_vote_btn_')) {
            if (!userPlayer.isAlive) {
                return await interaction.reply({ content: '💀 You are dead and cannot vote.', ephemeral: true });
            }

            const aliveOthers = players.filter(p => p.isAlive && p.id !== author.id);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mafia_vote_select_${gameId}`)
                .setPlaceholder('Select who to lynch...')
                .addOptions([
                    ...aliveOthers.map(p => ({ label: `Vote to lynch ${p.name}`, value: p.id, emoji: '⚖️' })),
                    { label: 'Skip Vote', value: 'skip', emoji: '⏭️' }
                ]);

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({
                content: `🗳️ **Voting Panel:** Cast your vote for today's lynch elimination.`,
                components: [selectRow],
                ephemeral: true
            });
        } else if (customId.startsWith('mafia_next_night_')) {
            await interaction.deferUpdate();
            round++;
            phase = 'night';
            await runNightPhase();
        } else if (customId.startsWith('mafia_end_game_')) {
            await interaction.deferUpdate();
            collector.stop();
        }
    });

    // Handle Select Menu Collections separately
    client.on('interactionCreate', async (menuInteraction) => {
        if (!menuInteraction.isStringSelectMenu()) return;
        if (!menuInteraction.customId.endsWith(gameId)) return;

        const customId = menuInteraction.customId;
        const value = menuInteraction.values[0];

        if (customId.startsWith('mafia_action_select_')) {
            if (userChoiceResolve) {
                userNightActionTarget = value;
                const targetPlayer = players.find(p => p.id === value);
                const displayName = targetPlayer ? (targetPlayer.isBot ? `**${targetPlayer.name}**` : `<@${targetPlayer.id}>`) : 'Nobody';
                await menuInteraction.update({ content: `✅ **Target Locked!** You selected ${displayName}. Waiting for night to resolve...`, components: [] });
                userChoiceResolve(value);
            } else {
                await menuInteraction.reply({ content: '❌ Action time expired.', ephemeral: true });
            }
        } else if (customId.startsWith('mafia_vote_select_')) {
            if (userChoiceResolve) {
                const targetPlayer = players.find(p => p.id === value);
                const displayName = value === 'skip' ? 'Skipping' : (targetPlayer ? (targetPlayer.isBot ? `**${targetPlayer.name}**` : `<@${targetPlayer.id}>`) : 'Nobody');
                await menuInteraction.update({ content: `✅ **Vote Registered!** You voted for ${displayName}.`, components: [] });
                userChoiceResolve(value);
            } else {
                await menuInteraction.reply({ content: '❌ Voting time expired.', ephemeral: true });
            }
        }
    });

    async function runNightPhase() {
        userNightActionTarget = null;
        detectiveScanResult = null;

        const nightEmbed = new EmbedBuilder()
            .setColor(0x1a1c23)
            .setTitle(`🌃 Night ${round}`)
            .setDescription(
                `*The cold blanket of night covers the town. Villagers lock their doors while shadows move in the streets...*\n\n` +
                `👤 **Your Role:** **${userPlayer.role}**\n\n` +
                `**Alive Players:**\n` +
                players.filter(p => p.isAlive).map(p => p.id === author.id ? `• **${p.name}** (You)` : `• ${p.name}`).join('\n') + `\n\n` +
                `Town actions are resolving. **If you have a special role, click the button below to act.**`
            )
            .setFooter({ text: `Night Phase • Mafia Solo` })
            .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_action_btn_${gameId}`)
                .setLabel('Perform Night Action 🔒')
                .setStyle(ButtonStyle.Success)
        );

        await mainMsg.edit({ embeds: [nightEmbed], components: [actionRow] });

        // Wait for user choices if user is alive and not a Villager
        if (userPlayer.isAlive && userPlayer.role !== ROLES.VILLAGER) {
            const userChoicePromise = new Promise(resolve => userChoiceResolve = resolve);
            // Auto timeout after 45s
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 45000));
            
            const target = await Promise.race([userChoicePromise, timeoutPromise]);
            userChoiceResolve = null;
            userNightActionTarget = target;
        } else {
            // Just simulate a sleep delay for suspense
            await new Promise(r => setTimeout(r, 4000));
        }

        // Simulate Bot Night Actions
        let killedTarget = null;
        let protectedTarget = null;

        // A. Mafia kill choice
        const aliveMafia = players.filter(p => p.isAlive && p.role === ROLES.MAFIA);
        if (aliveMafia.length > 0) {
            const mafiaMember = aliveMafia[0];
            if (mafiaMember.isBot) {
                // Bot Mafia chooses a target (alive Town member)
                const aliveTown = players.filter(p => p.isAlive && p.alignment === ALIGNMENTS.TOWN);
                if (aliveTown.length > 0) {
                    killedTarget = aliveTown[Math.floor(Math.random() * aliveTown.length)].id;
                }
            } else {
                killedTarget = userNightActionTarget;
            }
        }

        // B. Doctor protect choice
        const aliveDoctor = players.filter(p => p.isAlive && p.role === ROLES.DOCTOR);
        if (aliveDoctor.length > 0) {
            const doc = aliveDoctor[0];
            if (doc.isBot) {
                // Doctor protects self or a random alive town player with low suspicion
                const aliveAll = players.filter(p => p.isAlive);
                protectedTarget = aliveAll[Math.floor(Math.random() * aliveAll.length)].id;
            } else {
                protectedTarget = userNightActionTarget;
            }
        }

        // C. Detective scan choice
        const aliveDetective = players.filter(p => p.isAlive && p.role === ROLES.DETECTIVE);
        if (aliveDetective.length > 0) {
            const det = aliveDetective[0];
            if (!det.isBot && userNightActionTarget) {
                const targetPlayer = players.find(p => p.id === userNightActionTarget);
                detectiveScanResult = targetPlayer ? `${targetPlayer.name} is **${targetPlayer.alignment}**` : 'Nobody';
            }
        }

        // D. Resolve Night
        let finalDead = null;
        if (killedTarget) {
            if (killedTarget === protectedTarget) {
                nightOutcomeText = `🛡️ **It was a quiet night.** The Mafia attempted to strike, but the Doctor protected the target successfully!`;
            } else {
                const deadPlayer = players.find(p => p.id === killedTarget);
                if (deadPlayer) {
                    deadPlayer.isAlive = false;
                    finalDead = deadPlayer;
                    nightOutcomeText = `🔴 **A tragic night.** **${deadPlayer.name}** was found dead in their house. They were a **${deadPlayer.role}**!`;
                }
            }
        } else {
            nightOutcomeText = `🟢 **Nothing happened.** Nobody was targeted or killed last night.`;
        }

        // Show Day Announcement Embed
        phase = 'day_announce';
        
        let desc = `${nightOutcomeText}\n\n`;
        if (detectiveScanResult) {
            desc += `🔍 **Detective Reports:** Your scan revealed: ${detectiveScanResult}.\n\n`;
        }

        const winResult = checkWinConditions();
        if (winResult) {
            await handleEndGame(winResult);
            return;
        }

        desc += `**Alive Players (${players.filter(p => p.isAlive).length}):**\n` +
                players.map(p => p.isAlive 
                    ? (p.id === author.id ? `• **${p.name}** (You)` : `• ${p.name}`)
                    : `• ~~${p.name}~~ (Dead - ${p.role})`
                ).join('\n') + `\n\n` +
                `*Ready to discuss with the remaining town members?*`;

        const dayEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle(`☀️ Day ${round}`)
            .setDescription(desc)
            .setFooter({ text: `Day Phase • Mafia Solo` })
            .setTimestamp();

        const discussRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_discuss_${gameId}`)
                .setLabel('Start Discussion 💬')
                .setStyle(ButtonStyle.Primary)
        );

        await mainMsg.edit({ embeds: [dayEmbed], components: [discussRow] });
    }

    async function runDiscussionPhase() {
        const aliveBots = players.filter(p => p.isAlive && p.isBot);
        
        // Generate simulated dialogue between bots
        const dialogueLines = [];
        if (aliveBots.length > 0) {
            const detective = players.find(p => p.role === ROLES.DETECTIVE);
            const mafia = players.find(p => p.role === ROLES.MAFIA);
            const talkers = [...aliveBots].sort(() => Math.random() - 0.5);

            for (let i = 0; i < Math.min(talkers.length, 3); i++) {
                const talker = talkers[i];
                let speech = '';

                if (talker.role === ROLES.MAFIA) {
                    const townTargets = players.filter(p => p.isAlive && p.alignment === ALIGNMENTS.TOWN && p.id !== talker.id);
                    if (townTargets.length > 0) {
                        const target = townTargets[Math.floor(Math.random() * townTargets.length)];
                        speech = `I noticed **${target.name}** acting very defensively. They might be the Mafia!`;
                        target.suspicion += 15;
                    }
                } else if (talker.role === ROLES.DETECTIVE) {
                    if (mafia.isAlive && Math.random() > 0.4) {
                        speech = `My instincts are pointing towards **${mafia.name}**. There's something off about them.`;
                        mafia.suspicion += 20;
                    } else {
                        const innocentTown = players.filter(p => p.isAlive && p.alignment === ALIGNMENTS.TOWN && p.id !== talker.id);
                        if (innocentTown.length > 0) {
                            const innocent = innocentTown[Math.floor(Math.random() * innocentTown.length)];
                            speech = `I'm pretty sure **${innocent.name}** is on our side. We should trust them.`;
                            innocent.suspicion -= 10;
                        }
                    }
                } else {
                    const templates = [
                        `Who do we think it is? The Mafia is definitely among us.`,
                        `I don't have many clues, but I suspect **{randomPlayer}** might be sus.`,
                        `We need to be careful. Lynch the wrong person, and the Mafia wins.`
                    ];
                    let tpl = templates[Math.floor(Math.random() * templates.length)];
                    if (tpl.includes('{randomPlayer}')) {
                        const aliveOthers = players.filter(p => p.isAlive && p.id !== talker.id);
                        const rand = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
                        tpl = tpl.replace('{randomPlayer}', rand.name);
                        rand.suspicion += 10;
                    }
                    speech = tpl;
                }

                dialogueLines.push(`**${talker.name}**: "${speech}"`);
            }
        }

        discussionChatText = dialogueLines.length > 0 
            ? dialogueLines.join('\n\n') 
            : `*Complete silence fills the room. Nobody has anything to say...*`;

        const discussEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`💬 Day ${round} - Discussion`)
            .setDescription(
                `🗣️ **Town Discussion:**\n` +
                `\`\`\`md\n${discussionChatText}\`\`\`\n\n` +
                `*Review the arguments and prepare your vote. The future of the town depends on it!*`
            )
            .setFooter({ text: 'Discussion Phase • Mafia Solo' })
            .setTimestamp();

        const voteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_go_vote_${gameId}`)
                .setLabel('Proceed to Voting 🗳️')
                .setStyle(ButtonStyle.Danger)
        );

        await mainMsg.edit({ embeds: [discussEmbed], components: [voteRow] });
    }

    async function runVotingPhase() {
        const voteEmbed = new EmbedBuilder()
            .setColor(0xd35400)
            .setTitle(`🗳️ Day ${round} - Voting`)
            .setDescription(
                `🗣️ **Simulated chat hints:**\n` +
                `*Review the bots' arguments above.*\n\n` +
                `**VOTING INSTRUCTIONS:**\n` +
                `Click the **Cast Vote** button below to select the player you want to eliminate. Town wins if the Mafia is lynched.`
            )
            .setFooter({ text: 'Voting Phase • Mafia Solo' })
            .setTimestamp();

        const voteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_vote_btn_${gameId}`)
                .setLabel('Cast Vote 🗳️')
                .setStyle(ButtonStyle.Success)
        );

        await mainMsg.edit({ embeds: [voteEmbed], components: [voteRow] });

        let userVote = 'skip';
        if (userPlayer.isAlive) {
            const userChoicePromise = new Promise(resolve => userChoiceResolve = resolve);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('skip'), 45000));
            
            userVote = await Promise.race([userChoicePromise, timeoutPromise]);
            userChoiceResolve = null;
        }

        // Simulate Bot Votes
        const votes = {}; 
        const voters = {}; 
        players.filter(p => p.isAlive).forEach(p => {
            votes[p.id] = 0;
        });
        votes['skip'] = 0;

        const alivePlayers = players.filter(p => p.isAlive);
        const mafia = players.find(p => p.role === ROLES.MAFIA);

        votes[userVote] = (votes[userVote] || 0) + 1;
        voters[author.id] = userVote;

        alivePlayers.forEach(p => {
            if (!p.isBot) return; 

            let targetId = 'skip';

            if (p.role === ROLES.MAFIA) {
                const townTargets = alivePlayers.filter(x => x.alignment === ALIGNMENTS.TOWN);
                if (townTargets.length > 0) {
                    townTargets.sort((a, b) => b.suspicion - a.suspicion);
                    targetId = townTargets[0].id;
                }
            } else if (p.role === ROLES.DETECTIVE) {
                if (mafia.isAlive && mafia.suspicion > 15) {
                    targetId = mafia.id;
                } else {
                    const others = alivePlayers.filter(x => x.id !== p.id);
                    others.sort((a, b) => b.suspicion - a.suspicion);
                    targetId = others.length > 0 ? others[0].id : 'skip';
                }
            } else {
                if (Math.random() < 0.2) {
                    targetId = 'skip';
                } else {
                    const others = alivePlayers.filter(x => x.id !== p.id);
                    others.sort((a, b) => b.suspicion - a.suspicion);
                    targetId = others.length > 0 ? others[0].id : 'skip';
                }
            }

            votes[targetId] = (votes[targetId] || 0) + 1;
            voters[p.id] = targetId;
        });

        let maxVotes = 0;
        let lynchTargetId = null;
        let isTie = false;

        for (const [targetId, count] of Object.entries(votes)) {
            if (targetId === 'skip') continue;
            if (count > maxVotes) {
                maxVotes = count;
                lynchTargetId = targetId;
                isTie = false;
            } else if (count === maxVotes && maxVotes > 0) {
                isTie = true;
            }
        }

        if (votes['skip'] >= maxVotes) {
            lynchTargetId = null;
        }

        voteTallyText = alivePlayers.map(p => {
            const voteVal = voters[p.id];
            const voteDisplay = voteVal === 'skip' ? 'Skip' : (players.find(x => x.id === voteVal)?.name || 'Unknown');
            return `• **${p.name}** voted to lynch: **${voteDisplay}**`;
        }).join('\n');

        if (isTie) {
            lynchedText = `⚖️ **Lynch Tie!** The town votes were split evenly. Nobody was lynched today.`;
        } else if (!lynchTargetId) {
            lynchedText = `⏭️ **Skipped.** The town decided to skip the lynch vote for today.`;
        } else {
            const target = players.find(x => x.id === lynchTargetId);
            target.isAlive = false;
            lynchedText = `⚖️ **Eliminated!** The town lynched **${target.name}** by majority vote.\n🎭 They were: **${target.role}** (${target.alignment} Alignment).`;
        }

        const winResult = checkWinConditions();
        if (winResult) {
            await handleEndGame(winResult);
            return;
        }

        const nextNightEmbed = new EmbedBuilder()
            .setColor(0x7f8c8d)
            .setTitle(`⚖️ Day ${round} - Lynch Results`)
            .setDescription(
                `**Voting Tally:**\n${voteTallyText}\n\n` +
                `${lynchedText}\n\n` +
                `*The sun begins to set. Prepare for the next night...*`
            )
            .setFooter({ text: 'Lynch Resolution • Mafia Solo' })
            .setTimestamp();

        const nextRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_next_night_${gameId}`)
                .setLabel('Sleep (Night Actions) 🌃')
                .setStyle(ButtonStyle.Primary)
        );

        await mainMsg.edit({ embeds: [nextNightEmbed], components: [nextRow] });
    }

    async function handleEndGame(winner) {
        phase = 'ended';

        const globalMultiplier = await getGlobalMultiplier();
        const basePayout = winner === userPlayer.alignment ? (userPlayer.alignment === ALIGNMENTS.MAFIA ? 350 : 200) : 50;
        const reward = Math.floor(basePayout * globalMultiplier);

        let userDoc = await Bauble.findOne({ userId: author.id });
        if (!userDoc) userDoc = new Bauble({ userId: author.id });
        userDoc.baubles += reward;
        await userDoc.save();

        const endEmbed = new EmbedBuilder()
            .setColor(winner === ALIGNMENTS.TOWN ? 0x2ecc71 : 0xe74c3c)
            .setTitle(`🏆 Game Over - ${winner} Victory!`)
            .setDescription(
                `The game has concluded!\n` +
                `Result: **${winner === ALIGNMENTS.TOWN ? 'Town wins! 🏡' : 'Mafia wins! 🔪'}**\n\n` +
                `**Final Player Roles:**\n` +
                players.map(p => `• **${p.name}**: ${p.role} (${p.isAlive ? '💚 Alive' : '💀 Dead'})`).join('\n') + `\n\n` +
                `💰 **Payout:** You received **🪙 ${reward} Baubles** for participating!`
            )
            .setFooter({ text: 'Game Over • Mafia Solo' })
            .setTimestamp();

        const endRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_end_game_${gameId}`)
                .setLabel('Close Game 🔒')
                .setStyle(ButtonStyle.Secondary)
        );

        await mainMsg.edit({ embeds: [endEmbed], components: [endRow] });
    }

    function checkWinConditions() {
        const mafiaAlive = players.filter(p => p.isAlive && p.alignment === ALIGNMENTS.MAFIA).length;
        const townAlive = players.filter(p => p.isAlive && p.alignment === ALIGNMENTS.TOWN).length;
        
        if (mafiaAlive === 0) {
            return ALIGNMENTS.TOWN;
        }
        if (mafiaAlive >= townAlive) {
            return ALIGNMENTS.MAFIA;
        }
        return null;
    }
}

// ==========================================
// PARTY GAME LOGIC (MULTIPLAYER)
// ==========================================
async function runPartyGame({ context, channel, author, isSlash, reply, gameId }) {
    const lobbyPlayers = [
        { id: author.id, name: author.username, isBot: false, isAlive: true, role: null, alignment: null }
    ];

    const lobbyEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🕵️‍♂️ Mafia: Party Lobby')
        .setDescription(
            `**Host:** <@${author.id}>\n\n` +
            `**Joined Players (1):**\n` +
            `• <@${author.id}>\n\n` +
            `*Needs at least 4 players to start (Max 10). Host can click Start Game once players join.*`
        )
        .setFooter({ text: 'Mafia Lobby • Nishanka' })
        .setTimestamp();

    const joinBtn = new ButtonBuilder().setCustomId(`mafia_lobby_join_${gameId}`).setLabel('Join').setStyle(ButtonStyle.Success).setEmoji('➕');
    const leaveBtn = new ButtonBuilder().setCustomId(`mafia_lobby_leave_${gameId}`).setLabel('Leave').setStyle(ButtonStyle.Danger).setEmoji('➖');
    const startBtn = new ButtonBuilder().setCustomId(`mafia_lobby_start_${gameId}`).setLabel('Start Game').setStyle(ButtonStyle.Primary).setDisabled(true);
    const cancelBtn = new ButtonBuilder().setCustomId(`mafia_lobby_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('✖️');

    const lobbyRow = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, startBtn, cancelBtn);

    let lobbyMsg;
    if (isSlash) {
        lobbyMsg = await context.reply({ embeds: [lobbyEmbed], components: [lobbyRow], fetchReply: true });
    } else {
        lobbyMsg = await channel.send({ embeds: [lobbyEmbed], components: [lobbyRow] });
    }

    const lobbyCollector = lobbyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 
    });

    let lobbyResolved = false;

    const startPromise = new Promise((resolve) => {
        lobbyCollector.on('collect', async (interaction) => {
            const customId = interaction.customId;
            if (!customId.endsWith(gameId)) return;

            if (customId.startsWith('mafia_lobby_join_')) {
                if (lobbyPlayers.some(p => p.id === interaction.user.id)) {
                    return await interaction.reply({ content: '❌ You are already in the lobby.', ephemeral: true });
                }
                if (lobbyPlayers.length >= 10) {
                    return await interaction.reply({ content: '❌ Lobby is full (max 10 players).', ephemeral: true });
                }
                lobbyPlayers.push({ id: interaction.user.id, name: interaction.user.username, isBot: false, isAlive: true, role: null, alignment: null });
                
                await interaction.deferUpdate();
                await updateLobbyEmbed();
            } else if (customId.startsWith('mafia_lobby_leave_')) {
                const idx = lobbyPlayers.findIndex(p => p.id === interaction.user.id);
                if (idx === -1) {
                    return await interaction.reply({ content: '❌ You are not in the lobby.', ephemeral: true });
                }
                if (interaction.user.id === author.id) {
                    return await interaction.reply({ content: '❌ You are the host. You cannot leave the lobby. Start or cancel instead.', ephemeral: true });
                }
                lobbyPlayers.splice(idx, 1);
                
                await interaction.deferUpdate();
                await updateLobbyEmbed();
            } else if (customId.startsWith('mafia_lobby_start_')) {
                if (interaction.user.id !== author.id) {
                    return await interaction.reply({ content: '❌ Only the host can start the game.', ephemeral: true });
                }
                lobbyCollector.stop();
                lobbyResolved = true;
                await interaction.deferUpdate();
                resolve(true);
            } else if (customId.startsWith('mafia_lobby_cancel_')) {
                if (interaction.user.id !== author.id) {
                    return await interaction.reply({ content: '❌ Only the host can cancel the lobby.', ephemeral: true });
                }
                lobbyCollector.stop();
                lobbyResolved = false;
                await interaction.deferUpdate();
                resolve(false);
            }
        });

        lobbyCollector.on('end', () => {
            if (!lobbyResolved) {
                resolve(false);
            }
        });
    });

    async function updateLobbyEmbed() {
        const count = lobbyPlayers.length;
        startBtn.setDisabled(count < 4);

        const updatedEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('🕵️‍♂️ Mafia: Party Lobby')
            .setDescription(
                `**Host:** <@${author.id}>\n\n` +
                `**Joined Players (${count}):**\n` +
                lobbyPlayers.map(p => `• <@${p.id}>`).join('\n') + `\n\n` +
                `*Needs at least 4 players to start (Max 10).*`
            )
            .setFooter({ text: 'Mafia Lobby • Nishanka' })
            .setTimestamp();

        await lobbyMsg.edit({ embeds: [updatedEmbed], components: [lobbyRow] });
    }

    const started = await startPromise;
    if (!started) {
        const cancelEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Mafia Lobby Canceled')
            .setDescription('The lobby timed out or was canceled by the host due to insufficient players.');
        await lobbyMsg.edit({ embeds: [cancelEmbed], components: [] });
        return;
    }

    const count = lobbyPlayers.length;
    let rolesPool = [];
    if (count === 4) {
        rolesPool = [ROLES.MAFIA, ROLES.DOCTOR, ROLES.VILLAGER, ROLES.VILLAGER];
    } else if (count === 5) {
        rolesPool = [ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER];
    } else if (count === 6) {
        rolesPool = [ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
    } else if (count === 7) {
        rolesPool = [ROLES.MAFIA, ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
    } else if (count === 8) {
        rolesPool = [ROLES.MAFIA, ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
    } else {
        rolesPool = [ROLES.MAFIA, ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
        if (count === 10) rolesPool.push(ROLES.VILLAGER);
    }

    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    lobbyPlayers.forEach((p, idx) => {
        p.role = rolesPool[idx];
        p.alignment = p.role === ROLES.MAFIA ? ALIGNMENTS.MAFIA : ALIGNMENTS.TOWN;
    });

    const revealEmbed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🎮 Mafia Game Started!')
        .setDescription(
            `The game has officially begun with **${count} players**!\n\n` +
            `**VITAL SECURITY NOTICE:**\n` +
            `Click the **Secret Role** button below to privately reveal your secret role alignment ephemerally.`
        )
        .setFooter({ text: 'Nishanka Mafia' });

    const revealRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mafia_reveal_role_${gameId}`)
            .setLabel('View Secret Role 🎭')
            .setStyle(ButtonStyle.Success)
    );

    let gameMsg = await channel.send({ embeds: [revealEmbed], components: [revealRow] });

    const revealCollector = gameMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 
    });

    revealCollector.on('collect', async (interaction) => {
        if (!interaction.customId.endsWith(gameId)) return;
        const player = lobbyPlayers.find(p => p.id === interaction.user.id);
        if (!player) {
            return await interaction.reply({ content: '❌ You are not a player in this game.', ephemeral: true });
        }
        await interaction.reply({
            content: `🎭 **Secret Role Panel:**\nYour role is **${player.role}**.\nAlignment: **${player.alignment}**\n\n*Keep this secret. Do not leak it!*`,
            ephemeral: true
        });
    });

    await new Promise(r => setTimeout(r, 15000)); 
    revealCollector.stop();

    let round = 1;
    let gameActive = true;
    let votes = {}; 
    let nightVotes = {}; 
    let protectedTarget = null;
    let scannedTarget = null;

    const gameCollector = gameMsg.createMessageComponentCollector({
        time: 1800000 
    });

    gameCollector.on('collect', async (interaction) => {
        const customId = interaction.customId;
        if (!customId.endsWith(gameId)) return;

        const player = lobbyPlayers.find(p => p.id === interaction.user.id);
        if (!player) {
            return await interaction.reply({ content: '❌ You are not a player in this game.', ephemeral: true });
        }

        if (customId.startsWith('mafia_phase_action_')) {
            if (!player.isAlive) {
                return await interaction.reply({ content: '💀 You are dead.', ephemeral: true });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mafia_party_select_action_${gameId}`)
                .setPlaceholder('Choose target...');

            const aliveOthers = lobbyPlayers.filter(p => p.isAlive && p.id !== player.id);

            if (player.role === ROLES.VILLAGER) {
                return await interaction.reply({ content: '💤 You are a Villager and have no active night role.', ephemeral: true });
            } else if (player.role === ROLES.MAFIA) {
                selectMenu.addOptions(aliveOthers.map(p => ({ label: p.name, value: p.id, emoji: '🔪' })));
            } else if (player.role === ROLES.DOCTOR) {
                const aliveAll = lobbyPlayers.filter(p => p.isAlive);
                selectMenu.addOptions(aliveAll.map(p => ({ label: p.id === player.id ? 'Protect Yourself' : p.name, value: p.id, emoji: '🛡️' })));
            } else if (player.role === ROLES.DETECTIVE) {
                selectMenu.addOptions(aliveOthers.map(p => ({ label: p.name, value: p.id, emoji: '🔍' })));
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: '🛡️ Choose your night target:', components: [row], ephemeral: true });

        } else if (customId.startsWith('mafia_party_vote_btn_')) {
            if (!player.isAlive) {
                return await interaction.reply({ content: '💀 You are dead.', ephemeral: true });
            }

            const aliveOthers = lobbyPlayers.filter(p => p.isAlive && p.id !== player.id);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mafia_party_select_vote_${gameId}`)
                .setPlaceholder('Vote who to lynch...')
                .addOptions([
                    ...aliveOthers.map(p => ({ label: `Lynch ${p.name}`, value: p.id, emoji: '⚖️' })),
                    { label: 'Skip Vote', value: 'skip', emoji: '⏭️' }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: '🗳️ Cast your lynch vote:', components: [row], ephemeral: true });
        }
    });

    client.on('interactionCreate', async (menuInteraction) => {
        if (!menuInteraction.isStringSelectMenu()) return;
        if (!menuInteraction.customId.endsWith(gameId)) return;

        const customId = menuInteraction.customId;
        const value = menuInteraction.values[0];
        const user = menuInteraction.user;
        const player = lobbyPlayers.find(p => p.id === user.id);

        if (!player || !player.isAlive) {
            return await menuInteraction.reply({ content: '❌ You are not active in this game.', ephemeral: true });
        }

        if (customId.startsWith('mafia_party_select_action_')) {
            if (player.role === ROLES.MAFIA) {
                nightVotes[user.id] = value;
            } else if (player.role === ROLES.DOCTOR) {
                protectedTarget = value;
            } else if (player.role === ROLES.DETECTIVE) {
                scannedTarget = value;
                const scannedPlayer = lobbyPlayers.find(p => p.id === value);
                return await menuInteraction.update({
                    content: `🔍 **Scan Result:** <@${value}> has alignment **${scannedPlayer.alignment}**!`,
                    components: []
                });
            }

            await menuInteraction.update({ content: `✅ **Selection locked!** Target: <@${value}>.`, components: [] });
        } else if (customId.startsWith('mafia_party_select_vote_')) {
            votes[user.id] = value;
            await menuInteraction.update({ content: `✅ **Vote cast:** ${value === 'skip' ? 'Skip lynch' : `<@${value}>`}.`, components: [] });
        }
    });

    while (gameActive) {
        nightVotes = {};
        protectedTarget = null;
        scannedTarget = null;

        const nightEmbed = new EmbedBuilder()
            .setColor(0x1a1c23)
            .setTitle(`🌃 Night ${round}`)
            .setDescription(
                `The night falls. Special roles have **45 seconds** to perform their actions.\n\n` +
                `**Alive Players:**\n` +
                lobbyPlayers.filter(p => p.isAlive).map(p => `• <@${p.id}>`).join('\n') + `\n\n` +
                `*Click the action button below to select your target tonight.*`
            )
            .setFooter({ text: 'Night Phase • Nishanka Mafia' });

        const nightRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_phase_action_${gameId}`)
                .setLabel('Night Action 🔒')
                .setStyle(ButtonStyle.Success)
        );

        await gameMsg.edit({ embeds: [nightEmbed], components: [nightRow] });

        let timeRemaining = 45;
        while (timeRemaining > 0) {
            const aliveSpecial = lobbyPlayers.filter(p => p.isAlive && p.role !== ROLES.VILLAGER);
            const aliveMafiaCount = lobbyPlayers.filter(p => p.isAlive && p.role === ROLES.MAFIA).length;
            const mafiaVotesCount = Object.keys(nightVotes).length;
            const docActive = lobbyPlayers.some(p => p.isAlive && p.role === ROLES.DOCTOR);
            const detActive = lobbyPlayers.some(p => p.isAlive && p.role === ROLES.DETECTIVE);

            const mafiaOk = mafiaVotesCount >= aliveMafiaCount;
            const docOk = !docActive || protectedTarget !== null;
            const detOk = !detActive || scannedTarget !== null;

            if (mafiaOk && docOk && detOk) break;

            await new Promise(r => setTimeout(r, 1000));
            timeRemaining--;
        }

        let killTarget = null;
        const mafiaChoices = Object.values(nightVotes);
        if (mafiaChoices.length > 0) {
            const counts = {};
            let max = 0;
            mafiaChoices.forEach(t => {
                counts[t] = (counts[t] || 0) + 1;
                if (counts[t] > max) {
                    max = counts[t];
                    killTarget = t;
                }
            });
        }

        let deadText = '';
        if (killTarget) {
            if (killTarget === protectedTarget) {
                deadText = `🟢 **No deaths.** The Mafia attempted to strike, but the target was saved by the Doctor!`;
            } else {
                const target = lobbyPlayers.find(p => p.id === killTarget);
                target.isAlive = false;
                deadText = `🔴 **A body was found!** <@${killTarget}> was murdered last night. They were a **${target.role}**!`;
            }
        } else {
            deadText = `🟢 It was a quiet night. Nobody was targeted.`;
        }

        let winner = checkMWin();
        if (winner) {
            await handleMPartyEnd(winner);
            break;
        }

        votes = {};
        const dayEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle(`☀️ Day ${round}`)
            .setDescription(
                `${deadText}\n\n` +
                `**Discussion starts now!** You have **45 seconds** to discuss and find the Mafia.\n` +
                `Click the **Vote to Lynch** button to cast your vote.`
            )
            .setFooter({ text: 'Day Phase • Nishanka Mafia' });

        const dayRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mafia_party_vote_btn_${gameId}`)
                .setLabel('Vote to Lynch 🗳️')
                .setStyle(ButtonStyle.Danger)
        );

        await gameMsg.edit({ embeds: [dayEmbed], components: [dayRow] });

        timeRemaining = 45;
        while (timeRemaining > 0) {
            const aliveCount = lobbyPlayers.filter(p => p.isAlive).length;
            if (Object.keys(votes).length >= aliveCount) break;
            await new Promise(r => setTimeout(r, 1000));
            timeRemaining--;
        }

        const vCounts = {};
        let maxVotes = 0;
        let lynchTarget = null;
        let isTie = false;

        const voteEntries = Object.entries(votes);
        voteEntries.forEach(([voter, target]) => {
            if (target === 'skip') return;
            vCounts[target] = (vCounts[target] || 0) + 1;
            if (vCounts[target] > maxVotes) {
                maxVotes = vCounts[target];
                lynchTarget = target;
                isTie = false;
            } else if (vCounts[target] === maxVotes && maxVotes > 0) {
                isTie = true;
            }
        });

        let lynchOutcomeText = '';
        if (isTie) {
            lynchOutcomeText = `⚖️ The town votes were tied. Nobody was lynched today.`;
        } else if (!lynchTarget) {
            lynchOutcomeText = `⏭️ The town decided to skip the lynch vote.`;
        } else {
            const target = lobbyPlayers.find(p => p.id === lynchTarget);
            target.isAlive = false;
            lynchOutcomeText = `⚖️ <@${lynchTarget}> was lynched by majority vote. They were: **${target.role}**!`;
        }

        winner = checkMWin();
        if (winner) {
            await handleMPartyEnd(winner);
            break;
        }

        const daySummaryEmbed = new EmbedBuilder()
            .setColor(0x7f8c8d)
            .setTitle(`⚖️ Day ${round} - Lynch Summary`)
            .setDescription(
                `${lynchOutcomeText}\n\n` +
                `**Votes Cast:**\n` +
                lobbyPlayers.filter(p => p.isAlive || votes[p.id]).map(p => {
                    const vt = votes[p.id];
                    const vtDisp = vt === 'skip' ? 'Skip' : (vt ? `<@${vt}>` : 'Did not vote');
                    return `<@${p.id}> voted for: ${vtDisp}`;
                }).join('\n') + `\n\n` +
                `*Entering Night ${round + 1} in 8 seconds...*`
            )
            .setFooter({ text: 'Lynch Summary • Nishanka Mafia' });

        await gameMsg.edit({ embeds: [daySummaryEmbed], components: [] });
        await new Promise(r => setTimeout(r, 8000));

        round++;
    }

    function checkMWin() {
        const mafiaAlive = lobbyPlayers.filter(p => p.isAlive && p.alignment === ALIGNMENTS.MAFIA).length;
        const townAlive = lobbyPlayers.filter(p => p.isAlive && p.alignment === ALIGNMENTS.TOWN).length;

        if (mafiaAlive === 0) return ALIGNMENTS.TOWN;
        if (mafiaAlive >= townAlive) return ALIGNMENTS.MAFIA;
        return null;
    }

    async function handleMPartyEnd(winner) {
        gameActive = false;
        gameCollector.stop();

        const globalMultiplier = await getGlobalMultiplier();

        for (const p of lobbyPlayers) {
            const won = p.alignment === winner;
            const reward = Math.floor((won ? (winner === ALIGNMENTS.MAFIA ? 400 : 250) : 75) * globalMultiplier);
            
            let uDoc = await Bauble.findOne({ userId: p.id });
            if (!uDoc) uDoc = new Bauble({ userId: p.id });
            uDoc.baubles += reward;
            await uDoc.save();
        }

        const endEmbed = new EmbedBuilder()
            .setColor(winner === ALIGNMENTS.TOWN ? 0x2ecc71 : 0xe74c3c)
            .setTitle(`🏆 Game Over - ${winner} Victory!`)
            .setDescription(
                `The game has concluded!\n` +
                `Winner: **${winner === ALIGNMENTS.TOWN ? 'Town wins! 🏡' : 'Mafia wins! 🔪'}**\n\n` +
                `**Final Player Alignments:**\n` +
                lobbyPlayers.map(p => `<@${p.id}>: **${p.role}** (${p.isAlive ? 'Alive' : 'Dead'})`).join('\n') + `\n\n` +
                `💰 Rewards (multiplied) have been added to your balances!`
            )
            .setFooter({ text: 'Game Over • Nishanka Mafia' });

        await channel.send({ embeds: [endEmbed] });
    }
}
