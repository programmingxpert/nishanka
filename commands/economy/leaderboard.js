/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { ITEMS } = require('../../utils/items');

// Resolves a string input to its corresponding leaderboard category and metric
function resolveInitialMetric(input) {
    if (!input) {
        return { category: 'economy', metric: 'baubles' };
    }
    const cleanInput = input.toLowerCase();

    // Economy metrics mapping
    const economyMap = {
        baubles: 'baubles',
        blackjackwins: 'blackjackWins',
        bj: 'blackjackWins',
        coinflipwins: 'coinflipWins',
        cf: 'coinflipWins',
        slotswins: 'slotsWins',
        gamblewins: 'gambleWins',
        crimessuccessful: 'crimesSuccessful',
        crime: 'crimesSuccessful',
        crimes: 'crimesSuccessful',
        robberiessuccessful: 'robberiesSuccessful',
        rob: 'robberiesSuccessful',
        robberies: 'robberiesSuccessful',
        scramblewins: 'scrambleWins',
        scramble: 'scrambleWins',
        wordbombwins: 'wordbombWins',
        wordbomb: 'wordbombWins',
        wb: 'wordbombWins',
        emojidecodewins: 'emojidecodeWins',
        emojidecode: 'emojidecodeWins',
        emoji: 'emojidecodeWins',
        guesstheflagwins: 'guesstheflagWins',
        guesstheflag: 'guesstheflagWins',
        flag: 'guesstheflagWins',
        gtf: 'guesstheflagWins',
        geoguesserwins: 'geoguesserWins',
        geoguesser: 'geoguesserWins',
        geo: 'geoguesserWins',
        gg: 'geoguesserWins'
    };

    if (economyMap[cleanInput]) {
        return { category: 'economy', metric: economyMap[cleanInput] };
    }

    // Streak metrics mapping
    const streakMap = {
        daily: 'dailyMaxStreak',
        dailystreak: 'dailyMaxStreak',
        dailymaxstreak: 'dailyMaxStreak',
        coinflipstreak: 'coinflipMaxStreak',
        coinflipmaxstreak: 'coinflipMaxStreak',
        gamblestreak: 'gambleMaxStreak',
        gamblemaxstreak: 'gambleMaxStreak',
        slotsstreak: 'slotsMaxStreak',
        slotsmaxstreak: 'slotsMaxStreak',
        blackjackstreak: 'blackjackMaxStreak',
        blackjackmaxstreak: 'blackjackMaxStreak',
        animebattle: 'animebattleMaxStreak',
        animebattlestreak: 'animebattleMaxStreak',
        animebattlemaxstreak: 'animebattleMaxStreak'
    };

    if (streakMap[cleanInput]) {
        return { category: 'streaks', metric: streakMap[cleanInput] };
    }

    // Check if it matches an item
    const itemId = cleanInput.startsWith('item_') ? cleanInput.substring(5) : cleanInput;
    if (ITEMS[itemId]) {
        return { category: 'items', metric: `item_${itemId}` };
    }

    // Default to baubles if unknown
    return { category: 'economy', metric: 'baubles' };
}

// Queries database and returns the leaderboard embed
async function getLeaderboardEmbed(guild, category, metric, requesterTag, requesterAvatarURL) {
    const membersMap = await guild.members.fetch();
    const memberIds = Array.from(membersMap.keys());

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
        geoguesserWins: 'GeoGuesser Wins Leaderboard',
        dailyMaxStreak: 'Daily Streak Leaderboard',
        coinflipMaxStreak: 'Coinflip Streak Leaderboard',
        gambleMaxStreak: 'Gamble Streak Leaderboard',
        slotsMaxStreak: 'Slots Streak Leaderboard',
        blackjackMaxStreak: 'Blackjack Streak Leaderboard',
        animebattleMaxStreak: 'Anime Battle Streak Leaderboard'
    };

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
        geoguesserWins: 'GeoGuesser Wins',
        dailyMaxStreak: 'Days (Max Streak)',
        coinflipMaxStreak: 'Streak (Max)',
        gambleMaxStreak: 'Streak (Max)',
        slotsMaxStreak: 'Streak (Max)',
        blackjackMaxStreak: 'Streak (Max)',
        animebattleMaxStreak: 'Streak (Max)'
    };

    let embedTitle = '🏆 Leaderboard';
    let leaderboardString = '';

    if (category === 'economy' || category === 'streaks') {
        const leaderboardData = await Bauble.find({ userId: { $in: memberIds } })
            .sort({ [metric]: -1 })
            .limit(10)
            .exec();

        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardString = '*No users in this server have any stats recorded for this metric yet!*';
        } else {
            leaderboardString = leaderboardData.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                
                let valStr = '';
                if (metric === 'baubles') {
                    valStr = `**${(entry.baubles || 0).toLocaleString()}** Baubles`;
                } else {
                    valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric] || metric}`;
                }
                return `${index + 1}. ${nameStr}: ${valStr}`;
            }).join('\n');
        }
        embedTitle = `🏆 ${titleMap[metric] || metric} (This Server)`;

    } else if (category === 'items') {
        const itemId = metric.replace('item_', '');
        const item = ITEMS[itemId];
        const itemName = item ? item.name : itemId;

        const owners = await Bauble.aggregate([
            { $match: { userId: { $in: memberIds } } },
            { $unwind: "$inventory" },
            { $match: { "inventory.itemId": itemId, "inventory.quantity": { $gt: 0 } } },
            { $sort: { "inventory.quantity": -1 } },
            { $limit: 10 },
            { $project: { _id: 0, userId: 1, quantity: "$inventory.quantity" } }
        ]);

        if (!owners || owners.length === 0) {
            leaderboardString = `*No one on this server owns ${itemName} yet!*`;
        } else {
            leaderboardString = owners.map((entry, index) => {
                const member = membersMap.get(entry.userId);
                const nameStr = member 
                    ? `**${member.user.username}** (${member.displayName})` 
                    : `**Unknown User** (${entry.userId})`;
                return `${index + 1}. ${nameStr}: **${entry.quantity.toLocaleString()}** Owned`;
            }).join('\n');
        }
        embedTitle = `🏆 ${itemName} Leaderboard (This Server)`;
    }

    return new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle(embedTitle)
        .setDescription(leaderboardString)
        .setFooter({ text: `Requested by ${requesterTag}`, iconURL: requesterAvatarURL })
        .setTimestamp();
}

// Builds the select menu action rows for category and metric
function buildComponents(activeCategory, activeMetric) {
    // 1. Category Dropdown
    const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('leaderboard_category')
        .setPlaceholder('Select Leaderboard Category...')
        .addOptions([
            { label: 'Wealth & Economy', value: 'economy', emoji: '💰', description: 'Baubles, minigame wins, work stats' },
            { label: 'Minigame Streaks', value: 'streaks', emoji: '🔥', description: 'Longest winning streaks' },
            { label: 'Rare Items (Hall of Fame)', value: 'items', emoji: '🎒', description: 'Top owners of collectibles' }
        ].map(opt => ({ ...opt, default: opt.value === activeCategory })));

    // Economy metrics options
    const economyMetrics = [
        { label: 'Baubles', value: 'baubles', emoji: '🪙', description: 'Baubles balance' },
        { label: 'Blackjack Wins', value: 'blackjackWins', emoji: '🃏', description: 'Total Blackjack wins' },
        { label: 'Coinflip Wins', value: 'coinflipWins', emoji: '🪙', description: 'Total Coinflip wins' },
        { label: 'Slots Wins', value: 'slotsWins', emoji: '🎰', description: 'Total Slots wins' },
        { label: 'Gamble Wins', value: 'gambleWins', emoji: '🎲', description: 'Total Gamble wins' },
        { label: 'Crimes Successful', value: 'crimesSuccessful', emoji: '⚔️', description: 'Successful crimes' },
        { label: 'Robberies Successful', value: 'robberiesSuccessful', emoji: '🔫', description: 'Successful robberies' },
        { label: 'Word Scramble Wins', value: 'scrambleWins', emoji: '🔤', description: 'Word Scramble wins' },
        { label: 'Word Bomb Wins', value: 'wordbombWins', emoji: '💣', description: 'Word Bomb wins' },
        { label: 'Emoji Decode Wins', value: 'emojidecodeWins', emoji: '🧩', description: 'Emoji Decode wins' },
        { label: 'Guess the Flag Wins', value: 'guesstheflagWins', emoji: '🚩', description: 'Guess the Flag wins' },
        { label: 'GeoGuesser Wins', value: 'geoguesserWins', emoji: '🌍', description: 'GeoGuesser wins' }
    ];

    // Streak metrics options
    const streakMetrics = [
        { label: 'Daily Streak', value: 'dailyMaxStreak', emoji: '🔥', description: 'Max daily claim streak' },
        { label: 'Coinflip Streak', value: 'coinflipMaxStreak', emoji: '🪙', description: 'Max coinflip win streak' },
        { label: 'Gamble Streak', value: 'gambleMaxStreak', emoji: '🎲', description: 'Max gamble win streak' },
        { label: 'Slots Streak', value: 'slotsMaxStreak', emoji: '🎰', description: 'Max slots win streak' },
        { label: 'Blackjack Streak', value: 'blackjackMaxStreak', emoji: '🃏', description: 'Max blackjack win streak' },
        { label: 'Anime Battle Streak', value: 'animebattleMaxStreak', emoji: '⚔️', description: 'Max anime battle win streak' }
    ];

    // Build items metrics list dynamically, prioritizing rarities
    const sortedItems = Object.values(ITEMS).sort((a, b) => {
        const order = ['Unique', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
        const indexA = order.indexOf(a.rarity);
        const indexB = order.indexOf(b.rarity);
        const valA = indexA === -1 ? 99 : indexA;
        const valB = indexB === -1 ? 99 : indexB;
        return valA - valB;
    });

    const itemMetrics = sortedItems.slice(0, 25).map(item => {
        const cleanName = item.name.replace(item.emoji, '').trim();
        return {
            label: cleanName.length > 25 ? cleanName.slice(0, 22) + '...' : cleanName,
            value: `item_${item.id}`,
            emoji: item.emoji || '🎒',
            description: `${item.rarity || 'Common'} • ${item.category || 'item'}`.slice(0, 50)
        };
    });

    let activeMetricOptions = [];
    if (activeCategory === 'economy') activeMetricOptions = economyMetrics;
    else if (activeCategory === 'streaks') activeMetricOptions = streakMetrics;
    else if (activeCategory === 'items') activeMetricOptions = itemMetrics;

    const metricMenu = new StringSelectMenuBuilder()
        .setCustomId('leaderboard_metric')
        .setPlaceholder('Select Metric...')
        .addOptions(activeMetricOptions.map(opt => ({ ...opt, default: opt.value === activeMetric })));

    return [
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(metricMenu)
    ];
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the leaderboard for users in this server.')
        .addStringOption(option =>
            option.setName('metric')
                .setDescription('The metric or item to view the leaderboard for')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
            }

            const initialInput = interaction.options.getString('metric');
            let { category: activeCategory, metric: activeMetric } = resolveInitialMetric(initialInput);

            const embed = await getLeaderboardEmbed(
                guild, 
                activeCategory, 
                activeMetric, 
                interaction.user.tag, 
                interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
            );

            const msg = await interaction.reply({ 
                embeds: [embed], 
                components: buildComponents(activeCategory, activeMetric),
                withResponse: true 
            });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ You cannot interact with this menu.', ephemeral: true });
                }

                if (i.customId === 'leaderboard_category') {
                    activeCategory = i.values[0];
                    // Reset to appropriate default metric for category
                    if (activeCategory === 'economy') activeMetric = 'baubles';
                    else if (activeCategory === 'streaks') activeMetric = 'dailyMaxStreak';
                    else if (activeCategory === 'items') {
                        // find first item option
                        const sortedItems = Object.values(ITEMS).sort((a, b) => {
                            const order = ['Unique', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
                            return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                        });
                        activeMetric = `item_${sortedItems[0].id}`;
                    }
                } else if (i.customId === 'leaderboard_metric') {
                    activeMetric = i.values[0];
                }

                const updatedEmbed = await getLeaderboardEmbed(
                    guild, 
                    activeCategory, 
                    activeMetric, 
                    interaction.user.tag, 
                    interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
                );
                
                await i.update({
                    embeds: [updatedEmbed],
                    components: buildComponents(activeCategory, activeMetric)
                });
            });

            collector.on('end', () => {
                const disabledComponents = buildComponents(activeCategory, activeMetric).map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                interaction.editReply({ components: disabledComponents }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the leaderboard.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const guild = message.guild;
            if (!guild) {
                return message.reply({ content: '❌ This command can only be used in a server.' });
            }

            const initialInput = args && args[0] ? args[0] : null;
            let { category: activeCategory, metric: activeMetric } = resolveInitialMetric(initialInput);

            const embed = await getLeaderboardEmbed(
                guild, 
                activeCategory, 
                activeMetric, 
                message.author.tag, 
                message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
            );

            const msg = await message.channel.send({ 
                embeds: [embed], 
                components: buildComponents(activeCategory, activeMetric)
            });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: '❌ You cannot interact with this menu.', ephemeral: true });
                }

                if (i.customId === 'leaderboard_category') {
                    activeCategory = i.values[0];
                    if (activeCategory === 'economy') activeMetric = 'baubles';
                    else if (activeCategory === 'streaks') activeMetric = 'dailyMaxStreak';
                    else if (activeCategory === 'items') {
                        const sortedItems = Object.values(ITEMS).sort((a, b) => {
                            const order = ['Unique', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
                            return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                        });
                        activeMetric = `item_${sortedItems[0].id}`;
                    }
                } else if (i.customId === 'leaderboard_metric') {
                    activeMetric = i.values[0];
                }

                const updatedEmbed = await getLeaderboardEmbed(
                    guild, 
                    activeCategory, 
                    activeMetric, 
                    message.author.tag, 
                    message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
                );

                await i.update({
                    embeds: [updatedEmbed],
                    components: buildComponents(activeCategory, activeMetric)
                });
            });

            collector.on('end', () => {
                const disabledComponents = buildComponents(activeCategory, activeMetric).map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                msg.edit({ components: disabledComponents }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in leaderboard prefix command:', error);
            await message.reply({ content: '❌ An error occurred while fetching the leaderboard.' });
        }
    },
};