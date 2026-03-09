/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('[ADMIN ONLY] Add Glimmering Baubles to a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add Baubles to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to add.')
                .setRequired(true)),
    async execute(interaction) {
        // Replace 'YOUR_DISCORD_ID' with your actual Discord ID
        const adminId = "805007574193405952";

        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0 });
            }

            baubleData.baubles += amount;
            await baubleData.save();

            await interaction.reply({ content: `✅ Successfully added ${amount} Baubles to ${user.tag}. New balance: ${baubleData.baubles}`, ephemeral: true });

        } catch (error) {
            console.error('Error in add command:', error);
            await interaction.reply({ content: '❌ An error occurred while adding Baubles.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        // Replace 'YOUR_DISCORD_ID' with your actual Discord ID
        const adminId = "805007574193405952";

        if (message.author.id !== adminId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const user = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!user) {
            return message.reply('⚠️ Please mention a user to add Baubles to.');
        }

        if (isNaN(amount)) {
            return message.reply('⚠️ Please specify a valid amount to add.');
        }

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0 });
            }

            baubleData.baubles += amount;
            await baubleData.save();

            await message.reply(`✅ Successfully added ${amount} Baubles to ${user.tag}. New balance: ${baubleData.baubles}`);

        } catch (error) {
            console.error('Error in add command (prefix):', error);
            await message.reply('❌ An error occurred while adding Baubles.');
        }
    },
};