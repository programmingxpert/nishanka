/* eslint-disable */
const { SlashCommandBuilder } = require('discord.js');
const useCommand = require('../economy/use');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('open')
        .setDescription('Open a box or container from your inventory (Alias for /use).')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the box or item to open (e.g. mystery_box)')
                .setRequired(true)
                .addChoices(
                    { name: 'Mystery Box', value: 'mystery_box' }
                )),

    async execute(interaction) {
        return useCommand.execute(interaction);
    },

    async executePrefix(message, args) {
        return useCommand.executePrefix(message, args);
    }
};
