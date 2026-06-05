/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    aliases: ['gamestats', 'stats', 'gstats'],
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('gamestats')
        .setDescription("View a user's gameplay, betting, and robbery statistics.")
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose statistics you want to view')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const embed = await buildStatsEmbed(targetUser);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in gamestats slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching game statistics.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            let targetUser;
            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch (err) {
                    targetUser = message.author;
                }
            } else {
                targetUser = message.author;
            }

            const embed = await buildStatsEmbed(targetUser);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in gamestats prefix command:', error);
            await message.reply('❌ An error occurred while fetching game statistics.');
        }
    }
};

async function buildStatsEmbed(user) {
    let baubleData = await Bauble.findOne({ userId: user.id });
    if (!baubleData) {
        baubleData = {
            coinflipPlayed: 0, coinflipWins: 0, coinflipStreak: 0, coinflipMaxStreak: 0,
            gamblePlayed: 0, gambleWins: 0, gambleStreak: 0, gambleMaxStreak: 0,
            slotsPlayed: 0, slotsWins: 0, slotsStreak: 0, slotsMaxStreak: 0, slotsJackpots: 0,
            blackjackPlayed: 0, blackjackWins: 0, blackjackStreak: 0, blackjackMaxStreak: 0,
            robberiesAttempted: 0, robberiesSuccessful: 0, heistRobsSuccessful: 0,
            crimesAttempted: 0, crimesSuccessful: 0, crimeSuccessStreak: 0,
            scrambleWins: 0, wordbombWins: 0, emojidecodeWins: 0,
            guesstheflagWins: 0, geoguesserWins: 0
        };
    }

    const calcRate = (wins, plays) => plays > 0 ? ((wins / plays) * 100).toFixed(1) + '%' : '0.0%';

    const bjRate = calcRate(baubleData.blackjackWins || 0, baubleData.blackjackPlayed || 0);
    const cfRate = calcRate(baubleData.coinflipWins || 0, baubleData.coinflipPlayed || 0);
    const slRate = calcRate(baubleData.slotsWins || 0, baubleData.slotsPlayed || 0);
    const gbRate = calcRate(baubleData.gambleWins || 0, baubleData.gamblePlayed || 0);
    
    const robRate = calcRate(baubleData.robberiesSuccessful || 0, baubleData.robberiesAttempted || 0);
    const crimeRate = calcRate(baubleData.crimesSuccessful || 0, baubleData.crimesAttempted || 0);

    return new EmbedBuilder()
        .setColor(0x7c6cf0)
        .setTitle(`📊 ${user.username}'s Game Statistics`)
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
        .setDescription('All-time stats for betting, underground activity, and minigames.')
        .addFields(
            {
                name: '🎰 Betting Games',
                value: [
                    `🃏 **Blackjack**: \`${baubleData.blackjackPlayed || 0}\` plays • \`${baubleData.blackjackWins || 0}\` wins (${bjRate})`,
                    `└ *Streak: \`${baubleData.blackjackStreak || 0}\` (Best: \`${baubleData.blackjackMaxStreak || 0}\`)*`,
                    `🪙 **Coinflip**: \`${baubleData.coinflipPlayed || 0}\` plays • \`${baubleData.coinflipWins || 0}\` wins (${cfRate})`,
                    `└ *Streak: \`${baubleData.coinflipStreak || 0}\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)*`,
                    `🎰 **Slots**: \`${baubleData.slotsPlayed || 0}\` plays • \`${baubleData.slotsWins || 0}\` wins (${slRate})`,
                    `└ *Jackpots: \`${baubleData.slotsJackpots || 0}\`*`,
                    `🎲 **Gamble**: \`${baubleData.gamblePlayed || 0}\` plays • \`${baubleData.gambleWins || 0}\` wins (${gbRate})`,
                    `└ *Streak: \`${baubleData.gambleStreak || 0}\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)*`
                ].join('\n'),
                inline: false
            },
            {
                name: '🕵️ Underground Activity',
                value: [
                    `🏦 **Robberies**: \`${baubleData.robberiesAttempted || 0}\` attempts • \`${baubleData.robberiesSuccessful || 0}\` successes (${robRate})`,
                    `└ *High-Stakes Heists: \`${baubleData.heistRobsSuccessful || 0}\`*`,
                    `🔫 **Crimes**: \`${baubleData.crimesAttempted || 0}\` attempts • \`${baubleData.crimesSuccessful || 0}\` successes (${crimeRate})`,
                    `└ *Success Streak: \`${baubleData.crimeSuccessStreak || 0}\`*`
                ].join('\n'),
                inline: false
            },
            {
                name: '🎮 Minigames Wins',
                value: [
                    `🏁 **Word Scramble**: \`${baubleData.scrambleWins || 0}\` victories`,
                    `💣 **Word Bomb**: \`${baubleData.wordbombWins || 0}\` victories`,
                    `🧩 **Emoji Decode**: \`${baubleData.emojidecodeWins || 0}\` victories`,
                    `🌍 **Guess the Flag**: \`${baubleData.guesstheflagWins || 0}\` victories`,
                    `📍 **GeoGuesser**: \`${baubleData.geoguesserWins || 0}\` victories`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Keep playing to unlock rare achievements!' })
        .setTimestamp();
}
