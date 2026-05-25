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

        // --- Triggers Logic ---
        if (!client.triggerCache) client.triggerCache = new Map();
        if (!client.triggerCache.has(message.guild.id)) {
            try {
                const Trigger = require('../models/triggerSchema');
                const triggers = await Trigger.find({ guildId: message.guild.id }).lean();
                client.triggerCache.set(message.guild.id, triggers);
            } catch (err) {
                console.error('Failed to fetch triggers:', err);
            }
        }
        
        const guildTriggers = client.triggerCache.get(message.guild.id);
        if (guildTriggers && guildTriggers.length > 0) {
            const contentLower = message.content.toLowerCase();
            for (const t of guildTriggers) {
                let isMatch = false;
                if (t.matchType === 'exact' && contentLower === t.triggerWord) isMatch = true;
                else if (t.matchType === 'includes' && contentLower.includes(t.triggerWord)) isMatch = true;
                else if (t.matchType === 'startsWith' && contentLower.startsWith(t.triggerWord)) isMatch = true;

                if (isMatch) {
                    const payload = {};
                    if (t.response.text) payload.content = t.response.text;
                    
                    const e = t.response.embed;
                    if (e && (e.title || e.description || e.author || e.footer)) {
                        const { EmbedBuilder } = require('discord.js');
                        const embed = new EmbedBuilder();
                        if (e.title) embed.setTitle(e.title);
                        if (e.description) embed.setDescription(e.description);
                        if (e.color) embed.setColor(e.color);
                        if (e.author) embed.setAuthor({ name: e.author });
                        if (e.footer) embed.setFooter({ text: e.footer });
                        payload.embeds = [embed];
                    }

                    if (payload.content || payload.embeds) {
                        message.reply(payload).catch(() => {});
                    }
                    break; // Trigger only the first match to prevent spam
                }
            }
        }

        const prefix = settings?.bot?.prefix || process.env.PREFIX || '-';
        if (!message.content.startsWith(prefix)) return;

        const args        = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName)
            ?? client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command) return;

        if (command.slashOnly) {
            return message.reply(`❌ The \`${commandName}\` command is only available as a slash command (use \`/${command.data?.name || commandName}\`).`).catch(() => {});
        }

        if (typeof command.executePrefix !== 'function') {
            return;
        }

        // --- Cooldown logic ---
        const { cooldowns } = client;
        const cmdName = command.data?.name || command.name;
        if (!cooldowns.has(cmdName)) {
            cooldowns.set(cmdName, new Collection());
        }

        const now        = Date.now();
        const timestamps = cooldowns.get(cmdName);
        let cooldownMs = (command.cooldown ?? 3) * 1000;

        if (cmdName === 'work' || cmdName === 'scavenge') {
            const Bauble = require('../models/baubleSchema');
            const baubleData = await Bauble.findOne({ userId: message.author.id }).lean();
            if (baubleData && baubleData.coffeeExpiresAt && now < new Date(baubleData.coffeeExpiresAt).getTime()) {
                cooldownMs /= 2;
            }
        }

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
