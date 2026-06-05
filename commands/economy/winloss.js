/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    aliases: ['winloss', 'wl', 'record', 'winslosses'],
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('winloss')
        .setDescription("View a user's wins, losses, and success rates across all games and activities.")
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose records you want to view')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const embed = await buildWinLossEmbed(targetUser);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in winloss slash command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching win/loss records.', ephemeral: true });
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

            const embed = await buildWinLossEmbed(targetUser);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in winloss prefix command:', error);
            await message.reply('❌ An error occurred while fetching win/loss records.');
        }
    }
};

async function buildWinLossEmbed(user) {
    let baubleData = await Bauble.findOne({ userId: user.id });
    if (!baubleData) {
        baubleData = {
            coinflipPlayed: 0, coinflipWins: 0,
            gamblePlayed: 0, gambleWins: 0,
            slotsPlayed: 0, slotsWins: 0,
            blackjackPlayed: 0, blackjackWins: 0,
            robberiesAttempted: 0, robberiesSuccessful: 0,
            crimesAttempted: 0, crimesSuccessful: 0,
            scrambleWins: 0, wordbombWins: 0, emojidecodeWins: 0
        };
    }

    const formatRecord = (wins, plays, winLabel = 'Wins', lossLabel = 'Losses') => {
        const w = wins || 0;
        const p = plays || 0;
        const l = Math.max(0, p - w);
        const rate = p > 0 ? ((w / p) * 100).toFixed(1) + '%' : '0.0%';
        return `🟢 ${winLabel}: \`${w.toLocaleString()}\`  |  🔴 ${lossLabel}: \`${l.toLocaleString()}\`  |  📊 Rate: \`${rate}\` *(Total: ${p.toLocaleString()})*`;
    };

    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🎮 ${user.username}'s Win/Loss Records`)
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
        .setDescription('Detailed win/loss statistics and success rates across all activities.')
        .addFields(
            {
                name: '🎰 Betting & Card Games',
                value: [
                    `🃏 **Blackjack**\n${formatRecord(baubleData.blackjackWins, baubleData.blackjackPlayed)}`,
                    `🪙 **Coinflip**\n${formatRecord(baubleData.coinflipWins, baubleData.coinflipPlayed)}`,
                    `🎰 **Slots**\n${formatRecord(baubleData.slotsWins, baubleData.slotsPlayed)}`,
                    `🎲 **Gamble**\n${formatRecord(baubleData.gambleWins, baubleData.gamblePlayed)}`
                ].join('\n\n'),
                inline: false
            },
            {
                name: '🕵️ Underground Activity',
                value: [
                    `🏦 **Robberies**\n${formatRecord(baubleData.robberiesSuccessful, baubleData.robberiesAttempted, 'Successes', 'Failures')}`,
                    `🔫 **Crimes**\n${formatRecord(baubleData.crimesSuccessful, baubleData.crimesAttempted, 'Successes', 'Failures')}`
                ].join('\n\n'),
                inline: false
            },
            {
                name: '🎮 Minigames Victories',
                value: [
                    `🏁 **Word Scramble**: \`${(baubleData.scrambleWins || 0).toLocaleString()}\` wins`,
                    `💣 **Word Bomb**: \`${(baubleData.wordbombWins || 0).toLocaleString()}\` wins`,
                    `🧩 **Emoji Decode**: \`${(baubleData.emojidecodeWins || 0).toLocaleString()}\` wins`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Keep playing to improve your stats!' })
        .setTimestamp();
}
