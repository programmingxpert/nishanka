/* eslint-disable */
const { Collection } = require('discord.js');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        const prefix = process.env.PREFIX ?? '-';
        if (!message.content.startsWith(prefix)) return;

        const args        = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName)
            ?? client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command || typeof command.executePrefix !== 'function') return;

        // --- devOnly / ownerOnly check ---
        const config = require('../config.json');
        if (command.devOnly && message.author.id !== config.devId) {
            return message.reply('⚠️ This command is restricted to the bot developer.');
        }

        // --- Cooldown logic ---
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now        = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownMs = (command.cooldown ?? 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expiry = timestamps.get(message.author.id) + cooldownMs;
            if (now < expiry) {
                const timestampId = Math.floor(expiry / 1000);
                return message.reply(`⏳ Please wait, you can use \`${prefix}${commandName}\` again <t:${timestampId}:R>.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownMs);

        // --- Execute command ---
        try {
            await command.executePrefix(message, args);
        } catch (error) {
            console.error(`[messageCreate] Error in prefix command "${commandName}":`, error);
            message.reply('❌ An error occurred while executing that command.').catch(() => {});
        }
    },
};
