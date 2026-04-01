/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('vibecheck')
        .setDescription('Checks the vibe of a user!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to vibe check (optional)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const score = Math.floor(Math.random() * 101);
        const { embed, status } = this.getVibeData(targetUser, score);

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        const score = Math.floor(Math.random() * 101);
        const { embed } = this.getVibeData(targetUser, score);

        await message.reply({ embeds: [embed] });
    },

    getVibeData(user, score) {
        let status = '';
        let color = 0x000000;

        if (score >= 90) {
            status = '🔥 **ABSOLUTE CINEMA!**\nYou are the final boss of vibes. Everyone is watching.';
            color = 0xFFD700; // Gold
        } else if (score >= 70) {
            status = '✨ **Certified Vibe Master**\nRadiating pure confidence and positive energy.';
            color = 0x00FF00; // Green
        } else if (score >= 50) {
            status = '😌 **Main Character Energy**\nLooking fresh and feeling good. A solid connection!';
            color = 0x3498DB; // Blue
        } else if (score >= 30) {
            status = '😐 **Default Settings**\nBalanced, as all things should be. Safe and sound.';
            color = 0xFFFF00; // Yellow
        } else if (score >= 10) {
            status = '😬 **Sus at 3 AM**\nLow-key giving side-eye energy. Something is up...';
            color = 0xE67E22; // Orange
        } else {
            status = '💀 **NPC Vibes**\nThe definition of plain toast. Zero impact on the timeline.';
            color = 0xFF0000; // Red
        }

        const embed = new EmbedBuilder()
            .setTitle('🔍 Vibe Check')
            .setColor(color)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Vibe Check for **${user.username}**:\n\n**Score:** \`${score}%\`\n**Status:** ${status}`)
            .setFooter({ text: 'Nishanka ©️' })
            .setTimestamp();

        return { embed, status };
    }
};
