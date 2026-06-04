/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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

                // Show confirmation warning first
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('⚠️ Enable Passive Mode?')
                    .setDescription(
                        'Passive Mode protects you from being robbed and challenged to brawls, but:\n\n' +
                        '🚫 **RESTRICTIONS:**\n' +
                        '- You cannot rob other players.\n' +
                        '- You cannot challenge others to brawls/battles.\n' +
                        '- If you disable it later, you must wait **24 hours** before you can enable it again.\n\n' +
                        'Are you sure you want to enable Passive Mode?'
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`passive_confirm_${userId}`)
                        .setLabel('Yes, Enable')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`passive_cancel_${userId}`)
                        .setLabel('No, Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

                const response = await interaction.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === userId && i.customId.startsWith('passive_'),
                    componentType: ComponentType.Button,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.customId === `passive_confirm_${userId}`) {
                        baubleData = await Bauble.findOne({ userId });
                        if (!baubleData) {
                            baubleData = new Bauble({ userId });
                        }
                        baubleData.passiveMode = true;
                        baubleData.passiveModeToggledAt = new Date();
                        await baubleData.save();

                        const successEmbed = new EmbedBuilder()
                            .setColor(0x2ECC71)
                            .setTitle('🛡️ Passive Mode Enabled')
                            .setDescription('You have enabled Passive Mode! You are now completely safe from being robbed and challenged to battles.\n\n🚫 **Note:** You cannot rob other players or initiate battles while in Passive Mode.')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [successEmbed], components: [] });
                    } else {
                        const cancelEmbed = new EmbedBuilder()
                            .setColor(0x747F8D)
                            .setTitle('❌ Activation Cancelled')
                            .setDescription('Passive Mode activation was cancelled. You remain vulnerable to robberies.');

                        await interaction.editReply({ embeds: [cancelEmbed], components: [] });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x747F8D)
                            .setTitle('⏰ Action Timed Out')
                            .setDescription('Passive Mode activation timed out. You remain vulnerable to robberies.');

                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
                });
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

                // Show confirmation warning first
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('⚠️ Enable Passive Mode?')
                    .setDescription(
                        'Passive Mode protects you from being robbed and challenged to brawls, but:\n\n' +
                        '🚫 **RESTRICTIONS:**\n' +
                        '- You cannot rob other players.\n' +
                        '- You cannot challenge others to brawls/battles.\n' +
                        '- If you disable it later, you must wait **24 hours** before you can enable it again.\n\n' +
                        'Are you sure you want to enable Passive Mode?'
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`passive_confirm_${userId}`)
                        .setLabel('Yes, Enable')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`passive_cancel_${userId}`)
                        .setLabel('No, Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

                const response = await message.reply({ embeds: [confirmEmbed], components: [row] });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === userId && i.customId.startsWith('passive_'),
                    componentType: ComponentType.Button,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.customId === `passive_confirm_${userId}`) {
                        baubleData = await Bauble.findOne({ userId });
                        if (!baubleData) {
                            baubleData = new Bauble({ userId });
                        }
                        baubleData.passiveMode = true;
                        baubleData.passiveModeToggledAt = new Date();
                        await baubleData.save();

                        const successEmbed = new EmbedBuilder()
                            .setColor(0x2ECC71)
                            .setTitle('🛡️ Passive Mode Enabled')
                            .setDescription('You have enabled Passive Mode! You are now completely safe from being robbed and challenged to battles.\n\n🚫 **Note:** You cannot rob other players or initiate battles while in Passive Mode.')
                            .setTimestamp();

                        await response.edit({ embeds: [successEmbed], components: [] });
                    } else {
                        const cancelEmbed = new EmbedBuilder()
                            .setColor(0x747F8D)
                            .setTitle('❌ Activation Cancelled')
                            .setDescription('Passive Mode activation was cancelled. You remain vulnerable to robberies.');

                        await response.edit({ embeds: [cancelEmbed], components: [] });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x747F8D)
                            .setTitle('⏰ Action Timed Out')
                            .setDescription('Passive Mode activation timed out. You remain vulnerable to robberies.');

                        await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
                });
            }

        } catch (error) {
            console.error('Error in passive prefix command:', error);
            await message.reply('❌ An error occurred while toggling Passive Mode.');
        }
    }
};
