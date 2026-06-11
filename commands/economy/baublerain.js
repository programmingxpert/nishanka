/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Bauble = require('../../models/baubleSchema');
const { getGlobalMultiplier } = require('../../utils/economyEngine');
const { triggerGlobalGenerosityAlert } = require('../../utils/generosity');

module.exports = {
    category: 'economy',
    cooldown: 14400, // 4-hour cooldown per user
    data: new SlashCommandBuilder()
        .setName('baublerain')
        .setDescription('Shower a massive rain of Glimmering Baubles in the channel for active players to grab!')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to rain (Minimum: 100,000)')
                .setMinValue(100000)
                .setRequired(true)),

    async execute(interaction) {
        try {
            const senderId = interaction.user.id;
            const amount = interaction.options.getInteger('amount');

            if (amount < 100000) {
                // Just in case slash option min_value validation fails
                return interaction.reply({ content: '❌ The minimum amount to start a Bauble Rain is **100,000** Baubles!', ephemeral: true });
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData || (senderData.baubles || 0) < amount) {
                return interaction.reply({ content: `❌ You do not have **${amount.toLocaleString()}** Baubles to start a Bauble Rain! Balance: **${(senderData?.baubles || 0).toLocaleString()}**`, ephemeral: true });
            }

            // Deduct wagers immediately
            senderData.baubles -= amount;
            await senderData.save();

            const rainId = `rain_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Split into 5 to 10 slices
            const claimsCount = Math.floor(Math.random() * 6) + 5;
            const slices = [];
            let remaining = amount;
            for (let i = 0; i < claimsCount - 1; i++) {
                const maxShare = Math.floor(remaining * 0.4);
                const minShare = Math.max(1, Math.floor(remaining * 0.05));
                const share = Math.floor(Math.random() * (maxShare - minShare + 1)) + minShare;
                slices.push(share);
                remaining -= share;
            }
            slices.push(remaining);

            const grabBtn = new ButtonBuilder()
                .setCustomId(`bauble_rain_grab_${rainId}`)
                .setLabel('Grab! 🪙')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(grabBtn);

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('🌧️ BAUBLE RAIN SUMMONED! 🌧️')
                .setDescription(`🌧️ **${interaction.user.username}** has showered **${amount.toLocaleString()}** Glimmering Baubles in the channel!\n\n*Click the button below quickly to grab your share of the cloud!*`)
                .addFields(
                    { name: '☁️ Cloud Size', value: `**${amount.toLocaleString()}** Baubles`, inline: true },
                    { name: '👥 Claims Available', value: `${claimsCount} slots`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Claims remaining: ${slices.length}` });

            const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            // Store active rain state in client memory
            const client = interaction.client;
            if (!client.activeBaubleRains) {
                client.activeBaubleRains = new Map();
            }

            const rainState = {
                senderId,
                totalAmount: amount,
                slices,
                claimedBy: new Set(),
                claims: [],
                message: reply,
                timeout: null
            };

            // Set up a 60-second expiration timeout
            rainState.timeout = setTimeout(async () => {
                try {
                    const activeRain = client.activeBaubleRains.get(rainId);
                    if (activeRain) {
                        client.activeBaubleRains.delete(rainId);

                        let refundSum = 0;
                        for (const slice of activeRain.slices) {
                            refundSum += slice;
                        }

                        if (refundSum > 0) {
                            const senderProfile = await Bauble.findOne({ userId: activeRain.senderId });
                            if (senderProfile) {
                                senderProfile.baubles += refundSum;
                                await senderProfile.save();
                            }
                        }

                        // Disable buttons
                        const disabledRow = new ActionRowBuilder().addComponents(
                            ButtonBuilder.from(grabBtn).setDisabled(true).setLabel('Expired / Ended')
                        );

                        const expiredEmbed = EmbedBuilder.from(embed)
                            .setColor(0x7F8C8D)
                            .setTitle('☁️ BAUBLE RAIN CLOUD DISSIPATED')
                            .setDescription(`The rain cloud has floated away. **${activeRain.claims.length}** players grabbed slices.\n\n` + 
                                (refundSum > 0 ? `💰 **${refundSum.toLocaleString()} Baubles** were unclaimed and refunded back to <@${activeRain.senderId}>.` : ''))
                            .setFooter({ text: 'Rain Shower Expired' });

                        if (activeRain.claims.length > 0) {
                            expiredEmbed.addFields({
                                name: '🎯 Grabbed Slices',
                                value: activeRain.claims.map(c => `<@${c.userId}> grabbed **${c.amount.toLocaleString()}** Baubles`).join('\n')
                            });
                        }

                        await activeRain.message.edit({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
                    }
                } catch (e) {
                    console.error('Error handling bauble rain timeout:', e);
                }
            }, 60000);

            client.activeBaubleRains.set(rainId, rainState);

            // Trigger status and global alerts
            triggerGlobalGenerosityAlert(client, interaction.user, null, amount, 'baublerain');

        } catch (error) {
            console.error('Error in baublerain command:', error);
            return interaction.reply({ content: '❌ An error occurred while starting the Bauble Rain.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const senderId = message.author.id;
            const amountArg = args[0];

            if (!amountArg) {
                return message.reply('⚠️ Please specify an amount to rain. Example: `-baublerain 100k` or `-baublerain 100000`');
            }

            const senderData = await Bauble.findOne({ userId: senderId });
            if (!senderData) {
                return message.reply("❌ You don't have an economy profile yet. Run `-bauble` first.");
            }

            const { parseAmount } = require('../../utils/economyEngine');
            const amount = parseAmount(amountArg, senderData.baubles || 0);

            if (isNaN(amount) || amount < 100000) {
                return message.reply('❌ The minimum amount to start a Bauble Rain is **100,000** Baubles! Use a valid number.');
            }

            if ((senderData.baubles || 0) < amount) {
                return message.reply(`❌ You do not have **${amount.toLocaleString()}** Baubles to start a Bauble Rain!`);
            }

            // Deduct wagers immediately
            senderData.baubles -= amount;
            await senderData.save();

            const rainId = `rain_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Split into 5 to 10 slices
            const claimsCount = Math.floor(Math.random() * 6) + 5;
            const slices = [];
            let remaining = amount;
            for (let i = 0; i < claimsCount - 1; i++) {
                const maxShare = Math.floor(remaining * 0.4);
                const minShare = Math.max(1, Math.floor(remaining * 0.05));
                const share = Math.floor(Math.random() * (maxShare - minShare + 1)) + minShare;
                slices.push(share);
                remaining -= share;
            }
            slices.push(remaining);

            const grabBtn = new ButtonBuilder()
                .setCustomId(`bauble_rain_grab_${rainId}`)
                .setLabel('Grab! 🪙')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(grabBtn);

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('🌧️ BAUBLE RAIN SUMMONED! 🌧️')
                .setDescription(`🌧️ **${message.author.username}** has showered **${amount.toLocaleString()}** Glimmering Baubles in the channel!\n\n*Click the button below quickly to grab your share of the cloud!*`)
                .addFields(
                    { name: '☁️ Cloud Size', value: `**${amount.toLocaleString()}** Baubles`, inline: true },
                    { name: '👥 Claims Available', value: `${claimsCount} slots`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Claims remaining: ${slices.length}` });

            const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

            const client = message.client;
            if (!client.activeBaubleRains) {
                client.activeBaubleRains = new Map();
            }

            const rainState = {
                senderId,
                totalAmount: amount,
                slices,
                claimedBy: new Set(),
                claims: [],
                message: sentMessage,
                timeout: null
            };

            // Set up a 60-second expiration timeout
            rainState.timeout = setTimeout(async () => {
                try {
                    const activeRain = client.activeBaubleRains.get(rainId);
                    if (activeRain) {
                        client.activeBaubleRains.delete(rainId);

                        let refundSum = 0;
                        for (const slice of activeRain.slices) {
                            refundSum += slice;
                        }

                        if (refundSum > 0) {
                            const senderProfile = await Bauble.findOne({ userId: activeRain.senderId });
                            if (senderProfile) {
                                senderProfile.baubles += refundSum;
                                await senderProfile.save();
                            }
                        }

                        // Disable buttons
                        const disabledRow = new ActionRowBuilder().addComponents(
                            ButtonBuilder.from(grabBtn).setDisabled(true).setLabel('Expired / Ended')
                        );

                        const expiredEmbed = EmbedBuilder.from(embed)
                            .setColor(0x7F8C8D)
                            .setTitle('☁️ BAUBLE RAIN CLOUD DISSIPATED')
                            .setDescription(`The rain cloud has floated away. **${activeRain.claims.length}** players grabbed slices.\n\n` + 
                                (refundSum > 0 ? `💰 **${refundSum.toLocaleString()} Baubles** were unclaimed and refunded back to <@${activeRain.senderId}>.` : ''))
                            .setFooter({ text: 'Rain Shower Expired' });

                        if (activeRain.claims.length > 0) {
                            expiredEmbed.addFields({
                                name: '🎯 Grabbed Slices',
                                value: activeRain.claims.map(c => `<@${c.userId}> grabbed **${c.amount.toLocaleString()}** Baubles`).join('\n')
                            });
                        }

                        await activeRain.message.edit({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
                    }
                } catch (e) {
                    console.error('Error handling bauble rain timeout (prefix):', e);
                }
            }, 60000);

            client.activeBaubleRains.set(rainId, rainState);

            // Trigger status and global alerts
            triggerGlobalGenerosityAlert(client, message.author, null, amount, 'baublerain');

        } catch (error) {
            console.error('Error in baublerain prefix command:', error);
            return message.reply('❌ An error occurred while starting the Bauble Rain.');
        }
    }
};
