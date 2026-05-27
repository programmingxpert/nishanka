/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Fetches a random dank meme from Reddit!'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const res = await fetch('https://meme-api.com/gimme');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle(data.title || 'Random Meme')
                .setURL(data.postLink)
                .setImage(data.url)
                .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit} | Nishanka ©️` });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Meme API error:', error);
            await interaction.editReply('❌ Failed to fetch a meme. Please try again later.');
        }
    },

    async executePrefix(message, args) {
        const msg = await message.reply('🔍 Fetching a fresh meme for you...');
        try {
            const res = await fetch('https://meme-api.com/gimme');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle(data.title || 'Random Meme')
                .setURL(data.postLink)
                .setImage(data.url)
                .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit} | Nishanka ©️` });

            await msg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Meme API error:', error);
            await msg.edit('❌ Failed to fetch a meme. Please try again later.');
        }
    }
};
