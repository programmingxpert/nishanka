/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    aliases: ['streaks'],
    data: new SlashCommandBuilder()
        .setName('streak')
        .setDescription('Show streak and win streak information for a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose streaks to view.')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            const userId = user.id;

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0x8E44AD)
                .setTitle(`${user.username}'s Streaks`)
                .setDescription(`Current streak information for **${user.username}**.`)
                .addFields(
                    {
                        name: '🔥 Minigame Streaks',
                        value: `**🪙 Coinflip:** \`${baubleData.coinflipStreak || 0}\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)\n` +
                               `**🎲 Gamble:** \`${baubleData.gambleStreak || 0}\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)\n` +
                               `**🎰 Slots:** \`${baubleData.slotsStreak || 0}\` (Best: \`${baubleData.slotsMaxStreak || 0}\`)\n` +
                               `**🃏 Blackjack:** \`${baubleData.blackjackStreak || 0}\` (Best: \`${baubleData.blackjackMaxStreak || 0}\`)\n` +
                               `**⚔️ Anime Battle:** \`${baubleData.animebattleStreak || 0}\` (Best: \`${baubleData.animebattleMaxStreak || 0}\`)`,
                        inline: false
                    },
                    {
                        name: '📅 Activity Streaks',
                        value: `**🎁 Daily:** \`${baubleData.dailyStreak || 0}\` (Best: \`${baubleData.dailyMaxStreak || 0}\`)`,
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in streak command:', error);
            await interaction.reply({ content: '❌ An error occurred while retrieving streak info.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const user = message.mentions.users.first() || message.author;
            const userId = user.id;

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0x8E44AD)
                .setTitle(`${user.username}'s Streaks`)
                .setDescription(`Current streak information for **${user.username}**.`)
                .addFields(
                    {
                        name: '🔥 Minigame Streaks',
                        value: `**🪙 Coinflip:** \`${baubleData.coinflipStreak || 0}\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)\n` +
                               `**🎲 Gamble:** \`${baubleData.gambleStreak || 0}\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)\n` +
                               `**🎰 Slots:** \`${baubleData.slotsStreak || 0}\` (Best: \`${baubleData.slotsMaxStreak || 0}\`)\n` +
                               `**🃏 Blackjack:** \`${baubleData.blackjackStreak || 0}\` (Best: \`${baubleData.blackjackMaxStreak || 0}\`)\n` +
                               `**⚔️ Anime Battle:** \`${baubleData.animebattleStreak || 0}\` (Best: \`${baubleData.animebattleMaxStreak || 0}\`)`,
                        inline: false
                    },
                    {
                        name: '📅 Activity Streaks',
                        value: `**🎁 Daily:** \`${baubleData.dailyStreak || 0}\` (Best: \`${baubleData.dailyMaxStreak || 0}\`)`,
                        inline: false
                    }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in streak prefix command:', error);
            await message.reply('❌ An error occurred while retrieving streak info.');
        }
    }
};
