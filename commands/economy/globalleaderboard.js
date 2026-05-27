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
            const maxPage = Math.ceil(Math.min(total, 50) / pageSize) || 1;

            const getLeaderboardEmbed = async (page) => {
                const leaderboardData = await Bauble.find()
                    .sort({ baubles: -1 })
                    .skip(page * pageSize)
                    .limit(pageSize)
                    .exec();

                const client = interaction.client;
                const rows = await Promise.all(leaderboardData.map(async (entry, index) => {
                    let nameStr = `**Unknown User** (${entry.userId})`;
                    try {
                        const user = await client.users.fetch(entry.userId);
                        const displayName = user.displayName || user.globalName || user.username;
                        nameStr = `**${user.username}** (${displayName})`;
                    } catch (e) {
                        // ignore
                    }
                    return `${page * pageSize + index + 1}. ${nameStr}: **${entry.baubles.toLocaleString()}** Baubles`;
                }));

                const leaderboardString = rows.join('\n');

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

    async executePrefix(message, args) {
        try {
            const pageSize = 10;
            let page = 0;

            const total = await Bauble.countDocuments();
            const maxPage = Math.ceil(Math.min(total, 50) / pageSize) || 1;

            const getLeaderboardEmbed = async (page) => {
                const leaderboardData = await Bauble.find()
                    .sort({ baubles: -1 })
                    .skip(page * pageSize)
                    .limit(pageSize)
                    .exec();

                const client = message.client;
                const rows = await Promise.all(leaderboardData.map(async (entry, index) => {
                    let nameStr = `**Unknown User** (${entry.userId})`;
                    try {
                        const user = await client.users.fetch(entry.userId);
                        const displayName = user.displayName || user.globalName || user.username;
                        nameStr = `**${user.username}** (${displayName})`;
                    } catch (e) {
                        // ignore
                    }
                    return `${page * pageSize + index + 1}. ${nameStr}: **${entry.baubles.toLocaleString()}** Baubles`;
                }));

                const leaderboardString = rows.join('\n');

                return new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle('🏆 Global Glimmering Bauble Leaderboard')
                    .setDescription(leaderboardString || 'No data to display.')
                    .setFooter({
                        text: `Page ${page + 1}/${maxPage} • Requested by ${message.author.tag}`,
                        iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
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
            const msg = await message.channel.send({ embeds: [embed], components: components(page) });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return i.reply({ content: 'You can\'t interact with this.', ephemeral: true });

                if (i.customId === 'prev') page--;
                else if (i.customId === 'next') page++;

                const updatedEmbed = await getLeaderboardEmbed(page);
                await i.update({ embeds: [updatedEmbed], components: components(page) });
            });

            collector.on('end', () => {
                msg.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in globalleaderboard prefix command:', error);
            await message.reply({ content: '❌ An error occurred while fetching the leaderboard.' });
        }
    },
};