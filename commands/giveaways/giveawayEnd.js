/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Giveaway = require('../../models/Giveaway'); // Import the Giveaway model

module.exports = {
    category: 'giveaway',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('giveawayend')
        .setDescription('Ends a giveaway early.')
        .addStringOption(option =>
            option.setName('message-id')
                .setDescription('The ID of the giveaway message to end.')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.MANAGE_GUILD)) {
            return interaction.reply({ content: 'You need to have the manage server permissions to use this command!', ephemeral: true });
        }

        const messageId = interaction.options.getString('message-id');
        try {
            await endGiveaway(interaction, messageId);
        } catch (error) {
            console.error("An error occurred when ending giveaway", error);
            return interaction.reply({ content: `An error occurred when ending giveaway!`, ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MANAGE_GUILD)) {
            return message.reply('You need to have the manage server permissions to use this command!');
        }

        if (args.length !== 1) {
            return message.reply("Invalid giveaway end command. Use `-giveawayend <message-id>`");
        }

        const messageId = args[0];
        try {
            await endGiveaway({ message: message }, messageId);
        } catch (error) {
            console.error("An error occurred when ending giveaway", error);
            return message.reply(`An error occurred when ending giveaway!`);
        }
    }
};

async function endGiveaway(interaction, messageId) {
    try {
        const giveawayChannel = interaction.channel || interaction.message.channel; // Get channel from interaction or message
        const winnerMessage = await giveawayChannel.messages.fetch(messageId);

        if (!winnerMessage) {
            const replyContent = `Giveaway message with id ${messageId} wasn't found!`;
            if (interaction.replied) {
                return interaction.reply({ content: replyContent, ephemeral: true });
            } else if (interaction.message) {
                return interaction.message.reply(replyContent);
            } else {
                return giveawayChannel.send(replyContent);
            }
        }

        const giveaway = await Giveaway.findOne({ messageId: messageId });
        if (!giveaway) {
            const replyContent = `Giveaway message with id ${messageId} wasn't found in the database!`;
            if (interaction.replied) {
                return interaction.reply({ content: replyContent, ephemeral: true });
            } else if (interaction.message) {
                return interaction.message.reply(replyContent);
            } else {
                return giveawayChannel.send(replyContent);
            }
        }

        const reaction = winnerMessage.reactions.cache.get('🎉');
        if (!reaction) {
            const replyContent = `Reaction wasn't found on message: ${messageId}!`;
            if (interaction.replied) {
                return interaction.reply({ content: replyContent, ephemeral: true });
            } else if (interaction.message) {
                return interaction.message.reply(replyContent);
            } else {
                return giveawayChannel.send(replyContent);
            }
        }

        const users = await reaction.users.fetch();
        // Exclude the host from the list of potential winners
        const nonBotUsers = users.filter(user => !user.bot && user.id !== giveaway.hostId);

        if (nonBotUsers.size < 1) {
            const replyContent = `There are no users (excluding the host) who entered the giveaway!`;
            if (interaction.replied) {
                interaction.reply({ content: replyContent, ephemeral: true }); // Reply to command
            } else if (interaction.message) {
                interaction.message.reply(replyContent); // Reply to prefix command
            } else {
                giveawayChannel.send(replyContent);  // Fallback
            }

            // Update the giveaway in the database to mark it as ended
            giveaway.ended = true;
            await giveaway.save();

            // Optionally, edit the original giveaway message to indicate that no winner was found
            const noWinnerEmbed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setTitle('🎉 Giveaway Ended! 🎉')
                .setDescription(`Prize: **${giveaway.prize}**\nNo winner(s) - Not enough participants.`)
                .setTimestamp()
                .setFooter({ text: 'Giveaway ended' });

            try {
                await winnerMessage.edit({ embeds: [noWinnerEmbed] });  // Edit the message
            } catch (editError) {
                console.error("Error editing giveaway message:", editError);
                // It may fail due to permissions but we can ignore it
            }
            return;  // Crucial: Exit after handling the no-winner case
        }

        let winners = nonBotUsers.random(giveaway.winnerCount); // Get correct number of winners
        if (winners.length === 0) {
            return giveawayChannel.send("Not enough participants to determine a winner.");
        }
        const winnersMentions = winners.map(user => `<@${user.id}>`).join(', ');

        const endEmbed = new EmbedBuilder()
            .setColor(0x2f3136)
            .setTitle('🎉 Giveaway Ended! 🎉')
            .setDescription(`Prize: **${giveaway.prize}**\nWinner(s): ${winnersMentions}`) //Get the prize from database
            .setTimestamp()
            .setFooter({ text: 'Giveaway ended' });

        giveawayChannel.send({ embeds: [endEmbed] });

        giveaway.ended = true;
        await giveaway.save();

        const successReply = `Giveaway ended successfully!`;
        if (interaction.replied) {
            return interaction.reply({ content: successReply, ephemeral: true });
        } else if (interaction.message) {
            return interaction.message.reply(successReply);
        } else {
            return giveawayChannel.send(successReply);
        }

    } catch (error) {
        console.error("An error occurred when ending giveaway", error);

        const replyContent = `An error occurred when ending giveaway!`;
        if (interaction.replied) {
            return interaction.reply({ content: replyContent, ephemeral: true });
        } else if (interaction.message) {
            return interaction.message.reply(replyContent);
        } else {
            return giveawayChannel.send(replyContent);
        }
    }
}