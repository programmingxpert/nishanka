/* eslint-disable */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bauble = require('../../models/baubleSchema');

function generateProblem() {
    const num1 = Math.floor(Math.random() * 12) + 1;
    const num2 = Math.floor(Math.random() * 12) + 1;
    const op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    let answer;

    switch (op) {
        case '+': answer = num1 + num2; break;
        case '-': answer = num1 - num2; break;
        case '×': answer = num1 * num2; break;
    }

    return { question: `What is ${num1} ${op} ${num2}?`, answer };
}

module.exports = {
    category: 'economy',
    cooldown: 3600,
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work a random job to earn Glimmering Baubles!'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFC0CB)
                    .setTitle('🎀 Welcome to the Glimmering Workforce!')
                    .setDescription(`<@${userId}> you're now part of the Bauble grind 💼✨\nUse \`/bauble\` to check your balance.\nLet’s get working!`)
                    .setFooter({ text: 'Baubleverse HR Dept.', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                await interaction.reply({ embeds: [welcomeEmbed] });

                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return;
            }

            const { question, answer } = generateProblem();

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🛠️ Work Assignment')
                .setDescription(`<@${userId}>, your task:\n\n**${question}**\n\nType your answer below! You have **15 seconds**.`)
                .setFooter({ text: 'Think fast and type your answer!' });

            await interaction.reply({ embeds: [embed], fetchReply: true });

            const messageCollector = interaction.channel.createMessageCollector({
                filter: m => m.author.id === userId,
                time: 15000,
                max: 1
            });

            messageCollector.on('collect', async msg => {
                const userAnswer = parseInt(msg.content);

                if (userAnswer === answer) {
                    const earnings = Math.floor(Math.random() * 40) + 20;
                    baubleData = await Bauble.findOne({ userId });
                    baubleData.baubles += earnings;
                    await baubleData.save();

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Task Complete!')
                        .setDescription(`Correct! You earned **${earnings}** Glimmering Baubles.`)
                        .addFields({ name: '💰 New Balance', value: `${baubleData.baubles} Baubles`, inline: true })
                        .setTimestamp()
                        .setFooter({ text: 'Hard work pays off 💼' });

                    await interaction.followUp({ embeds: [successEmbed] });
                } else {
                    const failEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Wrong Answer')
                        .setDescription(`Oops! The correct answer was **${answer}**.\nBetter luck next time!`)
                        .setFooter({ text: 'No Baubles earned.' });

                    await interaction.followUp({ embeds: [failEmbed] });
                }
            });

            messageCollector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('⏰ Time’s Up!')
                        .setDescription(`<@${userId}> you didn’t answer in time. No Baubles this round!`)
                        .setFooter({ text: 'Work fast or lose out!' });

                    interaction.followUp({ embeds: [timeoutEmbed] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Error in slash work command:', error);
            await interaction.reply({ content: '❌ Something broke while working.', ephemeral: true });
        }
    },

    async executePrefix(message) {
        try {
            const userId = message.author.id;
            let baubleData = await Bauble.findOne({ userId });

            if (!baubleData) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFC0CB)
                    .setTitle('🎀 Welcome to the Glimmering Workforce!')
                    .setDescription(`<@${userId}>, you’ve joined the hustle 💼\nUse \`/bauble\` to check your balance.`)
                    .setFooter({ text: 'Baubleverse HR Dept.', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

                await message.channel.send({ embeds: [welcomeEmbed] });

                baubleData = new Bauble({ userId, baubles: 0 });
                await baubleData.save();
                return;
            }

            const { question, answer } = generateProblem();

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🛠️ Work Assignment')
                .setDescription(`<@${userId}>, your task:\n\n**${question}**\n\nType your answer below! You have **15 seconds**.`)
                .setFooter({ text: 'Answer fast to earn!' });

            await message.channel.send({ embeds: [embed] });

            const collector = message.channel.createMessageCollector({
                filter: m => m.author.id === userId,
                time: 15000,
                max: 1
            });

            collector.on('collect', async m => {
                const userAnswer = parseInt(m.content);

                if (userAnswer === answer) {
                    const earnings = Math.floor(Math.random() * 40) + 20;
                    baubleData = await Bauble.findOne({ userId });
                    baubleData.baubles += earnings;
                    await baubleData.save();

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Task Complete!')
                        .setDescription(`Correct! You earned **${earnings}** Glimmering Baubles.`)
                        .addFields({ name: '💰 New Balance', value: `${baubleData.baubles} Baubles`, inline: true })
                        .setTimestamp()
                        .setFooter({ text: 'Hard work pays off 💼' });

                    await message.channel.send({ embeds: [successEmbed] });
                } else {
                    const failEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Wrong Answer')
                        .setDescription(`Oops! The correct answer was **${answer}**.\nBetter luck next time!`)
                        .setFooter({ text: 'No Baubles earned.' });

                    await message.channel.send({ embeds: [failEmbed] });
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('⏰ Time’s Up!')
                        .setDescription(`<@${userId}> you didn’t answer in time. No Baubles this round.`)
                        .setFooter({ text: 'Work fast or lose out!' });

                    message.channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error in prefix work command:', error);
            await message.reply({ content: '❌ Something went wrong while working.' });
        }
    }
};
