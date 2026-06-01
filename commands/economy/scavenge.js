/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');

const scavengeLocations = [
    "the dark forest",
    "an abandoned mine",
    "a dusty attic",
    "the local garbage dump",
    "a forgotten treasure chest",
];

module.exports = {
    category: 'economy',
    cooldown: 600, // 10-minute cooldown
    data: new SlashCommandBuilder()
        .setName('scavenge')
        .setDescription('Scavenge baubles'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const location = scavengeLocations[Math.floor(Math.random() * scavengeLocations.length)];
            const searchingMessages = [
                `🔍 Searching ${location}...`,
                `🤔 Still looking...`,
                `😳 Almost found something...`,
            ];

            let baubleData = await Bauble.findOne({ userId });
            if (baubleData) {
                const now = Date.now();
                if (baubleData.padlockedExpiresAt && now < new Date(baubleData.padlockedExpiresAt).getTime()) {
                    const timeLeft = Math.ceil((new Date(baubleData.padlockedExpiresAt).getTime() - now) / 1000);
                    const msg = `🔒 You are padlocked inside your own vault! You cannot go out to scavenge. \nWait **${timeLeft} seconds** to be let out.`;
                    
                    const client = interaction.client;
                    if (client && client.cooldowns && client.cooldowns.has('scavenge')) {
                        client.cooldowns.get('scavenge').delete(userId);
                    }
                    return interaction.reply({ content: msg, ephemeral: true });
                }
            }

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                 const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        "Hey there! You've unlocked the Glimmering Bauble system!\n\n" +
                        "Collect Baubles by being active, using commands, and exploring the bot!\n\n" +
                        "Use `/bauble` to check your balance."
                    )
                    .setFooter({ text: 'Glimmering Baubles', iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) });

                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: false });
                await baubleData.save();
                return;
            }

            const initialEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setDescription(searchingMessages[0]);

            const reply = await interaction.reply({ embeds: [initialEmbed], withResponse: true });

            // Simulate searching with message edits
            for (let i = 1; i < searchingMessages.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                const updateEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setDescription(searchingMessages[i]);
                await interaction.editReply({ embeds: [updateEmbed] });
            }

            // Determine earnings
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const baseEarnings = Math.floor(Math.random() * 30) + 5; // Random base earnings between 5 and 35
            const earnings = Math.floor(baseEarnings * globalMultiplier * incomeMultiplier);
            baubleData.baubles += earnings;
            await baubleData.save();

            // Final result
            const finalEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✨ You scavenged ${location} and found **${earnings}** Glimmering Baubles! *(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields({ name: 'New Balance', value: `${baubleData.baubles} Baubles`, inline: true })
                .setTimestamp();

            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Error in scavenge command:', error);
            await interaction.reply({ content: '❌ An error occurred while scavenging.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            const location = scavengeLocations[Math.floor(Math.random() * scavengeLocations.length)];
            const searchingMessages = [
                `🔍 Searching ${location}...`,
                `🤔 Still looking...`,
                `😳 Almost found something...`,
            ];

            let baubleData = await Bauble.findOne({ userId });
            if (baubleData) {
                const now = Date.now();
                if (baubleData.padlockedExpiresAt && now < new Date(baubleData.padlockedExpiresAt).getTime()) {
                    const timeLeft = Math.ceil((new Date(baubleData.padlockedExpiresAt).getTime() - now) / 1000);
                    const msg = `🔒 You are padlocked inside your own vault! You cannot go out to scavenge. \nWait **${timeLeft} seconds** to be let out.`;
                    
                    const client = message.client;
                    if (client && client.cooldowns && client.cooldowns.has('scavenge')) {
                        client.cooldowns.get('scavenge').delete(userId);
                    }
                    return message.reply(msg);
                }
            }

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                 const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        "Hey there! You've unlocked the Glimmering Bauble system!\n\n" +
                        "Collect Baubles by being active, using commands, and exploring the bot!\n\n" +
                        "Use `/bauble` to check your balance."
                    )
                    .setFooter({ text: 'Glimmering Baubles', iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) });

                await message.channel.send({ embeds: [welcomeEmbed] });
                await baubleData.save();
                return;
            }

            const initialEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setDescription(searchingMessages[0]);

            const sentMessage = await message.channel.send({ embeds: [initialEmbed] });

            // Simulate searching with message edits
            for (let i = 1; i < searchingMessages.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                const updateEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setDescription(searchingMessages[i]);
                await sentMessage.edit({ embeds: [updateEmbed] });
            }

            // Determine earnings
            const { getIncomeMultiplier } = require('../../utils/items');
            const globalMultiplier = await getGlobalMultiplier();
            const incomeMultiplier = await getIncomeMultiplier(userId);
            const baseEarnings = Math.floor(Math.random() * 30) + 5; // Random base earnings between 5 and 35
            const earnings = Math.floor(baseEarnings * globalMultiplier * incomeMultiplier);
            baubleData.baubles += earnings;
            await baubleData.save();

            // Final result
            const finalEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✨ You scavenged ${location} and found **${earnings}** Glimmering Baubles! *(Economy Multiplier: ${globalMultiplier}x)*`)
                .addFields({ name: 'New Balance', value: `${baubleData.baubles} Baubles`, inline: true })
                .setTimestamp();

            await sentMessage.edit({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Error in scavenge command (prefix):', error);
            await message.reply({ content: '❌ An error occurred while scavenging.', ephemeral: true });
        }
    },
};