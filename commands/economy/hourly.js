/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

function getHourlyRarity(amount) {
    if (amount <= 75) {
        return {
            tier: 'Common',
            name: 'Vending Machine Lint',
            desc: 'You found some lint and a couple of sticky baubles behind the office vending machine.',
            color: 0x95a5a6
        };
    } else if (amount <= 105) {
        return {
            tier: 'Uncommon',
            name: 'Loose Car Change',
            desc: 'Scraped from the cup holder of your car. Clean it first.',
            color: 0x2ecc71
        };
    } else if (amount <= 130) {
        return {
            tier: 'Rare',
            name: 'Forgot-In-Jeans Pocket Fund',
            desc: 'Best feeling! You put your hands in your pocket and found shiny baubles you forgot about.',
            color: 0x3498db
        };
    } else if (amount <= 145) {
        return {
            tier: 'Epic',
            name: 'Desk Drawer Cash Pile',
            desc: 'A small cache of baubles hidden under some old receipts.',
            color: 0x9b59b6
        };
    } else {
        return {
            tier: 'Legendary',
            name: 'Hourly Jackpot Sparkler',
            desc: 'A pristine, sparkling coin pile directly from the bot\'s secret stash!',
            color: 0xf1c40f
        };
    }
}

function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('hourly')
        .setDescription('Claim your hourly reward of Glimmering Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.hourlyLastClaimed;
            const cooldownMs = 1 * 60 * 60 * 1000; // 1 hour

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your hourly reward!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.`);

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // Calculate reward (50-150)
            const baseReward = Math.floor(Math.random() * 101) + 50;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const totalReward = Math.floor(baseReward * globalMultiplier * incomeMultiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.hourlyLastClaimed = now;
            await baubleData.save();

            const rarity = getHourlyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('⏰ Hourly Reward Claimed!')
                .setDescription(`You successfully claimed your hourly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${totalReward}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Claim again in 1 hour!' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in hourly slash command:', error);
            await interaction.reply({ content: '❌ Something went wrong while claiming hourly.', ephemeral: true });
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
            const lastClaimed = baubleData.hourlyLastClaimed;
            const cooldownMs = 1 * 60 * 60 * 1000; // 1 hour

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your hourly reward!\nYou can claim again in **${formatTimeRemaining(timeLeft)}**.`);

                    return message.channel.send({ embeds: [embed] });
                }
            }

            const baseReward = Math.floor(Math.random() * 101) + 50;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const totalReward = Math.floor(baseReward * globalMultiplier * incomeMultiplier);

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.hourlyLastClaimed = now;
            await baubleData.save();

            const rarity = getHourlyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('⏰ Hourly Reward Claimed!')
                .setDescription(`You successfully claimed your hourly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${totalReward}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Claim again in 1 hour!' });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in hourly prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming hourly.' });
        }
    }
};
