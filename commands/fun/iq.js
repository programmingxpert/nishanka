/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('iq')
        .setDescription('Checks the "IQ" of a user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to IQ test (optional)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const score = Math.floor(Math.random() * 251);
        const { embed } = this.getIQData(targetUser, score);

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        const score = Math.floor(Math.random() * 251);
        const { embed } = this.getIQData(targetUser, score);

        await message.reply({ embeds: [embed] });
    },

    getIQData(user, score) {
        let title = '';
        let color = 0x000000;

        if (score >= 200) {
            title = '🧠 **Cosmic Intelligence**\nYou are literally the main character of the universe.';
            color = 0xFFD700; // Gold
        } else if (score >= 150) {
            title = '✨ **Galaxy Brain**\nYou are seeing things we cannot even perceive.';
            color = 0x00FF00; // Green
        } else if (score >= 110) {
            title = '🚀 **High Potential**\nThe smartest kid on the block. Keep it up!';
            color = 0x3498DB; // Blue
        } else if (score >= 80) {
            title = '😐 **Average Human**\nJust enough brain cells to survive the day.';
            color = 0xFFFF00; // Yellow
        } else if (score >= 40) {
            title = '😬 **Under Maintenance**\nAre you sure those brain cells are firing?';
            color = 0xE67E22; // Orange
        } else {
            title = '💀 **Room Temperature IQ**\nPlain Toast Energy. Zero impact on the timeline.';
            color = 0xFF0000; // Red
        }

        const embed = new EmbedBuilder()
            .setTitle('🧠 IQ Test')
            .setColor(color)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(`IQ Test for **${user.username}**:\n\n**Score:** \`${score}\`\n**Result:** ${title}`)
            .setFooter({ text: 'Nishanka ©️' })
            .setTimestamp();

        return { embed };
    }
};
