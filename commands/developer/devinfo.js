const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    category: 'developer',
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('devinfo')
        .setDescription('Display developer-only bot information and system metrics.'),

    async execute(interaction) {
        const client = interaction.client;
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = os.totalmem() / 1024 / 1024 / 1024;
        const freeMemory = os.freemem() / 1024 / 1024 / 1024;

        const embed = new EmbedBuilder()
            .setColor(0x2c3e50)
            .setTitle('👑 Developer System Metrics')
            .addFields(
                { name: '🤖 Bot Status', value: `**Guilds:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Ping:** ${client.ws.ping}ms`, inline: true },
                { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                { name: '🖥️ System Info', value: `**Heap Used:** ${memoryUsage.toFixed(2)} MB\n**Free RAM:** ${freeMemory.toFixed(2)} GB\n**Total RAM:** ${totalMemory.toFixed(2)} GB`, inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async executePrefix(message, args) {
        const client = message.client;
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = os.totalmem() / 1024 / 1024 / 1024;
        const freeMemory = os.freemem() / 1024 / 1024 / 1024;

        const embed = new EmbedBuilder()
            .setColor(0x2c3e50)
            .setTitle('👑 Developer System Metrics')
            .addFields(
                { name: '🤖 Bot Status', value: `**Guilds:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Ping:** ${client.ws.ping}ms`, inline: true },
                { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                { name: '🖥️ System Info', value: `**Heap Used:** ${memoryUsage.toFixed(2)} MB\n**Free RAM:** ${freeMemory.toFixed(2)} GB\n**Total RAM:** ${totalMemory.toFixed(2)} GB`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
