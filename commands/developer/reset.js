/* eslint-disable */

const { SlashCommandBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const ADMIN_ID = '805007574193405952';

module.exports = {
    category: 'developer',
    devOnly: true,
    hidden: true,

    data: { name: 'reset' },

    async execute(interaction) {

        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true
            });
        }

        const targetInput =
            interaction.options.getString('target');

        const amount =
            interaction.options.getInteger('amount') ?? 0;

        // Extract ID from mention OR raw ID
        const userId =
            targetInput.replace(/[<@!>]/g, '');

        // Validate Discord snowflake format
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                content: '❌ Invalid user ID or mention.',
                ephemeral: true
            });
        }

        try {

            let baubleData =
                await Bauble.findOne({ userId });

            if (!baubleData) {
                baubleData = new Bauble({
                    userId,
                    baubles: 0
                });
            }

            baubleData.baubles = amount;

            await baubleData.save();

            let username = `Unknown User (${userId})`;

            try {
                const fetchedUser =
                    await interaction.client.users.fetch(userId);

                username = fetchedUser.tag;
            } catch (_) {
                // user not cached / not in server / doesn't matter
            }

            await interaction.reply({
                content:
                    `✅ Successfully set **${username}**'s Baubles to **${amount}**.`,
                ephemeral: true
            });

        } catch (error) {

            console.error(
                'Error in reset command:',
                error
            );

            await interaction.reply({
                content:
                    '❌ An error occurred while resetting Baubles.',
                ephemeral: true
            });
        }
    },

    async executePrefix(message, args) {

        if (message.author.id !== ADMIN_ID) {
            return message.reply(
                '❌ You are not authorized to use this command.'
            );
        }

        const targetArg = args[0];

        if (!targetArg) {
            return message.reply(
                '⚠️ Please provide a user ID or mention.'
            );
        }

        const userId =
            targetArg.replace(/[<@!>]/g, '');

        // Validate snowflake
        if (!/^\d{17,20}$/.test(userId)) {
            return message.reply(
                '❌ Invalid user ID or mention.'
            );
        }

        let amount = 0;

        if (args[1] !== undefined) {

            const { parseAmount } = require('../../utils/economyEngine');
            amount = parseAmount(args[1]);

            if (isNaN(amount) || amount < 0) {
                return message.reply(
                    '⚠️ Please provide a valid non-negative amount.'
                );
            }
        }

        try {

            let baubleData =
                await Bauble.findOne({ userId });

            if (!baubleData) {

                baubleData = new Bauble({
                    userId,
                    baubles: 0
                });
            }

            baubleData.baubles = amount;

            await baubleData.save();

            let username = `Unknown User (${userId})`;

            try {

                const fetchedUser =
                    await message.client.users.fetch(userId);

                username = fetchedUser.tag;

            } catch (_) {
                // ignore
            }

            await message.reply(
                `✅ Successfully set **${username}**'s Baubles to **${amount}**.`
            );

        } catch (error) {

            console.error(
                'Error in reset command (prefix):',
                error
            );

            await message.reply(
                '❌ An error occurred while resetting Baubles.'
            );
        }
    }
};