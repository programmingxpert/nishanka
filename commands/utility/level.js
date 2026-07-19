const { SlashCommandBuilder } = require('discord.js');
const { showRankEmbed } = require('./rank');

module.exports = {
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your current level, XP, and rank in this server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose rank you want to check')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        await showRankEmbed(interaction, target);
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null)
            || message.author;
        
        await showRankEmbed(message, target, true);
    }
};
