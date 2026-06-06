/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { emoji } = require('../../utils/customEmojis');

const DUCKS = {
    red: { id: 'red', name: 'Red Duck', emoji: '🔴', emojiKey: 'game.duck_red' },
    blue: { id: 'blue', name: 'Blue Duck', emoji: '🔵', emojiKey: 'game.duck_blue' },
    green: { id: 'green', name: 'Green Duck', emoji: '🟢', emojiKey: 'game.duck_green' },
    yellow: { id: 'yellow', name: 'Yellow Duck', emoji: '🟡', emojiKey: 'game.duck_yellow' }
};

const TRACK_LENGTH = 15;

function drawTrack(duckKey, duckName, fallbackEmoji, position) {
    const clampedPos = Math.min(position, TRACK_LENGTH);
    const before = '─'.repeat(clampedPos);
    const after = '─'.repeat(Math.max(0, TRACK_LENGTH - clampedPos));
    const trackDuckEmoji = emoji(`game.duck_${duckKey}`, '🦆');
    const startEmoji = emoji(`game.duck_${duckKey}`, fallbackEmoji);
    return `${startEmoji} **${duckName}**: ${before}${trackDuckEmoji}${after} 🏁 *(${clampedPos}/${TRACK_LENGTH}m)*`;
}

module.exports = {
    category: 'casino',
    aliases: ['dr', 'duck', 'duck-race'],
    data: new SlashCommandBuilder()
        .setName('duckrace')
        .setDescription('Bet Glimmering Baubles on a high-stakes duck race!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount of Glimmering Baubles to bet.')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('duck')
                .setDescription('Choose the duck you think will win.')
                .setRequired(true)
                .addChoices(
                    { name: 'Red Duck 🔴', value: 'red' },
                    { name: 'Blue Duck 🔵', value: 'blue' },
                    { name: 'Green Duck 🟢', value: 'green' },
                    { name: 'Yellow Duck 🟡', value: 'yellow' }
                )),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const duckChoice = interaction.options.getString('duck');
        await runDuckRace({
            interaction,
            user: interaction.user,
            bet,
            duckChoice,
            isSlash: true
        });
    },

    async executePrefix(message, args) {
        if (args.length < 2) {
            return message.reply('⚠️ Usage: `-duckrace <bet> <duck_choice>`\nDucks to choose: `red`, `blue`, `green`, `yellow`');
        }

        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 10) {
            return message.reply('❌ Please specify a valid bet amount of at least **10 Baubles**.');
        }

        const choiceInput = args[1].toLowerCase();
        let duckChoice = null;
        if (['red', '🔴'].includes(choiceInput)) duckChoice = 'red';
        else if (['blue', '🔵'].includes(choiceInput)) duckChoice = 'blue';
        else if (['green', '🟢'].includes(choiceInput)) duckChoice = 'green';
        else if (['yellow', '🟡'].includes(choiceInput)) duckChoice = 'yellow';

        if (!duckChoice) {
            return message.reply('❌ Invalid duck choice! Choose: `red`, `blue`, `green`, or `yellow`.');
        }

        await runDuckRace({
            message,
            user: message.author,
            bet,
            duckChoice,
            isSlash: false
        });
    }
};

async function runDuckRace({ interaction, message, user, bet, duckChoice, isSlash }) {
    const userId = user.id;

    try {
        let baubleData = await Bauble.findOne({ userId });
        if (!baubleData) {
            baubleData = new Bauble({ userId, baubles: 0 });
            await baubleData.save();
        }

        if (baubleData.baubles < bet) {
            const msg = `❌ You do not have enough Glimmering Baubles! You have **${baubleData.baubles.toLocaleString()}** but tried to bet **${bet.toLocaleString()}**.`;
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : message.reply(msg);
        }

        // Subtract bet initially to prevent exit exploits
        baubleData.baubles -= bet;
        await baubleData.save();

        const selectedDuck = DUCKS[duckChoice];
        const positions = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        const baubleEmoji = emoji('currency.bauble', '🪙');
        const startEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🏁 Duck Race: Preparing Start!')
            .setDescription(
                `🏁 **READY, SET, GO!** 🏁\n\n` +
                `👤 **Racer:** <@${userId}>\n` +
                `💰 **Bet:** **${bet.toLocaleString()}** ${baubleEmoji}\n` +
                `✨ **Chose:** **${emoji(selectedDuck.emojiKey, selectedDuck.emoji)} ${selectedDuck.name}**\n\n` +
                `${drawTrack('red', 'Red Duck', '🔴', 0)}\n` +
                `${drawTrack('blue', 'Blue Duck', '🔵', 0)}\n` +
                `${drawTrack('green', 'Green Duck', '🟢', 0)}\n` +
                `${drawTrack('yellow', 'Yellow Duck', '🟡', 0)}`
            )
            .setTimestamp();

        // Pre-simulate the race steps
        const simulatedPositions = { red: 0, blue: 0, green: 0, yellow: 0 };
        const raceSteps = [];
        let simulatedWinner = null;
        const keys = ['red', 'blue', 'green', 'yellow'];
        
        while (!simulatedWinner) {
            const stepPos = {};
            for (const key of keys) {
                const move = Math.floor(Math.random() * 3) + 1;
                simulatedPositions[key] += move;
                stepPos[key] = simulatedPositions[key];
            }
            raceSteps.push({ ...stepPos });
            
            // Check if any duck finished
            const finished = keys.filter(key => simulatedPositions[key] >= TRACK_LENGTH);
            if (finished.length > 0) {
                let maxDist = -1;
                let potentialWinners = [];
                for (const key of finished) {
                    if (simulatedPositions[key] > maxDist) {
                        maxDist = simulatedPositions[key];
                        potentialWinners = [key];
                    } else if (simulatedPositions[key] === maxDist) {
                        potentialWinners.push(key);
                    }
                }
                simulatedWinner = potentialWinners[Math.floor(Math.random() * potentialWinners.length)];
            }
        }

        let raceMsg;
        if (isSlash) {
            raceMsg = await interaction.reply({ embeds: [startEmbed], fetchReply: true });
        } else {
            raceMsg = await message.reply({ embeds: [startEmbed] });
        }

        const client = raceMsg.client || (raceMsg.channel && raceMsg.channel.client);
        if (client) {
            if (!client.activeCasinoGames) {
                client.activeCasinoGames = new Map();
            }
            const discordUser = client.users.cache.get(userId);
            client.activeCasinoGames.set(`duckrace_${userId}`, {
                userId,
                username: discordUser ? discordUser.username : `User (${userId})`,
                type: 'duckrace',
                bet: bet,
                choice: duckChoice,
                outcome: simulatedWinner,
                timestamp: Date.now()
            });
        }

        // Run the race loop
        let winner = null;
        let stepIndex = 0;

        while (!winner) {
            await new Promise(r => setTimeout(r, 1200));

            const step = raceSteps[stepIndex++];
            for (const key of keys) {
                positions[key] = step[key];
            }

            if (stepIndex >= raceSteps.length) {
                winner = simulatedWinner;
            }

            // Render updated track embed
            const raceEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(winner ? `🏁 Duck Race: Winner Declared!` : `🏁 Duck Race: The Race is On!`)
                .setDescription(
                    `👤 **Racer:** <@${userId}>\n` +
                    `💰 **Bet:** **${bet.toLocaleString()}** ${baubleEmoji}\n` +
                    `✨ **Chose:** **${emoji(selectedDuck.emojiKey, selectedDuck.emoji)} ${selectedDuck.name}**\n\n` +
                    `${drawTrack('red', 'Red Duck', '🔴', positions.red)}\n` +
                    `${drawTrack('blue', 'Blue Duck', '🔵', positions.blue)}\n` +
                    `${drawTrack('green', 'Green Duck', '🟢', positions.green)}\n` +
                    `${drawTrack('yellow', 'Yellow Duck', '🟡', positions.yellow)}`
                )
                .setTimestamp();

            await raceMsg.edit({ embeds: [raceEmbed] }).catch(() => {});
        }

        if (client && client.activeCasinoGames) {
            client.activeCasinoGames.delete(`duckrace_${userId}`);
        }

        // Declare results
        const winningDuck = DUCKS[winner];
        const isWin = winner === duckChoice;
        let payout = 0;

        baubleData = await Bauble.findOne({ userId });
        if (isWin) {
            payout = bet * 3; // 3x payout (net gain of 2x)
            baubleData.baubles += payout;
            
            // Increment gambling metrics for achievements
            baubleData.gambleWins = (baubleData.gambleWins || 0) + 1;
            await baubleData.save();

            const winEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🎉 Victory! You Won the Bet!')
                .setDescription(
                    `🏆 **${emoji(winningDuck.emojiKey, winningDuck.emoji)} ${winningDuck.name}** crossed the finish line first!\n\n` +
                    `You predicted correctly and won **+${payout.toLocaleString()}** ${baubleEmoji}!\n\n` +
                    `👛 **New Balance:** **${baubleData.baubles.toLocaleString()}** ${baubleEmoji}\n\n` +
                    `${drawTrack('red', 'Red Duck', '🔴', positions.red)}\n` +
                    `${drawTrack('blue', 'Blue Duck', '🔵', positions.blue)}\n` +
                    `${drawTrack('green', 'Green Duck', '🟢', positions.green)}\n` +
                    `${drawTrack('yellow', 'Yellow Duck', '🟡', positions.yellow)}`
                )
                .setTimestamp();

            await raceMsg.edit({ embeds: [winEmbed] }).catch(() => {});
        } else {
            await baubleData.save();

            const loseEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Defeat! Your Duck Lost!')
                .setDescription(
                    `😭 **${emoji(winningDuck.emojiKey, winningDuck.emoji)} ${winningDuck.name}** won the race!\n\n` +
                    `Your duck (**${emoji(selectedDuck.emojiKey, selectedDuck.emoji)} ${selectedDuck.name}**) fell behind. You lost **-${bet.toLocaleString()}** ${baubleEmoji}!\n\n` +
                    `👛 **New Balance:** **${baubleData.baubles.toLocaleString()}** ${baubleEmoji}\n\n` +
                    `${drawTrack('red', 'Red Duck', '🔴', positions.red)}\n` +
                    `${drawTrack('blue', 'Blue Duck', '🔵', positions.blue)}\n` +
                    `${drawTrack('green', 'Green Duck', '🟢', positions.green)}\n` +
                    `${drawTrack('yellow', 'Yellow Duck', '🟡', positions.yellow)}`
                )
                .setTimestamp();

            await raceMsg.edit({ embeds: [loseEmbed] }).catch(() => {});
        }

    } catch (error) {
        console.error('Error running duck race:', error);
        const errMsg = '❌ An error occurred while executing the duck race.';
        if (isSlash) {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
            }
        } else {
            await message.reply(errMsg).catch(() => {});
        }
    }
}
