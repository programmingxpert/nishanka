/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const slotEmojis = ['💎', '💰', '🍀', '🔔', '🍒']; // Slot machine emojis

module.exports = {
    category: 'economy',
    cooldown: 30, // 30-second cooldown
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Spin the Glimmering Bauble slots!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of Baubles to bet.')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const bet = interaction.options.getInteger('bet');

            // Check if user exists and apply the welcome message if they don't
            let baubleData = await Bauble.findOne({ userId });
            if (!baubleData) {
                // If the user is new send a welcome message
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎉 Welcome to the Glimmering Bauble Party!')
                    .setDescription(
                        "Hey there! You've unlocked the Glimmering Bauble system!\n\n" +
                        "Collect Baubles by being active, using commands, and exploring the bot!\n\n" +
                        "Use `/bauble` to check your balance."
                    )
                    .setFooter({ text: 'Glimmering Baubles', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: false });

                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return; // Exit out of this to stop the old method
            }

            if (baubleData.baubles < bet) {
                return interaction.reply({ content: `❌ You need at least ${bet} Baubles to spin the slots!`, ephemeral: true });
            }

            baubleData.baubles -= bet;
            await baubleData.save();

            // Generate slot results
            const slotResults = [
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            ];

            const spinningEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: ' | | ' })
                .setFooter({ text: `Cost: ${bet} Baubles` });

            const message = await interaction.reply({ embeds: [spinningEmbed] });

            // Simulate spinning effect with message edits
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updateEmbed1 = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: `${slotResults[0]} | | ` })
                .setFooter({ text: `Cost: ${bet} Baubles` });
            await interaction.editReply({ embeds: [updateEmbed1] });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const updateEmbed2 = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .setDescription('Spinning... 🔄')
                .addFields({ name: 'Results', value: `${slotResults[0]} | ${slotResults[1]} | ` })
                .setFooter({ text: `Cost: ${bet} Baubles` });
            await interaction.editReply({ embeds: [updateEmbed2] });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const finalEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎰 Bauble Slots')
                .addFields({ name: 'Results', value: slotResults.join(' | ') })
                .setFooter({ text: `Cost: ${bet} Baubles` });

            let winnings = 0;

            // Check for win conditions
            if (slotResults[0] === slotResults[1] && slotResults[1] === slotResults[2]) {
                winnings = bet * 5; // Three in a row: 5x payout
                finalEmbed.setColor(0x00FF00).setDescription('🎉 Jackpot! Three in a row!');
            } else if (slotResults[0] === slotResults[1] || slotResults[1] === slotResults[2] || slotResults[0] === slotResults[2]) {
                winnings = bet * 2; // Two in a row: 2x payout
                finalEmbed.setColor(0x00FFFF).setDescription('✨ Two in a row!');
            } else {
                finalEmbed.setColor(0xFF0000).setDescription('🙁 No luck this time!');
            }

            baubleData.baubles += winnings;
            await baubleData.save();

            finalEmbed.addFields({ name: 'Winnings', value: `${winnings} Baubles`, inline: true });
            finalEmbed.addFields({ name: 'New Balance', value: `${baubleData.baubles} Baubles`, inline: true });

            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Error in slots command:', error);
            await interaction.reply({ content: '❌ An error occurred while spinning the slots.', ephemeral: true });
        }
    },
    async executePrefix(message) {
        return message.reply('❌ This command is only available as a slash command.');
    },
};