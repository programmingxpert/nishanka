/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('passive')
        .setDescription('Toggle Passive Mode. Protects you from robbery/brawls, but prevents you from doing them.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

            if (baubleData.passiveMode) {
                // Toggling OFF (Disabling passive mode) - Always allowed
                baubleData.passiveMode = false;
                baubleData.passiveModeToggledAt = now;
                await baubleData.save();

                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C) // Red / warning color
                    .setTitle('🔒 Passive Mode Disabled')
                    .setDescription('You have disabled Passive Mode! You can now participate in battles and rob other players.\n\n⚠️ **WARNING:** You are now vulnerable to being robbed! You cannot enable Passive Mode again for **24 hours**.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            } else {
                // Toggling ON (Enabling passive mode) - Check 24 hour cooldown since it was last disabled
                const lastToggle = baubleData.passiveModeToggledAt;
                if (lastToggle) {
                    const diff = now.getTime() - lastToggle.getTime();
                    if (diff < cooldownMs) {
                        const timeLeft = cooldownMs - diff;
                        const hoursLeft = Math.ceil(timeLeft / (3600 * 1000));
                        return interaction.reply({
                            content: `❌ You recently disabled Passive Mode! You must wait **${hoursLeft} hours** before enabling it again to prevent abuse.`,
                            ephemeral: true
                        });
                    }
                }

                baubleData.passiveMode = true;
                baubleData.passiveModeToggledAt = now;
                await baubleData.save();

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71) // Green / safe color
                    .setTitle('🛡️ Passive Mode Enabled')
                    .setDescription('You have enabled Passive Mode! You are now completely safe from being robbed and challenged to battles.\n\n🚫 **Note:** You cannot rob other players or initiate battles while in Passive Mode.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in passive command:', error);
            await interaction.reply({ content: '❌ An error occurred while toggling Passive Mode.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const now = new Date();
            const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

            if (baubleData.passiveMode) {
                baubleData.passiveMode = false;
                baubleData.passiveModeToggledAt = now;
                await baubleData.save();

                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🔒 Passive Mode Disabled')
                    .setDescription('You have disabled Passive Mode! You can now participate in battles and rob other players.\n\n⚠️ **WARNING:** You are now vulnerable to being robbed! You cannot enable Passive Mode again for **24 hours**.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            } else {
                const lastToggle = baubleData.passiveModeToggledAt;
                if (lastToggle) {
                    const diff = now.getTime() - lastToggle.getTime();
                    if (diff < cooldownMs) {
                        const timeLeft = cooldownMs - diff;
                        const hoursLeft = Math.ceil(timeLeft / (3600 * 1000));
                        return message.reply(`❌ You recently disabled Passive Mode! You must wait **${hoursLeft} hours** before enabling it again to prevent abuse.`);
                    }
                }

                baubleData.passiveMode = true;
                baubleData.passiveModeToggledAt = now;
                await baubleData.save();

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🛡️ Passive Mode Enabled')
                    .setDescription('You have enabled Passive Mode! You are now completely safe from being robbed and challenged to battles.\n\n🚫 **Note:** You cannot rob other players or initiate battles while in Passive Mode.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in passive prefix command:', error);
            await message.reply('❌ An error occurred while toggling Passive Mode.');
        }
    }
};
