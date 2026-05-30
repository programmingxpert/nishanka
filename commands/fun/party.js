const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'fun',
    data: new SlashCommandBuilder()
        .setName('party')
        .setDescription('Get a random Truth, Would You Rather, or Never Have I Ever question!'),
    
    async execute(interaction) {
        await interaction.deferReply();
        await this.generateQuestion(interaction);
    },

    async executePrefix(message, args) {
        await this.generateQuestion(message);
    },

    async generateQuestion(context) {
        const reply = context.reply ? (msg) => context.editReply ? context.editReply(msg) : context.reply(msg) : (msg) => context.channel.send(msg);
        
        try {
            const types = [
                { name: 'Truth', url: 'https://api.truthordarebot.xyz/v1/truth', color: 0x3498db },
                { name: 'Would You Rather', url: 'https://api.truthordarebot.xyz/api/wyr', color: 0xe74c3c },
                { name: 'Never Have I Ever', url: 'https://api.truthordarebot.xyz/api/nhie', color: 0x9b59b6 }
            ];

            const selected = types[Math.floor(Math.random() * types.length)];
            
            const response = await fetch(selected.url);
            const data = await response.json();
            
            // The API usually returns the question in 'question' property
            const questionText = data.question || data.truth || "Could not parse question.";

            const embed = new EmbedBuilder()
                .setColor(selected.color)
                .setTitle(`🎉 ${selected.name}`)
                .setDescription(`**${questionText}**`)
                .setFooter({ text: 'Powered by truthordarebot.xyz' });

            await reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching party question:', error);
            await reply({ content: '❌ Failed to fetch a question. The API might be down!' });
        }
    }
};
