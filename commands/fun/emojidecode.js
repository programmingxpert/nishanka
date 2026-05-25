/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

const QUESTIONS = [
    { emojis: '🦁👑', answers: ['the lion king', 'lion king'], category: 'Movie' },
    { emojis: '🕸️👨', answers: ['spider man', 'spiderman', 'spider-man'], category: 'Movie/Hero' },
    { emojis: '❄️☃️🏰', answers: ['frozen'], category: 'Movie' },
    { emojis: '🦇👨', answers: ['batman', 'bat man'], category: 'Movie/Hero' },
    { emojis: '🤡🎈', answers: ['it'], category: 'Movie' },
    { emojis: '🚀🌌⚔️', answers: ['star wars'], category: 'Movie Franchise' },
    { emojis: '🚢🧊🥶', answers: ['titanic'], category: 'Movie' },
    { emojis: '🦖🏝️🦕', answers: ['jurassic park'], category: 'Movie' },
    { emojis: '⚡👓🧹', answers: ['harry potter'], category: 'Movie/Book Franchise' },
    { emojis: '🐜👨', answers: ['ant man', 'antman', 'ant-man'], category: 'Movie/Hero' },
    { emojis: '🍫🏭🧔', answers: ['charlie and the chocolate factory', 'willy wonka'], category: 'Movie' },
    { emojis: '🐢🥋🐀', answers: ['teenage mutant ninja turtles', 'tmnt'], category: 'Movie/Show' },
    { emojis: '👽📞👉👈🏠', answers: ['et', 'e.t.', 'e.t. the extra-terrestrial'], category: 'Movie' },
    { emojis: '🧸🤠🤠', answers: ['toy story'], category: 'Movie' },
    { emojis: '🏠🎈🎈', answers: ['up'], category: 'Movie' },
    { emojis: '👑 Kong', answers: ['king kong'], category: 'Movie' },
    { emojis: '👻🚫🔫', answers: ['ghostbusters', 'ghost busters'], category: 'Movie' },
    { emojis: '👹👹👹🏢', answers: ['monsters inc', 'monsters inc.', 'monsters incorporated'], category: 'Movie' },
    { emojis: '🦈🌊🏊', answers: ['jaws'], category: 'Movie' },
    { emojis: '🐼🥋👊', answers: ['kung fu panda', 'kungfu panda'], category: 'Movie' }
];

const activeGames = new Set();

module.exports = {
    category: 'fun',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('emojidecode')
        .setDescription('Decode the emojis to guess the title and win Baubles!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '⚠️ An Emoji Decode game is already running in this channel!', ephemeral: true });
        }

        activeGames.add(channelId);
        const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const reward = Math.floor(Math.random() * 1001) + 500; // 500-1500 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🧩 EMOJI DECODE')
            .setDescription(`Decode the emojis below to guess the title!\n\n# **${question.emojis}**\n\n**Category:** ${question.category}\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type your answer in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await interaction.reply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            const guess = m.content.trim().toLowerCase();
            return question.answers.includes(guess);
        };

        const collector = interaction.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT ANSWER!')
                    .setDescription(`Congratulations to **${m.author.username}** for decoding the emojis!\n\n• **Emojis:** ${question.emojis}\n• **Answer:** **${question.answers[0].toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to decode the emojis in time!\n\n• **Emojis:** ${question.emojis}\n• **Answer was:** **${question.answers[0].toUpperCase()}**`)
                    .setTimestamp();

                await interaction.followUp({ embeds: [timeoutEmbed] });
            }
        });
    },

    async executePrefix(message, args) {
        const channelId = message.channel.id;
        if (activeGames.has(channelId)) {
            return message.reply('⚠️ An Emoji Decode game is already running in this channel!');
        }

        activeGames.add(channelId);
        const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const reward = Math.floor(Math.random() * 1001) + 500; // 500-1500 Baubles

        const gameEmbed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle('🧩 EMOJI DECODE')
            .setDescription(`Decode the emojis below to guess the title!\n\n# **${question.emojis}**\n\n**Category:** ${question.category}\n**Reward:** **${reward.toLocaleString()} Baubles**\n\n*Type your answer in this channel! You have 45 seconds.*`)
            .setFooter({ text: 'First correct guess wins!' })
            .setTimestamp();

        await message.reply({ embeds: [gameEmbed] });

        const filter = m => {
            if (m.author.bot) return false;
            const guess = m.content.trim().toLowerCase();
            return question.answers.includes(guess);
        };

        const collector = message.channel.createMessageCollector({
            filter,
            max: 1,
            time: 45_000
        });

        collector.on('collect', async m => {
            // Reward the winner
            try {
                let baubleData = await Bauble.findOne({ userId: m.author.id });
                if (!baubleData) {
                    baubleData = new Bauble({ userId: m.author.id, baubles: 0 });
                }
                baubleData.baubles += reward;
                await baubleData.save();

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🎉 CORRECT ANSWER!')
                    .setDescription(`Congratulations to **${m.author.username}** for decoding the emojis!\n\n• **Emojis:** ${question.emojis}\n• **Answer:** **${question.answers[0].toUpperCase()}**\n• **Reward:** **${reward.toLocaleString()} Baubles**`)
                    .setThumbnail(m.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await m.reply({ embeds: [winEmbed] });
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async (collected) => {
            activeGames.delete(channelId);
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ TIME\'S UP!')
                    .setDescription(`Nobody was able to decode the emojis in time!\n\n• **Emojis:** ${question.emojis}\n• **Answer was:** **${question.answers[0].toUpperCase()}**`)
                    .setTimestamp();

                await message.reply({ embeds: [timeoutEmbed] });
            }
        });
    }
};
