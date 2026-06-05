const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate arbitrary javascript code (Developer Only).')
        .addStringOption(opt => opt.setName('code').setDescription('The javascript code to execute').setRequired(true)),

    async execute(interaction) {
        const code = interaction.options.getString('code');
        try {
            let evaled = eval(code);
            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled);
            }
            if (evaled.length > 2000) evaled = evaled.substring(0, 1990) + '...';
            return interaction.reply({ content: `\`\`\`js\n${evaled}\n\`\`\``, ephemeral: true });
        } catch (err) {
            return interaction.reply({ content: `❌ **Error:**\n\`\`\`js\n${err}\n\`\`\``, ephemeral: true });
        }
    },

    async executePrefix(message, args) {
        const code = args.join(' ');
        if (!code) return message.reply('❌ Please provide code to evaluate.');
        try {
            let evaled = eval(code);
            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled);
            }
            if (evaled.length > 2000) evaled = evaled.substring(0, 1990) + '...';
            return message.reply(`\`\`\`js\n${evaled}\n\`\`\``);
        } catch (err) {
            return message.reply(`❌ **Error:**\n\`\`\`js\n${err}\n\`\`\``);
        }
    }
};
