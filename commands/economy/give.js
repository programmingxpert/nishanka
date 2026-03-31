/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give Glimmering Baubles to another user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give Baubles to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to give.')
                .setRequired(true)
                .setMinValue(1)), // Ensure amount is at least 1

    async execute(interaction) {
        try {
            const giverId = interaction.user.id;
            const receiverId = interaction.options.getUser('user').id;
            const amount = interaction.options.getInteger('amount');
            // REMOVE const guildId = interaction.guild.id; // Get the guild ID

            // Check if the Giver account exists and the send welcome message
            let giverBaubleData = await Bauble.findOne({ userId: giverId});

            if (!giverBaubleData) {
                return interaction.reply({content: "You don't have any baubles! Use /bauble."});
            }

            if (giverId === receiverId) {
                return interaction.reply({ content: '❌ You cannot give Baubles to yourself!', ephemeral: true });
            }

            if (giverBaubleData.baubles < amount) {
                return interaction.reply({ content: `❌ You do not have enough Baubles! You only have ${giverBaubleData.baubles}.`, ephemeral: true });
            }

            // Check if the Reciever account exists and the send welcome message
            let receiverBaubleData = await Bauble.findOne({ userId: receiverId});

            if (!receiverBaubleData) {
                receiverBaubleData = new Bauble({ userId: receiverId, baubles: 0 });
                await receiverBaubleData.save();
            }

            // Perform the transfer
            giverBaubleData.baubles -= amount;
            receiverBaubleData.baubles += amount;

            await giverBaubleData.save();
            await receiverBaubleData.save();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00) // Green color
                .setTitle('🎁 Bauble Transfer')
                .setDescription(`Successfully gave **${amount}** Glimmering Baubles to <@${receiverId}>!`)
                .addFields(
                    { name: 'Your New Balance', value: `${giverBaubleData.baubles} Baubles`, inline: true },
                    { name: 'Their New Balance', value: `${receiverBaubleData.baubles} Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Transaction by ${interaction.user.tag}`, iconURL: interaction.member?.displayAvatarURL({ dynamic: true }) || interaction.user.displayAvatarURL({ dynamic: true }) });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in give command:', error);
            await interaction.reply({ content: '❌ An error occurred while giving Baubles.', ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        try {
            const giverId = message.author.id;
            const receiver = message.mentions.users.first();
            const amount = parseInt(args[1]);
            // REMOVE const guildId = message.guild.id;  // Get the guild ID

            if (!receiver) {
                return message.reply('⚠️ Please mention a user to give Baubles to.');
            }

            const receiverId = receiver.id;

            // Check if the Giver account exists and the send welcome message
            let giverBaubleData = await Bauble.findOne({ userId: giverId});

            if (!giverBaubleData) {
                return message.reply({content: "You don't have any baubles! Use /bauble."});
            }

            if (giverId === receiverId) {
                return message.reply('❌ You cannot give Baubles to yourself!');
            }

            if (isNaN(amount) || amount <= 0) {
                return message.reply('⚠️ Please specify a valid amount to give (must be a number greater than 0).');
            }

            if (giverBaubleData.baubles < amount) {
                return message.reply(`❌ You do not have enough Baubles! You only have ${giverBaubleData.baubles}.`);
            }

            // Check if the Reciever account exists and the send welcome message
            let receiverBaubleData = await Bauble.findOne({ userId: receiverId});

            if (!receiverBaubleData) {
                receiverBaubleData = new Bauble({ userId: receiverId, baubles: 0 });
                await receiverBaubleData.save();
            }

            // Perform the transfer
            giverBaubleData.baubles -= amount;
            receiverBaubleData.baubles += amount;

            await giverBaubleData.save();
            await receiverBaubleData.save();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎁 Bauble Transfer')
                .setDescription(`Successfully gave **${amount}** Glimmering Baubles to <@${receiverId}>!`)
                .addFields(
                    { name: 'Your New Balance', value: `${giverBaubleData.baubles} Baubles`, inline: true },
                    { name: 'Their New Balance', value: `${receiverBaubleData.baubles} Baubles`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Transaction by ${message.author.tag}`, iconURL: message.member?.displayAvatarURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }) });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in give command (prefix):', error);
            await message.reply({ content: '❌ An error occurred while giving Baubles.' });
        }
    },
};