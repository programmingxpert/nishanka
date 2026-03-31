/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('globalleaderboard')
        .setDescription('View the global Glimmering Bauble leaderboard.'),

    async execute(interaction) {
        try {
            const pageSize = 10;
            let page = 0;

            const total = await Bauble.countDocuments();
            const maxPage = Math.ceil(Math.min(total, 100) / pageSize);

            const getLeaderboardEmbed = async (page) => {
                const leaderboardData = await Bauble.find()
                    .sort({ baubles: -1 })
                    .limit(100) // only top 100
                    .skip(page * pageSize)
                    .exec();

                const leaderboardString = leaderboardData.map((entry, index) => {
                    return `${page * pageSize + index + 1}. <@${entry.userId}>: **${entry.baubles}** Baubles`;
                }).join('\n');

                return new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle('🏆 Global Glimmering Bauble Leaderboard')
                    .setDescription(leaderboardString || 'No data to display.')
                    .setFooter({
                        text: `Page ${page + 1}/${maxPage} • Requested by ${interaction.user.tag}`,
                        iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();
            };

            const components = (page) => [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️ Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),

                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= maxPage - 1)
                )
            ];

            const embed = await getLeaderboardEmbed(page);
            const msg = await interaction.reply({ embeds: [embed], components: components(page), fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: 'You can\'t interact with this.', ephemeral: true });

                if (i.customId === 'prev') page--;
                else if (i.customId === 'next') page++;

                const updatedEmbed = await getLeaderboardEmbed(page);
                await i.update({ embeds: [updatedEmbed], components: components(page) });
            });

            collector.on('end', () => {
                msg.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the leaderboard.', ephemeral: true });
        }
    },
};