// commands/economy/battle.js
/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Challenge another user to a battle for Glimmering Baubles!')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The user you want to battle.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('wager')
                .setDescription('The amount of Baubles you want to wager.')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await handleBattle(interaction);  // Call the common handler
        } catch (error) {
            console.error("Error in execute (slash command):", error);
            await interaction.reply({ content: "An error occurred while processing your command.", ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            // Simulate an interaction object for prefix commands
            const interaction = {
                user: message.author,
                guild: message.guild,
                channel: message.channel,
                reply: (content) => message.channel.send(content),  // Use message.channel.send
                options: {
                    getUser: (name) => {
                        // Example usage: !battle @user 100
                        const userMention = args[0];  // Expect the first argument to be the user mention
                        if (!userMention) return null;

                        const userId = userMention.replace(/[<@!>]/g, ''); // Extract User ID from mention
                        try {
                            return message.guild.members.cache.get(userId)?.user || null;
                        } catch (error) {
                            console.error("Error getting user from mention:", error);
                            return null;
                        }
                    },
                    getInteger: (name) => {
                        const wagerArg = args[1];  // Expect the second argument to be the wager
                        if (!wagerArg) return null;
                        const wager = parseInt(wagerArg, 10); // Convert to integer
                        return isNaN(wager) ? null : wager;  // Check if valid number

                    },
                },
            };

            await handleBattle(interaction);  // Call the common handler
        } catch (error) {
            console.error("Error in executePrefix:", error);
            await message.reply("An error occurred while processing your command.");
        }
    },
};

async function handleBattle(interaction) {
    try {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');
        const wager = interaction.options.getInteger('wager');

        // --- Input Validation ---
        if (!opponent || !wager) {
            return interaction.reply({ content: "Invalid arguments. Use: `/battle @user wager` (Slash Command) or `!battle @user wager` (Prefix Command)", ephemeral: true });
        }

        if (challenger.id === opponent.id) {
            return interaction.reply({ content: "You can't battle yourself!", ephemeral: true });
        }

        if (opponent.bot) {
            return interaction.reply({ content: "You can't battle a bot!", ephemeral: true });
        }

        if (wager <= 0) {
            return interaction.reply({ content: "The wager must be a positive number.", ephemeral: true });
        }

        // --- Database Checks ---
        let challengerBaubleData;
        let opponentBaubleData;

        try {
            challengerBaubleData = await Bauble.findOne({ userId: challenger.id });

            if (!challengerBaubleData) {
                return interaction.reply({content: "You don't have any baubles! Use /bauble."});
            }

            opponentBaubleData = await Bauble.findOne({ userId: opponent.id });

            if (!opponentBaubleData) {
                return interaction.reply({content: "They don't have any baubles! Use /bauble."});
            }


            if (challengerBaubleData.baubles < wager) {
                return interaction.reply({ content: "You don't have enough Baubles to wager that much!", ephemeral: true });
            }

            if (opponentBaubleData.baubles < wager) {
                return interaction.reply({ content: `${opponent.username} doesn't have enough Baubles to accept that wager!`, ephemeral: true });
            }

        } catch (error) {
            console.error('Error fetching Bauble data:', error);
            return interaction.reply({ content: '❌ An error occurred while checking balances.', ephemeral: true });
        }

        // --- Confirmation from Opponent ---
        const acceptButton = new ButtonBuilder()
            .setCustomId('accept')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId('decline')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger);

        const confirmationRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚔️ Quick Math Battle Challenge!')
            .setDescription(`${opponent}, ${challenger} has challenged you to a Quick Math battle for **${wager}** Glimmering Baubles! Do you accept?`);

        const confirmationReply = await interaction.reply({
            content: `${opponent}`,
            embeds: [confirmationEmbed],
            components: [confirmationRow],
        });

        const confirmationMessageId = confirmationReply.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === opponent.id && (i.customId === 'accept' || i.customId === 'decline') && i.message.id === confirmationMessageId,
            time: 30000, // 30 seconds to respond
        });

        collector.on('collect', async i => {
            try {
                if (i.customId === 'accept') {
                    collector.stop('accepted'); // Stop the collector

                    // --- Generate the Math Problem ---
                    const num1 = Math.floor(Math.random() * 10) + 1; // Numbers up to 10 (easier)
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    const operator = ['+', '-'][Math.floor(Math.random() * 2)]; // Only + or - (easier)
                    let answer;

                    switch (operator) {
                        case '+':
                            answer = num1 + num2;
                            break;
                        case '-':
                            answer = num1 - num2;
                            break;
                    }

                    const problem = `${num1} ${operator} ${num2}`;
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('Solve this Quick Math Problem!')
                        .setDescription(`What is ${problem}?`);

                    await i.update({ content: `${challenger} vs ${opponent}: Solve the problem!`, embeds: [embed], components: [] });

                    // --- Collect Answers ---
                    const filter = m => (m.author.id === challenger.id || m.author.id === opponent.id);
                    const answerCollector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 }); //15 second response time

                    answerCollector.on('collect', async m => {
                        if (m.author.id !== challenger.id && m.author.id !== opponent.id) return;
                        const userAnswer = parseInt(m.content, 10);

                        if (isNaN(userAnswer)) {
                            return interaction.channel.send("Please enter a valid number.");
                        }

                        if (userAnswer === answer) {
                            //Correct Answer!
                            const winner = m.author;
                            const loser = winner === challenger ? opponent : challenger;

                            // Update Bauble balances
                            if (winner === challenger) {
                                challengerBaubleData.baubles += wager;
                                opponentBaubleData.baubles -= wager;
                            } else {
                                challengerBaubleData.baubles -= wager;
                                opponentBaubleData.baubles += wager;
                            }

                             try {
                                    await challengerBaubleData.save();
                                    await opponentBaubleData.save();
                                } catch (dbError) {
                                    console.error("Error saving Bauble data:", dbError);
                                    return interaction.channel.send("❌ Database error occurred. Baubles may not have been transferred.");
                                }

                            const winEmbed = new EmbedBuilder()
                                .setColor(0xFFA500)
                                .setTitle('🎉 Quick Math - Correct! 🎉')
                                .setDescription(`${winner} answered correctly and wins ${wager} Glimmering Baubles!`)
                                .addFields(
                                    { name: `${challenger.username}'s New Balance`, value: `${challengerBaubleData.baubles}`, inline: true },
                                    { name: `${opponent.username}'s New Balance`, value: `${opponentBaubleData.baubles}`, inline: true }
                                );

                            await interaction.channel.send({ embeds: [winEmbed] });

                            answerCollector.stop();
                        } else {
                            await interaction.channel.send(`${m.author}, that's incorrect!`);
                            answerCollector.stop();
                        }
                    });

                    answerCollector.on('end', (collected, reason) => {
                        if (reason === 'time') {
                            interaction.channel.send("No one answered in time!");
                        }
                    });

                } else if (i.customId === 'decline') {
                    collector.stop('declined');
                    await i.update({ content: `${opponent} has declined the battle.`, embeds: [], components: [] }); // Update the confirmation message
                }
            } catch (error) {
                console.error("Error in collector collect event:", error);
                await i.reply({ content: "An error occurred while processing your interaction.", ephemeral: true });
            }
        });

        collector.on('end', async (collected, reason) => {
            try {
                if (reason === 'time') {
                    await interaction.editReply({ content: `${opponent} didn't respond in time.`, embeds: [], components: [] });
                } else if (reason === 'accepted' || reason === 'declined'){
                    // Do nothing since it has already been handled.
                } else {
                    console.log(`Collector ended with reason: ${reason}`); // Log the reason
                }
            } catch (error) {
                console.error("Error in collector end event:", error);
            }
        });
    } catch (error) {
        console.error("Error in handleBattle:", error);
        await interaction.reply({ content: "An error occurred during the battle.", ephemeral: true });
    }
}