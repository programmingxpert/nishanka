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
            const guild = interaction.guild;
            
            // Fetch all members of the server to ensure cache is populated and accurate
            const membersMap = await guild.members.fetch();
            const memberIds = Array.from(membersMap.keys());

            // Fetch top 10 users in this server with the most Baubles
            const leaderboardData = await Bauble.find({ userId: { $in: memberIds } })
                .sort({ baubles: -1 })
                .limit(10)
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return interaction.reply({ content: '❌ No users in this server have any Baubles yet!', ephemeral: true });
            }

            // Create leaderboard string
            const leaderboardString = leaderboardData.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                return `${index + 1}. ${nameStr}: **${entry.baubles.toLocaleString()}** Baubles`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle('🏆 Glimmering Bauble Leaderboard (This Server)')
                .setDescription(leaderboardString)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the leaderboard.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const guild = message.guild;

            // Fetch all members of the server to ensure cache is populated and accurate
            const membersMap = await guild.members.fetch();
            const memberIds = Array.from(membersMap.keys());

            // Fetch top 10 users in this server with the most Baubles
            const leaderboardData = await Bauble.find({ userId: { $in: memberIds } })
                .sort({ baubles: -1 })
                .limit(10)
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return message.reply({ content: '❌ No users in this server have any Baubles yet!' });
            }

            // Create leaderboard string
            const leaderboardString = leaderboardData.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                return `${index + 1}. ${nameStr}: **${entry.baubles.toLocaleString()}** Baubles`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle('🏆 Glimmering Bauble Leaderboard (This Server)')
                .setDescription(leaderboardString)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) 
                });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await message.reply({ content: '❌ An error occurred while fetching the leaderboard.' });
        }
    },
};