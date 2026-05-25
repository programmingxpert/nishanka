/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('bauble')
        .setDescription('Check a user\'s Glimmering Bauble balance.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose balance to check.')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            const userId = user.id;

            // Check if user exists
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Gold color
                .setTitle('💰 Bauble Balance')
                .setDescription(`${user.username} has **${baubleData.baubles}** Glimmering Baubles!`)
                .addFields(
                    { name: '🪙 Coinflip Streak', value: `\`${baubleData.coinflipStreak || 0}\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)`, inline: true },
                    { name: '🎲 Gamble Streak', value: `\`${baubleData.gambleStreak || 0}\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)`, inline: true },
                    { name: '🎰 Slots Streak', value: `\`${baubleData.slotsStreak || 0}\` (Best: \`${baubleData.slotsMaxStreak || 0}\`)`, inline: true },
                    { name: '📅 Daily Streak', value: `\`${baubleData.dailyStreak || 0}\` (Best: \`${baubleData.dailyMaxStreak || 0}\`)`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) });

            await interaction.reply({ embeds: [embed], ephemeral: false }); // Or false if you want it public
        } catch (error) {
            console.error('Error in bauble command:', error);
            await interaction.reply({ content: '❌ An error occurred while checking the balance.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        try {
            let user = message.mentions.users.first() || message.author; // Get mentioned user or author
            const userId = user.id;

            // Check if user exists
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Gold color
                .setTitle('💰 Bauble Balance')
                .setDescription(`${user.username} has **${baubleData.baubles}** Glimmering Baubles!`)
                .addFields(
                    { name: '🪙 Coinflip Streak', value: `\`${baubleData.coinflipStreak || 0}\` (Best: \`${baubleData.coinflipMaxStreak || 0}\`)`, inline: true },
                    { name: '🎲 Gamble Streak', value: `\`${baubleData.gambleStreak || 0}\` (Best: \`${baubleData.gambleMaxStreak || 0}\`)`, inline: true },
                    { name: '🎰 Slots Streak', value: `\`${baubleData.slotsStreak || 0}\` (Best: \`${baubleData.slotsMaxStreak || 0}\`)`, inline: true },
                    { name: '📅 Daily Streak', value: `\`${baubleData.dailyStreak || 0}\` (Best: \`${baubleData.dailyMaxStreak || 0}\`)`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) });

            await message.channel.send({ embeds: [embed]}); // Or false if you want it public
        } catch (error) {
            console.error('Error in bauble command:', error);
            await message.reply({ content: '❌ An error occurred while checking the balance.' });
        }
    },
};