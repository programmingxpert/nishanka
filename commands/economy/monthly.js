/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

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
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Monthly Cooldown')
                        .setDescription(`Available <t:${nextClaimEpoch}:R>`);

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // Calculate reward (25k-50k)
            const baseReward = Math.floor(Math.random() * 25001) + 25000;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const { getUserPremiumTier } = require('../../utils/premiumPromo');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;

            let premiumBonus = 0;
            let bonusInfo = '';
            const userTier = getUserPremiumTier(userId);
            if (userTier === 'lifetime') {
                const PremiumUser = require('../../models/premiumUserSchema');
                const premUser = await PremiumUser.findOne({ userId });
                if (premUser) {
                    const claimed = premUser.lifetimeBaublesClaimed || 0;
                    const remaining = Math.max(0, 5000000 - claimed);
                    if (remaining > 0) {
                        premiumBonus = Math.min(200000, remaining);
                        premUser.lifetimeBaublesClaimed = claimed + premiumBonus;
                        await premUser.save();
                        bonusInfo = `\n🎁 **Lifetime Premium Perk:** +${premiumBonus.toLocaleString()} 🪙 claimed (Total: ${(claimed + premiumBonus).toLocaleString()}/5,000,000)`;
                    } else {
                        bonusInfo = `\n⚠️ **Lifetime Premium Perk:** You have already reached the 5,000,000 limit.`;
                    }
                }
            }

            const totalReward = Math.floor(baseReward * multiplier) + premiumBonus;

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.monthlyLastClaimed = now;
            await baubleData.save();

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('✦ Monthly Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward.toLocaleString()}\` • Multiplier: \`${multiplier.toFixed(2)}x\`${premiumBonus > 0 ? ` • Premium: \`+${premiumBonus.toLocaleString()}\`` : ''})\n` +
                    `${bonusInfo}\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

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
                    const nextClaimEpoch = Math.floor((lastClaimed.getTime() + cooldownMs) / 1000);
                    const embed = new EmbedBuilder()
                        .setColor(0x2b2d42)
                        .setTitle('⏳ Monthly Cooldown')
                        .setDescription(`Available <t:${nextClaimEpoch}:R>`);

                    return message.channel.send({ embeds: [embed] });
                }
            }

            const baseReward = Math.floor(Math.random() * 25001) + 25000;
            
            const { getGlobalMultiplier } = require('../../utils/economyEngine');
            const { getIncomeMultiplier } = require('../../utils/items');
            const { getUserPremiumTier } = require('../../utils/premiumPromo');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const multiplier = globalMultiplier * incomeMultiplier;

            let premiumBonus = 0;
            let bonusInfo = '';
            const userTier = getUserPremiumTier(userId);
            if (userTier === 'lifetime') {
                const PremiumUser = require('../../models/premiumUserSchema');
                const premUser = await PremiumUser.findOne({ userId });
                if (premUser) {
                    const claimed = premUser.lifetimeBaublesClaimed || 0;
                    const remaining = Math.max(0, 5000000 - claimed);
                    if (remaining > 0) {
                        premiumBonus = Math.min(200000, remaining);
                        premUser.lifetimeBaublesClaimed = claimed + premiumBonus;
                        await premUser.save();
                        bonusInfo = `\n🎁 **Lifetime Premium Perk:** +${premiumBonus.toLocaleString()} 🪙 claimed (Total: ${(claimed + premiumBonus).toLocaleString()}/5,000,000)`;
                    } else {
                        bonusInfo = `\n⚠️ **Lifetime Premium Perk:** You have already reached the 5,000,000 limit.`;
                    }
                }
            }

            const totalReward = Math.floor(baseReward * multiplier) + premiumBonus;

            baubleData.baubles = (baubleData.baubles || 0) + totalReward;
            baubleData.monthlyLastClaimed = now;
            await baubleData.save();

            const nextClaimEpoch = Math.floor((now.getTime() + cooldownMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('✦ Monthly Claim')
                .setDescription(
                    `Received **+${totalReward.toLocaleString()}** 🪙 (Base: \`${baseReward.toLocaleString()}\` • Multiplier: \`${multiplier.toFixed(2)}x\`${premiumBonus > 0 ? ` • Premium: \`+${premiumBonus.toLocaleString()}\`` : ''})\n` +
                    `${bonusInfo}\n\n` +
                    `💰 Balance: **${baubleData.baubles.toLocaleString()}** 🪙\n` +
                    `⏱️ Next Claim: <t:${nextClaimEpoch}:R>`
                );

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in monthly prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming monthly.' });
        }
    }
};
