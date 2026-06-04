/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { emoji } = require('../../utils/customEmojis');

const DUCKS = {
    red: { id: 'red', name: 'Red Duck', emoji: '🔴', emojiKey: 'nk_item_rubber_duck' },
    blue: { id: 'blue', name: 'Blue Duck', emoji: '🔵', emojiKey: 'nk_item_rubber_duck' },
    green: { id: 'green', name: 'Green Duck', emoji: '🟢', emojiKey: 'nk_item_rubber_duck' },
    yellow: { id: 'yellow', name: 'Yellow Duck', emoji: '🟡', emojiKey: 'nk_item_rubber_duck' }
};

const TRACK_LENGTH = 15;

function drawTrack(duckName, duckEmoji, position) {
    const clampedPos = Math.min(position, TRACK_LENGTH);
    const before = '─'.repeat(clampedPos);
    const after = '─'.repeat(Math.max(0, TRACK_LENGTH - clampedPos));
    return `${duckEmoji} **${duckName}**: ${before}🦆${after} 🏁 *(${clampedPos}/${TRACK_LENGTH}m)*`;
}

module.exports = {
    category: 'economy',
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

        if (baubleData.passiveMode) {
            const msg = `❌ You are in Passive Mode! Disable it first with \`/passive\` to gamble.`;
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
                `✨ **Chose:** **${selectedDuck.emoji} ${selectedDuck.name}**\n\n` +
                `${drawTrack('Red Duck', '🔴', 0)}\n` +
                `${drawTrack('Blue Duck', '🔵', 0)}\n` +
                `${drawTrack('Green Duck', '🟢', 0)}\n` +
                `${drawTrack('Yellow Duck', '🟡', 0)}`
            )
            .setTimestamp();

        let raceMsg;
        if (isSlash) {
            raceMsg = await interaction.reply({ embeds: [startEmbed], fetchReply: true });
        } else {
            raceMsg = await message.reply({ embeds: [startEmbed] });
        }

        // Run the race loop
        let winner = null;
        const keys = ['red', 'blue', 'green', 'yellow'];

        while (!winner) {
            await new Promise(r => setTimeout(r, 1200));

            // Move each duck forward by 1, 2, or 3 steps
            for (const key of keys) {
                const move = Math.floor(Math.random() * 3) + 1; // 1 to 3
                positions[key] += move;
            }

            // Check if any duck finished
            const finished = keys.filter(key => positions[key] >= TRACK_LENGTH);
            if (finished.length > 0) {
                // Find winner (one with max distance, or tie break)
                let maxDist = -1;
                let potentialWinners = [];
                for (const key of finished) {
                    if (positions[key] > maxDist) {
                        maxDist = positions[key];
                        potentialWinners = [key];
                    } else if (positions[key] === maxDist) {
                        potentialWinners.push(key);
                    }
                }
                winner = potentialWinners[Math.floor(Math.random() * potentialWinners.length)];
            }

            // Render updated track embed
            const raceEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(winner ? `🏁 Duck Race: Winner Declared!` : `🏁 Duck Race: The Race is On!`)
                .setDescription(
                    `👤 **Racer:** <@${userId}>\n` +
                    `💰 **Bet:** **${bet.toLocaleString()}** ${baubleEmoji}\n` +
                    `✨ **Chose:** **${selectedDuck.emoji} ${selectedDuck.name}**\n\n` +
                    `${drawTrack('Red Duck', '🔴', positions.red)}\n` +
                    `${drawTrack('Blue Duck', '🔵', positions.blue)}\n` +
                    `${drawTrack('Green Duck', '🟢', positions.green)}\n` +
                    `${drawTrack('Yellow Duck', '🟡', positions.yellow)}`
                )
                .setTimestamp();

            await raceMsg.edit({ embeds: [raceEmbed] }).catch(() => {});
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
                    `🏆 **${winningDuck.emoji} ${winningDuck.name}** crossed the finish line first!\n\n` +
                    `You predicted correctly and won **+${payout.toLocaleString()}** ${baubleEmoji}!\n\n` +
                    `👛 **New Balance:** **${baubleData.baubles.toLocaleString()}** ${baubleEmoji}`
                )
                .setTimestamp();

            await raceMsg.edit({ embeds: [winEmbed] }).catch(() => {});
        } else {
            await baubleData.save();

            const loseEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Defeat! Your Duck Lost!')
                .setDescription(
                    `😭 **${winningDuck.emoji} ${winningDuck.name}** won the race!\n\n` +
                    `Your duck (**${selectedDuck.name}**) fell behind. You lost **-${bet.toLocaleString()}** ${baubleEmoji}!\n\n` +
                    `👛 **New Balance:** **${baubleData.baubles.toLocaleString()}** ${baubleEmoji}`
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
