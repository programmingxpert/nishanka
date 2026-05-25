/* eslint-disable */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const Bauble = require('../../models/baubleSchema');

// Define our shop items
const shopItems = [
    {
        id: 'lottery_ticket',
        name: 'Lottery Ticket',
        description: 'A ticket for a chance to win back double your spent Baubles. Price: **50 Baubles**. (50% chance to double your expenditure back.)',
        price: 50,
        async execute(userId, baubleData) {
            // 50% chance to award 100 Baubles (i.e. double the price back)
            const win = Math.random() < 0.5;
            if (win) {
                const reward = 100;
                baubleData.baubles += reward;
                return { result: 'win', reward };
            }
            return { result: 'lose' };
        }
    },
    {
        id: 'mystery_box',
        name: 'Mystery Box',
        description: 'Open a mystery box for a random reward between **10** to **100 Baubles**. Price: **100 Baubles**.',
        price: 100,
        async execute(userId, baubleData) {
            const reward = Math.floor(Math.random() * 91) + 10; // Reward between 10 and 100
            baubleData.baubles += reward;
            return { result: 'reward', reward };
        }
    },
    {
        id: 'custom_badge',
        name: 'Custom Badge',
        description: 'Unlock a custom profile badge that shows off your status. Price: **200 Baubles**.',
        price: 200,
        async execute(userId, baubleData) {
            // Add badge to user inventory if they don’t have it already.
            if (!baubleData.inventory) baubleData.inventory = [];
            if (!baubleData.inventory.includes('custom_badge')) {
                baubleData.inventory.push('custom_badge');
                return { result: 'badge' };
            } else {
                return { result: 'owned' };
            }
        }
    },
    {
        id: 'earnings_booster',
        name: 'Earnings Booster',
        description: 'Double your bauble earnings for the next hour. Price: **150 Baubles**.',
        price: 150,
        async execute(userId, baubleData) {
            // Set a booster flag and a timestamp for expiration.
            if (!baubleData.booster || Date.now() > baubleData.booster.expiresAt) {
                baubleData.booster = { active: true, expiresAt: Date.now() + 3600000 }; // one hour in ms
                return { result: 'booster' };
            } else {
                return { result: 'active' };
            }
        }
    }
];

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse items to spend your Glimmering Baubles.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                // If the user doesn't have bauble data, create it.
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        `<@${userId}>, you've unlocked the Glimmering Bauble system!\n\n` +
                        "Collect Baubles by being active and using commands."
                    )
                    .setFooter({ text: 'Glimmering Baubles' });
                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: true });

                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return;
            }

            // Build the shop embed to list out the items
            const shopEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🛍️ Glimmering Bauble Shop')
                .setDescription(
                    `You currently have **${baubleData.baubles}** Baubles.\n\n` +
                    shopItems.map(item => `**${item.name}** – ${item.description}`).join('\n\n')
                )
                .setFooter({ text: 'Select an item below to purchase it.' });

            // Create a select menu so user can choose an item.
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_select')
                .setPlaceholder('Select an item to purchase')
                .addOptions(
                    shopItems.map(item => ({
                        label: item.name,
                        description: item.description.substring(0, 50), // limited length description
                        value: item.id
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ content: `<@${userId}>`, embeds: [shopEmbed], components: [row], ephemeral: true });

            // Create a collector to process the selection.
            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId === 'shop_select',
                time: 30000, // 30 seconds to choose an item
                max: 1
            });

            collector.on('collect', async i => {
                await i.deferUpdate();
                const selectedId = i.values[0];
                const selectedItem = shopItems.find(item => item.id === selectedId);

                // Check if user can afford the item.
                if (baubleData.baubles < selectedItem.price) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Insufficient Baubles')
                        .setDescription(`You need **${selectedItem.price}** Baubles to buy **${selectedItem.name}**. You only have **${baubleData.baubles}** Baubles.`)
                        .setFooter({ text: 'Glimmering Bauble Shop' });
                    return i.editReply({ embeds: [errorEmbed], components: [] });
                }

                // Deduct the price.
                baubleData.baubles -= selectedItem.price;
                // Execute the item’s effect.
                const result = await selectedItem.execute(userId, baubleData);

                // Save changes
                await baubleData.save();

                // Create a result message based on the item effect.
                let resultMsg = '';
                switch (result.result) {
                    case 'win':
                        resultMsg = `🎟️ Congratulations! You bought a **Lottery Ticket** and won **${result.reward}** Baubles back!`;
                        break;
                    case 'lose':
                        resultMsg = `🎟️ You bought a **Lottery Ticket** but didn’t win anything this time.`;
                        break;
                    case 'reward':
                        resultMsg = `📦 You opened a **Mystery Box** and received **${result.reward}** bonus Baubles!`;
                        break;
                    case 'badge':
                        resultMsg = `🏅 You unlocked a **Custom Badge** for your profile!`;
                        break;
                    case 'owned':
                        resultMsg = `🏅 You already own the Custom Badge. No additional charge. Refunding **${selectedItem.price}** Baubles.`;
                        baubleData.baubles += selectedItem.price;
                        await baubleData.save();
                        break;
                    case 'booster':
                        resultMsg = `⚡ You activated an **Earnings Booster**! Your future earnings will be doubled for the next hour!`;
                        break;
                    case 'active':
                        resultMsg = `⚡ Your **Earnings Booster** is already active! Refunding **${selectedItem.price}** Baubles.`;
                        baubleData.baubles += selectedItem.price;
                        await baubleData.save();
                        break;
                    default:
                        resultMsg = `You purchased **${selectedItem.name}**, but nothing happened.`;
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('Purchase Successful!')
                    .setDescription(`${resultMsg}\n\nYour new balance is **${baubleData.baubles}** Baubles.`)
                    .setFooter({ text: 'Glimmering Bauble Shop' })
                    .setTimestamp();

                i.editReply({ content: `<@${userId}>`, embeds: [resultEmbed], components: [] });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    // If time ran out without any selection, just disable the menu.
                    interaction.editReply({ components: [] }).catch(console.error);
                }
            });
        } catch (error) {
            console.error('Error in shop command:', error);
            await interaction.reply({ content: '❌ An error occurred while accessing the shop.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const userId = message.author.id;

            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        `<@${userId}>, you've unlocked the Glimmering Bauble system!\n\n` +
                        "Collect Baubles by being active and using commands."
                    )
                    .setFooter({ text: 'Glimmering Baubles' });
                await message.channel.send({ content: `<@${userId}>`, embeds: [welcomeEmbed] });
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return;
            }

            // Build shop embed
            const shopEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🛍️ Glimmering Bauble Shop')
                .setDescription(
                    `You currently have **${baubleData.baubles}** Baubles.\n\n` +
                    shopItems.map(item => `**${item.name}** – ${item.description}`).join('\n\n')
                )
                .setFooter({ text: 'Type the item ID to purchase it.' });

            await message.channel.send({ content: `<@${userId}>`, embeds: [shopEmbed] });

            const filter = m => m.author.id === userId;
            const collector = message.channel.createMessageCollector({
                filter,
                time: 30000, // 30 seconds to respond
                max: 1
            });

            collector.on('collect', async m => {
                if (m.author.id !== userId) return;
                const input = m.content.trim().toLowerCase();
                const selectedItem = shopItems.find(item => item.id === input);
                if (!selectedItem) {
                    return message.channel.send(`<@${userId}>, invalid item. Please try again.`);
                }
                if (baubleData.baubles < selectedItem.price) {
                    return message.channel.send(`<@${userId}>, you need **${selectedItem.price}** Baubles for **${selectedItem.name}**. You only have **${baubleData.baubles}**.`);
                }
                // Deduct price and execute item
                baubleData.baubles -= selectedItem.price;
                const result = await selectedItem.execute(userId, baubleData);
                await baubleData.save();

                let resultMsg = '';
                switch (result.result) {
                    case 'win':
                        resultMsg = `🎟️ Congratulations! You bought a Lottery Ticket and won **${result.reward}** Baubles back!`;
                        break;
                    case 'lose':
                        resultMsg = `🎟️ You bought a Lottery Ticket but didn’t win anything this time.`;
                        break;
                    case 'reward':
                        resultMsg = `📦 You opened a Mystery Box and received **${result.reward}** bonus Baubles!`;
                        break;
                    case 'badge':
                        resultMsg = `🏅 You unlocked a Custom Badge for your profile!`;
                        break;
                    case 'owned':
                        resultMsg = `🏅 You already own the Custom Badge. Refunding **${selectedItem.price}** Baubles.`;
                        baubleData.baubles += selectedItem.price;
                        await baubleData.save();
                        break;
                    case 'booster':
                        resultMsg = `⚡ You activated an Earnings Booster! Your future earnings will be doubled for the next hour!`;
                        break;
                    case 'active':
                        resultMsg = `⚡ Your Earnings Booster is already active! Refunding **${selectedItem.price}** Baubles.`;
                        baubleData.baubles += selectedItem.price;
                        await baubleData.save();
                        break;
                    default:
                        resultMsg = `You purchased **${selectedItem.name}**, but nothing happened.`;
                }
                const resultEmbed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('Purchase Successful!')
                    .setDescription(`${resultMsg}\n\nYour new balance is **${baubleData.baubles}** Baubles.`)
                    .setFooter({ text: 'Glimmering Bauble Shop' })
                    .setTimestamp();
                message.channel.send({ content: `<@${userId}>`, embeds: [resultEmbed] });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    message.channel.send(`<@${userId}>, shop timed out. Please try again later.`);
                }
            });
        } catch (error) {
            console.error('Error in shop command:', error);
            await message.reply({ content: '❌ An error occurred while accessing the shop.', ephemeral: true });
        }
    },
};