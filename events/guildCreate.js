const { ChannelType, PermissionsBitField } = require('discord.js');
const { getOrCreateLogChannel } = require('../utils/interactionLogger');

const WELCOME_MESSAGES = [
    "Ugh, who invited me to this place? 🙄 Fine, I guess I'll stay. But don't expect me to be nice to you. Type `/help` or use prefix `-` if you actually want to do something useful. 💀",
    "Great, another server filled with people who need to touch grass. 🙄 Don't get any ideas, I'm only here because someone added me. Use `/help` or `-help` to see what I can do, and don't ping me unless you have a good reason! 👀",
    "Oh great, another server. Did you guys run out of real friends or something? 💀 Fine, I'm here now. Try `/help` or prefix commands with `-` if you want. Just don't bother me while I'm counting my cookies. 🍪",
    "Fine, I'm here. Don't make it weird. 🙄 You can check my commands with `/help` or `-help`. And no, I won't give you free Glimmering Baubles, so don't even ask. 🪙"
];

module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        console.log(`[Guild Create] Joined a new guild: ${guild.name} (${guild.id})`);

        // 1. Proactively provision the interaction logging channel and webhook
        try {
            await getOrCreateLogChannel(client, guild);
        } catch (err) {
            console.error(`[Guild Create] Failed to pre-create log channel for ${guild.id}:`, err);
        }

        // 2. Select a random channel to send the welcome message
        try {
            let targetChannel = null;

            // Try system channel first if the bot has permission
            if (guild.systemChannel) {
                const perms = guild.systemChannel.permissionsFor(guild.members.me);
                if (perms && perms.has(PermissionsBitField.Flags.SendMessages) && perms.has(PermissionsBitField.Flags.ViewChannel)) {
                    targetChannel = guild.systemChannel;
                }
            }

            // Fallback to searching all text channels
            if (!targetChannel) {
                const textChannels = guild.channels.cache.filter(c => {
                    if (c.type !== ChannelType.GuildText) return false;
                    const perms = c.permissionsFor(guild.members.me);
                    return perms && perms.has(PermissionsBitField.Flags.SendMessages) && perms.has(PermissionsBitField.Flags.ViewChannel);
                });

                if (textChannels.size > 0) {
                    // Look for a channel named general or chat
                    const generalChan = textChannels.find(c => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('chat'));
                    if (generalChan) {
                        targetChannel = generalChan;
                    } else {
                        targetChannel = textChannels.random();
                    }
                }
            }

            if (targetChannel) {
                const randomGreeting = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
                await targetChannel.send(randomGreeting).catch(() => {});
            } else {
                console.warn(`[Guild Create] Could not find a writeable text channel in guild: ${guild.name} (${guild.id})`);
            }
        } catch (err) {
            console.error(`[Guild Create] Failed to send welcome message in guild ${guild.id}:`, err);
        }
    }
};
