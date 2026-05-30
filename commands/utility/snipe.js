/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'utility',
    cooldown: 3,
    aliases: ['s', 'snip'],
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Retrieve the last deleted message in this channel.'),

    async execute(interaction) {
        const client = interaction.client;
        const channelId = interaction.channelId;

        if (!client.snipes || !client.snipes.has(channelId)) {
            return interaction.reply({ content: '❌ There are no recently deleted messages in this channel.', ephemeral: true });
        }

        const sniped = client.snipes.get(channelId);

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0) // Primary aesthetic purple
            .setAuthor({
                name: sniped.author.tag,
                iconURL: sniped.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(sniped.content || '*[Message contained no text]*')
            .setTimestamp(sniped.timestamp)
            .setFooter({ text: 'Sniped' });

        if (sniped.attachment) {
            embed.setImage(sniped.attachment);
        }

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const client = message.client;
        const channelId = message.channel.id;

        if (!client.snipes || !client.snipes.has(channelId)) {
            return message.reply('❌ There are no recently deleted messages in this channel.').catch(() => {});
        }

        const sniped = client.snipes.get(channelId);

        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0) // Primary aesthetic purple
            .setAuthor({
                name: sniped.author.tag,
                iconURL: sniped.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(sniped.content || '*[Message contained no text]*')
            .setTimestamp(sniped.timestamp)
            .setFooter({ text: 'Sniped' });

        if (sniped.attachment) {
            embed.setImage(sniped.attachment);
        }

        await message.reply({ embeds: [embed] }).catch(() => {});
    }
};
