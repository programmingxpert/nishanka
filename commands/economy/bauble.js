/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('bauble')
        .setDescription('Check a user\'s Glimmering Bauble balance.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose balance to check.')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            const userId = user.id;

            // Check if user exists
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            let description = `${user.username} has **${baubleData.baubles.toLocaleString()}** Glimmering Baubles!`;
            if (baubleData.baubles >= 150000) {
                const taxPercent = baubleData.baubles >= 500000 ? 0.05 : 0.02;
                description += `\n\n⚠️ **Wealth Transaction Tax Notice:** Because this balance is over **150,000 Baubles**, your transfers (-give) and shop purchases are subject to a **${(taxPercent * 100).toFixed(0)}%** transaction tax. *No daily wallet decay applies!*`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Gold color
                .setTitle('💰 Bauble Balance')
                .setDescription(description)
                .setTimestamp();
            
            // Add wealth tax notice if applicable today
            let footerText = `Requested by ${interaction.user.tag}`;
            if (baubleData.lastTaxDate) {
                const taxDate = new Date(baubleData.lastTaxDate);
                const today = new Date();
                if (taxDate.getDate() === today.getDate() && taxDate.getMonth() === today.getMonth() && taxDate.getFullYear() === today.getFullYear()) {
                    footerText = `📉 Wealth Tax: ${user.username} paid ${baubleData.lastTaxPaid.toLocaleString()} baubles today! | ` + footerText;
                }
            }

            embed.setFooter({ text: footerText, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) });

            await interaction.reply({ embeds: [embed], ephemeral: false }); // Or false if you want it public
        } catch (error) {
            console.error('Error in bauble command:', error);
            await interaction.reply({ content: '❌ An error occurred while checking the balance.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        try {
            let user = message.mentions.users.first() || message.author; // Get mentioned user or author
            const userId = user.id;

            // Check if user exists
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            let description = `${user.username} has **${baubleData.baubles.toLocaleString()}** Glimmering Baubles!`;
            if (baubleData.baubles >= 150000) {
                const taxPercent = baubleData.baubles >= 500000 ? 0.05 : 0.02;
                description += `\n\n⚠️ **Wealth Transaction Tax Notice:** Because this balance is over **150,000 Baubles**, your transfers (-give) and shop purchases are subject to a **${(taxPercent * 100).toFixed(0)}%** transaction tax. *No daily wallet decay applies!*`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Gold color
                .setTitle('💰 Bauble Balance')
                .setDescription(description)
                .setTimestamp();

            // Add wealth tax notice if applicable today
            let footerText = `Requested by ${message.author.tag}`;
            if (baubleData.lastTaxDate) {
                const taxDate = new Date(baubleData.lastTaxDate);
                const today = new Date();
                if (taxDate.getDate() === today.getDate() && taxDate.getMonth() === today.getMonth() && taxDate.getFullYear() === today.getFullYear()) {
                    footerText = `📉 Wealth Tax: ${user.username} paid ${baubleData.lastTaxPaid.toLocaleString()} baubles today! | ` + footerText;
                }
            }

            embed.setFooter({ text: footerText, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) });

            await message.channel.send({ embeds: [embed]}); // Or false if you want it public
        } catch (error) {
            console.error('Error in bauble command:', error);
            await message.reply({ content: '❌ An error occurred while checking the balance.' });
        }
    },
};