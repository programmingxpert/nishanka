const { SlashCommandBuilder } = require('discord.js');
const { getLogs } = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('devlogs')
        .setDescription('Inspect live bot console logs (Developer Only).')
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of log lines to show (max 40)').setRequired(false))
        .addStringOption(opt => opt.setName('search').setDescription('Filter query to search logs').setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== config.devId) {
            return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
        }

        const limit = Math.min(40, interaction.options.getInteger('limit') || 15);
        const searchQuery = interaction.options.getString('search')?.toLowerCase();

        let logs = getLogs();
        if (searchQuery) {
            logs = logs.filter(l => l.message.toLowerCase().includes(searchQuery));
        }

        const recent = logs.slice(-limit);
        if (recent.length === 0) {
            return interaction.reply({ content: '❓ No logs found matching that query.', ephemeral: true });
        }

        const logLines = recent.map(l => `[${l.timestamp.split('T')[1].substring(0, 8)}] [${l.level}] ${l.message.substring(0, 150)}`).join('\n');
        return interaction.reply({
            content: `📋 **Recent Console Logs (showing ${recent.length}):**\n\`\`\`ansi\n${cleanAnsiColors(logLines)}\n\`\`\``,
            ephemeral: true
        });
    },

    async executePrefix(message, args) {
        if (message.author.id !== config.devId) {
            return message.reply('❌ You are not authorized to use this command.');
        }

        let limit = 15;
        let searchQuery = null;

        if (args[0]) {
            const parsedLimit = parseInt(args[0]);
            if (!isNaN(parsedLimit)) {
                limit = Math.min(50, parsedLimit);
                if (args[1]) {
                    searchQuery = args.slice(1).join(' ').toLowerCase();
                }
            } else if (args[0].toLowerCase() === 'search') {
                searchQuery = args.slice(1).join(' ').toLowerCase();
            } else {
                searchQuery = args.join(' ').toLowerCase();
            }
        }

        let logs = getLogs();
        if (searchQuery) {
            logs = logs.filter(l => l.message.toLowerCase().includes(searchQuery));
        }

        const recent = logs.slice(-limit);
        if (recent.length === 0) {
            return message.reply('❓ No logs found matching that query.');
        }

        const logLines = recent.map(l => `[${l.timestamp.split('T')[1].substring(0, 8)}] [${l.level}] ${l.message.substring(0, 150)}`).join('\n');
        
        // Split if message length exceeds Discord 2000 limit
        const output = `📋 **Recent Console Logs (showing ${recent.length}):**\n\`\`\`ansi\n${cleanAnsiColors(logLines)}\n\`\`\``;
        if (output.length > 2000) {
            return message.reply(`📋 **Recent Console Logs (showing ${recent.length}):**\n\`\`\`ansi\n${cleanAnsiColors(logLines.substring(logLines.length - 1900))}\n\`\`\``);
        }
        return message.reply(output);
    }
};

function cleanAnsiColors(text) {
    // Strip standard ANSI color codes to keep logs clean in Discord blocks
    return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
