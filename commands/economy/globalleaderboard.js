/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// Queries database and returns the global leaderboard embed
async function getLeaderboardEmbed(client, category, metric, page, pageSize, maxPage, requesterTag, requesterAvatarURL) {
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
        emojidecodeWins: 'Global Emoji Decode Wins Leaderboard',
        guesstheflagWins: 'Global Guess the Flag Wins Leaderboard',
        geoguesserWins: 'Global GeoGuesser Wins Leaderboard',
        dailyMaxStreak: 'Global Daily Streak Leaderboard',
        coinflipMaxStreak: 'Global Coinflip Streak Leaderboard',
        gambleMaxStreak: 'Global Gamble Streak Leaderboard',
        slotsMaxStreak: 'Global Slots Streak Leaderboard',
        blackjackMaxStreak: 'Global Blackjack Streak Leaderboard',
        animebattleMaxStreak: 'Global Anime Battle Streak Leaderboard'
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

    let embedTitle = '🏆 Global Leaderboard';
    let leaderboardString = '';

    if (category === 'economy' || category === 'streaks') {
        const leaderboardData = await Bauble.find()
            .sort({ [metric]: -1 })
            .skip(page * pageSize)
            .limit(pageSize)
            .exec();

        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardString = '*No data to display.*';
        } else {
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
                    valStr = `**${(entry[metric] || 0).toLocaleString()}** ${labelMap[metric] || metric}`;
                }
                return `${page * pageSize + index + 1}. ${nameStr}: ${valStr}`;
            }));
            leaderboardString = rows.join('\n');
        }
        embedTitle = `🏆 ${titleMap[metric] || metric}`;

    } else if (category === 'items') {
        const itemId = metric.replace('item_', '');
        const item = ITEMS[itemId];
        const itemName = item ? item.name : itemId;

        const owners = await Bauble.aggregate([
            { $unwind: "$inventory" },
            { $match: { "inventory.itemId": itemId, "inventory.quantity": { $gt: 0 } } },
            { $sort: { "inventory.quantity": -1 } },
            { $skip: page * pageSize },
            { $limit: pageSize },
            { $project: { _id: 0, userId: 1, quantity: "$inventory.quantity" } }
        ]);

        if (!owners || owners.length === 0) {
            leaderboardString = `*No one owns ${itemName} yet!*`;
        } else {
            const rows = await Promise.all(owners.map(async (entry, index) => {
                let nameStr = `**Unknown User** (${entry.userId})`;
                try {
                    const user = await client.users.fetch(entry.userId);
                    const displayName = user.displayName || user.globalName || user.username;
                    nameStr = `**${user.username}** (${displayName})`;
                } catch (e) {
                    // ignore
                }
                return `${page * pageSize + index + 1}. ${nameStr}: **${entry.quantity.toLocaleString()}** Owned`;
            }));
            leaderboardString = rows.join('\n');
        }
        embedTitle = `🏆 Global ${itemName} Leaderboard`;
    }

    return new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle(embedTitle)
        .setDescription(leaderboardString)
        .setFooter({
            text: `Page ${page + 1}/${maxPage} • Requested by ${requesterTag}`,
            iconURL: requesterAvatarURL
        })
        .setTimestamp();
}

// Builds the components including category menu, metric menu, and pagination buttons
function buildComponents(activeCategory, activeMetric, page, maxPage) {
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

    // Buttons Row
    const prevBtn = new ButtonBuilder()
        .setCustomId('btn_prev')
        .setLabel('⬅️ Prev')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0);

    const nextBtn = new ButtonBuilder()
        .setCustomId('btn_next')
        .setLabel('Next ➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= maxPage - 1);

    const buttonsRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

    return [
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(metricMenu),
        buttonsRow
    ];
}

// Calculate max pages based on database documents matching the metric/item
async function calculateMaxPage(category, metric, pageSize) {
    let total = 0;
    if (category === 'economy' || category === 'streaks') {
        total = await Bauble.countDocuments();
    } else if (category === 'items') {
        const itemId = metric.replace('item_', '');
        const totalResult = await Bauble.aggregate([
            { $unwind: "$inventory" },
            { $match: { "inventory.itemId": itemId, "inventory.quantity": { $gt: 0 } } },
            { $count: "count" }
        ]);
        total = totalResult[0]?.count || 0;
    }
    // Limit global leaderboard to top 50 entries (5 pages of 10 size)
    return Math.ceil(Math.min(total, 50) / pageSize) || 1;
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('globalleaderboard')
        .setDescription('View the global leaderboard.')
        .addStringOption(option =>
            option.setName('metric')
                .setDescription('The metric or item to view the global leaderboard for')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const pageSize = 10;
            let page = 0;

            const initialInput = interaction.options.getString('metric');
            let { category: activeCategory, metric: activeMetric } = resolveInitialMetric(initialInput);

            let maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
            let embed = await getLeaderboardEmbed(
                interaction.client,
                activeCategory,
                activeMetric,
                page,
                pageSize,
                maxPage,
                interaction.user.tag,
                interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
            );

            const msg = await interaction.reply({
                embeds: [embed],
                components: buildComponents(activeCategory, activeMetric, page, maxPage),
                withResponse: true
            });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ You cannot interact with this menu.', ephemeral: true });
                }

                if (i.customId === 'leaderboard_category') {
                    activeCategory = i.values[0];
                    page = 0;
                    if (activeCategory === 'economy') activeMetric = 'baubles';
                    else if (activeCategory === 'streaks') activeMetric = 'dailyMaxStreak';
                    else if (activeCategory === 'items') {
                        const sortedItems = Object.values(ITEMS).sort((a, b) => {
                            const order = ['Unique', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
                            return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                        });
                        activeMetric = `item_${sortedItems[0].id}`;
                    }
                    maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
                } else if (i.customId === 'leaderboard_metric') {
                    activeMetric = i.values[0];
                    page = 0;
                    maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
                } else if (i.customId === 'btn_prev') {
                    page = Math.max(0, page - 1);
                } else if (i.customId === 'btn_next') {
                    page = Math.min(maxPage - 1, page + 1);
                }

                embed = await getLeaderboardEmbed(
                    interaction.client,
                    activeCategory,
                    activeMetric,
                    page,
                    pageSize,
                    maxPage,
                    interaction.user.tag,
                    interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true })
                );

                await i.update({
                    embeds: [embed],
                    components: buildComponents(activeCategory, activeMetric, page, maxPage)
                });
            });

            collector.on('end', () => {
                const disabledComponents = buildComponents(activeCategory, activeMetric, page, maxPage).map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                interaction.editReply({ components: disabledComponents }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in globalleaderboard command:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching the global leaderboard.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const pageSize = 10;
            let page = 0;

            const initialInput = args && args[0] ? args[0] : null;
            let { category: activeCategory, metric: activeMetric } = resolveInitialMetric(initialInput);

            let maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
            let embed = await getLeaderboardEmbed(
                message.client,
                activeCategory,
                activeMetric,
                page,
                pageSize,
                maxPage,
                message.author.tag,
                message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
            );

            const msg = await message.channel.send({
                embeds: [embed],
                components: buildComponents(activeCategory, activeMetric, page, maxPage)
            });

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: '❌ You cannot interact with this menu.', ephemeral: true });
                }

                if (i.customId === 'leaderboard_category') {
                    activeCategory = i.values[0];
                    page = 0;
                    if (activeCategory === 'economy') activeMetric = 'baubles';
                    else if (activeCategory === 'streaks') activeMetric = 'dailyMaxStreak';
                    else if (activeCategory === 'items') {
                        const sortedItems = Object.values(ITEMS).sort((a, b) => {
                            const order = ['Unique', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
                            return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                        });
                        activeMetric = `item_${sortedItems[0].id}`;
                    }
                    maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
                } else if (i.customId === 'leaderboard_metric') {
                    activeMetric = i.values[0];
                    page = 0;
                    maxPage = await calculateMaxPage(activeCategory, activeMetric, pageSize);
                } else if (i.customId === 'btn_prev') {
                    page = Math.max(0, page - 1);
                } else if (i.customId === 'btn_next') {
                    page = Math.min(maxPage - 1, page + 1);
                }

                embed = await getLeaderboardEmbed(
                    message.client,
                    activeCategory,
                    activeMetric,
                    page,
                    pageSize,
                    maxPage,
                    message.author.tag,
                    message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true })
                );

                await i.update({
                    embeds: [embed],
                    components: buildComponents(activeCategory, activeMetric, page, maxPage)
                });
            });

            collector.on('end', () => {
                const disabledComponents = buildComponents(activeCategory, activeMetric, page, maxPage).map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                msg.edit({ components: disabledComponents }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in globalleaderboard prefix command:', error);
            await message.reply({ content: '❌ An error occurred while fetching the global leaderboard.' });
        }
    },
};