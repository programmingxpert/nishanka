/* eslint-disable */
const { Collection } = require('discord.js');
const GuildSettings = require('../models/guildSettingsSchema');

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        let settings = null;
        try {
            settings = await GuildSettings.findOne({ guildId: message.guild.id });
            
            // Increment message count in background
            const MemberStats = require('../models/MemberStats');
            MemberStats.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { $inc: { messagesCount: 1 } },
                { upsert: true }
            ).catch(err => console.error('Error updating MemberStats messageCount:', err));
        } catch (e) {
            console.error('Failed to fetch guild settings in messageCreate:', e);
        }

        const prefix = settings?.bot?.prefix || process.env.PREFIX || '-';
        if (!message.content.startsWith(prefix)) return;

        const args        = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName)
            ?? client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command || typeof command.executePrefix !== 'function') {
            if (settings?.bot?.unknownCommandMsg && commandName.length > 0) {
                message.reply(`❌ Unknown command \`${commandName}\`.`).then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                }).catch(() => {});
            }
            return;
        }

        if (settings?.bot?.deleteInvoke) {
            message.delete().catch(() => {});
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
