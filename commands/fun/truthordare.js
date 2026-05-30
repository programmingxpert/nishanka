const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    category: 'fun',
    aliases: ['tod', 'party', 'nhie', 'wyr'],
    data: new SlashCommandBuilder()
        .setName('truthordare')
        .setDescription('Get a random Truth, Would You Rather, or Never Have I Ever question!'),
    
    async execute(interaction) {
        await interaction.deferReply();
        await this.startQuestionLoop(interaction, interaction.user.id, true);
    },

    async executePrefix(message, args) {
        await this.startQuestionLoop(message, message.author.id, false);
    },

    async fetchQuestionEmbed() {
        try {
            const types = [
                { name: 'Truth', url: 'https://api.truthordarebot.xyz/v1/truth', color: 0x3498db },
                { name: 'Would You Rather', url: 'https://api.truthordarebot.xyz/api/wyr', color: 0xe74c3c },
                { name: 'Never Have I Ever', url: 'https://api.truthordarebot.xyz/api/nhie', color: 0x9b59b6 }
            ];

            const selected = types[Math.floor(Math.random() * types.length)];
            
            const response = await fetch(selected.url);
            const data = await response.json();
            
            const questionText = data.question || data.truth || "Could not parse question.";

            return new EmbedBuilder()
                .setColor(selected.color)
                .setTitle(`🎉 ${selected.name}`)
                .setDescription(`**${questionText}**`)
                .setFooter({ text: 'Powered by truthordarebot.xyz' });
        } catch (error) {
            console.error('Error fetching question:', error);
            return new EmbedBuilder().setColor(0xff0000).setDescription('❌ Failed to fetch a question. The API might be down!');
        }
    },

    async startQuestionLoop(context, userId, isSlash) {
        const embed = await this.fetchQuestionEmbed();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tod_next')
                .setLabel('Next Question')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        let msg;
        if (isSlash) {
            msg = await context.editReply({ embeds: [embed], components: [row] });
        } else {
            msg = await context.reply({ embeds: [embed], components: [row] });
        }

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'tod_next') {
                await i.deferUpdate();
                const newEmbed = await this.fetchQuestionEmbed();
                await i.editReply({ embeds: [newEmbed], components: [row] });
                collector.resetTimer();
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tod_next_disabled')
                    .setLabel('Next Question')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
                    .setDisabled(true)
            );
            if (isSlash) {
                context.editReply({ components: [disabledRow] }).catch(() => {});
            } else {
                msg.edit({ components: [disabledRow] }).catch(() => {});
            }
        });
    }
};
