/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

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
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Hourly Cooldown')
                        .setDescription(`Available <t:${nextClaimEpoch}:R>`);

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // Calculate reward (50-150)
            const baseReward = Math.floor(Math.random() * 101) + 50;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            const totalReward = Math.floor(baseReward * multiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.hourlyLastClaimed = now;
            await baubleData.save();

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('✦ Hourly Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward}\` • Multiplier: \`${multiplier.toFixed(2)}x\`)\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

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
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Hourly Cooldown')
                        .setDescription(`Available <t:${nextClaimEpoch}:R>`);

                    return message.channel.send({ embeds: [embed] });
                }
            }

            const baseReward = Math.floor(Math.random() * 101) + 50;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;
            const totalReward = Math.floor(baseReward * multiplier);

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.hourlyLastClaimed = now;
            await baubleData.save();

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle('✦ Hourly Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward}\` • Multiplier: \`${multiplier.toFixed(2)}x\`)\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in hourly prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming hourly.' });
        }
    }
};
