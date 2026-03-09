/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const targetEmoji = '✨'; // The emoji to react with
const reactionTime = 7000; // Time to react in milliseconds (7 seconds)
const minReward = 10;
const maxReward = 30;

module.exports = {
    category: 'economy',
    cooldown: 60, // 1-minute cooldown
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('React with the Glimmering emoji to grab some Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            // Check if user exists
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                 baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⏱️ Glimmering Grab!')
                .setDescription(`Be the first to react with ${targetEmoji} when the signal is given!`)
                .setFooter({ text: 'Get ready...' });

            await interaction.reply({ embeds: [embed] });

            // Wait a random amount of time before showing the reaction
            const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
            await new Promise(resolve => setTimeout(resolve, delay));

            const goEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚡ GO!')
                .setDescription(`React NOW with ${targetEmoji}!`)
                .setFooter({ text: 'React fast!' });

            const message = await interaction.editReply({ embeds: [goEmbed] });

            // Check if the bot has permission to add reactions
            const hasAddReactionsPermission = interaction.channel.permissionsFor(interaction.client.user).has(PermissionsBitField.Flags.AddReactions);

            if (!hasAddReactionsPermission) {
                console.warn('Bot does not have ADD_REACTIONS permission in this channel.');
                return interaction.channel.send("❌ I don't have permission to add reactions in this channel. Please give me the 'Add Reactions' permission.");
            }

            message.react(targetEmoji).catch(error => {
                console.error('Failed to react to message:', error);
                interaction.channel.send("❌ Failed to react with the emoji. Make sure I have the necessary permissions.");
            });

            // Create reaction collector
            const collector = message.createReactionCollector({
                filter: (reaction, user) => reaction.emoji.name === targetEmoji && user.id !== interaction.client.user.id,
                time: reactionTime,
                max: 1,
            });

            collector.on('collect', async (reaction, user) => {
                const winnerId = user.id;

                const earnings = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

                baubleData = await Bauble.findOne({ userId: winnerId });

                if (!baubleData) {
                     baubleData = new Bauble({ userId: winnerId, baubles: 0 });
                    await baubleData.save();
                }

                baubleData.baubles += earnings;
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle('🎉 You Grabbed It!')
                    .setDescription(`<@${winnerId}> reacted first and grabbed **${earnings}** Glimmering Baubles!`)
                    .addFields({ name: 'New Balance', value: `${baubleData.baubles} Baubles`, inline: true })
                    .setTimestamp();

                await interaction.editReply({ embeds: [winEmbed] });
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const loseEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🙁 No One Grabbed It!')
                        .setDescription(`Nobody reacted in time! Better luck next time.`)
                        .setFooter({ text: 'Too slow!' });

                    await interaction.editReply({ embeds: [loseEmbed] });
                }
            });

        } catch (error) {
            console.error('Error in grab command:', error);
            await interaction.reply({ content: '❌ An error occurred while grabbing.', ephemeral: true });
        }
    },
    async executePrefix(message) {
        return message.reply('❌ This command is only available as a slash command.');
    },
};