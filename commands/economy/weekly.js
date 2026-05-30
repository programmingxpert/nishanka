/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

function getWeeklyRarity(amount) {
    if (amount <= 7500) {
        return {
            tier: 'Common',
            name: 'Mundane Box of Shiny Rocks',
            desc: 'A cardboard box filled with baubles. A bit dusty, but they spend just fine.',
            color: 0x8B89AC // Greyish blue
        };
    } else if (amount <= 9500) {
        return {
            tier: 'Uncommon',
            name: 'Stolen Goblin Loot Bag',
            desc: 'You cornered a loot goblin and shook it until this massive pile of baubles fell out.',
            color: 0x4ADE80 // Green
        };
    } else if (amount <= 11500) {
        return {
            tier: 'Rare',
            name: 'Jack’s Giant Sparkling Stash',
            desc: 'You climbed a digital beanstalk and stole a massive glittering hoard. Incredible!',
            color: 0x7C6CF0 // Purple
        };
    } else {
        return {
            tier: 'Legendary',
            name: 'Nishanka’s Personal Vault Keys',
            desc: 'The bot left its vault door wide open. You grabbed as many glimmering baubles as your pockets could hold before the alarms went off!',
            color: 0xFBBF24 // Gold
        };
    }
}

function formatWeeklyTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Claim your weekly treasure trove of Glimmering Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const lastClaimed = baubleData.weeklyLastClaimed;
            const cooldownMs = 7 * 24 * 60 * 60 * 1000; // 7 days

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your weekly reward!\nYou can claim again in **${formatWeeklyTimeRemaining(timeLeft)}**.\n\nKeep grinding daily in the meantime!`)
                        .setTimestamp()
                        .setFooter({ text: 'Weekly treasures require patience!' });

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // Calculate reward (6000-12000)
            const baseReward = Math.floor(Math.random() * 6001) + 6000;
            const globalMultiplier = await getGlobalMultiplier();
            const reward = Math.floor(baseReward * globalMultiplier);

            // Save to database
            baubleData.baubles = (baubleData.baubles || 0) + reward;
            baubleData.weeklyLastClaimed = now;
            await baubleData.save();

            const rarity = getWeeklyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('🎁 Weekly Treasure Claimed!')
                .setDescription(`You successfully claimed your weekly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Treasure Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${reward}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Come back next week for another epic haul!' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in weekly slash command:', error);
            await interaction.reply({ content: '❌ Something went wrong while claiming weekly.', ephemeral: true });
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
            const lastClaimed = baubleData.weeklyLastClaimed;
            const cooldownMs = 7 * 24 * 60 * 60 * 1000;

            if (lastClaimed) {
                const diff = now.getTime() - lastClaimed.getTime();

                if (diff < cooldownMs) {
                    const timeLeft = cooldownMs - diff;
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⏰ Too Early!')
                        .setDescription(`You've already claimed your weekly reward!\nYou can claim again in **${formatWeeklyTimeRemaining(timeLeft)}**.\n\nKeep grinding daily in the meantime!`)
                        .setTimestamp()
                        .setFooter({ text: 'Weekly treasures require patience!' });

                    return message.channel.send({ embeds: [embed] });
                }
            }

            const baseReward = Math.floor(Math.random() * 6001) + 6000;
            const globalMultiplier = await getGlobalMultiplier();
            const reward = Math.floor(baseReward * globalMultiplier);

            baubleData.baubles = (baubleData.baubles || 0) + reward;
            baubleData.weeklyLastClaimed = now;
            await baubleData.save();

            const rarity = getWeeklyRarity(baseReward);

            const embed = new EmbedBuilder()
                .setColor(rarity.color)
                .setTitle('🎁 Weekly Treasure Claimed!')
                .setDescription(`You successfully claimed your weekly Glimmering Baubles!\n*(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields(
                    { name: '✨ Treasure Rarity', value: `**[${rarity.tier}]** ${rarity.name}`, inline: false },
                    { name: '📝 Description', value: `*${rarity.desc}*`, inline: false },
                    { name: '💰 Base Reward', value: `**${baseReward}** Baubles`, inline: true },
                    { name: '💵 Total Earned', value: `**${reward}** Baubles`, inline: true },
                    { name: '💼 New Balance', value: `**${baubleData.baubles}** Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Come back next week for another epic haul!' });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in weekly prefix command:', error);
            await message.reply({ content: '❌ Something went wrong while claiming weekly.' });
        }
    }
};
