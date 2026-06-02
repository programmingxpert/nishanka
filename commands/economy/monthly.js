/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

function getMonthlyRarity(amount) {
    if (amount <= 30000) {
        return {
            tier: 'Common',
            name: 'Corporate Monthly Allowance',
            desc: 'Your standard monthly stipend from the Baubleverse HR department. Spend it wisely.',
            color: 0x95a5a6
        };
    } else if (amount <= 35000) {
        return {
            tier: 'Uncommon',
            name: 'Stock Dividend Payout',
            desc: 'Dividends from your investments in the bot\'s premium sticker collection.',
            color: 0x2ecc71
        };
    } else if (amount <= 40000) {
        return {
            tier: 'Rare',
            name: 'Offshore Interest Cashout',
            desc: 'Interest accumulated in a highly suspicious offshore account. The tax fund didn\'t see this.',
            color: 0x3498db
        };
    } else if (amount <= 45000) {
        return {
            tier: 'Epic',
            name: 'Federal Reserve Vault Crack',
            desc: 'A massive monthly heist! You slipped into the federal vaults and grabbed a stack of gold-pressed baubles.',
            color: 0x9b59b6
        };
    } else {
        return {
            tier: 'Legendary',
            name: 'Divine Stimulus Package',
            desc: 'The heavens opened and rained down pure, sparkling, legendary baubles directly into your vault!',
            color: 0xf1c40f
        };
    }
}

function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('monthly')
        .setDescription('Claim your monthly allowance of Glimmering Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.monthlyLastClaimed;
            const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your monthly allowance!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.`);

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // Calculate reward (25k-50k)
            const baseReward = Math.floor(Math.random() * 25001) + 25000;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const totalReward = Math.floor(baseReward * globalMultiplier * incomeMultiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.monthlyLastClaimed = now;
            await baubleData.save();

            const rarity = getMonthlyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('📅 Monthly Allowance Claimed!')
                .setDescription(`You successfully claimed your monthly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward.toLocaleString()}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${totalReward.toLocaleString()}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles.toLocaleString()}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Claim again next month!' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in monthly slash command:', error);
            await interaction.reply({ content: '❌ Something went wrong while claiming monthly.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.monthlyLastClaimed;
            const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your monthly allowance!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.`);

                    return message.channel.send({ embeds: [embed] });
                }
            }

            const baseReward = Math.floor(Math.random() * 25001) + 25000;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const totalReward = Math.floor(baseReward * globalMultiplier * incomeMultiplier);

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.monthlyLastClaimed = now;
            await baubleData.save();

            const rarity = getMonthlyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('📅 Monthly Allowance Claimed!')
                .setDescription(`You successfully claimed your monthly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward.toLocaleString()}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${totalReward.toLocaleString()}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles.toLocaleString()}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Claim again next month!' });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in monthly prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming monthly.' });
        }
    }
};
