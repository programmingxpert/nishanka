/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the leaderboard for users in this server.')
        .addStringOption(option =>
            option.setName('metric')
                .setDescription('The metric to view the leaderboard for')
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
                    { name: 'Emoji Decode Wins', value: 'emojidecodeWins' },
                    { name: 'Guess the Flag Wins', value: 'guesstheflagWins' },
                    { name: 'GeoGuesser Wins', value: 'geoguesserWins' }
                )
        ),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const metric = interaction.options.getString('metric') || 'baubles';
            
            // Fetch all members of the server to ensure cache is populated and accurate
            const membersMap = await guild.members.fetch();
            const memberIds = Array.from(membersMap.keys());

            // Fetch top 10 users in this server with the sorted metric
            const leaderboardData = await Bauble.find({ userId: { $in: memberIds } })
                .sort({ [metric]: -1 })
                .limit(10)
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return interaction.reply({ content: '❌ No users in this server have any stats recorded yet!', ephemeral: true });
            }

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
                emojidecodeWins: 'Emoji Decode Wins',
                guesstheflagWins: 'Guess the Flag Wins',
                geoguesserWins: 'GeoGuesser Wins'
            };

            // Create leaderboard string
            const leaderboardString = leaderboardData.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                
                let valStr = '';
                if (metric === 'baubles') {
                    valStr = `**${(entry.baubles || 0).toLocaleString()}** Baubles`;
                } else {
                    valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric]}`;
                }
                return `${index + 1}. ${nameStr}: ${valStr}`;
            }).join('\n');

            const titleMap = {
                baubles: 'Glimmering Bauble Leaderboard',
                blackjackWins: 'Blackjack Wins Leaderboard',
                coinflipWins: 'Coinflip Wins Leaderboard',
                slotsWins: 'Slots Wins Leaderboard',
                gambleWins: 'Gamble Wins Leaderboard',
                crimesSuccessful: 'Crimes Successful Leaderboard',
                robberiesSuccessful: 'Robberies Successful Leaderboard',
                scrambleWins: 'Word Scramble Wins Leaderboard',
                wordbombWins: 'Word Bomb Wins Leaderboard',
                emojidecodeWins: 'Emoji Decode Wins Leaderboard',
                guesstheflagWins: 'Guess the Flag Wins Leaderboard',
                geoguesserWins: 'GeoGuesser Wins Leaderboard'
            };

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle(`🏆 ${titleMap[metric]} (This Server)`)
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

    async executePrefix(message, args) {
        try {
            const guild = message.guild;

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
                else if (arg === 'guesstheflag' || arg === 'flag' || arg === 'gtf') metric = 'guesstheflagWins';
                else if (arg === 'geoguesser' || arg === 'geo' || arg === 'gg') metric = 'geoguesserWins';
            }

            // Fetch all members of the server to ensure cache is populated and accurate
            const membersMap = await guild.members.fetch();
            const memberIds = Array.from(membersMap.keys());

            // Fetch top 10 users in this server with the sorted metric
            const leaderboardData = await Bauble.find({ userId: { $in: memberIds } })
                .sort({ [metric]: -1 })
                .limit(10)
                .exec();

            if (!leaderboardData || leaderboardData.length === 0) {
                return message.reply({ content: '❌ No users in this server have any stats recorded yet!' });
            }

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
                emojidecodeWins: 'Emoji Decode Wins',
                guesstheflagWins: 'Guess the Flag Wins',
                geoguesserWins: 'GeoGuesser Wins'
            };

            // Create leaderboard string
            const leaderboardString = leaderboardData.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                
                let valStr = '';
                if (metric === 'baubles') {
                    valStr = `**${(entry.baubles || 0).toLocaleString()}** Baubles`;
                } else {
                    valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric]}`;
                }
                return `${index + 1}. ${nameStr}: ${valStr}`;
            }).join('\n');

            const titleMap = {
                baubles: 'Glimmering Bauble Leaderboard',
                blackjackWins: 'Blackjack Wins Leaderboard',
                coinflipWins: 'Coinflip Wins Leaderboard',
                slotsWins: 'Slots Wins Leaderboard',
                gambleWins: 'Gamble Wins Leaderboard',
                crimesSuccessful: 'Crimes Successful Leaderboard',
                robberiesSuccessful: 'Robberies Successful Leaderboard',
                scrambleWins: 'Word Scramble Wins Leaderboard',
                wordbombWins: 'Word Bomb Wins Leaderboard',
                emojidecodeWins: 'Emoji Decode Wins Leaderboard',
                guesstheflagWins: 'Guess the Flag Wins Leaderboard',
                geoguesserWins: 'GeoGuesser Wins Leaderboard'
            };

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle(`🏆 ${titleMap[metric]} (This Server)`)
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