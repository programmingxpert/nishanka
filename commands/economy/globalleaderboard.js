/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('globalleaderboard')
        .setDescription('View the global leaderboard.')
        .addStringOption(option =>
            option.setName('metric')
                .setDescription('The metric to view the global leaderboard for')
                .setRequired(false)
                .addChoices(
                    { name: 'Baubles', value: 'baubles' },
                    { name: 'Blackjack Wins', value: 'blackjackWins' },
                    { name: 'Coinflip Wins', value: 'coinflipWins' },
                    { name: 'Slots Wins', value: 'slotsWins' },
                    { name: 'Gamble Wins', value: 'gambleWins' },
                    { name: 'Crimes Successful', value: 'crimesSuccessful' },
                    { name: 'Robberies Successful', value: 'robberiesSuccessful' },
                    { name: 'Word Scramble Wins', value: 'scrambleWins' },
                    { name: 'Word Bomb Wins', value: 'wordbombWins' },
                    { name: 'Emoji Decode Wins', value: 'emojidecodeWins' }
                )
        ),

    async execute(interaction) {
        try {
            const pageSize = 10;
            let page = 0;
            const metric = interaction.options.getString('metric') || 'baubles';

            const total = await Bauble.countDocuments();
            const maxPage = Math.ceil(Math.min(total, 50) / pageSize) || 1;

            const getLeaderboardEmbed = async (page, metric) => {
                const leaderboardData = await Bauble.find()
                    .sort({ [metric]: -1 })
                    .skip(page * pageSize)
                    .limit(pageSize)
                    .exec();

                const client = interaction.client;
                const labelMap = {
                    baubles: 'Baubles',
                    blackjackWins: 'Blackjack Wins',
                    coinflipWins: 'Coinflip Wins',
                    slotsWins: 'Slots Wins',
                    gambleWins: 'Gamble Wins',
                    crimesSuccessful: 'Crimes Successful',
                    robberiesSuccessful: 'Robberies Successful',
                    scrambleWins: 'Scramble Wins',
                    wordbombWins: 'Word Bomb Wins',
                    emojidecodeWins: 'Emoji Decode Wins'
                };

                const rows = await Promise.all(leaderboardData.map(async (entry, index) => {
                    let nameStr = `**Unknown User** (${entry.userId})`;
                    try {
                        const user = await client.users.fetch(entry.userId);
                        const displayName = user.displayName || user.globalName || user.username;
                        nameStr = `**${user.username}** (${displayName})`;
                    } catch (e) {
                        // ignore
                    }
                    let valStr = '';
                    if (metric === 'baubles') {
                        valStr = `**${(entry.baubles || 0).toLocaleString()}** Baubles`;
                    } else {
                        valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric]}`;
                    }
                    return `${page * pageSize + index + 1}. ${nameStr}: ${valStr}`;
                }));

                const leaderboardString = rows.join('\n');

                const titleMap = {
                    baubles: 'Global Glimmering Bauble Leaderboard',
                    blackjackWins: 'Global Blackjack Wins Leaderboard',
                    coinflipWins: 'Global Coinflip Wins Leaderboard',
                    slotsWins: 'Global Slots Wins Leaderboard',
                    gambleWins: 'Global Gamble Wins Leaderboard',
                    crimesSuccessful: 'Global Crimes Successful Leaderboard',
                    robberiesSuccessful: 'Global Robberies Successful Leaderboard',
                    scrambleWins: 'Global Word Scramble Wins Leaderboard',
                    wordbombWins: 'Global Word Bomb Wins Leaderboard',
                    emojidecodeWins: 'Global Emoji Decode Wins Leaderboard'
                };

                return new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle(`🏆 ${titleMap[metric]}`)
                    .setDescription(leaderboardString || 'No data to display.')
                    .setFooter({
                        text: `Page ${page + 1}/${maxPage} • Requested by ${interaction.user.tag}`,
                        iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();
            };

            const components = (page, metric) => [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`prev_${metric}`)
                        .setLabel('⬅️ Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),

                    new ButtonBuilder()
                        .setCustomId(`next_${metric}`)
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= maxPage - 1)
                )
            ];

            const embed = await getLeaderboardEmbed(page, metric);
            const msg = await interaction.reply({ embeds: [embed], components: components(page, metric), withResponse: true });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: 'You can\'t interact with this.', ephemeral: true });

                const parts = i.customId.split('_');
                const action = parts[0];
                const btnMetric = parts[1] || 'baubles';

                if (action === 'prev') page--;
                else if (action === 'next') page++;

                const updatedEmbed = await getLeaderboardEmbed(page, btnMetric);
                await i.update({ embeds: [updatedEmbed], components: components(page, btnMetric) });
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

            let metric = 'baubles';
            if (args && args[0]) {
                const arg = args[0].toLowerCase();
                if (arg.startsWith('blackjack') || arg === 'bj') metric = 'blackjackWins';
                else if (arg.startsWith('coinflip') || arg === 'cf') metric = 'coinflipWins';
                else if (arg === 'slots') metric = 'slotsWins';
                else if (arg === 'gamble') metric = 'gambleWins';
                else if (arg === 'crime' || arg === 'crimes') metric = 'crimesSuccessful';
                else if (arg.startsWith('rob') || arg === 'robberies') metric = 'robberiesSuccessful';
                else if (arg === 'scramble') metric = 'scrambleWins';
                else if (arg === 'wordbomb' || arg === 'wb') metric = 'wordbombWins';
                else if (arg === 'emojidecode' || arg === 'emoji') metric = 'emojidecodeWins';
            }

            const total = await Bauble.countDocuments();
            const maxPage = Math.ceil(Math.min(total, 50) / pageSize) || 1;

            const getLeaderboardEmbed = async (page, metric) => {
                const leaderboardData = await Bauble.find()
                    .sort({ [metric]: -1 })
                    .skip(page * pageSize)
                    .limit(pageSize)
                    .exec();

                const client = message.client;
                const labelMap = {
                    baubles: 'Baubles',
                    blackjackWins: 'Blackjack Wins',
                    coinflipWins: 'Coinflip Wins',
                    slotsWins: 'Slots Wins',
                    gambleWins: 'Gamble Wins',
                    crimesSuccessful: 'Crimes Successful',
                    robberiesSuccessful: 'Robberies Successful',
                    scrambleWins: 'Scramble Wins',
                    wordbombWins: 'Word Bomb Wins',
                    emojidecodeWins: 'Emoji Decode Wins'
                };

                const rows = await Promise.all(leaderboardData.map(async (entry, index) => {
                    let nameStr = `**Unknown User** (${entry.userId})`;
                    try {
                        const user = await client.users.fetch(entry.userId);
                        const displayName = user.displayName || user.globalName || user.username;
                        nameStr = `**${user.username}** (${displayName})`;
                    } catch (e) {
                        // ignore
                    }
                    let valStr = '';
                    if (metric === 'baubles') {
                        valStr = `**${(entry.baubles || 0).toLocaleString()}** Baubles`;
                    } else {
                        valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric]}`;
                    }
                    return `${page * pageSize + index + 1}. ${nameStr}: ${valStr}`;
                }));

                const leaderboardString = rows.join('\n');

                const titleMap = {
                    baubles: 'Global Glimmering Bauble Leaderboard',
                    blackjackWins: 'Global Blackjack Wins Leaderboard',
                    coinflipWins: 'Global Coinflip Wins Leaderboard',
                    slotsWins: 'Global Slots Wins Leaderboard',
                    gambleWins: 'Global Gamble Wins Leaderboard',
                    crimesSuccessful: 'Global Crimes Successful Leaderboard',
                    robberiesSuccessful: 'Global Robberies Successful Leaderboard',
                    scrambleWins: 'Global Word Scramble Wins Leaderboard',
                    wordbombWins: 'Global Word Bomb Wins Leaderboard',
                    emojidecodeWins: 'Global Emoji Decode Wins Leaderboard'
                };

                return new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle(`🏆 ${titleMap[metric]}`)
                    .setDescription(leaderboardString || 'No data to display.')
                    .setFooter({
                        text: `Page ${page + 1}/${maxPage} • Requested by ${message.author.tag}`,
                        iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();
            };

            const components = (page, metric) => [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`prev_${metric}`)
                        .setLabel('⬅️ Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),

                    new ButtonBuilder()
                        .setCustomId(`next_${metric}`)
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= maxPage - 1)
                )
            ];

            const embed = await getLeaderboardEmbed(page, metric);
            const msg = await message.channel.send({ embeds: [embed], components: components(page, metric) });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return i.reply({ content: 'You can\'t interact with this.', ephemeral: true });

                const parts = i.customId.split('_');
                const action = parts[0];
                const btnMetric = parts[1] || 'baubles';

                if (action === 'prev') page--;
                else if (action === 'next') page++;

                const updatedEmbed = await getLeaderboardEmbed(page, btnMetric);
                await i.update({ embeds: [updatedEmbed], components: components(page, btnMetric) });
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