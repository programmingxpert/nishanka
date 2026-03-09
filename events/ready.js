/* eslint-disable */
module.exports = {
    name: 'clientReady',
    once: true,

    async execute(client) {
        console.log(`✅ Bot is online as ${client.user.tag}`);
        console.log(`📦 Loaded ${client.commands.size} command(s)`);
        console.log(`🌐 Serving ${client.guilds.cache.size} guild(s)`);

        // Initialize Lavalink nodes (riffy)
        if (client.riffy) {
            client.riffy.init(client.user.id);
            console.log('🎵 Lavalink (riffy) initialised');
        }
    },
};
