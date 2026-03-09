/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the Glimmering Bauble leaderboard for users in this server.'), //Updated command

    async execute(interaction) {
        try {
            const guildId = interaction.guild.id; // Get the guild ID
            const userId = interaction.user.id; // Get the user ID who uses command

            // Fetch top 10 users with the most Baubles
            const leaderboardData = await Bauble.find() //Search only for baubles with user
                .sort({ baubles: -1 }) // Sort in descending order
                .limit(10) // Limit to top 10
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return interaction.reply({ content: '❌ No users have any Baubles yet!', ephemeral: true });
            }

             // Filtering leaderboardData to include users present in the current server
            const filteredLeaderboard = leaderboardData.filter(entry => {
                try {
                    const member = interaction.guild.members.cache.get(entry.userId);
                    return member !== undefined; // Include only those who are members of this server
                } catch (error) {
                    console.error(`Could not fetch member ${entry.userId} from guild ${guildId}:`, error);
                    return false; // Exclude if there's an error fetching member (e.g., user left)
                }
            });

            if (filteredLeaderboard.length === 0) {
                return interaction.reply({ content: '❌ No users with Baubles found in this server!', ephemeral: true });
            }

            // Create leaderboard string from filtered data
            const leaderboardString = filteredLeaderboard.map((entry, index) => {
                return `${index + 1}. <@${entry.userId}>: **${entry.baubles}** Baubles`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF) // Cyan color
                .setTitle('🏆 Glimmering Bauble Leaderboard (This Server)')
                .setDescription(leaderboardString)
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the leaderboard.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const guildId = message.guild.id; // Get the guild ID
            const userId = message.author.id; // Get the user ID who uses command

            // Fetch top 10 users with the most Baubles
            const leaderboardData = await Bauble.find() //Search only for baubles with user
                .sort({ baubles: -1 }) // Sort in descending order
                .limit(10) // Limit to top 10
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return message.reply({ content: '❌ No users have any Baubles yet!'});
            }

             // Filtering leaderboardData to include users present in the current server
            const filteredLeaderboard = leaderboardData.filter(entry => {
                try {
                    const member = message.guild.members.cache.get(entry.userId);
                    return member !== undefined; // Include only those who are members of this server
                } catch (error) {
                    console.error(`Could not fetch member ${entry.userId} from guild ${guildId}:`, error);
                    return false; // Exclude if there's an error fetching member (e.g., user left)
                }
            });

            if (filteredLeaderboard.length === 0) {
                return message.reply({ content: '❌ No users with Baubles found in this server!' });
            }

            // Create leaderboard string from filtered data
            const leaderboardString = filteredLeaderboard.map((entry, index) => {
                return `${index + 1}. <@${entry.userId}>: **${entry.baubles}** Baubles`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF) // Cyan color
                .setTitle('🏆 Glimmering Bauble Leaderboard (This Server)')
                .setDescription(leaderboardString)
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await message.reply({ content: '❌ An error occurred while fetching the leaderboard.' });
        }
    },
};