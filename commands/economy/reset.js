/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('[ADMIN ONLY] Reset a user\'s Glimmering Baubles to 0 (or set to a specific amount).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset Baubles for.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Baubles to set after reset (defaults to 0).')
                .setRequired(false)
                .setMinValue(0)),
    async execute(interaction) {
        // Replace 'YOUR_DISCORD_ID' with your actual Discord ID
        const adminId = "805007574193405952";

        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount') ?? 0;

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0 });
            }

            baubleData.baubles = amount;
            await baubleData.save();

            await interaction.reply({ content: `✅ Successfully reset ${user.tag}'s Baubles to ${amount}.`, ephemeral: true });

        } catch (error) {
            console.error('Error in reset command:', error);
            await interaction.reply({ content: '❌ An error occurred while resetting Baubles.', ephemeral: true });
        }
    },
    async executePrefix(message, args) {
        // Replace 'YOUR_DISCORD_ID' with your actual Discord ID
        const adminId = "805007574193405952";

        if (message.author.id !== adminId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('⚠️ Please mention a user to reset Baubles for.');
        }

        let amount = 0;
        if (args[1] !== undefined) {
            amount = parseInt(args[1]);
            if (isNaN(amount) || amount < 0) {
                return message.reply('⚠️ Please specify a valid non-negative amount to set after reset.');
            }
        }

        try {
            let baubleData = await Bauble.findOne({ userId: user.id });

            if (!baubleData) {
                baubleData = new Bauble({ userId: user.id, baubles: 0 });
            }

            baubleData.baubles = amount;
            await baubleData.save();

            await message.reply(`✅ Successfully reset ${user.tag}'s Baubles to ${amount}.`);

        } catch (error) {
            console.error('Error in reset command (prefix):', error);
            await message.reply('❌ An error occurred while resetting Baubles.');
        }
    },
};
