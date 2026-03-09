/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Displays the avatar of a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to display the avatar of.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 }); // Largest size available

        const embed = new EmbedBuilder()
            .setColor(0x3498db) // A nice blue color
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatarURL)
            .setDescription(`[Avatar URL](${avatarURL})`) // Provide a direct link to the avatar
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        let user;

        if (args.length > 0) {
            const userId = args[0].replace(/[<@!>]/g, ''); // Extract user ID from mention
            user = message.client.users.cache.get(userId) || message.mentions.users.first();

            if (!user) {
                return message.reply('❌ User not found.');
            }
        } else {
            user = message.author;
        }

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 }); // Largest size available

        const embed = new EmbedBuilder()
            .setColor(0x3498db) // A nice blue color
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatarURL)
            .setDescription(`[Avatar URL](${avatarURL})`) // Provide a direct link to the avatar
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};